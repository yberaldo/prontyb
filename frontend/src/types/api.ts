export type ApiEnvelope<T> =
  | {
      ok: true;
      dados: T;
      mensagem?: string;
    }
  | {
      ok: false;
      mensagem?: string;
      dados?: unknown;
    };

export interface ProntuarioAnestesico {
  id: number;
  numero_prontuario?: string | null;
  clinica_id?: number | null;
  nome_animal?: string | null;
  especie?: string | null;
  raca?: string | null;
  sexo?: string | null;
  idade?: string | number | null;
  peso?: string | number | null;
  nome_tutor?: string | null;
  nome_procedimento?: string | null;
  data_procedimento?: string | null;
  cirurgiao_id?: number | null;
  anestesista_id?: number | null;
  observacoes_pre_anestesicas?: string | null;
  criado_em?: string | null;
  atualizado_em?: string | null;
  clinica_nome?: string | null;
  anestesista_nome?: string | null;
  anestesista_crmv?: string | null;
  anestesista_uf?: string | null;
  cirurgiao_nome?: string | null;
  cirurgiao_crmv?: string | null;
  cirurgiao_uf?: string | null;
}

export interface CategoriaFarmaco {
  id: number;
  nome: string;
  chave: string;
  ativo?: boolean | number | null;
  ordem?: number | null;
}

export interface Farmaco {
  id: number;
  nome: string;
  unidade_padrao?: string | null;
  concentracao_padrao?: string | null;
  permite_dose_livre?: boolean | number | null;
  ativo?: boolean | number | null;
  criado_em?: string | null;
  atualizado_em?: string | null;
  categorias?: CategoriaFarmaco[];
}

export interface DoseFarmaco {
  id: number;
  farmaco_id: number;
  rotulo: string;
  valor: number | string;
  unidade: string;
  permite_edicao?: boolean | number | null;
  ativo?: boolean | number | null;
  farmaco?: Pick<Farmaco, 'id' | 'nome' | 'unidade_padrao' | 'concentracao_padrao' | 'permite_dose_livre' | 'ativo'> | null;
}

export interface CriarProntuarioPayload {
  numero_prontuario?: string;
  clinica_id?: number | null;
  nome_animal: string;
  especie: string;
  raca?: string | null;
  sexo?: string | null;
  idade?: string | null;
  peso?: number | null;
  nome_tutor: string;
  nome_procedimento: string;
  data_procedimento: string;
  cirurgiao_id?: number | null;
  anestesista_id: number;
  observacoes_pre_anestesicas?: string | null;
}

export interface AtualizarProntuarioPayload {
  numero_prontuario?: string | null;
  clinica_id?: number | null;
  nome_animal?: string | null;
  especie?: string | null;
  raca?: string | null;
  sexo?: string | null;
  idade?: string | null;
  peso?: number | null;
  nome_tutor?: string | null;
  nome_procedimento?: string | null;
  data_procedimento?: string | null;
  cirurgiao_id?: number | null;
  anestesista_id?: number | null;
  observacoes_pre_anestesicas?: string | null;
}

export type MedicacaoProntuarioCategoria =
  | 'pre_anestesica_sedativo'
  | 'pre_anestesica_opioide'
  | 'inducao'
  | 'manutencao'
  | 'trans_anestesica';

export interface MedicacaoProntuarioPayload {
  categoria: MedicacaoProntuarioCategoria;
  subcategoria: string;
  farmaco_id: number;
  dose_selecionada?: string | null;
  dose_digitada?: number | null;
  unidade?: string | null;
  motivo_uso?: string | null;
  ordem?: number | null;
}

export type FluidoFluidoterapia = 'ringer_com_lactato' | 'solucao_fisiologica_09';
export type CateterFluidoterapia = '24_amarelo' | '22_azul' | '20_rosa';
export type MembroCanuladoFluidoterapia =
  | 'membro_anterior_esquerdo'
  | 'membro_anterior_direito'
  | 'membro_posterior_direito'
  | 'membro_posterior_esquerdo';

export interface FluidoterapiaProntuarioPayload {
  fluido: FluidoFluidoterapia;
  cateter_utilizado?: CateterFluidoterapia | null;
  membro_canulado?: MembroCanuladoFluidoterapia | null;
  taxa_ml_kg_h?: number | null;
  desafio_hidrico_realizado?: boolean | number | null;
  desafio_volume_ml_kg?: number | null;
  desafio_tempo_min?: number | null;
  desafio_quantidade?: number | null;
  desafio_motivo?: string | null;
}

export interface Clinica {
  id: number;
  nome: string;
  endereco?: string | null;
  cidade?: string | null;
  estado?: string | null;
  ativo?: boolean | number | null;
  criado_em?: string | null;
  atualizado_em?: string | null;
}

export interface Profissional {
  id: number;
  nome_completo: string;
  crmv?: string | null;
  uf_crmv?: string | null;
  funcao?: 'cirurgiao' | 'anestesista' | 'ambos' | string | null;
  ativo?: boolean | number | null;
  criado_em?: string | null;
  atualizado_em?: string | null;
}

export interface MedicacaoProntuario {
  id: number;
  prontuario_id: number;
  categoria?: MedicacaoProntuarioCategoria | string | null;
  subcategoria?: string | null;
  farmaco_id?: number | null;
  dose_selecionada?: string | number | null;
  dose_digitada?: string | number | null;
  unidade?: string | null;
  motivo_uso?: string | null;
  ordem?: number | null;
  farmaco_nome?: string | null;
  farmaco_unidade_padrao?: string | null;
  farmaco_concentracao_padrao?: string | null;
  farmaco_permite_dose_livre?: boolean | number | null;
  farmaco_ativo?: boolean | number | null;
}

export interface FluidoterapiaProntuario {
  id: number;
  prontuario_id: number;
  fluido?: string | null;
  cateter_utilizado?: CateterFluidoterapia | null;
  membro_canulado?: MembroCanuladoFluidoterapia | null;
  taxa_ml_kg_h?: string | number | null;
  desafio_hidrico_realizado?: boolean | number | null;
  desafio_volume_ml_kg?: string | number | null;
  desafio_tempo_min?: string | number | null;
  desafio_quantidade?: string | number | null;
  desafio_motivo?: string | null;
}

export interface AnexoProntuario {
  id: number;
  prontuario_id: number;
  tipo_anexo?: string | null;
  nome_arquivo?: string | null;
  caminho_arquivo?: string | null;
  mime_type?: string | null;
  tamanho_bytes?: number | null;
  criado_em?: string | null;
}

export interface MonitorizacaoProntuario {
  id: number;
  prontuario_id: number;
  anexo_id?: number | null;
  dados_json?: string | Record<string, unknown> | null;
  colunas_json?: string | string[] | null;
  status?: string | null;
  criado_em?: string | null;
  atualizado_em?: string | null;
  anexo_nome_arquivo?: string | null;
  anexo_tipo_anexo?: string | null;
  anexo_mime_type?: string | null;
  anexo_tamanho_bytes?: number | null;
}
