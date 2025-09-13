import OAuthClient from 'intuit-oauth';
import { XeroClient } from 'xero-node';
import crypto from 'crypto';
import { env } from "~/env.js";
import { db } from '~/server/db';
import type { PrismaClient } from '@prisma/client';
import { TRPCError } from '@trpc/server';
import { 
  type ConnectionType, 
  type QboToken, 
  type XeroToken, 
  type TokenData, 
  type QboCompanyInfo, 
  type XeroCompanyInfo, 
  type OAuthUserInfo 
} from '~/lib/types';

export class OAuthService {
  private environment: 'sandbox' | 'production';
  private baseUrl: string;

  constructor() {
    this.environment = env.NODE_ENV === 'production' ? 'production' : 'sandbox';
    this.baseUrl = env.NODE_ENV === 'production' 
      ? 'https://smartpicker.au' 
      : 'http://localhost:3000';
  }

  /**
   * Initialize QBO OAuth Client
   */
  initializeQBO(): OAuthClient {
    return new OAuthClient({
      clientId: env.QUICKBOOKS_CLIENT_ID,
      clientSecret: env.QUICKBOOKS_CLIENT_SECRET,
      environment: this.environment,
      redirectUri: env.QUICKBOOKS_REDIRECT_URI
    });
  }

  /**
   * Initialize Xero OAuth Client
   */
  initializeXero(): XeroClient {
    return new XeroClient({
      clientId: env.XERO_CLIENT_ID,
      clientSecret: env.XERO_CLIENT_SECRET,
      redirectUris: [env.XERO_REDIRECT_URI],
      scopes: [
        'offline_access',
        'accounting.transactions.read',
        'accounting.contacts.read',
        'accounting.settings.read',
        'profile',
        'email',
        'openid'
      ],
    });
  }

  /**
   * Get QBO authorization URI
   */
  getQBOAuthUri(rememberMe = false): string {
    const oauthClient = this.initializeQBO();
    const state = rememberMe 
      ? `rememberMe=true&${crypto.randomBytes(16).toString('hex')}` 
      : crypto.randomBytes(16).toString('hex');
    
    return oauthClient.authorizeUri({ 
      scope: [
        OAuthClient.scopes.Accounting,
        OAuthClient.scopes.OpenId,
        OAuthClient.scopes.Profile,
        OAuthClient.scopes.Email
      ], 
      state: state
    });
  }

  /**
   * Get Xero authorization URI
   */
  async getXeroAuthUri(rememberMe = false): Promise<string> {
    const xeroClient = this.initializeXero();
    const state = rememberMe 
      ? `rememberMe=true&${crypto.randomBytes(16).toString('hex')}` 
      : crypto.randomBytes(16).toString('hex');
    
    const consentUrl = await xeroClient.buildConsentUrl();
    return `${consentUrl}&state=${state}`;
  }

  /**
   * Handle QBO callback
   */
  async handleQBOCallback(url: string, realmIdFromQuery?: string | null): Promise<QboToken> {
    const oauthClient = this.initializeQBO();
    
    try {
      const authResponse = await oauthClient.createToken(url);
      const token = authResponse.getJson();
      
      return {
        access_token: token.access_token,
        refresh_token: token.refresh_token,
        token_type: token.token_type,
        expires_in: token.expires_in,
        x_refresh_token_expires_in: token.x_refresh_token_expires_in,
        scope: token.scope,
        realmId: realmIdFromQuery ?? token.realmId,
        created_at: token.createdAt
      };
    } catch (error: unknown) {
      console.error('QBO callback error:', error);
      throw new Error('Failed to process QBO callback');
    }
  }

  /**
   * Handle Xero callback
   */
  async handleXeroCallback(url: string): Promise<XeroToken> {
    try {
      const urlObj = new URL(url);
      const state = urlObj.searchParams.get('state');
      
      const xeroClient = new XeroClient({
        clientId: env.XERO_CLIENT_ID,
        clientSecret: env.XERO_CLIENT_SECRET,
        redirectUris: [env.XERO_REDIRECT_URI],
        scopes: [
          'offline_access',
          'accounting.transactions.read',
          'accounting.contacts.read',
          'accounting.settings.read',
          'profile',
          'email',
          'openid'
        ],
        state: state ?? undefined
      });
      
      const tokenSet = await xeroClient.apiCallback(url);
      const tenants = await xeroClient.updateTenants(false);
      
      if (!tenants || tenants.length === 0) {
        throw new Error('No tenants found');
      }
      
      return {
        access_token: tokenSet.access_token ?? '',
        refresh_token: tokenSet.refresh_token ?? '',
        token_type: tokenSet.token_type ?? '',
        expires_at: tokenSet.expires_at ?? 0,
        scope: tokenSet.scope ?? '',
        tenantId: (tenants[0] as { tenantId: string })?.tenantId ?? '',
        created_at: Date.now()
      };
    } catch (error: unknown) {
      console.error('Xero callback error:', error);
      throw new Error('Failed to process Xero callback');
    }
  }

  /**
   * Get QBO base URL for API calls
   */
  private getQBOBaseURL(oauthClient: OAuthClient): string {
    return oauthClient.environment === 'production' 
      ? OAuthClient.environment.production 
      : OAuthClient.environment.sandbox;
  }

  /**
   * Get QBO company info
   */
  async getQBOCompanyInfo(token: QboToken): Promise<QboCompanyInfo | null> {
    const oauthClient = this.initializeQBO();
    
    try {
      oauthClient.setToken(token);
      
      const realmId = token.realmId;
      const baseURL = this.getQBOBaseURL(oauthClient);
      const url = `${baseURL}v3/company/${realmId}/query?query=${encodeURIComponent("SELECT * FROM CompanyInfo")}&minorversion=65`;
      
      const response = await oauthClient.makeApiCall({ url });
      
      const responseJson = response.json as { QueryResponse?: { CompanyInfo?: Array<{ CompanyName?: string }> } } | undefined;
      const companyInfo = responseJson?.QueryResponse?.CompanyInfo?.[0];

      if (!companyInfo?.CompanyName) {
        throw new Error('No company name found in QBO response');
      }
      
      return {
        companyName: companyInfo.CompanyName,
        realmId: token.realmId
      };
    } catch (error: unknown) {
      console.error('Error getting QBO company info:', error);
      return null;
    }
  }

  /**
   * Get Xero company info
   */
  async getXeroCompanyInfo(token: XeroToken): Promise<XeroCompanyInfo | null> {
    const xeroClient = this.initializeXero();
    await xeroClient.initialize(); // Ensure openIdClient is initialized
    
    try {
      xeroClient.setTokenSet(token);

      const response = await xeroClient.accountingApi.getOrganisations(token.tenantId);
      const organisation = response.body.organisations?.[0];
      
      if (!organisation) {
        return null;
      }
      
      return {
        companyName: organisation.name ?? '',
        tenantId: token.tenantId
      };
    } catch (error: unknown) {
      console.error('Error getting Xero company info:', error);
      return null;
    }
  }

  /**
   * Get QBO user info
   */
  async getQBOUserInfo(token: QboToken): Promise<OAuthUserInfo> {
    const oauthClient = this.initializeQBO();
    oauthClient.setToken(token);
    
    try {
      const userInfo = await oauthClient.getUserInfo();
      const json = userInfo.json;
      return {
        email: json.email,
        givenName: json.givenName,
        familyName: json.familyName
      };
    } catch (error: unknown) {
      console.error('Error getting QBO user info:', error);
      throw new Error('Could not get QBO user information');
    }
  }

  /**
   * Get Xero user info
   */
  async getXeroUserInfo(token: XeroToken): Promise<OAuthUserInfo> {
    const xeroClient = this.initializeXero();
    await xeroClient.initialize(); // Ensure openIdClient is initialized
    xeroClient.setTokenSet(token);

    try {
      const userInfo = await xeroClient.accountingApi.getUsers(token.tenantId);

      if (!userInfo.body.users) {
        throw new Error('No users found');
      }

      const mainUser = userInfo.body.users[0];

      if (!mainUser) {
        throw new Error('No users found');
      }

      if (!mainUser.emailAddress || !mainUser?.firstName) {
        throw new Error('Required user info (email, name) not available');
      }

      return {
        email: mainUser.emailAddress,
        givenName: mainUser.firstName,
        familyName: mainUser.lastName ?? '',
      };
    } catch (error) {
      console.error('Error getting Xero user info:', error);
      throw new Error('Could not get Xero user information');
    }
  }

  /**
   * Refresh QBO token
   */
  async refreshQBOToken(token: QboToken): Promise<QboToken> {
    const oauthClient = this.initializeQBO();
    
    try {
      oauthClient.setToken(token);

      const refreshedToken = await oauthClient.refresh();
      const newToken = refreshedToken.getJson();
      
      return {
        ...token,
        access_token: newToken.access_token ?? '',
        refresh_token: newToken.refresh_token ?? '',
        token_type: newToken.token_type ?? '',
        expires_in: newToken.expires_in ?? 0,
        x_refresh_token_expires_in: newToken.x_refresh_token_expires_in ?? 0,
        scope: newToken.scope ?? '',
        created_at: newToken.createdAt ?? Date.now()
      };
    } catch (error: unknown) {
      console.error('Error refreshing QBO token:', error);
      throw new Error('Failed to refresh QBO token');
    }
  }

  /**
   * Refresh Xero token
   */
  async refreshXeroToken(token: XeroToken): Promise<XeroToken> {
    const xeroClient = this.initializeXero();
    await xeroClient.initialize(); // Ensure openIdClient is initialized
    
    try {
      xeroClient.setTokenSet(token);

      const refreshedToken = await xeroClient.refreshToken();
      
      return {
        ...token,
        access_token: refreshedToken.access_token ?? '',
        refresh_token: refreshedToken.refresh_token ?? '',
        token_type: refreshedToken.token_type ?? '',
        expires_at: refreshedToken.expires_at ?? 0,
        scope: refreshedToken.scope ?? '',
        created_at: Date.now()
      };
    } catch (error: unknown) {
      console.error('Error refreshing Xero token:', error);
      throw new Error('Failed to refresh Xero token');
    }
  }

  /**
   * Revoke QBO token
   */
  async revokeQBOToken(token: QboToken): Promise<void> {
    const oauthClient = this.initializeQBO();
    oauthClient.setToken(token);
    try {
      await oauthClient.revoke();
    } catch (error) {
      console.error('Error revoking QBO token:', error);
      throw new Error('Could not revoke QBO token');
    }
  }

  /**
   * Revoke Xero token
   */
  async revokeXeroToken(token: XeroToken): Promise<void> {
    const xeroClient = this.initializeXero();
    await xeroClient.initialize(); // Ensure openIdClient is initialized
    xeroClient.setTokenSet(token);
    try {
      await xeroClient.revokeToken();
    } catch (error) {
      console.error('Error revoking Xero token:', error);
      throw new Error('Could not revoke Xero token');
    }
  }

  /**
   * Validate QBO token
   */
  private validateQBOToken(token: QboToken): boolean {
    if (!token?.access_token || !token.expires_in || typeof token.created_at !== 'number') {
      return false;
    }
    const expiresAt = token.created_at + (token.expires_in * 1000);
    const buffer = 5 * 60 * 1000; // 5 minutes
    return expiresAt > (Date.now() + buffer);
  }

  /**
   * Validate Xero token
   */
  private validateXeroToken(token: XeroToken): boolean {
    if (!token?.access_token || !token.expires_at || typeof token.created_at !== 'number') {
      return false;
    }
    const expiresAt = token.expires_at * 1000;
    const buffer = 5 * 60 * 1000; // 5 minutes
    return expiresAt > (Date.now() + buffer);
  }

  /**
   * Gets a valid token for a company, refreshing it if necessary.
   */
  async getValidToken(company: { id: string; qboTokenData: string | null; xeroTokenData: string | null }, connectionType: ConnectionType, prisma: PrismaClient = db): Promise<TokenData> {

    const tokenDataString = connectionType === 'qbo' ? company.qboTokenData : company.xeroTokenData;

    if (!tokenDataString) {
      throw new TRPCError({ code: 'UNAUTHORIZED', message: `Re-authentication required for ${connectionType.toUpperCase()}` });
    }

    const token = JSON.parse(tokenDataString) as TokenData;
    const isValid = connectionType === 'qbo' 
      ? this.validateQBOToken(token as QboToken) 
      : this.validateXeroToken(token as XeroToken);

    if (isValid) {
      return token;
    }

    // If token is not valid, refresh it
    const refreshedToken = connectionType === 'qbo'
      ? await this.refreshQBOToken(token as QboToken)
      : await this.refreshXeroToken(token as XeroToken);

    // Store the new token
    const tokenField = connectionType === 'qbo' ? 'qboTokenData' : 'xeroTokenData';
    await prisma.company.update({
      where: { id: company.id },
      data: {
        [tokenField]: JSON.stringify(refreshedToken),
      },
    });

    return refreshedToken;
  }
}

export const oauthService = new OAuthService();
