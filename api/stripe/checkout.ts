import { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';

async function readJson(req: VercelRequest) {
  if (typeof req.body === 'object' && req.body) return req.body;
  const chunks: Buffer[] = [];
  for await (const ch of req) chunks.push(Buffer.from(ch));
  const raw = Buffer.concat(chunks as any).toString('utf8') || '{}';
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).setHeader('Allow', 'POST, OPTIONS').end('Method Not Allowed');
  }

  try {
    console.log('[CHECKOUT] POST recebido!');
    
    const { priceId, userId } = await readJson(req);

    console.log('[CHECKOUT] Dados recebidos:', { priceId, userId });

    if (!priceId || !userId) {
      console.error('[CHECKOUT] Dados inválidos:', { priceId, userId });
      return res.status(400).json({ error: 'priceId e userId são obrigatórios' });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
      apiVersion: '2025-10-29.clover',
    });

    const baseUrl = process.env.EXPO_PUBLIC_APP_URL || 'https://controledemaquina.com.br';

    console.log('[CHECKOUT] Criando sessão do Stripe...');

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

    console.log('[CHECKOUT] Sessão criada:', session.id);

    return res.status(200).json({ url: session.url });
  } catch (e: any) {
    console.error('[CHECKOUT] Erro:', e?.message);
    return res.status(500).json({ error: 'checkout_failed', details: e?.message });
  }
}

export const config = {
  runtime: 'nodejs',
};
