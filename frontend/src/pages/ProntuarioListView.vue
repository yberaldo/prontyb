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
const busca = ref('');
const loading = ref(false);
const error = ref<string | null>(null);

async function loadProntuarios(termo = busca.value) {
  loading.value = true;
  error.value = null;

  try {
    prontuarios.value = await listarProntuarios(termo);
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Nao foi possivel carregar os prontuarios.';
  } finally {
    loading.value = false;
  }
}

function buscarProntuarios() {
  void loadProntuarios(busca.value);
}

function limparBusca() {
  busca.value = '';
  void loadProntuarios('');
}

function atualizarProntuarios() {
  void loadProntuarios();
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
        <button class="primary-action" type="button" :disabled="loading" @click="atualizarProntuarios">
          Atualizar
        </button>
      </div>
    </header>

    <section class="content-stack">
      <section class="section-block form-section">
        <form class="content-stack" novalidate @submit.prevent="buscarProntuarios">
          <label class="field field-wide">
            <span>Busca geral</span>
            <input
              v-model="busca"
              autocomplete="off"
              placeholder="Buscar por animal, tutor, procedimento, clinica ou equipe"
              type="search"
            />
          </label>

          <div class="form-actions">
            <button class="secondary-action" type="button" :disabled="loading || !busca.trim()" @click="limparBusca">
              Limpar
            </button>
            <button class="primary-action" type="submit" :disabled="loading">
              Buscar
            </button>
          </div>
        </form>
      </section>

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
