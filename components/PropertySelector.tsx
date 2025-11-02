import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  TextInput,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { ChevronDown, Edit2, LogOut, Plus, Trash2, X } from 'lucide-react-native';
import { useProperty } from '@/contexts/PropertyContext';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';

export default function PropertySelector() {
  const { properties, currentProperty, switchProperty, addProperty, updateProperty, deleteProperty } = useProperty();
  const { logout } = useAuth();
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isAddingNew, setIsAddingNew] = useState<boolean>(false);
  const [newPropertyName, setNewPropertyName] = useState<string>('');
  const [editingPropertyId, setEditingPropertyId] = useState<string | null>(null);

  const handleSelectProperty = async (propertyId: string) => {
    await switchProperty(propertyId);
    setIsModalOpen(false);
  };

  const handleAddNewProperty = async () => {
    if (!newPropertyName.trim()) {
      Alert.alert('Erro', 'Digite um nome para a propriedade');
      return;
    }

    try {
      if (editingPropertyId) {
        await updateProperty(editingPropertyId, { name: newPropertyName.trim() });
        setNewPropertyName('');
        setIsAddingNew(false);
        setEditingPropertyId(null);
        Alert.alert('Sucesso', 'Propriedade atualizada com sucesso!');
      } else {
        await addProperty(newPropertyName.trim());
        setNewPropertyName('');
        setIsAddingNew(false);
        setIsModalOpen(false);
        Alert.alert('Sucesso', 'Propriedade criada com sucesso!');
      }
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível salvar a propriedade');
      console.error('Error saving property:', error);
    }
  };

  const handleEditProperty = (propertyId: string, propertyName: string) => {
    setEditingPropertyId(propertyId);
    setNewPropertyName(propertyName);
    setIsAddingNew(true);
  };

  const handleLogout = () => {
    Alert.alert('Sair', 'Deseja realmente sair da conta?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair',
        style: 'destructive',
        onPress: async () => {
          try {
            console.log('PropertySelector: Iniciando logout...');
            setIsModalOpen(false);
            
            await logout();
            console.log('PropertySelector: Logout concluído, redirecionando...');
            
            if (Platform.OS === 'web') {
              if (typeof window !== 'undefined') {
                console.log('PropertySelector: Redirecionando para login (web)');
                window.location.replace('/login');
              }
            } else {
              console.log('PropertySelector: Redirecionando para login (mobile)');
              router.replace('/login');
            }
          } catch (error) {
            console.error('PropertySelector: Erro ao fazer logout:', error);
            if (Platform.OS === 'web' && typeof window !== 'undefined') {
              window.location.replace('/login');
            } else {
              router.replace('/login');
            }
          }
        },
      },
    ]);
  };

  const handleDeleteProperty = (propertyId: string, propertyName: string) => {
    if (properties.length === 1) {
      Alert.alert('Erro', 'Você precisa ter pelo menos uma propriedade cadastrada.');
      return;
    }

    Alert.alert(
      'Excluir Propriedade',
      `Tem certeza que deseja excluir "${propertyName}"?\n\nTodos os dados desta propriedade (máquinas, abastecimentos, manutenções) serão perdidos.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            await deleteProperty(propertyId);
            Alert.alert('Sucesso', 'Propriedade excluída com sucesso!');
          },
        },
      ]
    );
  };

  if (!currentProperty) {
    return null;
  }

  return (
    <View>
      <TouchableOpacity
        style={styles.selectorButton}
        onPress={() => setIsModalOpen(true)}
        activeOpacity={0.7}
      >
        <Text style={styles.selectorText} numberOfLines={1}>
          {currentProperty.name}
        </Text>
        <ChevronDown size={18} color="#FFF" />
      </TouchableOpacity>

      <Modal
        visible={isModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setIsModalOpen(false);
          setIsAddingNew(false);
        }}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => {
            setIsModalOpen(false);
            setIsAddingNew(false);
          }}
        >
          <View
            style={styles.modalContent}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Selecione a Propriedade</Text>
              <TouchableOpacity
                onPress={() => {
                  setIsModalOpen(false);
                  setIsAddingNew(false);
                }}
                style={styles.closeButton}
              >
                <X size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.propertiesList}>
              {properties.map((property) => (
                <View key={property.id} style={styles.propertyItemWrapper}>
                  <TouchableOpacity
                    style={[
                      styles.propertyItem,
                      currentProperty.id === property.id && styles.propertyItemActive,
                    ]}
                    onPress={() => handleSelectProperty(property.id)}
                  >
                    <Text
                      style={[
                        styles.propertyName,
                        currentProperty.id === property.id && styles.propertyNameActive,
                      ]}
                    >
                      {property.name}
                    </Text>
                  </TouchableOpacity>
                  <View style={styles.propertyActions}>
                    <TouchableOpacity
                      style={styles.propertyActionButton}
                      onPress={() => handleEditProperty(property.id, property.name)}
                    >
                      <Edit2 size={18} color="#666" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.propertyActionButton}
                      onPress={() => handleDeleteProperty(property.id, property.name)}
                    >
                      <Trash2 size={18} color="#FF5722" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}

              {!isAddingNew && (
                <>
                  <TouchableOpacity
                    style={styles.addButton}
                    onPress={() => setIsAddingNew(true)}
                  >
                    <Plus size={20} color="#2D5016" />
                    <Text style={styles.addButtonText}>Adicionar nova propriedade</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.logoutButton}
                    onPress={handleLogout}
                  >
                    <LogOut size={20} color="#FF5722" />
                    <Text style={styles.logoutButtonText}>Sair da conta</Text>
                  </TouchableOpacity>
                </>
              )}

              {isAddingNew && (
                <View style={styles.addForm}>
                  <Text style={styles.addFormTitle}>
                    {editingPropertyId ? 'Editar Propriedade' : 'Nova Propriedade'}
                  </Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Nome da propriedade"
                    placeholderTextColor="#999"
                    value={newPropertyName}
                    onChangeText={setNewPropertyName}
                    autoFocus
                  />
                  <View style={styles.addFormButtons}>
                    <TouchableOpacity
                      style={styles.cancelButton}
                      onPress={() => {
                        setIsAddingNew(false);
                        setNewPropertyName('');
                        setEditingPropertyId(null);
                      }}
                    >
                      <Text style={styles.cancelButtonText}>Cancelar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.saveButton}
                      onPress={handleAddNewProperty}
                    >
                      <Text style={styles.saveButtonText}>Salvar</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  selectorButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
    maxWidth: 200,
  },
  selectorText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600' as const,
    marginRight: 4,
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  propertiesList: {
    padding: 16,
  },
  propertyItemWrapper: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginBottom: 8,
    gap: 8,
  },
  propertyItem: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#F8F8F8',
  },
  propertyItemActive: {
    backgroundColor: '#2D5016',
  },
  propertyName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#333',
  },
  propertyNameActive: {
    color: '#FFF',
  },
  propertyActions: {
    flexDirection: 'row' as const,
    gap: 6,
  },
  propertyActionButton: {
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#F8F8F8',
  },
  addButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginTop: 8,
    borderWidth: 2,
    borderColor: '#2D5016',
    borderStyle: 'dashed' as const,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#2D5016',
    marginLeft: 8,
  },
  addForm: {
    marginTop: 8,
    padding: 16,
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
  },
  addFormTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#333',
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
    marginBottom: 12,
  },
  addFormButtons: {
    flexDirection: 'row' as const,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#DDD',
    alignItems: 'center' as const,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#666',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#2D5016',
    alignItems: 'center' as const,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#FFF',
  },
  logoutButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginTop: 16,
    backgroundColor: '#FFF1F0',
    borderWidth: 1,
    borderColor: '#FF5722',
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#FF5722',
    marginLeft: 8,
  },
});
