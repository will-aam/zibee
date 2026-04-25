export interface UpdateItem {
  id: string; // ID único da atualização (geralmente usamos a data invertida para facilitar)
  date: string; // Data formatada para exibir ao usuário
  title: string;
  shortDescription: string;
  fullDescription: string[]; // Um array de parágrafos para facilitar a exibição
}

// A lista de atualizações (A mais recente deve ficar sempre no topo)
export const appUpdates: UpdateItem[] = [
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
