import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

let storage: any = undefined;
if (Platform.OS !== 'web') {
  storage = require('@react-native-async-storage/async-storage').default;
}

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnon) {
  console.error('[SUPABASE] ERRO: Credenciais não encontradas nas variáveis de ambiente!');
  console.error('[SUPABASE] Verifique se EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_ANON_KEY estão definidos no .env');
}

export const supabase = createClient(supabaseUrl, supabaseAnon, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage:
      Platform.OS === 'web'
        ? undefined
        : {
            getItem: (key: string) => storage.getItem(key),
            setItem: (key: string, value: string) => storage.setItem(key, value),
            removeItem: (key: string) => storage.removeItem(key),
          },
  },
});

console.log('[SUPABASE] Cliente inicializado com sucesso');
console.log('[SUPABASE] Plataforma:', Platform.OS);
console.log('[SUPABASE] Storage:', Platform.OS === 'web' ? 'localStorage (web)' : 'AsyncStorage (mobile)');
