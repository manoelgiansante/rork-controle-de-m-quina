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
  const { currentUser, isLoading: authLoading } = useAuth();
  const [isWeb] = useState(() => Platform.OS === 'web');
  const [properties, setProperties] = useState<Property[]>([]);
  const [currentPropertyId, setCurrentPropertyId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loadData = useCallback(async () => {
    console.log('[PROPERTY] loadData chamado:', { currentUser: !!currentUser, authLoading });
    
    if (authLoading) {
      console.log('[PROPERTY] Auth ainda carregando, aguardando...');
      return;
    }
    
    if (!currentUser) {
      console.log('[PROPERTY] Sem usuário, finalizando loading...');
      setProperties([]);
      setCurrentPropertyId(null);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    
    try {
      console.log('[PROPERTY] Carregando propriedades...', { userId: currentUser.id });

      let loadedProperties: Property[] = [];

      try {
        console.log('[PROPERTY] Carregando do Supabase (WEB e MOBILE)...');
        loadedProperties = await db.fetchProperties(currentUser.id);
        console.log('[PROPERTY] Propriedades carregadas do Supabase:', loadedProperties.length);

        if (!cancelled) {
          await AsyncStorage.setItem(STORAGE_KEYS.PROPERTIES, JSON.stringify(loadedProperties));
        }
      } catch (err) {
        console.error('[PROPERTY] Erro ao carregar do Supabase, tentando cache:', err);
        const propertiesData = await AsyncStorage.getItem(STORAGE_KEYS.PROPERTIES);
        if (propertiesData) {
          loadedProperties = JSON.parse(propertiesData);
          console.log('[PROPERTY] Propriedades carregadas do cache:', loadedProperties.length);
        }
      }

      if (cancelled) return;

      const userProperties = loadedProperties.filter(p => p.userId === currentUser.id);
      
      if (userProperties.length === 0) {
        console.log('[PROPERTY] Criando propriedade padrão...');
        const defaultProperty = await db.createProperty(currentUser.id, 'Minha Propriedade');

        if (!cancelled) {
          loadedProperties = [...loadedProperties, defaultProperty];
          await AsyncStorage.setItem(STORAGE_KEYS.PROPERTIES, JSON.stringify(loadedProperties));
          setProperties(loadedProperties);
          setCurrentPropertyId(defaultProperty.id);
          await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_PROPERTY_ID, defaultProperty.id);
        }
      } else {
        if (!cancelled) {
          setProperties(loadedProperties);
          
          const currentPropertyIdData = await AsyncStorage.getItem(STORAGE_KEYS.CURRENT_PROPERTY_ID);
          if (currentPropertyIdData && userProperties.some(p => p.id === currentPropertyIdData)) {
            setCurrentPropertyId(currentPropertyIdData);
          } else {
            setCurrentPropertyId(userProperties[0].id);
            await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_PROPERTY_ID, userProperties[0].id);
          }
        }
      }
    } catch (error) {
      console.error('[PROPERTY] Erro ao carregar propriedades:', error);
    } finally {
      if (!cancelled) {
        console.log('[PROPERTY] Finalizando loading (isLoading = false)');
        setIsLoading(false);
      }
    }
    
    return () => { cancelled = true; };
  }, [currentUser, authLoading]);

  useEffect(() => {
    if (authLoading) {
      console.log('[PROPERTY] Effect: aguardando auth finalizar...');
      return;
    }
    
    console.log('[PROPERTY] Effect: chamando loadData...');
    loadData();
  }, [authLoading, loadData]);

  const addProperty = useCallback(
    async (name: string) => {
      console.log('[PROPERTY] addProperty chamado', { name, currentUser: !!currentUser });
      if (!currentUser) {
        console.log('[PROPERTY] addProperty: sem currentUser');
        return;
      }

      console.log('[PROPERTY] Criando propriedade no Supabase (WEB e MOBILE)...');
      let newProperty: Property;
      try {
        newProperty = await db.createProperty(currentUser.id, name);
        console.log('[PROPERTY] Propriedade criada no Supabase:', newProperty);
      } catch (error) {
        console.error('[PROPERTY] Erro ao criar no Supabase:', error);
        throw error;
      }

      const updated = [...properties, newProperty];
      console.log('[PROPERTY] Atualizando state e storage...');
      setProperties(updated);
      await AsyncStorage.setItem(STORAGE_KEYS.PROPERTIES, JSON.stringify(updated));

      setCurrentPropertyId(newProperty.id);
      await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_PROPERTY_ID, newProperty.id);
      console.log('[PROPERTY] addProperty: finalizado com sucesso');

      return newProperty;
    },
    [properties, currentUser]
  );

  const updateProperty = useCallback(
    async (propertyId: string, updates: Partial<Property>) => {
      console.log('[PROPERTY] updateProperty chamado', { propertyId, updates });

      console.log('[PROPERTY] Atualizando propriedade no Supabase (WEB e MOBILE)...');
      let updatedProperty: Property;
      try {
        updatedProperty = await db.updateProperty(propertyId, updates);
        console.log('[PROPERTY] Propriedade atualizada no Supabase:', updatedProperty);
      } catch (error) {
        console.error('[PROPERTY] Erro ao atualizar no Supabase:', error);
        throw error;
      }

      const updated = properties.map((p) =>
        p.id === propertyId ? updatedProperty : p
      );
      console.log('[PROPERTY] Atualizando state e storage...');
      setProperties(updated);
      await AsyncStorage.setItem(STORAGE_KEYS.PROPERTIES, JSON.stringify(updated));
      console.log('[PROPERTY] updateProperty: finalizado com sucesso');
    },
    [properties]
  );

  const deleteProperty = useCallback(
    async (propertyId: string) => {
      if (!currentUser) return;

      console.log('[PROPERTY] Deletando propriedade do Supabase (WEB e MOBILE)...');
      await db.deleteProperty(propertyId);

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
    [properties, currentPropertyId, currentUser]
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
