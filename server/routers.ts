import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import {
  getProductByHandle,
  listProductPage,
  listProducts,
} from "./catalog";
import { z } from "zod";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  storefront: router({
    products: publicProcedure.query(() => listProducts()),
    productPage: publicProcedure
      .input(z.object({ cursor: z.string().max(4096).nullish() }))
      .query(({ input }) => listProductPage(input.cursor)),
    productByHandle: publicProcedure
      .input(z.object({ handle: z.string().trim().min(1).max(200) }))
      .query(({ input }) => getProductByHandle(input.handle)),
  }),
});

export type AppRouter = typeof appRouter;
