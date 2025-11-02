import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { User } from '@/types';

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
    try {
      const [usersData, currentUserData] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.USERS),
        AsyncStorage.getItem(STORAGE_KEYS.CURRENT_USER),
      ]);

      let loadedUsers: User[] = [];
      if (usersData) {
        loadedUsers = JSON.parse(usersData);
      }

      const testUserExists = loadedUsers.some(u => u.id === TEST_USER.id);
      if (!testUserExists) {
        loadedUsers = [TEST_USER, ...loadedUsers];
        await AsyncStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(loadedUsers));
      }

      setUsers(loadedUsers);

      if (currentUserData) {
        setCurrentUser(JSON.parse(currentUserData));
      }
    } catch (error) {
      console.error('Error loading auth data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const login = useCallback(async (username: string, password: string): Promise<boolean> => {
    const user = users.find(
      (u) => u.username === username && u.password === password
    );

    if (user) {
      setCurrentUser(user);
      await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
      return true;
    }

    return false;
  }, [users]);

  const logout = useCallback(async () => {
    console.log('AuthContext: Executando logout...');
    setCurrentUser(null);
    await AsyncStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    console.log('AuthContext: Logout concluído, currentUser removido');
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
