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
        return null;
      }
      return localStorage.getItem(key);
    } catch (error) {
      console.error('Error getting item from localStorage:', key, error);
      return null;
    }
  },
  
  async setItem(key: string, value: string): Promise<void> {
    try {
      if (typeof localStorage === 'undefined') {
        return;
      }
      localStorage.setItem(key, value);
    } catch (error) {
      console.error('Error setting item to localStorage:', key, error);
    }
  },
  
  async removeItem(key: string): Promise<void> {
    try {
      if (typeof localStorage === 'undefined') {
        return;
      }
      localStorage.removeItem(key);
    } catch (error) {
      console.error('Error removing item from localStorage:', key, error);
    }
  },
  
  async clear(): Promise<void> {
    try {
      if (typeof localStorage === 'undefined') {
        return;
      }
      localStorage.clear();
    } catch (error) {
      console.error('Error clearing localStorage:', error);
    }
  },
};

/**
 * AsyncStorage compatível com Web e Mobile
 */
const AsyncStorage = Platform.OS === 'web' ? WebStorage : AsyncStorageNative;

export default AsyncStorage;
