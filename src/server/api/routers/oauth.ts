import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { oauthService, type ConnectionType } from "~/server/services/oauth";
import { createSession } from "~/lib/session";

export const oauthRouter = createTRPCRouter({
  // Get QBO authorization URI
  getQBOAuthUri: publicProcedure
    .input(z.object({ rememberMe: z.boolean().optional() }))
    .query(({ input }) => {
      try {
        const authUri = oauthService.getQBOAuthUri(input.rememberMe);
        return { authUri };
      } catch (error: any) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to generate QBO auth URI: ${error.message}`,
        });
      }
    }),

  // Get Xero authorization URI
  getXeroAuthUri: publicProcedure
    .input(z.object({ rememberMe: z.boolean().optional() }))
    .query(async ({ input }) => {
      try {
        const authUri = await oauthService.getXeroAuthUri(input.rememberMe);
        return { authUri };
      } catch (error: any) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to generate Xero auth URI: ${error.message}`,
        });
      }
    }),

  // Handle OAuth callback (this will be called by API routes, not directly)
  handleCallback: publicProcedure
    .input(z.object({
      url: z.string(),
      connectionType: z.enum(['qbo', 'xero']),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        const { url, connectionType } = input;
        
        // Handle the OAuth callback
        let token;
        let companyInfo;
        
        if (connectionType === 'qbo') {
          token = await oauthService.handleQBOCallback(url);
          companyInfo = await oauthService.getQBOCompanyInfo(token);
        } else {
          token = await oauthService.handleXeroCallback(url);
          companyInfo = await oauthService.getXeroCompanyInfo(token);
        }

        if (!companyInfo) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to retrieve company information",
          });
        }

        // Check if company already exists
        let company = await ctx.db.company.findFirst({
          where: connectionType === 'qbo' 
            ? { qboRealmId: companyInfo.realmId }
            : { xeroTenantId: companyInfo.tenantId }
        });

        if (company) {
          // Update existing company
          company = await ctx.db.company.update({
            where: { id: company.id },
            data: {
              companyName: companyInfo.companyName,
              connectionType: connectionType,
              ...(connectionType === 'qbo' 
                ? { 
                    qboTokenData: JSON.stringify(token),
                    qboRealmId: companyInfo.realmId
                  }
                : {
                    xeroTokenData: JSON.stringify(token),
                    xeroTenantId: companyInfo.tenantId
                  }
              ),
            },
          });
        } else {
          // Create new company
          company = await ctx.db.company.create({
            data: {
              companyName: companyInfo.companyName,
              connectionType: connectionType,
              ...(connectionType === 'qbo' 
                ? { 
                    qboTokenData: JSON.stringify(token),
                    qboRealmId: companyInfo.realmId
                  }
                : {
                    xeroTokenData: JSON.stringify(token),
                    xeroTenantId: companyInfo.tenantId
                  }
              ),
            },
          });
        }

        // Create or update user from OAuth
        const userEmail = connectionType === 'qbo' 
          ? `${companyInfo.companyName.toLowerCase().replace(/\s+/g, '')}@qbo.local`
          : `${companyInfo.companyName.toLowerCase().replace(/\s+/g, '')}@xero.local`;

        let user = await ctx.db.user.findFirst({
          where: { 
            displayEmail: userEmail,
            companyId: company.id
          }
        });

        if (!user) {
          // Create new user
          user = await ctx.db.user.create({
            data: {
              displayEmail: userEmail,
              normalisedEmail: userEmail.toLowerCase(),
              givenName: 'Admin',
              familyName: 'User',
              passwordHash: '', // OAuth users don't need password
              isAdmin: true,
              companyId: company.id,
            },
          });
        }

        // Create session
        await createSession({
          userId: user.id,
          companyId: company.id,
          isAdmin: user.isAdmin,
          name: `${user.givenName} ${user.familyName}`,
          email: user.displayEmail,
          connectionType: connectionType,
        });

        return {
          success: true,
          company: {
            id: company.id,
            name: company.companyName,
            connectionType: company.connectionType,
          },
          user: {
            id: user.id,
            email: user.displayEmail,
            name: `${user.givenName} ${user.familyName}`,
            isAdmin: user.isAdmin,
          },
        };
      } catch (error: any) {
        console.error('OAuth callback error:', error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `OAuth callback failed: ${error.message}`,
        });
      }
    }),

  // Disconnect from OAuth provider
  disconnect: publicProcedure
    .mutation(async ({ ctx }) => {
      // This would require session context, so we'll implement it later
      // For now, just return success
      return { success: true };
    }),
});
