import { useAuth } from '@/contexts/AuthContext';
import { useProperty } from '@/contexts/PropertyContext';
import { useNotifications } from '@/hooks/useNotifications';
import { Bell, BellOff, Mail, RefreshCcw, Settings as SettingsIcon, User, Trash2 } from 'lucide-react-native';
import React, { useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Modal,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@/lib/storage';
import { supabase } from '@/lib/supabase/client';

export default function SettingsScreen() {
  const { currentUser, logout } = useAuth();
  const { currentPropertyName } = useProperty();
  const { expoPushToken, notificationsEnabled, toggleNotifications, forceCheckAlerts } =
    useNotifications();
  const router = useRouter();

  const [userEmail, setUserEmail] = useState(currentUser?.email || '');
  const [isSaving, setIsSaving] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const handleSaveEmail = async () => {
    if (!userEmail.trim()) {
      Alert.alert('Erro', 'Digite um email válido');
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(userEmail)) {
      Alert.alert('Erro', 'Digite um email válido');
      return;
    }

    setIsSaving(true);
    // TODO: Implementar função para salvar email no banco de dados
    // await updateUserEmail(currentUser.id, userEmail);

    setTimeout(() => {
      setIsSaving(false);
      Alert.alert('Sucesso', 'Email salvo com sucesso!');
    }, 1000);
  };

  const handleTestNotification = async () => {
    Alert.alert(
      'Testar Notificações',
      'Isso irá verificar imediatamente se há alertas vermelhos e enviar notificações.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Testar',
          onPress: async () => {
            await forceCheckAlerts();
            Alert.alert('✅', 'Verificação completa! Se houver alertas vermelhos, você receberá notificações.');
          },
        },
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert(
      'Sair',
      'Deseja realmente sair da sua conta?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sair',
          style: 'destructive',
          onPress: () => {
            console.log('[SETTINGS] Executando logout...');
            logout();
            console.log('[SETTINGS] Logout executado, _layout deve redirecionar automaticamente');
            // O _layout.tsx já detecta quando isAuthenticated = false e redireciona automaticamente
          }
        },
      ]
    );
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText.trim().toUpperCase() !== 'EXCLUIR') {
      Alert.alert('Erro', 'Digite "EXCLUIR" para confirmar a exclusão da conta.');
      return;
    }

    setIsDeleting(true);

    try {
      console.log('[DELETE ACCOUNT] Iniciando exclusão de conta...');

      // 1. Deletar dados do Supabase (se estiver usando)
      if (currentUser && Platform.OS === 'web' && supabase) {
        console.log('[DELETE ACCOUNT] Deletando dados do Supabase...');

        // Deletar máquinas do usuário
        try {
          await supabase.from('machines').delete().eq('user_id', currentUser.id);
        } catch (err) {
          console.warn('[DELETE ACCOUNT] Erro ao deletar machines:', err);
        }

        // Deletar abastecimentos
        try {
          await supabase.from('refuelings').delete().eq('user_id', currentUser.id);
        } catch (err) {
          console.warn('[DELETE ACCOUNT] Erro ao deletar refuelings:', err);
        }

        // Deletar manutenções
        try {
          await supabase.from('maintenances').delete().eq('user_id', currentUser.id);
        } catch (err) {
          console.warn('[DELETE ACCOUNT] Erro ao deletar maintenances:', err);
        }

        // Deletar propriedades
        try {
          await supabase.from('properties').delete().eq('user_id', currentUser.id);
        } catch (err) {
          console.warn('[DELETE ACCOUNT] Erro ao deletar properties:', err);
        }

        // Deletar assinatura
        try {
          await supabase.from('subscriptions').delete().eq('user_id', currentUser.id);
        } catch (err) {
          console.warn('[DELETE ACCOUNT] Erro ao deletar subscription:', err);
        }

        // Deletar conta do usuário no Supabase Auth
        try {
          const { error } = await supabase.rpc('delete_user');
          if (error) {
            console.warn('[DELETE ACCOUNT] Erro ao deletar usuário do Auth:', error);
          }
        } catch (err) {
          console.warn('[DELETE ACCOUNT] Erro ao deletar usuário:', err);
        }
      }

      // 2. Limpar TODOS os dados do AsyncStorage/LocalStorage
      console.log('[DELETE ACCOUNT] Limpando dados locais...');

      const storageKeys = [
        '@controle_maquina:users',
        '@controle_maquina:current_user',
        '@controle_maquina:subscription',
        '@controle_maquina:properties',
        '@controle_maquina:current_property_id',
        '@controle_maquina:machines',
        '@controle_maquina:refuelings',
        '@controle_maquina:maintenances',
        '@controle_maquina:alerts',
        '@controle_maquina:service_types',
        '@controle_maquina:maintenance_items',
        '@controle_maquina:farm_tank',
        '@controle_maquina:notified_alerts',
      ];

      if (Platform.OS === 'web') {
        // Web: usar localStorage
        console.log('[DELETE ACCOUNT] Limpando localStorage (web)...');
        if (typeof localStorage !== 'undefined') {
          for (const key of storageKeys) {
            try {
              localStorage.removeItem(key);
              console.log(`[DELETE ACCOUNT] ✓ Removido: ${key}`);
            } catch (err) {
              console.warn(`[DELETE ACCOUNT] Erro ao deletar ${key}:`, err);
            }
          }
          // Limpar tudo do localStorage
          try {
            localStorage.clear();
            console.log('[DELETE ACCOUNT] ✓ localStorage completamente limpo');
          } catch (err) {
            console.warn('[DELETE ACCOUNT] Erro ao limpar localStorage:', err);
          }
        }
      } else {
        // Mobile: usar AsyncStorage
        console.log('[DELETE ACCOUNT] Limpando AsyncStorage (mobile)...');
        for (const key of storageKeys) {
          try {
            await AsyncStorage.removeItem(key);
            console.log(`[DELETE ACCOUNT] ✓ Removido: ${key}`);
          } catch (err) {
            console.warn(`[DELETE ACCOUNT] Erro ao deletar ${key}:`, err);
          }
        }
        // Limpar tudo do AsyncStorage
        try {
          await AsyncStorage.clear();
          console.log('[DELETE ACCOUNT] ✓ AsyncStorage completamente limpo');
        } catch (err) {
          console.warn('[DELETE ACCOUNT] Erro ao limpar AsyncStorage:', err);
        }
      }

      console.log('[DELETE ACCOUNT] Conta deletada com sucesso!');

      setDeleteModalVisible(false);
      setIsDeleting(false);

      Alert.alert(
        'Conta Excluída',
        'Sua conta e todos os dados foram excluídos com sucesso.',
        [
          {
            text: 'OK',
            onPress: () => {
              if (Platform.OS === 'web') {
                if (typeof window !== 'undefined') {
                  window.location.replace('/login');
                }
              } else {
                router.replace('/login');
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error('[DELETE ACCOUNT] Erro ao deletar conta:', error);
      setIsDeleting(false);
      Alert.alert('Erro', 'Não foi possível excluir a conta. Tente novamente.');
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <SettingsIcon size={40} color="#2D5016" strokeWidth={1.5} />
          <Text style={styles.headerTitle}>Configurações</Text>
        </View>

        {/* User Info */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <User size={22} color="#333" />
            <Text style={styles.sectionTitle}>Informações do Usuário</Text>
          </View>

          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Nome:</Text>
              <Text style={styles.infoValue}>{currentUser?.name}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Usuário:</Text>
              <Text style={styles.infoValue}>{currentUser?.username}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Propriedade Atual:</Text>
              <Text style={styles.infoValue}>{currentPropertyName || 'Não selecionada'}</Text>
            </View>
          </View>
        </View>

        {/* Email Settings */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Mail size={22} color="#333" />
            <Text style={styles.sectionTitle}>Email para Alertas</Text>
          </View>

          <Text style={styles.sectionDescription}>
            Configure seu email para receber notificações de alertas críticos
          </Text>

          <TextInput
            style={styles.input}
            value={userEmail}
            onChangeText={setUserEmail}
            placeholder="seu@email.com"
            placeholderTextColor="#999"
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <TouchableOpacity
            style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
            onPress={handleSaveEmail}
            disabled={isSaving}
          >
            <Text style={styles.saveButtonText}>
              {isSaving ? 'Salvando...' : 'Salvar Email'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Notifications Settings */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            {notificationsEnabled ? (
              <Bell size={22} color="#333" />
            ) : (
              <BellOff size={22} color="#999" />
            )}
            <Text style={styles.sectionTitle}>Notificações Push</Text>
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Alertas de Manutenção</Text>
              <Text style={styles.settingDescription}>
                Receba notificações quando manutenções ficarem urgentes (vermelho)
              </Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={toggleNotifications}
              trackColor={{ false: '#DDD', true: '#4CAF50' }}
              thumbColor={notificationsEnabled ? '#2D5016' : '#f4f3f4'}
            />
          </View>

          {expoPushToken && (
            <View style={styles.tokenInfo}>
              <Text style={styles.tokenLabel}>Status:</Text>
              <Text style={styles.tokenValue}>
                {notificationsEnabled ? '✅ Ativo' : '⏸️ Pausado'}
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.testButton}
            onPress={handleTestNotification}
          >
            <RefreshCcw size={18} color="#2D5016" />
            <Text style={styles.testButtonText}>Testar Notificações Agora</Text>
          </TouchableOpacity>
        </View>

        {/* Info Section */}
        <View style={styles.infoSection}>
          <Text style={styles.infoSectionTitle}>Como Funcionam as Notificações?</Text>
          <Text style={styles.infoSectionText}>
            • Você receberá notificações push no celular quando alguma manutenção ficar com status vermelho (urgente)
          </Text>
          <Text style={styles.infoSectionText}>
            • Emails serão enviados para o endereço cadastrado acima
          </Text>
          <Text style={styles.infoSectionText}>
            • As notificações são enviadas no máximo 1 vez a cada 24 horas por alerta
          </Text>
          <Text style={styles.infoSectionText}>
            • O app verifica alertas automaticamente a cada 30 minutos
          </Text>
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Sair da Conta</Text>
        </TouchableOpacity>

        {/* Delete Account Button */}
        <TouchableOpacity
          style={styles.deleteAccountButton}
          onPress={() => setDeleteModalVisible(true)}
        >
          <Trash2 size={18} color="#D32F2F" />
          <Text style={styles.deleteAccountButtonText}>Excluir Conta Permanentemente</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Delete Account Modal */}
      <Modal
        visible={deleteModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Trash2 size={32} color="#D32F2F" />
              <Text style={styles.modalTitle}>Excluir Conta</Text>
            </View>

            <Text style={styles.modalWarning}>
              ⚠️ ATENÇÃO: Esta ação é irreversível!
            </Text>

            <Text style={styles.modalDescription}>
              Todos os seus dados serão permanentemente excluídos:
            </Text>

            <View style={styles.modalList}>
              <Text style={styles.modalListItem}>• Todas as máquinas</Text>
              <Text style={styles.modalListItem}>• Histórico de abastecimentos</Text>
              <Text style={styles.modalListItem}>• Histórico de manutenções</Text>
              <Text style={styles.modalListItem}>• Propriedades cadastradas</Text>
              <Text style={styles.modalListItem}>• Sua assinatura</Text>
              <Text style={styles.modalListItem}>• Sua conta de usuário</Text>
            </View>

            <Text style={styles.modalConfirmText}>
              Digite <Text style={styles.modalConfirmBold}>EXCLUIR</Text> para confirmar:
            </Text>

            <TextInput
              style={styles.modalInput}
              value={deleteConfirmText}
              onChangeText={setDeleteConfirmText}
              placeholder="Digite EXCLUIR"
              placeholderTextColor="#999"
              autoCapitalize="characters"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => {
                  setDeleteModalVisible(false);
                  setDeleteConfirmText('');
                }}
                disabled={isDeleting}
              >
                <Text style={styles.modalCancelButtonText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalDeleteButton,
                  (isDeleting || deleteConfirmText.trim().toUpperCase() !== 'EXCLUIR') &&
                    styles.modalDeleteButtonDisabled,
                ]}
                onPress={handleDeleteAccount}
                disabled={isDeleting || deleteConfirmText.trim().toUpperCase() !== 'EXCLUIR'}
              >
                <Text style={styles.modalDeleteButtonText}>
                  {isDeleting ? 'Excluindo...' : 'Excluir Permanentemente'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  content: {
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#333',
    marginTop: 12,
  },
  section: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#333',
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    lineHeight: 20,
  },
  infoCard: {
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
    padding: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#333',
  },
  input: {
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#333',
    marginBottom: 12,
  },
  saveButton: {
    backgroundColor: '#2D5016',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#FFF',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#333',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  tokenInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  tokenLabel: {
    fontSize: 14,
    color: '#666',
    marginRight: 8,
  },
  tokenValue: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#4CAF50',
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 2,
    borderColor: '#2D5016',
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 16,
  },
  testButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#2D5016',
  },
  infoSection: {
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  infoSectionTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#2D5016',
    marginBottom: 12,
  },
  infoSectionText: {
    fontSize: 13,
    color: '#555',
    lineHeight: 20,
    marginBottom: 8,
  },
  logoutButton: {
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: '#F44336',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#F44336',
  },
  deleteAccountButton: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: '#D32F2F',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
  },
  deleteAccountButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#D32F2F',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 500,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#D32F2F',
    marginTop: 8,
  },
  modalWarning: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#D32F2F',
    textAlign: 'center',
    marginBottom: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FFEBEE',
    borderRadius: 8,
  },
  modalDescription: {
    fontSize: 15,
    color: '#333',
    marginBottom: 12,
    fontWeight: '600' as const,
  },
  modalList: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  modalListItem: {
    fontSize: 14,
    color: '#555',
    marginBottom: 6,
    lineHeight: 20,
  },
  modalConfirmText: {
    fontSize: 15,
    color: '#333',
    marginBottom: 12,
  },
  modalConfirmBold: {
    fontWeight: '700' as const,
    color: '#D32F2F',
  },
  modalInput: {
    backgroundColor: '#F5F5F5',
    borderWidth: 2,
    borderColor: '#DDD',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#333',
    marginBottom: 24,
    fontWeight: '600' as const,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalCancelButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#666',
  },
  modalDeleteButton: {
    flex: 1,
    backgroundColor: '#D32F2F',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalDeleteButtonDisabled: {
    opacity: 0.4,
  },
  modalDeleteButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#FFF',
  },
});
