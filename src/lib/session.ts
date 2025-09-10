import { getIronSession } from "iron-session";
import { cookies } from "next/headers";

export interface SessionData {
  userId?: string;
  companyId?: string;
  isAdmin?: boolean;
  name?: string;
  email?: string;
  connectionType?: 'qbo' | 'xero';
  loginTime?: string;
  userAgent?: string;
  ipAddress?: string;
}

export const sessionOptions = {
  cookieName: "smart-picker-session",
  password: process.env.SESSION_SECRET ?? "fallback-secret-key-change-in-production",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax" as const,
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },
};

export const rememberMeSessionOptions = {
  cookieName: "smart-picker-session",
  password: process.env.SESSION_SECRET ?? "fallback-secret-key-change-in-production",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax" as const,
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
};

export async function getSession() {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions);
}

export async function createSession(userData: {
  userId: string;
  companyId: string;
  isAdmin: boolean;
  name: string;
  email: string;
  connectionType?: 'qbo' | 'xero';
  rememberMe?: boolean;
}) {
  const cookieStore = await cookies();
  const sessionOptionsToUse = userData.rememberMe ? rememberMeSessionOptions : sessionOptions;
  const session = await getIronSession<SessionData>(cookieStore, sessionOptionsToUse);
  
  session.userId = userData.userId;
  session.companyId = userData.companyId;
  session.isAdmin = userData.isAdmin;
  session.name = userData.name;
  session.email = userData.email;
  session.connectionType = userData.connectionType;
  session.loginTime = new Date().toISOString();
  
  await session.save();
  return session;
}

export async function destroySession() {
  const session = await getSession();
  session.destroy();
}
