import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { TRPCError } from "@trpc/server";

export const companyRouter = createTRPCRouter({
  // Get the current user's company
  getCurrent: protectedProcedure
    .query(async ({ ctx }) => {
      const company = await ctx.db.company.findUnique({
        where: { id: ctx.session.companyId },
      });

      if (!company) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Company not found.' });
      }
      return company;
    }),

  // Update company details (admin only)
  update: protectedProcedure
    .input(z.object({
      companyName: z.string().min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session.isAdmin) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Only admins can update company details.' });
      }

      const company = await ctx.db.company.update({
        where: { id: ctx.session.companyId },
        data: {
          companyName: input.companyName,
        },
      });

      return company;
    }),
  
  // Delete a company and all associated data (admin only)
  delete: protectedProcedure
    .mutation(async ({ ctx }) => {
      if (!ctx.session.isAdmin) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Only admins can delete the company.' });
      }

      const { companyId } = ctx.session;

      try {
        await ctx.db.$transaction(async (tx) => {
          // Prisma's onDelete: Cascade should handle most of this, 
          // but we manually handle what's not set to cascade.
          
          // Step 1: Disassociate users from the company
          await tx.user.updateMany({
            where: { companyId },
            data: { companyId: null },
          });

          // Step 2: Disassociate security events
          await tx.securityEvent.updateMany({
              where: { companyId },
              data: { companyId: null },
          });
          
          // Step 3: Delete the company. Relations with onDelete: Cascade
          // in the schema (like Product, Quote, Customer, etc.) will be deleted automatically.
          await tx.company.delete({
            where: { id: companyId },
          });
        });

        return { success: true, message: 'Company and all associated data have been deleted.' };
      } catch (error) {
        console.error('Failed to delete company:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to delete company and associated data.',
        });
      }
    }),
});
