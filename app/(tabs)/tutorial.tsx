import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  Fuel,
  Settings,
  Tractor,
  Droplet,
  BarChart3,
  AlertTriangle,
  CreditCard,
  MapPin,
  Mail,
  Bell,
} from 'lucide-react-native';

type Section = {
  id: string;
  title: string;
  icon: React.ReactNode;
  content: string[];
  tips?: string[];
};

export default function TutorialScreen() {
  const [expandedSection, setExpandedSection] = useState<string | null>('primeiros-passos');

  const sections: Section[] = [
    {
      id: 'primeiros-passos',
      title: '🚀 Primeiros Passos',
      icon: <BookOpen size={24} color="#2D5016" />,
      content: [
        '1. Bem-vindo ao Gerenciador de Máquinas Agrícolas!',
        '2. Este app foi desenvolvido para facilitar o controle completo de suas máquinas, abastecimentos e manutenções.',
        '3. Antes de começar, você precisa seguir alguns passos simples:',
        '',
        '• Escolha seu plano de assinatura (7 dias grátis)',
        '• Crie sua primeira propriedade rural',
        '• Configure o Tanque de Combustível',
        '• Cadastre suas Máquinas',
        '• Comece a registrar Abastecimentos e Manutenções',
      ],
      tips: [
        'Você tem 7 dias grátis para testar todas as funcionalidades',
        'Cada propriedade tem seus dados isolados',
        'Sempre configure o tanque antes de registrar abastecimentos',
      ],
    },
    {
      id: 'assinatura',
      title: '💳 Planos e Assinatura',
      icon: <CreditCard size={24} color="#2D5016" />,
      content: [
        '🎁 Período de Teste Grátis',
        '• Todo usuário novo tem 7 dias de teste grátis',
        '• Durante o teste, você tem acesso completo (máquinas ilimitadas)',
        '• Após 7 dias, é necessário escolher um plano',
        '',
        '📋 Planos Disponíveis',
        '',
        'BÁSICO MENSAL - R$ 19,99/mês',
        '• Até 10 máquinas cadastradas',
        '• Todas as funcionalidades',
        '• Múltiplas propriedades',
        '',
        'BÁSICO ANUAL - R$ 199,90/ano',
        '• Até 10 máquinas cadastradas',
        '• Todas as funcionalidades',
        '• Múltiplas propriedades',
        '• Economia de ~2 meses',
        '',
        'PRO MENSAL - R$ 49,99/mês',
        '• Máquinas ILIMITADAS',
        '• Todas as funcionalidades',
        '• Múltiplas propriedades',
        '',
        'PRO ANUAL - R$ 499,90/ano',
        '• Máquinas ILIMITADAS',
        '• Todas as funcionalidades',
        '• Múltiplas propriedades',
        '• Melhor custo-benefício',
        '',
        '⚠️ Limite de Máquinas',
        '• Plano Básico: máximo de 10 máquinas por propriedade',
        '• Plano Pro: máquinas ilimitadas',
        '• Se atingir o limite, você será convidado a fazer upgrade',
      ],
      tips: [
        'Aproveite os 7 dias grátis para testar tudo',
        'Planos anuais têm desconto equivalente a ~2 meses grátis',
        'Faça upgrade para Pro se tiver muitas máquinas',
      ],
    },
    {
      id: 'propriedades',
      title: '🏡 Múltiplas Propriedades',
      icon: <MapPin size={24} color="#2D5016" />,
      content: [
        '📍 O que são Propriedades?',
        '• Você pode gerenciar várias fazendas/propriedades rurais',
        '• Cada propriedade tem seus próprios dados isolados',
        '• Máquinas, abastecimentos e manutenções não se misturam',
        '',
        '➕ Como Adicionar Nova Propriedade',
        '1. Toque no seletor de propriedade no topo da tela',
        '2. Aparecerá a lista de suas propriedades',
        '3. Toque em "+ Adicionar nova propriedade"',
        '4. Digite o nome da fazenda/propriedade',
        '5. Toque em "Salvar"',
        '',
        '🔄 Como Trocar de Propriedade',
        '1. Toque no seletor no topo (mostra a propriedade atual)',
        '2. Escolha outra propriedade da lista',
        '3. Todo o app passa a mostrar os dados daquela propriedade',
        '',
        '✏️ Editar Propriedade',
        '• Na lista de propriedades, toque no ícone de lápis',
        '• Altere o nome da propriedade',
        '• Salve as alterações',
        '',
        '🗑️ Excluir Propriedade',
        '• Na lista de propriedades, toque no ícone de lixeira',
        '• Confirme a exclusão',
        '• ATENÇÃO: isso apagará TODOS os dados daquela propriedade!',
      ],
      tips: [
        'Use uma propriedade para cada fazenda que você gerencia',
        'Os dados nunca se misturam entre propriedades',
        'Cuidado ao excluir: a ação não pode ser desfeita',
      ],
    },
    {
      id: 'tanque',
      title: '⛽ Tanque de Combustível',
      icon: <Fuel size={24} color="#2D5016" />,
      content: [
        '📝 Configuração Inicial (primeira vez)',
        '1. Acesse a aba "Tanque" no menu inferior',
        '2. Na primeira vez, você verá um formulário de configuração',
        '3. Preencha os dados:',
        '   • Capacidade Total: Ex: 1000, 2000, 5000 litros',
        '   • Tipo de Diesel: Diesel comum ou Diesel S10',
        '   • Quantidade Atual: Quantos litros existem agora',
        '   • Nível de Alerta: Quantos litros mínimos para alertar',
        '',
        '💡 Depois de Configurado',
        '• Visualize o status do tanque (capacidade, litros atuais, %)',
        '• Use "Adicionar Combustível" quando o caminhão abastecer o tanque',
        '• O consumo é automático: quando você registra abastecimento de máquina, o sistema já desconta do tanque',
        '',
        '➕ Adicionar Combustível ao Tanque',
        '1. Na tela do Tanque, toque em "Adicionar Combustível"',
        '2. Digite a quantidade de litros adicionados',
        '3. Toque em "Adicionar"',
        '4. O sistema verifica se cabe no tanque',
        '5. Se ultrapassar a capacidade, você será alertado',
        '6. A adição é registrada no histórico',
        '',
        '🔧 Ajuste Manual do Tanque',
        '• Use quando houver:',
        '  - Vazamento ou perda de combustível',
        '  - Erro de medição anterior',
        '  - Necessidade de correção',
        '• Na tela do Tanque, role até "Ajuste Manual"',
        '• Digite o valor do ajuste (positivo ou negativo)',
        '• Adicione uma observação explicando o motivo',
        '• Toque em "Ajustar"',
        '• O ajuste é registrado no histórico',
        '',
        '📊 Histórico de Adições',
        '• Visualize todas as adições de combustível',
        '• Mostra data, quantidade e motivo',
        '• Útil para rastreabilidade e auditoria',
        '• Fica na tela do Tanque, seção "Histórico"',
        '',
        '⚠️ Alertas Automáticos',
        '• Quando o tanque fica abaixo do nível mínimo, você recebe uma notificação',
        '• Fique atento para solicitar reabastecimento com antecedência',
        '• Configure emails para receber alertas automáticos',
      ],
      tips: [
        'Se você adicionar mais diesel do que a capacidade, o sistema perguntará se deseja ajustar',
        'O tanque nunca ficará negativo - o sistema protege contra valores inconsistentes',
        'Use ajustes manuais apenas quando necessário e sempre com observação',
        'Verifique o histórico regularmente para auditorias',
      ],
    },
    {
      id: 'maquinas',
      title: '🚜 Cadastro de Máquinas',
      icon: <Tractor size={24} color="#2D5016" />,
      content: [
        '➕ Como Cadastrar',
        '1. Acesse a aba "Máquinas" no menu inferior',
        '2. Toque no botão verde (+) no canto inferior direito',
        '3. Selecione o tipo de maquinário:',
        '   • Trator',
        '   • Caminhão',
        '   • Pá Carregadeira',
        '   • Vagão',
        '   • Outro',
        '4. Digite o modelo (Ex: Massey Ferguson 6713)',
        '5. (Opcional) Cadastre o horímetro inicial da máquina',
        '6. Toque em "Cadastrar"',
        '',
        '📊 Visualização',
        '• Cada máquina mostra seu horímetro atual',
        '• Alertas de manutenção aparecem com um ícone vermelho',
        '• Toque na máquina para ver mais detalhes',
        '',
        '✏️ Editar Máquina',
        '• Na tela de máquinas, toque no ícone de lápis ao lado da máquina',
        '• Altere o modelo ou horímetro inicial',
        '• Salve as alterações',
        '',
        '📦 Arquivar Máquina (RECOMENDADO)',
        '• Se a máquina tem histórico de uso, você verá 3 opções ao tentar excluir:',
        '  1. ARQUIVAR - Preserva todo o histórico (recomendado)',
        '  2. EXCLUIR TUDO - Apaga tudo e devolve combustível ao tanque',
        '  3. CANCELAR - Não faz nada',
        '• Máquinas arquivadas:',
        '  - Não aparecem na lista principal',
        '  - Aparecem nos relatórios com badge "ARQUIVADO"',
        '  - Todo histórico é preservado',
        '  - Podem ser visualizadas na aba Relatórios',
        '',
        '🗑️ Excluir Máquina',
        '• Se a máquina NÃO tem histórico: exclusão direta',
        '• Se TEM histórico: escolha entre arquivar ou excluir tudo',
        '• ATENÇÃO ao excluir tudo:',
        '  - Remove todos os abastecimentos',
        '  - Remove todas as manutenções',
        '  - Remove todos os alertas',
        '  - Devolve o combustível ao tanque',
        '  - Ação não pode ser desfeita!',
        '',
        '⚠️ Limite de Máquinas',
        '• Plano Básico: até 10 máquinas por propriedade',
        '• Plano Pro: máquinas ilimitadas',
        '• Ao atingir o limite, você pode fazer upgrade',
      ],
      tips: [
        'Cadastre o horímetro inicial se já souber o valor',
        'O horímetro é atualizado automaticamente a cada abastecimento',
        'SEMPRE arquive máquinas ao invés de excluir - preserva o histórico!',
        'Edite se digitou algo errado no cadastro',
      ],
    },
    {
      id: 'abastecimento',
      title: '💧 Registro de Abastecimento',
      icon: <Droplet size={24} color="#2D5016" />,
      content: [
        '1. Acesse a aba "Abastecimento"',
        '2. Toque no botão verde (+) para registrar',
        '3. Preencha as informações:',
        '   • Selecione a máquina',
        '   • Data e hora do abastecimento',
        '   • Litros abastecidos',
        '   • Horímetro atual da máquina',
        '   • Tipo de serviço (opcional): Plantio, Colheita, Transporte, etc.',
        '4. Toque em "Registrar"',
        '',
        '⚙️ O que acontece automaticamente:',
        '• O horímetro da máquina é atualizado',
        '• Os litros são descontados do tanque principal',
        '• Se não houver combustível suficiente, você será avisado',
        '• Se o tanque ficar abaixo do mínimo, um alerta é gerado',
      ],
      tips: [
        'Configure o tanque ANTES de registrar abastecimentos',
        'Sempre verifique o horímetro correto antes de registrar',
        'O consumo do tanque é automático - não precisa fazer nada!',
      ],
    },
    {
      id: 'manutencao',
      title: '🔧 Registro de Manutenção',
      icon: <Settings size={24} color="#2D5016" />,
      content: [
        '➕ Como Registrar',
        '1. Acesse a aba "Manutenção"',
        '2. Toque no botão verde (+) para registrar',
        '3. Preencha as informações:',
        '   • Selecione a máquina',
        '   • Data da manutenção',
        '   • Tipo de manutenção (veja abaixo)',
        '   • Horímetro atual',
        '   • Observações (opcional)',
        '',
        '📋 Tipos de Manutenção',
        '• "Troca de óleo em geral" já vem cadastrado',
        '• Você pode criar tipos personalizados:',
        '  1. Toque em "Gerenciar tipos de manutenção"',
        '  2. Toque em "+" para adicionar novo tipo',
        '  3. Digite o nome (ex: Troca de filtro, Revisão de freios)',
        '  4. Defina o intervalo em horas (ex: 250h)',
        '  5. Salve',
        '',
        '✏️ Editar Tipos de Manutenção',
        '• Na tela de tipos, toque no ícone de lápis',
        '• Altere o nome ou intervalo',
        '• Salve as alterações',
        '',
        '🗑️ Excluir Tipos de Manutenção',
        '• Toque no ícone de lixeira ao lado do tipo',
        '• Confirme a exclusão',
        '',
        '🔔 Alertas de Manutenção',
        '• Amarelo: faltam 50h para a próxima manutenção',
        '• Vermelho: manutenção vencida ou faltam menos de 50h',
        '• Os alertas aparecem automaticamente na tela de máquinas',
      ],
      tips: [
        'Crie tipos de manutenção para cada necessidade',
        'Mantenha um histórico completo para valorizar suas máquinas',
        'Edite se escreveu algo errado ao criar o tipo',
      ],
    },
    {
      id: 'relatorios',
      title: '📊 Relatórios e Histórico',
      icon: <BarChart3 size={24} color="#2D5016" />,
      content: [
        '1. Acesse a aba "Relatórios" no menu inferior',
        '2. Existem 4 abas de relatórios disponíveis:',
        '',
        '⚠️ ABA ALERTAS',
        '• Visualize todos os alertas de manutenção',
        '• Alertas de tanque de combustível',
        '• Status codificado por cores:',
        '  - Vermelho: urgente ou vencido',
        '  - Amarelo: atenção necessária',
        '  - Verde: tudo ok',
        '',
        '🔧 ABA MANUTENÇÃO',
        '• Histórico completo de manutenções',
        '• Organizado por máquina (incluindo arquivadas)',
        '• Mostra data, horímetro, itens e observações',
        '• Editar manutenção:',
        '  1. Toque no ícone de lápis',
        '  2. Altere horímetro, data ou intervalos de revisão',
        '  3. Salve as alterações',
        '• Excluir manutenção:',
        '  1. Toque no ícone de lixeira',
        '  2. Confirme a exclusão',
        '  3. Os alertas relacionados serão removidos',
        '',
        '💧 ABA ABASTECIMENTO',
        '• Histórico completo de abastecimentos',
        '• Organizado por máquina (incluindo arquivadas)',
        '• Mostra data, litros, horímetro e consumo médio',
        '• Editar abastecimento:',
        '  1. Toque no ícone de lápis',
        '  2. Altere litros ou horímetro',
        '  3. O tanque é ajustado automaticamente',
        '• Excluir abastecimento:',
        '  1. Toque no ícone de lixeira',
        '  2. Confirme a exclusão',
        '  3. O combustível é devolvido ao tanque automaticamente',
        '',
        '📈 ABA CONSUMO',
        '• Consumo médio de cada máquina',
        '• Medido em L/h (litros por hora)',
        '• Identifique máquinas com consumo elevado',
        '• Útil para planejamento e manutenção preventiva',
        '',
        '📦 Máquinas Arquivadas',
        '• Aparecem com badge "ARQUIVADO" amarelo',
        '• Todo histórico é preservado e visível',
        '• Podem ser editados ou excluídos normalmente',
      ],
      tips: [
        'Use a aba Consumo para identificar máquinas com problemas',
        'Edite registros se cometeu algum erro de digitação',
        'Ao excluir abastecimento, o combustível volta automaticamente ao tanque',
        'Máquinas arquivadas mantêm todo o histórico visível',
      ],
    },
    {
      id: 'notificacoes',
      title: '📧 Notificações por Email',
      icon: <Mail size={24} color="#2D5016" />,
      content: [
        '🔔 O que são Notificações por Email?',
        '• Receba alertas automáticos por email quando:',
        '  - Uma manutenção estiver próxima do vencimento',
        '  - Uma manutenção estiver vencida',
        '  - O tanque de combustível estiver baixo',
        '• Configure quantos emails quiser (máximo 3)',
        '• Funciona em todas as plataformas (Web, iOS, Android)',
        '',
        '📋 Como Configurar',
        '1. Acesse a aba "Configurações"',
        '2. Role até a seção "Notificações por Email"',
        '3. Toque em "+ Adicionar email"',
        '4. Digite o endereço de email',
        '5. Toque em "Salvar"',
        '6. Repita para adicionar mais emails (até 3)',
        '',
        '✏️ Editar Email',
        '1. Na lista de emails, toque no ícone de lápis',
        '2. Altere o endereço de email',
        '3. Toque em "Salvar"',
        '',
        '🗑️ Remover Email',
        '1. Na lista de emails, toque no ícone de lixeira',
        '2. Confirme a remoção',
        '3. O email não receberá mais notificações',
        '',
        '📬 Tipos de Notificações',
        '• Manutenção Próxima (Amarelo):',
        '  - Enviado quando faltam 20h ou menos',
        '  - Permite planejamento antecipado',
        '',
        '• Manutenção Vencida (Vermelho):',
        '  - Enviado quando a manutenção já passou do prazo',
        '  - Requer atenção imediata',
        '',
        '• Tanque Baixo:',
        '  - Enviado quando o tanque atinge o nível de alerta',
        '  - Evita falta de combustível',
        '',
        '⚙️ Sincronização',
        '• Os emails são sincronizados entre todos os seus dispositivos',
        '• Configure uma vez, funciona em todos os lugares',
        '• Mudanças são refletidas instantaneamente',
      ],
      tips: [
        'Adicione o email do gerente da fazenda para ele acompanhar',
        'Adicione seu email pessoal e do trabalho para não perder alertas',
        'Verifique a caixa de spam se não receber emails',
        'Máximo de 3 emails por usuário',
      ],
    },
    {
      id: 'dicas',
      title: '💡 Dicas Importantes',
      icon: <AlertTriangle size={24} color="#FF9800" />,
      content: [
        '⚡ Para melhor uso do aplicativo:',
        '',
        '1. Aproveite os 7 dias grátis para testar tudo',
        '2. Crie uma propriedade para cada fazenda',
        '3. Configure emails para receber notificações automáticas',
        '4. Sempre configure o tanque antes de registrar abastecimentos',
        '5. Cadastre o horímetro inicial ao adicionar máquinas novas',
        '6. Cadastre todas as máquinas no início',
        '7. Registre TODOS os abastecimentos (não pule!)',
        '8. Acompanhe os alertas de manutenção',
        '9. Verifique o nível do tanque regularmente',
        '10. Use as observações para registrar detalhes importantes',
        '11. ARQUIVE máquinas ao invés de excluir - preserva histórico',
        '12. Se errar algum cadastro, pode editar depois',
        '',
        '🔐 Controle de Acesso',
        '• Usuário Master: pode cadastrar máquinas e configurar o tanque',
        '• Operadores: podem registrar abastecimentos e manutenções',
        '',
        '📱 Funciona Offline',
        '• Todos os dados são salvos localmente',
        '• Você pode usar o app sem internet',
        '• Os dados ficam sincronizados automaticamente',
        '',
        '✏️ Edição e Exclusão',
        '• Você pode editar:',
        '  - Máquinas, propriedades e tipos de manutenção',
        '  - Abastecimentos e manutenções nos Relatórios',
        '  - Emails de notificação',
        '• Use o ícone de lápis para editar',
        '• Use o ícone de lixeira para excluir',
        '• ATENÇÃO: exclusões não podem ser desfeitas!',
        '',
        '📦 Arquivamento vs Exclusão',
        '• SEMPRE prefira ARQUIVAR ao invés de EXCLUIR',
        '• Arquivamento preserva todo o histórico',
        '• Máquinas arquivadas ficam visíveis nos relatórios',
        '• Exclusão apaga tudo permanentemente',
        '• Use exclusão apenas se não houver histórico',
      ],
      tips: [
        'Sempre revise os dados antes de excluir',
        'Edite se cometer algum erro de digitação',
        'Configure notificações por email para não perder alertas',
        'ARQUIVE ao invés de EXCLUIR sempre que possível',
        'Mantenha o app sempre atualizado',
        'Entre em contato com o suporte se tiver dúvidas',
      ],
    },
  ];

  const toggleSection = (id: string) => {
    setExpandedSection(expandedSection === id ? null : id);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <BookOpen size={32} color="#2D5016" strokeWidth={2} />
        <Text style={styles.headerTitle}>Tutorial Completo</Text>
        <Text style={styles.headerSubtitle}>
          Aprenda a usar todas as funcionalidades do app
        </Text>
      </View>

      <View style={styles.content}>
        {sections.map((section) => {
          const isExpanded = expandedSection === section.id;

          return (
            <View key={section.id} style={styles.section}>
              <TouchableOpacity
                style={styles.sectionHeader}
                onPress={() => toggleSection(section.id)}
                activeOpacity={0.7}
              >
                <View style={styles.sectionTitleContainer}>
                  {section.icon}
                  <Text style={styles.sectionTitle}>{section.title}</Text>
                </View>
                {isExpanded ? (
                  <ChevronDown size={24} color="#666" />
                ) : (
                  <ChevronRight size={24} color="#666" />
                )}
              </TouchableOpacity>

              {isExpanded && (
                <View style={styles.sectionContent}>
                  {section.content.map((text, index) => (
                    <Text key={index} style={styles.contentText}>
                      {text}
                    </Text>
                  ))}

                  {section.tips && section.tips.length > 0 && (
                    <View style={styles.tipsContainer}>
                      <View style={styles.tipsHeader}>
                        <AlertTriangle size={18} color="#FF9800" />
                        <Text style={styles.tipsTitle}>Dicas</Text>
                      </View>
                      {section.tips.map((tip, index) => (
                        <Text key={index} style={styles.tipText}>
                          • {tip}
                        </Text>
                      ))}
                    </View>
                  )}
                </View>
              )}
            </View>
          );
        })}
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Precisa de ajuda adicional? Entre em contato com o suporte!
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    backgroundColor: '#FFF',
    padding: 24,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '700' as const,
    color: '#2D5016',
    marginTop: 12,
  },
  headerSubtitle: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
  },
  content: {
    padding: 16,
  },
  section: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: '#333',
    flex: 1,
  },
  sectionContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  contentText: {
    fontSize: 15,
    lineHeight: 24,
    color: '#444',
    marginBottom: 4,
  },
  tipsContainer: {
    backgroundColor: '#FFF8E1',
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  tipsTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#FF9800',
  },
  tipText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#666',
    marginBottom: 4,
  },
  footer: {
    backgroundColor: '#FFF',
    padding: 24,
    marginTop: 8,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
  },
});
