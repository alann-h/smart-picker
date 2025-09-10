import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

export const postRouter = createTRPCRouter({
  hello: publicProcedure
    .input(z.object({ text: z.string() }))
    .query(({ input }) => {
      return {
        greeting: `Hello ${input.text}`,
      };
    }),

  // Simple test to verify database connection
  testConnection: publicProcedure.query(async ({ ctx }) => {
    const companyCount = await ctx.db.company.count();
    return {
      message: "Database connected successfully!",
      companyCount,
    };
  }),
});
