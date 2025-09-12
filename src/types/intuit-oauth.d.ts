declare module 'intuit-oauth' {
  export default class OAuthClient {
    constructor(config: {
      clientId: string;
      clientSecret: string;
      environment: 'sandbox' | 'production';
      redirectUri: string;
    });

    authorizeUri(options: {
      scope: string[];
      state: string;
    }): string;

    createToken(url: string): Promise<{
      getJson(): {
        access_token: string;
        refresh_token: string;
        token_type: string;
        expires_in: number;
        x_refresh_token_expires_in: number;
        scope: string;
        realmId: string;
        createdAt: number;
      };
    }>;

    setToken(token: {
      access_token: string;
      refresh_token: string;
      token_type: string;
      expires_in: number;
      x_refresh_token_expires_in: number;
      scope: string;
      realmId: string;
      created_at: number;
    }): void;

    getCompanyInfo(): Promise<{
      getJson(): {
        CompanyInfo: {
          CompanyName: string;
        };
      };
    }>;

    getUserInfo(): Promise<{
      json: {
        email: string;
        givenName: string;
        familyName: string;
      };
    }>;

    makeApiCall(options: { url: string }): Promise<{
      json: any;
    }>;

    revoke(): Promise<void>;

    refresh(): Promise<{
      getJson(): {
        access_token: string;
        refresh_token: string;
        token_type: string;
        expires_in: number;
        x_refresh_token_expires_in: number;
        scope: string;
        createdAt: number;
      };
    }>;

    environment: 'sandbox' | 'production';

    static scopes: {
      Accounting: string;
      OpenId: string;
      Profile: string;
      Email: string;
    };

    static environment: {
      production: string;
      sandbox: string;
    };
  }
}
