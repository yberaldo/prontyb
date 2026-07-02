INSERT INTO farmacos_categorias (farmaco_id, categoria_chave)
SELECT id, 'tranquilizantes_sedativos'
FROM farmacos
WHERE nome IN (
  'Acepromazina',
  'Dexmedetomidina',
  'Xilazina',
  'Ketamina'
);

INSERT INTO farmacos_categorias (farmaco_id, categoria_chave)
SELECT id, 'opioides'
FROM farmacos
WHERE nome IN (
  'Metadona',
  'Morfina',
  'Petidina',
  'Tramadol'
);

INSERT INTO farmacos_categorias (farmaco_id, categoria_chave)
SELECT id, 'inducao'
FROM farmacos
WHERE nome IN (
  'Propofol',
  'Ketamina',
  'Fentanil',
  'Lidocaina',
  'Isoflurano',
  'Sevoflurano'
);

INSERT INTO farmacos_categorias (farmaco_id, categoria_chave)
SELECT id, 'manutencao'
FROM farmacos
WHERE nome IN (
  'Isoflurano',
  'Sevoflurano',
  'Propofol TIVA',
  'Dexmedetomidina CRI',
  'Ketamina CRI',
  'Lidocaina CRI',
  'Fentanil CRI',
  'Remifentanil CRI'
);

INSERT INTO farmacos_categorias (farmaco_id, categoria_chave)
SELECT id, 'analgesia'
FROM farmacos
WHERE nome IN (
  'Fentanil',
  'Lidocaina',
  'Ketamina',
  'Metadona',
  'Morfina',
  'Buprenorfina'
);

INSERT INTO farmacos_categorias (farmaco_id, categoria_chave)
SELECT id, 'vasopressores_inotropicos'
FROM farmacos
WHERE nome IN (
  'Efedrina',
  'Noradrenalina',
  'Dopamina',
  'Dobutamina',
  'Fenilefrina',
  'Adrenalina'
);

INSERT INTO farmacos_categorias (farmaco_id, categoria_chave)
SELECT id, 'anticolinergicos'
FROM farmacos
WHERE nome IN (
  'Atropina',
  'Glicopirrolato'
);

INSERT INTO farmacos_categorias (farmaco_id, categoria_chave)
SELECT id, 'antiemeticos'
FROM farmacos
WHERE nome IN (
  'Maropitant',
  'Ondansetrona',
  'Metoclopramida'
);

INSERT INTO farmacos_categorias (farmaco_id, categoria_chave)
SELECT id, 'reversores'
FROM farmacos
WHERE nome IN (
  'Atipamezol',
  'Ioimbina',
  'Naloxona',
  'Flumazenil'
);

INSERT INTO farmacos_categorias (farmaco_id, categoria_chave)
SELECT id, 'outros'
FROM farmacos
WHERE nome IN (
  'Dexametasona',
  'Hidrocortisona',
  'Gluconato de calcio',
  'Bicarbonato de sodio'
);