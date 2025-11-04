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

app.use("/*", cors({
  origin: (origin) => {
    console.log('[CORS] Request origin:', origin);
    if (!origin) {
      return ALLOWED_ORIGINS[0];
    }
    if (ALLOWED_ORIGINS.includes(origin)) {
      return origin;
    }
    console.log('[CORS] Origin not allowed:', origin);
    return null;
  },
  credentials: true,
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowHeaders: [
    "Content-Type",
    "Authorization",
    "x-trpc-source",
    "x-supabase-authorization",
  ],
  exposeHeaders: ["Content-Length"],
  maxAge: 86400,
}));

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
