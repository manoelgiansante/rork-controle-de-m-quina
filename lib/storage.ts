import { Platform } from 'react-native';
import AsyncStorageNative from '@react-native-async-storage/async-storage';

/**
 * Storage abstrato que funciona tanto no Web quanto no Mobile
 * No Web usa localStorage, no Mobile usa @react-native-async-storage/async-storage
 */
const WebStorage = {
  async getItem(key: string): Promise<string | null> {
    try {
      if (typeof localStorage === 'undefined') {
        console.warn('[STORAGE WEB] localStorage não disponível');
        return null;
      }
      const value = localStorage.getItem(key);
      console.log('[STORAGE WEB] getItem:', { key, hasValue: !!value });
      return value;
    } catch (error) {
      console.error('[STORAGE WEB] Erro ao buscar item:', key, error);
      return null;
    }
  },
  
  async setItem(key: string, value: string): Promise<void> {
    try {
      if (typeof localStorage === 'undefined') {
        console.warn('[STORAGE WEB] localStorage não disponível para setItem');
        return;
      }
      localStorage.setItem(key, value);
      console.log('[STORAGE WEB] setItem:', { key, valueLength: value.length });
    } catch (error) {
      console.error('[STORAGE WEB] Erro ao salvar item:', key, error);
    }
  },
  
  async removeItem(key: string): Promise<void> {
    try {
      if (typeof localStorage === 'undefined') {
        console.warn('[STORAGE WEB] localStorage não disponível para removeItem');
        return;
      }
      localStorage.removeItem(key);
      console.log('[STORAGE WEB] removeItem:', { key });
    } catch (error) {
      console.error('[STORAGE WEB] Erro ao remover item:', key, error);
    }
  },
  
  async clear(): Promise<void> {
    try {
      if (typeof localStorage === 'undefined') {
        console.warn('[STORAGE WEB] localStorage não disponível para clear');
        return;
      }
      localStorage.clear();
      console.log('[STORAGE WEB] clear: localStorage limpo');
    } catch (error) {
      console.error('[STORAGE WEB] Erro ao limpar localStorage:', error);
    }
  },
};

/**
 * AsyncStorage compatível com Web e Mobile
 */
const AsyncStorage = Platform.OS === 'web' ? WebStorage : AsyncStorageNative;

console.log('[STORAGE] Plataforma detectada:', Platform.OS, '- Usando:', Platform.OS === 'web' ? 'localStorage (WebStorage)' : 'AsyncStorage nativo');

export default AsyncStorage;
