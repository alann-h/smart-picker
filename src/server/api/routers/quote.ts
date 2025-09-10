import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

export const quoteRouter = createTRPCRouter({
  // Get all quotes for a company
  getAll: publicProcedure.query(async ({ ctx }) => {
    return await ctx.db.quote.findMany({
      where: {},
      include: {
        customer: true,
        quoteItems: {
          include: {
            product: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }),

  // Get quotes by status
  getByStatus: publicProcedure
    .input(z.object({ status: z.enum(["pending", "checking", "finalised", "cancelled", "assigned"]) }))
    .query(async ({ ctx, input }) => {
      return await ctx.db.quote.findMany({
        where: { 
          companyId: "00000000-0000-0000-0000-000000000000", // Placeholder company ID
          status: input.status,
        },
        include: {
          customer: true,
          quoteItems: {
            include: {
              product: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });
    }),

  // Get a single quote by ID
  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const quote = await ctx.db.quote.findFirst({
        where: { 
          id: input.id,
          companyId: "00000000-0000-0000-0000-000000000000", // Placeholder company ID
        },
        include: {
          customer: true,
          quoteItems: {
            include: {
              product: true,
            },
          },
        },
      });

      if (!quote) {
        throw new Error("Quote not found");
      }

      return quote;
    }),

  // Create a new quote
  create: publicProcedure
    .input(z.object({
      customerId: z.string(),
      totalAmount: z.number(),
      preparerNames: z.string().optional(),
      orderNote: z.string().optional(),
      quoteItems: z.array(z.object({
        productId: z.bigint(),
        productName: z.string(),
        sku: z.string(),
        price: z.number(),
        taxCodeRef: z.string().optional(),
        originalQuantity: z.number(),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.quote.create({
        data: {
          id: crypto.randomUUID(),
          companyId: "00000000-0000-0000-0000-000000000000", // Placeholder company ID
          customerId: input.customerId,
          totalAmount: input.totalAmount,
          preparerNames: input.preparerNames,
          orderNote: input.orderNote,
          status: "pending",
          quoteItems: {
            create: input.quoteItems.map((item) => ({
              productId: item.productId,
              productName: item.productName,
              sku: item.sku,
              price: item.price,
              taxCodeRef: item.taxCodeRef,
              originalQuantity: item.originalQuantity,
              pickingQuantity: 0,
              pickingStatus: "pending",
            })),
          },
        },
        include: {
          customer: true,
          quoteItems: {
            include: {
              product: true,
            },
          },
        },
      });
    }),

  // Update quote status
  updateStatus: publicProcedure
    .input(z.object({
      id: z.string(),
      status: z.enum(["pending", "checking", "finalised", "cancelled", "assigned"]),
    }))
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.quote.update({
        where: { 
          id: input.id,
          companyId: "00000000-0000-0000-0000-000000000000", // Placeholder company ID
        },
        data: { status: input.status },
      });
    }),

  // Update picking quantity for a quote item
  updatePickingQuantity: publicProcedure
    .input(z.object({
      quoteId: z.string(),
      productId: z.bigint(),
      pickingQuantity: z.number(),
      pickingStatus: z.enum(["pending", "backorder", "completed", "unavailable"]).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.quoteItem.update({
        where: {
          quoteId_productId: {
            quoteId: input.quoteId,
            productId: input.productId,
          },
        },
        data: {
          pickingQuantity: input.pickingQuantity,
          pickingStatus: input.pickingStatus,
        },
      });
    }),

  // Add picker note to quote
  updatePickerNote: publicProcedure
    .input(z.object({
      id: z.string(),
      pickerNote: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.quote.update({
        where: { 
          id: input.id,
          companyId: "00000000-0000-0000-0000-000000000000", // Placeholder company ID
        },
        data: { pickerNote: input.pickerNote },
      });
    }),

  // Get quotes ready for picking (pending status)
  getReadyForPicking: publicProcedure.query(async ({ ctx }) => {
    return await ctx.db.quote.findMany({
      where: { 
        status: "pending",
      },
      include: {
        customer: true,
        quoteItems: {
          include: {
            product: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });
  }),

  // Get quotes ready for admin review (checking status)
  getReadyForReview: publicProcedure.query(async ({ ctx }) => {
    return await ctx.db.quote.findMany({
      where: { 
        status: "checking",
      },
      include: {
        customer: true,
        quoteItems: {
          include: {
            product: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });
  }),
});
