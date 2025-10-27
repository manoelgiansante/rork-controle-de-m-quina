import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { router } from 'expo-router';
import { CheckSquare, Square } from 'lucide-react-native';

export default function TermsScreen() {
  const { acceptTerms } = useAuth();
  const [agreed, setAgreed] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const handleContinue = async () => {
    if (!agreed || isProcessing) return;

    setIsProcessing(true);
    try {
      await acceptTerms();
      router.replace('/');
    } catch (error) {
      console.error('Error accepting terms:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Text style={styles.title}>Termos de Uso e Política de Privacidade</Text>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.paragraph}>
          Este aplicativo é oferecido por <Text style={styles.bold}>MM CAMPO FORTE LTDA</Text>, 
          inscrita no CNPJ 57.169.838/0001-20, com contato pelo e-mail{' '}
          <Text style={styles.link}>controledemaquinaagricola@gmail.com</Text>, doravante 
          denominada &quot;Aplicativo&quot;.
        </Text>

        <Text style={styles.paragraph}>
          O presente termo regula o uso deste aplicativo e suas funcionalidades de gestão de 
          maquinários agrícolas, propriedades rurais, manutenções, revisões e assinaturas.
        </Text>

        <Text style={styles.sectionTitle}>1. Consentimento e Responsabilidade do Usuário</Text>
        <Text style={styles.paragraph}>
          Ao utilizar o aplicativo, o usuário declara estar ciente de que todas as informações 
          inseridas são de sua responsabilidade e concorda com o tratamento dos dados fornecidos 
          conforme a Política de Privacidade.
        </Text>
        <Text style={styles.paragraph}>
          O aplicativo fornece informações e alertas de forma automatizada, sem substituir 
          orientações técnicas, mecânicas ou veterinárias profissionais.
        </Text>
        <Text style={styles.paragraph}>
          O usuário reconhece que eventuais erros de operação, inserção de dados ou interpretação 
          são de sua responsabilidade.
        </Text>

        <Text style={styles.sectionTitle}>2. Tratamento de Dados Pessoais (LGPD)</Text>
        <Text style={styles.paragraph}>
          O usuário autoriza o tratamento dos seus dados pessoais exclusivamente para o 
          funcionamento do aplicativo, conforme a Lei nº 13.709/2018 (Lei Geral de Proteção 
          de Dados – LGPD).
        </Text>
        <Text style={styles.paragraph}>
          Nenhum dado será compartilhado com terceiros sem consentimento expresso.
        </Text>
        <Text style={styles.paragraph}>
          O aplicativo adota medidas técnicas e administrativas para proteger as informações 
          armazenadas.
        </Text>

        <Text style={styles.sectionTitle}>3. Pagamentos e Planos</Text>
        <Text style={styles.paragraph}>
          O usuário está ciente de que o aplicativo oferece planos pagos e que as transações 
          são realizadas exclusivamente pelas lojas oficiais (App Store e Google Play), 
          sujeitas às políticas e taxas dessas plataformas.
        </Text>
        <Text style={styles.paragraph}>
          O usuário pode cancelar sua assinatura diretamente nas lojas a qualquer momento.
        </Text>

        <Text style={styles.sectionTitle}>4. Alterações dos Termos</Text>
        <Text style={styles.paragraph}>
          O aplicativo poderá atualizar estes termos a qualquer momento.
        </Text>
        <Text style={styles.paragraph}>
          Caso haja alterações relevantes, o usuário será notificado e deverá aceitar novamente 
          os termos antes de continuar o uso.
        </Text>

        <Text style={styles.sectionTitle}>5. Cancelamento e Exclusão</Text>
        <Text style={styles.paragraph}>
          O usuário pode cancelar sua assinatura ou excluir sua conta dentro do aplicativo.
        </Text>
        <Text style={styles.paragraph}>
          A exclusão da conta implica na remoção definitiva dos dados pessoais armazenados.
        </Text>

        <Text style={styles.sectionTitle}>6. Foro e Legislação Aplicável</Text>
        <Text style={styles.paragraph}>
          Este termo é regido pelas leis da República Federativa do Brasil.
        </Text>
        <Text style={styles.paragraph}>
          Fica eleito o foro da comarca de Araraquara – SP para dirimir quaisquer dúvidas ou 
          controvérsias relacionadas a este documento.
        </Text>

        <Text style={styles.acceptText}>
          Ao clicar em &quot;Concordo&quot;, o usuário declara que leu, entendeu e aceita integralmente 
          os Termos de Uso e a Política de Privacidade.
        </Text>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity 
          style={styles.checkboxContainer}
          onPress={() => setAgreed(!agreed)}
          activeOpacity={0.7}
        >
          {agreed ? (
            <CheckSquare size={24} color="#10b981" />
          ) : (
            <Square size={24} color="#6b7280" />
          )}
          <Text style={styles.checkboxText}>
            Li e concordo com os Termos de Uso e Política de Privacidade
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.button,
            (!agreed || isProcessing) && styles.buttonDisabled,
          ]}
          onPress={handleContinue}
          disabled={!agreed || isProcessing}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>
            {isProcessing ? 'Processando...' : 'Continuar'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  paragraph: {
    fontSize: 14,
    lineHeight: 20,
    color: '#374151',
    marginBottom: 12,
  },
  bold: {
    fontWeight: '700',
  },
  link: {
    color: '#2563eb',
    textDecorationLine: 'underline',
  },
  acceptText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#111827',
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    backgroundColor: '#ffffff',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  checkboxText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  button: {
    backgroundColor: '#10b981',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#d1d5db',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
