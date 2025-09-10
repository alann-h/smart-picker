import { postRouter } from "~/server/api/routers/post";
import { quoteRouter } from "~/server/api/routers/quote";
import { productRouter } from "~/server/api/routers/product";
import { authRouter } from "~/server/api/routers/auth";
import { oauthRouter } from "~/server/api/routers/oauth";
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  post: postRouter,
  quote: quoteRouter,
  product: productRouter,
  auth: authRouter,
  oauth: oauthRouter,
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
