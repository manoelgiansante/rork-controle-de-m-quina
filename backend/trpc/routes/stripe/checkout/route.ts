import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { publicProcedure } from '../../../create-context';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-10-29.clover',
});

export const stripeCheckoutProcedure = publicProcedure
  .input(
    z.object({
      priceId: z.string(),
      userId: z.string(),
      email: z.string().email(),
    })
  )
  .mutation(async ({ input }) => {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://controledemaquina.com.br';

      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [
          {
            price: input.priceId,
            quantity: 1,
          },
        ],
        success_url: `${baseUrl}/subscription?success=true&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/subscription?canceled=true`,
        customer_email: input.email,
        metadata: {
          userId: input.userId,
        },
        subscription_data: {
          metadata: {
            userId: input.userId,
          },
        },
      });

      if (!session.url) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Falha ao criar sessão de checkout',
        });
      }

      return {
        url: session.url,
        sessionId: session.id,
      };
    } catch (error) {
      console.error('[STRIPE_CHECKOUT] Error:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Erro ao criar checkout',
      });
    }
  });
