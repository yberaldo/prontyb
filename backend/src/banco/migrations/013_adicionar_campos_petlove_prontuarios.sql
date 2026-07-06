ALTER TABLE prontuarios_anestesicos
  ADD COLUMN origem_paciente VARCHAR(20) NOT NULL DEFAULT 'manual' AFTER numero_prontuario,
  ADD COLUMN microchip VARCHAR(40) NULL AFTER origem_paciente,
  ADD COLUMN data_nascimento DATE NULL AFTER microchip,
  ADD COLUMN petlove_id INT UNSIGNED NULL AFTER data_nascimento,
  ADD KEY idx_prontuarios_microchip (microchip);
