import { Platform } from "react-native";
import AsyncStorage from '@/lib/storage';

const STORAGE_KEYS = {
  CURRENT_USER: '@controle_maquina:current_user',
};

/**
 * Função unificada de logout que funciona em Web e Native
 * Remove APENAS a sessão atual (CURRENT_USER), preservando usuários cadastrados
 */
export async function appLogout() {
  try {
    console.log('[LOGOUT] Iniciando processo de logout...');
    
    console.log('[LOGOUT] Removendo apenas CURRENT_USER do AsyncStorage...');
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    } catch (e) {
      console.warn('[LOGOUT] Erro ao remover CURRENT_USER:', e);
    }
    
    if (Platform.OS === "web") {
      console.log('[LOGOUT] Plataforma: Web');
      
      try {
        console.log('[LOGOUT] Removendo apenas CURRENT_USER do localStorage...');
        if (typeof localStorage !== 'undefined') {
          localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
        }
      } catch (e) {
        console.warn('[LOGOUT] Erro ao remover do localStorage:', e);
      }
      
      try {
        console.log('[LOGOUT] Limpando sessionStorage...');
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.clear();
        }
      } catch (e) {
        console.warn('[LOGOUT] Erro ao limpar sessionStorage:', e);
      }
      
      try {
        console.log('[LOGOUT] Limpando cookies...');
        if (typeof document !== 'undefined' && document.cookie) {
          const cookies = document.cookie.split(";");
          for (const cookie of cookies) {
            const eqPos = cookie.indexOf("=");
            const name = eqPos > -1 ? cookie.substring(0, eqPos).trim() : cookie.trim();
            
            document.cookie = `${name}=; Max-Age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
            document.cookie = `${name}=; Max-Age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=${window.location.hostname}`;
            
            if (window.location.hostname.includes('.')) {
              const domain = window.location.hostname.split('.').slice(-2).join('.');
              document.cookie = `${name}=; Max-Age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=.${domain}`;
            }
          }
        }
      } catch (e) {
        console.warn('[LOGOUT] Erro ao limpar cookies:', e);
      }
      
      try {
        console.log('[LOGOUT] Tentando chamar endpoint /api/logout...');
        const apiUrl = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://controledemaquina.com.br/api';
        await fetch(`${apiUrl}/logout`, {
          method: 'POST',
          credentials: 'include',
        }).catch((err) => {
          console.warn('[LOGOUT] Endpoint /api/logout não disponível:', err.message);
        });
      } catch (e) {
        console.warn('[LOGOUT] Erro ao chamar /api/logout:', e);
      }
      
      console.log('[LOGOUT] Redirecionando para /login...');
      if (typeof window !== 'undefined') {
        window.location.replace('/login');
      }
    } else {
      console.log('[LOGOUT] Plataforma: Native - redirecionamento será feito pelo contexto');
    }
  } catch (error) {
    console.error('[LOGOUT] Erro durante logout:', error);
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      console.log('[LOGOUT] Forçando redirecionamento após erro...');
      window.location.replace('/login');
    }
  }
}
