CREATE TABLE fluidoterapias_prontuario (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  prontuario_id INT UNSIGNED NOT NULL,
  fluido ENUM(
    'ringer_com_lactato',
    'solucao_fisiologica_09'
  ) NOT NULL,
  taxa_ml_kg_h DECIMAL(10,2) NULL,
  desafio_hidrico_realizado TINYINT(1) NOT NULL DEFAULT 0,
  desafio_volume_ml_kg DECIMAL(10,2) NOT NULL DEFAULT 15.00,
  desafio_tempo_min INT UNSIGNED NOT NULL DEFAULT 15,
  desafio_quantidade INT UNSIGNED NULL,
  desafio_motivo VARCHAR(150) NOT NULL DEFAULT 'Hipotensao por hipovolemia',
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_fluidoterapias_prontuario_id (prontuario_id),
  CONSTRAINT fk_fluidoterapias_prontuario_prontuario
    FOREIGN KEY (prontuario_id) REFERENCES prontuarios_anestesicos(id)
    ON UPDATE CASCADE
    ON DELETE CASCADE,
  CONSTRAINT ck_fluidoterapias_taxa
    CHECK (taxa_ml_kg_h IS NULL OR taxa_ml_kg_h >= 0),
  CONSTRAINT ck_fluidoterapias_desafio_volume
    CHECK (desafio_volume_ml_kg >= 0),
  CONSTRAINT ck_fluidoterapias_desafio_tempo
    CHECK (desafio_tempo_min > 0),
  CONSTRAINT ck_fluidoterapias_desafio_quantidade
    CHECK (desafio_quantidade IS NULL OR desafio_quantidade >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;