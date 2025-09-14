import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { fetchCustomersLocal, fetchCustomers, saveCustomers } from "~/server/services/customer";
import type { ConnectionType } from "~/lib/types";

export const customerRouter = createTRPCRouter({
  // Get customers from local database
  getLocalCustomers: protectedProcedure
    .query(async ({ ctx }) => {
      try {
        const customers = await fetchCustomersLocal(ctx.session.companyId);
        return customers;
      } catch (error) {
        console.error("Failed to fetch local customers:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch local customers",
        });
      }
    }),

  // Get customers from external service (QuickBooks/Xero)
  getExternalCustomers: protectedProcedure
    .input(
      z.object({
        connectionType: z.enum(["qbo", "xero"]).default("qbo"),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const customers = await fetchCustomers(
          ctx.session.companyId,
          input.connectionType as ConnectionType
        );
        return customers;
      } catch (error) {
        console.error("Failed to fetch external customers:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch external customers",
        });
      }
    }),

  // Save customers to local database
  saveCustomers: protectedProcedure
    .input(
      z.object({
        customers: z.array(
          z.object({
            id: z.string(),
            customer_name: z.string(),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        await saveCustomers(input.customers, ctx.session.companyId);
        return { success: true, count: input.customers.length };
      } catch (error) {
        console.error("Failed to save customers:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to save customers",
        });
      }
    }),

  // Sync customers from external service to local database
  syncCustomers: protectedProcedure
    .input(
      z.object({
        connectionType: z.enum(["qbo", "xero"]).default("qbo"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Fetch from external service
        const externalCustomers = await fetchCustomers(
          ctx.session.companyId,
          input.connectionType as ConnectionType
        );

        // Save to local database
        await saveCustomers(externalCustomers, ctx.session.companyId);

        return { 
          success: true, 
          count: externalCustomers.length,
          connectionType: input.connectionType
        };
      } catch (error) {
        console.error("Failed to sync customers:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to sync customers",
        });
      }
    }),
});
