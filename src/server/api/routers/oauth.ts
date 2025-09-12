import { z } from "zod";
import { createTRPCRouter, publicProcedure, protectedProcedure } from "~/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { oauthService } from "~/server/services/oauth";
import { createSession } from "~/lib/session";
import validator from 'validator';
import { type QboCompanyInfo, type XeroCompanyInfo, type QboToken, type XeroToken } from "~/lib/types";
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

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
      realmId: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        const { url, connectionType } = input;
        
        const token = connectionType === 'qbo'
          ? await oauthService.handleQBOCallback(url, input.realmId)
          : await oauthService.handleXeroCallback(url);
          
        const companyInfo = connectionType === 'qbo'
          ? await oauthService.getQBOCompanyInfo(token as QboToken)
          : await oauthService.getXeroCompanyInfo(token as XeroToken);

        if (!companyInfo) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to retrieve company information",
          });
        }

        const whereClause = connectionType === 'qbo'
          ? { qboRealmId: (companyInfo as QboCompanyInfo).realmId }
          : { xeroTenantId: (companyInfo as XeroCompanyInfo).tenantId };
          
        let company = await ctx.db.company.findFirst({ where: whereClause });

        const companyData = {
          companyName: companyInfo.companyName,
          connectionType: connectionType,
          ...(connectionType === 'qbo'
            ? { qboTokenData: JSON.stringify(token), qboRealmId: (companyInfo as QboCompanyInfo).realmId }
            : { xeroTokenData: JSON.stringify(token), xeroTenantId: (companyInfo as XeroCompanyInfo).tenantId }
          ),
        };

        if (company) {
          company = await ctx.db.company.update({
            where: { id: company.id },
            data: companyData,
          });
        } else {
          company = await ctx.db.company.create({ data: companyData });
        }
        
        // Create or update user from OAuth
        const userInfo = connectionType === 'qbo'
          ? await oauthService.getQBOUserInfo(token as QboToken)
          : await oauthService.getXeroUserInfo(token as XeroToken);

        const normalisedEmail = validator.normalizeEmail(userInfo.email) as string;
        
        let user = await ctx.db.user.findFirst({
          where: { normalisedEmail: normalisedEmail }
        });

        if (user) {
          // If user exists, ensure they are linked to the correct company
          if (user.companyId !== company.id) {
            user = await ctx.db.user.update({
              where: { id: user.id },
              data: { companyId: company.id }
            });
          }
        } else {
          // Create new user if they don't exist
          const randomPassword = crypto.randomBytes(16).toString('hex');
          const hashedPassword = await bcrypt.hash(randomPassword, 12);

          user = await ctx.db.user.create({
            data: {
              displayEmail: userInfo.email,
              normalisedEmail: normalisedEmail,
              givenName: userInfo.givenName,
              familyName: userInfo.familyName,
              passwordHash: hashedPassword, // OAuth users might not need a password, but good to have
              isAdmin: true, // First user from OAuth is admin
              companyId: company.id,
            },
          });
        }

        // Create session
        await createSession({
          userId: user.id,
          companyId: company.id,
          isAdmin: user.isAdmin,
          name: `${user.givenName} ${user.familyName ?? ''}`,
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
            name: `${user.givenName} ${user.familyName ?? ''}`,
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
  disconnect: protectedProcedure
    .input(z.object({ connectionType: z.enum(['qbo', 'xero']) }))
    .mutation(async ({ ctx, input }) => {
        const { session } = ctx;
        if (!session.companyId) {
            throw new TRPCError({ code: 'UNAUTHORIZED', message: 'You must be logged in to disconnect.' });
        }

        const company = await ctx.db.company.findUnique({ where: { id: session.companyId } });
        if (!company) {
            throw new TRPCError({ code: 'NOT_FOUND', message: 'Company not found.' });
        }

        try {
            if (input.connectionType === 'qbo' && company.qboTokenData) {
                const token = JSON.parse(company.qboTokenData);
                await oauthService.revokeQBOToken(token);
                await ctx.db.company.update({
                    where: { id: session.companyId },
                    data: { qboTokenData: null, qboRealmId: null, connectionType: 'none' },
                });
            } else if (input.connectionType === 'xero' && company.xeroTokenData) {
                const token = JSON.parse(company.xeroTokenData);
                await oauthService.revokeXeroToken(token);
                await ctx.db.company.update({
                    where: { id: session.companyId },
                    data: { xeroTokenData: null, xeroTenantId: null, connectionType: 'none' },
                });
            }
            return { success: true };
        } catch (error: any) {
            console.error(`Failed to disconnect ${input.connectionType}:`, error);
            throw new TRPCError({
                code: 'INTERNAL_SERVER_ERROR',
                message: `Failed to disconnect: ${error.message}`,
            });
        }
    }),

  getToken: protectedProcedure
    .mutation(async ({ ctx }) => {
        const { session } = ctx;
        const company = await ctx.db.company.findUnique({ where: { id: session.companyId } });
        if (!company || company.connectionType === 'none') {
            return null;
        }

        const tokenDataString = company.connectionType === 'qbo' ? company.qboTokenData : company.xeroTokenData;
        if (!tokenDataString) return null;

        return JSON.parse(tokenDataString);
    }),

  refreshToken: protectedProcedure
    .mutation(async ({ ctx }) => {
        const { session } = ctx;
        const company = await ctx.db.company.findUnique({ where: { id: session.companyId } });
        if (!company || company.connectionType === 'none') {
            throw new TRPCError({ code: 'BAD_REQUEST', message: 'Not connected to an OAuth provider.' });
        }
        
        return await oauthService.getValidToken(session.companyId, company.connectionType, ctx.db);
    }),

  getRemoteUserInfo: protectedProcedure
    .mutation(async ({ ctx }) => {
        const { session } = ctx;
        const company = await ctx.db.company.findUnique({ where: { id: session.companyId } });
        if (!company || company.connectionType === 'none') {
            throw new TRPCError({ code: 'BAD_REQUEST', message: 'Not connected to an OAuth provider.' });
        }
        
        const token = await oauthService.getValidToken(session.companyId, company.connectionType, ctx.db);
        
        if (company.connectionType === 'qbo') {
            return await oauthService.getQBOUserInfo(token as QboToken);
        } else {
            return await oauthService.getXeroUserInfo(token as XeroToken);
        }
    }),
});
