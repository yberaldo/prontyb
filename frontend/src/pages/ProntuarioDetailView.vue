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

defineEmits<{
  back: [];
}>();

interface SectionState<T> {
  data: T[];
  loading: boolean;
  error: string | null;
}

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
  const dose = item.dose_digitada || item.dose_selecionada;
  if (!dose && !item.unidade) return 'Nao informado';
  return [dose, item.unidade].filter(Boolean).join(' ');
}

onMounted(reloadAll);
</script>

<template>
  <main class="app-shell">
    <header class="app-header detail-header">
      <button class="secondary-action" type="button" @click="$emit('back')">Voltar</button>
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
          <strong>{{ item.fluido || `Fluidoterapia #${item.id}` }}</strong>
          <dl class="mini-grid">
            <InfoRow label="Taxa ml/kg/h" :value="formatValue(item.taxa_ml_kg_h)" />
            <InfoRow label="Desafio hidrico" :value="formatBoolean(item.desafio_hidrico_realizado)" />
            <InfoRow label="Volume ml/kg" :value="formatValue(item.desafio_volume_ml_kg)" />
            <InfoRow label="Tempo min" :value="formatValue(item.desafio_tempo_min)" />
            <InfoRow label="Quantidade" :value="formatValue(item.desafio_quantidade)" />
            <InfoRow label="Motivo" :value="item.desafio_motivo" />
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
