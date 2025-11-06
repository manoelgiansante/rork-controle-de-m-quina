import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase/client';
import { Stack, useRouter } from 'expo-router';
import { AlertCircle, Trash2, CheckCircle } from 'lucide-react-native';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function DeleteAccountScreen() {
  const { currentUser, logout } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [confirmText, setConfirmText] = useState<string>('');
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [deleteSuccess, setDeleteSuccess] = useState<boolean>(false);

  const handleDeleteAccount = async () => {
    if (confirmText.toLowerCase() !== 'excluir') {
      if (Platform.OS === 'web') {
        window.alert('Por favor, digite "EXCLUIR" para confirmar a exclusão da conta.');
      } else {
        Alert.alert('Erro', 'Por favor, digite "EXCLUIR" para confirmar a exclusão da conta.');
      }
      return;
    }

    if (!currentUser) {
      if (Platform.OS === 'web') {
        window.alert('Você precisa estar logado para excluir sua conta.');
      } else {
        Alert.alert('Erro', 'Você precisa estar logado para excluir sua conta.');
      }
      return;
    }

    const confirmDelete = Platform.OS === 'web' 
      ? window.confirm(
          'ATENÇÃO: Esta ação é IRREVERSÍVEL!\n\n' +
          'Ao confirmar, todos os seus dados serão permanentemente excluídos:\n' +
          '• Todas as máquinas cadastradas\n' +
          '• Todo o histórico de manutenções\n' +
          '• Todo o histórico de abastecimentos\n' +
          '• Todas as propriedades\n' +
          '• Sua conta e perfil\n' +
          '• Sua assinatura será cancelada\n\n' +
          'Tem certeza que deseja continuar?'
        )
      : await new Promise<boolean>((resolve) => {
          Alert.alert(
            'ATENÇÃO: Ação Irreversível',
            'Ao confirmar, todos os seus dados serão permanentemente excluídos:\n\n' +
            '• Todas as máquinas cadastradas\n' +
            '• Todo o histórico de manutenções\n' +
            '• Todo o histórico de abastecimentos\n' +
            '• Todas as propriedades\n' +
            '• Sua conta e perfil\n' +
            '• Sua assinatura será cancelada\n\n' +
            'Tem certeza que deseja continuar?',
            [
              { text: 'Cancelar', style: 'cancel', onPress: () => resolve(false) },
              { text: 'Excluir Tudo', style: 'destructive', onPress: () => resolve(true) },
            ]
          );
        });

    if (!confirmDelete) {
      return;
    }

    setIsDeleting(true);

    try {
      console.log('[DELETE ACCOUNT] Iniciando exclusão da conta...', { userId: currentUser.id });

      if (Platform.OS === 'web') {
        const { error: deleteError } = await supabase.rpc('delete_user_account', {
          user_id_to_delete: currentUser.id
        });

        if (deleteError) {
          console.error('[DELETE ACCOUNT] Erro ao excluir dados:', deleteError);
          throw deleteError;
        }

        const { error: authError } = await supabase.auth.admin.deleteUser(currentUser.id);

        if (authError) {
          console.error('[DELETE ACCOUNT] Erro ao excluir usuário do auth:', authError);
        }

        console.log('[DELETE ACCOUNT] Conta excluída com sucesso');
        setDeleteSuccess(true);

        setTimeout(async () => {
          await logout();
          router.replace('/login');
        }, 3000);
      } else {
        const response = await fetch('https://controledemaquina.com.br/api/delete-account', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: currentUser.id,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Erro ao excluir conta');
        }

        console.log('[DELETE ACCOUNT] Conta excluída com sucesso');
        setDeleteSuccess(true);

        setTimeout(async () => {
          await logout();
          router.replace('/login');
        }, 3000);
      }

    } catch (error: any) {
      console.error('[DELETE ACCOUNT] Erro:', error);
      
      if (Platform.OS === 'web') {
        window.alert(
          'Erro ao excluir conta\n\n' +
          'Não foi possível excluir sua conta. Por favor, entre em contato com o suporte: suporte@controledemaquina.com.br'
        );
      } else {
        Alert.alert(
          'Erro ao excluir conta',
          'Não foi possível excluir sua conta. Por favor, entre em contato com o suporte: suporte@controledemaquina.com.br',
          [{ text: 'OK' }]
        );
      }
    } finally {
      setIsDeleting(false);
    }
  };

  if (deleteSuccess) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Stack.Screen
          options={{
            title: 'Conta Excluída',
            headerShown: true,
          }}
        />
        <View style={styles.successContainer}>
          <CheckCircle size={80} color="#2D5016" />
          <Text style={styles.successTitle}>Conta Excluída com Sucesso</Text>
          <Text style={styles.successText}>
            Todos os seus dados foram permanentemente removidos.
          </Text>
          <Text style={styles.successText}>
            Você será redirecionado em alguns segundos...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Stack.Screen
        options={{
          title: 'Exclusão de Conta',
          headerShown: true,
        }}
      />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <View style={styles.header}>
            <AlertCircle size={64} color="#DC2626" />
            <Text style={styles.title}>Exclusão de Conta</Text>
            <Text style={styles.subtitle}>
              Esta ação não pode ser desfeita
            </Text>
          </View>

          <View style={styles.warningCard}>
            <Text style={styles.warningTitle}>⚠️ ATENÇÃO</Text>
            <Text style={styles.warningText}>
              Ao excluir sua conta, os seguintes dados serão{' '}
              <Text style={styles.warningBold}>permanentemente removidos</Text>:
            </Text>
          </View>

          <View style={styles.infoCard}>
            <View style={styles.infoItem}>
              <Text style={styles.infoBullet}>•</Text>
              <Text style={styles.infoText}>Todas as máquinas cadastradas</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoBullet}>•</Text>
              <Text style={styles.infoText}>Todo o histórico de manutenções</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoBullet}>•</Text>
              <Text style={styles.infoText}>Todo o histórico de abastecimentos</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoBullet}>•</Text>
              <Text style={styles.infoText}>Todas as propriedades</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoBullet}>•</Text>
              <Text style={styles.infoText}>Sua conta e perfil</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoBullet}>•</Text>
              <Text style={styles.infoText}>Sua assinatura (se houver)</Text>
            </View>
          </View>

          <View style={styles.noteCard}>
            <Text style={styles.noteTitle}>📝 Importante</Text>
            <Text style={styles.noteText}>
              • Esta ação é irreversível e seus dados não poderão ser recuperados
            </Text>
            <Text style={styles.noteText}>
              • Se você possui uma assinatura ativa, ela será cancelada automaticamente
            </Text>
            <Text style={styles.noteText}>
              • Você pode criar uma nova conta no futuro, mas terá que começar do zero
            </Text>
          </View>

          {currentUser ? (
            <>
              <View style={styles.confirmSection}>
                <Text style={styles.confirmLabel}>
                  Para confirmar, digite{' '}
                  <Text style={styles.confirmKeyword}>EXCLUIR</Text> abaixo:
                </Text>
                <TextInput
                  style={styles.confirmInput}
                  value={confirmText}
                  onChangeText={setConfirmText}
                  placeholder="Digite EXCLUIR"
                  placeholderTextColor="#999"
                  autoCapitalize="characters"
                  autoCorrect={false}
                  editable={!isDeleting}
                />
              </View>

              <TouchableOpacity
                style={[
                  styles.deleteButton,
                  (isDeleting || confirmText.toLowerCase() !== 'excluir') && styles.deleteButtonDisabled
                ]}
                onPress={handleDeleteAccount}
                disabled={isDeleting || confirmText.toLowerCase() !== 'excluir'}
              >
                {isDeleting ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <>
                    <Trash2 size={20} color="#FFF" />
                    <Text style={styles.deleteButtonText}>
                      Excluir Permanentemente Minha Conta
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => router.back()}
                disabled={isDeleting}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.loginRequired}>
              <Text style={styles.loginRequiredText}>
                Você precisa estar logado para excluir sua conta.
              </Text>
              <TouchableOpacity
                style={styles.loginButton}
                onPress={() => router.replace('/login')}
              >
                <Text style={styles.loginButtonText}>Fazer Login</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.supportSection}>
            <Text style={styles.supportText}>
              Precisa de ajuda ou quer conversar antes de excluir?
            </Text>
            <Text style={styles.supportEmail}>
              Entre em contato: suporte@controledemaquina.com.br
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center' as const,
    marginBottom: 24,
    marginTop: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: '#DC2626',
    marginTop: 16,
    textAlign: 'center' as const,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 8,
    textAlign: 'center' as const,
  },
  warningCard: {
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#DC2626',
  },
  warningTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#DC2626',
    marginBottom: 12,
    textAlign: 'center' as const,
  },
  warningText: {
    fontSize: 15,
    color: '#991B1B',
    lineHeight: 22,
    textAlign: 'center' as const,
  },
  warningBold: {
    fontWeight: '700' as const,
    color: '#DC2626',
  },
  infoCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  infoItem: {
    flexDirection: 'row' as const,
    marginBottom: 12,
  },
  infoBullet: {
    fontSize: 18,
    color: '#DC2626',
    marginRight: 10,
    fontWeight: '700' as const,
  },
  infoText: {
    fontSize: 15,
    color: '#374151',
    flex: 1,
    lineHeight: 22,
  },
  noteCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    padding: 20,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  noteTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#92400E',
    marginBottom: 12,
  },
  noteText: {
    fontSize: 14,
    color: '#78350F',
    lineHeight: 20,
    marginBottom: 8,
  },
  confirmSection: {
    marginBottom: 24,
  },
  confirmLabel: {
    fontSize: 16,
    color: '#374151',
    marginBottom: 12,
    textAlign: 'center' as const,
    lineHeight: 22,
  },
  confirmKeyword: {
    fontWeight: '700' as const,
    color: '#DC2626',
    fontSize: 17,
  },
  confirmInput: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 16,
    fontSize: 16,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    textAlign: 'center' as const,
    fontWeight: '600' as const,
  },
  deleteButton: {
    backgroundColor: '#DC2626',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    flexDirection: 'row' as const,
    gap: 10,
    marginBottom: 16,
    minHeight: 56,
  },
  deleteButtonDisabled: {
    backgroundColor: '#D1D5DB',
    opacity: 0.6,
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#FFF',
  },
  cancelButton: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    marginBottom: 30,
    minHeight: 56,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#374151',
  },
  supportSection: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 20,
    marginTop: 20,
  },
  supportText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center' as const,
    marginBottom: 8,
    lineHeight: 20,
  },
  supportEmail: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#2D5016',
    textAlign: 'center' as const,
  },
  loginRequired: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 30,
    alignItems: 'center' as const,
    marginBottom: 20,
  },
  loginRequiredText: {
    fontSize: 16,
    color: '#374151',
    textAlign: 'center' as const,
    marginBottom: 20,
    lineHeight: 22,
  },
  loginButton: {
    backgroundColor: '#2D5016',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 32,
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#FFF',
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    padding: 40,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#2D5016',
    marginTop: 24,
    marginBottom: 16,
    textAlign: 'center' as const,
  },
  successText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center' as const,
    marginBottom: 8,
    lineHeight: 22,
  },
});
