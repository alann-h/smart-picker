import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { TRPCError } from "@trpc/server";
import bcrypt from "bcryptjs";
import { getSession, createSession, destroySession } from "~/lib/session";

// Input validation schemas
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  rememberMe: z.boolean().optional(),
});

const registerSchema = z.object({
  email: z.string().email(),
  givenName: z.string().min(1),
  familyName: z.string().min(1),
  password: z.string().min(6),
  isAdmin: z.boolean().optional(),
});

const updateUserSchema = z.object({
  userId: z.string().uuid(),
  givenName: z.string().optional(),
  familyName: z.string().optional(),
  email: z.string().email().optional(),
  isAdmin: z.boolean().optional(),
});

export const authRouter = createTRPCRouter({
  // Login endpoint
  login: publicProcedure
    .input(loginSchema)
    .mutation(async ({ input, ctx }) => {
      const { email, password, rememberMe } = input;

      // Find user by email
      const user = await ctx.db.user.findFirst({
        where: { displayEmail: email },
        include: { company: true },
      });

      if (!user) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid email or password",
        });
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.passwordHash);
      if (!isValidPassword) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid email or password",
        });
      }

      // Create session
      await createSession({
        userId: user.id,
        companyId: user.companyId ?? "00000000-0000-0000-0000-000000000000",
        isAdmin: user.isAdmin,
        name: `${user.givenName} ${user.familyName}`,
        email: user.displayEmail,
        rememberMe,
      });

      return {
        user: {
          id: user.id,
          email: user.displayEmail,
          name: `${user.givenName} ${user.familyName}`,
          companyId: user.companyId ?? "00000000-0000-0000-0000-000000000000",
          isAdmin: user.isAdmin,
          companyName: user.company?.companyName,
        },
      };
    }),

  // Register endpoint (admin only - will be protected later)
  register: publicProcedure
    .input(registerSchema)
    .mutation(async ({ input, ctx }) => {
      const { email, givenName, familyName, password, isAdmin = false } = input;

      // Check if user already exists
      const existingUser = await ctx.db.user.findFirst({
        where: { displayEmail: email },
      });

      if (existingUser) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "User with this email already exists",
        });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 12);

      // Create user (using placeholder company ID for now)
      const user = await ctx.db.user.create({
        data: {
          displayEmail: email,
          normalisedEmail: email.toLowerCase(),
          givenName: givenName,
          familyName: familyName,
          passwordHash: hashedPassword,
          isAdmin: isAdmin,
          companyId: "00000000-0000-0000-0000-000000000000", // Placeholder
        },
      });

      return {
        id: user.id,
        email: user.displayEmail,
        name: `${user.givenName} ${user.familyName}`,
        isAdmin: user.isAdmin,
      };
    }),

  // Get user status (for checking authentication)
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
      name: `${user.givenName} ${user.familyName}`,
      email: user.displayEmail,
      companyName: user.company?.companyName,
    };
  }),

  // Logout endpoint
  logout: publicProcedure.mutation(async () => {
    await destroySession();
    return { success: true };
  }),

  // Update user
  updateUser: publicProcedure
    .input(updateUserSchema)
    .mutation(async ({ input, ctx }) => {
      const { userId, ...updateData } = input;

      const user = await ctx.db.user.update({
        where: { id: userId },
        data: {
          givenName: updateData.givenName,
          familyName: updateData.familyName,
          displayEmail: updateData.email,
          normalisedEmail: updateData.email?.toLowerCase(),
          isAdmin: updateData.isAdmin,
        },
      });

      return {
        id: user.id,
        email: user.displayEmail,
        name: `${user.givenName} ${user.familyName}`,
        isAdmin: user.isAdmin,
      };
    }),

  // Get all users (admin only)
  getAllUsers: publicProcedure.query(async ({ ctx }) => {
    const session = await getSession();
    
    if (!session.isAdmin) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Admin access required",
      });
    }

    const users = await ctx.db.user.findMany({
      where: { companyId: session.companyId },
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
      name: `${user.givenName} ${user.familyName}`,
      isAdmin: user.isAdmin,
      createdAt: user.createdAt,
      companyName: user.company?.companyName,
    }));
  }),

  // Delete user
  deleteUser: publicProcedure
    .input(z.object({ userId: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      const session = await getSession();
      
      // Check if user is admin or deleting themselves
      if (!session.isAdmin && session.userId !== input.userId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only delete your own account",
        });
      }

      await ctx.db.user.delete({
        where: { id: input.userId },
      });

      // If user deleted themselves, destroy session
      if (session.userId === input.userId) {
        await destroySession();
      }

      return { success: true };
    }),
});
