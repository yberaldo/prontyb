<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { listarClinicas } from '../api/clinicas';
import { listarAnestesistas, listarCirurgioes } from '../api/profissionais';
import { criarProntuario } from '../api/prontuarios';
import type { Clinica, CriarProntuarioPayload, OrigemPaciente, Profissional, ProntuarioAnestesico } from '../types/api';

const RACAS = [
  'Affenpinscher',
  'Afghan hound',
  'Airedale terrier',
  'Akita americano',
  'Akita Inu',
  'American Pit Bull',
  'American staffordshire terrier',
  'Australian cattle dog',
  'Australian silky terrier',
  'Australian terrier',
  'Barbet',
  'Galgo russo/Borzoi',
  'Basenji',
  'Basset Hound',
  'Beagle',
  'Beagle Harrier',
  'Bearded Collie',
  'Beauceron',
  'Bedlington terrier',
  'Bergamasco',
  'Bernese mountain dog',
  'Bichon bolonhês',
  'Bichon Frisé',
  'Bichon havanê',
  'Bichon maltês',
  'Bloodhound',
  'Boerboel',
  'Boiadeiro Bernês',
  'Boiadeiro de Flandres',
  'Border Collie',
  'Boston terrier',
  'Boxer',
  'Braco alemão',
  'Briard',
  'Buldogue americano',
  'Buldogue campeiro',
  'Buldogue francês',
  'Buldogue inglês',
  'Bull Terrier',
  'Bulmastife',
  'Cairn terrier',
  'Cane Corso',
  "Cão d'água português",
  'Cão pelado Mexicano',
  'Cavalier king Charles spaniel',
  'Chihuahua',
  'Chinese cristed dog',
  'Chow Chow',
  'Clumber spaniel',
  'Cocker spaniel americano',
  'Cocker spaniel inglês',
  'Collie',
  'Coton de Tulear',
  'Curly-coated retriever',
  'Dachshund',
  'Dálmata',
  'Dandie Dinmont terrier',
  'Deerhound',
  'Doberman',
  'Dogo argentino',
  'Dogue alemão',
  'Dogue de Bordeaux',
  'Elkhound norueguês',
  'Fila brasileiro',
  'Flat-coated retriever',
  'Fox paulistinha',
  'Fox terrier',
  'Foxhound americano',
  'Golden retriever',
  'Grande Boiadeiro suíço',
  'Greyhound',
  'Harrier',
  'Husky siberiano',
  'Irish wolfhound',
  'Italian greyhound/Pequeno galgo italiano',
  'Jack Russel terrier',
  'Kerry blue terrier',
  'King Charles Spaniel',
  'Komondor',
  'Kuvasz',
  'Labrador retriever',
  'Lakeland terrier',
  'Lhasa apso',
  'Malamute do Alasca',
  'Maltês',
  'Mastiff',
  'Mastim napolitano',
  'Norwich terrier',
  'Old English sheepdog/Bobtail',
  'Outra raça exótica Grande Porte',
  'Outra raça exótica P/M Porte',
  'Papillon',
  'Pastor Alemão',
  'Pastor Alemão Branco',
  'Pastor Australiano',
  'Pastor Belga Groenandel',
  'Pastor Belga Lakinois',
  'Pastor Belga Malinois',
  'Pastor Belga Tervuren',
  'Pastor Branco Suíço',
  'Pastor de Brie',
  'Pastor de Shetland',
  'Pastor dos Pirineus/Cão dos pirineus',
  'Pequeno cão holandês',
  'Pequeno cão leão/Spitz alemão',
  'Pequinês',
  'Perdigueiro alemão',
  'Perdigueiro de Burgos',
  'Perdigueiro português',
  'Pinscher',
  'Pit Bull',
  'Podengo português',
  'Pointer inglês',
  'Poodle standard',
  'Poodle Toy/Microtoy',
  'Pug',
  'Puli',
  'Pumi',
  'Retriever do Labrador',
  'Rhodesian/Ridgeback',
  'Rottweiler',
  'Sabujo',
  'Saluki',
  'Samoyeda',
  'São Bernardo',
  'Schnauzer Gigante',
  'Schnauzer',
  'Scottish terrier',
  'Sealyham terrier',
  'Vira-lata / Sem Raça Definida Grande Porte',
  'Vira-lata / Sem Raça Definida P/M Porte',
  'Setter Gordon',
  'Setter inglês',
  'Setter Irlandês',
  'Shar Pei',
  'Shiba Inu',
  'Shih tzu',
  'Skye terrier',
  'Spaniel Bretão',
  'Spitz alemão',
  'Springer spaniel',
  'Staffordshire bull terrier',
  'Sussex spaniel',
  'Teckel/Daschund',
  'Terranova',
  'Terrier brasileiro de pêlo curto',
  'Terrier tibetano',
  'Tosa',
  'Toy Fox terrier',
  'Toy Manchester terrier',
  'Veadeiro Pampeano',
  'Vizsla',
  'Vulpino Italiano',
  'Weimaraner',
  'Welsh Corgi Cardigan',
  'Welsh Corgi Pembroke',
  'Welsh springer spaniel',
  'West highland white terrier (Westie)',
  'Whippet',
  'Yorkshire terrier',
  'American Bully',
  'Biewer Terrier',
];

const emit = defineEmits<{
  back: [];
  created: [prontuario: ProntuarioAnestesico];
}>();

const form = reactive({
  origem_paciente: 'manual' as OrigemPaciente,
  clinica_id: '',
  nome_animal: '',
  especie: '',
  raca: '',
  sexo: '',
  idade_valor: '',
  idade_unidade: 'anos',
  peso: '',
  nome_tutor: '',
  nome_procedimento: '',
  data_procedimento: '',
  cirurgiao_id: '',
  anestesista_id: '',
  observacoes_pre_anestesicas: '',
  microchip: '',
  data_nascimento: '',
  petlove_id: '',
});

const clinicas = ref<Clinica[]>([]);
const anestesistas = ref<Profissional[]>([]);
const cirurgioes = ref<Profissional[]>([]);
const loadingOptions = ref(false);
const saving = ref(false);
const finished = ref(false);
const error = ref<string | null>(null);
const successMessage = ref<string | null>(null);
const feedbackRef = ref<HTMLElement | null>(null);

function getErrorMessage(err: unknown, fallback: string) {
  return err instanceof Error ? err.message : fallback;
}

function scrollToFeedback() {
  window.setTimeout(() => {
    feedbackRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 0);
}

function setError(message: string) {
  error.value = message;
  successMessage.value = null;
  scrollToFeedback();
}

function textValue(value: unknown) {
  if (value === null || typeof value === 'undefined') return '';
  return String(value).trim();
}

function trimmed(value: unknown) {
  const text = textValue(value);
  return text === '' ? null : text;
}

function optionalId(value: unknown) {
  const text = textValue(value);
  if (!text) return null;
  const id = Number(text);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function calcularIdadePetlove(dataNascimento: unknown) {
  const value = textValue(dataNascimento);
  if (!value) return null;

  const parts = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!parts) return null;

  const year = Number(parts[1]);
  const month = Number(parts[2]);
  const day = Number(parts[3]);
  const date = new Date(year, month - 1, day);
  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day) ||
    date.getFullYear() !== year ||
    date.getMonth() + 1 !== month ||
    date.getDate() !== day
  ) {
    return null;
  }

  const today = new Date();
  const todayKey = (today.getFullYear() * 10000) + ((today.getMonth() + 1) * 100) + today.getDate();
  const birthKey = (year * 10000) + (month * 100) + day;
  if (birthKey > todayKey) return null;

  let months = (today.getFullYear() - year) * 12 + ((today.getMonth() + 1) - month);
  if (today.getDate() < day) months -= 1;
  if (months < 0) months = 0;

  if (months < 12) {
    return months === 1 ? '1 mês' : `${months} meses`;
  }

  const years = Math.floor(months / 12);
  return years === 1 ? '1 ano' : `${years} anos`;
}

function buildIdade() {
  const idadeValor = trimmed(form.idade_valor);
  if (idadeValor === null) return null;

  const valor = Number(idadeValor);
  if (!Number.isSafeInteger(valor) || valor < 1 || valor > 30) {
    setError('Idade deve ser um numero inteiro entre 1 e 30.');
    return undefined;
  }

  if (form.idade_unidade === 'meses') {
    return valor === 1 ? '1 mês' : `${valor} meses`;
  }

  return valor === 1 ? '1 ano' : `${valor} anos`;
}

const idadePetloveCalculada = computed(() => {
  if (form.origem_paciente !== 'petlove') return '';
  return calcularIdadePetlove(form.data_nascimento) || '';
});

function buildPayload(): CriarProntuarioPayload | null {
  const required = [
    ['nome_animal', 'Nome do animal'],
    ['especie', 'Especie'],
    ['nome_tutor', 'Nome do tutor'],
    ['nome_procedimento', 'Procedimento'],
    ['data_procedimento', 'Data do procedimento'],
    ['anestesista_id', 'Anestesista'],
  ] as const;

  for (const [field, label] of required) {
    if (!textValue(form[field])) {
      setError(`${label} e obrigatorio.`);
      return null;
    }
  }

  const especie = textValue(form.especie);
  if (especie !== 'canina' && especie !== 'felina') {
    setError('Selecione uma especie valida.');
    return null;
  }

  const anestesistaId = optionalId(form.anestesista_id);
  if (anestesistaId === null) {
    setError('Selecione um anestesista valido.');
    return null;
  }

  const peso = trimmed(form.peso);
  if (peso !== null) {
    const parsed = Number(peso.replace(',', '.'));
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setError('Peso deve ser um numero maior que zero.');
      return null;
    }
  }

  const payload: CriarProntuarioPayload = {
    nome_animal: textValue(form.nome_animal),
    especie,
    nome_tutor: textValue(form.nome_tutor),
    nome_procedimento: textValue(form.nome_procedimento),
    data_procedimento: textValue(form.data_procedimento),
    anestesista_id: anestesistaId,
  };

  const clinicaId = optionalId(form.clinica_id);
  const cirurgiaoId = optionalId(form.cirurgiao_id);
  const raca = trimmed(form.raca);
  const sexo = trimmed(form.sexo);
  const observacoes = trimmed(form.observacoes_pre_anestesicas);
  const pesoNumber = peso === null ? null : Number(peso.replace(',', '.'));

  if (clinicaId !== null) payload.clinica_id = clinicaId;
  if (cirurgiaoId !== null) payload.cirurgiao_id = cirurgiaoId;
  if (raca !== null) payload.raca = raca;
  if (sexo !== null) payload.sexo = sexo;
  if (pesoNumber !== null) payload.peso = pesoNumber;
  if (observacoes !== null) payload.observacoes_pre_anestesicas = observacoes;

  if (form.origem_paciente === 'petlove') {
    const microchip = trimmed(form.microchip);
    if (microchip === null) {
      setError('Microchip e obrigatorio para paciente Petlove.');
      return null;
    }

    const dataNascimento = trimmed(form.data_nascimento);
    if (dataNascimento === null) {
      setError('Data de nascimento e obrigatoria para paciente Petlove.');
      return null;
    }

    const idadeCalculada = calcularIdadePetlove(dataNascimento);
    if (idadeCalculada === null) {
      setError('Data de nascimento invalida ou futura.');
      return null;
    }

    payload.origem_paciente = 'petlove';
    payload.microchip = microchip;
    payload.data_nascimento = dataNascimento;
    payload.idade = idadeCalculada;

    const petloveId = optionalId(form.petlove_id);
    if (petloveId !== null) payload.petlove_id = petloveId;
    return payload;
  }

  const idade = buildIdade();
  if (typeof idade === 'undefined') return null;
  if (idade !== null) payload.idade = idade;

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
    setError(getErrorMessage(err, 'Nao foi possivel carregar as listas do formulario.'));
  } finally {
    loadingOptions.value = false;
  }
}

async function submit() {
  if (saving.value || finished.value) return;

  error.value = null;
  successMessage.value = null;
  finished.value = false;

  let payload: CriarProntuarioPayload | null = null;
  try {
    payload = buildPayload();
  } catch (err) {
    console.error(err);
    setError('Nao foi possivel preparar os dados do prontuario. Revise os campos e tente novamente.');
    return;
  }

  if (!payload) return;

  saving.value = true;
  try {
    const criado = await criarProntuario(payload);
    finished.value = true;
    successMessage.value = 'Prontuario criado com sucesso.';
    scrollToFeedback();
    window.setTimeout(() => emit('created', criado), 350);
  } catch (err) {
    setError(getErrorMessage(err, 'Nao foi possivel criar o prontuario.'));
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
      <button class="primary-action" form="prontuario-create-form" type="submit" :disabled="saving || loadingOptions || finished">
        {{ saving ? 'Salvando...' : 'Salvar' }}
      </button>
    </header>

    <form id="prontuario-create-form" class="content-stack" novalidate @submit.prevent="submit">
      <p v-if="loadingOptions" class="state-card">Carregando listas do formulario...</p>
      <div v-if="error || successMessage" ref="feedbackRef">
        <p v-if="error" class="state-card state-error">{{ error }}</p>
        <p v-if="successMessage" class="state-card state-success">{{ successMessage }}</p>
      </div>

      <section class="section-block form-section">
        <div class="section-heading">
          <h2>Dados principais</h2>
        </div>

        <div class="form-grid">
          <p class="form-note field-wide">Numero gerado automaticamente ao salvar.</p>

          <label class="field field-wide">
            <span>Paciente Petlove?</span>
            <select v-model="form.origem_paciente">
              <option value="manual">Não Petlove</option>
              <option value="petlove">Petlove</option>
            </select>
          </label>

          <p v-if="form.origem_paciente === 'petlove'" class="form-note field-wide">
            A busca automatica na Petlove sera implementada na proxima etapa. Nesta fase, informe o microchip e confira os dados manualmente.
          </p>

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
            <select v-model="form.especie" required>
              <option value="">Selecione</option>
              <option value="canina">Canina</option>
              <option value="felina">Felina</option>
            </select>
          </label>

          <label class="field">
            <span>Nome do tutor</span>
            <input v-model="form.nome_tutor" autocomplete="off" required type="text" />
          </label>

          <template v-if="form.origem_paciente === 'petlove'">
            <label class="field">
              <span>Microchip</span>
              <input v-model="form.microchip" autocomplete="off" required type="text" />
            </label>

            <label class="field">
              <span>Data de nascimento</span>
              <input v-model="form.data_nascimento" required type="date" />
            </label>

            

            <label class="field">
              <span>Idade calculada</span>
              <input :value="idadePetloveCalculada || 'Nao calculada'" readonly type="text" />
            </label>
          </template>

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
            <input v-model="form.raca" autocomplete="off" list="racas-lista" type="text" />
            <datalist id="racas-lista">
              <option v-for="raca in RACAS" :key="raca" :value="raca" />
            </datalist>
          </label>

          <label class="field">
            <span>Sexo</span>
            <select v-model="form.sexo">
              <option value="">Selecione</option>
              <option value="macho">Macho</option>
              <option value="femea">Fêmea</option>
            </select>
          </label>

          <template v-if="form.origem_paciente === 'manual'">
            <label class="field">
              <span>Idade</span>
              <input v-model="form.idade_valor" autocomplete="off" inputmode="numeric" max="30" min="1" step="1" type="number" />
            </label>

            <label class="field">
              <span>Unidade da idade</span>
              <select v-model="form.idade_unidade">
                <option value="meses">Meses</option>
                <option value="anos">Anos</option>
              </select>
            </label>
          </template>

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
