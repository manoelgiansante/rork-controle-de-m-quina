import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'expo-router';
import { KeySquare } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ResetPasswordScreen() {
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (Platform.OS === 'web') {
      console.log('[RESET PASSWORD] Verificando sessão...');
      supabase.auth.getSession().then(({ data, error }) => {
        if (error) {
          console.error('[RESET PASSWORD] Erro ao obter sessão:', error);
        }
        if (data?.session) {
          console.log('[RESET PASSWORD] Sessão encontrada, usuário pode redefinir senha');
        } else {
          console.log('[RESET PASSWORD] Nenhuma sessão encontrada');
        }
      });
    }
  }, []);

  const handleSave = async () => {
    setMessage('');

    if (!password || password.length < 6) {
      setMessage('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setMessage('As senhas não conferem.');
      return;
    }

    if (Platform.OS !== 'web') {
      setMessage('Reset de senha disponível apenas no navegador.');
      return;
    }

    setIsLoading(true);
    console.log('[RESET PASSWORD] Atualizando senha...');

    try {
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        console.error('[RESET PASSWORD] Erro ao atualizar senha:', error.message);
        setMessage(error.message);
        setIsLoading(false);
        return;
      }

      console.log('[RESET PASSWORD] Senha atualizada com sucesso');
      setMessage('Senha atualizada com sucesso! Redirecionando...');
      setIsSuccess(true);

      setTimeout(() => {
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          window.location.href = '/login';
        } else {
          router.replace('/login');
        }
      }, 1500);
    } catch (error) {
      console.error('[RESET PASSWORD] Exceção ao atualizar senha:', error);
      setMessage('Erro ao atualizar senha. Tente novamente.');
      setIsLoading(false);
    }
  };

  const handleSubmitWeb = (e: any) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    handleSave();
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <KeySquare size={56} color="#2D5016" strokeWidth={1.5} />
          <Text style={styles.title}>Definir nova senha</Text>
          <Text style={styles.subtitle}>
            Digite sua nova senha para acessar sua conta
          </Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Nova senha</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="Digite sua nova senha"
              placeholderTextColor="#999"
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isLoading && !isSuccess}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Confirmar nova senha</Text>
            <TextInput
              style={styles.input}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Digite a senha novamente"
              placeholderTextColor="#999"
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isLoading && !isSuccess}
            />
          </View>

          {message && (
            <View style={[styles.messageContainer, isSuccess && styles.successMessage]}>
              <Text style={[styles.messageText, isSuccess && styles.successText]}>
                {message}
              </Text>
            </View>
          )}

          {Platform.OS === 'web' ? (
            <button
              type="button"
              onClick={handleSubmitWeb}
              disabled={isLoading || isSuccess}
              style={{
                width: '100%',
                backgroundColor: isLoading || isSuccess ? '#8BA673' : '#2D5016',
                borderRadius: 12,
                paddingTop: 16,
                paddingBottom: 16,
                paddingLeft: 16,
                paddingRight: 16,
                alignItems: 'center',
                marginTop: 8,
                border: 'none',
                cursor: isLoading || isSuccess ? 'not-allowed' : 'pointer',
                display: 'flex',
                justifyContent: 'center',
              }}
            >
              <span
                style={{
                  color: '#FFF',
                  fontSize: 17,
                  fontWeight: '600',
                }}
              >
                {isLoading ? 'Salvando...' : isSuccess ? 'Redirecionando...' : 'Salvar nova senha'}
              </span>
            </button>
          ) : (
            <TouchableOpacity
              style={[styles.saveButton, (isLoading || isSuccess) && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={isLoading || isSuccess}
            >
              <Text style={styles.saveButtonText}>
                {isLoading ? 'Salvando...' : isSuccess ? 'Redirecionando...' : 'Salvar nova senha'}
              </Text>
            </TouchableOpacity>
          )}

          {!isLoading && !isSuccess && (
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => {
                if (Platform.OS === 'web' && typeof window !== 'undefined') {
                  window.location.href = '/login';
                } else {
                  router.replace('/login');
                }
              }}
            >
              <Text style={styles.backButtonText}>Voltar para login</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
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
    paddingHorizontal: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: '#2D5016',
    marginTop: 16,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#333',
  },
  messageContainer: {
    backgroundColor: '#FFEBEE',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  successMessage: {
    backgroundColor: '#E8F5E9',
  },
  messageText: {
    fontSize: 14,
    color: '#C62828',
    textAlign: 'center',
  },
  successText: {
    color: '#2E7D32',
  },
  saveButton: {
    backgroundColor: '#2D5016',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonDisabled: {
    backgroundColor: '#8BA673',
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '600' as const,
  },
  backButton: {
    alignItems: 'center',
    marginTop: 16,
    paddingVertical: 12,
  },
  backButtonText: {
    fontSize: 15,
    color: '#2D5016',
    fontWeight: '600' as const,
  },
});
