CREATE TABLE categorias_farmacos (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  chave VARCHAR(60) NOT NULL,
  ativo TINYINT(1) NOT NULL DEFAULT 1,
  ordem INT UNSIGNED NOT NULL DEFAULT 0,
  UNIQUE KEY uk_categorias_farmacos_chave (chave),
  KEY idx_categorias_farmacos_ordem (ordem),
  KEY idx_categorias_farmacos_ativo (ativo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;