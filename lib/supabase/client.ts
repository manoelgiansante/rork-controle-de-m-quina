import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

let storage: any = undefined;
if (Platform.OS !== 'web') {
  storage = require('@react-native-async-storage/async-storage').default;
}

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://byfgflxlmcdciupjpoaz.supabase.co';
const supabaseAnon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ5ZmdmbHhsbWNkY2l1cGpwb2F6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3MDEyMjgsImV4cCI6MjA3NzI3NzIyOH0.6XZTCN2LtJYLs9ovXbjk8ljosQjEQVL3IDWq15l4mQg';

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
