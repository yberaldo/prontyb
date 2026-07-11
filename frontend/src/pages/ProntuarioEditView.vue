<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { listarClinicas } from '../api/clinicas';
import { listarDosesPorFarmaco } from '../api/doses_farmacos';
import { listarFarmacosPorCategoria } from '../api/farmacos';
import { listarAnestesistas, listarCirurgioes } from '../api/profissionais';
import {
  atualizarFluidoterapia,
  atualizarMedicacao,
  atualizarProntuario,
  buscarProntuario,
  criarFluidoterapia,
  criarMedicacao,
  listarFluidoterapias,
  listarMedicacoes,
  removerMedicacao,
} from '../api/prontuarios';
import type {
  AtualizarProntuarioPayload,
  CateterFluidoterapia,
  Clinica,
  DoseFarmaco,
  Farmaco,
  FluidoterapiaProntuario,
  FluidoterapiaProntuarioPayload,
  FluidoFluidoterapia,
  MedicacaoProntuario,
  MedicacaoProntuarioCategoria,
  MedicacaoProntuarioPayload,
  MembroCanuladoFluidoterapia,
  Profissional,
  ProntuarioAnestesico,
} from '../types/api';

const RACAS = [
  'Affenpinscher',
  'Afghan hound',
  'Airedale terrier',
  'Akita americano',
  'Akita Inu',
  'American Pit Bull',
  'American staffordshire terrier',
  'Australian cattle dog',
  'Australian silky terrier',
  'Australian terrier',
  'Barbet',
  'Galgo russo/Borzoi',
  'Basenji',
  'Basset Hound',
  'Beagle',
  'Beagle Harrier',
  'Bearded Collie',
  'Beauceron',
  'Bedlington terrier',
  'Bergamasco',
  'Bernese mountain dog',
  'Bichon bolonhês',
  'Bichon Frisé',
  'Bichon havanês',
  'Bichon maltês',
  'Bloodhound',
  'Boerboel',
  'Boiadeiro Bernês',
  'Boiadeiro de Flandres',
  'Border Collie',
  'Boston terrier',
  'Boxer',
  'Braco alemão',
  'Briard',
  'Buldogue americano',
  'Buldogue campeiro',
  'Buldogue francês',
  'Buldogue inglês',
  'Bull Terrier',
  'Bulmastife',
  'Cairn terrier',
  'Cane Corso',
  "Cão d'água português",
  'Cão pelado Mexicano',
  'Cavalier king Charles spaniel',
  'Chihuahua',
  'Chinese cristed dog',
  'Chow Chow',
  'Clumber spaniel',
  'Cocker spaniel americano',
  'Cocker spaniel inglês',
  'Collie',
  'Coton de Tulear',
  'Curly-coated retriever',
  'Dachshund',
  'Dálmata',
  'Dandie Dinmont terrier',
  'Deerhound',
  'Doberman',
  'Dogo argentino',
  'Dogue alemão',
  'Dogue de Bordeaux',
  'Elkhound norueguês',
  'Fila brasileiro',
  'Flat-coated retriever',
  'Fox paulistinha',
  'Fox terrier',
  'Foxhound americano',
  'Golden retriever',
  'Grande Boiadeiro suíço',
  'Greyhound',
  'Harrier',
  'Husky siberiano',
  'Irish wolfhound',
  'Italian greyhound/Pequeno galgo italiano',
  'Jack Russel terrier',
  'Kerry blue terrier',
  'King Charles Spaniel',
  'Komondor',
  'Kuvasz',
  'Labrador retriever',
  'Lakeland terrier',
  'Lhasa apso',
  'Malamute do Alasca',
  'Maltês',
  'Mastiff',
  'Mastim napolitano',
  'Norwich terrier',
  'Old English sheepdog/Bobtail',
  'Outra raça exótica Grande Porte',
  'Outra raça exótica P/M Porte',
  'Papillon',
  'Pastor Alemão',
  'Pastor Alemão Branco',
  'Pastor Australiano',
  'Pastor Belga Groenandel',
  'Pastor Belga Lakinois',
  'Pastor Belga Malinois',
  'Pastor Belga Tervuren',
  'Pastor Branco Suíço',
  'Pastor de Brie',
  'Pastor de Shetland',
  'Pastor dos Pirineus/Cão dos pirineus',
  'Pequeno cão holandês',
  'Pequeno cão leão/Spitz alemão',
  'Pequinês',
  'Perdigueiro alemão',
  'Perdigueiro de Burgos',
  'Perdigueiro português',
  'Pinscher',
  'Pit Bull',
  'Podengo português',
  'Pointer inglês',
  'Poodle standard',
  'Poodle Toy/Microtoy',
  'Pug',
  'Puli',
  'Pumi',
  'Retriever do Labrador',
  'Rhodesian/Ridgeback',
  'Rottweiler',
  'Sabujo',
  'Saluki',
  'Samoyeda',
  'São Bernardo',
  'Schnauzer Gigante',
  'Schnauzer',
  'Scottish terrier',
  'Sealyham terrier',
  'Vira-lata / Sem Raça Definida Grande Porte',
  'Vira-lata / Sem Raça Definida P/M Porte',
  'Setter Gordon',
  'Setter inglês',
  'Setter Irlandês',
  'Shar Pei',
  'Shiba Inu',
  'Shih tzu',
  'Skye terrier',
  'Spaniel Bretão',
  'Spitz alemão',
  'Springer spaniel',
  'Staffordshire bull terrier',
  'Sussex spaniel',
  'Teckel/Daschund',
  'Terranova',
  'Terrier brasileiro de pêlo curto',
  'Terrier tibetano',
  'Tosa',
  'Toy Fox terrier',
  'Toy Manchester terrier',
  'Veadeiro Pampeano',
  'Vizsla',
  'Vulpino Italiano',
  'Weimaraner',
  'Welsh Corgi Cardigan',
  'Welsh Corgi Pembroke',
  'Welsh springer spaniel',
  'West highland white terrier (Westie)',
  'Whippet',
  'Yorkshire terrier',
  'American Bully',
  'Biewer Terrier',
];

const FLUIDOS_FLUIDOTERAPIA: Array<{ value: FluidoFluidoterapia; label: string }> = [
  { value: 'ringer_com_lactato', label: 'Ringer com lactato' },
  { value: 'solucao_fisiologica_09', label: 'Solucao fisiologica 0,9%' },
];

const CATETERES_FLUIDOTERAPIA: Array<{ value: CateterFluidoterapia; label: string }> = [
  { value: '24_amarelo', label: '24 amarelo' },
  { value: '22_azul', label: '22 azul' },
  { value: '20_rosa', label: '20 rosa' },
];

const MEMBROS_CANULADOS: Array<{ value: MembroCanuladoFluidoterapia; label: string }> = [
  { value: 'membro_anterior_esquerdo', label: 'Membro anterior esquerdo' },
  { value: 'membro_anterior_direito', label: 'Membro anterior direito' },
  { value: 'membro_posterior_direito', label: 'Membro posterior direito' },
  { value: 'membro_posterior_esquerdo', label: 'Membro posterior esquerdo' },
];

const DESAFIO_QUANTIDADE_OPCOES: Array<{ value: string; label: string }> = [
  { value: '1', label: '1 vez' },
  { value: '2', label: '2 vezes' },
  { value: '3', label: '3 vezes' },
  { value: 'livre', label: 'Livre' },
];

const FLUIDOTERAPIA_PADRAO = {
  fluido: 'ringer_com_lactato' as FluidoFluidoterapia,
  taxa_ml_kg_h: '10',
  desafio_hidrico_realizado: '0',
  desafio_quantidade: '1',
  desafio_volume_ml_kg: '10',
  desafio_tempo_min: '15',
  desafio_motivo: 'Hipotensao por hipovolemia',
};

const MPA_CONFIG = {
  sedativo: {
    titulo: 'Tranquilizante / Sedativo',
    categoria: 'pre_anestesica_sedativo' as const,
    subcategoria: 'tranquilizantes_sedativos',
  },
  opioide: {
    titulo: 'Opioide',
    categoria: 'pre_anestesica_opioide' as const,
    subcategoria: 'opioides',
  },
};

const INDUCAO_CONFIG = {
  titulo: 'Inducao',
  categoria: 'inducao' as const,
  subcategoria: 'inducao',
};

const MANUTENCAO_CONFIG = {
  titulo: 'Manutencao',
  categoria: 'manutencao' as const,
  subcategoria: 'manutencao',
};

const TRANS_CONFIG = {
  titulo: 'Medicacoes trans-anestesicas',
  categoria: 'trans_anestesica' as const,
};

const MAX_LINHAS_INDUCAO = 5;
const UNIDADE_INDUCAO_MG_KG = 'mg/kg';
const FARMACOS_INDUCAO_INALATORIOS = new Set(['isoflurano', 'sevoflurano']);
const UNIDADES_MPA_OUTRA_DOSE = ['mg/kg', 'mcg/kg'];

const TRANS_SUBCATEGORIAS = [
  { value: 'analgesia', label: 'Analgesia' },
  { value: 'vasopressores_inotropicos', label: 'Vasopressores / Inotropicos' },
  { value: 'anticolinergicos', label: 'Anticolinergicos' },
  { value: 'antiemeticos', label: 'Antiemeticos' },
  { value: 'reversores', label: 'Reversores' },
  { value: 'outros', label: 'Outros' },
] as const;

type TransSubcategoria = typeof TRANS_SUBCATEGORIAS[number]['value'];

const TRANS_SUBCATEGORIA_LABELS: Record<TransSubcategoria, string> = {
  analgesia: 'Analgesia',
  vasopressores_inotropicos: 'Vasopressores / Inotropicos',
  anticolinergicos: 'Anticolinergicos',
  antiemeticos: 'Antiemeticos',
  reversores: 'Reversores',
  outros: 'Outros',
};

interface MedicacaoBlockForm {
  id: number | null;
  subcategoria: string;
  farmaco_id: string;
  dose_id: string;
  dose_livre: string;
  unidade_livre: string;
  motivo_uso: string;
  dose_livre_tocada: boolean;
  originalPayload: MedicacaoProntuarioPayload | null;
}

interface MedicacaoSectionState {
  linhas: MedicacaoBlockForm[];
  removedIds: number[];
}

function createMedicacaoBlockForm(initial?: Partial<MedicacaoBlockForm>): MedicacaoBlockForm {
  return {
    id: initial?.id ?? null,
    subcategoria: initial?.subcategoria ?? '',
    farmaco_id: initial?.farmaco_id ?? '',
    dose_id: initial?.dose_id ?? '',
    dose_livre: initial?.dose_livre ?? '',
    unidade_livre: initial?.unidade_livre ?? '',
    motivo_uso: initial?.motivo_uso ?? '',
    dose_livre_tocada: initial?.dose_livre_tocada ?? false,
    originalPayload: initial?.originalPayload ?? null,
  };
}

const props = defineProps<{
  prontuarioId: number;
}>();

const emit = defineEmits<{
  cancel: [];
  saved: [prontuario: ProntuarioAnestesico];
}>();

const prontuario = ref<ProntuarioAnestesico | null>(null);
const loadingData = ref(false);
const loadingOptions = ref(false);
const loadingMedicacaoOptions = ref(false);
const saving = ref(false);
const error = ref<string | null>(null);
const medicacaoError = ref<string | null>(null);
const successMessage = ref<string | null>(null);
const feedbackRef = ref<HTMLElement | null>(null);

const clinicas = ref<Clinica[]>([]);
const anestesistas = ref<Profissional[]>([]);
const cirurgioes = ref<Profissional[]>([]);
const farmacosSedativo = ref<Farmaco[]>([]);
const farmacosOpioide = ref<Farmaco[]>([]);
const farmacosInducao = ref<Farmaco[]>([]);
const farmacosManutencao = ref<Farmaco[]>([]);
const farmacosTransPorSubcategoria = reactive<Record<string, Farmaco[]>>({});
const dosesPorFarmaco = reactive<Record<number, DoseFarmaco[]>>({});
const dosesLoadingPorFarmaco = reactive<Record<number, boolean>>({});

const form = reactive({
  clinica_id: '',
  nome_animal: '',
  especie: 'canina',
  raca: '',
  sexo: '',
  idade_valor: '',
  idade_unidade: 'anos',
  peso: '',
  nome_tutor: '',
  nome_procedimento: '',
  data_procedimento: '',
  cirurgiao_id: '',
  anestesista_id: '',
  observacoes_pre_anestesicas: '',
});

const mpaForm = reactive({
  sedativo: createMedicacaoBlockForm(),
  opioide: createMedicacaoBlockForm(),
});

const inducaoForm = reactive<MedicacaoSectionState>({
  linhas: [createMedicacaoBlockForm()],
  removedIds: [],
});

const manutencaoForm = reactive<MedicacaoSectionState>({
  linhas: [createMedicacaoBlockForm()],
  removedIds: [],
});

const transForm = reactive<MedicacaoSectionState>({
  linhas: [createMedicacaoBlockForm()],
  removedIds: [],
});

const fluidoterapiaForm = reactive({
  fluido: FLUIDOTERAPIA_PADRAO.fluido,
  cateter_utilizado: '',
  membro_canulado: '',
  taxa_ml_kg_h: FLUIDOTERAPIA_PADRAO.taxa_ml_kg_h,
  desafio_hidrico_realizado: FLUIDOTERAPIA_PADRAO.desafio_hidrico_realizado,
  desafio_quantidade: FLUIDOTERAPIA_PADRAO.desafio_quantidade,
  desafio_volume_ml_kg: FLUIDOTERAPIA_PADRAO.desafio_volume_ml_kg,
  desafio_tempo_min: FLUIDOTERAPIA_PADRAO.desafio_tempo_min,
  desafio_motivo: FLUIDOTERAPIA_PADRAO.desafio_motivo,
});

const fluidoterapiaId = ref<number | null>(null);
const fluidoterapiaOriginal = ref<FluidoterapiaProntuarioPayload | null>(null);
const prontuarioOriginal = ref<AtualizarProntuarioPayload | null>(null);

function getErrorMessage(err: unknown, fallback: string) {
  return err instanceof Error ? err.message : fallback;
}

function textValue(value: unknown) {
  if (value === null || typeof value === 'undefined') return '';
  return String(value).trim();
}

function trimmed(value: unknown) {
  const text = textValue(value);
  return text === '' ? null : text;
}

function optionalId(value: unknown) {
  const text = textValue(value);
  if (!text) return null;
  const id = Number(text);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function parseOptionalNumber(value: unknown) {
  const text = textValue(value);
  if (!text) return null;
  const parsed = Number(text.replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
}

function parseQuantidade(value: unknown) {
  const text = textValue(value);
  if (!text || text === 'livre') return null;

  const parsed = Number(text);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error('Quantidade do desafio deve ser 1, 2, 3 ou Livre.');
  }

  return parsed;
}

function normalizeMedicacaoFarmacoNome(nome: string) {
  return String(nome)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function isTransSubcategoria(value: string): value is TransSubcategoria {
  return Object.prototype.hasOwnProperty.call(TRANS_SUBCATEGORIA_LABELS, value);
}

function isMedicacaoInalatoria(item: MedicacaoProntuario) {
  if (!item.farmaco_nome) return false;
  if (item.categoria !== 'inducao' && item.categoria !== 'manutencao') return false;
  return FARMACOS_INDUCAO_INALATORIOS.has(normalizeMedicacaoFarmacoNome(item.farmaco_nome));
}

function getFarmacosTransCadastrados() {
  return Object.values(farmacosTransPorSubcategoria).reduce<Farmaco[]>((todos, farmacos) => todos.concat(farmacos), []);
}

function getFarmacoById(farmacoId: number) {
  const todos = [
    ...farmacosSedativo.value,
    ...farmacosOpioide.value,
    ...farmacosInducao.value,
    ...farmacosManutencao.value,
    ...getFarmacosTransCadastrados(),
  ];
  return todos.find((farmaco) => farmaco.id === farmacoId) || null;
}

function getMedicacaoFarmacos(chave: keyof typeof MPA_CONFIG | 'inducao' | 'manutencao') {
  if (chave === 'sedativo') return farmacosSedativo.value;
  if (chave === 'opioide') return farmacosOpioide.value;
  if (chave === 'manutencao') return farmacosManutencao.value;
  return farmacosInducao.value;
}

function getMedicacaoTransFarmacos(subcategoria: string) {
  if (!isTransSubcategoria(subcategoria)) return [];
  return farmacosTransPorSubcategoria[subcategoria] || [];
}

function getDosesDoFarmaco(farmacoId: number) {
  return dosesPorFarmaco[farmacoId] || [];
}

function getUnidadesOutraDoseDoFarmaco(farmacoId: number) {
  const farmaco = getFarmacoById(farmacoId);
  if (!farmaco) return [];

  const unidades = new Set<string>();
  getDosesDoFarmaco(farmacoId).forEach((dose) => {
    const unidade = textValue(dose.unidade);
    if (unidade) unidades.add(unidade);
  });

  const unidadePadrao = textValue(farmaco.unidade_padrao);
  if (unidadePadrao) unidades.add(unidadePadrao);
  return Array.from(unidades);
}

function getDosesMgKgDoFarmaco(farmacoId: number) {
  return getDosesDoFarmaco(farmacoId).filter((dose) => normalizeMedicacaoFarmacoNome(dose.unidade) === UNIDADE_INDUCAO_MG_KG);
}

function getDoseSelecionadaLabel(dose?: DoseFarmaco | null) {
  if (!dose) return '';
  const valor = typeof dose.valor === 'number' ? String(dose.valor) : String(dose.valor);
  return `${dose.rotulo} - ${valor} ${dose.unidade}`.trim();
}

function isFarmacoInalatorio(farmacoId: number) {
  const farmaco = getFarmacoById(farmacoId);
  if (!farmaco?.nome) return false;
  return FARMACOS_INDUCAO_INALATORIOS.has(normalizeMedicacaoFarmacoNome(farmaco.nome));
}

function resetMedicacaoDoseFields(formItem: MedicacaoBlockForm) {
  formItem.dose_id = '';
  formItem.dose_livre = '';
  formItem.unidade_livre = '';
  formItem.dose_livre_tocada = false;
}

async function ensureDosesForFarmaco(farmacoId: number) {
  if (!Number.isSafeInteger(farmacoId) || farmacoId <= 0) return;
  if (Object.prototype.hasOwnProperty.call(dosesPorFarmaco, farmacoId)) return;

  dosesLoadingPorFarmaco[farmacoId] = true;
  try {
    dosesPorFarmaco[farmacoId] = await listarDosesPorFarmaco(farmacoId, { ativo: true });
  } catch {
    dosesPorFarmaco[farmacoId] = [];
    throw new Error('Nao foi possivel carregar as doses do farmaco selecionado.');
  } finally {
    dosesLoadingPorFarmaco[farmacoId] = false;
  }
}

async function handleMedicacaoFarmacoSelection(formItem: MedicacaoBlockForm) {
  resetMedicacaoDoseFields(formItem);
  const farmacoId = optionalId(formItem.farmaco_id);
  if (farmacoId === null) return;
  try {
    medicacaoError.value = null;
    await ensureDosesForFarmaco(farmacoId);
  } catch (err) {
    medicacaoError.value = getErrorMessage(err, 'Nao foi possivel carregar as doses do farmaco selecionado.');
  }
}

function handleMedicacaoDoseSelection(formItem: MedicacaoBlockForm) {
  if (textValue(formItem.dose_id) !== 'outra') {
    formItem.dose_livre = '';
    formItem.unidade_livre = '';
  }
}

function handleMedicacaoDoseInput(formItem: MedicacaoBlockForm) {
  formItem.dose_livre_tocada = true;
}

function getMedicacaoPayloadFromForm(
  formItem: MedicacaoBlockForm,
  config: { categoria: MedicacaoProntuarioCategoria; subcategoria: string; titulo: string; ordem?: number },
  options: { requireDose?: boolean; unidadesOutraDose?: string[] | ((farmacoId: number) => string[]) } = {},
): MedicacaoProntuarioPayload | null {
  const farmacoId = optionalId(formItem.farmaco_id);
  if (farmacoId === null) return null;

  const payload: MedicacaoProntuarioPayload = {
    categoria: config.categoria,
    subcategoria: config.subcategoria,
    farmaco_id: farmacoId,
    dose_selecionada: null,
    dose_digitada: null,
    unidade: null,
    motivo_uso: null,
  };

  if (typeof config.ordem === 'number') {
    payload.ordem = config.ordem;
  }

  const motivoUso = trimmed(formItem.motivo_uso);
  payload.motivo_uso = motivoUso;

  const doses = getDosesDoFarmaco(farmacoId);
  const doseId = textValue(formItem.dose_id);

  if (doseId === 'outra') {
    const doseLivre = parseOptionalNumber(formItem.dose_livre);
    if (doseLivre === null || doseLivre <= 0) {
      throw new Error(`Dose livre invalida para ${config.titulo}.`);
    }

    const unidadesOutraDose = typeof options.unidadesOutraDose === 'function'
      ? options.unidadesOutraDose(farmacoId)
      : options.unidadesOutraDose || [];
    const unidadeLivre = textValue(formItem.unidade_livre);
    if (!unidadesOutraDose.length) {
      throw new Error(`Nao ha unidades cadastradas para dose livre em ${config.titulo}.`);
    }
    if (!unidadesOutraDose.includes(unidadeLivre)) {
      throw new Error(`Unidade invalida para dose livre em ${config.titulo}.`);
    }

    payload.dose_selecionada = null;
    payload.dose_digitada = doseLivre;
    payload.unidade = unidadeLivre;
    return payload;
  }

  const doseIdNumerico = optionalId(doseId);
  if (doseIdNumerico !== null) {
    const dose = doses.find((item) => item.id === doseIdNumerico);
    if (!dose) {
      throw new Error(`Dose pre-definida invalida para ${config.titulo}.`);
    }
    payload.dose_selecionada = dose.rotulo;
    payload.dose_digitada = null;
    payload.unidade = dose.unidade;
    return payload;
  }

  if (options.requireDose) {
    throw new Error(`Selecione uma dose para ${config.titulo}.`);
  }

  return payload;
}

function getInducaoPayloadFromForm(formItem: MedicacaoBlockForm): MedicacaoProntuarioPayload | null {
  const farmacoId = optionalId(formItem.farmaco_id);
  if (farmacoId === null) return null;

  const payload: MedicacaoProntuarioPayload = {
    categoria: INDUCAO_CONFIG.categoria,
    subcategoria: INDUCAO_CONFIG.subcategoria,
    farmaco_id: farmacoId,
    dose_selecionada: null,
    dose_digitada: null,
    unidade: null,
    motivo_uso: null,
  };

  const motivoUso = trimmed(formItem.motivo_uso);
  payload.motivo_uso = motivoUso;

  if (isFarmacoInalatorio(farmacoId)) {
    payload.dose_selecionada = null;
    payload.dose_digitada = null;
    payload.unidade = null;
    return payload;
  }

  const dosesMgKg = getDosesMgKgDoFarmaco(farmacoId);
  const doseId = textValue(formItem.dose_id);

  if (doseId === 'outra') {
    const doseLivre = parseOptionalNumber(formItem.dose_livre);
    if (doseLivre === null || doseLivre <= 0) {
      throw new Error('Dose livre invalida para Inducao.');
    }
    payload.dose_selecionada = null;
    payload.dose_digitada = doseLivre;
    payload.unidade = UNIDADE_INDUCAO_MG_KG;
    return payload;
  }

  const doseIdNumerico = optionalId(doseId);
  if (doseIdNumerico !== null) {
    const dose = dosesMgKg.find((item) => item.id === doseIdNumerico);
    if (!dose) {
      throw new Error('Dose pre-definida invalida para Inducao.');
    }
    payload.dose_selecionada = dose.rotulo;
    payload.dose_digitada = null;
    payload.unidade = UNIDADE_INDUCAO_MG_KG;
    return payload;
  }

  return payload;
}

function getTransPayloadFromForm(formItem: MedicacaoBlockForm): MedicacaoProntuarioPayload | null {
  const subcategoria = textValue(formItem.subcategoria);
  if (!subcategoria || !isTransSubcategoria(subcategoria)) return null;

  return getMedicacaoPayloadFromForm(
    formItem,
    {
      categoria: TRANS_CONFIG.categoria,
      subcategoria,
      titulo: TRANS_CONFIG.titulo,
    },
    {
      unidadesOutraDose: getUnidadesOutraDoseDoFarmaco,
    },
  );
}

function buildProntuarioPayload(): AtualizarProntuarioPayload {
  const especie = textValue(form.especie);
  const anestesistaId = optionalId(form.anestesista_id);
  const peso = trimmed(form.peso);
  const idadeValor = trimmed(form.idade_valor);

  const payload: AtualizarProntuarioPayload = {
    nome_animal: textValue(form.nome_animal),
    especie,
    nome_tutor: textValue(form.nome_tutor),
    nome_procedimento: textValue(form.nome_procedimento),
    data_procedimento: textValue(form.data_procedimento),
  };

  if (anestesistaId !== null) payload.anestesista_id = anestesistaId;

  const clinicaId = optionalId(form.clinica_id);
  payload.clinica_id = clinicaId;

  const cirurgiaoId = optionalId(form.cirurgiao_id);
  payload.cirurgiao_id = cirurgiaoId;

  const raca = trimmed(form.raca);
  const sexo = trimmed(form.sexo);
  const observacoes = trimmed(form.observacoes_pre_anestesicas);
  const pesoNumber = peso === null ? null : Number(peso.replace(',', '.'));

  payload.raca = raca;
  payload.sexo = sexo;
  payload.observacoes_pre_anestesicas = observacoes;
  payload.peso = pesoNumber;

  if (idadeValor !== null) {
    const idadeNumero = Number(idadeValor);
    if (Number.isSafeInteger(idadeNumero) && idadeNumero >= 1 && idadeNumero <= 30) {
      payload.idade = form.idade_unidade === 'meses'
        ? (idadeNumero === 1 ? '1 mês' : `${idadeNumero} meses`)
        : (idadeNumero === 1 ? '1 ano' : `${idadeNumero} anos`);
    }
  } else {
    payload.idade = null;
  }

  if (!payload.nome_animal || !payload.especie || !payload.nome_tutor || !payload.nome_procedimento || !payload.data_procedimento || !payload.anestesista_id) {
    throw new Error('Preencha os campos obrigatorios do prontuario.');
  }

  if (payload.especie !== 'canina' && payload.especie !== 'felina') {
    throw new Error('Selecione uma especie valida.');
  }

  if (anestesistaId === null) {
    throw new Error('Selecione um anestesista valido.');
  }

  if (peso !== null) {
    if (!Number.isFinite(Number(peso.replace(',', '.'))) || Number(peso.replace(',', '.')) <= 0) {
      throw new Error('Peso deve ser um numero maior que zero.');
    }
  }

  if (idadeValor !== null) {
    const idadeNumero = Number(idadeValor);
    if (!Number.isSafeInteger(idadeNumero) || idadeNumero < 1 || idadeNumero > 30) {
      throw new Error('Idade deve ser um numero inteiro entre 1 e 30.');
    }
  }

  return payload;
}

function parseIdadeEmForm(valor?: string | number | null) {
  const idade = textValue(valor);
  if (!idade) {
    form.idade_valor = '';
    form.idade_unidade = 'anos';
    return;
  }

  const match = idade.match(/^(\d+)\s*(ano|anos|mês|mes|meses)\b/i);
  if (!match) {
    form.idade_valor = idade;
    form.idade_unidade = 'anos';
    return;
  }

  form.idade_valor = match[1];
  form.idade_unidade = /mês|mes/i.test(match[2]) ? 'meses' : 'anos';
}

function buildMedicacaoOriginalPayload(item: MedicacaoProntuario, ordem: number): MedicacaoProntuarioPayload | null {
  if (!item.farmaco_id) return null;
  const payload: MedicacaoProntuarioPayload = {
    categoria: (item.categoria || '') as MedicacaoProntuarioCategoria,
    subcategoria: item.subcategoria || '',
    farmaco_id: item.farmaco_id,
    dose_selecionada: typeof item.dose_selecionada === 'undefined' || item.dose_selecionada === null ? null : String(item.dose_selecionada),
    dose_digitada: typeof item.dose_digitada === 'undefined' || item.dose_digitada === null ? null : Number(item.dose_digitada),
    unidade: item.unidade || null,
    motivo_uso: item.motivo_uso || null,
    ordem,
  };
  return payload;
}

function buildFluidoterapiaPayload() {
  const fluido = textValue(fluidoterapiaForm.fluido) as FluidoFluidoterapia | '';
  if (!fluido) {
    throw new Error('Selecione um fluido principal.');
  }

  const payload: FluidoterapiaProntuarioPayload = {
    fluido,
    taxa_ml_kg_h: parseOptionalNumber(fluidoterapiaForm.taxa_ml_kg_h) ?? Number(FLUIDOTERAPIA_PADRAO.taxa_ml_kg_h),
    desafio_hidrico_realizado: fluidoterapiaForm.desafio_hidrico_realizado === '1',
    cateter_utilizado: null,
    membro_canulado: null,
    desafio_volume_ml_kg: null,
    desafio_tempo_min: null,
    desafio_quantidade: null,
    desafio_motivo: null,
  };

  const cateter = textValue(fluidoterapiaForm.cateter_utilizado) as CateterFluidoterapia | '';
  if (cateter) payload.cateter_utilizado = cateter;

  const membro = textValue(fluidoterapiaForm.membro_canulado) as MembroCanuladoFluidoterapia | '';
  if (membro) payload.membro_canulado = membro;

  if (!Number.isFinite(Number(payload.taxa_ml_kg_h)) || Number(payload.taxa_ml_kg_h) < 0) {
    throw new Error('Taxa ml/kg/h deve ser um numero maior ou igual a zero.');
  }

  if (payload.desafio_hidrico_realizado) {
    const quantidade = parseQuantidade(fluidoterapiaForm.desafio_quantidade);
    if (typeof quantidade === 'undefined') {
      throw new Error('Quantidade do desafio deve ser informada.');
    }
    payload.desafio_volume_ml_kg = 10;
    payload.desafio_tempo_min = 15;
    payload.desafio_quantidade = quantidade;
    payload.desafio_motivo = FLUIDOTERAPIA_PADRAO.desafio_motivo;
  }

  return payload;
}

function isChangeEqual<T>(a: T | null, b: T | null) {
  function stableStringify(value: unknown): string {
    if (value === null || typeof value !== 'object') {
      return JSON.stringify(value);
    }

    if (Array.isArray(value)) {
      return `[${value.map((item) => stableStringify(item)).join(',')}]`;
    }

    const entries = Object.keys(value as Record<string, unknown>)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify((value as Record<string, unknown>)[key])}`);
    return `{${entries.join(',')}}`;
  }

  return stableStringify(a) === stableStringify(b);
}

function limparMedicacaoMpa(formItem: MedicacaoBlockForm) {
  formItem.farmaco_id = '';
  formItem.dose_id = '';
  formItem.dose_livre = '';
  formItem.unidade_livre = '';
  formItem.motivo_uso = '';
}

function adicionarLinhaInducao() {
  if (inducaoForm.linhas.length >= MAX_LINHAS_INDUCAO) return;
  inducaoForm.linhas.push(createMedicacaoBlockForm());
}

function removerLinhaInducao(index: number) {
  const [removida] = inducaoForm.linhas.splice(index, 1);
  if (removida?.id) inducaoForm.removedIds.push(removida.id);
  if (inducaoForm.linhas.length === 0) inducaoForm.linhas.push(createMedicacaoBlockForm());
}

function moverLinhaInducao(index: number, delta: number) {
  const alvo = index + delta;
  if (alvo < 0 || alvo >= inducaoForm.linhas.length) return;
  const [item] = inducaoForm.linhas.splice(index, 1);
  inducaoForm.linhas.splice(alvo, 0, item);
}

function adicionarLinhaManutencao() {
  manutencaoForm.linhas.push(createMedicacaoBlockForm());
}

function removerLinhaManutencao(index: number) {
  const [removida] = manutencaoForm.linhas.splice(index, 1);
  if (removida?.id) manutencaoForm.removedIds.push(removida.id);
  if (manutencaoForm.linhas.length === 0) manutencaoForm.linhas.push(createMedicacaoBlockForm());
}

function moverLinhaManutencao(index: number, delta: number) {
  const alvo = index + delta;
  if (alvo < 0 || alvo >= manutencaoForm.linhas.length) return;
  const [item] = manutencaoForm.linhas.splice(index, 1);
  manutencaoForm.linhas.splice(alvo, 0, item);
}

function adicionarLinhaTrans() {
  transForm.linhas.push(createMedicacaoBlockForm());
}

function removerLinhaTrans(index: number) {
  const [removida] = transForm.linhas.splice(index, 1);
  if (removida?.id) transForm.removedIds.push(removida.id);
  if (transForm.linhas.length === 0) transForm.linhas.push(createMedicacaoBlockForm());
}

function moverLinhaTrans(index: number, delta: number) {
  const alvo = index + delta;
  if (alvo < 0 || alvo >= transForm.linhas.length) return;
  const [item] = transForm.linhas.splice(index, 1);
  transForm.linhas.splice(alvo, 0, item);
}

function resetFluidoterapiaForm() {
  fluidoterapiaForm.fluido = FLUIDOTERAPIA_PADRAO.fluido;
  fluidoterapiaForm.cateter_utilizado = '';
  fluidoterapiaForm.membro_canulado = '';
  fluidoterapiaForm.taxa_ml_kg_h = FLUIDOTERAPIA_PADRAO.taxa_ml_kg_h;
  fluidoterapiaForm.desafio_hidrico_realizado = FLUIDOTERAPIA_PADRAO.desafio_hidrico_realizado;
  fluidoterapiaForm.desafio_quantidade = FLUIDOTERAPIA_PADRAO.desafio_quantidade;
  fluidoterapiaForm.desafio_volume_ml_kg = FLUIDOTERAPIA_PADRAO.desafio_volume_ml_kg;
  fluidoterapiaForm.desafio_tempo_min = FLUIDOTERAPIA_PADRAO.desafio_tempo_min;
  fluidoterapiaForm.desafio_motivo = FLUIDOTERAPIA_PADRAO.desafio_motivo;
  fluidoterapiaId.value = null;
  fluidoterapiaOriginal.value = null;
}

function syncFluidoterapiaForm(item?: FluidoterapiaProntuario | null) {
  if (!item) {
    resetFluidoterapiaForm();
    return;
  }

  fluidoterapiaId.value = item.id;
  fluidoterapiaForm.fluido = (item.fluido as FluidoFluidoterapia) || FLUIDOTERAPIA_PADRAO.fluido;
  fluidoterapiaForm.cateter_utilizado = item.cateter_utilizado ? String(item.cateter_utilizado) : '';
  fluidoterapiaForm.membro_canulado = item.membro_canulado ? String(item.membro_canulado) : '';
  fluidoterapiaForm.taxa_ml_kg_h = item.taxa_ml_kg_h === null || typeof item.taxa_ml_kg_h === 'undefined' ? '' : String(item.taxa_ml_kg_h);
  fluidoterapiaForm.desafio_hidrico_realizado = item.desafio_hidrico_realizado ? '1' : '0';
  fluidoterapiaForm.desafio_quantidade = item.desafio_quantidade === null || typeof item.desafio_quantidade === 'undefined' || Number(item.desafio_quantidade) === 0
    ? FLUIDOTERAPIA_PADRAO.desafio_quantidade
    : String(item.desafio_quantidade);
  fluidoterapiaForm.desafio_volume_ml_kg = item.desafio_volume_ml_kg === null || typeof item.desafio_volume_ml_kg === 'undefined'
    ? FLUIDOTERAPIA_PADRAO.desafio_volume_ml_kg
    : String(item.desafio_volume_ml_kg);
  fluidoterapiaForm.desafio_tempo_min = item.desafio_tempo_min === null || typeof item.desafio_tempo_min === 'undefined'
    ? FLUIDOTERAPIA_PADRAO.desafio_tempo_min
    : String(item.desafio_tempo_min);
  fluidoterapiaForm.desafio_motivo = item.desafio_motivo || FLUIDOTERAPIA_PADRAO.desafio_motivo;
  const original: FluidoterapiaProntuarioPayload = {
    fluido: (item.fluido as FluidoFluidoterapia) || FLUIDOTERAPIA_PADRAO.fluido,
    taxa_ml_kg_h: item.taxa_ml_kg_h === null || typeof item.taxa_ml_kg_h === 'undefined'
      ? Number(FLUIDOTERAPIA_PADRAO.taxa_ml_kg_h)
      : Number(item.taxa_ml_kg_h),
    desafio_hidrico_realizado: item.desafio_hidrico_realizado ? true : false,
    cateter_utilizado: null,
    membro_canulado: null,
    desafio_volume_ml_kg: null,
    desafio_tempo_min: null,
    desafio_quantidade: null,
    desafio_motivo: null,
  };

  if (item.cateter_utilizado) original.cateter_utilizado = item.cateter_utilizado;
  if (item.membro_canulado) original.membro_canulado = item.membro_canulado;
  if (item.desafio_hidrico_realizado) {
    original.desafio_volume_ml_kg = item.desafio_volume_ml_kg === null || typeof item.desafio_volume_ml_kg === 'undefined'
      ? null
      : Number(item.desafio_volume_ml_kg);
    original.desafio_tempo_min = item.desafio_tempo_min === null || typeof item.desafio_tempo_min === 'undefined'
      ? null
      : Number(item.desafio_tempo_min);
    original.desafio_quantidade = item.desafio_quantidade === null || typeof item.desafio_quantidade === 'undefined'
      ? null
      : Number(item.desafio_quantidade);
    original.desafio_motivo = item.desafio_motivo || null;
  }

  fluidoterapiaOriginal.value = original;
}

function mapMedicacaoParaFormulario(item: MedicacaoProntuario): MedicacaoBlockForm {
  const formItem = createMedicacaoBlockForm({
    id: item.id,
    subcategoria: item.subcategoria || '',
    farmaco_id: item.farmaco_id ? String(item.farmaco_id) : '',
    motivo_uso: item.motivo_uso || '',
    originalPayload: buildMedicacaoOriginalPayload(item, item.ordem || 0),
  });

  if (!item.farmaco_id) return formItem;
  if (isMedicacaoInalatoria(item)) return formItem;

  if (item.dose_digitada !== null && typeof item.dose_digitada !== 'undefined') {
    formItem.dose_id = 'outra';
    formItem.dose_livre = String(item.dose_digitada);
    formItem.unidade_livre = item.unidade || '';
    return formItem;
  }

  const doses = getDosesDoFarmaco(item.farmaco_id);
  const match = doses.find((dose) => String(dose.rotulo) === String(item.dose_selecionada) && String(dose.unidade) === String(item.unidade));
  if (match) {
    formItem.dose_id = String(match.id);
    return formItem;
  }

  if (item.dose_selecionada) {
    formItem.dose_id = 'outra';
    formItem.dose_livre = '';
    formItem.unidade_livre = item.unidade || '';
  }

  return formItem;
}

function preencherSecaoMedicacoes(
  destino: MedicacaoSectionState,
  itens: MedicacaoProntuario[],
  builder: (item: MedicacaoProntuario) => MedicacaoBlockForm,
) {
  destino.linhas.splice(0, destino.linhas.length, ...(itens.length > 0 ? itens.map(builder) : [createMedicacaoBlockForm()]));
  destino.removedIds.splice(0, destino.removedIds.length);
}

function isProntuarioChanged() {
  try {
    return !isChangeEqual(prontuarioOriginal.value, buildProntuarioPayload());
  } catch {
    return true;
  }
}

function currentProntuarioPayload() {
  return buildProntuarioPayload();
}

async function carregarMedicacaoOptions() {
  loadingMedicacaoOptions.value = true;
  medicacaoError.value = null;
  try {
    const consultas = [
      { titulo: MPA_CONFIG.sedativo.titulo, promise: listarFarmacosPorCategoria(MPA_CONFIG.sedativo.subcategoria) },
      { titulo: MPA_CONFIG.opioide.titulo, promise: listarFarmacosPorCategoria(MPA_CONFIG.opioide.subcategoria) },
      { titulo: INDUCAO_CONFIG.titulo, promise: listarFarmacosPorCategoria(INDUCAO_CONFIG.subcategoria) },
      { titulo: MANUTENCAO_CONFIG.titulo, promise: listarFarmacosPorCategoria(MANUTENCAO_CONFIG.subcategoria) },
      ...TRANS_SUBCATEGORIAS.map((item) => ({
        titulo: item.label,
        promise: listarFarmacosPorCategoria(item.value),
        subcategoria: item.value,
      })),
    ];
    const resultados = await Promise.allSettled(consultas.map((item) => item.promise));

    resultados.forEach((resultado, index) => {
      const consulta = consultas[index];
      const valor = resultado.status === 'fulfilled' ? resultado.value : [];

      if (index === 0) farmacosSedativo.value = valor;
      else if (index === 1) farmacosOpioide.value = valor;
      else if (index === 2) farmacosInducao.value = valor;
      else if (index === 3) farmacosManutencao.value = valor;
      else if ('subcategoria' in consulta) farmacosTransPorSubcategoria[consulta.subcategoria] = valor;
    });

    const erros = resultados
      .map((resultado, index) => (resultado.status === 'rejected' ? consultas[index].titulo : null))
      .filter((valor): valor is string => Boolean(valor));
    if (erros.length > 0) {
      medicacaoError.value = `Nao foi possivel carregar alguns catalogos de medicacao: ${erros.join(' | ')}`;
    }
  } finally {
    loadingMedicacaoOptions.value = false;
  }
}

async function carregarOpcoesBasicas() {
  loadingOptions.value = true;
  try {
    const [clinicasData, anestesistasData, cirurgioesData] = await Promise.all([
      listarClinicas(),
      listarAnestesistas(),
      listarCirurgioes(),
    ]);
    clinicas.value = clinicasData;
    anestesistas.value = anestesistasData;
    cirurgioes.value = cirurgioesData;
  } finally {
    loadingOptions.value = false;
  }
}

function fillProntuarioForm(data: ProntuarioAnestesico) {
  prontuario.value = data;
  prontuarioOriginal.value = {
    clinica_id: data.clinica_id ?? null,
    nome_animal: data.nome_animal ?? null,
    especie: data.especie ?? null,
    raca: data.raca ?? null,
    sexo: data.sexo ?? null,
    idade: data.idade === null || typeof data.idade === 'undefined' ? null : String(data.idade),
    peso: data.peso === null || typeof data.peso === 'undefined' ? null : Number(data.peso),
    nome_tutor: data.nome_tutor ?? null,
    nome_procedimento: data.nome_procedimento ?? null,
    data_procedimento: data.data_procedimento ?? null,
    cirurgiao_id: data.cirurgiao_id ?? null,
    anestesista_id: data.anestesista_id ?? null,
    observacoes_pre_anestesicas: data.observacoes_pre_anestesicas ?? null,
  };

  form.clinica_id = data.clinica_id ? String(data.clinica_id) : '';
  form.nome_animal = data.nome_animal || '';
  form.especie = data.especie || 'canina';
  form.raca = data.raca || '';
  form.sexo = data.sexo || '';
  form.nome_tutor = data.nome_tutor || '';
  form.nome_procedimento = data.nome_procedimento || '';
  form.data_procedimento = data.data_procedimento || '';
  form.cirurgiao_id = data.cirurgiao_id ? String(data.cirurgiao_id) : '';
  form.anestesista_id = data.anestesista_id ? String(data.anestesista_id) : '';
  form.observacoes_pre_anestesicas = data.observacoes_pre_anestesicas || '';
  parseIdadeEmForm(data.idade);
}

async function loadDosesForMedicacoes(itens: MedicacaoProntuario[]) {
  const farmacoIds = Array.from(new Set(itens.map((item) => item.farmaco_id).filter((id): id is number => Number.isSafeInteger(id) && id > 0)));
  let houveFalha = false;
  await Promise.all(farmacoIds.map(async (farmacoId) => {
    if (Object.prototype.hasOwnProperty.call(dosesPorFarmaco, farmacoId)) return;
    dosesLoadingPorFarmaco[farmacoId] = true;
    try {
      dosesPorFarmaco[farmacoId] = await listarDosesPorFarmaco(farmacoId, { ativo: true });
    } catch {
      dosesPorFarmaco[farmacoId] = [];
      houveFalha = true;
    } finally {
      dosesLoadingPorFarmaco[farmacoId] = false;
    }
  }));

  if (houveFalha && !medicacaoError.value) {
    medicacaoError.value = 'Nao foi possivel carregar algumas doses das medicacoes.';
  }
}

function hydrateMedicacaoForms(itens: MedicacaoProntuario[]) {
  const sedativo = itens.find((item) => item.categoria === 'pre_anestesica_sedativo') || null;
  const opioide = itens.find((item) => item.categoria === 'pre_anestesica_opioide') || null;
  if (sedativo) {
    mpaForm.sedativo = mapMedicacaoParaFormulario(sedativo);
  } else {
    mpaForm.sedativo = createMedicacaoBlockForm();
  }
  if (opioide) {
    mpaForm.opioide = mapMedicacaoParaFormulario(opioide);
  } else {
    mpaForm.opioide = createMedicacaoBlockForm();
  }

  preencherSecaoMedicacoes(
    inducaoForm,
    itens.filter((item) => item.categoria === 'inducao').sort((a, b) => (a.ordem || 0) - (b.ordem || 0) || a.id - b.id),
    mapMedicacaoParaFormulario,
  );
  preencherSecaoMedicacoes(
    manutencaoForm,
    itens.filter((item) => item.categoria === 'manutencao').sort((a, b) => (a.ordem || 0) - (b.ordem || 0) || a.id - b.id),
    mapMedicacaoParaFormulario,
  );
  preencherSecaoMedicacoes(
    transForm,
    itens.filter((item) => item.categoria === 'trans_anestesica').sort((a, b) => (a.ordem || 0) - (b.ordem || 0) || a.id - b.id),
    mapMedicacaoParaFormulario,
  );
}

async function carregarFormulario() {
  loadingData.value = true;
  error.value = null;

  try {
    const [prontuarioData, medicacoesData, fluidoterapiasData] = await Promise.all([
      buscarProntuario(props.prontuarioId),
      listarMedicacoes(props.prontuarioId),
      listarFluidoterapias(props.prontuarioId),
    ]);

    fillProntuarioForm(prontuarioData);
    await Promise.all([carregarOpcoesBasicas(), carregarMedicacaoOptions()]);
    await loadDosesForMedicacoes(medicacoesData);
    hydrateMedicacaoForms(medicacoesData);
    syncFluidoterapiaForm(fluidoterapiasData[0] || null);
  } catch (err) {
    error.value = getErrorMessage(err, 'Nao foi possivel carregar o prontuario para edicao.');
  } finally {
    loadingData.value = false;
  }
}

function collectMedicacaoOperations(
  sectionName: string,
  destino: MedicacaoSectionState,
  buildPayload: (formItem: MedicacaoBlockForm, ordem: number) => MedicacaoProntuarioPayload | null,
) {
  const erros: string[] = [];

  const processDelete = async (id: number) => {
    try {
      await removerMedicacao(props.prontuarioId, id);
    } catch (err) {
      erros.push(`${sectionName}: ${getErrorMessage(err, 'nao foi possivel remover.')}`);
    }
  };

  return {
    async run() {
      for (const id of destino.removedIds) {
        await processDelete(id);
      }

      for (const [index, formItem] of destino.linhas.entries()) {
        let payload: MedicacaoProntuarioPayload | null;
        try {
          payload = buildPayload(formItem, index + 1);
        } catch (err) {
          erros.push(`${sectionName}: ${getErrorMessage(err, 'nao foi possivel preparar.')}`);
          continue;
        }

        if (!formItem.id && payload === null) continue;
        if (formItem.id && payload === null) {
          await processDelete(formItem.id);
          continue;
        }

        if (!payload) continue;

        const original = formItem.originalPayload;
        const current = { ...payload, ordem: index + 1 };

        if (formItem.id && original && isChangeEqual(original, current)) continue;

        try {
          if (formItem.id) {
            await atualizarMedicacao(props.prontuarioId, formItem.id, current);
          } else {
            await criarMedicacao(props.prontuarioId, current);
          }
        } catch (err) {
          erros.push(`${sectionName}: ${getErrorMessage(err, 'nao foi possivel salvar.')}`);
        }
      }

      return erros;
    },
  };
}

async function saveFluidoterapia() {
  const payload = buildFluidoterapiaPayload();
  const original = fluidoterapiaOriginal.value;
  if (fluidoterapiaId.value && original && isChangeEqual(original, payload)) {
    return [];
  }

  try {
    if (fluidoterapiaId.value) {
      await atualizarFluidoterapia(props.prontuarioId, fluidoterapiaId.value, payload);
    } else {
      const created = await criarFluidoterapia(props.prontuarioId, payload);
      fluidoterapiaId.value = created.id;
    }
    return [];
  } catch (err) {
    return [`Fluidoterapia: ${getErrorMessage(err, 'nao foi possivel salvar.')}`];
  }
}

async function saveProntuario() {
  if (saving.value || loadingData.value || loadingOptions.value || loadingMedicacaoOptions.value) return;

  error.value = null;
  successMessage.value = null;

  let payload: AtualizarProntuarioPayload;
  try {
    payload = currentProntuarioPayload();
    buildFluidoterapiaPayload();
  } catch (err) {
    error.value = getErrorMessage(err, 'Nao foi possivel preparar os dados para edicao.');
    return;
  }

  saving.value = true;
  const erros: string[] = [];

  try {
    if (!isChangeEqual(prontuarioOriginal.value, payload)) {
      await atualizarProntuario(props.prontuarioId, payload);
    }
  } catch (err) {
    erros.push(`Prontuario: ${getErrorMessage(err, 'nao foi possivel atualizar.')}`);
    saving.value = false;
    error.value = erros.join(' | ');
    return;
  }

  const mpaOps = [
    {
      name: 'MPA - Tranquilizante / Sedativo',
      formItem: mpaForm.sedativo,
      config: {
        categoria: MPA_CONFIG.sedativo.categoria,
        subcategoria: MPA_CONFIG.sedativo.subcategoria,
        titulo: MPA_CONFIG.sedativo.titulo,
        ordem: 1,
      },
    },
    {
      name: 'MPA - Opioide',
      formItem: mpaForm.opioide,
      config: {
        categoria: MPA_CONFIG.opioide.categoria,
        subcategoria: MPA_CONFIG.opioide.subcategoria,
        titulo: MPA_CONFIG.opioide.titulo,
        ordem: 2,
      },
    },
  ] as const;

  for (const item of mpaOps) {
    let payloadMedicacao: MedicacaoProntuarioPayload | null;
    try {
      payloadMedicacao = getMedicacaoPayloadFromForm(item.formItem, item.config, {
        requireDose: false,
        unidadesOutraDose: UNIDADES_MPA_OUTRA_DOSE,
      });
    } catch (err) {
      erros.push(`${item.name}: ${getErrorMessage(err, 'nao foi possivel preparar.')}`);
      continue;
    }

    if (item.formItem.id && payloadMedicacao === null) {
      try {
        await removerMedicacao(props.prontuarioId, item.formItem.id);
      } catch (err) {
        erros.push(`${item.name}: ${getErrorMessage(err, 'nao foi possivel remover.')}`);
      }
      continue;
    }

    if (!payloadMedicacao) continue;
    const current = {
      ...payloadMedicacao,
      ordem: item.config.ordem,
    };
    if (item.formItem.id && item.formItem.originalPayload && isChangeEqual(item.formItem.originalPayload, current)) continue;

    try {
      if (item.formItem.id) {
        await atualizarMedicacao(props.prontuarioId, item.formItem.id, current);
      } else {
        await criarMedicacao(props.prontuarioId, current);
      }
    } catch (err) {
      erros.push(`${item.name}: ${getErrorMessage(err, 'nao foi possivel salvar.')}`);
    }
  }

  const inducaoRunner = collectMedicacaoOperations(
    'Inducao',
    inducaoForm,
    (formItem) => getInducaoPayloadFromForm(formItem),
  );
  erros.push(...await inducaoRunner.run());

  const manutencaoRunner = collectMedicacaoOperations(
    'Manutencao',
    manutencaoForm,
    (formItem, ordem) => getMedicacaoPayloadFromForm(
      formItem,
      {
        categoria: MANUTENCAO_CONFIG.categoria,
        subcategoria: MANUTENCAO_CONFIG.subcategoria,
        titulo: MANUTENCAO_CONFIG.titulo,
        ordem,
      },
      {
        unidadesOutraDose: getUnidadesOutraDoseDoFarmaco,
      },
    ),
  );
  erros.push(...await manutencaoRunner.run());

  const transRunner = collectMedicacaoOperations(
    'Medicacoes trans-anestesicas',
    transForm,
    (formItem) => getTransPayloadFromForm(formItem),
  );
  erros.push(...await transRunner.run());

  erros.push(...await saveFluidoterapia());

  if (erros.length > 0) {
    error.value = `O prontuario pode ter sido parcialmente atualizado. ${erros.join(' | ')}`;
    saving.value = false;
    return;
  }

  try {
    const refreshed = await buscarProntuario(props.prontuarioId);
    successMessage.value = 'Prontuario atualizado com sucesso.';
    emit('saved', refreshed);
  } catch (err) {
    successMessage.value = 'Prontuario atualizado com sucesso.';
    error.value = getErrorMessage(err, 'Nao foi possivel recarregar o prontuario apos a atualizacao.');
    if (prontuario.value) {
      emit('saved', prontuario.value);
    }
  } finally {
    saving.value = false;
  }
}

function confirmCancel() {
  if (saving.value) return;
  if (isProntuarioChanged()) {
    const discard = window.confirm('Ha alteracoes nao salvas. Deseja descartar as alteracoes?');
    if (!discard) return;
  }
  emit('cancel');
}

async function loadCatalogValues() {
  await carregarFormulario();
}

onMounted(() => {
  void loadCatalogValues();
});
</script>

<template>
  <main class="app-shell">
    <header class="app-header detail-header">
      <button class="secondary-action" type="button" :disabled="saving" @click="confirmCancel">Cancelar</button>
      <div>
        <p class="eyebrow">Editar prontuario</p>
        <h1>{{ prontuario?.numero_prontuario || `#${props.prontuarioId}` }}</h1>
      </div>
      <button class="primary-action" type="button" :disabled="saving || loadingData || loadingOptions || loadingMedicacaoOptions" @click="saveProntuario">
        {{ saving ? 'Salvando...' : 'Salvar' }}
      </button>
    </header>

    <section class="content-stack">
      <p v-if="loadingData || loadingOptions || loadingMedicacaoOptions" class="state-card">Carregando dados do prontuario...</p>
      <p v-if="error" ref="feedbackRef" class="state-card state-error">{{ error }}</p>
      <p v-if="medicacaoError" class="state-card state-error">{{ medicacaoError }}</p>
      <p v-if="successMessage" class="state-card state-success">{{ successMessage }}</p>

      <section class="section-block form-section">
        <div class="section-heading">
          <h2>Dados principais</h2>
        </div>

        <div class="form-grid">
          <label class="field">
            <span>Clinica</span>
            <select v-model="form.clinica_id">
              <option value="">Selecione</option>
              <option v-for="item in clinicas" :key="item.id" :value="String(item.id)">{{ item.nome }}</option>
            </select>
          </label>

          <label class="field">
            <span>Nome do animal</span>
            <input v-model="form.nome_animal" autocomplete="off" type="text" />
          </label>

          <label class="field">
            <span>Especie</span>
            <select v-model="form.especie">
              <option value="canina">Canina</option>
              <option value="felina">Felina</option>
            </select>
          </label>

          <label class="field">
            <span>Raca</span>
            <select v-model="form.raca">
              <option value="">Selecione</option>
              <option v-for="raca in RACAS" :key="raca" :value="raca">{{ raca }}</option>
            </select>
          </label>

          <label class="field">
            <span>Sexo</span>
            <select v-model="form.sexo">
              <option value="">Selecione</option>
              <option value="macho">Macho</option>
              <option value="femea">Femea</option>
            </select>
          </label>

          <label class="field">
            <span>Idade</span>
            <div class="inline-fields">
              <input v-model="form.idade_valor" autocomplete="off" inputmode="numeric" min="1" max="30" type="number" />
              <select v-model="form.idade_unidade">
                <option value="anos">Anos</option>
                <option value="meses">Meses</option>
              </select>
            </div>
          </label>

          <label class="field">
            <span>Peso</span>
            <input v-model="form.peso" autocomplete="off" inputmode="decimal" min="0" step="0.1" type="number" />
          </label>

          <label class="field">
            <span>Tutor</span>
            <input v-model="form.nome_tutor" autocomplete="off" type="text" />
          </label>

          <label class="field">
            <span>Procedimento</span>
            <input v-model="form.nome_procedimento" autocomplete="off" type="text" />
          </label>

          <label class="field">
            <span>Data do procedimento</span>
            <input v-model="form.data_procedimento" type="date" />
          </label>

          <label class="field">
            <span>Cirurgiao</span>
            <select v-model="form.cirurgiao_id">
              <option value="">Em branco</option>
              <option v-for="item in cirurgioes" :key="item.id" :value="String(item.id)">{{ item.nome_completo }}</option>
            </select>
          </label>

          <label class="field">
            <span>Anestesista</span>
            <select v-model="form.anestesista_id">
              <option value="">Selecione</option>
              <option v-for="item in anestesistas" :key="item.id" :value="String(item.id)">{{ item.nome_completo }}</option>
            </select>
          </label>

          <label class="field field-wide">
            <span>Observacoes pre-anestesicas</span>
            <textarea v-model="form.observacoes_pre_anestesicas" rows="4" />
          </label>
        </div>
      </section>

      <section class="section-block form-section">
        <div class="section-heading">
          <h2>MPA</h2>
        </div>

        <div class="form-grid">
          <article class="mini-card field-wide">
            <strong>Tranquilizante / Sedativo</strong>
            <div class="form-grid">
              <label class="field">
                <span>Farmaco</span>
                <select v-model="mpaForm.sedativo.farmaco_id" :disabled="loadingMedicacaoOptions" @change="void handleMedicacaoFarmacoSelection(mpaForm.sedativo)">
                  <option value="">Nao informar</option>
                  <option v-for="farmaco in getMedicacaoFarmacos('sedativo')" :key="farmaco.id" :value="String(farmaco.id)">{{ farmaco.nome }}</option>
                </select>
              </label>

              <label class="field">
                <span>Dose</span>
                <select v-model="mpaForm.sedativo.dose_id" :disabled="loadingMedicacaoOptions || !mpaForm.sedativo.farmaco_id" @change="handleMedicacaoDoseSelection(mpaForm.sedativo)">
                  <option value="">Nao informar</option>
                  <option v-for="dose in getDosesDoFarmaco(optionalId(mpaForm.sedativo.farmaco_id) || 0)" :key="dose.id" :value="String(dose.id)">{{ getDoseSelecionadaLabel(dose) }}</option>
                  <option value="outra">Outra dose</option>
                </select>
              </label>

              <template v-if="mpaForm.sedativo.dose_id === 'outra'">
                <label class="field">
                  <span>Dose digitada</span>
                  <input v-model="mpaForm.sedativo.dose_livre" autocomplete="off" inputmode="decimal" min="0" step="0.001" type="number" @input="handleMedicacaoDoseInput(mpaForm.sedativo)" />
                </label>
                <label class="field">
                  <span>Unidade</span>
                  <select v-model="mpaForm.sedativo.unidade_livre">
                    <option value="">Selecione</option>
                    <option v-for="item in UNIDADES_MPA_OUTRA_DOSE" :key="item" :value="item">{{ item }}</option>
                  </select>
                </label>
              </template>

              <label class="field field-wide">
                <span>Motivo de uso</span>
                <input v-model="mpaForm.sedativo.motivo_uso" autocomplete="off" type="text" />
              </label>
              <div class="form-actions field-wide">
                <button class="secondary-action" type="button" @click="limparMedicacaoMpa(mpaForm.sedativo)">Remover</button>
              </div>
            </div>
          </article>

          <article class="mini-card field-wide">
            <strong>Opioide</strong>
            <div class="form-grid">
              <label class="field">
                <span>Farmaco</span>
                <select v-model="mpaForm.opioide.farmaco_id" :disabled="loadingMedicacaoOptions" @change="void handleMedicacaoFarmacoSelection(mpaForm.opioide)">
                  <option value="">Nao informar</option>
                  <option v-for="farmaco in getMedicacaoFarmacos('opioide')" :key="farmaco.id" :value="String(farmaco.id)">{{ farmaco.nome }}</option>
                </select>
              </label>

              <label class="field">
                <span>Dose</span>
                <select v-model="mpaForm.opioide.dose_id" :disabled="loadingMedicacaoOptions || !mpaForm.opioide.farmaco_id" @change="handleMedicacaoDoseSelection(mpaForm.opioide)">
                  <option value="">Nao informar</option>
                  <option v-for="dose in getDosesDoFarmaco(optionalId(mpaForm.opioide.farmaco_id) || 0)" :key="dose.id" :value="String(dose.id)">{{ getDoseSelecionadaLabel(dose) }}</option>
                  <option value="outra">Outra dose</option>
                </select>
              </label>

              <template v-if="mpaForm.opioide.dose_id === 'outra'">
                <label class="field">
                  <span>Dose digitada</span>
                  <input v-model="mpaForm.opioide.dose_livre" autocomplete="off" inputmode="decimal" min="0" step="0.001" type="number" @input="handleMedicacaoDoseInput(mpaForm.opioide)" />
                </label>
                <label class="field">
                  <span>Unidade</span>
                  <select v-model="mpaForm.opioide.unidade_livre">
                    <option value="">Selecione</option>
                    <option v-for="item in UNIDADES_MPA_OUTRA_DOSE" :key="item" :value="item">{{ item }}</option>
                  </select>
                </label>
              </template>

              <label class="field field-wide">
                <span>Motivo de uso</span>
                <input v-model="mpaForm.opioide.motivo_uso" autocomplete="off" type="text" />
              </label>
              <div class="form-actions field-wide">
                <button class="secondary-action" type="button" @click="limparMedicacaoMpa(mpaForm.opioide)">Remover</button>
              </div>
            </div>
          </article>
        </div>
      </section>

      <section class="section-block form-section">
        <div class="section-heading">
          <h2>Inducao</h2>
          <button class="secondary-action" type="button" :disabled="loadingMedicacaoOptions || inducaoForm.linhas.length >= MAX_LINHAS_INDUCAO" @click="adicionarLinhaInducao">+ Adicionar farmaco</button>
        </div>

        <div class="form-grid">
          <article v-for="(linha, index) in inducaoForm.linhas" :key="linha.id ?? `${index}-${linha.farmaco_id}`" class="mini-card field-wide">
            <div class="section-heading">
              <h3>Farmaco {{ index + 1 }}</h3>
              <div class="header-actions">
                <button class="secondary-action" type="button" :disabled="index === 0" @click="moverLinhaInducao(index, -1)">Cima</button>
                <button class="secondary-action" type="button" :disabled="index === inducaoForm.linhas.length - 1" @click="moverLinhaInducao(index, 1)">Baixo</button>
                <button class="secondary-action" type="button" :disabled="loadingMedicacaoOptions" @click="removerLinhaInducao(index)">Remover</button>
              </div>
            </div>

            <div class="form-grid">
              <label class="field">
                <span>Farmaco</span>
                <select v-model="linha.farmaco_id" :disabled="loadingMedicacaoOptions || getMedicacaoFarmacos('inducao').length === 0" @change="void handleMedicacaoFarmacoSelection(linha)">
                  <option value="">Nao informar</option>
                  <option v-for="farmaco in getMedicacaoFarmacos('inducao')" :key="farmaco.id" :value="String(farmaco.id)">{{ farmaco.nome }}</option>
                </select>
              </label>

              <template v-if="isFarmacoInalatorio(optionalId(linha.farmaco_id) || 0)">
                <p class="form-note field-wide">Via inalatória</p>
              </template>

              <template v-else>
                <label class="field">
                  <span>Dose pre-definida</span>
                  <select v-model="linha.dose_id" :disabled="loadingMedicacaoOptions || !linha.farmaco_id" @change="handleMedicacaoDoseSelection(linha)">
                    <option value="">Nao informar</option>
                    <option v-for="dose in getDosesMgKgDoFarmaco(optionalId(linha.farmaco_id) || 0)" :key="dose.id" :value="String(dose.id)">{{ getDoseSelecionadaLabel(dose) }}</option>
                    <option value="outra">Outra dose</option>
                  </select>
                </label>

                <template v-if="linha.dose_id === 'outra'">
                  <label class="field">
                    <span>Dose digitada</span>
                    <input v-model="linha.dose_livre" autocomplete="off" inputmode="decimal" min="0" step="0.001" type="number" @input="handleMedicacaoDoseInput(linha)" />
                  </label>
                  <p class="form-note field-wide">mg/kg</p>
                </template>
              </template>

              <label class="field field-wide">
                <span>Motivo de uso</span>
                <input v-model="linha.motivo_uso" autocomplete="off" type="text" />
              </label>
            </div>
          </article>
        </div>
      </section>

      <section class="section-block form-section">
        <div class="section-heading">
          <h2>Manutencao</h2>
          <button class="secondary-action" type="button" :disabled="loadingMedicacaoOptions" @click="adicionarLinhaManutencao">+ Adicionar item</button>
        </div>

        <div class="form-grid">
          <article v-for="(linha, index) in manutencaoForm.linhas" :key="linha.id ?? `${index}-${linha.farmaco_id}`" class="mini-card field-wide">
            <div class="section-heading">
              <h3>Item {{ index + 1 }}</h3>
              <div class="header-actions">
                <button class="secondary-action" type="button" :disabled="index === 0" @click="moverLinhaManutencao(index, -1)">Cima</button>
                <button class="secondary-action" type="button" :disabled="index === manutencaoForm.linhas.length - 1" @click="moverLinhaManutencao(index, 1)">Baixo</button>
                <button class="secondary-action" type="button" :disabled="loadingMedicacaoOptions" @click="removerLinhaManutencao(index)">Remover</button>
              </div>
            </div>

            <div class="form-grid">
              <label class="field">
                <span>Farmaco</span>
                <select v-model="linha.farmaco_id" :disabled="loadingMedicacaoOptions || getMedicacaoFarmacos('manutencao').length === 0" @change="void handleMedicacaoFarmacoSelection(linha)">
                  <option value="">Nao informar</option>
                  <option v-for="farmaco in getMedicacaoFarmacos('manutencao')" :key="farmaco.id" :value="String(farmaco.id)">{{ farmaco.nome }}</option>
                </select>
              </label>

              <template v-if="isFarmacoInalatorio(optionalId(linha.farmaco_id) || 0)">
                <p class="form-note field-wide">Via inalatória</p>
              </template>

              <template v-else>
                <label class="field">
                  <span>Dose/taxa pre-definida</span>
                  <select v-model="linha.dose_id" :disabled="loadingMedicacaoOptions || !linha.farmaco_id" @change="handleMedicacaoDoseSelection(linha)">
                    <option value="">Nao informar</option>
                    <option v-for="dose in getDosesDoFarmaco(optionalId(linha.farmaco_id) || 0)" :key="dose.id" :value="String(dose.id)">{{ getDoseSelecionadaLabel(dose) }}</option>
                    <option :disabled="getUnidadesOutraDoseDoFarmaco(optionalId(linha.farmaco_id) || 0).length === 0" value="outra">Outra dose/taxa</option>
                  </select>
                </label>

                <template v-if="linha.dose_id === 'outra'">
                  <label class="field">
                    <span>Dose digitada</span>
                    <input v-model="linha.dose_livre" autocomplete="off" inputmode="decimal" min="0" step="0.001" type="number" @input="handleMedicacaoDoseInput(linha)" />
                  </label>
                  <label class="field">
                    <span>Unidade</span>
                    <select v-model="linha.unidade_livre">
                      <option value="">Selecione</option>
                      <option v-for="item in getUnidadesOutraDoseDoFarmaco(optionalId(linha.farmaco_id) || 0)" :key="item" :value="item">{{ item }}</option>
                    </select>
                  </label>
                </template>
              </template>

              <label class="field field-wide">
                <span>Motivo de uso</span>
                <input v-model="linha.motivo_uso" autocomplete="off" type="text" />
              </label>
            </div>
          </article>
        </div>
      </section>

      <section class="section-block form-section">
        <div class="section-heading">
          <h2>Medicacoes trans-anestesicas</h2>
          <button class="secondary-action" type="button" :disabled="loadingMedicacaoOptions" @click="adicionarLinhaTrans">+ Adicionar medicacao</button>
        </div>

        <div class="form-grid">
          <article v-for="(linha, index) in transForm.linhas" :key="linha.id ?? `${index}-${linha.farmaco_id}`" class="mini-card field-wide">
            <div class="section-heading">
              <h3>Medicacao {{ index + 1 }}</h3>
              <div class="header-actions">
                <button class="secondary-action" type="button" :disabled="index === 0" @click="moverLinhaTrans(index, -1)">Cima</button>
                <button class="secondary-action" type="button" :disabled="index === transForm.linhas.length - 1" @click="moverLinhaTrans(index, 1)">Baixo</button>
                <button class="secondary-action" type="button" :disabled="loadingMedicacaoOptions" @click="removerLinhaTrans(index)">Remover</button>
              </div>
            </div>

            <div class="form-grid">
              <label class="field">
                <span>Subcategoria</span>
                <select v-model="linha.subcategoria" :disabled="loadingMedicacaoOptions" @change="() => { linha.farmaco_id = ''; resetMedicacaoDoseFields(linha); }">
                  <option value="">Selecione</option>
                  <option v-for="item in TRANS_SUBCATEGORIAS" :key="item.value" :value="item.value">{{ item.label }}</option>
                </select>
              </label>

              <label class="field">
                <span>Farmaco</span>
                <select v-model="linha.farmaco_id" :disabled="loadingMedicacaoOptions || !linha.subcategoria || getMedicacaoTransFarmacos(linha.subcategoria).length === 0" @change="void handleMedicacaoFarmacoSelection(linha)">
                  <option value="">Nao informar</option>
                  <option v-for="farmaco in getMedicacaoTransFarmacos(linha.subcategoria)" :key="farmaco.id" :value="String(farmaco.id)">{{ farmaco.nome }}</option>
                </select>
              </label>

              <label class="field">
                <span>Dose/taxa pre-definida</span>
                <select v-model="linha.dose_id" :disabled="loadingMedicacaoOptions || !linha.farmaco_id" @change="handleMedicacaoDoseSelection(linha)">
                  <option value="">Nao informar</option>
                  <option v-for="dose in getDosesDoFarmaco(optionalId(linha.farmaco_id) || 0)" :key="dose.id" :value="String(dose.id)">{{ getDoseSelecionadaLabel(dose) }}</option>
                  <option :disabled="getUnidadesOutraDoseDoFarmaco(optionalId(linha.farmaco_id) || 0).length === 0" value="outra">Outra dose/taxa</option>
                </select>
              </label>

              <template v-if="linha.dose_id === 'outra'">
                <label class="field">
                  <span>Dose digitada</span>
                  <input v-model="linha.dose_livre" autocomplete="off" inputmode="decimal" min="0" step="0.001" type="number" @input="handleMedicacaoDoseInput(linha)" />
                </label>
                <label class="field">
                  <span>Unidade</span>
                  <select v-model="linha.unidade_livre">
                    <option value="">Selecione</option>
                    <option v-for="item in getUnidadesOutraDoseDoFarmaco(optionalId(linha.farmaco_id) || 0)" :key="item" :value="item">{{ item }}</option>
                  </select>
                </label>
              </template>

              <label class="field field-wide">
                <span>Motivo de uso</span>
                <input v-model="linha.motivo_uso" autocomplete="off" type="text" />
              </label>
            </div>
          </article>
        </div>
      </section>

      <section class="section-block form-section">
        <div class="section-heading">
          <h2>Fluidoterapia</h2>
        </div>

        <div class="form-grid">
          <label class="field">
            <span>Fluido principal</span>
            <select v-model="fluidoterapiaForm.fluido" required>
              <option v-for="item in FLUIDOS_FLUIDOTERAPIA" :key="item.value" :value="item.value">{{ item.label }}</option>
            </select>
          </label>

          <label class="field">
            <span>Taxa ml/kg/h</span>
            <input v-model="fluidoterapiaForm.taxa_ml_kg_h" autocomplete="off" inputmode="decimal" min="0" step="0.1" type="number" />
          </label>

          <label class="field">
            <span>Cateter utilizado</span>
            <select v-model="fluidoterapiaForm.cateter_utilizado">
              <option value="">Selecione</option>
              <option v-for="item in CATETERES_FLUIDOTERAPIA" :key="item.value" :value="item.value">{{ item.label }}</option>
            </select>
          </label>

          <label class="field">
            <span>Membro canulado</span>
            <select v-model="fluidoterapiaForm.membro_canulado">
              <option value="">Selecione</option>
              <option v-for="item in MEMBROS_CANULADOS" :key="item.value" :value="item.value">{{ item.label }}</option>
            </select>
          </label>

          <label class="field">
            <span>Teve desafio hidrico?</span>
            <select v-model="fluidoterapiaForm.desafio_hidrico_realizado">
              <option value="0">Nao</option>
              <option value="1">Sim</option>
            </select>
          </label>

          <div v-if="fluidoterapiaForm.desafio_hidrico_realizado === '1'" class="mini-card field-wide">
            <strong>Desafio hidrico / prova de carga</strong>
            <p class="form-note">10 ml/kg em 15 minutos.</p>

            <div class="form-grid">
              <label class="field">
                <span>Quantidade</span>
                <select v-model="fluidoterapiaForm.desafio_quantidade">
                  <option v-for="item in DESAFIO_QUANTIDADE_OPCOES" :key="item.value" :value="item.value">{{ item.label }}</option>
                </select>
              </label>
              <p class="form-note field-wide">Motivo padrao: Hipotensao por hipovolemia.</p>
            </div>
          </div>
        </div>
      </section>
    </section>
  </main>
</template>
