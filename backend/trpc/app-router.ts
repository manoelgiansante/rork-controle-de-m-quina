import { createTRPCRouter } from "./create-context";
import hiRoute from "./routes/example/hi/route";
import { stripeCheckoutProcedure } from "./routes/stripe/checkout/route";
import { stripeWebhookProcedure } from "./routes/stripe/webhook/route";

export const appRouter = createTRPCRouter({
  example: createTRPCRouter({
    hi: hiRoute,
  }),
  stripe: createTRPCRouter({
    checkout: stripeCheckoutProcedure,
    webhook: stripeWebhookProcedure,
  }),
});

export type AppRouter = typeof appRouter;
