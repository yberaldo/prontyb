ALTER TABLE fluidoterapias_prontuario
  ADD COLUMN cateter_utilizado ENUM(
    '24_amarelo',
    '22_azul',
    '20_rosa'
  ) NULL DEFAULT NULL AFTER fluido,
  ADD COLUMN membro_canulado ENUM(
    'membro_anterior_esquerdo',
    'membro_anterior_direito',
    'membro_posterior_direito',
    'membro_posterior_esquerdo'
  ) NULL DEFAULT NULL AFTER cateter_utilizado;
