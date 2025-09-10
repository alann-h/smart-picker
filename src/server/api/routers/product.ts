import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

export const productRouter = createTRPCRouter({
  // Get all products
  getAll: publicProcedure.query(async ({ ctx }) => {
    return await ctx.db.product.findMany({
      where: { 
        isArchived: false,
      },
      orderBy: { productName: "asc" },
    });
  }),

  // Get products by category
  getByCategory: publicProcedure
    .input(z.object({ category: z.string() }))
    .query(async ({ ctx, input }) => {
      return await ctx.db.product.findMany({
      where: { 
        category: input.category,
        isArchived: false,
      },
        orderBy: { productName: "asc" },
      });
    }),

  // Search products by name or SKU
  search: publicProcedure
    .input(z.object({ query: z.string() }))
    .query(async ({ ctx, input }) => {
      return await ctx.db.product.findMany({
      where: { 
        isArchived: false,
        OR: [
          { productName: { contains: input.query, mode: "insensitive" } },
          { sku: { contains: input.query, mode: "insensitive" } },
          { barcode: { contains: input.query, mode: "insensitive" } },
        ],
      },
        orderBy: { productName: "asc" },
      });
    }),

  // Get product by SKU
  getBySku: publicProcedure
    .input(z.object({ sku: z.string() }))
    .query(async ({ ctx, input }) => {
      const product = await ctx.db.product.findFirst({
        where: { 
          sku: input.sku,
        },
      });

      if (!product) {
        throw new Error("Product not found");
      }

      return product;
    }),

  // Get product by barcode
  getByBarcode: publicProcedure
    .input(z.object({ barcode: z.string() }))
    .query(async ({ ctx, input }) => {
      const product = await ctx.db.product.findFirst({
        where: { 
          barcode: input.barcode,
        },
      });

      if (!product) {
        throw new Error("Product not found");
      }

      return product;
    }),

  // Create a new product
  create: publicProcedure
    .input(z.object({
      productName: z.string().min(1),
      sku: z.string().min(1),
      barcode: z.string().optional(),
      externalItemId: z.string().optional(),
      category: z.string().optional(),
      taxCodeRef: z.string().optional(),
      price: z.number().min(0),
      quantityOnHand: z.number().min(0),
    }))
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.product.create({
        data: {
          companyId: "00000000-0000-0000-0000-000000000000", // Placeholder company ID
          productName: input.productName,
          sku: input.sku,
          barcode: input.barcode,
          externalItemId: input.externalItemId,
          category: input.category,
          taxCodeRef: input.taxCodeRef,
          price: input.price,
          quantityOnHand: input.quantityOnHand,
        },
      });
    }),

  // Update product
  update: publicProcedure
    .input(z.object({
      id: z.bigint(),
      productName: z.string().min(1).optional(),
      sku: z.string().min(1).optional(),
      barcode: z.string().optional(),
      externalItemId: z.string().optional(),
      category: z.string().optional(),
      taxCodeRef: z.string().optional(),
      price: z.number().min(0).optional(),
      quantityOnHand: z.number().min(0).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateData } = input;
      
      return await ctx.db.product.update({
        where: { 
          id,
        },
        data: updateData,
      });
    }),

  // Archive product
  archive: publicProcedure
    .input(z.object({ id: z.bigint() }))
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.product.update({
        where: { 
          id: input.id,
        },
        data: { isArchived: true },
      });
    }),

  // Get product categories
  getCategories: publicProcedure.query(async ({ ctx }) => {
    const categories = await ctx.db.product.findMany({
      where: { 
        isArchived: false,
        category: { not: null },
      },
      select: { category: true },
      distinct: ["category"],
    });

    return categories.map(c => c.category).filter(Boolean);
  }),

  // Bulk update products (for Excel import)
  bulkUpdate: publicProcedure
    .input(z.array(z.object({
      sku: z.string(),
      productName: z.string(),
      barcode: z.string().optional(),
      price: z.number(),
      quantityOnHand: z.number(),
      category: z.string().optional(),
    })))
    .mutation(async ({ ctx, input }) => {
      const results = [];
      
      for (const productData of input) {
        try {
          const product = await ctx.db.product.upsert({
            where: {
              companyId_sku: {
                companyId: "00000000-0000-0000-0000-000000000000", // Placeholder company ID
                sku: productData.sku,
              },
            },
            update: {
              productName: productData.productName,
              barcode: productData.barcode,
              price: productData.price,
              quantityOnHand: productData.quantityOnHand,
              category: productData.category,
            },
            create: {
              companyId: "00000000-0000-0000-0000-000000000000", // Placeholder company ID
              productName: productData.productName,
              sku: productData.sku,
              barcode: productData.barcode,
              price: productData.price,
              quantityOnHand: productData.quantityOnHand,
              category: productData.category,
            },
          });
          results.push({ success: true, product });
        } catch (error) {
          results.push({ 
            success: false, 
            error: error instanceof Error ? error.message : "Unknown error", 
            sku: productData.sku 
          });
        }
      }
      
      return results;
    }),
});
