<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import InfoRow from '../components/InfoRow.vue';
import ReadOnlySection from '../components/ReadOnlySection.vue';
import {
  atualizarFluidoterapia,
  buscarProntuario,
  criarFluidoterapia,
  listarAnexos,
  listarFluidoterapias,
  listarMedicacoes,
  listarMonitorizacoes,
} from '../api/prontuarios';
import type {
  AnexoProntuario,
  FluidoterapiaProntuario,
  FluidoterapiaProntuarioPayload,
  FluidoFluidoterapia,
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
}>();

interface SectionState<T> {
  data: T[];
  loading: boolean;
  error: string | null;
}

const FLUIDOS_FLUIDOTERAPIA: Array<{ value: FluidoFluidoterapia; label: string }> = [
  { value: 'ringer_com_lactato', label: 'Ringer com lactato' },
  { value: 'solucao_fisiologica_09', label: 'Solucao fisiologica 0,9%' },
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

const prontuario = ref<ProntuarioAnestesico | null>(null);
const loadingProntuario = ref(false);
const errorProntuario = ref<string | null>(null);

const fluidoterapiaSaving = ref(false);
const fluidoterapiaError = ref<string | null>(null);
const fluidoterapiaSuccess = ref<string | null>(null);
const fluidoterapiaEditId = ref<number | null>(null);

const medicacoes = reactive<SectionState<MedicacaoProntuario>>({ data: [], loading: false, error: null });
const fluidoterapias = reactive<SectionState<FluidoterapiaProntuario>>({ data: [], loading: false, error: null });
const anexos = reactive<SectionState<AnexoProntuario>>({ data: [], loading: false, error: null });
const monitorizacoes = reactive<SectionState<MonitorizacaoProntuario>>({ data: [], loading: false, error: null });

const fluidoterapiaForm = reactive({
  ...FLUIDOTERAPIA_PADRAO,
});

function getErrorMessage(err: unknown, fallback: string) {
  return err instanceof Error ? err.message : fallback;
}

function resetFluidoterapiaForm() {
  fluidoterapiaForm.fluido = FLUIDOTERAPIA_PADRAO.fluido;
  fluidoterapiaForm.taxa_ml_kg_h = FLUIDOTERAPIA_PADRAO.taxa_ml_kg_h;
  fluidoterapiaForm.desafio_hidrico_realizado = FLUIDOTERAPIA_PADRAO.desafio_hidrico_realizado;
  fluidoterapiaForm.desafio_volume_ml_kg = FLUIDOTERAPIA_PADRAO.desafio_volume_ml_kg;
  fluidoterapiaForm.desafio_tempo_min = FLUIDOTERAPIA_PADRAO.desafio_tempo_min;
  fluidoterapiaForm.desafio_quantidade = FLUIDOTERAPIA_PADRAO.desafio_quantidade;
  fluidoterapiaForm.desafio_motivo = FLUIDOTERAPIA_PADRAO.desafio_motivo;
  fluidoterapiaEditId.value = null;
}

function syncFluidoterapiaForm(item?: FluidoterapiaProntuario | null) {
  if (!item) {
    resetFluidoterapiaForm();
    return;
  }

  fluidoterapiaEditId.value = item.id;
  fluidoterapiaForm.fluido = (item.fluido as FluidoFluidoterapia) || FLUIDOTERAPIA_PADRAO.fluido;
  fluidoterapiaForm.taxa_ml_kg_h = item.taxa_ml_kg_h === null || typeof item.taxa_ml_kg_h === 'undefined'
    ? ''
    : String(item.taxa_ml_kg_h);
  fluidoterapiaForm.desafio_hidrico_realizado = item.desafio_hidrico_realizado ? '1' : '0';
  const quantidade = item.desafio_quantidade;
  fluidoterapiaForm.desafio_quantidade = quantidade === null || typeof quantidade === 'undefined' || Number(quantidade) === 0
    ? FLUIDOTERAPIA_PADRAO.desafio_quantidade
    : String(quantidade);
  fluidoterapiaForm.desafio_volume_ml_kg = item.desafio_volume_ml_kg === null || typeof item.desafio_volume_ml_kg === 'undefined'
    ? FLUIDOTERAPIA_PADRAO.desafio_volume_ml_kg
    : String(item.desafio_volume_ml_kg);
  fluidoterapiaForm.desafio_tempo_min = item.desafio_tempo_min === null || typeof item.desafio_tempo_min === 'undefined'
    ? FLUIDOTERAPIA_PADRAO.desafio_tempo_min
    : String(item.desafio_tempo_min);
  fluidoterapiaForm.desafio_motivo = item.desafio_motivo || FLUIDOTERAPIA_PADRAO.desafio_motivo;
}

function textValue(value: unknown) {
  if (value === null || typeof value === 'undefined') return '';
  return String(value).trim();
}

function parseOptionalNumber(value: unknown) {
  const text = textValue(value);
  if (!text) return null;
  const parsed = Number(text.replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
}

function parseMandatoryPositiveNumber(value: unknown, label: string) {
  const parsed = parseOptionalNumber(value);
  if (parsed === null || parsed < 0) {
    throw new Error(`${label} deve ser um numero maior ou igual a zero.`);
  }
  return parsed;
}

function parseMandatoryPositiveInteger(value: unknown, label: string) {
  const text = textValue(value);
  const parsed = Number(text);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${label} deve ser um numero inteiro maior que zero.`);
  }
  return parsed;
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

function formatFluido(value?: string | null) {
  if (value === 'ringer_com_lactato') return 'Ringer com lactato';
  if (value === 'solucao_fisiologica_09') return 'Solucao fisiologica 0,9%';
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

function temDesafioHidrico(item?: FluidoterapiaProntuario | null) {
  return item?.desafio_hidrico_realizado === true || item?.desafio_hidrico_realizado === 1 || item?.desafio_hidrico_realizado === '1';
}

function buildFluidoterapiaPayload(): FluidoterapiaProntuarioPayload {
  const fluido = textValue(fluidoterapiaForm.fluido) as FluidoFluidoterapia | '';
  if (!fluido) {
    throw new Error('Selecione um fluido principal.');
  }

  const desafioRealizado = fluidoterapiaForm.desafio_hidrico_realizado === '1';
  const payload: FluidoterapiaProntuarioPayload = {
    fluido,
    taxa_ml_kg_h: parseOptionalNumber(fluidoterapiaForm.taxa_ml_kg_h) ?? Number(FLUIDOTERAPIA_PADRAO.taxa_ml_kg_h),
    desafio_hidrico_realizado: desafioRealizado,
  };

  if (!Number.isFinite(Number(payload.taxa_ml_kg_h)) || Number(payload.taxa_ml_kg_h) < 0) {
    throw new Error('Taxa ml/kg/h deve ser um numero maior ou igual a zero.');
  }

  if (desafioRealizado) {
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
    syncFluidoterapiaForm(fluidoterapias.data[0] || null);
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

async function submitFluidoterapia() {
  if (fluidoterapiaSaving.value || loadingProntuario.value || fluidoterapias.loading) return;

  fluidoterapiaError.value = null;
  fluidoterapiaSuccess.value = null;

  let payload: FluidoterapiaProntuarioPayload;
  try {
    payload = buildFluidoterapiaPayload();
  } catch (err) {
    fluidoterapiaError.value = getErrorMessage(err, 'Nao foi possivel preparar a fluidoterapia.');
    return;
  }

  fluidoterapiaSaving.value = true;
  try {
    const wasEditing = fluidoterapiaEditId.value !== null;
    const saved = fluidoterapiaEditId.value
      ? await atualizarFluidoterapia(props.prontuarioId, fluidoterapiaEditId.value, payload)
      : await criarFluidoterapia(props.prontuarioId, payload);

    const index = fluidoterapias.data.findIndex((item) => item.id === saved.id);
    if (index >= 0) {
      fluidoterapias.data.splice(index, 1, saved);
    } else {
      fluidoterapias.data = [saved, ...fluidoterapias.data];
    }

    syncFluidoterapiaForm(saved);
    fluidoterapiaSuccess.value = wasEditing
      ? 'Fluidoterapia atualizada com sucesso.'
      : 'Fluidoterapia registrada com sucesso.';
  } catch (err) {
    fluidoterapiaError.value = getErrorMessage(err, 'Nao foi possivel salvar a fluidoterapia.');
  } finally {
    fluidoterapiaSaving.value = false;
  }
}

function medicationDose(item: MedicacaoProntuario) {
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
      <button class="primary-action" type="button" @click="reloadAll">Atualizar</button>
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

      <section v-if="prontuario" class="section-block form-section">
        <div class="section-heading">
          <h2>Fluidoterapia</h2>
        </div>

        <p v-if="fluidoterapiaSaving" class="state-text">Salvando fluidoterapia...</p>
        <p v-if="fluidoterapias.loading" class="state-text">Carregando fluidoterapia...</p>
        <p v-if="fluidoterapiaError" class="state-text state-error">{{ fluidoterapiaError }}</p>
        <p v-if="fluidoterapiaSuccess" class="state-text state-success">{{ fluidoterapiaSuccess }}</p>

        <form class="form-grid" novalidate @submit.prevent="submitFluidoterapia">
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

          <div class="form-actions field-wide">
            <button class="secondary-action" type="button" :disabled="fluidoterapiaSaving || fluidoterapias.loading" @click="syncFluidoterapiaForm(fluidoterapias.data[0] || null)">
              Reverter
            </button>
            <button class="primary-action" type="submit" :disabled="fluidoterapiaSaving || loadingProntuario || fluidoterapias.loading">
              {{ fluidoterapiaSaving ? 'Salvando...' : (fluidoterapiaEditId ? 'Atualizar' : 'Salvar') }}
            </button>
          </div>
        </form>
      </section>

      <ReadOnlySection
        title="Medicacoes"
        :count="medicacoes.data.length"
        :loading="medicacoes.loading"
        :error="medicacoes.error"
        :empty="medicacoes.data.length === 0"
        empty-text="Nenhuma medicacao registrada."
      >
        <article v-for="item in medicacoes.data" :key="item.id" class="mini-card">
          <strong>{{ item.farmaco_nome || item.subcategoria || item.categoria || `Medicacao #${item.id}` }}</strong>
          <dl class="mini-grid">
            <InfoRow label="Categoria" :value="item.categoria" />
            <InfoRow label="Subcategoria" :value="item.subcategoria" />
            <InfoRow label="Dose" :value="medicationDose(item)" />
            <InfoRow label="Motivo" :value="item.motivo_uso" />
          </dl>
        </article>
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
            <InfoRow label="Taxa ml/kg/h" :value="formatValue(item.taxa_ml_kg_h)" />
            <template v-if="temDesafioHidrico(item)">
              <InfoRow label="Desafio hidrico" :value="formatBoolean(item.desafio_hidrico_realizado)" />
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
