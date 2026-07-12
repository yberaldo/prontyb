<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import MonitorizacaoPrintTable from '../components/MonitorizacaoPrintTable.vue';
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

const NAO_INFORMADO = 'Nao informado';
const FARMACOS_INALATORIOS = new Set(['isoflurano', 'sevoflurano']);
const TRANS_SUBCATEGORIAS = [
  { value: 'analgesia', label: 'Analgesia' },
  { value: 'vasopressores_inotropicos', label: 'Vasopressores / Inotropicos' },
  { value: 'anticolinergicos', label: 'Anticolinergicos' },
  { value: 'antiemeticos', label: 'Antiemeticos' },
  { value: 'reversores', label: 'Reversores' },
  { value: 'outros', label: 'Outros' },
] as const;

interface MonitorizacaoParaImpressao {
  monitorizacao: MonitorizacaoProntuario;
  linhas: MonitorizacaoLinha[];
}

const prontuario = ref<ProntuarioAnestesico | null>(null);
const medicacoes = ref<MedicacaoProntuario[]>([]);
const fluidoterapias = ref<FluidoterapiaProntuario[]>([]);
const monitorizacoes = ref<MonitorizacaoParaImpressao[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);
let tituloOriginal: string | null = null;

function getErrorMessage(err: unknown) {
  return err instanceof Error ? err.message : 'Nao foi possivel carregar o prontuario para impressao.';
}

function hasContent(value?: string | number | boolean | null) {
  return value !== null && typeof value !== 'undefined' && String(value).trim() !== '';
}

function valorOuNaoInformado(value?: string | number | null) {
  return hasContent(value) ? String(value) : NAO_INFORMADO;
}

function dataOuNaoInformada(value?: string | null) {
  return hasContent(value) ? formatDate(value) : NAO_INFORMADO;
}

function pesoOuNaoInformado(value?: string | number | null) {
  if (!hasContent(value)) return NAO_INFORMADO;
  const texto = String(value);
  return /\bkg\b/i.test(texto) ? texto : `${texto} kg`;
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

function registroProfissional(
  crmvPlano: string | null | undefined,
  ufPlano: string | null | undefined,
  profissional: ProntuarioProfissional | null | undefined,
) {
  const crmv = crmvPlano || profissional?.crmv;
  const uf = ufPlano || profissional?.uf;
  if (!crmv) return null;
  return `CRMV${uf ? `-${uf}` : ''} ${crmv}`;
}

function descricaoProfissional(
  nomePlano: string | null | undefined,
  crmvPlano: string | null | undefined,
  ufPlano: string | null | undefined,
  profissional: ProntuarioProfissional | null | undefined,
) {
  const nome = nomeProfissional(nomePlano, profissional);
  const registro = registroProfissional(crmvPlano, ufPlano, profissional);
  return [nome, registro].filter(hasContent).join(' - ') || NAO_INFORMADO;
}

function normalizeFarmacoNome(nome: string) {
  return nome.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
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

function nomeSubcategoria(subcategoria?: string | null) {
  return TRANS_SUBCATEGORIAS.find((item) => item.value === subcategoria)?.label || subcategoria || null;
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

function statusDesafio(item: FluidoterapiaProntuario) {
  if (!hasContent(item.desafio_hidrico_realizado)) return NAO_INFORMADO;
  return desafioRealizado(item) ? 'Realizado' : 'Nao realizado';
}

function formatQuantidadeDesafio(value?: string | number | null) {
  if (!hasContent(value)) return NAO_INFORMADO;
  if (Number(value) === 0) return 'Livre';
  const quantidade = Number(value);
  if (!Number.isFinite(quantidade)) return String(value);
  return quantidade === 1 ? '1 vez' : `${quantidade} vezes`;
}

function datasMonitorizacao(linhas: MonitorizacaoLinha[]) {
  const datas = [...new Set(linhas.map((linha) => linha.data_medicao).filter((data): data is string => Boolean(data)))];
  return datas.map(formatDate).join(', ');
}

const clinica = computed(() => (prontuario.value ? nomeClinica(prontuario.value) : null));
const anestesista = computed(() => (
  prontuario.value ? nomeProfissional(prontuario.value.anestesista_nome, prontuario.value.anestesista) : null
));
const descricaoAnestesista = computed(() => (prontuario.value ? descricaoProfissional(
  prontuario.value.anestesista_nome,
  prontuario.value.anestesista_crmv,
  prontuario.value.anestesista_uf,
  prontuario.value.anestesista,
) : NAO_INFORMADO));
const descricaoCirurgiao = computed(() => (prontuario.value ? descricaoProfissional(
  prontuario.value.cirurgiao_nome,
  prontuario.value.cirurgiao_crmv,
  prontuario.value.cirurgiao_uf,
  prontuario.value.cirurgiao,
) : NAO_INFORMADO));
const assinaturaAnestesista = computed(() => {
  if (!prontuario.value || !anestesista.value) return null;
  const registro = registroProfissional(
    prontuario.value.anestesista_crmv,
    prontuario.value.anestesista_uf,
    prontuario.value.anestesista,
  );
  if (!registro) return null;
  return { nome: anestesista.value, registro, funcao: 'Medico veterinario responsavel pela anestesia' };
});
const medicacaoPre = computed(() => [
  ...medicacoesPorCategoria('pre_anestesica_sedativo'),
  ...medicacoesPorCategoria('pre_anestesica_opioide'),
]);
const gruposFarmacos = computed(() => [
  { chave: 'mpa', titulo: 'Medicacao pre-anestesica', itens: medicacaoPre.value },
  { chave: 'inducao', titulo: 'Inducao anestesica', itens: medicacoesPorCategoria('inducao') },
  { chave: 'manutencao', titulo: 'Manutencao anestesica', itens: medicacoesPorCategoria('manutencao') },
  { chave: 'trans', titulo: 'Medicacao transanestesica', itens: medicacoes.value.filter((item) => item.categoria === 'trans_anestesica') },
]);
const paginasMonitorizacao = computed(() => (
  monitorizacoes.value.length > 0
    ? monitorizacoes.value.map((item) => ({ ...item, chave: item.monitorizacao.id }))
    : [{ monitorizacao: null, linhas: [] as MonitorizacaoLinha[], chave: 'sem-monitorizacao' }]
));

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
      <section class="print-sheet print-sheet--first">
        <header class="print-document-header">
          <h1>Prontuario anestesico</h1>
          <p>Prontuario: {{ valorOuNaoInformado(prontuario.numero_prontuario) }}</p>
        </header>

        <section class="print-section">
          <h2>Identificacao do paciente</h2>
          <dl class="print-record-grid">
            <div><dt>Paciente</dt><dd>{{ valorOuNaoInformado(prontuario.nome_animal) }}</dd></div>
            <div><dt>Especie</dt><dd>{{ valorOuNaoInformado(prontuario.especie) }}</dd></div>
            <div><dt>Raca</dt><dd>{{ valorOuNaoInformado(prontuario.raca) }}</dd></div>
            <div><dt>Sexo</dt><dd>{{ valorOuNaoInformado(prontuario.sexo) }}</dd></div>
            <div><dt>Idade</dt><dd>{{ valorOuNaoInformado(prontuario.idade) }}</dd></div>
            <div><dt>Peso</dt><dd>{{ pesoOuNaoInformado(prontuario.peso) }}</dd></div>
            <div><dt>Tutor</dt><dd>{{ valorOuNaoInformado(prontuario.nome_tutor) }}</dd></div>
            <div><dt>CPF do tutor</dt><dd>{{ NAO_INFORMADO }}</dd></div>
            <div><dt>Data da anestesia</dt><dd>{{ dataOuNaoInformada(prontuario.data_procedimento) }}</dd></div>
            <div><dt>Procedimento</dt><dd>{{ valorOuNaoInformado(prontuario.nome_procedimento) }}</dd></div>
            <div class="print-record-grid__wide"><dt>Clinica</dt><dd>{{ valorOuNaoInformado(clinica) }}</dd></div>
          </dl>
        </section>

        <section class="print-section">
          <h2>Profissionais responsaveis</h2>
          <div class="print-professionals">
            <p><strong>Responsavel pelo procedimento:</strong> {{ descricaoCirurgiao }}</p>
            <p><strong>Responsavel pela anestesia:</strong> {{ descricaoAnestesista }}</p>
          </div>
        </section>

        <section class="print-section">
          <h2>Anamnese e historico clinico</h2>
          <p class="print-text-block">{{ valorOuNaoInformado(prontuario.observacoes_pre_anestesicas) }}</p>
        </section>

        <section class="print-section">
          <h2>Diagnostico e indicacao anestesica</h2>
          <p class="print-text-block">{{ NAO_INFORMADO }}</p>
        </section>

        <section class="print-section">
          <h2>Avaliacao pre-anestesica</h2>
          <p class="print-text-block">{{ NAO_INFORMADO }}</p>
        </section>
      </section>

      <section class="print-sheet print-sheet--second">
        <section class="print-section">
          <h2>Planejamento anestesico</h2>
          <p class="print-text-block">{{ NAO_INFORMADO }}</p>
        </section>

        <section class="print-section">
          <h2>Farmacos e terapias administradas</h2>
          <div class="print-therapy-list">
            <section v-for="grupo in gruposFarmacos" :key="grupo.chave" class="print-therapy-group">
              <h3>{{ grupo.titulo }}</h3>
              <p v-if="grupo.itens.length === 0" class="print-text-block">{{ NAO_INFORMADO }}</p>
              <p v-for="item in grupo.itens" :key="item.id" class="print-therapy-item">
                <strong>{{ item.farmaco_nome || NAO_INFORMADO }}</strong>
                <span v-if="doseMedicacao(item)"> — {{ doseMedicacao(item) }}</span>
                <span v-if="nomeSubcategoria(item.subcategoria)"> — {{ nomeSubcategoria(item.subcategoria) }}</span>
                <span v-if="hasContent(item.motivo_uso)"> — Motivo: {{ item.motivo_uso }}</span>
              </p>
            </section>

            <section class="print-therapy-group">
              <h3>Fluidoterapia</h3>
              <p v-if="fluidoterapias.length === 0" class="print-text-block">{{ NAO_INFORMADO }}</p>
              <article v-for="item in fluidoterapias" :key="item.id" class="print-fluid-card">
                <strong>{{ formatFluido(item.fluido) || NAO_INFORMADO }}</strong>
                <dl class="print-data-grid">
                  <div><dt>Taxa</dt><dd>{{ hasContent(item.taxa_ml_kg_h) ? `${item.taxa_ml_kg_h} mL/kg/h` : NAO_INFORMADO }}</dd></div>
                  <div><dt>Cateter</dt><dd>{{ formatCateter(item.cateter_utilizado) || NAO_INFORMADO }}</dd></div>
                  <div><dt>Membro canulado</dt><dd>{{ formatMembro(item.membro_canulado) || NAO_INFORMADO }}</dd></div>
                  <div><dt>Desafio hidrico</dt><dd>{{ statusDesafio(item) }}</dd></div>
                  <template v-if="desafioRealizado(item)">
                    <div><dt>Volume</dt><dd>{{ hasContent(item.desafio_volume_ml_kg) ? `${item.desafio_volume_ml_kg} mL/kg` : NAO_INFORMADO }}</dd></div>
                    <div><dt>Tempo</dt><dd>{{ hasContent(item.desafio_tempo_min) ? `${item.desafio_tempo_min} min` : NAO_INFORMADO }}</dd></div>
                    <div><dt>Quantidade</dt><dd>{{ formatQuantidadeDesafio(item.desafio_quantidade) }}</dd></div>
                    <div><dt>Motivo</dt><dd>{{ valorOuNaoInformado(item.desafio_motivo) }}</dd></div>
                  </template>
                </dl>
              </article>
            </section>
          </div>
        </section>

        <section class="print-section">
          <h2>Monitorizacao e evolucao transanestesica</h2>
          <p class="print-text-block">{{ NAO_INFORMADO }}</p>
        </section>

        <section class="print-section">
          <h2>Recuperacao pos-anestesica</h2>
          <p class="print-text-block">{{ NAO_INFORMADO }}</p>
        </section>

        <section class="print-section">
          <h2>Conclusao</h2>
          <p class="print-text-block">{{ NAO_INFORMADO }}</p>
        </section>
      </section>

      <section v-for="item in paginasMonitorizacao" :key="item.chave" class="print-sheet print-monitor-page">
        <header class="print-monitor-header">
          <h2>Registro de monitorizacao transanestesica</h2>
        </header>

        <dl class="print-monitor-identification">
          <div><dt>Paciente</dt><dd>{{ valorOuNaoInformado(prontuario.nome_animal) }}</dd></div>
          <div><dt>Especie</dt><dd>{{ valorOuNaoInformado(prontuario.especie) }}</dd></div>
          <div><dt>Raca</dt><dd>{{ valorOuNaoInformado(prontuario.raca) }}</dd></div>
          <div><dt>Sexo</dt><dd>{{ valorOuNaoInformado(prontuario.sexo) }}</dd></div>
          <div><dt>Idade</dt><dd>{{ valorOuNaoInformado(prontuario.idade) }}</dd></div>
          <div><dt>Peso</dt><dd>{{ pesoOuNaoInformado(prontuario.peso) }}</dd></div>
          <div class="print-monitor-identification__wide"><dt>Tutor</dt><dd>{{ valorOuNaoInformado(prontuario.nome_tutor) }}</dd></div>
          <div><dt>Data da anestesia</dt><dd>{{ dataOuNaoInformada(prontuario.data_procedimento) }}</dd></div>
          <div><dt>Procedimento</dt><dd>{{ valorOuNaoInformado(prontuario.nome_procedimento) }}</dd></div>
          <div class="print-monitor-identification__wide"><dt>Clinica</dt><dd>{{ valorOuNaoInformado(clinica) }}</dd></div>
          <div class="print-monitor-intro">
            Registro dos parametros de monitorizacao transanestesica nos horarios documentados para este procedimento.
            <span v-if="datasMonitorizacao(item.linhas)">Data dos registros: {{ datasMonitorizacao(item.linhas) }}.</span>
          </div>
        </dl>

        <MonitorizacaoPrintTable v-if="item.linhas.length > 0" :linhas="item.linhas" />
        <p v-else class="print-monitor-empty">{{ NAO_INFORMADO }}</p>

        <footer v-if="assinaturaAnestesista" class="print-signature">
          <strong>{{ assinaturaAnestesista.nome }}</strong>
          <span>{{ assinaturaAnestesista.registro }}</span>
          <span>{{ assinaturaAnestesista.funcao }}</span>
        </footer>
      </section>
    </article>
  </main>
</template>
