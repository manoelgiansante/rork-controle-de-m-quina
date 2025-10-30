import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useRouter } from 'expo-router';
import { Tractor } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function LoginScreen() {
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [isRegistering, setIsRegistering] = useState<boolean>(false);
  const { login, register, isAuthenticated } = useAuth();
  const { needsTrialActivation, startTrial } = useSubscription();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/machines');
    }
  }, [isAuthenticated, router]);

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert('Erro', 'Por favor, preencha usuário e senha');
      return;
    }

    const success = await login(username, password);
    if (success) {
      if (needsTrialActivation) {
        await startTrial();
        Alert.alert(
          'Bem-vindo ao Controle de Máquina!',
          'Você tem 7 dias para testar o aplicativo gratuitamente. Após o teste, a assinatura é de apenas R$ 19,90/mês.'
        );
      }
      router.replace('/machines');
    } else {
      Alert.alert('Erro', 'Usuário ou senha incorretos');
    }
  };

  const handleRegister = async () => {
    if (!username || !password || !name) {
      Alert.alert('Erro', 'Por favor, preencha todos os campos');
      return;
    }

    const success = await register(username, password, name);
    if (success) {
      if (needsTrialActivation) {
        await startTrial();
        Alert.alert(
          'Bem-vindo ao Controle de Máquina!',
          'Conta criada com sucesso! Você tem 7 dias para testar o aplicativo gratuitamente. Após o teste, a assinatura é de apenas R$ 19,90/mês.'
        );
      }
      router.replace('/machines');
    } else {
      Alert.alert('Erro', 'Este usuário já existe. Escolha outro nome de usuário.');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <Tractor size={56} color="#2D5016" strokeWidth={1.5} />
          <Text style={styles.title}>Controle de Máquina</Text>
          <Text style={styles.subtitle}>Gestão de Equipamentos Agrícolas</Text>
        </View>

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
            <Text style={styles.label}>Usuário</Text>
            <TextInput
              style={styles.input}
              value={username}
              onChangeText={setUsername}
              placeholder="Digite seu usuário"
              placeholderTextColor="#999"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

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

          <TouchableOpacity 
            style={styles.loginButton} 
            onPress={isRegistering ? handleRegister : handleLogin}
          >
            <Text style={styles.loginButtonText}>
              {isRegistering ? 'Criar Conta' : 'Entrar'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.switchButton}
            onPress={() => {
              setIsRegistering(!isRegistering);
              setName('');
            }}
          >
            <Text style={styles.switchButtonText}>
              {isRegistering 
                ? 'Já tem uma conta? Entrar' 
                : 'Não tem conta? Criar nova conta'
              }
            </Text>
          </TouchableOpacity>
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
});
