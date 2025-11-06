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

    // Buscar o email do usuário no Supabase
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.EXPO_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId);
    
    if (userError || !userData?.user?.email) {
      console.error('[CHECKOUT] Erro ao buscar usuário:', userError);
      return res.status(400).json({ error: 'Usuário não encontrado' });
    }

    const userEmail = userData.user.email;
    console.log('[CHECKOUT] Email do usuário:', userEmail);

    // Buscar ou criar customer no Stripe
    let customerId: string;
    const existingCustomers = await stripe.customers.list({
      email: userEmail,
      limit: 1,
    });

    if (existingCustomers.data.length > 0) {
      customerId = existingCustomers.data[0].id;
      console.log('[CHECKOUT] Customer existente encontrado:', customerId);
    } else {
      const newCustomer = await stripe.customers.create({
        email: userEmail,
        metadata: {
          userId,
        },
      });
      customerId = newCustomer.id;
      console.log('[CHECKOUT] Novo customer criado:', customerId);
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer: customerId,
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
      subscription_data: {
        metadata: {
          userId,
        },
      },
    });

    console.log('[CHECKOUT] Sessão criada:', session.id);

    return res.status(200).json({ url: session.url });
  } catch (e: any) {
    console.error('[CHECKOUT] Erro:', e?.message);
    return res.status(500).json({ error: 'checkout_failed', details: e?.message });
  }
}


