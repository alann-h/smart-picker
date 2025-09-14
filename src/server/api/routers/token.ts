import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { tokenService } from "~/server/services/token";
import { auditService } from "~/server/services/audit";
import type { ConnectionType } from "~/lib/types";

export const tokenRouter = createTRPCRouter({
  // Get token status for a connection type
  getTokenStatus: protectedProcedure
    .input(
      z.object({
        connectionType: z.enum(["qbo", "xero"]),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const status = await tokenService.getTokenStatus(ctx.session.companyId, input.connectionType);
        return status;
      } catch (error) {
        console.error("Failed to get token status:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get token status",
        });
      }
    }),

  // Get all company connections
  getCompanyConnections: protectedProcedure
    .query(async ({ ctx }) => {
      try {
        const connections = await tokenService.getCompanyConnections(ctx.session.companyId);
        return connections;
      } catch (error) {
        console.error("Failed to get company connections:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get company connections",
        });
      }
    }),

  // Check if re-authentication is required
  checkReAuthRequired: protectedProcedure
    .input(
      z.object({
        connectionType: z.enum(["qbo", "xero"]),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const reAuthRequired = await tokenService.checkReAuthRequired(ctx.session.companyId, input.connectionType);
        return { reAuthRequired };
      } catch (error) {
        console.error("Failed to check re-auth requirement:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to check re-authentication requirement",
        });
      }
    }),

  // Get OAuth client (for internal use)
  getOAuthClient: protectedProcedure
    .input(
      z.object({
        connectionType: z.enum(["qbo", "xero"]),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const client = await tokenService.getOAuthClient(ctx.session.companyId, input.connectionType);
        return { success: true };
      } catch (error) {
        console.error("Failed to get OAuth client:", error);
        if (error instanceof Error && error.message.includes('REAUTH_REQUIRED')) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Re-authentication required",
          });
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get OAuth client",
        });
      }
    }),

  // Get connection health
  getConnectionHealth: protectedProcedure
    .query(async ({ ctx }) => {
      try {
        const health = await auditService.getConnectionHealth(ctx.session.companyId);
        return health;
      } catch (error) {
        console.error("Failed to get connection health:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get connection health",
        });
      }
    }),

  // Get recent API calls
  getRecentApiCalls: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(50),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const apiCalls = await auditService.getRecentApiCalls(ctx.session.companyId, input.limit);
        return apiCalls;
      } catch (error) {
        console.error("Failed to get recent API calls:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get recent API calls",
        });
      }
    }),
});
