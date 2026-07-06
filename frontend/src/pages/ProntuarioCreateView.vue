<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { listarClinicas } from '../api/clinicas';
import { listarAnestesistas, listarCirurgioes } from '../api/profissionais';
import { criarProntuario } from '../api/prontuarios';
import type { Clinica, CriarProntuarioPayload, Profissional, ProntuarioAnestesico } from '../types/api';

const emit = defineEmits<{
  back: [];
  created: [prontuario: ProntuarioAnestesico];
}>();

const form = reactive({
  numero_prontuario: '',
  clinica_id: '',
  nome_animal: '',
  especie: '',
  raca: '',
  sexo: '',
  idade: '',
  peso: '',
  nome_tutor: '',
  nome_procedimento: '',
  data_procedimento: '',
  cirurgiao_id: '',
  anestesista_id: '',
  observacoes_pre_anestesicas: '',
});

const clinicas = ref<Clinica[]>([]);
const anestesistas = ref<Profissional[]>([]);
const cirurgioes = ref<Profissional[]>([]);
const loadingOptions = ref(false);
const saving = ref(false);
const finished = ref(false);
const error = ref<string | null>(null);
const successMessage = ref<string | null>(null);

function getErrorMessage(err: unknown, fallback: string) {
  return err instanceof Error ? err.message : fallback;
}

function trimmed(value: string) {
  const text = value.trim();
  return text === '' ? null : text;
}

function optionalId(value: string) {
  return value ? Number(value) : null;
}

function buildPayload(): CriarProntuarioPayload | null {
  const required = [
    ['numero_prontuario', 'Numero do prontuario'],
    ['nome_animal', 'Nome do animal'],
    ['especie', 'Especie'],
    ['nome_tutor', 'Nome do tutor'],
    ['nome_procedimento', 'Procedimento'],
    ['data_procedimento', 'Data do procedimento'],
    ['anestesista_id', 'Anestesista'],
  ] as const;

  for (const [field, label] of required) {
    if (!String(form[field]).trim()) {
      error.value = `${label} e obrigatorio.`;
      return null;
    }
  }

  const peso = trimmed(form.peso);
  if (peso !== null) {
    const parsed = Number(peso.replace(',', '.'));
    if (!Number.isFinite(parsed) || parsed <= 0) {
      error.value = 'Peso deve ser um numero maior que zero.';
      return null;
    }
  }

  const payload: CriarProntuarioPayload = {
    numero_prontuario: form.numero_prontuario.trim(),
    nome_animal: form.nome_animal.trim(),
    especie: form.especie.trim(),
    nome_tutor: form.nome_tutor.trim(),
    nome_procedimento: form.nome_procedimento.trim(),
    data_procedimento: form.data_procedimento,
    anestesista_id: Number(form.anestesista_id),
  };

  const clinicaId = optionalId(form.clinica_id);
  const cirurgiaoId = optionalId(form.cirurgiao_id);
  const raca = trimmed(form.raca);
  const sexo = trimmed(form.sexo);
  const idade = trimmed(form.idade);
  const observacoes = trimmed(form.observacoes_pre_anestesicas);
  const pesoNumber = peso === null ? null : Number(peso.replace(',', '.'));

  if (clinicaId !== null) payload.clinica_id = clinicaId;
  if (cirurgiaoId !== null) payload.cirurgiao_id = cirurgiaoId;
  if (raca !== null) payload.raca = raca;
  if (sexo !== null) payload.sexo = sexo;
  if (idade !== null) payload.idade = idade;
  if (pesoNumber !== null) payload.peso = pesoNumber;
  if (observacoes !== null) payload.observacoes_pre_anestesicas = observacoes;

  return payload;
}

async function loadOptions() {
  loadingOptions.value = true;
  error.value = null;

  try {
    const [clinicasData, anestesistasData, cirurgioesData] = await Promise.all([
      listarClinicas(),
      listarAnestesistas(),
      listarCirurgioes(),
    ]);
    clinicas.value = clinicasData;
    anestesistas.value = anestesistasData;
    cirurgioes.value = cirurgioesData;
  } catch (err) {
    error.value = getErrorMessage(err, 'Nao foi possivel carregar as listas do formulario.');
  } finally {
    loadingOptions.value = false;
  }
}

async function submit() {
  if (saving.value || finished.value) return;

  error.value = null;
  successMessage.value = null;
  finished.value = false;

  const payload = buildPayload();
  if (!payload) return;

  saving.value = true;
  try {
    const criado = await criarProntuario(payload);
    finished.value = true;
    successMessage.value = 'Prontuario criado com sucesso.';
    window.setTimeout(() => emit('created', criado), 350);
  } catch (err) {
    error.value = getErrorMessage(err, 'Nao foi possivel criar o prontuario.');
  } finally {
    saving.value = false;
  }
}

function professionalLabel(profissional: Profissional) {
  const crmv = [profissional.crmv, profissional.uf_crmv].filter(Boolean).join('/');
  return crmv ? `${profissional.nome_completo} - CRMV ${crmv}` : profissional.nome_completo;
}

onMounted(loadOptions);
</script>

<template>
  <main class="app-shell">
    <header class="app-header detail-header">
      <button class="secondary-action" type="button" :disabled="saving || finished" @click="emit('back')">Cancelar</button>
      <div>
        <p class="eyebrow">Novo prontuario</p>
        <h1>Criar prontuario</h1>
      </div>
      <button class="primary-action" type="button" :disabled="saving || loadingOptions || finished" @click="submit">
        {{ saving ? 'Salvando...' : 'Salvar' }}
      </button>
    </header>

    <form class="content-stack" @submit.prevent="submit">
      <p v-if="loadingOptions" class="state-card">Carregando listas do formulario...</p>
      <p v-if="error" class="state-card state-error">{{ error }}</p>
      <p v-if="successMessage" class="state-card state-success">{{ successMessage }}</p>

      <section class="section-block form-section">
        <div class="section-heading">
          <h2>Dados principais</h2>
        </div>

        <div class="form-grid">
          <label class="field">
            <span>Numero do prontuario</span>
            <input v-model="form.numero_prontuario" autocomplete="off" required type="text" />
          </label>

          <label class="field">
            <span>Data do procedimento</span>
            <input v-model="form.data_procedimento" required type="date" />
          </label>

          <label class="field">
            <span>Nome do animal</span>
            <input v-model="form.nome_animal" autocomplete="off" required type="text" />
          </label>

          <label class="field">
            <span>Especie</span>
            <input v-model="form.especie" autocomplete="off" required type="text" />
          </label>

          <label class="field">
            <span>Nome do tutor</span>
            <input v-model="form.nome_tutor" autocomplete="off" required type="text" />
          </label>

          <label class="field">
            <span>Procedimento</span>
            <input v-model="form.nome_procedimento" autocomplete="off" required type="text" />
          </label>

          <label class="field field-wide">
            <span>Anestesista</span>
            <select v-model="form.anestesista_id" :disabled="loadingOptions || anestesistas.length === 0" required>
              <option value="">Selecione</option>
              <option v-for="profissional in anestesistas" :key="profissional.id" :value="String(profissional.id)">
                {{ professionalLabel(profissional) }}
              </option>
            </select>
            <small v-if="!loadingOptions && anestesistas.length === 0">Nenhum profissional encontrado.</small>
          </label>
        </div>
      </section>

      <section class="section-block form-section">
        <div class="section-heading">
          <h2>Dados opcionais</h2>
        </div>

        <div class="form-grid">
          <label class="field">
            <span>Clinica</span>
            <select v-model="form.clinica_id" :disabled="loadingOptions || clinicas.length === 0">
              <option value="">Sem clinica</option>
              <option v-for="clinica in clinicas" :key="clinica.id" :value="String(clinica.id)">
                {{ clinica.nome }}
              </option>
            </select>
            <small v-if="!loadingOptions && clinicas.length === 0">Nenhuma clinica cadastrada.</small>
          </label>

          <label class="field">
            <span>Cirurgiao</span>
            <select v-model="form.cirurgiao_id" :disabled="loadingOptions || cirurgioes.length === 0">
              <option value="">Sem cirurgiao</option>
              <option v-for="profissional in cirurgioes" :key="profissional.id" :value="String(profissional.id)">
                {{ professionalLabel(profissional) }}
              </option>
            </select>
            <small v-if="!loadingOptions && cirurgioes.length === 0">Nenhum profissional encontrado.</small>
          </label>

          <label class="field">
            <span>Raca</span>
            <input v-model="form.raca" autocomplete="off" type="text" />
          </label>

          <label class="field">
            <span>Sexo</span>
            <input v-model="form.sexo" autocomplete="off" type="text" />
          </label>

          <label class="field">
            <span>Idade</span>
            <input v-model="form.idade" autocomplete="off" type="text" />
          </label>

          <label class="field">
            <span>Peso</span>
            <input v-model="form.peso" autocomplete="off" inputmode="decimal" min="0" step="0.001" type="number" />
          </label>

          <label class="field field-wide">
            <span>Observacoes pre-anestesicas</span>
            <textarea v-model="form.observacoes_pre_anestesicas" rows="4" />
          </label>
        </div>
      </section>

      <div class="form-actions">
        <button class="secondary-action" type="button" :disabled="saving || finished" @click="emit('back')">Voltar</button>
        <button class="primary-action" type="submit" :disabled="saving || loadingOptions || finished">
          {{ saving ? 'Salvando...' : 'Salvar' }}
        </button>
      </div>
    </form>
  </main>
</template>
