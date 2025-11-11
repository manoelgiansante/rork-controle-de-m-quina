import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Tractor } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { confirm } from '@/lib/confirm';

export default function LoginScreen() {
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [isRegistering, setIsRegistering] = useState<boolean>(false);
  const [isForgotPassword, setIsForgotPassword] = useState<boolean>(false);
  const { login, register, resetPassword, isAuthenticated } = useAuth();
  const { needsTrialActivation, startTrial } = useSubscription();
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const [showConfirmationMessage, setShowConfirmationMessage] = useState<boolean>(false);

  useEffect(() => {
    if (isAuthenticated) {
      setTimeout(() => {
        router.replace('/machines');
      }, 0);
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    if (params.emailConfirmed === 'true') {
      setShowConfirmationMessage(true);
      setTimeout(() => {
        setShowConfirmationMessage(false);
      }, 5000);
    }
  }, [params]);

  const handleLogin = async () => {
    console.log('[LOGIN] Iniciando processo de login...');
    console.log('[LOGIN] Platform:', Platform.OS);
    
    if (!username || !password) {
      console.log('[LOGIN] Campos vazios');
      await confirm('Erro', 'Por favor, preencha usuário e senha');
      return;
    }

    console.log('[LOGIN] Chamando função login...', { username });
    const success = await login(username, password);
    console.log('[LOGIN] Resultado do login:', success);
    
    if (success) {
      console.log('[LOGIN] Login bem-sucedido');
      if (needsTrialActivation) {
        console.log('[LOGIN] Ativando trial...');
        await startTrial();
        await confirm(
          'Bem-vindo ao Controle de Máquina!',
          'Você tem 7 dias para testar o aplicativo gratuitamente. Após o teste, a assinatura é de apenas R$ 19,90/mês.'
        );
      }
      console.log('[LOGIN] Redirecionando para /machines...');
      router.replace('/machines');
    } else {
      console.log('[LOGIN] Login falhou');
      await confirm('Erro', 'Login ou senha incorretos. Verifique suas credenciais e tente novamente.');
    }
  };

  const handleSubmitWeb = (e: any) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    console.log('[LOGIN WEB] Botão clicado via onClick');
    if (isForgotPassword) {
      handleForgotPassword();
    } else if (isRegistering) {
      handleRegister();
    } else {
      handleLogin();
    }
  };

  const handleRegister = async () => {
    if (!email || !password || !name) {
      await confirm('Erro', 'Por favor, preencha todos os campos');
      return;
    }

    if (!email.includes('@') || !email.includes('.')) {
      await confirm('Erro', 'Por favor, insira um email válido');
      return;
    }

    const success = await register(email, password, name);
    if (success) {
      if (needsTrialActivation) {
        await startTrial();
        await confirm(
          'Bem-vindo ao Controle de Máquina!',
          'Conta criada com sucesso! Você tem 7 dias para testar o aplicativo gratuitamente. Após o teste, a assinatura é de apenas R$ 19,90/mês.'
        );
      }
      router.replace('/machines');
    } else {
      await confirm('Erro', 'Este email já está cadastrado. Faça login ou use outro email.');
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      await confirm('Erro', 'Por favor, insira seu email');
      return;
    }

    if (!email.includes('@') || !email.includes('.')) {
      await confirm('Erro', 'Por favor, insira um email válido');
      return;
    }

    const success = await resetPassword(email);
    if (success) {
      await confirm(
        'Email enviado!',
        'Enviamos um link para redefinir sua senha. Verifique sua caixa de entrada.'
      );
      setIsForgotPassword(false);
      setEmail('');
    } else {
      await confirm(
        'Erro',
        'Não foi possível enviar o email. Verifique se o email está correto e tente novamente.'
      );
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
      keyboardVerticalOffset={0}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 40 }
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <View style={styles.content}>
        <View style={styles.header}>
          <Tractor size={56} color="#2D5016" strokeWidth={1.5} />
          <Text style={styles.title}>Controle de Máquina</Text>
          <Text style={styles.subtitle}>Gestão de Equipamentos Agrícolas</Text>
        </View>

        {showConfirmationMessage && (
          <View style={styles.confirmationBanner}>
            <Text style={styles.confirmationText}>
              ✓ Email confirmado com sucesso! Faça login para continuar.
            </Text>
          </View>
        )}

        <View style={styles.form}>
          {isRegistering && (
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Nome Completo</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Digite seu nome completo"
                placeholderTextColor="#999"
                autoCapitalize="words"
                autoCorrect={false}
              />
            </View>
          )}

          <View style={styles.inputContainer}>
            <Text style={styles.label}>{isRegistering || isForgotPassword ? 'Email' : 'Email ou Usuário'}</Text>
            <TextInput
              style={styles.input}
              value={isRegistering || isForgotPassword ? email : username}
              onChangeText={isRegistering || isForgotPassword ? setEmail : setUsername}
              placeholder={isRegistering || isForgotPassword ? "Digite seu email" : "Digite seu email ou usuário"}
              placeholderTextColor="#999"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType={isRegistering || isForgotPassword ? "email-address" : "default"}
            />
          </View>

          {!isForgotPassword && (
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Senha</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="Digite sua senha"
                placeholderTextColor="#999"
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          )}

          {Platform.OS === 'web' ? (
            <button
              type="button"
              onClick={handleSubmitWeb}
              style={{
                width: '100%',
                backgroundColor: '#2D5016',
                borderRadius: 12,
                paddingTop: 16,
                paddingBottom: 16,
                paddingLeft: 16,
                paddingRight: 16,
                alignItems: 'center',
                marginTop: 8,
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'center',
              }}
            >
              <span style={{
                color: '#FFF',
                fontSize: 17,
                fontWeight: '600',
              }}>
                {isForgotPassword ? 'Enviar Link' : (isRegistering ? 'Criar Conta' : 'Entrar')}
              </span>
            </button>
          ) : (
            <TouchableOpacity 
              style={styles.loginButton} 
              onPress={isForgotPassword ? handleForgotPassword : (isRegistering ? handleRegister : handleLogin)}
            >
              <Text style={styles.loginButtonText}>
                {isForgotPassword ? 'Enviar Link' : (isRegistering ? 'Criar Conta' : 'Entrar')}
              </Text>
            </TouchableOpacity>
          )}

          {!isRegistering && !isForgotPassword && (
            <TouchableOpacity 
              style={styles.forgotButton}
              onPress={() => {
                setIsForgotPassword(true);
                setUsername('');
                setPassword('');
              }}
            >
              <Text style={styles.forgotButtonText}>
                Esqueci minha senha
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity 
            style={styles.switchButton}
            onPress={() => {
              if (isForgotPassword) {
                setIsForgotPassword(false);
                setEmail('');
              } else {
                setIsRegistering(!isRegistering);
                setName('');
                setEmail('');
                setUsername('');
                setPassword('');
              }
            }}
          >
            <Text style={styles.switchButtonText}>
              {isForgotPassword
                ? 'Voltar para login'
                : (isRegistering 
                  ? 'Já tem uma conta? Entrar' 
                  : 'Não tem conta? Criar nova conta')
              }
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  content: {
    width: '100%',
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
  loginButton: {
    backgroundColor: '#2D5016',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  loginButtonText: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '600' as const,
  },
  switchButton: {
    alignItems: 'center',
    marginTop: 16,
    paddingVertical: 12,
  },
  switchButtonText: {
    fontSize: 15,
    color: '#2D5016',
    fontWeight: '600' as const,
  },
  forgotButton: {
    alignItems: 'center',
    marginTop: 12,
    paddingVertical: 8,
  },
  forgotButtonText: {
    fontSize: 14,
    color: '#666',
    textDecorationLine: 'underline' as const,
  },
  confirmationBanner: {
    backgroundColor: '#D4EDDA',
    borderWidth: 1,
    borderColor: '#C3E6CB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  confirmationText: {
    color: '#155724',
    fontSize: 15,
    fontWeight: '600' as const,
    textAlign: 'center',
  },
});
