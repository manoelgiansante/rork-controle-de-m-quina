import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, TouchableOpacity } from 'react-native';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('[ERROR BOUNDARY] Caught error:', error);
    console.error('[ERROR BOUNDARY] Error info:', errorInfo);
    console.error('[ERROR BOUNDARY] Error stack:', error.stack);
    console.error('[ERROR BOUNDARY] Component stack:', errorInfo.componentStack);

    this.setState({
      error,
      errorInfo,
    });
  }

  handleReload = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.header}>
              <Text style={styles.title}>Ops! Algo deu errado</Text>
              <Text style={styles.subtitle}>
                O aplicativo encontrou um erro inesperado.
              </Text>
            </View>

            <View style={styles.errorContainer}>
              <Text style={styles.errorTitle}>Detalhes do erro:</Text>
              <Text style={styles.errorText}>
                {this.state.error?.toString() || 'Erro desconhecido'}
              </Text>

              {this.state.error?.stack && (
                <>
                  <Text style={styles.errorTitle}>Stack trace:</Text>
                  <Text style={styles.errorStack}>
                    {this.state.error.stack}
                  </Text>
                </>
              )}

              {this.state.errorInfo?.componentStack && (
                <>
                  <Text style={styles.errorTitle}>Component stack:</Text>
                  <Text style={styles.errorStack}>
                    {this.state.errorInfo.componentStack}
                  </Text>
                </>
              )}
            </View>

            <TouchableOpacity
              style={styles.button}
              onPress={this.handleReload}
            >
              <Text style={styles.buttonText}>Recarregar Aplicativo</Text>
            </TouchableOpacity>

            <Text style={styles.footer}>
              Se o problema persistir, entre em contato com o suporte.
            </Text>
          </ScrollView>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    padding: 20,
  },
  header: {
    marginTop: 40,
    marginBottom: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#d32f2f',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 15,
    marginBottom: 20,
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginTop: 10,
    marginBottom: 5,
  },
  errorText: {
    fontSize: 14,
    color: '#d32f2f',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  errorStack: {
    fontSize: 12,
    color: '#666',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  button: {
    backgroundColor: '#1976d2',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
});
