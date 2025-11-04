import { Hono } from 'hono';

const app = new Hono();

console.log('[TEST-ROUTE] Módulo carregado');

app.get('/test', (c) => {
  console.log('[TEST] GET recebido!');
  return c.json({ ok: true, method: 'GET', path: c.req.path });
});

app.post('/test', (c) => {
  console.log('[TEST] POST recebido!');
  return c.json({ ok: true, method: 'POST', path: c.req.path });
});

export default app;
