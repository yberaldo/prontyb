CREATE TABLE anexos_prontuario (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  prontuario_id INT UNSIGNED NOT NULL,
  tipo_anexo ENUM(
    'pdf_monitorizacao',
    'pdf_prontuario_final',
    'outro'
  ) NOT NULL,
  nome_arquivo VARCHAR(255) NOT NULL,
  caminho_arquivo VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  tamanho_bytes BIGINT UNSIGNED NOT NULL,
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_anexos_prontuario_caminho_arquivo (caminho_arquivo),
  KEY idx_anexos_prontuario_tipo (prontuario_id, tipo_anexo),
  CONSTRAINT fk_anexos_prontuario_prontuario
    FOREIGN KEY (prontuario_id) REFERENCES prontuarios_anestesicos(id)
    ON UPDATE CASCADE
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;