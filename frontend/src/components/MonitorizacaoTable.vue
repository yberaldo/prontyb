<script setup lang="ts">
import { computed } from 'vue';
import type { MonitorizacaoLinha } from '../types/api';
import {
  COLUNAS_MONITORIZACAO,
  colunasVisiveisMonitorizacao,
  formatarValorMonitorizacao,
  normalizarDadosMonitorizacao,
} from '../utils/monitorizacao';

const props = defineProps<{
  linhas: MonitorizacaoLinha[];
  ocultarColunasVazias?: boolean;
}>();

const colunas = computed(() => {
  if (!props.ocultarColunasVazias) return colunasVisiveisMonitorizacao(props.linhas);
  return COLUNAS_MONITORIZACAO.filter((coluna) => props.linhas.some((linha) => (
    typeof normalizarDadosMonitorizacao(linha.dados_json)[coluna.key] === 'number'
  )));
});
</script>

<template>
  <div class="monitor-table-wrap">
    <table class="monitor-table">
      <thead>
        <tr>
          <th class="monitor-table__time">Horario</th>
          <th v-for="coluna in colunas" :key="coluna.key">
            {{ coluna.label }} <small>({{ coluna.unidade }})</small>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="linha in linhas" :key="linha.id">
          <th class="monitor-table__time" scope="row">{{ linha.horario || 'Nao informado' }}</th>
          <td v-for="coluna in colunas" :key="coluna.key">
            {{ formatarValorMonitorizacao(coluna.key, normalizarDadosMonitorizacao(linha.dados_json)[coluna.key]) || '—' }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
