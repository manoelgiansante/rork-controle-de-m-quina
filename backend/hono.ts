import { Hono } from "hono";
import { trpcServer } from "@hono/trpc-server";
import { cors } from "hono/cors";
import { appRouter } from "./trpc/app-router";
import { createContext } from "./trpc/create-context";

const app = new Hono();

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
    console.log('[CORS] Request origin:', origin);
    console.log('[CORS] Allowed origins:', ALLOWED_ORIGINS);
    if (!origin) {
      console.log('[CORS] No origin header, allowing first allowed origin');
      return ALLOWED_ORIGINS[0];
    }
    if (ALLOWED_ORIGINS.includes(origin)) {
      console.log('[CORS] Origin allowed:', origin);
      return origin;
    }
    console.log('[CORS] Origin not allowed:', origin);
    return ALLOWED_ORIGINS[0];
  },
  credentials: true,
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowHeaders: [
    "Content-Type",
    "Authorization",
    "x-trpc-source",
    "x-supabase-authorization",
    "access-control-request-headers",
    "access-control-request-method",
  ],
  exposeHeaders: ["Content-Length"],
  maxAge: 86400,
}));

app.options("*", (c) => {
  const origin = c.req.header('origin');
  const requestHeaders = c.req.header('access-control-request-headers');
  const requestMethod = c.req.header('access-control-request-method');
  
  console.log('[OPTIONS] Handling preflight request');
  console.log('[OPTIONS] Origin:', origin);
  console.log('[OPTIONS] Request Headers:', requestHeaders);
  console.log('[OPTIONS] Request Method:', requestMethod);
  console.log('[OPTIONS] Allowed Origins:', ALLOWED_ORIGINS);
  
  const allowedOrigin = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  
  c.header('Access-Control-Allow-Origin', allowedOrigin);
  c.header('Access-Control-Allow-Credentials', 'true');
  c.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  c.header('Access-Control-Allow-Headers', 'Content-Type,Authorization,x-trpc-source,x-supabase-authorization,access-control-request-headers,access-control-request-method');
  c.header('Access-Control-Max-Age', '86400');
  c.header('Vary', 'Origin');
  
  console.log('[OPTIONS] Response headers set:');
  console.log('[OPTIONS] - Access-Control-Allow-Origin:', allowedOrigin);
  console.log('[OPTIONS] - Access-Control-Allow-Credentials: true');
  console.log('[OPTIONS] - Access-Control-Allow-Methods: GET,POST,PUT,DELETE,OPTIONS');
  
  c.status(204);
  return c.body(null);
});

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
