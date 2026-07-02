CREATE TABLE monitorizacao_linhas (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  prontuario_id INT UNSIGNED NOT NULL,
  monitorizacao_extraida_id INT UNSIGNED NOT NULL,
  horario TIME NULL,
  dados_json JSON NOT NULL,
  ordem INT UNSIGNED NOT NULL DEFAULT 0,
  UNIQUE KEY uk_monitorizacao_linhas_extracao_ordem (monitorizacao_extraida_id, ordem),
  KEY idx_monitorizacao_linhas_prontuario_horario (prontuario_id, horario),
  KEY idx_monitorizacao_linhas_monitorizacao_extraida_id (monitorizacao_extraida_id),
  CONSTRAINT fk_monitorizacao_linhas_prontuario
    FOREIGN KEY (prontuario_id) REFERENCES prontuarios_anestesicos(id)
    ON UPDATE CASCADE
    ON DELETE CASCADE,
  CONSTRAINT fk_monitorizacao_linhas_monitorizacao_extraida
    FOREIGN KEY (monitorizacao_extraida_id) REFERENCES monitorizacoes_extraidas(id)
    ON UPDATE CASCADE
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;