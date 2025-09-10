import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  /**
   * Specify your server-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars.
   */
  server: {
    DATABASE_URL: z.string().url(),
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    QUICKBOOKS_CLIENT_ID: z.string().min(1),
    QUICKBOOKS_CLIENT_SECRET: z.string().min(1),
    QUICKBOOKS_REDIRECT_URI: z.string().url(),
    XERO_CLIENT_ID: z.string().min(1),
    XERO_CLIENT_SECRET: z.string().min(1),
    XERO_REDIRECT_URI: z.string(),
    AWS_REGION: z.string().min(1),
    AWS_BUCKET_NAME: z.string().min(1),
    AWS_ACCESS_KEY_ID: z.string().min(1),
    AWS_SECRET_ACCESS_KEY: z.string().min(1),
    MAILJET_API_KEY: z.string().min(1),
    MAILJET_SECRET_KEY: z.string().min(1),
    AES_SECRET_KEY: z.string().min(32),
    SESSION_SECRET: z.string().min(32),
  },

  /**
   * Specify your client-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars. To expose them to the client, prefix them with
   * `NEXT_PUBLIC_`.
   */
  client: {
    // NEXT_PUBLIC_CLIENTVAR: z.string(),
  },

  /**
   * You can't destruct `process.env` as a regular object in the Next.js edge runtimes (e.g.
   * middlewares) or client-side so we need to destruct manually.
   */
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    NODE_ENV: process.env.NODE_ENV,
    QUICKBOOKS_CLIENT_ID: process.env.QUICKBOOKS_CLIENT_ID,
    QUICKBOOKS_CLIENT_SECRET: process.env.QUICKBOOKS_CLIENT_SECRET,
    QUICKBOOKS_REDIRECT_URI: process.env.QUICKBOOKS_REDIRECT_URI,
    XERO_CLIENT_ID: process.env.XERO_CLIENT_ID,
    XERO_CLIENT_SECRET: process.env.XERO_CLIENT_SECRET,
    XERO_REDIRECT_URI: process.env.XERO_REDIRECT_URI,
    AWS_REGION: process.env.AWS_REGION,
    AWS_BUCKET_NAME: process.env.AWS_BUCKET_NAME,
    AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
    MAILJET_API_KEY: process.env.MAILJET_API_KEY,
    MAILJET_SECRET_KEY: process.env.MAILJET_SECRET_KEY,
    AES_SECRET_KEY: process.env.AES_SECRET_KEY,
    SESSION_SECRET: process.env.SESSION_SECRET,
  },
  /**
   * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially
   * useful for Docker builds.
   */
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  /**
   * Makes it so that empty strings are treated as undefined. `SOME_VAR: z.string()` and
   * `SOME_VAR=''` will throw an error.
   */
  emptyStringAsUndefined: true,
});
