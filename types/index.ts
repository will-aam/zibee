export type TipoLancamento = "Receita" | "Despesa";

export interface Lancamento {
  id: number;
  user_id?: string;
  grupo_id?: string; // NOVO: Relaciona o lançamento ao grupo (se for da Grupo)
  descricao: string;
  link?: string;
  categoria: string;
  tipo: TipoLancamento;
  valor: number;
  forma_pagamento: string;
  data_vencimento: string;
  pago: boolean;
  observacoes?: string;
  created_at?: string;

  // ==========================================
  // NOVOS CAMPOS: FASE 2 (SOMBRAS E PARCELAS)
  // ==========================================
  conta_fixa_id?: number | null; // ID da Despesa Fixa Master (se for gerado por ela)
  parcela_atual?: number | null; // Ex: 1
  total_parcelas?: number | null; // Ex: 10
  isShadow?: boolean;
  cartao_id?: number | null;
}

export interface Meta {
  id: number;
  user_id?: string;
  nome: string;
  descricao?: string;
  link?: string;
  valor_total: number;
  valor_depositado: number;
  data_inicio: string;
  data_conclusao?: string;
  tipo: "vista" | "parcelado";
  fixada: boolean;
  parcelamentos?: any[]; // Podemos refinar isso depois se usar JSONB no Supabase
  created_at?: string;

  // CAMPOS DE AUTOMAÇÃO
  auto_deposito_ativo?: boolean;
  auto_valor?: number;
  auto_dia_cobranca?: number;
  auto_horario?: string;
  auto_data_inicio?: string;
  auto_meses_duracao?: number;
  auto_ultimo_processamento?: string;
}

export interface DespesaFixa {
  id: number;
  user_id: string;
  grupo_id?: string | null;
  descricao?: string; // Usando descricao como padrão novo
  nome?: string; // Mantido para compatibilidade com dados antigos
  valor: number;
  dia_vencimento: number;
  categoria?: string;
  forma_pagamento?: string;
  status?: "ativo" | "pausado"; // NOVO: Permite congelar a cobrança no mês (Ex: Dízimo)
  created_at?: string;
}

export interface Categoria {
  id: number;
  nome: string;
  user_id?: string;
}

// ============================================================================
// INTERFACES PARA A FEATURE DE GRUPOS
// ============================================================================

export interface UserProfile {
  id: string;
  has_premium_access: boolean;
  created_at?: string;
}

export interface Grupo {
  id: string;
  nome: string;
  criador_id: string;
  regra_divisao: "igual" | "proportional"; // corrigido typo 'proporcional' -> 'proportional' se estiver em inglês no db, ou mantenha se for PT
  created_at?: string;
}

export interface MembroGrupo {
  id: string;
  grupo_id: string;
  user_id?: string; // Será preenchido quando o usuário aceitar o convite
  email_convite: string;
  role: "Admin" | "Membro";
  status: "Pendente" | "Aceito";
  created_at?: string;
}
export interface CartaoCredito {
  id: number;
  user_id: string;
  grupo_id?: number | null;
  nome: string;
  limite?: number | null;
  dia_fechamento: number;
  dia_vencimento: number;
  created_at?: string;
}
