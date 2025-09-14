import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { 
  createBulkRun, 
  getRunsByCompanyId, 
  updateRunStatus, 
  updateRunQuotes, 
  deleteRunById 
} from "~/server/services/run";
import type { ConnectionType } from "~/lib/types";
import type { RunStatus } from "~/types/run";

export const runRouter = createTRPCRouter({
  // Create a bulk run with ordered quote IDs
  createBulkRun: protectedProcedure
    .input(
      z.object({
        orderedQuoteIds: z.array(z.string()),
        connectionType: z.enum(["qbo", "xero"]).default("qbo"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const run = await createBulkRun(
          input.orderedQuoteIds,
          ctx.session.companyId,
          input.connectionType as ConnectionType
        );
        return run;
      } catch (error) {
        console.error("Failed to create bulk run:", error);
        if (error instanceof Error) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: error.message,
          });
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create bulk run",
        });
      }
    }),

  // Get runs by company ID
  getCompanyRuns: protectedProcedure
    .input(
      z.object({
        companyId: z.string(),
      })
    )
    .query(async ({ input }) => {
      try {
        const runs = await getRunsByCompanyId(input.companyId);
        return runs;
      } catch (error) {
        console.error("Failed to fetch company runs:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch company runs",
        });
      }
    }),

  // Update run status
  updateRunStatus: protectedProcedure
    .input(
      z.object({
        runId: z.string(),
        status: z.enum(["pending", "checking", "finalised"]),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const run = await updateRunStatus(input.runId, input.status as RunStatus);
        return run;
      } catch (error) {
        console.error("Failed to update run status:", error);
        if (error instanceof Error) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: error.message,
          });
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update run status",
        });
      }
    }),

  // Update run quotes
  updateRunQuotes: protectedProcedure
    .input(
      z.object({
        runId: z.string(),
        orderedQuoteIds: z.array(z.string()),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const result = await updateRunQuotes(input.runId, input.orderedQuoteIds);
        return result;
      } catch (error) {
        console.error("Failed to update run quotes:", error);
        if (error instanceof Error) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: error.message,
          });
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update run quotes",
        });
      }
    }),

  // Delete run by ID
  deleteRun: protectedProcedure
    .input(
      z.object({
        runId: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const result = await deleteRunById(input.runId);
        return result;
      } catch (error) {
        console.error("Failed to delete run:", error);
        if (error instanceof Error) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: error.message,
          });
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete run",
        });
      }
    }),
});
