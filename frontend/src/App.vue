<script setup lang="ts">
import { ref } from 'vue';
import type { ProntuarioAnestesico } from './types/api';
import ProntuarioCreateView from './pages/ProntuarioCreateView.vue';
import ProntuarioEditView from './pages/ProntuarioEditView.vue';
import ProntuarioDetailView from './pages/ProntuarioDetailView.vue';
import ProntuarioListView from './pages/ProntuarioListView.vue';
import ProntuarioPrintView from './pages/ProntuarioPrintView.vue';
import MonitorizacaoImportView from './pages/MonitorizacaoImportView.vue';
import InstallPrompt from './components/InstallPrompt.vue';

type AppView = 'list' | 'create' | 'detail' | 'edit' | 'print' | 'monitorizacao-import';

const currentView = ref<AppView>('list');
const selectedProntuarioId = ref<number | null>(null);
const listKey = ref(0);
const listMessage = ref<string | null>(null);

function openProntuario(id: number) {
  currentView.value = 'detail';
  selectedProntuarioId.value = id;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function openEdit() {
  if (selectedProntuarioId.value === null) return;
  currentView.value = 'edit';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function openPrint() {
  if (selectedProntuarioId.value === null) return;
  currentView.value = 'print';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function openMonitorizacaoImport() {
  if (selectedProntuarioId.value === null) return;
  currentView.value = 'monitorizacao-import';
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

function backToDetail() {
  if (selectedProntuarioId.value === null) {
    backToList();
    return;
  }
  currentView.value = 'detail';
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

function handleSaved(prontuario: ProntuarioAnestesico) {
  if (!prontuario.id) {
    backToDetail();
    return;
  }

  openProntuario(prontuario.id);
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
  <ProntuarioEditView
    v-else-if="currentView === 'edit' && selectedProntuarioId !== null"
    :prontuario-id="selectedProntuarioId"
    @cancel="backToDetail"
    @saved="handleSaved"
  />
  <ProntuarioPrintView
    v-else-if="currentView === 'print' && selectedProntuarioId !== null"
    :prontuario-id="selectedProntuarioId"
    @back="backToDetail"
  />
  <MonitorizacaoImportView
    v-else-if="currentView === 'monitorizacao-import' && selectedProntuarioId !== null"
    :prontuario-id="selectedProntuarioId"
    @back="backToDetail"
    @completed="backToDetail"
  />
  <ProntuarioDetailView
    v-else-if="currentView === 'detail' && selectedProntuarioId !== null"
    :prontuario-id="selectedProntuarioId"
    @back="backToList"
    @edit="openEdit"
    @print="openPrint"
    @import-monitorizacao="openMonitorizacaoImport"
  />
</template>
