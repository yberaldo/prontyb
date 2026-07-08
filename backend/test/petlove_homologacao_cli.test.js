'use strict'

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const {
  ErroValidacaoCli,
  criarResumoSanitizado,
  mascararMicrochip,
  validarBaseUrlHttps,
  validarMicrochip
} = require(path.resolve(__dirname, '..', 'scripts', 'petlove_homologacao_cli.js'));

test('mascara microchip sem expor o valor completo', () => {
  assert.equal(mascararMicrochip('ABC123456789XYZ'), 'ABC*********XYZ');
  assert.equal(mascararMicrochip('1234'), '1**4');
  assert.equal(mascararMicrochip('12'), '**');
  assert.notEqual(mascararMicrochip('ABC123456789XYZ'), 'ABC123456789XYZ');
});

test('base URL aceita somente HTTPS sem credenciais, query ou fragmento', () => {
  assert.equal(validarBaseUrlHttps(' https://petlove.invalid/ '), 'https://petlove.invalid');

  for (const baseUrl of [
    '',
    'http://petlove.invalid',
    'https://usuario:segredo@petlove.invalid',
    'https://petlove.invalid?credencial=ficticia',
    'https://petlove.invalid#fragmento'
  ]) {
    assert.throws(() => validarBaseUrlHttps(baseUrl), ErroValidacaoCli);
  }
});

test('microchip e obrigatorio e limitado a 40 caracteres', () => {
  assert.equal(validarMicrochip(' CHIP-FICTICIO-001 '), 'CHIP-FICTICIO-001');
  assert.equal(validarMicrochip('A'.repeat(40)), 'A'.repeat(40));
  assert.throws(() => validarMicrochip('   '), ErroValidacaoCli);
  assert.throws(() => validarMicrochip('A'.repeat(41)), ErroValidacaoCli);
});

test('resumo sanitizado contem apenas presenca, campos permitidos e microchip mascarado', () => {
  const sensiveis = {
    microchip: 'ABC123456789XYZ',
    nome_animal: 'Animal Confidencial',
    especie: 'canina',
    sexo: 'femea',
    peso: 2.5,
    nome_tutor: 'Tutor Confidencial',
    data_nascimento: '2018-05-04',
    petlove_id: 987,
    cookie: 'sessao=ficticia',
    resposta_bruta: '{"segredo":"nao expor"}'
  };

  const resumo = criarResumoSanitizado(sensiveis);
  const serializado = JSON.stringify(resumo);

  assert.deepEqual(resumo, {
    ok: true,
    especie: 'canina',
    sexo: 'femea',
    peso_presente: true,
    nome_animal_presente: true,
    tutor_presente: true,
    nascimento_presente: true,
    microchip_mascarado: 'ABC*********XYZ',
    campos_normalizados: [
      'microchip',
      'nome_animal',
      'especie',
      'sexo',
      'data_nascimento',
      'peso',
      'nome_tutor'
    ]
  });
  assert.equal(serializado.includes('ABC123456789XYZ'), false);
  assert.equal(serializado.includes('Animal Confidencial'), false);
  assert.equal(serializado.includes('Tutor Confidencial'), false);
  assert.equal(serializado.includes('2018-05-04'), false);
  assert.equal(serializado.includes('sessao=ficticia'), false);
  assert.equal(serializado.includes('nao expor'), false);
  assert.equal(serializado.includes('petlove_id'), false);
  assert.equal(serializado.includes('cookie'), false);
  assert.equal(serializado.includes('resposta_bruta'), false);
});
