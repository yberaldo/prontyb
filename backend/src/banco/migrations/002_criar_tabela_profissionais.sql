CREATE TABLE profissionais (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nome_completo VARCHAR(150) NOT NULL,
  crmv VARCHAR(20) NULL,
  uf_crmv CHAR(2) NULL,
  funcao ENUM('cirurgiao', 'anestesista', 'ambos') NOT NULL,
  ativo TINYINT(1) NOT NULL DEFAULT 1,
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_profissionais_crmv_uf (crmv, uf_crmv),
  KEY idx_profissionais_nome (nome_completo),
  KEY idx_profissionais_funcao (funcao)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;