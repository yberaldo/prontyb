'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const cli = require('../scripts/petlove_homologacao_cli.js');

test('base url vazia usa o padrao da Central Petlove', () => {
  assert.equal(
    cli.validarBaseUrlPetlove(''),
    cli.DEFAULT_PETLOVE_BASE_URL,
  );
});

test('base url com fragmento continua rejeitada', () => {
  assert.throws(() => {
    cli.validarBaseUrlPetlove('https://central-de-saude.petlove.com.br/#/login');
  }, /fragmento/i);
});

test('base url com query continua rejeitada', () => {
  assert.throws(() => {
    cli.validarBaseUrlPetlove('https://central-de-saude.petlove.com.br/?a=1');
  }, /query/i);
});

test('base url com credenciais continua rejeitada', () => {
  assert.throws(() => {
    cli.validarBaseUrlPetlove('https://usuario:senha@central-de-saude.petlove.com.br');
  }, /credenciais/i);
});

test('base url http continua rejeitada', () => {
  assert.throws(() => {
    cli.validarBaseUrlPetlove('http://central-de-saude.petlove.com.br');
  }, /https/i);
});

test('resumo sanitizado nao vaza cookie, microchip completo nem petlove_id', () => {
  const resumo = cli.montarResumoSucesso('123456789012345', {
    especie: 'canina',
    sexo: 'F',
    peso: 12.4,
    nome_animal: 'Luna',
    tutor: 'Nome Completo do Tutor',
    data_nascimento: '2020-01-02',
    petlove_id: '123456',
    cookie: 'segredo',
    authorization: 'Bearer secreto',
    resposta: { bruta: true },
  });

  const texto = JSON.stringify(resumo);

  assert.equal(resumo.ok, true);
  assert.equal(resumo.microchip_mascarado.includes('123456789012345'), false);
  assert.equal(texto.includes('segredo'), false);
  assert.equal(texto.includes('123456789012345'), false);
  assert.equal(texto.includes('petlove_id'), false);
  assert.equal(texto.includes('Tutor'), false);
  assert.equal(texto.includes('2020-01-02'), false);
  assert.equal(texto.includes('Bearer'), false);
});

test('mascara microchip sem expor o valor completo', () => {
  const mascarado = cli.mascararMicrochip('123456789012345');

  assert.equal(mascarado.startsWith('123'), true);
  assert.equal(mascarado.endsWith('45'), true);
  assert.equal(mascarado.includes('123456789012345'), false);
});
