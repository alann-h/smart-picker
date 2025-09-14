import { postRouter } from "~/server/api/routers/post";
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";
import { productRouter } from "./routers/product";
import { quoteRouter } from "./routers/quote";
import { authRouter } from "./routers/auth";
import { oauthRouter } from "./routers/oauth";
import { companyRouter } from "./routers/company";
import { customerRouter } from "./routers/customer";
import { runRouter } from "./routers/run";
import { tokenRouter } from "./routers/token";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  post: postRouter,
  product: productRouter,
  quote: quoteRouter,
  auth: authRouter,
  oauth: oauthRouter,
  company: companyRouter,
  customer: customerRouter,
  run: runRouter,
  token: tokenRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */
export const createCaller = createCallerFactory(appRouter);
