// lib/changelog.ts

export interface UpdateItem {
  id: string; // ID único da atualização (geralmente usamos a data invertida para facilitar, ex: "2026-04-21")
  date: string; // Data formatada para exibir ao usuário
  title: string;
  shortDescription: string;
  fullDescription: string[]; // Um array de parágrafos para facilitar a exibição no modal
}

// A lista de atualizações (A mais recente deve ficar sempre no topo)
export const appUpdates: UpdateItem[] = [
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
      "Acesse a nova aba 'Cartões' para cadastrar o seu primeiro cartão!",
    ],
  },
  // Quando tiver outra novidade no futuro, basta adicionar outro bloco como este AQUI em cima.
];
