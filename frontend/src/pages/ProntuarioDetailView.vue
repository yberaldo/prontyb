<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import InfoRow from '../components/InfoRow.vue';
import ReadOnlySection from '../components/ReadOnlySection.vue';
import {
  buscarProntuario,
  listarAnexos,
  listarFluidoterapias,
  listarMedicacoes,
  listarMonitorizacoes,
} from '../api/prontuarios';
import type {
  AnexoProntuario,
  FluidoterapiaProntuario,
  MedicacaoProntuario,
  MonitorizacaoProntuario,
  ProntuarioAnestesico,
} from '../types/api';
import { formatBoolean, formatBytes, formatDate, formatDateTime, formatValue } from '../utils/format';

const props = defineProps<{
  prontuarioId: number;
}>();

const emit = defineEmits<{
  back: [];
  edit: [];
  print: [];
}>();

interface SectionState<T> {
  data: T[];
  loading: boolean;
  error: string | null;
}

const FARMACOS_INDUCAO_INALATORIOS = new Set(['isoflurano', 'sevoflurano']);

const MEDICACAO_PRE_SECOES = [
  { categoria: 'pre_anestesica_sedativo' as const, titulo: 'Tranquilizante / Sedativo' },
  { categoria: 'pre_anestesica_opioide' as const, titulo: 'Opioide' },
];

const MEDICACAO_SECOES = [
  { categoria: 'inducao' as const, titulo: 'Inducao' },
  { categoria: 'manutencao' as const, titulo: 'Manutencao' },
];

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

const prontuario = ref<ProntuarioAnestesico | null>(null);
const loadingProntuario = ref(false);
const errorProntuario = ref<string | null>(null);

const medicacoes = reactive<SectionState<MedicacaoProntuario>>({ data: [], loading: false, error: null });
const fluidoterapias = reactive<SectionState<FluidoterapiaProntuario>>({ data: [], loading: false, error: null });
const anexos = reactive<SectionState<AnexoProntuario>>({ data: [], loading: false, error: null });
const monitorizacoes = reactive<SectionState<MonitorizacaoProntuario>>({ data: [], loading: false, error: null });

function getErrorMessage(err: unknown, fallback: string) {
  return err instanceof Error ? err.message : fallback;
}

function formatFluido(value?: string | null) {
  if (value === 'ringer_com_lactato') return 'Ringer com lactato';
  if (value === 'solucao_fisiologica_09') return 'Solucao fisiologica 0,9%';
  return formatValue(value);
}

function formatCateter(value?: string | null) {
  if (value === '24_amarelo') return '24 amarelo';
  if (value === '22_azul') return '22 azul';
  if (value === '20_rosa') return '20 rosa';
  return formatValue(value);
}

function formatMembroCanulado(value?: string | null) {
  if (value === 'membro_anterior_esquerdo') return 'Membro anterior esquerdo';
  if (value === 'membro_anterior_direito') return 'Membro anterior direito';
  if (value === 'membro_posterior_direito') return 'Membro posterior direito';
  if (value === 'membro_posterior_esquerdo') return 'Membro posterior esquerdo';
  return formatValue(value);
}

function formatQuantidadeDesafio(value?: string | number | null) {
  if (value === null || typeof value === 'undefined' || value === '') return 'Livre';

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return formatValue(value);
  if (parsed === 0) return 'Livre';
  if (parsed === 1) return '1 vez';
  if (parsed === 2) return '2 vezes';
  if (parsed === 3) return '3 vezes';
  return `${parsed} vezes`;
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

function getMedicacoesPorCategoria(categoria: MedicacaoProntuario['categoria']) {
  return medicacoes.data.filter((item) => item.categoria === categoria);
}

function getMedicacoesTransPorSubcategoria(subcategoria: string) {
  if (!isTransSubcategoria(subcategoria)) {
    return [];
  }

  return medicacoes.data.filter((item) => item.categoria === 'trans_anestesica' && item.subcategoria === subcategoria);
}

function formatMedicacaoSubcategoriaLabel(subcategoria?: string | null) {
  if (!subcategoria) return 'Nao informado';
  if (subcategoria === 'tranquilizantes_sedativos') return 'Tranquilizante / Sedativo';
  if (subcategoria === 'opioides') return 'Opioide';
  if (subcategoria === 'inducao') return 'Inducao';
  if (subcategoria === 'manutencao') return 'Manutencao';
  if (isTransSubcategoria(subcategoria)) return TRANS_SUBCATEGORIA_LABELS[subcategoria];
  return subcategoria;
}

function isMedicacaoInalatoria(item: MedicacaoProntuario) {
  if (!item.farmaco_nome) return false;
  if (item.categoria !== 'inducao' && item.categoria !== 'manutencao') return false;
  return FARMACOS_INDUCAO_INALATORIOS.has(normalizeMedicacaoFarmacoNome(item.farmaco_nome));
}

function temDesafioHidrico(item?: FluidoterapiaProntuario | null) {
  const valor = item?.desafio_hidrico_realizado as unknown;
  return valor === true || valor === 1 || valor === '1';
}

async function loadProntuario() {
  loadingProntuario.value = true;
  errorProntuario.value = null;

  try {
    prontuario.value = await buscarProntuario(props.prontuarioId);
  } catch (err) {
    errorProntuario.value = getErrorMessage(err, 'Nao foi possivel carregar o prontuario.');
  } finally {
    loadingProntuario.value = false;
  }
}

async function loadMedicacoes() {
  medicacoes.loading = true;
  medicacoes.error = null;
  try {
    medicacoes.data = await listarMedicacoes(props.prontuarioId);
  } catch (err) {
    medicacoes.error = getErrorMessage(err, 'Nao foi possivel carregar as medicacoes.');
  } finally {
    medicacoes.loading = false;
  }
}

async function loadFluidoterapias() {
  fluidoterapias.loading = true;
  fluidoterapias.error = null;
  try {
    fluidoterapias.data = await listarFluidoterapias(props.prontuarioId);
  } catch (err) {
    fluidoterapias.error = getErrorMessage(err, 'Nao foi possivel carregar as fluidoterapias.');
  } finally {
    fluidoterapias.loading = false;
  }
}

async function loadAnexos() {
  anexos.loading = true;
  anexos.error = null;
  try {
    anexos.data = await listarAnexos(props.prontuarioId);
  } catch (err) {
    anexos.error = getErrorMessage(err, 'Nao foi possivel carregar os anexos.');
  } finally {
    anexos.loading = false;
  }
}

async function loadMonitorizacoes() {
  monitorizacoes.loading = true;
  monitorizacoes.error = null;
  try {
    monitorizacoes.data = await listarMonitorizacoes(props.prontuarioId);
  } catch (err) {
    monitorizacoes.error = getErrorMessage(err, 'Nao foi possivel carregar as monitorizacoes.');
  } finally {
    monitorizacoes.loading = false;
  }
}

function reloadAll() {
  void Promise.all([
    loadProntuario(),
    loadMedicacoes(),
    loadFluidoterapias(),
    loadAnexos(),
    loadMonitorizacoes(),
  ]);
}

function medicationDose(item: MedicacaoProntuario) {
  if (isMedicacaoInalatoria(item)) {
    return 'Via inalatória';
  }

  const dose = item.dose_digitada || item.dose_selecionada;
  if (!dose && !item.unidade) return 'Nao informado';
  return [dose, item.unidade].filter(Boolean).join(' ');
}

onMounted(reloadAll);
</script>

<template>
  <main class="app-shell">
    <header class="app-header detail-header">
      <button class="secondary-action" type="button" @click="emit('back')">Voltar</button>
      <div>
        <p class="eyebrow">Detalhe do prontuario</p>
        <h1>{{ prontuario?.numero_prontuario || `#${prontuarioId}` }}</h1>
      </div>
      <div class="header-actions">
        <button class="secondary-action" type="button" :disabled="loadingProntuario || !prontuario" @click="emit('edit')">
          Editar prontuario
        </button>
        <button class="secondary-action" type="button" :disabled="loadingProntuario || !prontuario" @click="emit('print')">
          Imprimir / Salvar PDF
        </button>
        <button class="primary-action" type="button" @click="reloadAll">Atualizar</button>
      </div>
    </header>

    <section class="content-stack">
      <section class="section-block">
        <div class="section-heading">
          <h2>Dados principais</h2>
        </div>

        <p v-if="loadingProntuario" class="state-text">Carregando...</p>
        <p v-else-if="errorProntuario" class="state-text state-error">{{ errorProntuario }}</p>
        <dl v-else-if="prontuario" class="detail-grid">
          <InfoRow label="Animal" :value="prontuario.nome_animal" />
          <InfoRow label="Especie" :value="prontuario.especie" />
          <InfoRow label="Raca" :value="prontuario.raca" />
          <InfoRow label="Sexo" :value="prontuario.sexo" />
          <InfoRow label="Idade" :value="formatValue(prontuario.idade)" />
          <InfoRow label="Peso" :value="formatValue(prontuario.peso)" />
          <InfoRow label="Tutor" :value="prontuario.nome_tutor" />
          <InfoRow label="Procedimento" :value="prontuario.nome_procedimento" />
          <InfoRow label="Data" :value="formatDate(prontuario.data_procedimento)" />
          <InfoRow label="Clinica" :value="prontuario.clinica_nome" />
          <InfoRow label="Anestesista" :value="prontuario.anestesista_nome" />
          <InfoRow label="Cirurgiao" :value="prontuario.cirurgiao_nome" />
          <InfoRow label="Observacoes" :value="prontuario.observacoes_pre_anestesicas" />
        </dl>
      </section>

      <ReadOnlySection
        title="Medicacoes"
        :count="medicacoes.data.length"
        :loading="medicacoes.loading"
        :error="medicacoes.error"
        :empty="medicacoes.data.length === 0"
        empty-text="Nenhuma medicacao registrada."
      >
        <div class="form-grid">
          <template v-for="secao in MEDICACAO_PRE_SECOES" :key="secao.categoria">
            <article v-if="getMedicacoesPorCategoria(secao.categoria).length > 0" class="mini-card field-wide">
              <strong>Medicacao pre-anestesica - {{ secao.titulo }}</strong>
              <div class="form-grid">
                <article v-for="item in getMedicacoesPorCategoria(secao.categoria)" :key="item.id" class="mini-card field-wide">
                  <strong>{{ item.farmaco_nome || item.subcategoria || item.categoria || `Medicacao #${item.id}` }}</strong>
                  <dl class="mini-grid">
                    <InfoRow label="Subcategoria" :value="formatMedicacaoSubcategoriaLabel(item.subcategoria)" />
                    <InfoRow label="Dose" :value="medicationDose(item)" />
                    <InfoRow label="Motivo" :value="item.motivo_uso" />
                  </dl>
                </article>
              </div>
            </article>
          </template>

          <template v-for="secao in MEDICACAO_SECOES" :key="secao.categoria">
            <article v-if="getMedicacoesPorCategoria(secao.categoria).length > 0" class="mini-card field-wide">
              <strong>{{ secao.titulo }}</strong>
              <div class="form-grid">
                <article v-for="item in getMedicacoesPorCategoria(secao.categoria)" :key="item.id" class="mini-card field-wide">
                  <strong>{{ item.farmaco_nome || item.subcategoria || item.categoria || `Medicacao #${item.id}` }}</strong>
                  <dl class="mini-grid">
                    <InfoRow label="Subcategoria" :value="formatMedicacaoSubcategoriaLabel(item.subcategoria)" />
                    <InfoRow label="Dose" :value="medicationDose(item)" />
                    <InfoRow label="Motivo" :value="item.motivo_uso" />
                  </dl>
                </article>
              </div>
            </article>
          </template>

          <article v-if="getMedicacoesPorCategoria('trans_anestesica').length > 0" class="mini-card field-wide">
            <strong>Medicacoes trans-anestesicas</strong>
            <div class="form-grid">
              <template v-for="subcategoria in TRANS_SUBCATEGORIAS" :key="subcategoria.value">
                <article v-if="getMedicacoesTransPorSubcategoria(subcategoria.value).length > 0" class="mini-card field-wide">
                  <strong>{{ subcategoria.label }}</strong>
                  <div class="form-grid">
                    <article
                      v-for="item in getMedicacoesTransPorSubcategoria(subcategoria.value)"
                      :key="item.id"
                      class="mini-card field-wide"
                    >
                      <strong>{{ item.farmaco_nome || item.subcategoria || item.categoria || `Medicacao #${item.id}` }}</strong>
                      <dl class="mini-grid">
                        <InfoRow label="Subcategoria" :value="formatMedicacaoSubcategoriaLabel(item.subcategoria)" />
                        <InfoRow label="Dose" :value="medicationDose(item)" />
                        <InfoRow label="Motivo" :value="item.motivo_uso" />
                      </dl>
                    </article>
                  </div>
                </article>
              </template>
            </div>
          </article>
        </div>
      </ReadOnlySection>

      <ReadOnlySection
        title="Fluidoterapias"
        :count="fluidoterapias.data.length"
        :loading="fluidoterapias.loading"
        :error="fluidoterapias.error"
        :empty="fluidoterapias.data.length === 0"
        empty-text="Nenhuma fluidoterapia registrada."
      >
        <article v-for="item in fluidoterapias.data" :key="item.id" class="mini-card">
          <strong>{{ formatFluido(item.fluido) }}</strong>
          <dl class="mini-grid">
            <InfoRow label="Cateter utilizado" :value="formatCateter(item.cateter_utilizado)" />
            <InfoRow label="Membro canulado" :value="formatMembroCanulado(item.membro_canulado)" />
            <InfoRow label="Taxa ml/kg/h" :value="formatValue(item.taxa_ml_kg_h)" />
            <InfoRow label="Desafio hidrico" :value="formatBoolean(item.desafio_hidrico_realizado)" />
            <template v-if="temDesafioHidrico(item)">
              <InfoRow label="Volume ml/kg" :value="formatValue(item.desafio_volume_ml_kg)" />
              <InfoRow label="Tempo min" :value="formatValue(item.desafio_tempo_min)" />
              <InfoRow label="Quantidade" :value="formatQuantidadeDesafio(item.desafio_quantidade)" />
              <InfoRow label="Motivo" :value="formatValue(item.desafio_motivo)" />
            </template>
          </dl>
        </article>
      </ReadOnlySection>

      <ReadOnlySection
        title="Anexos"
        :count="anexos.data.length"
        :loading="anexos.loading"
        :error="anexos.error"
        :empty="anexos.data.length === 0"
        empty-text="Nenhum anexo registrado."
      >
        <article v-for="item in anexos.data" :key="item.id" class="mini-card">
          <strong>{{ item.nome_arquivo || `Anexo #${item.id}` }}</strong>
          <dl class="mini-grid">
            <InfoRow label="Tipo" :value="item.tipo_anexo" />
            <InfoRow label="Mime" :value="item.mime_type" />
            <InfoRow label="Tamanho" :value="formatBytes(item.tamanho_bytes)" />
            <InfoRow label="Criado em" :value="formatDateTime(item.criado_em)" />
          </dl>
        </article>
      </ReadOnlySection>

      <ReadOnlySection
        title="Monitorizacoes"
        :count="monitorizacoes.data.length"
        :loading="monitorizacoes.loading"
        :error="monitorizacoes.error"
        :empty="monitorizacoes.data.length === 0"
        empty-text="Nenhuma monitorizacao registrada."
      >
        <article v-for="item in monitorizacoes.data" :key="item.id" class="mini-card">
          <strong>{{ item.anexo_nome_arquivo || `Monitorizacao #${item.id}` }}</strong>
          <dl class="mini-grid">
            <InfoRow label="Status" :value="item.status" />
            <InfoRow label="Tipo do anexo" :value="item.anexo_tipo_anexo" />
            <InfoRow label="Mime" :value="item.anexo_mime_type" />
            <InfoRow label="Tamanho" :value="formatBytes(item.anexo_tamanho_bytes)" />
            <InfoRow label="Criada em" :value="formatDateTime(item.criado_em)" />
          </dl>
        </article>
      </ReadOnlySection>
    </section>
  </main>
</template>
