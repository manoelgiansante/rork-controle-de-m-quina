import { useRouter, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { supabase } from '@/lib/supabase/client';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function AuthCallback() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verificando confirmação...');

  useEffect(() => {
    handleAuthCallback();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAuthCallback = async () => {
    try {
      console.log('[AUTH CALLBACK] Iniciando verificação de autenticação');
      console.log('[AUTH CALLBACK] Params:', params);

      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('[AUTH CALLBACK] Erro ao obter sessão:', error);
        setStatus('error');
        setMessage('Erro ao confirmar email. Tente fazer login.');
        setTimeout(() => {
          router.replace('/login?emailConfirmed=true');
        }, 2000);
        return;
      }

      if (session) {
        console.log('[AUTH CALLBACK] Sessão encontrada, usuário autenticado');
        setStatus('success');
        setMessage('Email confirmado! Redirecionando...');
        setTimeout(() => {
          router.replace('/machines');
        }, 1500);
      } else {
        console.log('[AUTH CALLBACK] Nenhuma sessão encontrada, redirecionando para login');
        setStatus('success');
        setMessage('Email confirmado! Faça login para continuar.');
        setTimeout(() => {
          router.replace('/login?emailConfirmed=true');
        }, 1500);
      }
    } catch (error) {
      console.error('[AUTH CALLBACK] Erro ao processar callback:', error);
      setStatus('error');
      setMessage('Erro ao confirmar email. Tente fazer login.');
      setTimeout(() => {
        router.replace('/login?emailConfirmed=true');
      }, 2000);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.content}>
        <ActivityIndicator size="large" color="#2D5016" />
        <Text style={styles.message}>{message}</Text>
        <Text style={styles.statusText}>
          {status === 'loading' && 'Processando...'}
          {status === 'success' && '✓ Sucesso!'}
          {status === 'error' && '✗ Erro'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  message: {
    fontSize: 18,
    color: '#333',
    textAlign: 'center',
    marginTop: 24,
    fontWeight: '600' as const,
  },
  statusText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
    textAlign: 'center',
  },
});
