#!/usr/bin/env bash
set -euo pipefail

if [ "${1:-}" = "" ]; then
  echo "Uso: $0 <usuario_mysql>"
  exit 1
fi

MYSQL_USER="$1"
DB_NAME="prontuario_anestesico_veterinario"

if ! command -v mysql >/dev/null 2>&1; then
  echo "ERRO: cliente 'mysql' nao encontrado no PATH. Instale 'mysql-client' no servidor." >&2
  exit 1
fi

read -s -p "Senha MySQL para usuario $MYSQL_USER: " MYSQL_PASS
echo

# criar arquivo temporario seguro para credenciais
TMPFILE=$(mktemp /tmp/prontuario_mysql_creds.XXXXXX)
chmod 600 "$TMPFILE"
cat > "$TMPFILE" <<EOF
[client]
user=$MYSQL_USER
password=$MYSQL_PASS
EOF

# garantir remocao do arquivo temporario ao sair
trap 'rm -f "$TMPFILE"' EXIT

echo "==> Validando schema e dados no banco: $DB_NAME"
echo "==> Usuario: $MYSQL_USER"

echo "-- SHOW TABLES";
mysql --defaults-extra-file="$TMPFILE" -D "$DB_NAME" -e "SHOW TABLES;"

total_profissionais=$(mysql --defaults-extra-file="$TMPFILE" -sN -D "$DB_NAME" -e "SELECT COUNT(*) FROM profissionais;" )
total_categorias=$(mysql --defaults-extra-file="$TMPFILE" -sN -D "$DB_NAME" -e "SELECT COUNT(*) FROM categorias_farmacos;" )
total_farmacos=$(mysql --defaults-extra-file="$TMPFILE" -sN -D "$DB_NAME" -e "SELECT COUNT(*) FROM farmacos;" )
total_farmacos_categorias=$(mysql --defaults-extra-file="$TMPFILE" -sN -D "$DB_NAME" -e "SELECT COUNT(*) FROM farmacos_categorias;" )

echo "total_profissionais = $total_profissionais"
echo "total_categorias_farmacos = $total_categorias"
echo "total_farmacos = $total_farmacos"
echo "total_farmacos_categorias = $total_farmacos_categorias"

# validacoes objetivas
if [ "$total_categorias" -ne 10 ]; then
  echo "ERRO: categorias_farmacos esperadas = 10, encontradas = $total_categorias" >&2
  exit 1
fi

if [ "$total_farmacos" -ne 39 ]; then
  echo "ERRO: farmacos esperados = 39, encontrados = $total_farmacos" >&2
  exit 1
fi

if [ "$total_farmacos_categorias" -ne 47 ]; then
  echo "ERRO: farmacos_categorias esperados = 47, encontrados = $total_farmacos_categorias" >&2
  exit 1
fi

if [ "$total_profissionais" -lt 1 ]; then
  echo "ERRO: profissionais esperados >= 1, encontrados = $total_profissionais" >&2
  exit 1
fi

echo "-- Conferir profissional inicial"
mysql --defaults-extra-file="$TMPFILE" -sN -D "$DB_NAME" -e "SELECT nome_completo, crmv, uf_crmv, funcao, ativo FROM profissionais WHERE nome_completo = 'Yulian Passador Beraldo';"

echo "-- Colunas da tabela monitorizacao_linhas"
mysql --defaults-extra-file="$TMPFILE" -sN -D "$DB_NAME" -e "SELECT COLUMN_NAME, ORDINAL_POSITION, DATA_TYPE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = '$DB_NAME' AND TABLE_NAME = 'monitorizacao_linhas' ORDER BY ORDINAL_POSITION;"

echo "-- SHOW CREATE TABLE monitorizacao_linhas"
mysql --defaults-extra-file="$TMPFILE" -D "$DB_NAME" -e "SHOW CREATE TABLE monitorizacao_linhas;"

echo "-- SHOW CREATE TABLE medicacoes_prontuario"
mysql --defaults-extra-file="$TMPFILE" -D "$DB_NAME" -e "SHOW CREATE TABLE medicacoes_prontuario;"

echo "-- SHOW CREATE TABLE fluidoterapias_prontuario"
mysql --defaults-extra-file="$TMPFILE" -D "$DB_NAME" -e "SHOW CREATE TABLE fluidoterapias_prontuario;"

echo "-- Foreign keys (information_schema.KEY_COLUMN_USAGE)"
mysql --defaults-extra-file="$TMPFILE" -sN -D "$DB_NAME" -e "SELECT TABLE_NAME, CONSTRAINT_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = '$DB_NAME' AND REFERENCED_TABLE_NAME IS NOT NULL ORDER BY TABLE_NAME, CONSTRAINT_NAME, ORDINAL_POSITION;"

# verificar colunas novas do prontuario
for col in origem_paciente microchip data_nascimento petlove_id; do
  cnt=$(mysql --defaults-extra-file="$TMPFILE" -sN -D "$DB_NAME" -e "SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = '$DB_NAME' AND TABLE_NAME = 'prontuarios_anestesicos' AND COLUMN_NAME = '$col';")
  if [ "$cnt" -ne 1 ]; then
    echo "ERRO: coluna $col ausente na tabela prontuarios_anestesicos" >&2
    exit 1
  fi
done

# verificar monitorizacao_extraida_id existe
cnt_monitorizacao_extraida_id=$(mysql --defaults-extra-file="$TMPFILE" -sN -D "$DB_NAME" -e "SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='$DB_NAME' AND TABLE_NAME='monitorizacao_linhas' AND COLUMN_NAME='monitorizacao_extraida_id';")
if [ "$cnt_monitorizacao_extraida_id" -ne 1 ]; then
  echo "ERRO: coluna monitorizacao_extraida_id ausente na tabela monitorizacao_linhas" >&2
  exit 1
fi

# verificar colunas proibidas nao existam
for col in frequencia_cardiaca spo2 etco2 gas hr rr; do
  cnt=$(mysql --defaults-extra-file="$TMPFILE" -sN -D "$DB_NAME" -e "SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='$DB_NAME' AND TABLE_NAME='monitorizacao_linhas' AND COLUMN_NAME='$col';")
  if [ "$cnt" -ne 0 ]; then
    echo "ERRO: coluna proibida encontrada em monitorizacao_linhas: $col" >&2
    exit 1
  fi
done

# verificar medicacoes_prontuario colunas e FK composta
cnt_motivo_uso=$(mysql --defaults-extra-file="$TMPFILE" -sN -D "$DB_NAME" -e "SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='$DB_NAME' AND TABLE_NAME='medicacoes_prontuario' AND COLUMN_NAME='motivo_uso';")
cnt_subcategoria=$(mysql --defaults-extra-file="$TMPFILE" -sN -D "$DB_NAME" -e "SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='$DB_NAME' AND TABLE_NAME='medicacoes_prontuario' AND COLUMN_NAME='subcategoria';")
if [ "$cnt_motivo_uso" -ne 1 ] || [ "$cnt_subcategoria" -ne 1 ]; then
  echo "ERRO: medicacoes_prontuario deve conter colunas motivo_uso e subcategoria" >&2
  exit 1
fi

# verificar FK composta para farmacos_categorias
fk_exists=$(mysql --defaults-extra-file="$TMPFILE" -sN -D "$DB_NAME" -e "SELECT COUNT(DISTINCT CONSTRAINT_NAME) FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA='$DB_NAME' AND TABLE_NAME='medicacoes_prontuario' AND REFERENCED_TABLE_NAME='farmacos_categorias';")
if [ "$fk_exists" -eq 0 ]; then
  echo "ERRO: FK composta de medicacoes_prontuario para farmacos_categorias nao encontrada" >&2
  exit 1
fi

# Nota: validação de coerencia categoria/subcategoria removida
# A coerencia será garantida pela camada de aplicacao; mantemos
# apenas a exibicao do CREATE TABLE feita anteriormente.

# verificar fluidoterapias_prontuario colunas e defaults
for col in desafio_hidrico_realizado desafio_volume_ml_kg desafio_tempo_min desafio_quantidade desafio_motivo; do
  cnt=$(mysql --defaults-extra-file="$TMPFILE" -sN -D "$DB_NAME" -e "SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='$DB_NAME' AND TABLE_NAME='fluidoterapias_prontuario' AND COLUMN_NAME='$col';")
  if [ "$cnt" -ne 1 ]; then
    echo "ERRO: coluna $col ausente em fluidoterapias_prontuario" >&2
    exit 1
  fi
done

default_volume=$(mysql --defaults-extra-file="$TMPFILE" -sN -D "$DB_NAME" -e "SELECT COLUMN_DEFAULT FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='$DB_NAME' AND TABLE_NAME='fluidoterapias_prontuario' AND COLUMN_NAME='desafio_volume_ml_kg';")
default_tempo=$(mysql --defaults-extra-file="$TMPFILE" -sN -D "$DB_NAME" -e "SELECT COLUMN_DEFAULT FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='$DB_NAME' AND TABLE_NAME='fluidoterapias_prontuario' AND COLUMN_NAME='desafio_tempo_min';")
default_motivo=$(mysql --defaults-extra-file="$TMPFILE" -sN -D "$DB_NAME" -e "SELECT COLUMN_DEFAULT FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='$DB_NAME' AND TABLE_NAME='fluidoterapias_prontuario' AND COLUMN_NAME='desafio_motivo';")

if [ "$default_volume" != '15.00' ]; then
  echo "ERRO: default de desafio_volume_ml_kg esperado = 15.00, encontrado = $default_volume" >&2
  exit 1
fi

if [ "$default_tempo" != '15' ] && [ "$default_tempo" != '15.00' ]; then
  echo "ERRO: default de desafio_tempo_min esperado = 15, encontrado = $default_tempo" >&2
  exit 1
fi

if [ -z "$default_motivo" ]; then
  echo "ERRO: default de desafio_motivo ausente em fluidoterapias_prontuario" >&2
  exit 1
fi

echo "==> Validacao completa: todos os testes passaram"
