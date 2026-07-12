<script setup lang="ts">
import { computed } from 'vue';
import type { MonitorizacaoLinha } from '../types/api';
import {
  colunasVisiveisMonitorizacao,
  formatarValorMonitorizacao,
  normalizarDadosMonitorizacao,
} from '../utils/monitorizacao';

const props = defineProps<{
  linhas: MonitorizacaoLinha[];
}>();

const colunas = computed(() => colunasVisiveisMonitorizacao(props.linhas));
</script>

<template>
  <table class="print-monitor-table">
    <colgroup>
      <col class="print-monitor-table__time-column">
      <col v-for="coluna in colunas" :key="coluna.key">
    </colgroup>
    <thead>
      <tr>
        <th>Horario</th>
        <th v-for="coluna in colunas" :key="coluna.key">
          <span>{{ coluna.label }}</span>
          <small>({{ coluna.unidade }})</small>
        </th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="linha in linhas" :key="linha.id">
        <th scope="row">{{ linha.horario || 'Nao informado' }}</th>
        <td v-for="coluna in colunas" :key="coluna.key">
          {{ formatarValorMonitorizacao(coluna.key, normalizarDadosMonitorizacao(linha.dados_json)[coluna.key]) || '—' }}
        </td>
      </tr>
    </tbody>
  </table>
</template>
