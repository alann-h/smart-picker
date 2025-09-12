import type { User } from "@prisma/client";
import type { TokenSetParameters } from 'xero-node';

export type ConnectionType = 'qbo' | 'xero';

// Token and Company Info Types
export interface QboToken {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  x_refresh_token_expires_in: number;
  scope: string;
  realmId: string;
  created_at: number;
}

export interface XeroToken extends TokenSetParameters {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_at: number;
  scope: string;
  tenantId: string;
  created_at: number;
}

export type TokenData = QboToken | XeroToken;

export interface QboCompanyInfo {
  companyName: string;
  realmId: string;
}

export interface XeroCompanyInfo {
  companyName: string;
  tenantId: string;
}

export interface OAuthUserInfo {
  email: string;
  givenName: string;
  familyName: string;
}

// User-related types for frontend and backend consistency
export interface UserFromDB extends User {
    company_id: string;
    given_name: string;
    family_name: string | null;
    display_email: string;
    normalised_email: string;
    password_hash: string;
    is_admin: boolean;
}

export interface LoginUser extends UserFromDB {
    token?: QboToken | XeroToken;
    connectionType: ConnectionType;
    reAuthRequired?: boolean;
}

export interface UpdateUserPayload {
    display_email?: string;
    password?: string;
    given_name?: string;
    family_name?: string;
    is_admin?: boolean;
}

export interface UserForFrontend {
    id: string;
    display_email: string;
    normalised_email: string;
    given_name: string;
    family_name: string | null;
    is_admin: boolean;
    company_id: string;
}
