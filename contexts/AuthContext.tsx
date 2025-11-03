import AsyncStorage from '@/lib/storage';
import createContextHook from '@nkzw/create-context-hook';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import type { User } from '@/types';
import { appLogout } from '@/lib/logout';

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
    try {
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
    console.log('[AUTH] Tentando fazer login...', { username, usersCount: users.length });
    
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
    console.log('AuthContext: Executando logout...');
    
    try {
      setCurrentUser(null);
      await AsyncStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
      
      await appLogout();
      
      console.log('AuthContext: Logout concluído');
    } catch (error) {
      console.error('AuthContext: Erro durante logout:', error);
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
