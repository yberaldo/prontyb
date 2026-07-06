<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { listarProntuarios } from '../api/prontuarios';
import type { ProntuarioAnestesico } from '../types/api';
import { formatDate, formatValue } from '../utils/format';

const props = defineProps<{
  notice?: string | null;
}>();

const emit = defineEmits<{
  createProntuario: [];
  selectProntuario: [id: number];
}>();

const prontuarios = ref<ProntuarioAnestesico[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);

async function loadProntuarios() {
  loading.value = true;
  error.value = null;

  try {
    prontuarios.value = await listarProntuarios();
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Nao foi possivel carregar os prontuarios.';
  } finally {
    loading.value = false;
  }
}

onMounted(loadProntuarios);
</script>

<template>
  <main class="app-shell">
    <header class="app-header">
      <div>
        <p class="eyebrow">Prontuario Anestesico Veterinario</p>
        <h1>Prontyb</h1>
      </div>
      <div class="header-actions">
        <button class="secondary-action" type="button" @click="emit('createProntuario')">
          Novo prontuario
        </button>
        <button class="primary-action" type="button" :disabled="loading" @click="loadProntuarios">
          Atualizar
        </button>
      </div>
    </header>

    <section class="content-stack">
      <p v-if="props.notice" class="state-card state-success">{{ props.notice }}</p>
      <p v-if="loading" class="state-card">Carregando prontuarios...</p>
      <p v-else-if="error" class="state-card state-error">{{ error }}</p>
      <p v-else-if="prontuarios.length === 0" class="state-card">Nenhum prontuario encontrado.</p>

      <button
        v-for="prontuario in prontuarios"
        v-else
        :key="prontuario.id"
        class="record-card"
        type="button"
        @click="emit('selectProntuario', prontuario.id)"
      >
        <div class="record-main">
          <span class="record-number">{{ prontuario.numero_prontuario || `#${prontuario.id}` }}</span>
          <strong>{{ prontuario.nome_animal || 'Animal sem nome' }}</strong>
        </div>

        <dl class="summary-grid">
          <div>
            <dt>Especie</dt>
            <dd>{{ formatValue(prontuario.especie) }}</dd>
          </div>
          <div>
            <dt>Tutor</dt>
            <dd>{{ formatValue(prontuario.nome_tutor) }}</dd>
          </div>
          <div>
            <dt>Data</dt>
            <dd>{{ formatDate(prontuario.data_procedimento) }}</dd>
          </div>
          <div>
            <dt>Procedimento</dt>
            <dd>{{ formatValue(prontuario.nome_procedimento) }}</dd>
          </div>
          <div>
            <dt>Anestesista</dt>
            <dd>{{ formatValue(prontuario.anestesista_nome) }}</dd>
          </div>
          <div>
            <dt>Clinica</dt>
            <dd>{{ formatValue(prontuario.clinica_nome) }}</dd>
          </div>
        </dl>
      </button>
    </section>
  </main>
</template>
