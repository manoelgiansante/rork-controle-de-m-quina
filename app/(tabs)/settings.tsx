import { useAuth } from '@/contexts/AuthContext';
import { useProperty } from '@/contexts/PropertyContext';
import { useNotifications } from '@/hooks/useNotifications';
import { Bell, BellOff, Mail, Settings as SettingsIcon, User, Trash2, Edit2, X } from 'lucide-react-native';
import React, { useState, useEffect } from 'react';
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
import { clearNotificationHistory } from '@/lib/notifications/alert-monitor';

const MAX_EMAILS = 3;
const NOTIFICATION_EMAILS_KEY = '@controle_maquina:notification_emails';

export default function SettingsScreen() {
  const { currentUser, logout } = useAuth();
  const { currentPropertyName } = useProperty();
  const { expoPushToken, notificationsEnabled, toggleNotifications, testEmailNotifications } = useNotifications();
  const [isClearing, setIsClearing] = useState(false);
  const router = useRouter();

  const [newEmail, setNewEmail] = useState('');
  const [savedEmails, setSavedEmails] = useState<string[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingEmail, setEditingEmail] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Carregar emails salvos ao montar o componente
  useEffect(() => {
    loadSavedEmails();
  }, []);

  const loadSavedEmails = async () => {
    try {
      const emailsJson = await AsyncStorage.getItem(NOTIFICATION_EMAILS_KEY);
      if (emailsJson) {
        const emails: string[] = JSON.parse(emailsJson);
        setSavedEmails(emails);
        console.log('[SETTINGS] Emails carregados:', emails);
      }
    } catch (error) {
      console.error('[SETTINGS] Erro ao carregar emails:', error);
    }
  };

  const handleAddEmail = async () => {
    const emailToAdd = newEmail.trim();

    if (!emailToAdd) {
      if (Platform.OS === 'web') {
        window.alert('Digite um email válido');
      } else {
        Alert.alert('Erro', 'Digite um email válido');
      }
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailToAdd)) {
      if (Platform.OS === 'web') {
        window.alert('Digite um email válido');
      } else {
        Alert.alert('Erro', 'Digite um email válido');
      }
      return;
    }

    // Check if email already exists
    if (savedEmails.includes(emailToAdd)) {
      if (Platform.OS === 'web') {
        window.alert('Este email já está cadastrado');
      } else {
        Alert.alert('Erro', 'Este email já está cadastrado');
      }
      return;
    }

    // Check max emails
    if (savedEmails.length >= MAX_EMAILS) {
      if (Platform.OS === 'web') {
        window.alert(`Você pode cadastrar no máximo ${MAX_EMAILS} emails`);
      } else {
        Alert.alert('Limite atingido', `Você pode cadastrar no máximo ${MAX_EMAILS} emails`);
      }
      return;
    }

    setIsSaving(true);

    try {
      console.log('[ADD EMAIL] Adicionando email:', emailToAdd);

      // Enviar email de teste
      const { error } = await supabase.functions.invoke('send-email', {
        body: {
          to: emailToAdd,
          subject: '✅ Email Configurado com Sucesso - Controle de Máquina',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #2D5016;">Email Configurado com Sucesso! 🎉</h2>

              <p>Olá, <strong>${currentUser?.name}</strong>!</p>

              <p>Este email foi configurado com sucesso no sistema <strong>Controle de Máquina</strong>.</p>

              <div style="background-color: #E8F5E9; border-left: 4px solid #2D5016; padding: 16px; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #2D5016;">📧 O que você vai receber:</h3>
                <ul style="margin-bottom: 0;">
                  <li>Alertas quando manutenções ficarem urgentes (vermelho ou amarelo)</li>
                  <li>Alertas quando o tanque de combustível estiver baixo</li>
                  <li>Notificações automáticas a cada 24 horas por alerta</li>
                  <li>Verificações automáticas a cada 30 minutos</li>
                </ul>
              </div>

              <p style="color: #666; font-size: 14px; margin-top: 30px;">
                Este é um email de teste para confirmar que tudo está funcionando corretamente.
              </p>

              <hr style="border: none; border-top: 1px solid #DDD; margin: 30px 0;">

              <p style="color: #999; font-size: 12px; text-align: center;">
                Controle de Máquina - Sistema de Gestão de Manutenção
              </p>
            </div>
          `,
        },
      });

      if (error) {
        console.error('[ADD EMAIL] Erro ao enviar email de teste:', error);
        throw error;
      }

      // Adicionar email à lista
      const updatedEmails = [...savedEmails, emailToAdd];
      await AsyncStorage.setItem(NOTIFICATION_EMAILS_KEY, JSON.stringify(updatedEmails));
      setSavedEmails(updatedEmails);
      setNewEmail('');
      setIsSaving(false);

      console.log('[ADD EMAIL] ✅ Email adicionado com sucesso');

      // Se for o primeiro email e tiver alertas, enviar notificação imediata
      const isFirstEmail = savedEmails.length === 0;
      let alertMessage = '';

      if (isFirstEmail) {
        alertMessage = '\n\n✅ A partir de agora você receberá:\n• Notificações diárias às 21h (se houver alertas críticos)\n• Máximo de 1 email por dia por alerta';
      }

      if (Platform.OS === 'web') {
        window.alert(`Email adicionado com sucesso!\n\nUm email de teste foi enviado para ${emailToAdd}.${alertMessage}\n\nVerifique sua caixa de entrada (ou spam).`);
      } else {
        Alert.alert(
          'Sucesso!',
          `Email adicionado e email de teste enviado para ${emailToAdd}!${alertMessage}\n\nVerifique sua caixa de entrada (ou spam).`
        );
      }
    } catch (error) {
      console.error('[ADD EMAIL] Erro:', error);
      setIsSaving(false);
      if (Platform.OS === 'web') {
        window.alert('Não foi possível adicionar o email. Verifique sua conexão e tente novamente.');
      } else {
        Alert.alert(
          'Erro',
          'Não foi possível adicionar o email. Verifique sua conexão e tente novamente.'
        );
      }
    }
  };

  const handleEditEmail = (index: number) => {
    setEditingIndex(index);
    setEditingEmail(savedEmails[index]);
  };

  const handleSaveEditedEmail = async (index: number) => {
    const emailToSave = editingEmail.trim();

    if (!emailToSave) {
      if (Platform.OS === 'web') {
        window.alert('Digite um email válido');
      } else {
        Alert.alert('Erro', 'Digite um email válido');
      }
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailToSave)) {
      if (Platform.OS === 'web') {
        window.alert('Digite um email válido');
      } else {
        Alert.alert('Erro', 'Digite um email válido');
      }
      return;
    }

    // Check if email already exists (excluding current index)
    if (savedEmails.some((email, i) => i !== index && email === emailToSave)) {
      if (Platform.OS === 'web') {
        window.alert('Este email já está cadastrado');
      } else {
        Alert.alert('Erro', 'Este email já está cadastrado');
      }
      return;
    }

    try {
      const updatedEmails = [...savedEmails];
      updatedEmails[index] = emailToSave;
      await AsyncStorage.setItem(NOTIFICATION_EMAILS_KEY, JSON.stringify(updatedEmails));
      setSavedEmails(updatedEmails);
      setEditingIndex(null);
      setEditingEmail('');

      console.log('[EDIT EMAIL] ✅ Email atualizado com sucesso');

      if (Platform.OS === 'web') {
        window.alert('Email atualizado com sucesso!');
      } else {
        Alert.alert('Sucesso!', 'Email atualizado com sucesso!');
      }
    } catch (error) {
      console.error('[EDIT EMAIL] Erro:', error);
      if (Platform.OS === 'web') {
        window.alert('Não foi possível atualizar o email. Tente novamente.');
      } else {
        Alert.alert('Erro', 'Não foi possível atualizar o email. Tente novamente.');
      }
    }
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditingEmail('');
  };

  const handleDeleteEmail = async (index: number) => {
    const emailToDelete = savedEmails[index];

    const confirmDelete = Platform.OS === 'web'
      ? window.confirm(`Deseja remover o email ${emailToDelete}?`)
      : await new Promise<boolean>((resolve) => {
          Alert.alert(
            'Remover Email',
            `Deseja remover o email ${emailToDelete}?`,
            [
              { text: 'Cancelar', style: 'cancel', onPress: () => resolve(false) },
              { text: 'Remover', style: 'destructive', onPress: () => resolve(true) },
            ]
          );
        });

    if (!confirmDelete) return;

    try {
      const updatedEmails = savedEmails.filter((_, i) => i !== index);
      await AsyncStorage.setItem(NOTIFICATION_EMAILS_KEY, JSON.stringify(updatedEmails));
      setSavedEmails(updatedEmails);

      console.log('[DELETE EMAIL] ✅ Email removido com sucesso');

      if (Platform.OS === 'web') {
        window.alert('Email removido com sucesso!');
      } else {
        Alert.alert('Sucesso!', 'Email removido com sucesso!');
      }
    } catch (error) {
      console.error('[DELETE EMAIL] Erro:', error);
      if (Platform.OS === 'web') {
        window.alert('Não foi possível remover o email. Tente novamente.');
      } else {
        Alert.alert('Erro', 'Não foi possível remover o email. Tente novamente.');
      }
    }
  };

  const handleClearNotificationHistory = async () => {
    console.log('[SETTINGS] handleClearNotificationHistory chamado');

    if (Platform.OS === 'web') {
      const confirmed = window.confirm('🗑️ Limpar Histórico de Notificações\n\nIsso irá limpar o registro de alertas já notificados, permitindo que sejam enviados novamente.\n\nÚtil para testes.\n\nDeseja continuar?');
      if (!confirmed) {
        return;
      }
    }

    setIsClearing(true);
    try {
      await clearNotificationHistory();
      console.log('[SETTINGS] ✅ Histórico limpo!');

      if (Platform.OS === 'web') {
        window.alert('✅ Histórico limpo!\n\nAgora você pode testar o envio de emails novamente.');
      } else {
        Alert.alert('✅ Sucesso', 'Histórico de notificações limpo!');
      }
    } catch (error) {
      console.error('[SETTINGS] Erro ao limpar histórico:', error);
      if (Platform.OS === 'web') {
        window.alert('❌ Erro ao limpar histórico');
      } else {
        Alert.alert('Erro', 'Não foi possível limpar o histórico');
      }
    } finally {
      setIsClearing(false);
    }
  };

  const handleTestEmailNotifications = async () => {
    console.log('[SETTINGS] handleTestEmailNotifications chamado');

    if (savedEmails.length === 0) {
      if (Platform.OS === 'web') {
        window.alert('❌ Nenhum email cadastrado!\n\nAdicione pelo menos um email para testar o envio de notificações.');
      } else {
        Alert.alert('Atenção', 'Adicione pelo menos um email para testar o envio de notificações.');
      }
      return;
    }

    if (Platform.OS === 'web') {
      const confirmed = window.confirm('🧪 Testar Envio de Emails (Simulação 21h)\n\nIsso irá simular o envio das 21h e enviar emails para todos os endereços cadastrados SE houver alertas críticos.\n\nDICA: Se não receber emails, clique em "Limpar Histórico" primeiro.\n\nDeseja continuar?');
      if (!confirmed) {
        console.log('[SETTINGS] Teste cancelado pelo usuário');
        return;
      }

      console.log('[SETTINGS] Iniciando teste de emails...');
      await testEmailNotifications();
      console.log('[SETTINGS] Teste concluído!');
      window.alert('✅ Teste concluído!\n\nVerifique o console para logs detalhados.\nSe houver alertas críticos (vermelho/amarelo), emails foram enviados para todos os endereços cadastrados.');
    } else {
      Alert.alert(
        '🧪 Testar Envio de Emails',
        'Isso irá simular o envio das 21h. SE houver alertas críticos, você receberá emails.',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Testar',
            onPress: async () => {
              await testEmailNotifications();
              Alert.alert('✅', 'Teste concluído! Verifique o console e seus emails se houver alertas críticos.');
            },
          },
        ]
      );
    }
  };

  const handleLogout = async () => {
    console.log('[SETTINGS] handleLogout chamado');

    // No web, usar window.confirm; no mobile, usar Alert.alert
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Deseja realmente sair da sua conta?');
      if (!confirmed) {
        console.log('[SETTINGS] Logout cancelado pelo usuário');
        return;
      }
    } else {
      // Mobile: usar Alert.alert tradicional
      Alert.alert(
        'Sair',
        'Deseja realmente sair da sua conta?',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Sair',
            style: 'destructive',
            onPress: () => performLogout(),
          }
        ]
      );
      return; // Sair aqui para mobile, performLogout será chamado pelo Alert
    }

    // Web: continuar diretamente
    await performLogout();
  };

  const performLogout = async () => {
    console.log('[SETTINGS] Executando logout...');
    try {
      await logout();
      console.log('[SETTINGS] Logout concluído');

      // Redirecionar
      setTimeout(() => {
        if (Platform.OS === 'web') {
          console.log('[SETTINGS] Redirecionando para /login (web)');
          window.location.href = '/login';
        } else {
          console.log('[SETTINGS] Redirecionando para /login (mobile)');
          router.replace('/login');
        }
      }, 100);
    } catch (error) {
      console.error('[SETTINGS] Erro ao fazer logout:', error);
      // Redirecionar mesmo com erro
      if (Platform.OS === 'web') {
        window.location.href = '/login';
      } else {
        router.replace('/login');
      }
    }
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
      // IMPORTANTE: NÃO deletar subscription do Supabase para evitar fraude
      if (currentUser && Platform.OS === 'web' && supabase) {
        console.log('[DELETE ACCOUNT] Deletando dados do Supabase (exceto subscription)...');

        // Deletar máquinas do usuário
        try {
          await supabase.from('machines').delete().eq('user_id', currentUser.id);
          console.log('[DELETE ACCOUNT] ✓ Machines deletadas do Supabase');
        } catch (err) {
          console.warn('[DELETE ACCOUNT] Erro ao deletar machines:', err);
        }

        // Deletar abastecimentos
        try {
          await supabase.from('refuelings').delete().eq('user_id', currentUser.id);
          console.log('[DELETE ACCOUNT] ✓ Refuelings deletados do Supabase');
        } catch (err) {
          console.warn('[DELETE ACCOUNT] Erro ao deletar refuelings:', err);
        }

        // Deletar manutenções
        try {
          await supabase.from('maintenances').delete().eq('user_id', currentUser.id);
          console.log('[DELETE ACCOUNT] ✓ Maintenances deletadas do Supabase');
        } catch (err) {
          console.warn('[DELETE ACCOUNT] Erro ao deletar maintenances:', err);
        }

        // Deletar propriedades
        try {
          await supabase.from('properties').delete().eq('user_id', currentUser.id);
          console.log('[DELETE ACCOUNT] ✓ Properties deletadas do Supabase');
        } catch (err) {
          console.warn('[DELETE ACCOUNT] Erro ao deletar properties:', err);
        }

        // NÃO DELETAR SUBSCRIPTION - deixar registro para evitar fraude
        console.log('[DELETE ACCOUNT] ℹ️ Subscription mantida no Supabase (anti-fraude)');

        // Deletar conta do usuário no Supabase Auth
        try {
          const { error } = await supabase.rpc('delete_user');
          if (error) {
            console.warn('[DELETE ACCOUNT] Erro ao deletar usuário do Auth:', error);
          } else {
            console.log('[DELETE ACCOUNT] ✓ Usuário deletado do Supabase Auth');
          }
        } catch (err) {
          console.warn('[DELETE ACCOUNT] Erro ao deletar usuário:', err);
        }
      }

      // 2. Limpar dados do AsyncStorage/LocalStorage
      // IMPORTANTE: NÃO apagar @controle_maquina:subscription para evitar fraude
      // (impede que a pessoa use os 7 dias grátis novamente)
      console.log('[DELETE ACCOUNT] Limpando dados locais (exceto subscription)...');

      const storageKeys = [
        '@controle_maquina:users',
        '@controle_maquina:current_user',
        // '@controle_maquina:subscription', // NÃO APAGAR - evita fraude de trial
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
          console.log('[DELETE ACCOUNT] ✓ Dados removidos (subscription preservada)');
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
        console.log('[DELETE ACCOUNT] ✓ Dados removidos (subscription preservada)');
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

        {/* Notifications Settings - Unified */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            {notificationsEnabled ? (
              <Bell size={22} color="#333" />
            ) : (
              <BellOff size={22} color="#999" />
            )}
            <Text style={styles.sectionTitle}>Notificações de Alertas</Text>
          </View>

          <Text style={styles.sectionDescription}>
            Receba notificações por email e push quando houver alertas críticos
          </Text>

          {/* Add New Email */}
          <View style={styles.emailContainer}>
            <Text style={styles.emailLabel}>
              Adicionar Email para Notificações ({savedEmails.length}/{MAX_EMAILS})
            </Text>
            <TextInput
              style={styles.input}
              value={newEmail}
              onChangeText={setNewEmail}
              placeholder="seu@email.com"
              placeholderTextColor="#999"
              keyboardType="email-address"
              autoCapitalize="none"
              editable={savedEmails.length < MAX_EMAILS}
            />

            <TouchableOpacity
              style={[
                styles.saveButton,
                (isSaving || savedEmails.length >= MAX_EMAILS) && styles.saveButtonDisabled,
              ]}
              onPress={handleAddEmail}
              disabled={isSaving || savedEmails.length >= MAX_EMAILS}
            >
              <Text style={styles.saveButtonText}>
                {isSaving ? 'Salvando...' : 'Adicionar Email'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Saved Emails List */}
          {savedEmails.length > 0 && (
            <View style={styles.savedEmailsContainer}>
              <Text style={styles.savedEmailsTitle}>Emails Cadastrados:</Text>
              {savedEmails.map((email, index) => (
                <View key={index} style={styles.emailItem}>
                  {editingIndex === index ? (
                    // Edit mode
                    <View style={styles.emailEditContainer}>
                      <TextInput
                        style={styles.emailEditInput}
                        value={editingEmail}
                        onChangeText={setEditingEmail}
                        placeholder="email@exemplo.com"
                        placeholderTextColor="#999"
                        keyboardType="email-address"
                        autoCapitalize="none"
                      />
                      <View style={styles.emailEditButtons}>
                        <TouchableOpacity
                          style={styles.emailSaveButton}
                          onPress={() => handleSaveEditedEmail(index)}
                        >
                          <Text style={styles.emailSaveButtonText}>Salvar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.emailCancelButton}
                          onPress={handleCancelEdit}
                        >
                          <X size={18} color="#666" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    // Display mode
                    <>
                      <View style={styles.emailTextContainer}>
                        <Mail size={18} color="#2D5016" />
                        <Text style={styles.emailText}>{email}</Text>
                      </View>
                      <View style={styles.emailActions}>
                        <TouchableOpacity
                          style={styles.emailEditButton}
                          onPress={() => handleEditEmail(index)}
                        >
                          <Edit2 size={18} color="#2D5016" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.emailDeleteButton}
                          onPress={() => handleDeleteEmail(index)}
                        >
                          <Trash2 size={18} color="#D32F2F" />
                        </TouchableOpacity>
                      </View>
                    </>
                  )}
                </View>
              ))}
            </View>
          )}

          {/* Push Notifications (Mobile Only) */}
          {Platform.OS !== 'web' && (
            <>
              <View style={styles.divider} />
              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingLabel}>Notificações Push</Text>
                  <Text style={styles.settingDescription}>
                    Receba notificações no celular (iOS/Android)
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
            </>
          )}

          {/* Web Warning */}
          {Platform.OS === 'web' && (
            <View style={styles.webNotificationWarning}>
              <Text style={styles.webNotificationWarningText}>
                📱 Para receber notificações push, baixe o app iOS ou Android
              </Text>
            </View>
          )}
        </View>

        {/* Info Section */}
        <View style={styles.infoSection}>
          <Text style={styles.infoSectionTitle}>Como Funcionam as Notificações?</Text>

          <View style={styles.scheduleBox}>
            <Text style={styles.scheduleIcon}>⏰</Text>
            <View style={styles.scheduleTextContainer}>
              <Text style={styles.scheduleTitle}>Horário de Envio</Text>
              <Text style={styles.scheduleText}>
                Notificações por email são enviadas diariamente às 21:00 (horário de Brasília), caso existam alertas críticos (vermelho ou amarelo).
              </Text>
            </View>
          </View>

          {/* Test Buttons */}
          {savedEmails.length > 0 && (
            <View style={styles.testButtonsContainer}>
              <TouchableOpacity
                style={[styles.clearHistoryButton, isClearing && styles.buttonDisabled]}
                onPress={handleClearNotificationHistory}
                disabled={isClearing}
              >
                <Text style={styles.clearHistoryButtonIcon}>🗑️</Text>
                <Text style={styles.clearHistoryButtonText}>
                  {isClearing ? 'Limpando...' : 'Limpar Histórico'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.testEmailButton}
                onPress={handleTestEmailNotifications}
              >
                <Text style={styles.testEmailButtonIcon}>🧪</Text>
                <Text style={styles.testEmailButtonText}>Testar Envio (Simular 21h)</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.infoList}>
            <Text style={styles.infoSectionText}>
              • Você receberá notificações push no celular quando alguma manutenção ficar urgente (vermelho/amarelo)
            </Text>
            <Text style={styles.infoSectionText}>
              • Emails serão enviados para todos os endereços cadastrados
            </Text>
            <Text style={styles.infoSectionText}>
              • Máximo de 1 email por dia por alerta (enviado às 21h)
            </Text>
            <Text style={styles.infoSectionText}>
              • Alertas de tanque de combustível também são notificados
            </Text>
          </View>
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
  emailContainer: {
    marginBottom: 16,
  },
  emailLabel: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#333',
    marginBottom: 8,
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E5E5',
    marginVertical: 20,
  },
  webNotificationWarning: {
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2196F3',
  },
  webNotificationWarningText: {
    fontSize: 14,
    color: '#1565C0',
    textAlign: 'center' as const,
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
  scheduleBox: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#4CAF50',
    alignItems: 'flex-start',
  },
  scheduleIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  scheduleTextContainer: {
    flex: 1,
  },
  scheduleTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#2D5016',
    marginBottom: 4,
  },
  scheduleText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  testButtonsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 12,
  },
  clearHistoryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: '#F44336',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  clearHistoryButtonIcon: {
    fontSize: 16,
  },
  clearHistoryButtonText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#F44336',
  },
  testEmailButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: '#FF9800',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  testEmailButtonIcon: {
    fontSize: 16,
  },
  testEmailButtonText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#FF9800',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  infoList: {
    gap: 4,
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
  savedEmailsContainer: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  savedEmailsTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#333',
    marginBottom: 12,
  },
  emailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  emailTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  emailText: {
    fontSize: 15,
    color: '#333',
    fontWeight: '500' as const,
  },
  emailActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  emailEditButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#E8F5E9',
  },
  emailDeleteButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#FFEBEE',
  },
  emailEditContainer: {
    flex: 1,
    gap: 8,
  },
  emailEditInput: {
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: '#2D5016',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#333',
  },
  emailEditButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  emailSaveButton: {
    flex: 1,
    backgroundColor: '#2D5016',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  emailSaveButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#FFF',
  },
  emailCancelButton: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
