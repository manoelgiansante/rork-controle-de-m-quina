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

  const loadData = useCallback(async () => {
    console.log('[AUTH] Carregando dados de autenticação...');
    console.log('[AUTH] Platform:', Platform.OS);
    try {
      if (Platform.OS === 'web' && supabase) {
        console.log('[WEB AUTH] Verificando sessão no Supabase...');
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('[WEB AUTH] Erro ao obter sessão:', sessionError);
        }
        
        if (sessionData?.session?.user) {
          console.log('[WEB AUTH] Sessão encontrada:', sessionData.session.user.email);
          const webUser: User = {
            id: sessionData.session.user.id,
            username: sessionData.session.user.email || '',
            password: '',
            role: 'master',
            name: sessionData.session.user.user_metadata?.name || sessionData.session.user.email || '',
          };
          setCurrentUser(webUser);
          
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(webUser));
          }
        } else {
          console.log('[WEB AUTH] Nenhuma sessão encontrada no Supabase');
          setCurrentUser(null);
        }
        
        setIsLoading(false);
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
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const login = useCallback(async (username: string, password: string): Promise<boolean> => {
    console.log('[AUTH] Tentando fazer login...', { username, platform: Platform.OS });
    
    if (Platform.OS === 'web' && supabase) {
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
          const webUser: User = {
            id: data.user.id,
            username: data.user.email || '',
            password: '',
            role: 'master',
            name: data.user.user_metadata?.name || data.user.email || '',
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
  }, [users]);

  const logout = useCallback(async () => {
    console.log('[AUTH] Executando logout...');
    
    try {
      if (Platform.OS === 'web' && supabase) {
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
      
      if (Platform.OS === 'web') {
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
      if (Platform.OS === 'web') {
        await appLogout();
      }
    }
  }, []);

  const register = useCallback(async (
    username: string,
    password: string,
    name: string
  ): Promise<boolean> => {
    console.log('[AUTH] Tentando registrar...', { username, platform: Platform.OS });
    
    if (Platform.OS === 'web' && supabase) {
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
  }, [users]);

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

  const acceptTerms = useCallback(async () => {
    if (!currentUser) return;

    const now = new Date().toISOString();
    const updatedUser = { ...currentUser, acceptedTermsAt: now };

    const updatedUsers = users.map((u) =>
      u.id === currentUser.id ? updatedUser : u
    );

    setUsers(updatedUsers);
    setCurrentUser(updatedUser);

    await Promise.all([
      AsyncStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(updatedUsers)),
      AsyncStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(updatedUser)),
    ]);
  }, [currentUser, users]);

  const hasAcceptedTerms = useMemo(
    () => currentUser?.acceptedTermsAt !== undefined,
    [currentUser]
  );

  const isMaster = useMemo(() => currentUser?.role === 'master', [currentUser]);
  const isAuthenticated = useMemo(() => currentUser !== null, [currentUser]);

  return useMemo(() => ({
    currentUser,
    users,
    isLoading,
    login,
    logout,
    register,
    createEmployee,
    updateEmployee,
    deleteEmployee,
    acceptTerms,
    hasAcceptedTerms,
    isMaster,
    isAuthenticated,
  }), [currentUser, users, isLoading, login, logout, register, createEmployee, updateEmployee, deleteEmployee, acceptTerms, hasAcceptedTerms, isMaster, isAuthenticated]);
});
