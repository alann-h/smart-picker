import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "~/server/api/trpc";
import { TRPCError } from "@trpc/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { getSession, createSession, destroySession } from "~/lib/session";
import { oauthService } from "~/server/services/oauth";
import validator from "validator";
import { type ConnectionType } from "~/lib/types";

// Placeholder for email service
const emailService = {
  sendPasswordResetEmail: async (email: string, token: string, name: string) => {
    console.log(`Sending password reset email to ${email} with token ${token} for user ${name}`);
    // In a real app, you would use a service like Nodemailer, SendGrid, or AWS SES
    // For now, we'll just log it to the console.
    await Promise.resolve();
  },
  sendPasswordResetConfirmationEmail: async (email: string, name: string) => {
    console.log(`Sending password reset confirmation to ${email} for user ${name}`);
    await Promise.resolve();
  }
};

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 15;

export const authRouter = createTRPCRouter({
  login: publicProcedure
    .input(z.object({
      email: z.string().email(),
      password: z.string().min(1),
      rememberMe: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { email, password, rememberMe } = input;
      const normalisedEmail = validator.normalizeEmail(email) as string;

      let user = await ctx.db.user.findUnique({
        where: { normalisedEmail },
        include: { company: true },
      });

      if (user && user.lockedUntil && user.lockedUntil > new Date()) {
        const remainingTime = Math.ceil((user.lockedUntil.getTime() - new Date().getTime()) / (1000 * 60));
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: `Account locked. Try again in ${remainingTime} minutes.`,
        });
      }

      if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
        if (user) {
          const newAttempts = user.failedAttempts + 1;
          let lockUntil: Date | null = null;
          if (newAttempts >= MAX_FAILED_ATTEMPTS) {
            lockUntil = new Date(Date.now() + LOCKOUT_DURATION_MINUTES * 60 * 1000);
          }
          await ctx.db.user.update({
            where: { id: user.id },
            data: { 
              failedAttempts: newAttempts,
              lastFailedAttempt: new Date(),
              lockedUntil: lockUntil 
            },
          });
        }
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Invalid email or password' });
      }

      // Reset failed attempts on successful login
      if (user.failedAttempts > 0) {
        await ctx.db.user.update({
          where: { id: user.id },
          data: { failedAttempts: 0, lastFailedAttempt: null, lockedUntil: null },
        });
      }
      
      let reAuthRequired = false;
      if (user.company && user.company.connectionType !== 'none') {
          try {
              await oauthService.getValidToken(user.companyId!, user.company.connectionType as ConnectionType, ctx.db);
          } catch (error) {
              console.error('Token refresh failed during login:', error);
              reAuthRequired = true;
          }
      }

      await createSession({
        userId: user.id,
        companyId: user.companyId!,
        isAdmin: user.isAdmin,
        name: `${user.givenName} ${user.familyName ?? ''}`,
        email: user.displayEmail,
        rememberMe,
        connectionType: user.company?.connectionType ?? 'none',
      });

      return {
        user: {
          id: user.id,
          email: user.displayEmail,
          name: `${user.givenName} ${user.familyName ?? ''}`,
          companyId: user.companyId,
          isAdmin: user.isAdmin,
          companyName: user.company?.companyName,
          connectionType: user.company?.connectionType,
          reAuthRequired,
        },
      };
    }),

  register: publicProcedure
    .input(z.object({
      email: z.string().email(),
      givenName: z.string().min(1),
      familyName: z.string().min(1),
      password: z.string().min(6),
      companyName: z.string().min(1),
    }))
    .mutation(async ({ input, ctx }) => {
      const { email, givenName, familyName, password, companyName } = input;
      const normalisedEmail = validator.normalizeEmail(email) as string;

      const existingUser = await ctx.db.user.findFirst({
        where: { normalisedEmail },
      });

      if (existingUser) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "User with this email already exists",
        });
      }
      
      const hashedPassword = await bcrypt.hash(password, 12);

      const company = await ctx.db.company.create({
        data: {
          companyName: companyName,
        }
      });
      
      const user = await ctx.db.user.create({
        data: {
          displayEmail: email,
          normalisedEmail,
          givenName,
          familyName,
          passwordHash: hashedPassword,
          isAdmin: true, // First user is admin
          companyId: company.id,
        },
      });

      return {
        id: user.id,
        email: user.displayEmail,
        name: `${user.givenName} ${user.familyName ?? ''}`,
        isAdmin: user.isAdmin,
      };
    }),

  getUserStatus: publicProcedure.query(async ({ ctx }) => {
    const session = await getSession();
    
    if (!session.userId || !session.companyId) {
      return null;
    }

    // Get fresh user data from database
    const user = await ctx.db.user.findFirst({
      where: { id: session.userId },
      include: { company: true },
    });

    if (!user) {
      // User doesn't exist, destroy session
      await destroySession();
      return null;
    }

    return {
      isAdmin: user.isAdmin,
      companyId: user.companyId ?? "00000000-0000-0000-0000-000000000000",
      name: `${user.givenName} ${user.familyName ?? ''}`,
      email: user.displayEmail,
      companyName: user.company?.companyName,
      connectionType: user.company?.connectionType
    };
  }),

  logout: publicProcedure.mutation(async () => {
    await destroySession();
    return { success: true };
  }),

  updateUser: protectedProcedure
    .input(z.object({
      userId: z.string().uuid(),
      givenName: z.string().optional(),
      familyName: z.string().optional(),
      email: z.string().email().optional(),
      isAdmin: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { userId, ...updateData } = input;

      // Authorization: only admin can update other users
      if (ctx.session.userId !== userId && !ctx.session.isAdmin) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'You can only update your own profile.' });
      }
      
      const dataToUpdate: any = { ...updateData };
      if (updateData.email) {
          dataToUpdate.normalisedEmail = validator.normalizeEmail(updateData.email);
      }

      const user = await ctx.db.user.update({
        where: { id: userId },
        data: dataToUpdate,
      });

      return {
        id: user.id,
        email: user.displayEmail,
        name: `${user.givenName} ${user.familyName ?? ''}`,
        isAdmin: user.isAdmin,
      };
    }),

  getAllUsers: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.session.isAdmin) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Admin access required",
      });
    }

    const users = await ctx.db.user.findMany({
      where: { companyId: ctx.session.companyId },
      select: {
        id: true,
        displayEmail: true,
        givenName: true,
        familyName: true,
        isAdmin: true,
        createdAt: true,
        company: {
          select: {
            companyName: true,
          },
        },
      },
    });

    return users.map(user => ({
      id: user.id,
      email: user.displayEmail,
      name: `${user.givenName} ${user.familyName ?? ''}`,
      isAdmin: user.isAdmin,
      createdAt: user.createdAt,
      companyName: user.company?.companyName,
    }));
  }),

  deleteUser: protectedProcedure
    .input(z.object({ userId: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      // Check if user is admin or deleting themselves
      if (!ctx.session.isAdmin && ctx.session.userId !== input.userId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to delete this user.",
        });
      }

      await ctx.db.user.delete({
        where: { id: input.userId },
      });

      // If user deleted themselves, destroy session
      if (ctx.session.userId === input.userId) {
        await destroySession();
      }

      return { success: true };
    }),

  requestPasswordReset: publicProcedure
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ input, ctx }) => {
      const normalisedEmail = validator.normalizeEmail(input.email) as string;
      const user = await ctx.db.user.findUnique({ where: { normalisedEmail }});

      if (user) {
        const resetToken = crypto.randomBytes(32).toString('hex');
        const tokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

        await ctx.db.user.update({
          where: { id: user.id },
          data: {
            passwordResetToken: resetToken,
            passwordResetExpires: tokenExpiry,
          },
        });

        const userName = `${user.givenName} ${user.familyName ?? ''}`.trim();
        await emailService.sendPasswordResetEmail(user.displayEmail, resetToken, userName);
      }
      
      // Always return a generic success message to prevent email enumeration
      return { message: 'If an account with that email exists, a password reset link has been sent.' };
    }),

  resetPassword: publicProcedure
    .input(z.object({
      token: z.string(),
      password: z.string().min(6),
    }))
    .mutation(async ({ input, ctx }) => {
      const user = await ctx.db.user.findFirst({
        where: { 
          passwordResetToken: input.token,
          passwordResetExpires: { gt: new Date() }
        },
      });

      if (!user) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invalid or expired reset token.' });
      }

      const hashedPassword = await bcrypt.hash(input.password, 12);
      
      await ctx.db.user.update({
        where: { id: user.id },
        data: {
          passwordHash: hashedPassword,
          passwordResetToken: null,
          passwordResetExpires: null,
        },
      });

      const userName = `${user.givenName} ${user.familyName ?? ''}`.trim();
      await emailService.sendPasswordResetConfirmationEmail(user.displayEmail, userName);

      return { message: 'Password has been successfully reset.' };
    }),
});
