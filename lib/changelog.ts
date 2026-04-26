export interface UpdateItem {
  id: string;
  date: string;
  title: string;
  shortDescription: string;
  fullDescription: string[];
}

export const appUpdates: UpdateItem[] = [
  {
    id: "2026-04-26-planejamento",
    date: "26 de Abril de 2026",
    title: "📈 Novo Planejador Financeiro",
    shortDescription:
      "Controle seus gastos com limites por categoria e a regra de ouro 50/30/20.",
    fullDescription: [
      "Novo ecossistema de planejamento do Zibee para ajudar você a nunca mais estourar o orçamento.",
      "• Teto de Gastos: O app agora calcula seu saldo livre real, já descontando as contas fixas e variáveis.",
      "• Regra 50/30/20: Baseado no método de Elizabeth Warren, seu orçamento é dividido automaticamente em Necessidades (50%), Desejos (30%) e Poupança (20%).",
      "• Limites por Categoria: Defina limites de gastos (ex: R$ 300 para Lazer) e acompanhe o progresso com alertas visuais.",
      "• Dashboard: Acompanhe todos os seus limites em um novo gráfico interativo na tela inicial.",
      "Acesse a aba 'Planejamento' no menu e configure o seu mês!",
    ],
  },
  {
    id: "2026-04-25-configuracoes",
    date: "25 de Abril de 2026",
    title: "⚙️ Novas Configurações e Alertas!",
    shortDescription:
      "Reformulamos totalmente a área de Ajustes e lançamos o nosso sistema de Alertas Inteligentes.",
    fullDescription: [
      "A tela de Configurações foi redesenhada para uma experiência mais fluida, rápida e nativa no seu celular.",
      "O que há de novo?",
      "• Perfil Completo: Agora você escolhe como quer ser chamado no app, adiciona seu telefone e altera sua senha com muito mais facilidade.",
      "• Alertas Inteligentes: Ative as notificações do sistema e seja avisado automaticamente quando uma fatura ou conta estiver perto do vencimento.",
      "• Notificações de Grupo: Fique sabendo em tempo real quando alguém do seu grupo adicionar uma nova despesa ou realizar um pagamento.",
      "Acesse a aba Configurações pelo menu principal para explorar o novo visual e ativar seus alertas!",
    ],
  },
  {
    id: "2026-04-21-cartoes",
    date: "21 de Abril de 2026",
    title: "💳 Nova Função: Cartões de Crédito!",
    shortDescription:
      "Agora você pode gerenciar limites, faturas e parcelamentos diretamente no Zibee.",
    fullDescription: [
      "Gerenciar seus cartões de crédito ficou muito mais fácil e inteligente.",
      "O que há de novo?",
      "• Limite em Tempo Real: Acompanhe o quanto você já gastou e o limite disponível com base na data de fechamento.",
      "• Parcelamento Inteligente: Lance uma compra parcelada e o Zibee distribuirá os valores pelos próximos meses automaticamente.",
      "• Botão 'Pagar Fatura': Quite todas as compras pendentes do mês com um único clique.",
      "Acesse a aba 'Cartões' para cadastrar o seu primeiro cartão!",
    ],
  },
];
