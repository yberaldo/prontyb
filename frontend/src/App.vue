<script setup lang="ts">
import { ref } from 'vue';
import ProntuarioDetailView from './pages/ProntuarioDetailView.vue';
import ProntuarioListView from './pages/ProntuarioListView.vue';

const selectedProntuarioId = ref<number | null>(null);

function openProntuario(id: number) {
  selectedProntuarioId.value = id;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function backToList() {
  selectedProntuarioId.value = null;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
</script>

<template>
  <ProntuarioListView
    v-if="selectedProntuarioId === null"
    @select-prontuario="openProntuario"
  />
  <ProntuarioDetailView
    v-else
    :prontuario-id="selectedProntuarioId"
    @back="backToList"
  />
</template>
