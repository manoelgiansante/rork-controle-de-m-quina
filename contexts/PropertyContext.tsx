import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Property } from '@/types';
import { useAuth } from '@/contexts/AuthContext';

const STORAGE_KEYS = {
  PROPERTIES: '@controle_maquina:properties',
  CURRENT_PROPERTY_ID: '@controle_maquina:current_property_id',
};

export const [PropertyProvider, useProperty] = createContextHook(() => {
  const { currentUser } = useAuth();
  const [properties, setProperties] = useState<Property[]>([]);
  const [currentPropertyId, setCurrentPropertyId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loadData = useCallback(async () => {
    try {
      const [propertiesData, currentPropertyIdData] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.PROPERTIES),
        AsyncStorage.getItem(STORAGE_KEYS.CURRENT_PROPERTY_ID),
      ]);

      let loadedProperties: Property[] = [];
      if (propertiesData) {
        loadedProperties = JSON.parse(propertiesData);
      }

      if (currentUser) {
        const userProperties = loadedProperties.filter(p => p.userId === currentUser.id);
        
        if (userProperties.length === 0) {
          const defaultProperty: Property = {
            id: Date.now().toString(),
            name: 'Minha Propriedade',
            userId: currentUser.id,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          loadedProperties = [...loadedProperties, defaultProperty];
          await AsyncStorage.setItem(STORAGE_KEYS.PROPERTIES, JSON.stringify(loadedProperties));
          setProperties(loadedProperties);
          setCurrentPropertyId(defaultProperty.id);
          await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_PROPERTY_ID, defaultProperty.id);
        } else {
          setProperties(loadedProperties);
          
          if (currentPropertyIdData && userProperties.some(p => p.id === currentPropertyIdData)) {
            setCurrentPropertyId(currentPropertyIdData);
          } else {
            setCurrentPropertyId(userProperties[0].id);
            await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_PROPERTY_ID, userProperties[0].id);
          }
        }
      }
    } catch (error) {
      console.error('Error loading properties:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) {
      loadData();
    }
  }, [loadData, currentUser]);

  const addProperty = useCallback(
    async (name: string) => {
      if (!currentUser) return;

      const newProperty: Property = {
        id: Date.now().toString(),
        name,
        userId: currentUser.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const updated = [...properties, newProperty];
      setProperties(updated);
      await AsyncStorage.setItem(STORAGE_KEYS.PROPERTIES, JSON.stringify(updated));

      setCurrentPropertyId(newProperty.id);
      await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_PROPERTY_ID, newProperty.id);

      return newProperty;
    },
    [properties, currentUser]
  );

  const updateProperty = useCallback(
    async (propertyId: string, updates: Partial<Property>) => {
      const updated = properties.map((p) =>
        p.id === propertyId
          ? { ...p, ...updates, updatedAt: new Date().toISOString() }
          : p
      );
      setProperties(updated);
      await AsyncStorage.setItem(STORAGE_KEYS.PROPERTIES, JSON.stringify(updated));
    },
    [properties]
  );

  const deleteProperty = useCallback(
    async (propertyId: string) => {
      if (!currentUser) return;

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
