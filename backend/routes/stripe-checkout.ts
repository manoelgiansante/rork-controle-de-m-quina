import { Hono } from 'hono'
import Stripe from 'stripe'

export const stripeCheckout = new Hono()
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

stripeCheckout.options('/stripe/checkout', (c) => c.body(null, 204))

stripeCheckout.post('/stripe/checkout', async (c) => {
  try {
    const { priceId, userId } = await c.req.json()
    if (!priceId) return c.json({ error: 'missing_priceId' }, 400)

    const base =
      process.env.EXPO_PUBLIC_APP_URL || 'https://controledemaquina.com.br'

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${base}/subscription?success=true`,
      cancel_url: `${base}/subscription?canceled=true`,
      metadata: { userId: userId ?? '' },
    })

    console.log('[CHECKOUT] created', session.id)
    return c.json({ url: session.url }, 200)
  } catch (err: any) {
    console.error('[CHECKOUT] error', err)
    return c.json({ error: 'checkout_failed' }, 500)
  }
})

export default stripeCheckout
