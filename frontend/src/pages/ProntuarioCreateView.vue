<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { listarClinicas } from '../api/clinicas';
import { listarDosesPorFarmaco } from '../api/doses_farmacos';
import { listarFarmacosPorCategoria } from '../api/farmacos';
import { listarAnestesistas, listarCirurgioes } from '../api/profissionais';
import { criarFluidoterapia, criarMedicacao, criarProntuario } from '../api/prontuarios';
import type {
  Clinica,
  CriarProntuarioPayload,
  CateterFluidoterapia,
  DoseFarmaco,
  Farmaco,
  FluidoterapiaProntuarioPayload,
  FluidoFluidoterapia,
  MedicacaoProntuarioPayload,
  MembroCanuladoFluidoterapia,
  Profissional,
  ProntuarioAnestesico,
  MedicacaoProntuarioCategoria,
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
  'Bichon havanê',
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
};

const MPA_CONFIG = {
  sedativo: {
    titulo: 'Tranquilizante / Sedativo',
    categoria: 'pre_anestesica_sedativo' as const,
    subcategoria: 'tranquilizantes_sedativos',
    ordem: 1,
  },
  opioide: {
    titulo: 'Opioide',
    categoria: 'pre_anestesica_opioide' as const,
    subcategoria: 'opioides',
    ordem: 2,
  },
};

const INDUCAO_CONFIG = {
  titulo: 'Inducao',
  categoria: 'inducao' as const,
  subcategoria: 'inducao',
};

const MAX_LINHAS_INDUCAO = 5;

const UNIDADES_MPA_OUTRA_DOSE = [
  { value: 'mg/kg', label: 'mg/kg' },
  { value: 'mcg/kg', label: 'mcg/kg' },
] as const;

interface MedicacaoBlockForm {
  id: number;
  farmaco_id: string;
  dose_id: string;
  dose_livre: string;
  unidade_livre: string;
  motivo_uso: string;
}

let proximoIdMedicacaoBlock = 1;

function createMedicacaoBlockForm(): MedicacaoBlockForm {
  return {
    id: proximoIdMedicacaoBlock++,
    farmaco_id: '',
    dose_id: '',
    dose_livre: '',
    unidade_livre: '',
    motivo_uso: '',
  };
}

const emit = defineEmits<{
  back: [];
  created: [prontuario: ProntuarioAnestesico];
}>();

const form = reactive({
  clinica_id: '',
  nome_animal: '',
  especie: '',
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

const fluidoterapiaForm = reactive({
  fluido: FLUIDOTERAPIA_PADRAO.fluido,
  cateter_utilizado: '',
  membro_canulado: '',
  taxa_ml_kg_h: FLUIDOTERAPIA_PADRAO.taxa_ml_kg_h,
  desafio_hidrico_realizado: FLUIDOTERAPIA_PADRAO.desafio_hidrico_realizado,
  desafio_quantidade: FLUIDOTERAPIA_PADRAO.desafio_quantidade,
});

const medicacaoMpaForm = reactive({
  sedativo: createMedicacaoBlockForm(),
  opioide: createMedicacaoBlockForm(),
});

const medicacaoInducaoForm = reactive({
  linhas: [createMedicacaoBlockForm(), createMedicacaoBlockForm()],
});

const clinicas = ref<Clinica[]>([]);
const anestesistas = ref<Profissional[]>([]);
const cirurgioes = ref<Profissional[]>([]);
const farmacosSedativo = ref<Farmaco[]>([]);
const farmacosOpioide = ref<Farmaco[]>([]);
const farmacosInducao = ref<Farmaco[]>([]);
const loadingOptions = ref(false);
const loadingMedicacaoOptions = ref(false);
const saving = ref(false);
const finished = ref(false);
const error = ref<string | null>(null);
const successMessage = ref<string | null>(null);
const medicacaoError = ref<string | null>(null);
const feedbackRef = ref<HTMLElement | null>(null);
const dosesPorFarmaco = reactive<Record<number, DoseFarmaco[]>>({});
const dosesLoadingPorFarmaco = reactive<Record<number, boolean>>({});

function getErrorMessage(err: unknown, fallback: string) {
  return err instanceof Error ? err.message : fallback;
}

function scrollToFeedback() {
  window.setTimeout(() => {
    feedbackRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 0);
}

function setError(message: string) {
  error.value = message;
  successMessage.value = null;
  scrollToFeedback();
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

function isMedicacaoDoseOutraSelecionada(doseId: string) {
  return doseId === 'outra';
}

function parseQuantidade(value: unknown) {
  const text = textValue(value);
  if (!text || text === 'livre') return null;

  const parsed = Number(text);
  if (!Number.isInteger(parsed) || parsed < 0) {
    setError('Quantidade do desafio deve ser 1, 2, 3 ou Livre.');
    return undefined;
  }

  return parsed;
}

function getMedicacaoBlockConfig(chave: keyof typeof MPA_CONFIG) {
  return MPA_CONFIG[chave];
}

function getMedicacaoBlockForm(chave: keyof typeof MPA_CONFIG) {
  return medicacaoMpaForm[chave];
}

function getInducaoBlockForm(index: number) {
  return medicacaoInducaoForm.linhas[index];
}

function getMedicacaoFarmacos(chave: keyof typeof MPA_CONFIG | 'inducao') {
  if (chave === 'sedativo') return farmacosSedativo.value;
  if (chave === 'opioide') return farmacosOpioide.value;
  return farmacosInducao.value;
}

function getDosesDoFarmaco(farmacoId: number) {
  return dosesPorFarmaco[farmacoId] || [];
}

function getFarmacoById(farmacoId: number) {
  const todos = [...farmacosSedativo.value, ...farmacosOpioide.value, ...farmacosInducao.value];
  return todos.find((farmaco) => farmaco.id === farmacoId) || null;
}

function getUnidadesDoFarmaco(farmacoId: number) {
  const farmaco = getFarmacoById(farmacoId);
  const unidades = new Set<string>();

  if (farmaco?.unidade_padrao) {
    unidades.add(String(farmaco.unidade_padrao));
  }

  for (const dose of getDosesDoFarmaco(farmacoId)) {
    const unidade = textValue(dose.unidade);
    if (unidade) unidades.add(unidade);
  }

  return Array.from(unidades);
}

async function ensureDosesForFarmaco(farmacoId: number) {
  if (!Number.isSafeInteger(farmacoId) || farmacoId <= 0) return;
  if (Object.prototype.hasOwnProperty.call(dosesPorFarmaco, farmacoId)) return;

  dosesLoadingPorFarmaco[farmacoId] = true;
  try {
    dosesPorFarmaco[farmacoId] = await listarDosesPorFarmaco(farmacoId, { ativo: true });
  } catch (err) {
    dosesPorFarmaco[farmacoId] = [];
    throw err;
  } finally {
    dosesLoadingPorFarmaco[farmacoId] = false;
  }
}

function resetMedicacaoDoseFields(form: MedicacaoBlockForm) {
  form.dose_id = '';
  form.dose_livre = '';
  form.unidade_livre = '';
}

async function handleMedicacaoFarmacoSelection(form: MedicacaoBlockForm) {
  medicacaoError.value = null;
  resetMedicacaoDoseFields(form);

  const farmacoId = optionalId(form.farmaco_id);
  if (farmacoId === null) return;

  try {
    await ensureDosesForFarmaco(farmacoId);
  } catch (err) {
    medicacaoError.value = getErrorMessage(err, 'Nao foi possivel carregar as doses do farmaco selecionado.');
  }
}

async function handleMedicacaoFarmacoChange(chave: keyof typeof MPA_CONFIG) {
  await handleMedicacaoFarmacoSelection(getMedicacaoBlockForm(chave));
}

async function handleInducaoFarmacoChange(index: number) {
  await handleMedicacaoFarmacoSelection(getInducaoBlockForm(index));
}

function handleMedicacaoDoseSelection(form: MedicacaoBlockForm) {
  medicacaoError.value = null;
  if (!isMedicacaoDoseOutraSelecionada(form.dose_id)) {
    form.dose_livre = '';
    form.unidade_livre = '';
  }
}

function handleMedicacaoDoseChangePorChave(chave: keyof typeof MPA_CONFIG) {
  handleMedicacaoDoseSelection(getMedicacaoBlockForm(chave));
}

function handleInducaoDoseChange(index: number) {
  handleMedicacaoDoseSelection(getInducaoBlockForm(index));
}

function getDoseSelecionadaLabel(dose?: DoseFarmaco | null) {
  if (!dose) return '';
  const valor = typeof dose.valor === 'number' ? String(dose.valor) : String(dose.valor);
  return `${dose.rotulo} - ${valor} ${dose.unidade}`.trim();
}

function buildMedicacaoPayloadFromForm(
  form: MedicacaoBlockForm,
  config: { categoria: MedicacaoProntuarioCategoria; subcategoria: string; titulo: string; ordem?: number },
  options: {
    requireDose?: boolean;
    unidadesOutraDose?: string[];
  } = {},
): MedicacaoProntuarioPayload | null {
  const farmacoId = optionalId(form.farmaco_id);

  if (farmacoId === null) return null;

  const payload: MedicacaoProntuarioPayload = {
    categoria: config.categoria,
    subcategoria: config.subcategoria,
    farmaco_id: farmacoId,
  };

  if (typeof config.ordem === 'number') {
    payload.ordem = config.ordem;
  }

  const motivoUso = trimmed(form.motivo_uso);
  if (motivoUso !== null) {
    payload.motivo_uso = motivoUso;
  }

  const doses = getDosesDoFarmaco(farmacoId);
  const doseId = textValue(form.dose_id);

  if (isMedicacaoDoseOutraSelecionada(doseId)) {
    const doseLivre = parseOptionalNumber(form.dose_livre);
    if (doseLivre === null || doseLivre <= 0) {
      throw new Error(`Dose livre invalida para ${config.titulo}.`);
    }

    const unidadeLivre = textValue(form.unidade_livre);
    const unidadeValida = (options.unidadesOutraDose || []).includes(unidadeLivre);
    if ((options.unidadesOutraDose || []).length === 0) {
      throw new Error(`Nao ha unidades cadastradas para dose livre em ${config.titulo}.`);
    }
    if (!unidadeValida) {
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

function prepararMedicacoesMpaPayloads() {
  const payloads: Array<{ chave: keyof typeof MPA_CONFIG; payload: MedicacaoProntuarioPayload }> = [];

  for (const chave of ['sedativo', 'opioide'] as const) {
    const config = getMedicacaoBlockConfig(chave);
    const form = getMedicacaoBlockForm(chave);
    const payload = buildMedicacaoPayloadFromForm(form, config, {
      requireDose: false,
      unidadesOutraDose: UNIDADES_MPA_OUTRA_DOSE.map((item) => item.value),
    });
    if (payload) payloads.push({ chave, payload });
  }

  return payloads;
}

function prepararMedicacoesInducaoPayloads() {
  const payloads: Array<{ linha: number; payload: MedicacaoProntuarioPayload }> = [];

  medicacaoInducaoForm.linhas.forEach((form, index) => {
    const payload = buildMedicacaoPayloadFromForm(form, INDUCAO_CONFIG, {
      requireDose: true,
      unidadesOutraDose: getUnidadesDoFarmaco(optionalId(form.farmaco_id) || 0),
    });

    if (payload) {
      payloads.push({
        linha: index + 1,
        payload: {
          ...payload,
          ordem: payloads.length + 1,
        },
      });
    }
  });

  return payloads;
}

async function saveMedicacoes(
  prontuarioId: number,
  payloads: Array<{ rotulo: string; payload: MedicacaoProntuarioPayload }>,
) {
  if (!payloads.length) return { saved: 0, failed: 0 };

  let saved = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const item of payloads) {
    try {
      await criarMedicacao(prontuarioId, item.payload);
      saved += 1;
    } catch (err) {
      failed += 1;
      errors.push(`${item.rotulo}: ${getErrorMessage(err, 'nao foi possivel salvar.')}`);
    }
  }

  if (errors.length) {
    const message = `Falha ao salvar medicacoes: ${errors.join(' | ')}`;
    medicacaoError.value = message;
    error.value = message;
    scrollToFeedback();
  }

  return { saved, failed };
}

function buildFluidoterapiaPayload(): FluidoterapiaProntuarioPayload | null {
  const fluido = textValue(fluidoterapiaForm.fluido) as FluidoFluidoterapia | '';
  if (!fluido) {
    setError('Selecione um fluido principal para a fluidoterapia.');
    return null;
  }

  const taxa = parseOptionalNumber(fluidoterapiaForm.taxa_ml_kg_h);
  const taxaFinal = taxa === null ? Number(FLUIDOTERAPIA_PADRAO.taxa_ml_kg_h) : taxa;
  if (!Number.isFinite(taxaFinal) || taxaFinal < 0) {
    setError('Taxa ml/kg/h deve ser um numero maior ou igual a zero.');
    return null;
  }

  const desafioRealizado = fluidoterapiaForm.desafio_hidrico_realizado === '1';
  const payload: FluidoterapiaProntuarioPayload = {
    fluido,
    taxa_ml_kg_h: taxaFinal,
    desafio_hidrico_realizado: desafioRealizado,
  };

  const cateter = textValue(fluidoterapiaForm.cateter_utilizado) as CateterFluidoterapia | '';
  if (cateter) payload.cateter_utilizado = cateter;

  const membro = textValue(fluidoterapiaForm.membro_canulado) as MembroCanuladoFluidoterapia | '';
  if (membro) payload.membro_canulado = membro;

  if (desafioRealizado) {
    const quantidade = parseQuantidade(fluidoterapiaForm.desafio_quantidade);
    if (typeof quantidade === 'undefined') return null;

    payload.desafio_volume_ml_kg = 10;
    payload.desafio_tempo_min = 15;
    payload.desafio_quantidade = quantidade;
    payload.desafio_motivo = 'Hipotensao por hipovolemia';
  }

  return payload;
}

async function loadMedicacaoOptions() {
  loadingMedicacaoOptions.value = true;
  medicacaoError.value = null;

  try {
    const resultados = await Promise.allSettled([
      listarFarmacosPorCategoria(MPA_CONFIG.sedativo.subcategoria),
      listarFarmacosPorCategoria(MPA_CONFIG.opioide.subcategoria),
      listarFarmacosPorCategoria(INDUCAO_CONFIG.subcategoria),
    ]);

    const erros: string[] = [];

    if (resultados[0].status === 'fulfilled') {
      farmacosSedativo.value = resultados[0].value;
    } else {
      farmacosSedativo.value = [];
      erros.push(`${MPA_CONFIG.sedativo.titulo}: ${getErrorMessage(resultados[0].reason, 'nao foi possivel carregar.')}`);
    }

    if (resultados[1].status === 'fulfilled') {
      farmacosOpioide.value = resultados[1].value;
    } else {
      farmacosOpioide.value = [];
      erros.push(`${MPA_CONFIG.opioide.titulo}: ${getErrorMessage(resultados[1].reason, 'nao foi possivel carregar.')}`);
    }

    if (resultados[2].status === 'fulfilled') {
      farmacosInducao.value = resultados[2].value;
    } else {
      farmacosInducao.value = [];
      erros.push(`${INDUCAO_CONFIG.titulo}: ${getErrorMessage(resultados[2].reason, 'nao foi possivel carregar.')}`);
    }

    if (erros.length > 0) {
      medicacaoError.value = `Nao foi possivel carregar alguns catalogos de medicacao: ${erros.join(' | ')}`;
    }
  } catch (err) {
    medicacaoError.value = getErrorMessage(err, 'Nao foi possivel carregar os catalogos de medicacao.');
  } finally {
    loadingMedicacaoOptions.value = false;
  }
}

function buildIdade() {
  const idadeValor = trimmed(form.idade_valor);
  if (idadeValor === null) return null;

  const valor = Number(idadeValor);
  if (!Number.isSafeInteger(valor) || valor < 1 || valor > 30) {
    setError('Idade deve ser um numero inteiro entre 1 e 30.');
    return undefined;
  }

  if (form.idade_unidade === 'meses') {
    return valor === 1 ? '1 mês' : `${valor} meses`;
  }

  return valor === 1 ? '1 ano' : `${valor} anos`;
}

function buildPayload(): CriarProntuarioPayload | null {
  const required = [
    ['nome_animal', 'Nome do animal'],
    ['especie', 'Especie'],
    ['nome_tutor', 'Nome do tutor'],
    ['nome_procedimento', 'Procedimento'],
    ['data_procedimento', 'Data do procedimento'],
    ['anestesista_id', 'Anestesista'],
  ] as const;

  for (const [field, label] of required) {
    if (!textValue(form[field])) {
      setError(`${label} e obrigatorio.`);
      return null;
    }
  }

  const especie = textValue(form.especie);
  if (especie !== 'canina' && especie !== 'felina') {
    setError('Selecione uma especie valida.');
    return null;
  }

  const anestesistaId = optionalId(form.anestesista_id);
  if (anestesistaId === null) {
    setError('Selecione um anestesista valido.');
    return null;
  }

  const peso = trimmed(form.peso);
  if (peso !== null) {
    const parsed = Number(peso.replace(',', '.'));
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setError('Peso deve ser um numero maior que zero.');
      return null;
    }
  }

  const idade = buildIdade();
  if (typeof idade === 'undefined') return null;

  const payload: CriarProntuarioPayload = {
    nome_animal: textValue(form.nome_animal),
    especie,
    nome_tutor: textValue(form.nome_tutor),
    nome_procedimento: textValue(form.nome_procedimento),
    data_procedimento: textValue(form.data_procedimento),
    anestesista_id: anestesistaId,
  };

  const clinicaId = optionalId(form.clinica_id);
  const cirurgiaoId = optionalId(form.cirurgiao_id);
  const raca = trimmed(form.raca);
  const sexo = trimmed(form.sexo);
  const observacoes = trimmed(form.observacoes_pre_anestesicas);
  const pesoNumber = peso === null ? null : Number(peso.replace(',', '.'));

  if (clinicaId !== null) payload.clinica_id = clinicaId;
  if (cirurgiaoId !== null) payload.cirurgiao_id = cirurgiaoId;
  if (raca !== null) payload.raca = raca;
  if (sexo !== null) payload.sexo = sexo;
  if (idade !== null) payload.idade = idade;
  if (pesoNumber !== null) payload.peso = pesoNumber;
  if (observacoes !== null) payload.observacoes_pre_anestesicas = observacoes;

  return payload;
}

async function loadOptions() {
  loadingOptions.value = true;
  error.value = null;

  try {
    const [clinicasData, anestesistasData, cirurgioesData] = await Promise.all([
      listarClinicas(),
      listarAnestesistas(),
      listarCirurgioes(),
    ]);
    clinicas.value = clinicasData;
    anestesistas.value = anestesistasData;
    cirurgioes.value = cirurgioesData;

    if (!textValue(form.anestesista_id)) {
      const anestesistaPadrao = anestesistasData.find((profissional) => {
        const nomePadrao = profissional.nome_completo === 'Yulian Passador Beraldo';
        const funcaoValida = profissional.funcao === 'anestesista' || profissional.funcao === 'ambos';
        return nomePadrao && funcaoValida;
      });

      if (anestesistaPadrao) {
        form.anestesista_id = String(anestesistaPadrao.id);
      }
    }
  } catch (err) {
    setError(getErrorMessage(err, 'Nao foi possivel carregar as listas do formulario.'));
  } finally {
    loadingOptions.value = false;
  }
}

async function submit() {
  if (saving.value || finished.value) return;

  error.value = null;
  successMessage.value = null;
  medicacaoError.value = null;
  finished.value = false;

  let payload: CriarProntuarioPayload | null = null;
  try {
    payload = buildPayload();
  } catch (err) {
    console.error(err);
    setError('Nao foi possivel preparar os dados do prontuario. Revise os campos e tente novamente.');
    return;
  }

  if (!payload) return;

  const fluidoterapiaPayload = buildFluidoterapiaPayload();
  if (!fluidoterapiaPayload) return;

  let medicacoesPayloads: Array<{ rotulo: string; payload: MedicacaoProntuarioPayload }> = [];
  try {
    const medicacoesMpaPayloads = prepararMedicacoesMpaPayloads();
    const medicacoesInducaoPayloads = prepararMedicacoesInducaoPayloads();

    medicacoesPayloads = [
      ...medicacoesMpaPayloads.map((item) => ({
        rotulo: getMedicacaoBlockConfig(item.chave).titulo,
        payload: item.payload,
      })),
      ...medicacoesInducaoPayloads.map((item) => ({
        rotulo: `Inducao ${item.linha}`,
        payload: item.payload,
      })),
    ];
  } catch (err) {
    error.value = getErrorMessage(err, 'Nao foi possivel preparar as medicacoes.');
    medicacaoError.value = error.value;
    scrollToFeedback();
    return;
  }

  saving.value = true;
  try {
    const criado = await criarProntuario(payload);
    try {
      await criarFluidoterapia(criado.id, fluidoterapiaPayload);
      const resultadoMedicacoes = await saveMedicacoes(criado.id, medicacoesPayloads);
      finished.value = true;
      if (resultadoMedicacoes.failed > 0) {
        successMessage.value = 'Prontuario e fluidoterapia criados com sucesso. Houve falha parcial ao salvar algumas medicacoes.';
      } else if (medicacoesPayloads.length > 0) {
        successMessage.value = 'Prontuario, fluidoterapia e medicacoes criados com sucesso.';
      } else {
        successMessage.value = 'Prontuario e fluidoterapia criados com sucesso.';
      }
      scrollToFeedback();
      window.setTimeout(() => emit('created', criado), 350);
    } catch (fluidoterapiaErr) {
      finished.value = true;
      successMessage.value = 'Prontuario criado com sucesso.';
      error.value = `Fluidoterapia nao foi salva: ${getErrorMessage(
        fluidoterapiaErr,
        'Nao foi possivel salvar a fluidoterapia.',
      )}`;
      scrollToFeedback();
    }
  } catch (err) {
    setError(getErrorMessage(err, 'Nao foi possivel criar o prontuario.'));
  } finally {
    saving.value = false;
  }
}

function professionalLabel(profissional: Profissional) {
  const crmv = [profissional.crmv, profissional.uf_crmv].filter(Boolean).join('/');
  return crmv ? `${profissional.nome_completo} - CRMV ${crmv}` : profissional.nome_completo;
}

function adicionarLinhaInducao() {
  if (medicacaoInducaoForm.linhas.length >= MAX_LINHAS_INDUCAO) return;
  medicacaoInducaoForm.linhas.push(createMedicacaoBlockForm());
}

function removerLinhaInducao(index: number) {
  if (medicacaoInducaoForm.linhas.length <= 1) return;
  medicacaoInducaoForm.linhas.splice(index, 1);
}

onMounted(() => {
  void loadOptions();
  void loadMedicacaoOptions();
});
</script>

<template>
  <main class="app-shell">
    <header class="app-header detail-header">
      <button class="secondary-action" type="button" :disabled="saving || finished" @click="emit('back')">Cancelar</button>
      <div>
        <p class="eyebrow">Novo prontuario</p>
        <h1>Criar prontuario</h1>
      </div>
      <button class="primary-action" form="prontuario-create-form" type="submit" :disabled="saving || loadingOptions || finished">
        {{ saving ? 'Salvando...' : 'Salvar' }}
      </button>
    </header>

    <form id="prontuario-create-form" class="content-stack" novalidate @submit.prevent="submit">
      <p v-if="loadingOptions" class="state-card">Carregando listas do formulario...</p>
      <div v-if="error || successMessage" ref="feedbackRef">
        <p v-if="error" class="state-card state-error">{{ error }}</p>
        <p v-if="successMessage" class="state-card state-success">{{ successMessage }}</p>
      </div>

      <section class="section-block form-section">
        <div class="section-heading">
          <h2>Dados principais</h2>
        </div>

        <div class="form-grid">
          <p class="form-note field-wide">Numero gerado automaticamente ao salvar.</p>

          <label class="field">
            <span>Data do procedimento</span>
            <input v-model="form.data_procedimento" required type="date" />
          </label>

          <label class="field">
            <span>Nome do animal</span>
            <input v-model="form.nome_animal" autocomplete="off" required type="text" />
          </label>

          <label class="field">
            <span>Especie</span>
            <select v-model="form.especie" required>
              <option value="">Selecione</option>
              <option value="canina">Canina</option>
              <option value="felina">Felina</option>
            </select>
          </label>

          <label class="field">
            <span>Nome do tutor</span>
            <input v-model="form.nome_tutor" autocomplete="off" required type="text" />
          </label>

          <label class="field">
            <span>Procedimento</span>
            <input v-model="form.nome_procedimento" autocomplete="off" required type="text" />
          </label>

          <label class="field field-wide">
            <span>Anestesista</span>
            <select v-model="form.anestesista_id" :disabled="loadingOptions || anestesistas.length === 0" required>
              <option value="">Selecione</option>
              <option v-for="profissional in anestesistas" :key="profissional.id" :value="String(profissional.id)">
                {{ professionalLabel(profissional) }}
              </option>
            </select>
            <small v-if="!loadingOptions && anestesistas.length === 0">Nenhum profissional encontrado.</small>
          </label>
        </div>
      </section>

      <section class="section-block form-section">
        <div class="section-heading">
          <h2>Dados opcionais</h2>
        </div>

        <div class="form-grid">
          <label class="field">
            <span>Clinica</span>
            <select v-model="form.clinica_id" :disabled="loadingOptions || clinicas.length === 0">
              <option value="">Sem clinica</option>
              <option v-for="clinica in clinicas" :key="clinica.id" :value="String(clinica.id)">
                {{ clinica.nome }}
              </option>
            </select>
            <small v-if="!loadingOptions && clinicas.length === 0">Nenhuma clinica cadastrada.</small>
          </label>

          <label class="field">
            <span>Cirurgiao</span>
            <select v-model="form.cirurgiao_id" :disabled="loadingOptions || cirurgioes.length === 0">
              <option value="">Sem cirurgiao</option>
              <option v-for="profissional in cirurgioes" :key="profissional.id" :value="String(profissional.id)">
                {{ professionalLabel(profissional) }}
              </option>
            </select>
            <small v-if="!loadingOptions && cirurgioes.length === 0">Nenhum profissional encontrado.</small>
          </label>

          <label class="field">
            <span>Raca</span>
            <input v-model="form.raca" autocomplete="off" list="racas-lista" type="text" />
            <datalist id="racas-lista">
              <option v-for="raca in RACAS" :key="raca" :value="raca" />
            </datalist>
          </label>

          <label class="field">
            <span>Sexo</span>
            <select v-model="form.sexo">
              <option value="">Selecione</option>
              <option value="macho">Macho</option>
              <option value="femea">Fêmea</option>
            </select>
          </label>

          <label class="field">
            <span>Idade</span>
            <input v-model="form.idade_valor" autocomplete="off" inputmode="numeric" max="30" min="1" step="1" type="number" />
          </label>

          <label class="field">
            <span>Unidade da idade</span>
            <select v-model="form.idade_unidade">
              <option value="meses">Meses</option>
              <option value="anos">Anos</option>
            </select>
          </label>

          <label class="field">
            <span>Peso</span>
            <input v-model="form.peso" autocomplete="off" inputmode="decimal" min="0" step="0.001" type="number" />
          </label>

          <label class="field field-wide">
            <span>Observacoes pre-anestesicas</span>
            <textarea v-model="form.observacoes_pre_anestesicas" rows="4" />
          </label>
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
              <option v-for="item in FLUIDOS_FLUIDOTERAPIA" :key="item.value" :value="item.value">
                {{ item.label }}
              </option>
            </select>
          </label>

          <label class="field">
            <span>Taxa ml/kg/h</span>
            <input
              v-model="fluidoterapiaForm.taxa_ml_kg_h"
              autocomplete="off"
              inputmode="decimal"
              min="0"
              step="0.1"
              type="number"
            />
          </label>

          <label class="field">
            <span>Cateter utilizado</span>
            <select v-model="fluidoterapiaForm.cateter_utilizado">
              <option value="">Selecione</option>
              <option v-for="item in CATETERES_FLUIDOTERAPIA" :key="item.value" :value="item.value">
                {{ item.label }}
              </option>
            </select>
          </label>

          <label class="field">
            <span>Membro canulado</span>
            <select v-model="fluidoterapiaForm.membro_canulado">
              <option value="">Selecione</option>
              <option v-for="item in MEMBROS_CANULADOS" :key="item.value" :value="item.value">
                {{ item.label }}
              </option>
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
                  <option v-for="item in DESAFIO_QUANTIDADE_OPCOES" :key="item.value" :value="item.value">
                    {{ item.label }}
                  </option>
                </select>
              </label>

              <p class="form-note field-wide">Motivo padrao: Hipotensao por hipovolemia.</p>
            </div>
          </div>
        </div>
      </section>

      <section class="section-block form-section">
        <div class="section-heading">
          <h2>Medicacao pre-anestesica</h2>
        </div>

        <p v-if="loadingMedicacaoOptions" class="state-text">Carregando catalogos de medicacao...</p>
        <p v-if="medicacaoError" class="state-text state-error">{{ medicacaoError }}</p>

        <div class="form-grid">
          <article class="mini-card field-wide">
            <strong>Tranquilizante / Sedativo</strong>
            <div class="form-grid">
              <label class="field">
                <span>Farmaco</span>
                <select
                  v-model="medicacaoMpaForm.sedativo.farmaco_id"
                  :disabled="loadingMedicacaoOptions || getMedicacaoFarmacos('sedativo').length === 0"
                  @change="void handleMedicacaoFarmacoChange('sedativo')"
                >
                  <option value="">Nao informar</option>
                  <option v-for="farmaco in getMedicacaoFarmacos('sedativo')" :key="farmaco.id" :value="String(farmaco.id)">
                    {{ farmaco.nome }}
                  </option>
                </select>
                <small v-if="!loadingMedicacaoOptions && getMedicacaoFarmacos('sedativo').length === 0">Nenhum farmaco ativo nesta categoria.</small>
              </label>

              <label class="field">
                <span>Dose pre-definida</span>
                <select
                  v-model="medicacaoMpaForm.sedativo.dose_id"
                  :disabled="loadingMedicacaoOptions || !medicacaoMpaForm.sedativo.farmaco_id"
                  @change="handleMedicacaoDoseChangePorChave('sedativo')"
                >
                  <option value="">Nao informar</option>
                  <option
                    v-for="dose in getDosesDoFarmaco(optionalId(medicacaoMpaForm.sedativo.farmaco_id) || 0)"
                    :key="dose.id"
                    :value="String(dose.id)"
                  >
                    {{ getDoseSelecionadaLabel(dose) }}
                  </option>
                  <option value="outra">Outra dose</option>
                </select>
                <small v-if="medicacaoMpaForm.sedativo.farmaco_id && !getDosesDoFarmaco(optionalId(medicacaoMpaForm.sedativo.farmaco_id) || 0).length && !dosesLoadingPorFarmaco[optionalId(medicacaoMpaForm.sedativo.farmaco_id) || 0]">
                  Sem doses pre-definidas para este farmaco.
                </small>
                <small v-else-if="dosesLoadingPorFarmaco[optionalId(medicacaoMpaForm.sedativo.farmaco_id) || 0]">
                  Carregando doses...
                </small>
                <small v-if="medicacaoMpaForm.sedativo.dose_id === 'outra'">
                  Informe a dose e selecione mg/kg ou mcg/kg.
                </small>
              </label>

              <template v-if="medicacaoMpaForm.sedativo.dose_id === 'outra'">
                <label class="field">
                  <span>Dose digitada</span>
                  <input
                    v-model="medicacaoMpaForm.sedativo.dose_livre"
                    :disabled="loadingMedicacaoOptions"
                    autocomplete="off"
                    inputmode="decimal"
                    min="0"
                    step="0.001"
                    type="number"
                  />
                </label>

                <label class="field">
                  <span>Unidade</span>
                  <select
                    v-model="medicacaoMpaForm.sedativo.unidade_livre"
                    :disabled="loadingMedicacaoOptions"
                  >
                    <option value="">Selecione</option>
                    <option v-for="item in UNIDADES_MPA_OUTRA_DOSE" :key="item.value" :value="item.value">
                      {{ item.label }}
                    </option>
                  </select>
                </label>
              </template>
            </div>
          </article>

          <article class="mini-card field-wide">
            <strong>Opioide</strong>
            <div class="form-grid">
              <label class="field">
                <span>Farmaco</span>
                <select
                  v-model="medicacaoMpaForm.opioide.farmaco_id"
                  :disabled="loadingMedicacaoOptions || getMedicacaoFarmacos('opioide').length === 0"
                  @change="void handleMedicacaoFarmacoChange('opioide')"
                >
                  <option value="">Nao informar</option>
                  <option v-for="farmaco in getMedicacaoFarmacos('opioide')" :key="farmaco.id" :value="String(farmaco.id)">
                    {{ farmaco.nome }}
                  </option>
                </select>
                <small v-if="!loadingMedicacaoOptions && getMedicacaoFarmacos('opioide').length === 0">Nenhum farmaco ativo nesta categoria.</small>
              </label>

              <label class="field">
                <span>Dose pre-definida</span>
                <select
                  v-model="medicacaoMpaForm.opioide.dose_id"
                  :disabled="loadingMedicacaoOptions || !medicacaoMpaForm.opioide.farmaco_id"
                  @change="handleMedicacaoDoseChangePorChave('opioide')"
                >
                  <option value="">Nao informar</option>
                  <option
                    v-for="dose in getDosesDoFarmaco(optionalId(medicacaoMpaForm.opioide.farmaco_id) || 0)"
                    :key="dose.id"
                    :value="String(dose.id)"
                  >
                    {{ getDoseSelecionadaLabel(dose) }}
                  </option>
                  <option value="outra">Outra dose</option>
                </select>
                <small v-if="medicacaoMpaForm.opioide.farmaco_id && !getDosesDoFarmaco(optionalId(medicacaoMpaForm.opioide.farmaco_id) || 0).length && !dosesLoadingPorFarmaco[optionalId(medicacaoMpaForm.opioide.farmaco_id) || 0]">
                  Sem doses pre-definidas para este farmaco.
                </small>
                <small v-else-if="dosesLoadingPorFarmaco[optionalId(medicacaoMpaForm.opioide.farmaco_id) || 0]">
                  Carregando doses...
                </small>
                <small v-if="medicacaoMpaForm.opioide.dose_id === 'outra'">
                  Informe a dose e selecione mg/kg ou mcg/kg.
                </small>
              </label>

              <template v-if="medicacaoMpaForm.opioide.dose_id === 'outra'">
                <label class="field">
                  <span>Dose digitada</span>
                  <input
                    v-model="medicacaoMpaForm.opioide.dose_livre"
                    :disabled="loadingMedicacaoOptions"
                    autocomplete="off"
                    inputmode="decimal"
                    min="0"
                    step="0.001"
                    type="number"
                  />
                </label>

                <label class="field">
                  <span>Unidade</span>
                  <select
                    v-model="medicacaoMpaForm.opioide.unidade_livre"
                    :disabled="loadingMedicacaoOptions"
                  >
                    <option value="">Selecione</option>
                    <option v-for="item in UNIDADES_MPA_OUTRA_DOSE" :key="item.value" :value="item.value">
                      {{ item.label }}
                    </option>
                  </select>
                </label>
              </template>
            </div>
          </article>
        </div>
      </section>

      <section class="section-block form-section">
        <div class="section-heading">
          <h2>Inducao</h2>
          <button
            class="secondary-action"
            type="button"
            :disabled="loadingMedicacaoOptions || medicacaoInducaoForm.linhas.length >= MAX_LINHAS_INDUCAO"
            @click="adicionarLinhaInducao"
          >
            + Adicionar farmaco
          </button>
        </div>

        <p v-if="loadingMedicacaoOptions" class="state-text">Carregando catalogos de medicacao...</p>
        <p v-else-if="getMedicacaoFarmacos('inducao').length === 0" class="state-text">
          Nenhum farmaco ativo nesta categoria.
        </p>
        <p v-else class="state-text">Comece com duas linhas vazias e adicione ate 5 farmacos.</p>

        <div class="form-grid">
          <article
            v-for="(linha, index) in medicacaoInducaoForm.linhas"
            :key="linha.id"
            class="mini-card field-wide"
          >
            <div class="section-heading">
              <h3>Farmaco {{ index + 1 }}</h3>
              <button
                class="secondary-action"
                type="button"
                :disabled="medicacaoInducaoForm.linhas.length <= 1"
                @click="removerLinhaInducao(index)"
              >
                Remover
              </button>
            </div>

            <div class="form-grid">
              <label class="field">
                <span>Farmaco</span>
                <select
                  v-model="linha.farmaco_id"
                  :disabled="loadingMedicacaoOptions || getMedicacaoFarmacos('inducao').length === 0"
                  @change="void handleInducaoFarmacoChange(index)"
                >
                  <option value="">Nao informar</option>
                  <option v-for="farmaco in getMedicacaoFarmacos('inducao')" :key="farmaco.id" :value="String(farmaco.id)">
                    {{ farmaco.nome }}
                  </option>
                </select>
                <small v-if="!loadingMedicacaoOptions && getMedicacaoFarmacos('inducao').length === 0">
                  Nenhum farmaco ativo nesta categoria.
                </small>
              </label>

              <label class="field">
                <span>Dose pre-definida</span>
                <select
                  v-model="linha.dose_id"
                  :disabled="loadingMedicacaoOptions || !linha.farmaco_id"
                  @change="handleInducaoDoseChange(index)"
                >
                  <option value="">Nao informar</option>
                  <option
                    v-for="dose in getDosesDoFarmaco(optionalId(linha.farmaco_id) || 0)"
                    :key="dose.id"
                    :value="String(dose.id)"
                  >
                    {{ getDoseSelecionadaLabel(dose) }}
                  </option>
                  <option value="outra">Outra dose</option>
                </select>
                <small v-if="linha.farmaco_id && !getDosesDoFarmaco(optionalId(linha.farmaco_id) || 0).length && !dosesLoadingPorFarmaco[optionalId(linha.farmaco_id) || 0]">
                  Sem doses pre-definidas para este farmaco.
                </small>
                <small v-else-if="dosesLoadingPorFarmaco[optionalId(linha.farmaco_id) || 0]">
                  Carregando doses...
                </small>
                <small v-if="linha.dose_id === 'outra'">
                  Selecione uma unidade real do catalogo para esta dose.
                </small>
              </label>

              <template v-if="linha.dose_id === 'outra'">
                <label class="field">
                  <span>Dose digitada</span>
                  <input
                    v-model="linha.dose_livre"
                    :disabled="loadingMedicacaoOptions"
                    autocomplete="off"
                    inputmode="decimal"
                    min="0"
                    step="0.001"
                    type="number"
                  />
                </label>

                <label class="field">
                  <span>Unidade</span>
                  <select
                    v-model="linha.unidade_livre"
                    :disabled="loadingMedicacaoOptions || getUnidadesDoFarmaco(optionalId(linha.farmaco_id) || 0).length === 0"
                  >
                    <option value="">Selecione</option>
                    <option v-for="item in getUnidadesDoFarmaco(optionalId(linha.farmaco_id) || 0)" :key="item" :value="item">
                      {{ item }}
                    </option>
                  </select>
                  <small v-if="getUnidadesDoFarmaco(optionalId(linha.farmaco_id) || 0).length === 0">
                    Nenhuma unidade cadastrada para este farmaco.
                  </small>
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

      <div class="form-actions">
        <button class="secondary-action" type="button" :disabled="saving" @click="emit('back')">Voltar</button>
        <button class="primary-action" type="submit" :disabled="saving || loadingOptions || finished">
          {{ saving ? 'Salvando...' : 'Salvar' }}
        </button>
      </div>
    </form>
  </main>
</template>
