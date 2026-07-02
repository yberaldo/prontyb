CREATE TABLE doses_farmacos (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  farmaco_id INT UNSIGNED NOT NULL,
  rotulo VARCHAR(100) NOT NULL,
  valor DECIMAL(10,4) NOT NULL,
  unidade VARCHAR(30) NOT NULL,
  permite_edicao TINYINT(1) NOT NULL DEFAULT 1,
  ativo TINYINT(1) NOT NULL DEFAULT 1,
  UNIQUE KEY uk_doses_farmacos_farmaco_rotulo (farmaco_id, rotulo),
  KEY idx_doses_farmacos_farmaco_id (farmaco_id),
  CONSTRAINT fk_doses_farmacos_farmaco
    FOREIGN KEY (farmaco_id) REFERENCES farmacos(id)
    ON UPDATE CASCADE
    ON DELETE CASCADE,
  CONSTRAINT ck_doses_farmacos_valor
    CHECK (valor > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;