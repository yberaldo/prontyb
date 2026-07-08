'use strict'

class ErroNormalizacaoPetlove extends Error {
  constructor(message) {
    super(message);
    this.name = 'ErroNormalizacaoPetlove';
    this.code = 'BAD_REQUEST';
  }
}

function falhar(message) {
  throw new ErroNormalizacaoPetlove(message);
}

function ehObjetoValido(valor) {
  return Boolean(valor) && typeof valor === 'object' && !Array.isArray(valor);
}

function trimSeguro(valor) {
  return typeof valor === 'string' ? valor.trim() : '';
}

function normalizarTextoOpcional(valor) {
  const texto = trimSeguro(valor);
  return texto || null;
}

function normalizarEspecie(race) {
  const nomeEspecie = trimSeguro(race && race.specie && race.specie.name)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  if (nomeEspecie === 'cachorro') return 'canina';
  if (nomeEspecie === 'gato') return 'felina';

  falhar('Espécie Petlove nao suportada');
}

function normalizarSexo(valor) {
  const sexo = trimSeguro(valor)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  if (sexo === 'macho') return 'macho';
  if (sexo === 'femea') return 'femea';
  return null;
}

function parseDataNascimento(valor) {
  const texto = trimSeguro(valor);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(texto)) {
    falhar('Paciente Petlove sem data de nascimento');
  }

  const [anoTexto, mesTexto, diaTexto] = texto.split('-');
  const ano = Number(anoTexto);
  const mes = Number(mesTexto);
  const dia = Number(diaTexto);
  const data = new Date(ano, mes - 1, dia);

  if (
    !Number.isInteger(ano) ||
    !Number.isInteger(mes) ||
    !Number.isInteger(dia) ||
    data.getFullYear() !== ano ||
    data.getMonth() + 1 !== mes ||
    data.getDate() !== dia
  ) {
    falhar('Paciente Petlove sem data de nascimento');
  }

  const hoje = new Date();
  const chaveHoje = (hoje.getFullYear() * 10000) + ((hoje.getMonth() + 1) * 100) + hoje.getDate();
  const chaveData = (ano * 10000) + (mes * 100) + dia;
  if (chaveData > chaveHoje) {
    falhar('Paciente Petlove sem data de nascimento');
  }

  return texto;
}

function calcularIdadeTexto(dataNascimento) {
  const partes = dataNascimento.split('-');
  const ano = Number(partes[0]);
  const mes = Number(partes[1]);
  const dia = Number(partes[2]);
  const hoje = new Date();

  let meses = (hoje.getFullYear() - ano) * 12 + ((hoje.getMonth() + 1) - mes);
  if (hoje.getDate() < dia) meses -= 1;
  if (meses < 0) meses = 0;

  if (meses < 12) {
    return meses === 1 ? '1 mes' : `${meses} meses`;
  }

  const anos = Math.floor(meses / 12);
  return anos === 1 ? '1 ano' : `${anos} anos`;
}

function selecionarItemMaisRecente(historico) {
  if (!Array.isArray(historico) || historico.length === 0) return null;

  let escolhido = null;
  let timestampEscolhido = -Infinity;

  for (const item of historico) {
    if (!ehObjetoValido(item)) continue;

    const timestamp = Date.parse(item.created_at);
    if (!Number.isFinite(timestamp)) continue;

    if (timestamp > timestampEscolhido) {
      timestampEscolhido = timestamp;
      escolhido = item;
    }
  }

  return escolhido;
}

function normalizarPeso(raw) {
  if (typeof raw === 'number') {
    return Number.isFinite(raw) && raw > 0 ? raw : null;
  }

  if (typeof raw === 'string') {
    const texto = raw.trim();
    if (!texto) return null;
    if (!/^[+-]?\d+(?:[.,]\d+)?$/.test(texto)) return null;

    const numero = Number(texto.replace(',', '.'));
    if (!Number.isFinite(numero) || numero <= 0) return null;
    return numero;
  }

  return null;
}

function extrairPesoHistorico(historico) {
  const item = selecionarItemMaisRecente(historico);
  if (!item) return null;

  const candidatos = [
    item.weight,
    item.peso,
    item.value,
    item.weight_value,
    item.current_weight
  ];

  for (const candidato of candidatos) {
    const peso = normalizarPeso(candidato);
    if (peso !== null) return peso;
  }

  return null;
}

function extrairPayloadPacientePetlove(payload) {
  if (!ehObjetoValido(payload)) {
    throw new ErroNormalizacaoPetlove('Resposta Petlove invalida', 'BAD_REQUEST');
  }

  if (!Object.prototype.hasOwnProperty.call(payload, 'buscarPorMicrochip')) {
    return payload;
  }

  if (!ehObjetoValido(payload.buscarPorMicrochip)) {
    throw new ErroNormalizacaoPetlove('Resposta Petlove invalida', 'BAD_REQUEST');
  }

  return payload.buscarPorMicrochip;
}

function normalizarPacientePetlove(bruto) {
  bruto = extrairPayloadPacientePetlove(bruto);
  if (!ehObjetoValido(bruto)) {
    falhar('Resposta Petlove invalida');
  }

  const nomeAnimal = trimSeguro(bruto.name);
  if (!nomeAnimal) {
    falhar('Paciente Petlove sem nome do animal');
  }

  const microchip = trimSeguro(bruto.microchip);
  if (!microchip) {
    falhar('Microchip nao encontrado na Petlove');
  }

  const especie = normalizarEspecie(bruto.race);
  const raca = normalizarTextoOpcional(bruto.race && bruto.race.name);
  const sexo = normalizarSexo(bruto.sex);
  const dataNascimento = parseDataNascimento(bruto.birthday);
  const idade = calcularIdadeTexto(dataNascimento);
  const nomeTutor = trimSeguro(bruto.user_name);

  if (!nomeTutor) {
    falhar('Paciente Petlove sem tutor');
  }

  return {
    origem_paciente: 'petlove',
    microchip,
    nome_animal: nomeAnimal,
    especie,
    raca,
    sexo,
    data_nascimento: dataNascimento,
    idade,
    peso: extrairPesoHistorico(bruto.userPetWeightHistoric),
    nome_tutor: nomeTutor
  };
}

module.exports = {
  ErroNormalizacaoPetlove,
  normalizarPacientePetlove
};
