import AsyncStorage from '@/lib/storage';
import createContextHook from '@nkzw/create-context-hook';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import type { User, SubscriptionInfo } from '@/types';
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
        
        let sessionData = null;
        let sessionError = null;
        
        try {
          const result = await supabase.auth.getSession();
          sessionData = result?.data || null;
          sessionError = result?.error || null;
        } catch (err) {
          console.error('[WEB AUTH] Exceção ao obter sessão:', err);
          sessionError = err;
        }
        
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
            try {
              localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(webUser));
            } catch (err) {
              console.error('[WEB AUTH] Erro ao salvar no localStorage:', err);
            }
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
      let usersData = null;
      let currentUserData = null;
      
      try {
        [usersData, currentUserData] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.USERS),
          AsyncStorage.getItem(STORAGE_KEYS.CURRENT_USER),
        ]);
      } catch (err) {
        console.error('[AUTH MOBILE] Erro ao carregar do AsyncStorage:', err);
      }

      console.log('[AUTH] Dados carregados:', { 
        hasUsersData: !!usersData, 
        hasCurrentUserData: !!currentUserData 
      });

      let loadedUsers: User[] = [];
      if (usersData) {
        try {
          loadedUsers = JSON.parse(usersData);
          console.log('[AUTH] Usuários carregados:', loadedUsers.length);
        } catch (err) {
          console.error('[AUTH] Erro ao fazer parse de usuários:', err);
          loadedUsers = [];
        }
      }

      const testUserExists = loadedUsers.some(u => u.id === TEST_USER.id);
      if (!testUserExists) {
        console.log('[AUTH] Adicionando usuário de teste...');
        loadedUsers = [TEST_USER, ...loadedUsers];
        try {
          await AsyncStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(loadedUsers));
        } catch (err) {
          console.error('[AUTH] Erro ao salvar usuários:', err);
        }
      }

      setUsers(loadedUsers);
      console.log('[AUTH] Total de usuários após carregar:', loadedUsers.length);

      if (currentUserData) {
        try {
          const parsedUser = JSON.parse(currentUserData);
          console.log('[AUTH] Usuário atual encontrado:', parsedUser?.username || 'unknown');
          setCurrentUser(parsedUser);
        } catch (err) {
          console.error('[AUTH] Erro ao fazer parse do usuário atual:', err);
          setCurrentUser(null);
        }
      } else {
        console.log('[AUTH] Nenhum usuário atual encontrado');
      }
    } catch (error) {
      console.error('[AUTH] Erro CRÍTICO ao carregar dados de autenticação:', error);
      if (isMounted) {
        setCurrentUser(null);
      }
    } finally {
      if (isMounted) {
        console.log('[AUTH] Finalizado carregamento (isLoading = false)');
        setIsLoading(false);
      }
    }
  }, [isWeb]);

  useEffect(() => {
    let cancelled = false;
    loadData().catch(err => {
      console.error('[AUTH] Erro ao executar loadData:', err);
    }).finally(() => {
      if (!cancelled) {
        console.log('[AUTH] loadData finalizado');
      }
    });
    return () => { cancelled = true; };
  }, [loadData]);

  const syncSubscriptionAfterLogin = async (userId: string) => {
    if (!userId) {
      console.warn('[AUTH] userId inválido para sincronizar assinatura');
      return;
    }
    
    try {
      console.log('[AUTH] Sincronizando assinatura após login para user:', userId);
      
      let data = null;
      let error = null;
      
      try {
        const result = await supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', userId)
          .single();
        data = result?.data || null;
        error = result?.error || null;
      } catch (err) {
        console.error('[AUTH] Exceção ao buscar assinatura:', err);
        return;
      }

      if (error) {
        console.log('[AUTH] Nenhuma assinatura encontrada no Supabase (normal para novos usuários)');
        return;
      }

      if (data) {
        console.log('[AUTH] Assinatura encontrada, salvando no cache:', data);
        
        const subscriptionData: SubscriptionInfo = {
          status: data.status === 'active' ? 'active' : 'expired',
          planType: data.plan_type,
          billingCycle: data.billing_cycle,
          machineLimit: data.machine_limit,
          subscriptionStartDate: data.current_period_start,
          subscriptionEndDate: data.current_period_end,
          isActive: data.status === 'active',
          trialActive: data.trial_active || false,
          trialEndsAt: data.trial_ends_at,
        };

        try {
          await AsyncStorage.setItem('@controle_maquina:subscription', JSON.stringify(subscriptionData));
          console.log('[AUTH] Assinatura sincronizada com sucesso');
        } catch (err) {
          console.error('[AUTH] Erro ao salvar assinatura no AsyncStorage:', err);
        }
      }
    } catch (error) {
      console.error('[AUTH] Erro ao sincronizar assinatura:', error);
    }
  };

  useEffect(() => {
    if (!isWeb || !supabase) {
      return;
    }

    let isMounted = true;
    console.log('[AUTH] Configurando listener de mudança de estado de autenticação...');
    
    try {
      const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
        console.log('[AUTH] Evento de autenticação:', event);
        
        if (!isMounted) return;
        
        if (event === 'PASSWORD_RECOVERY') {
          console.log('[AUTH] Evento PASSWORD_RECOVERY detectado, redirecionando para /reset-password');
          if (typeof window !== 'undefined') {
            try {
              window.location.replace('/reset-password');
            } catch (err) {
              console.error('[AUTH] Erro ao redirecionar:', err);
            }
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
            try {
              localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(webUser));
            } catch (err) {
              console.error('[AUTH] Erro ao salvar no localStorage:', err);
            }
          }
          syncSubscriptionAfterLogin(session.user.id).catch(err => {
            console.warn('[AUTH] Erro ao sincronizar assinatura (não crítico):', err);
          });
        }
        
        if (event === 'SIGNED_OUT') {
          console.log('[AUTH] Usuário desconectado');
          setCurrentUser(null);
          setIsLoading(false);
          if (typeof localStorage !== 'undefined') {
            try {
              localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
            } catch (err) {
              console.error('[AUTH] Erro ao remover do localStorage:', err);
            }
          }
        }
      });

      return () => {
        isMounted = false;
        console.log('[AUTH] Removendo listener de autenticação');
        try {
          authListener?.subscription?.unsubscribe();
        } catch (err) {
          console.error('[AUTH] Erro ao remover listener:', err);
        }
      };
    } catch (err) {
      console.error('[AUTH] Erro ao configurar listener de autenticação:', err);
      return () => {
        isMounted = false;
      };
    }
  }, [isWeb]);

  const login = useCallback(async (username: string, password: string): Promise<boolean> => {
    console.log('[AUTH] Tentando fazer login...', { username, platform: Platform.OS });

    if (!username || !password) {
      console.error('[AUTH] Username ou password vazios');
      return false;
    }

    // Usar Supabase tanto para WEB quanto MOBILE
    if (supabase) {
      console.log('[SUPABASE AUTH] Usando Supabase para login...', { platform: Platform.OS });
      try {
        let data = null;
        let error = null;

        try {
          const result = await supabase.auth.signInWithPassword({
            email: username,
            password,
          });
          data = result?.data || null;
          error = result?.error || null;
        } catch (err) {
          console.error('[SUPABASE AUTH] Exceção durante signInWithPassword:', err);
          return false;
        }

        if (error) {
          console.error('[SUPABASE AUTH] Erro no login:', error.message || error);
          console.log('[SUPABASE AUTH] Código do erro:', error.status || 'N/A');
          console.log('[SUPABASE AUTH] Tentando fallback para login local...');
          console.log('[SUPABASE AUTH] Total de usuários no array local:', users.length);
          console.log('[SUPABASE AUTH] Plataforma:', Platform.OS);

          // Fallback: tentar login local com AsyncStorage
          const localUser = users.find(
            (u) => u.username === username && u.password === password
          );

          if (localUser) {
            console.log('[SUPABASE AUTH] ✅ Usuário encontrado no storage local!');
            console.log('[SUPABASE AUTH] Usuário local:', { id: localUser.id, username: localUser.username, name: localUser.name });
            setCurrentUser(localUser);

            if (isWeb && typeof localStorage !== 'undefined') {
              try {
                localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(localUser));
              } catch (err) {
                console.error('[SUPABASE AUTH] Erro ao salvar no localStorage:', err);
              }
            } else {
              try {
                await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(localUser));
              } catch (err) {
                console.error('[SUPABASE AUTH] Erro ao salvar no AsyncStorage:', err);
              }
            }

            return true;
          }

          console.log('[SUPABASE AUTH] ❌ Usuário NÃO encontrado no storage local');
          console.log('[SUPABASE AUTH] Username procurado:', username);
          console.log('[SUPABASE AUTH] Usuários disponíveis:', users.map(u => ({ username: u.username, id: u.id })));
          return false;
        }

        if (data?.user) {
          console.log('[SUPABASE AUTH] Login bem-sucedido:', data.user.email);

          const acceptedTermsAt = data.user.user_metadata?.acceptedTermsAt;

          const authUser: User = {
            id: data.user.id,
            username: data.user.email || '',
            password: '',
            role: 'master',
            name: data.user.user_metadata?.name || data.user.email || '',
            acceptedTermsAt: acceptedTermsAt,
          };

          setCurrentUser(authUser);

          // Salvar no storage apropriado (localStorage para web, AsyncStorage para mobile)
          if (isWeb && typeof localStorage !== 'undefined') {
            try {
              localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(authUser));
            } catch (err) {
              console.error('[SUPABASE AUTH] Erro ao salvar no localStorage:', err);
            }
          } else {
            try {
              await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(authUser));
            } catch (err) {
              console.error('[SUPABASE AUTH] Erro ao salvar no AsyncStorage:', err);
            }
          }

          try {
            await syncSubscriptionAfterLogin(data.user.id);
          } catch (err) {
            console.warn('[SUPABASE AUTH] Erro ao sincronizar assinatura (não crítico):', err);
          }

          return true;
        }

        return false;
      } catch (error) {
        console.error('[SUPABASE AUTH] Exceção durante login:', error);
        return false;
      }
    }

    // Fallback para login local (apenas se Supabase não estiver disponível)
    console.log('[AUTH MOBILE] Usando login local (fallback)...', { usersCount: users.length });
    const user = users.find(
      (u) => u.username === username && u.password === password
    );

    console.log('[AUTH] Usuário encontrado:', user ? 'SIM' : 'NÃO');

    if (user) {
      console.log('[AUTH] Atualizando estado do currentUser...');
      setCurrentUser(user);
      
      console.log('[AUTH] Salvando no AsyncStorage...');
      try {
        await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
        console.log('[AUTH] Login concluído com sucesso');
      } catch (err) {
        console.error('[AUTH] Erro ao salvar no AsyncStorage:', err);
      }
      
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
        try {
          const { error } = await supabase.auth.signOut();
          if (error) {
            console.error('[WEB AUTH] Erro ao fazer signOut:', error);
          }
        } catch (err) {
          console.error('[WEB AUTH] Exceção durante signOut:', err);
        }
      }
      
      console.log('[AUTH] Limpando currentUser do estado...');
      setCurrentUser(null);
      
      console.log('[AUTH] Removendo CURRENT_USER do storage...');
      try {
        await AsyncStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
      } catch (err) {
        console.error('[AUTH] Erro ao remover do AsyncStorage:', err);
      }
      
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
      try {
        await appLogout();
      } catch (err) {
        console.error('[AUTH] Erro ao executar appLogout:', err);
      }
      
      console.log('[AUTH] Logout concluído');
    } catch (error) {
      console.error('[AUTH] Erro durante logout:', error);
      if (isWeb) {
        try {
          await appLogout();
        } catch (err) {
          console.error('[AUTH] Erro ao executar appLogout no fallback:', err);
        }
      }
    }
  }, [isWeb]);

  const register = useCallback(async (
    username: string,
    password: string,
    name: string
  ): Promise<boolean> => {
    console.log('[AUTH] Tentando registrar...', { username, platform: Platform.OS });
    
    if (!username || !password || !name) {
      console.error('[AUTH] Dados de registro incompletos');
      return false;
    }
    
    if (isWeb && supabase) {
      console.log('[WEB AUTH] Usando Supabase para registro...');
      try {
        let data = null;
        let error = null;
        
        try {
          const result = await supabase.auth.signUp({
            email: username,
            password,
            options: {
              data: {
                name,
              },
            },
          });
          data = result?.data || null;
          error = result?.error || null;
        } catch (err) {
          console.error('[WEB AUTH] Exceção durante signUp:', err);
          return false;
        }
        
        if (error) {
          console.error('[WEB AUTH] Erro no registro:', error.message || error);
          if (error.message && error.message.includes('already registered')) {
            return false;
          }
          return false;
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
            try {
              localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(webUser));
            } catch (err) {
              console.error('[WEB AUTH] Erro ao salvar no localStorage:', err);
            }
          }
          
          try {
            await syncSubscriptionAfterLogin(data.user.id);
          } catch (err) {
            console.warn('[WEB AUTH] Erro ao sincronizar assinatura (não crítico):', err);
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
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(updatedUsers));
    } catch (err) {
      console.error('[AUTH] Erro ao salvar usuários:', err);
    }

    setCurrentUser(newUser);
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(newUser));
    } catch (err) {
      console.error('[AUTH] Erro ao salvar usuário atual:', err);
    }

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
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(updatedUsers));
    } catch (err) {
      console.error('[AUTH] Erro ao salvar usuários:', err);
    }

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
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(updatedUsers));
    } catch (err) {
      console.error('[AUTH] Erro ao salvar usuários:', err);
    }
  }, [users]);

  const deleteEmployee = useCallback(async (userId: string): Promise<void> => {
    const updatedUsers = users.filter((u) => u.id !== userId);
    setUsers(updatedUsers);
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(updatedUsers));
    } catch (err) {
      console.error('[AUTH] Erro ao salvar usuários:', err);
    }
  }, [users]);

  const resetPassword = useCallback(async (email: string): Promise<boolean> => {
    console.log('[AUTH] Solicitando reset de senha...', { email, platform: Platform.OS });
    
    if (!email) {
      console.error('[AUTH] Email vazio');
      return false;
    }
    
    if (isWeb && supabase) {
      console.log('[WEB AUTH] Usando Supabase para reset de senha...');
      try {
        let error = null;
        
        try {
          const result = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: 'https://controledemaquina.com.br/reset-password',
          });
          error = result?.error || null;
        } catch (err) {
          console.error('[WEB AUTH] Exceção durante resetPassword:', err);
          return false;
        }
        
        if (error) {
          console.error('[WEB AUTH] Erro ao enviar email de reset:', error.message || error);
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
    if (!currentUser) {
      console.warn('[AUTH] Tentou aceitar termos sem usuário logado');
      return;
    }

    const now = new Date().toISOString();
    const updatedUser = { ...currentUser, acceptedTermsAt: now };

    if (isWeb && supabase) {
      console.log('[WEB AUTH] Salvando aceitação de termos no Supabase...');
      try {
        let error = null;
        
        try {
          const result = await supabase.auth.updateUser({
            data: {
              acceptedTermsAt: now,
            },
          });
          error = result?.error || null;
        } catch (err) {
          console.error('[WEB AUTH] Exceção ao salvar aceitação de termos:', err);
        }
        
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
      try {
        await AsyncStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(updatedUsers));
      } catch (err) {
        console.error('[AUTH] Erro ao salvar usuários:', err);
      }
    }

    setCurrentUser(updatedUser);
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(updatedUser));
    } catch (err) {
      console.error('[AUTH] Erro ao salvar usuário atual:', err);
    }
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
