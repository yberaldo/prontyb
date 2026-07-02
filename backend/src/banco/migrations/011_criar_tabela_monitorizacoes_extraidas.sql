CREATE TABLE monitorizacoes_extraidas (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  prontuario_id INT UNSIGNED NOT NULL,
  anexo_id INT UNSIGNED NOT NULL,
  dados_json JSON NULL,
  colunas_json JSON NULL,
  status ENUM(
    'pendente',
    'extraido',
    'revisado',
    'erro'
  ) NOT NULL DEFAULT 'pendente',
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_monitorizacoes_extraidas_anexo_id (anexo_id),
  KEY idx_monitorizacoes_extraidas_prontuario_status (prontuario_id, status),
  CONSTRAINT fk_monitorizacoes_extraidas_prontuario
    FOREIGN KEY (prontuario_id) REFERENCES prontuarios_anestesicos(id)
    ON UPDATE CASCADE
    ON DELETE CASCADE,
  CONSTRAINT fk_monitorizacoes_extraidas_anexo
    FOREIGN KEY (anexo_id) REFERENCES anexos_prontuario(id)
    ON UPDATE CASCADE
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;