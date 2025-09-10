import OAuthClient from 'intuit-oauth';
import { XeroClient } from 'xero-node';
import crypto from 'crypto';
import { env } from "~/env.js";

export type ConnectionType = 'qbo' | 'xero';

export interface QboToken {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  x_refresh_token_expires_in: number;
  scope: string;
  realmId: string;
}

export interface XeroToken {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  tenant_id: string;
}

export interface QboCompanyInfo {
  companyName: string;
  realmId: string;
}

export interface XeroCompanyInfo {
  companyName: string;
  tenantId: string;
}

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
    console.log('QBO Redirect URI:', env.QUICKBOOKS_REDIRECT_URI);
    
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
    const redirectUri = `${this.baseUrl}/api/auth/xero/callback`;
    console.log('Xero Redirect URI:', redirectUri);
    
    return new XeroClient({
      clientId: env.XERO_CLIENT_ID,
      clientSecret: env.XERO_CLIENT_SECRET,
      redirectUris: [redirectUri],
      scopes: [
        'offline_access',
        'accounting.transactions.read',
        'accounting.contacts.read',
        'accounting.settings.read'
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
  async handleQBOCallback(url: string): Promise<QboToken> {
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
        realmId: token.realmId
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
    const xeroClient = this.initializeXero();
    
    try {
      const tokenSet = await xeroClient.apiCallback(url);
      const tenants = await xeroClient.updateTenants(false);
      
      if (!tenants || tenants.length === 0) {
        throw new Error('No tenants found');
      }
      
      return {
        access_token: tokenSet.access_token ?? '',
        refresh_token: tokenSet.refresh_token ?? '',
        token_type: tokenSet.token_type ?? '',
        expires_in: tokenSet.expires_in ?? 0,
        scope: tokenSet.scope ?? '',
        tenant_id: (tenants[0] as { tenantId: string })?.tenantId ?? ''
      };
    } catch (error: unknown) {
      console.error('Xero callback error:', error);
      throw new Error('Failed to process Xero callback');
    }
  }

  /**
   * Get QBO company info
   */
  async getQBOCompanyInfo(token: QboToken): Promise<QboCompanyInfo | null> {
    const oauthClient = this.initializeQBO();
    
    try {
      oauthClient.setToken({
        access_token: token.access_token,
        refresh_token: token.refresh_token,
        token_type: token.token_type,
        expires_in: token.expires_in,
        x_refresh_token_expires_in: token.x_refresh_token_expires_in,
        scope: token.scope,
        realmId: token.realmId
      });

      const companyInfo = await oauthClient.getCompanyInfo();
      const company = companyInfo.getJson();
      
      return {
        companyName: company.CompanyInfo.CompanyName,
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
    
    try {
      xeroClient.setTokenSet({
        access_token: token.access_token,
        refresh_token: token.refresh_token,
        token_type: token.token_type,
        expires_in: token.expires_in,
        scope: token.scope
      });

      const response = await xeroClient.accountingApi.getOrganisations(token.tenant_id);
      const organisation = response.body.organisations?.[0];
      
      if (!organisation) {
        return null;
      }
      
      return {
        companyName: organisation.name ?? '',
        tenantId: token.tenant_id
      };
    } catch (error: unknown) {
      console.error('Error getting Xero company info:', error);
      return null;
    }
  }

  /**
   * Refresh QBO token
   */
  async refreshQBOToken(token: QboToken): Promise<QboToken> {
    const oauthClient = this.initializeQBO();
    
    try {
      oauthClient.setToken({
        access_token: token.access_token,
        refresh_token: token.refresh_token,
        token_type: token.token_type,
        expires_in: token.expires_in,
        x_refresh_token_expires_in: token.x_refresh_token_expires_in,
        scope: token.scope,
        realmId: token.realmId
      });

      const refreshedToken = await oauthClient.refresh();
      const newToken = refreshedToken.getJson();
      
      return {
        access_token: newToken.access_token ?? '',
        refresh_token: newToken.refresh_token ?? '',
        token_type: newToken.token_type ?? '',
        expires_in: newToken.expires_in ?? 0,
        x_refresh_token_expires_in: newToken.x_refresh_token_expires_in ?? 0,
        scope: newToken.scope ?? '',
        realmId: token.realmId
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
    
    try {
      xeroClient.setTokenSet({
        access_token: token.access_token,
        refresh_token: token.refresh_token,
        token_type: token.token_type,
        expires_in: token.expires_in,
        scope: token.scope
      });

      const refreshedToken = await xeroClient.refreshToken();
      
      return {
        access_token: refreshedToken.access_token ?? '',
        refresh_token: refreshedToken.refresh_token ?? '',
        token_type: refreshedToken.token_type ?? '',
        expires_in: refreshedToken.expires_in ?? 0,
        scope: refreshedToken.scope ?? '',
        tenant_id: token.tenant_id
      };
    } catch (error: unknown) {
      console.error('Error refreshing Xero token:', error);
      throw new Error('Failed to refresh Xero token');
    }
  }
}

export const oauthService = new OAuthService();
