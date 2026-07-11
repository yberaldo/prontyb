ALTER TABLE monitorizacoes_extraidas
  ADD COLUMN arquivo_sha256 CHAR(64) NULL DEFAULT NULL AFTER anexo_id,
  ADD UNIQUE KEY uk_monitorizacoes_extraidas_prontuario_arquivo_sha256 (prontuario_id, arquivo_sha256);

ALTER TABLE monitorizacao_linhas
  ADD COLUMN data_medicao DATE NULL DEFAULT NULL AFTER monitorizacao_extraida_id,
  ADD UNIQUE KEY uk_monitorizacao_linhas_prontuario_data_horario (prontuario_id, data_medicao, horario);
