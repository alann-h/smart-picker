import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "~/server/api/trpc";
import { TRPCError } from "@trpc/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { getSession, createSession, destroySession } from "~/lib/session";
import { oauthService } from "~/server/services/oauth";
import validator from "validator";
import { type ConnectionType } from "~/lib/types";

// Email service using Mailjet
import Mailjet from 'node-mailjet';

const mailjet = Mailjet.apiConnect(
  process.env.MAILJET_API_KEY!,
  process.env.MAILJET_SECRET_KEY!
);

const emailService = {
  sendPasswordResetEmail: async (email: string, token: string, name: string) => {
    try {
      const resetUrl = `${process.env.FRONTEND_URL ?? 'http://localhost:3000'}/reset-password?token=${token}`;
      
      const request = mailjet.post('send', { version: 'v3.1' }).request({
        Messages: [
          {
            From: {
              Email: process.env.FROM_EMAIL ?? 'noreply@smartpicker.au',
              Name: 'Smart Picker'
            },
            To: [
              {
                Email: email,
                Name: name ?? 'User'
              }
            ],
            Subject: 'Reset Your Password - Smart Picker',
            TextPart: `Hello ${name ?? 'User'},

            You requested to reset your password for your Smart Picker account.

            Click the link below to reset your password:
            ${resetUrl}

            This link will expire in 1 hour for security reasons.

            If you didn't request this password reset, please ignore this email.

            Best regards,
            Smart Picker Team`,
            HTMLPart: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #333;">Reset Your Password</h2>
                <p>Hello ${name ?? 'User'},</p>
                <p>You requested to reset your password for your Smart Picker account.</p>
                <p>Click the button below to reset your password:</p>
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${resetUrl}" 
                     style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
                    Reset Password
                  </a>
                </div>
                <p style="color: #666; font-size: 14px;">
                  This link will expire in 1 hour for security reasons.
                </p>
                <p style="color: #666; font-size: 14px;">
                  If you didn't request this password reset, please ignore this email.
                </p>
                <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
                <p style="color: #999; font-size: 12px;">
                  Best regards,<br>
                  Smart Picker Team
                </p>
              </div>
            `
          }
        ]
      });

      const response = await request;
      return response.body;
    } catch (error) {
      console.error('Error sending password reset email:', error);
      throw new Error('Failed to send password reset email');
    }
  },
  
  sendPasswordResetConfirmationEmail: async (email: string, name: string) => {
    try {
      const request = mailjet.post('send', { version: 'v3.1' }).request({
        Messages: [
          {
            From: {
              Email: process.env.FROM_EMAIL ?? 'noreply@smartpicker.au',
              Name: 'Smart Picker'
            },
            To: [
              {
                Email: email,
                Name: name ?? 'User'
              }
            ],
            Subject: 'Password Successfully Reset - Smart Picker',
            TextPart: `Hello ${name ?? 'User'},

            Your password has been successfully reset for your Smart Picker account.

            If you didn't make this change, please contact our support team immediately.

            Best regards,
            Smart Picker Team`,
            HTMLPart: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #28a745;">Password Successfully Reset</h2>
                <p>Hello ${name ?? 'User'},</p>
                <p>Your password has been successfully reset for your Smart Picker account.</p>
                <div style="background-color: #d4edda; border: 1px solid #c3e6cb; color: #155724; padding: 15px; border-radius: 5px; margin: 20px 0;">
                  <strong>Security Notice:</strong> If you didn't make this change, please contact our support team immediately.
                </div>
                <p>You can now log in with your new password.</p>
                <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
                <p style="color: #999; font-size: 12px;">
                  Best regards,<br>
                  Smart Picker Team
                </p>
              </div>
            `
          }
        ]
      });

      const response = await request;
      return response.body;
    } catch (error) {
      console.error('Error sending password reset confirmation email:', error);
      throw new Error('Failed to send password reset confirmation email');
    }
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

      const user = await ctx.db.user.findUnique({
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
              await oauthService.getValidToken(user.company, user.company.connectionType as ConnectionType, ctx.db);
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
      
      const dataToUpdate: {
        givenName?: string;
        familyName?: string;
        displayEmail?: string;
        normalisedEmail?: string;
        isAdmin?: boolean;
      } = { ...updateData };
      
      if (updateData.email) {
          dataToUpdate.normalisedEmail = validator.normalizeEmail(updateData.email) as string;
          dataToUpdate.displayEmail = updateData.email;
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
