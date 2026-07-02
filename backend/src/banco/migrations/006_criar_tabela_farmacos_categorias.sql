CREATE TABLE farmacos_categorias (
  farmaco_id INT UNSIGNED NOT NULL,
  categoria_chave VARCHAR(60) NOT NULL,
  PRIMARY KEY (farmaco_id, categoria_chave),
  KEY idx_farmacos_categorias_categoria (categoria_chave, farmaco_id),
  CONSTRAINT fk_farmacos_categorias_farmaco
    FOREIGN KEY (farmaco_id) REFERENCES farmacos(id)
    ON UPDATE CASCADE
    ON DELETE CASCADE,
  CONSTRAINT fk_farmacos_categorias_categoria
    FOREIGN KEY (categoria_chave) REFERENCES categorias_farmacos(chave)
    ON UPDATE CASCADE
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;