<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import MonitorizacaoTable from '../components/MonitorizacaoTable.vue';
import {
  buscarProntuario,
  listarFluidoterapias,
  listarLinhasMonitorizacao,
  listarMedicacoes,
  listarMonitorizacoesRevisadas,
} from '../api/prontuarios';
import type {
  FluidoterapiaProntuario,
  MedicacaoProntuario,
  MedicacaoProntuarioCategoria,
  MonitorizacaoLinha,
  MonitorizacaoProntuario,
  ProntuarioAnestesico,
  ProntuarioProfissional,
} from '../types/api';
import { formatDate } from '../utils/format';

const props = defineProps<{
  prontuarioId: number;
}>();

const emit = defineEmits<{
  back: [];
}>();

const FARMACOS_INALATORIOS = new Set(['isoflurano', 'sevoflurano']);

const TRANS_SUBCATEGORIAS = [
  { value: 'analgesia', label: 'Analgesia' },
  { value: 'vasopressores_inotropicos', label: 'Vasopressores / Inotropicos' },
  { value: 'anticolinergicos', label: 'Anticolinergicos' },
  { value: 'antiemeticos', label: 'Antiemeticos' },
  { value: 'reversores', label: 'Reversores' },
  { value: 'outros', label: 'Outros' },
] as const;

const prontuario = ref<ProntuarioAnestesico | null>(null);
const medicacoes = ref<MedicacaoProntuario[]>([]);
const fluidoterapias = ref<FluidoterapiaProntuario[]>([]);
interface MonitorizacaoParaImpressao {
  monitorizacao: MonitorizacaoProntuario;
  linhas: MonitorizacaoLinha[];
}

const monitorizacoes = ref<MonitorizacaoParaImpressao[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);
let tituloOriginal: string | null = null;

function getErrorMessage(err: unknown) {
  return err instanceof Error ? err.message : 'Nao foi possivel carregar o prontuario para impressao.';
}

function hasContent(value?: string | number | null) {
  return value !== null && typeof value !== 'undefined' && String(value).trim() !== '';
}

function nomeClinica(record: ProntuarioAnestesico) {
  return record.clinica_nome || record.clinica?.nome || null;
}

function nomeProfissional(
  nomePlano: string | null | undefined,
  profissional: ProntuarioProfissional | null | undefined,
) {
  return nomePlano || profissional?.nome || null;
}

function normalizeFarmacoNome(nome: string) {
  return nome
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function isInalatoria(item: MedicacaoProntuario) {
  return (
    (item.categoria === 'inducao' || item.categoria === 'manutencao')
    && hasContent(item.farmaco_nome)
    && FARMACOS_INALATORIOS.has(normalizeFarmacoNome(item.farmaco_nome || ''))
  );
}

function doseMedicacao(item: MedicacaoProntuario) {
  if (isInalatoria(item)) return 'Via inalatoria';

  const dose = hasContent(item.dose_digitada) ? item.dose_digitada : item.dose_selecionada;
  return [dose, item.unidade].filter(hasContent).join(' ');
}

function medicacoesPorCategoria(categoria: MedicacaoProntuarioCategoria) {
  return medicacoes.value.filter((item) => item.categoria === categoria);
}

function medicacoesTrans(subcategoria: string) {
  return medicacoes.value.filter(
    (item) => item.categoria === 'trans_anestesica' && item.subcategoria === subcategoria,
  );
}

function formatFluido(value?: string | null) {
  if (value === 'ringer_com_lactato') return 'Ringer com lactato';
  if (value === 'solucao_fisiologica_09') return 'Solucao fisiologica 0,9%';
  return value || null;
}

function formatCateter(value?: string | null) {
  if (value === '24_amarelo') return '24 amarelo';
  if (value === '22_azul') return '22 azul';
  if (value === '20_rosa') return '20 rosa';
  return value || null;
}

function formatMembro(value?: string | null) {
  const membros: Record<string, string> = {
    membro_anterior_esquerdo: 'Membro anterior esquerdo',
    membro_anterior_direito: 'Membro anterior direito',
    membro_posterior_direito: 'Membro posterior direito',
    membro_posterior_esquerdo: 'Membro posterior esquerdo',
  };
  return value ? membros[value] || value : null;
}

function desafioRealizado(item: FluidoterapiaProntuario) {
  return item.desafio_hidrico_realizado === true || item.desafio_hidrico_realizado === 1 || item.desafio_hidrico_realizado === '1';
}

function formatQuantidadeDesafio(value?: string | number | null) {
  if (!hasContent(value) || Number(value) === 0) return 'Livre';
  const quantidade = Number(value);
  if (!Number.isFinite(quantidade)) return String(value);
  return quantidade === 1 ? '1 vez' : `${quantidade} vezes`;
}

const clinica = computed(() => (prontuario.value ? nomeClinica(prontuario.value) : null));
const anestesista = computed(() => (
  prontuario.value ? nomeProfissional(prontuario.value.anestesista_nome, prontuario.value.anestesista) : null
));
const cirurgiao = computed(() => (
  prontuario.value ? nomeProfissional(prontuario.value.cirurgiao_nome, prontuario.value.cirurgiao) : null
));
const medicacaoPre = computed(() => [
  { titulo: 'Tranquilizante / Sedativo', itens: medicacoesPorCategoria('pre_anestesica_sedativo') },
  { titulo: 'Opioide', itens: medicacoesPorCategoria('pre_anestesica_opioide') },
].filter((secao) => secao.itens.length > 0));
const inducao = computed(() => medicacoesPorCategoria('inducao'));
const manutencao = computed(() => medicacoesPorCategoria('manutencao'));
const transAnestesicas = computed(() => TRANS_SUBCATEGORIAS.map((subcategoria) => ({
  ...subcategoria,
  itens: medicacoesTrans(subcategoria.value),
})).filter((secao) => secao.itens.length > 0));

function datasMonitorizacao(linhas: MonitorizacaoLinha[]) {
  const datas = [...new Set(linhas.map((linha) => linha.data_medicao).filter((data): data is string => Boolean(data)))];
  return datas.map(formatDate).join(', ');
}

async function load() {
  loading.value = true;
  error.value = null;

  try {
    const [dadosProntuario, dadosMedicacoes, dadosFluidoterapias, dadosMonitorizacoes] = await Promise.all([
      buscarProntuario(props.prontuarioId),
      listarMedicacoes(props.prontuarioId),
      listarFluidoterapias(props.prontuarioId),
      listarMonitorizacoesRevisadas(props.prontuarioId),
    ]);
    prontuario.value = dadosProntuario;
    medicacoes.value = dadosMedicacoes;
    fluidoterapias.value = dadosFluidoterapias;
    monitorizacoes.value = await Promise.all(dadosMonitorizacoes.map(async (monitorizacao) => ({
      monitorizacao,
      linhas: await listarLinhasMonitorizacao(props.prontuarioId, monitorizacao.id),
    })));
  } catch (err) {
    error.value = getErrorMessage(err);
  } finally {
    loading.value = false;
  }
}

function restaurarTitulo() {
  if (tituloOriginal === null) return;
  document.title = tituloOriginal;
  tituloOriginal = null;
}

function imprimir() {
  if (!prontuario.value || loading.value) return;
  tituloOriginal = document.title;
  document.title = `prontuario-anestesico-${props.prontuarioId}`;
  window.addEventListener('afterprint', restaurarTitulo, { once: true });
  window.print();
}

onMounted(() => {
  void load();
});

onBeforeUnmount(restaurarTitulo);
</script>

<template>
  <main class="print-page">
    <div class="print-actions">
      <button class="secondary-action" type="button" @click="emit('back')">Voltar</button>
      <div class="print-actions__right">
        <button class="primary-action" type="button" :disabled="loading || !prontuario" @click="imprimir">
          Imprimir / Salvar PDF
        </button>
      </div>
    </div>

    <p v-if="loading" class="state-card">Carregando prontuario para impressao...</p>
    <section v-else-if="error" class="state-card">
      <p class="state-error">{{ error }}</p>
      <button class="secondary-action" type="button" @click="load">Tentar novamente</button>
    </section>

    <article v-else-if="prontuario" class="print-document">
      <header class="print-document-header">
        <p v-if="clinica" class="print-clinic-name">{{ clinica }}</p>
        <h1>Prontuario anestesico</h1>
        <p>{{ prontuario.numero_prontuario || 'Prontuario sem numero' }} - {{ formatDate(prontuario.data_procedimento) }}</p>
      </header>

      <section class="print-section">
        <h2>Identificacao</h2>
        <dl class="print-data-grid">
          <div v-if="hasContent(prontuario.nome_animal)"><dt>Animal</dt><dd>{{ prontuario.nome_animal }}</dd></div>
          <div v-if="hasContent(prontuario.especie)"><dt>Especie</dt><dd>{{ prontuario.especie }}</dd></div>
          <div v-if="hasContent(prontuario.raca)"><dt>Raca</dt><dd>{{ prontuario.raca }}</dd></div>
          <div v-if="hasContent(prontuario.sexo)"><dt>Sexo</dt><dd>{{ prontuario.sexo }}</dd></div>
          <div v-if="hasContent(prontuario.idade)"><dt>Idade</dt><dd>{{ prontuario.idade }}</dd></div>
          <div v-if="hasContent(prontuario.peso)"><dt>Peso</dt><dd>{{ prontuario.peso }}</dd></div>
          <div v-if="hasContent(prontuario.nome_tutor)"><dt>Tutor</dt><dd>{{ prontuario.nome_tutor }}</dd></div>
        </dl>
      </section>

      <section class="print-section">
        <h2>Procedimento e equipe</h2>
        <dl class="print-data-grid">
          <div v-if="hasContent(prontuario.nome_procedimento)"><dt>Procedimento</dt><dd>{{ prontuario.nome_procedimento }}</dd></div>
          <div v-if="hasContent(prontuario.data_procedimento)"><dt>Data</dt><dd>{{ formatDate(prontuario.data_procedimento) }}</dd></div>
          <div v-if="anestesista"><dt>Anestesista</dt><dd>{{ anestesista }}</dd></div>
          <div v-if="cirurgiao"><dt>Cirurgiao</dt><dd>{{ cirurgiao }}</dd></div>
        </dl>
      </section>

      <section v-if="medicacaoPre.length > 0" class="print-section">
        <h2>Medicacao pre-anestesica</h2>
        <section v-for="secao in medicacaoPre" :key="secao.titulo" class="print-subsection">
          <h3>{{ secao.titulo }}</h3>
          <div class="print-medication-list">
            <article v-for="item in secao.itens" :key="item.id" class="print-medication-row">
              <strong>{{ item.farmaco_nome || 'Medicacao nao informada' }}</strong>
              <p v-if="doseMedicacao(item) || hasContent(item.motivo_uso)" class="print-medication-row__details">
                <span v-if="doseMedicacao(item)" class="print-dose">{{ doseMedicacao(item) }}</span>
                <span v-if="doseMedicacao(item) && hasContent(item.motivo_uso)"> - </span>
                <span v-if="hasContent(item.motivo_uso)">Motivo: {{ item.motivo_uso }}</span>
              </p>
            </article>
          </div>
        </section>
      </section>

      <section v-if="inducao.length > 0" class="print-section">
        <h2>Inducao</h2>
        <div class="print-medication-list">
          <article v-for="item in inducao" :key="item.id" class="print-medication-row">
            <strong>{{ item.farmaco_nome || 'Medicacao nao informada' }}</strong>
            <p v-if="doseMedicacao(item) || hasContent(item.motivo_uso)" class="print-medication-row__details">
              <span v-if="doseMedicacao(item)" class="print-dose">{{ doseMedicacao(item) }}</span>
              <span v-if="doseMedicacao(item) && hasContent(item.motivo_uso)"> - </span>
              <span v-if="hasContent(item.motivo_uso)">Motivo: {{ item.motivo_uso }}</span>
            </p>
          </article>
        </div>
      </section>

      <section v-if="manutencao.length > 0" class="print-section">
        <h2>Manutencao</h2>
        <div class="print-medication-list">
          <article v-for="item in manutencao" :key="item.id" class="print-medication-row">
            <strong>{{ item.farmaco_nome || 'Medicacao nao informada' }}</strong>
            <p v-if="doseMedicacao(item) || hasContent(item.motivo_uso)" class="print-medication-row__details">
              <span v-if="doseMedicacao(item)" class="print-dose">{{ doseMedicacao(item) }}</span>
              <span v-if="doseMedicacao(item) && hasContent(item.motivo_uso)"> - </span>
              <span v-if="hasContent(item.motivo_uso)">Motivo: {{ item.motivo_uso }}</span>
            </p>
          </article>
        </div>
      </section>

      <section v-if="transAnestesicas.length > 0" class="print-section">
        <h2>Medicacoes trans-anestesicas</h2>
        <section v-for="secao in transAnestesicas" :key="secao.value" class="print-subsection">
          <h3>{{ secao.label }}</h3>
          <div class="print-medication-list">
            <article v-for="item in secao.itens" :key="item.id" class="print-medication-row">
              <strong>{{ item.farmaco_nome || 'Medicacao nao informada' }}</strong>
              <p v-if="doseMedicacao(item) || hasContent(item.motivo_uso)" class="print-medication-row__details">
                <span v-if="doseMedicacao(item)" class="print-dose">{{ doseMedicacao(item) }}</span>
                <span v-if="doseMedicacao(item) && hasContent(item.motivo_uso)"> - </span>
                <span v-if="hasContent(item.motivo_uso)">Motivo: {{ item.motivo_uso }}</span>
              </p>
            </article>
          </div>
        </section>
      </section>

      <section v-if="fluidoterapias.length > 0" class="print-section">
        <h2>Fluidoterapia</h2>
        <div class="print-fluid-list">
          <article v-for="item in fluidoterapias" :key="item.id" class="print-fluid-card">
            <strong>{{ formatFluido(item.fluido) || 'Fluido nao informado' }}</strong>
            <dl class="print-data-grid">
              <div v-if="hasContent(item.taxa_ml_kg_h)"><dt>Taxa</dt><dd>{{ item.taxa_ml_kg_h }} mL/kg/h</dd></div>
              <div v-if="formatCateter(item.cateter_utilizado)"><dt>Cateter</dt><dd>{{ formatCateter(item.cateter_utilizado) }}</dd></div>
              <div v-if="formatMembro(item.membro_canulado)"><dt>Membro canulado</dt><dd>{{ formatMembro(item.membro_canulado) }}</dd></div>
              <div><dt>Desafio hidrico</dt><dd>{{ desafioRealizado(item) ? 'Realizado' : 'Nao realizado' }}</dd></div>
              <template v-if="desafioRealizado(item)">
                <div v-if="hasContent(item.desafio_volume_ml_kg)"><dt>Volume</dt><dd>{{ item.desafio_volume_ml_kg }} mL/kg</dd></div>
                <div v-if="hasContent(item.desafio_tempo_min)"><dt>Tempo</dt><dd>{{ item.desafio_tempo_min }} min</dd></div>
                <div><dt>Quantidade</dt><dd>{{ formatQuantidadeDesafio(item.desafio_quantidade) }}</dd></div>
                <div v-if="hasContent(item.desafio_motivo)"><dt>Motivo</dt><dd>{{ item.desafio_motivo }}</dd></div>
              </template>
            </dl>
          </article>
        </div>
      </section>

      <section v-if="hasContent(prontuario.observacoes_pre_anestesicas)" class="print-section">
        <h2>Observacoes</h2>
        <p class="print-observations">{{ prontuario.observacoes_pre_anestesicas }}</p>
      </section>

      <section v-for="item in monitorizacoes" :key="item.monitorizacao.id" class="print-section print-monitor-section">
        <h2>Monitorizacao<span v-if="datasMonitorizacao(item.linhas)"> — {{ datasMonitorizacao(item.linhas) }}</span></h2>
        <MonitorizacaoTable :linhas="item.linhas" ocultar-colunas-vazias />
      </section>
    </article>
  </main>
</template>
