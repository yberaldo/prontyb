<script setup lang="ts">
import { ref } from 'vue';
import type { ProntuarioAnestesico } from './types/api';
import ProntuarioCreateView from './pages/ProntuarioCreateView.vue';
import ProntuarioDetailView from './pages/ProntuarioDetailView.vue';
import ProntuarioListView from './pages/ProntuarioListView.vue';
import InstallPrompt from './components/InstallPrompt.vue';

type AppView = 'list' | 'create' | 'detail';

const currentView = ref<AppView>('list');
const selectedProntuarioId = ref<number | null>(null);
const listKey = ref(0);
const listMessage = ref<string | null>(null);

function openProntuario(id: number) {
  currentView.value = 'detail';
  selectedProntuarioId.value = id;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function openCreate() {
  currentView.value = 'create';
  listMessage.value = null;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function backToList() {
  currentView.value = 'list';
  selectedProntuarioId.value = null;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function handleCreated(prontuario: ProntuarioAnestesico) {
  listKey.value += 1;

  if (prontuario.id) {
    openProntuario(prontuario.id);
    return;
  }

  listMessage.value = 'Prontuario criado com sucesso.';
  backToList();
}
</script>

<template>
  <InstallPrompt />

  <ProntuarioListView
    v-if="currentView === 'list'"
    :key="listKey"
    :notice="listMessage"
    @create-prontuario="openCreate"
    @select-prontuario="openProntuario"
  />
  <ProntuarioCreateView
    v-else-if="currentView === 'create'"
    @back="backToList"
    @created="handleCreated"
  />
  <ProntuarioDetailView
    v-else-if="selectedProntuarioId !== null"
    :prontuario-id="selectedProntuarioId"
    @back="backToList"
  />
</template>
