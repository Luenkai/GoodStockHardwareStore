import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import {
  addCartLine,
  getCart,
  getCustomerAccountUrl,
  getProductByHandle,
  listProductPage,
  listProducts,
  removeCartLines,
  updateCartLine,
} from "./shopify";
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
    accountUrl: publicProcedure.query(() => getCustomerAccountUrl()),
    cart: router({
      get: publicProcedure.query(({ ctx }) => getCart(ctx.req, ctx.res)),
      add: publicProcedure
        .input(z.object({ merchandiseId: z.string().min(1).max(200), quantity: z.number().int().min(1).max(99) }))
        .mutation(({ ctx, input }) => addCartLine(ctx.req, ctx.res, input.merchandiseId, input.quantity)),
      update: publicProcedure
        .input(z.object({ lineId: z.string().min(1).max(200), quantity: z.number().int().min(1).max(99) }))
        .mutation(({ ctx, input }) => updateCartLine(ctx.req, ctx.res, input.lineId, input.quantity)),
      remove: publicProcedure
        .input(z.object({ lineIds: z.array(z.string().min(1).max(200)).min(1).max(50) }))
        .mutation(({ ctx, input }) => removeCartLines(ctx.req, ctx.res, input.lineIds)),
    }),
  }),
});

export type AppRouter = typeof appRouter;
