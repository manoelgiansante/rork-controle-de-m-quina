import { Hono } from "hono";
import { trpcServer } from "@hono/trpc-server";
import { cors } from "hono/cors";
import { appRouter } from "./trpc/app-router";
import { createContext } from "./trpc/create-context";
import stripeWebhook from "./routes/stripe-webhook";
import stripeCheckout from "./routes/stripe-checkout";
import testRoute from "./routes/test-route";

const app = new Hono();

app.onError((err, c) => {
  console.error('[APP ERROR]', err);
  return c.text('Internal Error', 500);
});

app.notFound((c) => {
  console.warn('[NOT FOUND]', c.req.method, c.req.path);
  return c.text('Not Found', 404);
});

const ALLOWED_ORIGINS = [
  "https://controledemaquina.com.br",
  "https://www.controledemaquina.com.br",
  "https://controle-de-maquina.rork.app",
  "https://controledemaquina.rork.app",
  "http://localhost:8081",
  "http://localhost:19006",
];

app.use("*", cors({
  origin: (origin) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      return origin || ALLOWED_ORIGINS[0];
    }
    return ALLOWED_ORIGINS[0];
  },
  credentials: true,
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowHeaders: [
    "Content-Type",
    "Authorization",
    "x-trpc-source",
    "x-supabase-authorization",
    "Stripe-Signature",
  ],
  exposeHeaders: ["Content-Length"],
  maxAge: 86400,
}));

console.log('[HONO] Registrando rotas Stripe (checkout antes do webhook)...');
app.route("/api", stripeCheckout);
app.route("/api", stripeWebhook);
console.log('[HONO] Rotas Stripe registradas.');

console.log('[HONO] Registrando rotas de teste...');
app.route("/api", testRoute);
console.log('[HONO] Rotas de teste registradas.');

app.use(
  "/api/trpc/*",
  trpcServer({
    endpoint: "/api/trpc",
    router: appRouter,
    createContext,
  })
);

app.get("/", (c) => {
  return c.json({ status: "ok", message: "API is running" });
});

app.post("/logout", (c) => {
  c.header('Set-Cookie', 'session=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax');
  c.header('Set-Cookie', 'auth=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax');
  c.header('Set-Cookie', 'token=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax');
  return c.json({ success: true, message: "Logged out successfully" });
});

export default app;
