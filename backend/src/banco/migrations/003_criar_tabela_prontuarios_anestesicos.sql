CREATE TABLE prontuarios_anestesicos (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  numero_prontuario VARCHAR(40) NOT NULL,
  clinica_id INT UNSIGNED NULL,
  nome_animal VARCHAR(150) NOT NULL,
  especie VARCHAR(50) NOT NULL,
  raca VARCHAR(100) NULL,
  sexo VARCHAR(20) NULL,
  idade VARCHAR(50) NULL,
  peso DECIMAL(8,3) NULL,
  nome_tutor VARCHAR(150) NOT NULL,
  nome_procedimento VARCHAR(150) NOT NULL,
  data_procedimento DATE NOT NULL,
  cirurgiao_id INT UNSIGNED NULL,
  anestesista_id INT UNSIGNED NOT NULL,
  observacoes_pre_anestesicas TEXT NULL,
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_prontuarios_numero_prontuario (numero_prontuario),
  KEY idx_prontuarios_clinica_id (clinica_id),
  KEY idx_prontuarios_nome_animal (nome_animal),
  KEY idx_prontuarios_nome_tutor (nome_tutor),
  KEY idx_prontuarios_data_procedimento (data_procedimento),
  KEY idx_prontuarios_cirurgiao_id (cirurgiao_id),
  KEY idx_prontuarios_anestesista_id (anestesista_id),
  CONSTRAINT fk_prontuarios_clinica
    FOREIGN KEY (clinica_id) REFERENCES clinicas(id)
    ON UPDATE CASCADE
    ON DELETE SET NULL,
  CONSTRAINT fk_prontuarios_cirurgiao
    FOREIGN KEY (cirurgiao_id) REFERENCES profissionais(id)
    ON UPDATE CASCADE
    ON DELETE SET NULL,
  CONSTRAINT fk_prontuarios_anestesista
    FOREIGN KEY (anestesista_id) REFERENCES profissionais(id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT ck_prontuarios_peso
    CHECK (peso IS NULL OR peso > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;