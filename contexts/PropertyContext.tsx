import AsyncStorage from '@/lib/storage';
import createContextHook from '@nkzw/create-context-hook';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import type { Property } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import * as db from '@/lib/supabase/database';

const STORAGE_KEYS = {
  PROPERTIES: '@controle_maquina:properties',
  CURRENT_PROPERTY_ID: '@controle_maquina:current_property_id',
};

export const [PropertyProvider, useProperty] = createContextHook(() => {
  const { currentUser } = useAuth();
  const [isWeb] = useState(() => Platform.OS === 'web');
  const [properties, setProperties] = useState<Property[]>([]);
  const [currentPropertyId, setCurrentPropertyId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loadData = useCallback(async () => {
    if (!currentUser) {
      setIsLoading(false);
      return;
    }

    try {
      console.log('[PROPERTY] Carregando propriedades...', { userId: currentUser.id, isWeb });
      
      let loadedProperties: Property[] = [];
      
      if (isWeb) {
        console.log('[PROPERTY WEB] Carregando do Supabase...');
        loadedProperties = await db.fetchProperties(currentUser.id);
        console.log('[PROPERTY WEB] Propriedades carregadas:', loadedProperties.length);
        
        await AsyncStorage.setItem(STORAGE_KEYS.PROPERTIES, JSON.stringify(loadedProperties));
      } else {
        console.log('[PROPERTY MOBILE] Carregando do AsyncStorage...');
        const propertiesData = await AsyncStorage.getItem(STORAGE_KEYS.PROPERTIES);
        if (propertiesData) {
          loadedProperties = JSON.parse(propertiesData);
        }
      }

      const userProperties = loadedProperties.filter(p => p.userId === currentUser.id);
      
      if (userProperties.length === 0) {
        console.log('[PROPERTY] Criando propriedade padrão...');
        let defaultProperty: Property;
        
        if (isWeb) {
          defaultProperty = await db.createProperty(currentUser.id, 'Minha Propriedade');
        } else {
          defaultProperty = {
            id: Date.now().toString(),
            name: 'Minha Propriedade',
            userId: currentUser.id,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
        }
        
        loadedProperties = [...loadedProperties, defaultProperty];
        await AsyncStorage.setItem(STORAGE_KEYS.PROPERTIES, JSON.stringify(loadedProperties));
        setProperties(loadedProperties);
        setCurrentPropertyId(defaultProperty.id);
        await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_PROPERTY_ID, defaultProperty.id);
      } else {
        setProperties(loadedProperties);
        
        const currentPropertyIdData = await AsyncStorage.getItem(STORAGE_KEYS.CURRENT_PROPERTY_ID);
        if (currentPropertyIdData && userProperties.some(p => p.id === currentPropertyIdData)) {
          setCurrentPropertyId(currentPropertyIdData);
        } else {
          setCurrentPropertyId(userProperties[0].id);
          await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_PROPERTY_ID, userProperties[0].id);
        }
      }
    } catch (error) {
      console.error('[PROPERTY] Erro ao carregar propriedades:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, isWeb]);

  useEffect(() => {
    if (currentUser) {
      loadData();
    }
  }, [loadData, currentUser]);

  const addProperty = useCallback(
    async (name: string) => {
      if (!currentUser) return;

      let newProperty: Property;

      if (isWeb) {
        console.log('[PROPERTY WEB] Criando propriedade no Supabase...');
        newProperty = await db.createProperty(currentUser.id, name);
      } else {
        newProperty = {
          id: Date.now().toString(),
          name,
          userId: currentUser.id,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      }

      const updated = [...properties, newProperty];
      setProperties(updated);
      await AsyncStorage.setItem(STORAGE_KEYS.PROPERTIES, JSON.stringify(updated));

      setCurrentPropertyId(newProperty.id);
      await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_PROPERTY_ID, newProperty.id);

      return newProperty;
    },
    [properties, currentUser, isWeb]
  );

  const updateProperty = useCallback(
    async (propertyId: string, updates: Partial<Property>) => {
      if (isWeb) {
        console.log('[PROPERTY WEB] Atualizando propriedade no Supabase...');
        await db.updateProperty(propertyId, updates);
      }

      const updated = properties.map((p) =>
        p.id === propertyId
          ? { ...p, ...updates, updatedAt: new Date().toISOString() }
          : p
      );
      setProperties(updated);
      await AsyncStorage.setItem(STORAGE_KEYS.PROPERTIES, JSON.stringify(updated));
    },
    [properties, isWeb]
  );

  const deleteProperty = useCallback(
    async (propertyId: string) => {
      if (!currentUser) return;

      if (isWeb) {
        console.log('[PROPERTY WEB] Deletando propriedade no Supabase...');
        await db.deleteProperty(propertyId);
      }

      const updated = properties.filter((p) => p.id !== propertyId);
      setProperties(updated);
      await AsyncStorage.setItem(STORAGE_KEYS.PROPERTIES, JSON.stringify(updated));

      if (currentPropertyId === propertyId) {
        const userProperties = updated.filter(p => p.userId === currentUser.id);
        if (userProperties.length > 0) {
          setCurrentPropertyId(userProperties[0].id);
          await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_PROPERTY_ID, userProperties[0].id);
        } else {
          setCurrentPropertyId(null);
          await AsyncStorage.removeItem(STORAGE_KEYS.CURRENT_PROPERTY_ID);
        }
      }
    },
    [properties, currentPropertyId, currentUser, isWeb]
  );

  const switchProperty = useCallback(
    async (propertyId: string) => {
      setCurrentPropertyId(propertyId);
      await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_PROPERTY_ID, propertyId);
    },
    []
  );

  const userProperties = useMemo(() => {
    if (!currentUser) return [];
    return properties.filter(p => p.userId === currentUser.id);
  }, [properties, currentUser]);

  const currentProperty = useMemo(() => {
    return properties.find(p => p.id === currentPropertyId) || null;
  }, [properties, currentPropertyId]);

  return useMemo(
    () => ({
      properties: userProperties,
      currentProperty,
      currentPropertyId,
      isLoading,
      addProperty,
      updateProperty,
      deleteProperty,
      switchProperty,
    }),
    [
      userProperties,
      currentProperty,
      currentPropertyId,
      isLoading,
      addProperty,
      updateProperty,
      deleteProperty,
      switchProperty,
    ]
  );
});
