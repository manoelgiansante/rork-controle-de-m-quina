import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { AlertTriangle } from 'lucide-react-native';

interface CancelSubscriptionModalProps {
  visible: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  isLoading?: boolean;
}

export default function CancelSubscriptionModal({
  visible,
  onCancel,
  onConfirm,
  isLoading = false,
}: CancelSubscriptionModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <View style={styles.iconContainer}>
            <AlertTriangle size={48} color="#DC2626" strokeWidth={2} />
          </View>

          <Text style={styles.title}>Cancelar Assinatura?</Text>

          <Text style={styles.message}>
            Tem certeza que deseja cancelar sua assinatura? Você perderá acesso
            aos recursos Premium no final do período atual.
          </Text>

          <View style={styles.buttonsContainer}>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={onCancel}
              disabled={isLoading}
            >
              <Text style={styles.secondaryButtonText}>
                Não, manter assinatura
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.destructiveButton,
                isLoading && styles.destructiveButtonDisabled,
              ]}
              onPress={onConfirm}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.destructiveButtonText}>Sim, cancelar</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      },
    }),
  },
  iconContainer: {
    alignItems: 'center' as const,
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: '#1A1A1A',
    textAlign: 'center' as const,
    marginBottom: 12,
  },
  message: {
    fontSize: 15,
    color: '#666666',
    textAlign: 'center' as const,
    lineHeight: 22,
    marginBottom: 24,
  },
  buttonsContainer: {
    gap: 12,
  },
  secondaryButton: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    minHeight: 52,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#2D5016',
  },
  destructiveButton: {
    backgroundColor: '#DC2626',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    minHeight: 52,
  },
  destructiveButtonDisabled: {
    opacity: 0.6,
  },
  destructiveButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
});
