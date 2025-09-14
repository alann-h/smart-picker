import { db } from '~/server/db';
import { AccessError, InputError } from '~/lib/errors';
import { AUTH_ERROR_CODES } from '~/lib/error-codes';
import { encryptToken, decryptToken } from '~/lib/encryption';
import { auditService } from './audit';
import { oauthService } from './oauth';
import type { ConnectionType, QboToken, XeroToken, TokenData } from '~/lib/types';

export interface ConnectionHandler {
  fields: string[];
  tokenField: string;
  validate: (token: TokenData) => boolean;
  refresh: (token: TokenData) => Promise<TokenData>;
  initClient: () => unknown;
  setClientToken: (client: unknown, token: TokenData) => void;
}

export interface CompanyTokenDataFromDB {
  qboTokenData?: string | null;
  xeroTokenData?: string | null;
  connectionType?: string | null;
}

export interface TokenStatusResult {
  status: 'VALID' | 'EXPIRED' | 'NO_TOKEN' | 'ERROR';
  message: string;
  connectionType?: ConnectionType;
  realmId?: string;
  tenantId?: string;
}

export interface CompanyConnection {
  type: ConnectionType;
  realmId?: string;
  tenantId?: string;
  status: TokenStatusResult;
}

export class TokenService {
  private tokenRefreshPromises: Map<string, Promise<TokenData>>;
  private connectionHandlers: Map<string, ConnectionHandler>;

  constructor() {
    this.tokenRefreshPromises = new Map();
    this.connectionHandlers = new Map();
    this.initializeConnectionHandlers();
  }

  initializeConnectionHandlers(): void {
    const handlers: Record<string, ConnectionHandler> = {
      qbo: {
        fields: ['qboTokenData', 'connectionType', 'qboRealmId'],
        tokenField: 'qboTokenData',
        validate: this.validateQBOToken.bind(this),
        refresh: async (token: TokenData) => await oauthService.refreshQBOToken(token as QboToken),
        initClient: () => oauthService.initializeQBO(),
        setClientToken: (client, token) => {
          const qboClient = client as { setToken: (token: TokenData) => void };
          qboClient.setToken(token);
        }
      },
      xero: {
        fields: ['xeroTokenData', 'connectionType', 'xeroTenantId'],
        tokenField: 'xeroTokenData',
        validate: this.validateXeroToken.bind(this),
        refresh: async (token: TokenData) => await oauthService.refreshXeroToken(token as XeroToken),
        initClient: () => oauthService.initializeXero(),
        setClientToken: (client, token) => {
          const xeroClient = client as { setTokenSet: (token: TokenData) => void };
          xeroClient.setTokenSet(token);
        }
      }
    };

    Object.entries(handlers).forEach(([type, handler]) => {
      this.connectionHandlers.set(type, handler);
    });
  }

  async getValidToken(companyId: string, connectionType: ConnectionType = 'qbo', userId: string | null = null): Promise<TokenData> {
    if (!companyId) throw new Error('Company ID is required');
       
    const handler = this.connectionHandlers.get(connectionType);
    if (!handler) throw new Error(`Unsupported connection type: ${connectionType}`);

    const cacheKey = `${companyId}_${connectionType}`;
    if (this.tokenRefreshPromises.has(cacheKey)) {
      return this.tokenRefreshPromises.get(cacheKey)!;
    }

    try {
      const result = await db.company.findUnique({
        where: { id: companyId },
        select: {
          qboTokenData: handler.fields.includes('qboTokenData'),
          xeroTokenData: handler.fields.includes('xeroTokenData'),
          connectionType: handler.fields.includes('connectionType'),
        },
      });

      if (!result) {
        throw new InputError(connectionType === 'qbo' ? AUTH_ERROR_CODES.QBO_REAUTH_REQUIRED : AUTH_ERROR_CODES.XERO_REAUTH_REQUIRED);
      }

      let currentToken: TokenData;
      try {
        currentToken = this.constructToken({
          connectionType: result.connectionType,
          qboTokenData: result.qboTokenData,
          xeroTokenData: result.xeroTokenData,
        } as CompanyTokenDataFromDB, connectionType, handler);
      } catch (tokenError: unknown) {
        if (tokenError instanceof InputError) throw tokenError;
        throw new InputError(connectionType === 'qbo' ? AUTH_ERROR_CODES.QBO_REAUTH_REQUIRED : AUTH_ERROR_CODES.XERO_REAUTH_REQUIRED);
      }
      
      if (handler.validate(currentToken)) {
        await auditService.updateConnectionHealth(companyId, connectionType, 'healthy');
        return currentToken;
      }
      
      console.log('Refreshing token');
      const refreshPromise = this.refreshCompanyToken(companyId, currentToken, connectionType);
      this.tokenRefreshPromises.set(cacheKey, refreshPromise);

      try {
        const refreshedToken = await refreshPromise;
        
        if (userId) {
          await auditService.logApiCall({
            userId,
            companyId,
            apiEndpoint: 'token_refresh_automatic',
            connectionType,
            requestMethod: 'POST',
            responseStatus: 200,
            ipAddress: '',
            userAgent: ''
          });
        }
        
        await auditService.updateConnectionHealth(companyId, connectionType, 'healthy');
        
        return refreshedToken;
      } finally {
        this.tokenRefreshPromises.delete(cacheKey);
      }

    } catch (error: unknown) {
      console.error(`Error getting valid token for company ${companyId} (${connectionType}):`, error);
      
      if (userId) {
        await auditService.logApiCall({
          userId,
          companyId,
          apiEndpoint: 'token_refresh_failed',
          connectionType,
          requestMethod: 'POST',
          responseStatus: 401,
          ipAddress: '',
          userAgent: '',
          errorMessage: error instanceof Error ? error.message : 'Unknown error'
        });
      }
      
      await auditService.updateConnectionHealth(
        companyId, 
        connectionType, 
        'unhealthy', 
        error instanceof Error ? error.message : 'Unknown error'
      );
      
      throw error;
    }
  }

  constructToken(dbRow: CompanyTokenDataFromDB, connectionType: ConnectionType, handler: ConnectionHandler): TokenData {
    const tokenField = handler.tokenField;
    if (!dbRow[tokenField as keyof CompanyTokenDataFromDB]) {
      throw new InputError(
        connectionType === 'qbo' ? AUTH_ERROR_CODES.QBO_REAUTH_REQUIRED : AUTH_ERROR_CODES.XERO_REAUTH_REQUIRED
      );
    }
    
    try {
      const encryptedData = dbRow[tokenField as keyof CompanyTokenDataFromDB]!;
      const decryptedData = decryptToken<string>(encryptedData);
      const tokenData = JSON.parse(decryptedData) as Record<string, unknown>;

      if (connectionType === 'qbo') {
        return {
          access_token: tokenData.access_token as string,
          refresh_token: tokenData.refresh_token as string,
          token_type: tokenData.token_type as string,
          expires_in: tokenData.expires_in as number,
          x_refresh_token_expires_in: tokenData.x_refresh_token_expires_in as number,
          scope: tokenData.scope as string,
          realmId: tokenData.realm_id as string,
          created_at: tokenData.created_at as number
        } as QboToken;
      } else { // connectionType === 'xero'
        return {
          access_token: tokenData.access_token as string,
          refresh_token: tokenData.refresh_token as string,
          token_type: tokenData.token_type as string,
          expires_at: tokenData.expires_at as number,
          scope: tokenData.scope as string,
          tenantId: tokenData.tenant_id as string,
          created_at: tokenData.created_at as number
        } as XeroToken;
      }
    } catch (error: unknown) {
      console.error('Error parsing token data:', error);
      throw new InputError(
        connectionType === 'qbo' ? AUTH_ERROR_CODES.QBO_REAUTH_REQUIRED : AUTH_ERROR_CODES.XERO_REAUTH_REQUIRED
      );
    }
  }

  validateQBOToken(token: TokenData): boolean {
    const qboToken = token as QboToken;
    if (!qboToken?.access_token || !qboToken.expires_in || typeof qboToken.created_at !== 'number') {
      return false;
    }
    
    const expiresAt = qboToken.created_at + (qboToken.expires_in * 1000);
    const now = Date.now();
    const buffer = 5 * 60 * 1000; // 5 minutes

    return expiresAt > (now + buffer);
  }

  validateXeroToken(token: TokenData): boolean {
    const xeroToken = token as XeroToken;
    if (!xeroToken?.access_token || !xeroToken.expires_at || typeof xeroToken.created_at !== 'number') {
      return false;
    }
    
    const now = new Date();
    const buffer = 5 * 60 * 1000; // 5 minutes
    const expiresAt = xeroToken.expires_at * 1000;
    return expiresAt > (now.getTime() + buffer);
  }

  async refreshCompanyToken(companyId: string, currentToken: TokenData, connectionType: ConnectionType): Promise<TokenData> {
    const handler = this.connectionHandlers.get(connectionType);
    if (!handler) throw new Error(`Unsupported connection type: ${connectionType}`);

    try {
      const refreshedToken = await handler.refresh(currentToken);
      let tokenDataToStore: Record<string, unknown>;
      
      if (connectionType === 'qbo') {
        const qboToken = refreshedToken as QboToken;
        tokenDataToStore = {
          access_token: qboToken.access_token,
          refresh_token: qboToken.refresh_token,
          token_type: qboToken.token_type,
          expires_in: qboToken.expires_in,
          x_refresh_token_expires_in: qboToken.x_refresh_token_expires_in,
          scope: qboToken.scope,
          realm_id: qboToken.realmId,
          created_at: qboToken.created_at ?? Date.now()
        };
      } else {
        const xeroToken = refreshedToken as XeroToken;
        tokenDataToStore = {
          access_token: xeroToken.access_token,
          refresh_token: xeroToken.refresh_token,
          token_type: xeroToken.token_type,
          expires_at: xeroToken.expires_at,
          scope: xeroToken.scope,
          tenant_id: xeroToken.tenantId,
          created_at: xeroToken.created_at ?? Date.now()
        };
      }

      const encryptedTokenData = encryptToken(JSON.stringify(tokenDataToStore));

      const updateField = connectionType === 'qbo' ? 'qboTokenData' : 'xeroTokenData';
      const realmField = connectionType === 'qbo' ? 'qboRealmId' : 'xeroTenantId';
      const realmValue = connectionType === 'qbo' ? (refreshedToken as QboToken).realmId : (refreshedToken as XeroToken).tenantId;
      
      const updateData: Record<string, unknown> = {};
      updateData[updateField] = encryptedTokenData;
      updateData[realmField] = realmValue;
      
      await db.company.update({
        where: { id: companyId },
        data: updateData,
      });

      return refreshedToken;

    } catch (error: unknown) {
      if (error instanceof Error && (error.message.includes('REFRESH_TOKEN_EXPIRED') || error.message.includes('REAUTH_REQUIRED'))) {
        const errorCode = connectionType === 'qbo' ? AUTH_ERROR_CODES.QBO_REAUTH_REQUIRED : AUTH_ERROR_CODES.XERO_REAUTH_REQUIRED;
        throw new InputError(errorCode);
      }
      if (error instanceof Error) {
        throw new AccessError(`Failed to refresh ${connectionType.toUpperCase()} token: ${error.message}`);
      }
      throw new AccessError(`An unknown error occurred while refreshing the ${connectionType.toUpperCase()} token.`);
    }
  }

  async getOAuthClient(companyId: string, connectionType: ConnectionType = 'qbo'): Promise<unknown> {
    const validToken = await this.getValidToken(companyId, connectionType);
    const handler = this.connectionHandlers.get(connectionType)!;
    const client = handler.initClient();
    handler.setClientToken(client, validToken);
    return client;
  }

  async checkReAuthRequired(companyId: string, connectionType: ConnectionType = 'qbo'): Promise<boolean> {
    try {
      await this.getValidToken(companyId, connectionType);
      return false;
    } catch (error: unknown) {
      return error instanceof Error && (error.message.includes('REAUTH_REQUIRED') || error.message.includes('REFRESH_TOKEN_EXPIRED'));
    }
  }

  async getTokenStatus(companyId: string, connectionType: ConnectionType = 'qbo'): Promise<TokenStatusResult> {
    const handler = this.connectionHandlers.get(connectionType);
    if (!handler) return { status: 'ERROR', message: `Unsupported connection type: ${connectionType}` };

    try {
      const result = await db.company.findUnique({
        where: { id: companyId },
        select: {
          connectionType: true,
          qboTokenData: handler.tokenField === 'qboTokenData',
          xeroTokenData: handler.tokenField === 'xeroTokenData',
        },
      });
      
      if (!result?.[handler.tokenField as keyof typeof result]) {
        return { status: 'NO_TOKEN', message: `No ${connectionType.toUpperCase()} token found` };
      }

      const currentToken = this.constructToken({
        connectionType: result.connectionType,
        qboTokenData: result.qboTokenData,
        xeroTokenData: result.xeroTokenData,
      } as CompanyTokenDataFromDB, connectionType, handler);
      const isValid = handler.validate(currentToken);
      
      return {
        status: isValid ? 'VALID' : 'EXPIRED',
        message: `Token is ${isValid ? 'valid' : 'expired'}`,
        connectionType,
        realmId: connectionType === 'qbo' ? (currentToken as QboToken)?.realmId : undefined,
        tenantId: connectionType === 'xero' ? (currentToken as XeroToken)?.tenantId : undefined
      };
    } catch (error: unknown) {
      if (error instanceof Error) {
        return { status: 'ERROR', message: error.message };
      }
      return { status: 'ERROR', message: 'An unknown error occurred while checking token status.' };
    }
  }

  async getCompanyConnections(companyId: string): Promise<CompanyConnection[]> {
    try {
      const result = await db.company.findUnique({
        where: { id: companyId },
        select: {
          connectionType: true,
          qboTokenData: true,
          xeroTokenData: true,
        },
      });
      if (!result) return [];

      const connections: CompanyConnection[] = [];

      if (result.connectionType === 'qbo' && result.qboTokenData) {
        try {
          const qboToken = this.constructToken({ qboTokenData: result.qboTokenData } as CompanyTokenDataFromDB, 'qbo', this.connectionHandlers.get('qbo')!);
          connections.push({
            type: 'qbo',
            realmId: (qboToken as QboToken).realmId,
            status: await this.getTokenStatus(companyId, 'qbo')
          });
        } catch (error: unknown) {
          console.error('Error parsing QBO token:', error);
        }
      }

      if (result.connectionType === 'xero' && result.xeroTokenData) {
        try {
          const xeroToken = this.constructToken({ xeroTokenData: result.xeroTokenData } as CompanyTokenDataFromDB, 'xero', this.connectionHandlers.get('xero')!);
          connections.push({
            type: 'xero',
            tenantId: (xeroToken as XeroToken).tenantId,
            status: await this.getTokenStatus(companyId, 'xero')
          });
        } catch (error: unknown) {
          console.error('Error parsing Xero token:', error);
        }
      }

      return connections;
    } catch (error: unknown) {
      console.error(`Error getting company connections for ${companyId}:`, error);
      return [];
    }
  }

  async storeTokenData(companyId: string, connectionType: ConnectionType, tokenData: Record<string, unknown>): Promise<void> {
    try {
      let tokenDataToStore: Record<string, unknown>;
      
      if (connectionType === 'qbo') {
        tokenDataToStore = {
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          token_type: tokenData.token_type,
          expires_in: tokenData.expires_in,
          x_refresh_token_expires_in: tokenData.x_refresh_token_expires_in ?? 7776000,
          scope: tokenData.scope,
          realm_id: tokenData.realmId,
          created_at: tokenData.created_at ?? Date.now()
        };
      } else if (connectionType === 'xero') {
        tokenDataToStore = {
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          token_type: tokenData.token_type,
          expires_at: tokenData.expires_at,
          scope: tokenData.scope,
          tenant_id: tokenData.tenantId,
          created_at: tokenData.created_at ?? Date.now()
        };
      } else {
        throw new Error(`Unsupported connection type: ${String(connectionType)}`);
      }

      const encryptedTokenData = encryptToken(JSON.stringify(tokenDataToStore));
      const updateField = connectionType === 'qbo' ? 'qboTokenData' : 'xeroTokenData';
      const realmField = connectionType === 'qbo' ? 'qboRealmId' : 'xeroTenantId';
      const realmValue = connectionType === 'qbo' ? tokenData.realmId : tokenData.tenantId;
      
      const updateData: Record<string, unknown> = {
        [updateField]: encryptedTokenData,
        connectionType: connectionType,
        [realmField]: realmValue,
      };
      
      await db.company.update({
        where: { id: companyId },
        data: updateData,
      });

      console.log(`Successfully stored ${connectionType.toUpperCase()} token data for company ${companyId}`);
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error(`Error storing ${connectionType} token data:`, error);
        throw new Error(`Failed to store ${connectionType.toUpperCase()} token data: ${error.message}`);
      }
      console.error(`Error storing ${connectionType} token data:`, error);
      throw new Error(`An unknown error occurred while storing ${connectionType.toUpperCase()} token data.`);
    }
  }
}

export const tokenService = new TokenService();
