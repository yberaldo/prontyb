CREATE TABLE medicacoes_prontuario (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  prontuario_id INT UNSIGNED NOT NULL,
  categoria ENUM(
    'pre_anestesica_sedativo',
    'pre_anestesica_opioide',
    'inducao',
    'manutencao',
    'trans_anestesica'
  ) NOT NULL,
  subcategoria VARCHAR(60) NOT NULL,
  farmaco_id INT UNSIGNED NOT NULL,
  dose_selecionada VARCHAR(100) NULL,
  dose_digitada DECIMAL(10,4) NULL,
  unidade VARCHAR(30) NULL,
  motivo_uso VARCHAR(150) NULL,
  ordem INT UNSIGNED NOT NULL DEFAULT 0,
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_medicacoes_prontuario_ordem (prontuario_id, categoria, ordem),
  KEY idx_medicacoes_prontuario_farmaco (farmaco_id),
  CONSTRAINT fk_medicacoes_prontuario_prontuario
    FOREIGN KEY (prontuario_id) REFERENCES prontuarios_anestesicos(id)
    ON UPDATE CASCADE
    ON DELETE CASCADE,
  CONSTRAINT fk_medicacoes_prontuario_farmaco_subcategoria
    FOREIGN KEY (farmaco_id, subcategoria)
    REFERENCES farmacos_categorias(farmaco_id, categoria_chave)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT ck_medicacoes_prontuario_dose_digitada
    CHECK (dose_digitada IS NULL OR dose_digitada > 0),
  CONSTRAINT ck_medicacoes_prontuario_categoria_subcategoria
    CHECK (
      (categoria = 'pre_anestesica_sedativo' AND subcategoria = 'tranquilizantes_sedativos')
      OR (categoria = 'pre_anestesica_opioide' AND subcategoria = 'opioides')
      OR (categoria = 'inducao' AND subcategoria = 'inducao')
      OR (categoria = 'manutencao' AND subcategoria = 'manutencao')
      OR (
        categoria = 'trans_anestesica'
        AND subcategoria IN (
          'analgesia',
          'vasopressores_inotropicos',
          'anticolinergicos',
          'antiemeticos',
          'reversores',
          'outros'
        )
      )
    )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;