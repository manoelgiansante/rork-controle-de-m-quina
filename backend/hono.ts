import { Hono } from 'hono'
import { handle } from 'hono/vercel'
import { cors } from 'hono/cors'
import { trpcServer } from '@hono/trpc-server'
import { appRouter } from './trpc/app-router'
import { createContext } from './trpc/create-context'
import stripeCheckout from './routes/stripe-checkout'
import stripeWebhook from './routes/stripe-webhook'

const app = new Hono()

app.use(
  '*',
  cors({
    origin: [
      'https://controledemaquina.com.br',
      'https://www.controledemaquina.com.br',
      'https://controle-de-maquina.rork.app',
      'https://controledemaquina.rork.app',
      'http://localhost:8081',
      'http://localhost:19006',
    ],
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'x-trpc-source', 'Stripe-Signature'],
  })
)

app.route('/api', stripeCheckout)
app.route('/api', stripeWebhook)

app.use(
  '/api/trpc/*',
  trpcServer({
    endpoint: '/api/trpc',
    router: appRouter,
    createContext,
  })
)

app.get('/api/ping', (c) => c.json({ ok: true }))

app.notFound((c) => c.json({ error: 'not_found' }, 404))
app.onError((err, c) => {
  console.error('[ERROR]', err)
  return c.json({ error: 'server_error' }, 500)
})

export default handle(app)
