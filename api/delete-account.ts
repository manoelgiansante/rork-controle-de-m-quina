import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  console.log('[DELETE ACCOUNT API] Request recebido');

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Método não permitido' }),
      {
        status: 405,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  try {
    const body = await req.json();
    const { userId } = body;

    if (!userId) {
      console.error('[DELETE ACCOUNT API] userId não fornecido');
      return new Response(
        JSON.stringify({ error: 'userId é obrigatório' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('[DELETE ACCOUNT API] Deletando conta do usuário:', userId);

    // Deleta todos os dados do usuário usando a função do Supabase
    const { error: deleteError } = await supabaseAdmin.rpc('delete_user_account', {
      user_id_to_delete: userId
    });

    if (deleteError) {
      console.error('[DELETE ACCOUNT API] Erro ao deletar dados:', deleteError);
      throw deleteError;
    }

    // Deleta o usuário do Auth
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (authError) {
      console.error('[DELETE ACCOUNT API] Erro ao deletar usuário do auth:', authError);
      // Não lança erro aqui, pois os dados já foram deletados
    }

    console.log('[DELETE ACCOUNT API] Conta deletada com sucesso');

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Conta deletada com sucesso'
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );

  } catch (error: any) {
    console.error('[DELETE ACCOUNT API] Erro:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Erro ao deletar conta',
        details: error.message 
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
