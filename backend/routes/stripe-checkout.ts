import { Hono } from 'hono';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-10-29.clover',
});

const app = new Hono();

app.post('/api/stripe/checkout', async (c) => {
  try {
    const body = await c.req.json();
    const { priceId, userId } = body;

    console.log('[STRIPE_CHECKOUT] Criando sessão:', { priceId, userId });

    if (!priceId || !userId) {
      console.error('[STRIPE_CHECKOUT] Dados inválidos:', { priceId, userId });
      return c.json({ error: 'priceId e userId são obrigatórios' }, 400);
    }

    const baseUrl = process.env.EXPO_PUBLIC_APP_URL || 'https://controledemaquina.com.br';

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${baseUrl}/subscription?success=true`,
      cancel_url: `${baseUrl}/subscription?canceled=true`,
      metadata: {
        userId,
      },
    });

    console.log('[STRIPE_CHECKOUT] Sessão criada:', session.id);

    return c.json({ url: session.url });
  } catch (error: any) {
    console.error('[STRIPE_CHECKOUT] Erro ao criar sessão:', error.message);
    return c.json({ error: error.message }, 500);
  }
});

export default app;
