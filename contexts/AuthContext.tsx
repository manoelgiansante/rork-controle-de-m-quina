import AsyncStorage from '@/lib/storage';
import createContextHook from '@nkzw/create-context-hook';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import type { User } from '@/types';
import { appLogout } from '@/lib/logout';
import { supabase } from '@/lib/supabase/client';

const STORAGE_KEYS = {
  USERS: '@controle_maquina:users',
  CURRENT_USER: '@controle_maquina:current_user',
};

const TEST_USER: User = {
  id: 'test-user-review',
  username: 'review@controlemaquina.com',
  password: 'Teste123!',
  role: 'master',
  name: 'Usuário de Teste',
};

export const [AuthProvider, useAuth] = createContextHook(() => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isWeb] = useState(() => Platform.OS === 'web');

  const loadData = useCallback(async () => {
    console.log('[AUTH] Carregando dados de autenticação...');
    console.log('[AUTH] Platform:', Platform.OS);
    let isMounted = true;
    try {
      if (isWeb && supabase) {
        console.log('[WEB AUTH] Verificando sessão no Supabase...');
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        
        if (!isMounted) return;
        
        if (sessionError) {
          console.error('[WEB AUTH] Erro ao obter sessão:', sessionError);
        }
        
        if (sessionData?.session?.user) {
          console.log('[WEB AUTH] Sessão encontrada:', sessionData.session.user.email);
          
          const acceptedTermsAt = sessionData.session.user.user_metadata?.acceptedTermsAt;
          
          const webUser: User = {
            id: sessionData.session.user.id,
            username: sessionData.session.user.email || '',
            password: '',
            role: 'master',
            name: sessionData.session.user.user_metadata?.name || sessionData.session.user.email || '',
            acceptedTermsAt: acceptedTermsAt,
          };
          setCurrentUser(webUser);
          
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(webUser));
          }
        } else {
          console.log('[WEB AUTH] Nenhuma sessão encontrada no Supabase');
          setCurrentUser(null);
        }
        
        if (isMounted) {
          setIsLoading(false);
        }
        return;
      }
      
      console.log('[AUTH MOBILE] Carregando dados locais...');
      const [usersData, currentUserData] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.USERS),
        AsyncStorage.getItem(STORAGE_KEYS.CURRENT_USER),
      ]);

      console.log('[AUTH] Dados carregados:', { 
        hasUsersData: !!usersData, 
        hasCurrentUserData: !!currentUserData 
      });

      let loadedUsers: User[] = [];
      if (usersData) {
        loadedUsers = JSON.parse(usersData);
        console.log('[AUTH] Usuários carregados:', loadedUsers.length);
      }

      const testUserExists = loadedUsers.some(u => u.id === TEST_USER.id);
      if (!testUserExists) {
        console.log('[AUTH] Adicionando usuário de teste...');
        loadedUsers = [TEST_USER, ...loadedUsers];
        await AsyncStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(loadedUsers));
      }

      setUsers(loadedUsers);
      console.log('[AUTH] Total de usuários após carregar:', loadedUsers.length);

      if (currentUserData) {
        const parsedUser = JSON.parse(currentUserData);
        console.log('[AUTH] Usuário atual encontrado:', parsedUser.username);
        setCurrentUser(parsedUser);
      } else {
        console.log('[AUTH] Nenhum usuário atual encontrado');
      }
    } catch (error) {
      console.error('[AUTH] Erro ao carregar dados de autenticação:', error);
    } finally {
      console.log('[AUTH] Finalizado carregamento (isLoading = false)');
      setIsLoading(false);
    }
  }, [isWeb]);

  useEffect(() => {
    let cancelled = false;
    loadData().finally(() => {
      if (!cancelled) {
        console.log('[AUTH] loadData finalizado');
      }
    });
    return () => { cancelled = true; };
  }, [loadData]);

  useEffect(() => {
    if (!isWeb || !supabase) {
      return;
    }

    let isMounted = true;
    console.log('[AUTH] Configurando listener de mudança de estado de autenticação...');
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[AUTH] Evento de autenticação:', event);
      
      if (!isMounted) return;
      
      if (event === 'PASSWORD_RECOVERY') {
        console.log('[AUTH] Evento PASSWORD_RECOVERY detectado, redirecionando para /reset-password');
        if (typeof window !== 'undefined') {
          window.location.replace('/reset-password');
        }
      }
      
      if (event === 'SIGNED_IN' && session?.user) {
        console.log('[AUTH] Usuário autenticado:', session.user.email);
        
        const acceptedTermsAt = session.user.user_metadata?.acceptedTermsAt;
        
        const webUser: User = {
          id: session.user.id,
          username: session.user.email || '',
          password: '',
          role: 'master',
          name: session.user.user_metadata?.name || session.user.email || '',
          acceptedTermsAt: acceptedTermsAt,
        };
        setCurrentUser(webUser);
        setIsLoading(false);
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(webUser));
        }
      }
      
      if (event === 'SIGNED_OUT') {
        console.log('[AUTH] Usuário desconectado');
        setCurrentUser(null);
        setIsLoading(false);
        if (typeof localStorage !== 'undefined') {
          localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
        }
      }
    });

    return () => {
      isMounted = false;
      console.log('[AUTH] Removendo listener de autenticação');
      authListener.subscription.unsubscribe();
    };
  }, [isWeb]);

  const login = useCallback(async (username: string, password: string): Promise<boolean> => {
    console.log('[AUTH] Tentando fazer login...', { username, platform: Platform.OS });
    
    if (isWeb && supabase) {
      console.log('[WEB AUTH] Usando Supabase para login...');
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: username,
          password,
        });
        
        if (error) {
          console.error('[WEB AUTH] Erro no login:', error.message);
          return false;
        }
        
        if (data?.user) {
          console.log('[WEB AUTH] Login bem-sucedido:', data.user.email);
          
          const acceptedTermsAt = data.user.user_metadata?.acceptedTermsAt;
          
          const webUser: User = {
            id: data.user.id,
            username: data.user.email || '',
            password: '',
            role: 'master',
            name: data.user.user_metadata?.name || data.user.email || '',
            acceptedTermsAt: acceptedTermsAt,
          };
          
          setCurrentUser(webUser);
          
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(webUser));
          }
          
          return true;
        }
        
        return false;
      } catch (error) {
        console.error('[WEB AUTH] Exceção durante login:', error);
        return false;
      }
    }
    
    console.log('[AUTH MOBILE] Usando login local...', { usersCount: users.length });
    const user = users.find(
      (u) => u.username === username && u.password === password
    );

    console.log('[AUTH] Usuário encontrado:', user ? 'SIM' : 'NÃO');

    if (user) {
      console.log('[AUTH] Atualizando estado do currentUser...');
      setCurrentUser(user);
      
      console.log('[AUTH] Salvando no AsyncStorage...');
      await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
      console.log('[AUTH] Login concluído com sucesso');
      
      return true;
    }

    console.log('[AUTH] Login falhou - credenciais inválidas');
    return false;
  }, [isWeb, users]);

  const logout = useCallback(async () => {
    console.log('[AUTH] Executando logout...');
    
    try {
      if (isWeb && supabase) {
        console.log('[WEB AUTH] Executando signOut do Supabase...');
        const { error } = await supabase.auth.signOut();
        if (error) {
          console.error('[WEB AUTH] Erro ao fazer signOut:', error);
        }
      }
      
      console.log('[AUTH] Limpando currentUser do estado...');
      setCurrentUser(null);
      
      console.log('[AUTH] Removendo CURRENT_USER do storage...');
      await AsyncStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
      
      if (isWeb) {
        console.log('[AUTH] Plataforma Web: removendo apenas CURRENT_USER do localStorage');
        try {
          if (typeof localStorage !== 'undefined') {
            localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
          }
        } catch (e) {
          console.warn('[AUTH] Erro ao remover do localStorage:', e);
        }
      }
      
      console.log('[AUTH] Chamando appLogout...');
      await appLogout();
      
      console.log('[AUTH] Logout concluído');
    } catch (error) {
      console.error('[AUTH] Erro durante logout:', error);
      if (isWeb) {
        await appLogout();
      }
    }
  }, [isWeb]);

  const register = useCallback(async (
    username: string,
    password: string,
    name: string
  ): Promise<boolean> => {
    console.log('[AUTH] Tentando registrar...', { username, platform: Platform.OS });
    
    if (isWeb && supabase) {
      console.log('[WEB AUTH] Usando Supabase para registro...');
      try {
        const { data, error } = await supabase.auth.signUp({
          email: username,
          password,
          options: {
            data: {
              name,
            },
          },
        });
        
        if (error) {
          console.error('[WEB AUTH] Erro no registro:', error.message);
          if (error.message.includes('already registered')) {
            return false;
          }
          throw error;
        }
        
        if (data?.user) {
          console.log('[WEB AUTH] Registro bem-sucedido:', data.user.email);
          const webUser: User = {
            id: data.user.id,
            username: data.user.email || '',
            password: '',
            role: 'master',
            name: name || data.user.email || '',
          };
          
          setCurrentUser(webUser);
          
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(webUser));
          }
          
          return true;
        }
        
        return false;
      } catch (error) {
        console.error('[WEB AUTH] Exceção durante registro:', error);
        return false;
      }
    }
    
    console.log('[AUTH MOBILE] Usando registro local...');
    const userExists = users.find((u) => u.username === username);
    if (userExists) {
      return false;
    }

    const newUser: User = {
      id: Date.now().toString(),
      username,
      password,
      role: 'master',
      name,
    };

    const updatedUsers = [...users, newUser];
    setUsers(updatedUsers);
    await AsyncStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(updatedUsers));

    setCurrentUser(newUser);
    await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(newUser));

    return true;
  }, [isWeb, users]);

  const createEmployee = useCallback(async (
    username: string,
    password: string,
    name: string
  ): Promise<User> => {
    const newUser: User = {
      id: Date.now().toString(),
      username,
      password,
      role: 'employee',
      name,
    };

    const updatedUsers = [...users, newUser];
    setUsers(updatedUsers);
    await AsyncStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(updatedUsers));

    return newUser;
  }, [users]);

  const updateEmployee = useCallback(async (
    userId: string,
    updates: { username?: string; password?: string; name?: string }
  ): Promise<void> => {
    const updatedUsers = users.map((u) =>
      u.id === userId ? { ...u, ...updates } : u
    );
    setUsers(updatedUsers);
    await AsyncStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(updatedUsers));
  }, [users]);

  const deleteEmployee = useCallback(async (userId: string): Promise<void> => {
    const updatedUsers = users.filter((u) => u.id !== userId);
    setUsers(updatedUsers);
    await AsyncStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(updatedUsers));
  }, [users]);

  const resetPassword = useCallback(async (email: string): Promise<boolean> => {
    console.log('[AUTH] Solicitando reset de senha...', { email, platform: Platform.OS });
    
    if (isWeb && supabase) {
      console.log('[WEB AUTH] Usando Supabase para reset de senha...');
      try {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: 'https://controledemaquina.com.br/reset-password',
        });
        
        if (error) {
          console.error('[WEB AUTH] Erro ao enviar email de reset:', error.message);
          return false;
        }
        
        console.log('[WEB AUTH] Email de reset enviado com sucesso');
        return true;
      } catch (error) {
        console.error('[WEB AUTH] Exceção durante reset de senha:', error);
        return false;
      }
    }
    
    console.log('[AUTH MOBILE] Reset de senha não disponível no mobile');
    return false;
  }, [isWeb]);

  const acceptTerms = useCallback(async () => {
    if (!currentUser) return;

    const now = new Date().toISOString();
    const updatedUser = { ...currentUser, acceptedTermsAt: now };

    if (isWeb && supabase) {
      console.log('[WEB AUTH] Salvando aceitação de termos no Supabase...');
      try {
        const { error } = await supabase.auth.updateUser({
          data: {
            acceptedTermsAt: now,
          },
        });
        
        if (error) {
          console.error('[WEB AUTH] Erro ao salvar aceitação de termos:', error);
        } else {
          console.log('[WEB AUTH] Aceitação de termos salva com sucesso');
        }
      } catch (error) {
        console.error('[WEB AUTH] Exceção ao salvar aceitação de termos:', error);
      }
    } else {
      const updatedUsers = users.map((u) =>
        u.id === currentUser.id ? updatedUser : u
      );
      setUsers(updatedUsers);
      await AsyncStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(updatedUsers));
    }

    setCurrentUser(updatedUser);
    await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(updatedUser));
  }, [currentUser, users, isWeb]);

  const hasAcceptedTerms = useMemo(
    () => currentUser?.acceptedTermsAt !== undefined,
    [currentUser]
  );

  const isMaster = useMemo(() => currentUser?.role === 'master', [currentUser]);
  const isAuthenticated = useMemo(() => currentUser !== null, [currentUser]);

  return {
    currentUser,
    users,
    isLoading,
    login,
    logout,
    register,
    resetPassword,
    createEmployee,
    updateEmployee,
    deleteEmployee,
    acceptTerms,
    hasAcceptedTerms,
    isMaster,
    isAuthenticated,
  };
});
