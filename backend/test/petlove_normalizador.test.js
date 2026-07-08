'use strict'

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const { normalizarPacientePetlove, ErroNormalizacaoPetlove } = require(path.resolve(__dirname, '..', 'src', 'servicos', 'petlove_normalizador.servico.js'));

function basePacientePetlove() {
  return {
    name: '  Animal Ficticio  ',
    microchip: '  CHIP-FAKE-001  ',
    race: {
      name: '  SRD  ',
      specie: {
        name: 'Cachorro'
      }
    },
    sex: 'Fêmea',
    birthday: '2018-05-04',
    user_name: '  Tutora Ficticia  ',
    userPetWeightHistoric: [
      {
        created_at: '2024-01-02T10:00:00.000Z',
        weight: '1.700'
      },
      {
        created_at: '2024-06-15T10:00:00.000Z',
        weight: '2.500'
      }
    ]
  };
}

function assertErro(callback, mensagem) {
  assert.throws(callback, err => {
    assert.equal(err instanceof ErroNormalizacaoPetlove, true);
    assert.equal(err.code, 'BAD_REQUEST');
    assert.equal(err.message, mensagem);
    return true;
  });
}

test('normaliza paciente feliz com cachorro, femea e peso mais recente', () => {
  const resultado = normalizarPacientePetlove(basePacientePetlove());
  const { idade, ...dados } = resultado;

  assert.deepEqual(dados, {
    origem_paciente: 'petlove',
    microchip: 'CHIP-FAKE-001',
    nome_animal: 'Animal Ficticio',
    especie: 'canina',
    raca: 'SRD',
    sexo: 'femea',
    data_nascimento: '2018-05-04',
    peso: 2.5,
    nome_tutor: 'Tutora Ficticia'
  });

  assert.match(idade, /^\d+\s+(mes|meses|ano|anos)$/);
  assert.equal(Object.prototype.hasOwnProperty.call(resultado, 'petlove_id'), false);
});

test('converte especie Gato para felina', () => {
  const resultado = normalizarPacientePetlove({
    ...basePacientePetlove(),
    race: {
      name: '  Siames  ',
      specie: {
        name: 'Gato'
      }
    }
  });

  assert.equal(resultado.especie, 'felina');
});

test('converte sexo Macho para macho e sexo desconhecido para null', () => {
  const macho = normalizarPacientePetlove({
    ...basePacientePetlove(),
    sex: 'Macho'
  });

  const desconhecido = normalizarPacientePetlove({
    ...basePacientePetlove(),
    sex: 'Indeterminado'
  });

  assert.equal(macho.sexo, 'macho');
  assert.equal(desconhecido.sexo, null);
});

test('raça vazia vira null', () => {
  const resultado = normalizarPacientePetlove({
    ...basePacientePetlove(),
    race: {
      name: '   ',
      specie: {
        name: 'Cachorro'
      }
    }
  });

  assert.equal(resultado.raca, null);
});

test('peso "2.500" vira 2.5', () => {
  const resultado = normalizarPacientePetlove({
    ...basePacientePetlove(),
    userPetWeightHistoric: [
      {
        created_at: '2024-06-15T10:00:00.000Z',
        weight: '2.500'
      }
    ]
  });

  assert.equal(resultado.peso, 2.5);
});

test('usa o peso mais recente por created_at', () => {
  const resultado = normalizarPacientePetlove({
    ...basePacientePetlove(),
    userPetWeightHistoric: [
      {
        created_at: '2024-01-01T10:00:00.000Z',
        weight: '1.100'
      },
      {
        created_at: '2024-07-01T10:00:00.000Z',
        weight: '3.400'
      },
      {
        created_at: '2024-05-01T10:00:00.000Z',
        weight: '2.200'
      }
    ]
  });

  assert.equal(resultado.peso, 3.4);
});

test('ausencia de peso valido retorna null', () => {
  const resultado = normalizarPacientePetlove({
    ...basePacientePetlove(),
    userPetWeightHistoric: [
      {
        created_at: '2024-07-01T10:00:00.000Z',
        weight: 'abc'
      },
      {
        created_at: '2024-06-01T10:00:00.000Z',
        peso: '   '
      }
    ]
  });

  assert.equal(resultado.peso, null);
});

test('normaliza mesmo sem id no payload', () => {
  const resultado = normalizarPacientePetlove(basePacientePetlove());

  assert.equal(resultado.microchip, 'CHIP-FAKE-001');
  assert.equal(Object.prototype.hasOwnProperty.call(resultado, 'petlove_id'), false);
});

test('ignora id invalido no payload sem falhar', () => {
  const resultado = normalizarPacientePetlove({
    ...basePacientePetlove(),
    id: 'abc'
  });

  assert.equal(resultado.microchip, 'CHIP-FAKE-001');
  assert.equal(Object.prototype.hasOwnProperty.call(resultado, 'petlove_id'), false);
});

test('birthday invalido gera erro controlado', () => {
  assertErro(() => normalizarPacientePetlove({
    ...basePacientePetlove(),
    birthday: '04-05-2018'
  }), 'Paciente Petlove sem data de nascimento');
});

test('birthday impossivel gera erro controlado', () => {
  assertErro(() => normalizarPacientePetlove({
    ...basePacientePetlove(),
    birthday: '2018-02-30'
  }), 'Paciente Petlove sem data de nascimento');
});

test('birthday futuro gera erro controlado', () => {
  assertErro(() => normalizarPacientePetlove({
    ...basePacientePetlove(),
    birthday: '2999-01-01'
  }), 'Paciente Petlove sem data de nascimento');
});

test('especie desconhecida gera erro amigavel', () => {
  assertErro(() => normalizarPacientePetlove({
    ...basePacientePetlove(),
    race: {
      name: 'SRD',
      specie: {
        name: 'Ave'
      }
    }
  }), 'Espécie Petlove nao suportada');
});

test('microchip ausente gera erro controlado', () => {
  assertErro(() => normalizarPacientePetlove({
    ...basePacientePetlove(),
    microchip: '   '
  }), 'Microchip nao encontrado na Petlove');
});

test('nome do animal ausente gera erro controlado', () => {
  assertErro(() => normalizarPacientePetlove({
    ...basePacientePetlove(),
    name: '   '
  }), 'Paciente Petlove sem nome do animal');
});

test('tutor ausente gera erro controlado', () => {
  assertErro(() => normalizarPacientePetlove({
    ...basePacientePetlove(),
    user_name: '   '
  }), 'Paciente Petlove sem tutor');
});
