<script setup lang="ts">
import { computed, ref } from 'vue';
import { ApiError } from '../api/client';
import {
  enviarPdfMonitorizacao,
  importarMonitorizacaoConfirmada,
  listarMonitorizacoes,
} from '../api/prontuarios';
import type {
  ImportarMonitorizacaoConfirmadaPayload,
  MonitorizacaoCampoClinico,
} from '../types/api';
import {
  analisarPdfMonitorizacao,
  type LinhaMonitorizacaoExtraida,
  type ResultadoParserMonitorizacao,
} from '../utils/monitorizacaoPdfParser';
import {
  COLUNAS_MONITORIZACAO,
  colunasVisiveisMonitorizacao,
  formatarValorMonitorizacao,
  getMonitorizacaoColuna,
} from '../utils/monitorizacao';
import { formatDate } from '../utils/format';

const props = defineProps<{
  prontuarioId: number;
}>();

const emit = defineEmits<{
  back: [];
  completed: [];
}>();

interface LinhaEditavel extends LinhaMonitorizacaoExtraida {
  selecionadas: Partial<Record<MonitorizacaoCampoClinico, boolean>>;
  conflito: boolean;
}

const arquivo = ref<File | null>(null);
const resultado = ref<ResultadoParserMonitorizacao | null>(null);
const linhas = ref<LinhaEditavel[]>([]);
const processandoArquivo = ref(false);
const enviando = ref(false);
const erro = ref<string | null>(null);
const monitorizacaoId = ref<number | null>(null);
const bloqueadoPorDuplicidade = ref(false);
let versaoLeitura = 0;

function validarValor(campo: MonitorizacaoCampoClinico, valor: number | null): string | null {
  if (valor === null || !Number.isFinite(valor)) return 'Valor invalido';
  if (valor < 0) return 'Valores negativos nao sao permitidos';
  if (campo === 'spo2_percent' && valor > 100) return 'SpO2 deve estar entre 0 e 100';
  return null;
}

function criarLinhaEditavel(linha: LinhaMonitorizacaoExtraida): LinhaEditavel {
  const selecionadas: Partial<Record<MonitorizacaoCampoClinico, boolean>> = {};
  for (const coluna of COLUNAS_MONITORIZACAO) {
    const valor = linha.dados[coluna.key];
    selecionadas[coluna.key] = typeof valor === 'number' && !linha.invalidos[coluna.key];
  }
  return { ...linha, selecionadas, conflito: false };
}

function linhasParaColunasVisiveis() {
  return linhas.value.map((linha, indice) => ({
    id: indice,
    prontuario_id: props.prontuarioId,
    monitorizacao_extraida_id: monitorizacaoId.value || 0,
    horario: linha.horario,
    dados_json: linha.dados,
    ordem: linha.ordem,
  }));
}

const colunasVisiveis = computed(() => colunasVisiveisMonitorizacao(linhasParaColunasVisiveis()));
const celulasSelecionadas = computed(() => linhas.value.reduce((total, linha) => (
  total + COLUNAS_MONITORIZACAO.filter((coluna) => linha.selecionadas[coluna.key]).length
), 0));
const linhasSelecionadas = computed(() => linhas.value.filter((linha) => (
  COLUNAS_MONITORIZACAO.some((coluna) => linha.selecionadas[coluna.key])
)).length);
const podeSalvar = computed(() => !enviando.value && !bloqueadoPorDuplicidade.value
  && linhasSelecionadas.value > 0 && celulasSelecionadas.value > 0);

function valorDaCelula(linha: LinhaEditavel, campo: MonitorizacaoCampoClinico): string {
  return formatarValorMonitorizacao(campo, linha.dados[campo]);
}

function celulaValida(linha: LinhaEditavel, campo: MonitorizacaoCampoClinico): boolean {
  return typeof linha.dados[campo] === 'number' && !linha.invalidos[campo];
}

function atualizarSelecaoCelula(linha: LinhaEditavel, campo: MonitorizacaoCampoClinico, selecionada: boolean) {
  linha.selecionadas[campo] = selecionada && celulaValida(linha, campo);
  linha.conflito = false;
}

function alterarCheckbox(linha: LinhaEditavel, campo: MonitorizacaoCampoClinico, event: Event) {
  const alvo = event.target;
  if (!(alvo instanceof HTMLInputElement)) return;
  atualizarSelecaoCelula(linha, campo, alvo.checked);
}

function selecionarTodas() {
  for (const linha of linhas.value) {
    for (const coluna of COLUNAS_MONITORIZACAO) {
      linha.selecionadas[coluna.key] = celulaValida(linha, coluna.key);
    }
    linha.conflito = false;
  }
}

function selecionarNenhuma() {
  for (const linha of linhas.value) {
    for (const coluna of COLUNAS_MONITORIZACAO) linha.selecionadas[coluna.key] = false;
  }
}

function alternarColuna(campo: MonitorizacaoCampoClinico) {
  const deveSelecionar = linhas.value.some((linha) => celulaValida(linha, campo) && !linha.selecionadas[campo]);
  for (const linha of linhas.value) {
    linha.selecionadas[campo] = deveSelecionar && celulaValida(linha, campo);
  }
}

function alternarLinha(linha: LinhaEditavel) {
  const deveSelecionar = COLUNAS_MONITORIZACAO.some((coluna) => (
    celulaValida(linha, coluna.key) && !linha.selecionadas[coluna.key]
  ));
  for (const coluna of COLUNAS_MONITORIZACAO) {
    linha.selecionadas[coluna.key] = deveSelecionar && celulaValida(linha, coluna.key);
  }
  linha.conflito = false;
}

function editarCelula(linha: LinhaEditavel, campo: MonitorizacaoCampoClinico, event: Event) {
  const alvo = event.target;
  if (!(alvo instanceof HTMLInputElement)) return;
  const texto = alvo.value.trim().replace(',', '.');
  const numero = texto === '' ? null : Number(texto);
  const valor = numero !== null && Number.isFinite(numero) ? numero : null;
  const valorInterno = campo === 'gas_mmhg' && valor !== null ? (valor * 760) / 100 : valor;
  linha.dados[campo] = valorInterno === 0 && campo === 'gas_mmhg' ? undefined : valorInterno ?? undefined;
  const erroValor = validarValor(campo, valorInterno);
  if (erroValor) linha.invalidos[campo] = erroValor;
  else delete linha.invalidos[campo];
  if (!celulaValida(linha, campo)) linha.selecionadas[campo] = false;
  linha.conflito = false;
}

function nomeArquivoSeguro(): string {
  return arquivo.value?.name || 'PDF selecionado';
}

async function selecionarArquivo(event: Event) {
  const alvo = event.target;
  if (!(alvo instanceof HTMLInputElement)) return;
  const selecionado = alvo.files?.[0] || null;
  versaoLeitura += 1;
  const versaoAtual = versaoLeitura;
  erro.value = null;
  resultado.value = null;
  linhas.value = [];
  monitorizacaoId.value = null;
  bloqueadoPorDuplicidade.value = false;
  arquivo.value = null;

  if (!selecionado) return;
  if (selecionado.type !== 'application/pdf' && !selecionado.name.toLowerCase().endsWith('.pdf')) {
    erro.value = 'Selecione um arquivo PDF valido.';
    alvo.value = '';
    return;
  }

  arquivo.value = selecionado;
  processandoArquivo.value = true;
  const analise = await analisarPdfMonitorizacao(selecionado);
  if (versaoAtual !== versaoLeitura) return;
  resultado.value = analise;
  linhas.value = analise.linhas.map(criarLinhaEditavel);
  processandoArquivo.value = false;
  if (analise.erro) erro.value = analise.erro;
}

function montarPayload(): ImportarMonitorizacaoConfirmadaPayload | null {
  const linhasConfirmadas = linhas.value.map((linha) => {
    const dados: Partial<Record<MonitorizacaoCampoClinico, number>> = {};
    for (const coluna of COLUNAS_MONITORIZACAO) {
      const valor = linha.dados[coluna.key];
      if (linha.selecionadas[coluna.key] && typeof valor === 'number' && !linha.invalidos[coluna.key]) {
        dados[coluna.key] = valor;
      }
    }
    return { ordem: linha.ordem, data_medicao: linha.data_medicao, horario: linha.horario, dados };
  }).filter((linha) => Object.keys(linha.dados).length > 0);

  if (linhasConfirmadas.length === 0) return null;
  const chaves = new Set<MonitorizacaoCampoClinico>();
  for (const linha of linhasConfirmadas) {
    for (const chave of Object.keys(linha.dados) as MonitorizacaoCampoClinico[]) chaves.add(chave);
  }
  return {
    formato: 'trend-table-v1',
    parser_versao: 1,
    colunas: COLUNAS_MONITORIZACAO.filter((coluna) => chaves.has(coluna.key)).map((coluna) => getMonitorizacaoColuna(coluna.key)),
    linhas: linhasConfirmadas,
  };
}

function marcarConflitos(conflitos: ApiError['conflitos']) {
  if (!conflitos?.length) return false;
  const chaves = new Set(conflitos.map((conflito) => `${conflito.data_medicao}T${conflito.horario}`));
  for (const linha of linhas.value) {
    if (!chaves.has(`${linha.data_medicao}T${linha.horario}`)) continue;
    linha.conflito = true;
    for (const coluna of COLUNAS_MONITORIZACAO) linha.selecionadas[coluna.key] = false;
  }
  return true;
}

async function salvar() {
  const payload = montarPayload();
  if (!payload || !arquivo.value || enviando.value || bloqueadoPorDuplicidade.value) {
    erro.value = 'Selecione ao menos uma linha e uma celula valida.';
    return;
  }

  enviando.value = true;
  erro.value = null;
  try {
    if (monitorizacaoId.value === null) {
      const anexo = await enviarPdfMonitorizacao(props.prontuarioId, arquivo.value);
      const monitorizacoes = await listarMonitorizacoes(props.prontuarioId);
      const pendente = monitorizacoes.find((item) => item.anexo_id === anexo.id && item.status === 'pendente');
      if (!pendente) throw new Error('O anexo foi enviado, mas a monitorizacao pendente nao foi encontrada. Atualize a pagina antes de tentar novamente.');
      monitorizacaoId.value = pendente.id;
    }
    const idPendente = monitorizacaoId.value;
    if (idPendente === null) throw new Error('Monitorizacao pendente indisponivel.');
    await importarMonitorizacaoConfirmada(props.prontuarioId, idPendente, payload);
    emit('completed');
  } catch (causa) {
    if (causa instanceof ApiError && causa.status === 409) {
      if (marcarConflitos(causa.conflitos)) {
        erro.value = 'Horarios ja existentes foram destacados e desmarcados. Revise e envie as demais linhas.';
      } else if (causa.message.includes('arquivo de monitorizacao ja existe')) {
        bloqueadoPorDuplicidade.value = true;
        erro.value = 'Este PDF ja foi importado para este prontuario. Selecione outro arquivo para iniciar uma nova importacao.';
      } else {
        erro.value = causa.message;
      }
    } else {
      erro.value = causa instanceof Error ? causa.message : 'Nao foi possivel salvar a monitorizacao.';
    }
  } finally {
    enviando.value = false;
  }
}
</script>

<template>
  <main class="app-shell monitor-import-page">
    <header class="app-header detail-header">
      <button class="secondary-action" type="button" :disabled="enviando" @click="emit('back')">Voltar</button>
      <div>
        <p class="eyebrow">Monitorizacao</p>
        <h1>Importar monitorizacao</h1>
      </div>
    </header>

    <section class="content-stack">
      <section class="section-block">
        <label class="field">
          <span>Arquivo PDF</span>
          <input type="file" accept="application/pdf,.pdf" :disabled="processandoArquivo || enviando" @change="selecionarArquivo">
          <small>A leitura e a revisao acontecem neste dispositivo; o PDF so sera enviado ao salvar.</small>
        </label>
        <p v-if="processandoArquivo" class="state-text">Lendo a tabela do PDF...</p>
        <p v-if="erro" class="state-error">{{ erro }}</p>
      </section>

      <section v-if="resultado && !resultado.erro" class="section-block">
        <div class="section-heading"><h2>Resumo</h2></div>
        <dl class="mini-grid">
          <div><dt>Arquivo</dt><dd>{{ nomeArquivoSeguro() }}</dd></div>
          <div><dt>Data</dt><dd>{{ resultado.data ? formatDate(resultado.data) : 'Mais de uma data' }}</dd></div>
          <div><dt>Paginas</dt><dd>{{ resultado.paginas }}</dd></div>
          <div><dt>Linhas</dt><dd>{{ linhas.length }}</dd></div>
        </dl>
        <p v-for="(aviso, indice) in resultado.avisos" :key="`${aviso}-${indice}`" class="state-text">Aviso: {{ aviso }}</p>
        <p v-if="monitorizacaoId !== null" class="state-text">PDF enviado; a importacao pode ser tentada novamente sem novo upload.</p>
      </section>

      <section v-if="resultado && !resultado.erro" class="section-block">
        <div class="monitor-import-actions">
          <button class="secondary-action" type="button" :disabled="enviando" @click="selecionarTodas">Selecionar todas</button>
          <button class="secondary-action" type="button" :disabled="enviando" @click="selecionarNenhuma">Selecionar nenhuma</button>
        </div>
        <div class="monitor-table-wrap">
          <table class="monitor-table monitor-table--editable">
            <thead>
              <tr>
                <th class="monitor-table__time">Horario</th>
                <th v-for="coluna in colunasVisiveis" :key="coluna.key">
                  <button class="monitor-column-action" type="button" :disabled="enviando" @click="alternarColuna(coluna.key)">
                    {{ coluna.label }} <small>({{ coluna.unidade }})</small>
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="linha in linhas" :key="linha.ordem" :class="{ 'monitor-row--conflict': linha.conflito }">
                <th class="monitor-table__time" scope="row">
                  <button class="monitor-row-action" type="button" :disabled="enviando" @click="alternarLinha(linha)">{{ linha.horario }}</button>
                  <small v-if="linha.conflito">Conflito</small>
                  <small v-for="aviso in linha.avisos" :key="aviso" class="monitor-cell-warning">{{ aviso }}</small>
                </th>
                <td v-for="coluna in colunasVisiveis" :key="coluna.key" :class="{ 'monitor-cell--invalid': linha.invalidos[coluna.key] }">
                  <label class="monitor-edit-cell">
                    <input
                      type="checkbox"
                      :checked="Boolean(linha.selecionadas[coluna.key])"
                      :disabled="enviando || !celulaValida(linha, coluna.key)"
                      @change="alterarCheckbox(linha, coluna.key, $event)"
                    >
                    <input
                      type="number"
                      inputmode="decimal"
                      step="any"
                      :value="valorDaCelula(linha, coluna.key)"
                      :disabled="enviando"
                      :aria-label="`${coluna.label} em ${linha.horario}`"
                      @input="editarCelula(linha, coluna.key, $event)"
                    >
                  </label>
                  <small v-if="linha.invalidos[coluna.key]">{{ linha.invalidos[coluna.key] }}</small>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p class="form-note">Clique no horario para selecionar a linha e no cabecalho para selecionar a coluna. CAM e convertida para GAS apenas no envio.</p>
        <div class="form-actions">
          <button class="primary-action" type="button" :disabled="!podeSalvar" @click="salvar">
            {{ enviando ? 'Salvando...' : `Salvar ${celulasSelecionadas} celulas confirmadas` }}
          </button>
        </div>
      </section>
    </section>
  </main>
</template>
