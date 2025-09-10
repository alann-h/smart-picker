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
    }): void;

    getCompanyInfo(): Promise<{
      getJson(): {
        CompanyInfo: {
          CompanyName: string;
        };
      };
    }>;

    refresh(): Promise<{
      getJson(): {
        access_token: string;
        refresh_token: string;
        token_type: string;
        expires_in: number;
        x_refresh_token_expires_in: number;
        scope: string;
      };
    }>;

    static scopes: {
      Accounting: string;
      OpenId: string;
      Profile: string;
      Email: string;
    };
  }
}
