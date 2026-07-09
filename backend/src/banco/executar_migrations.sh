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

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "Pasta do script: $SCRIPT_DIR"

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

# garantir remoção do arquivo temporario ao sair
trap 'rm -f "$TMPFILE"' EXIT

echo "==> Executando: 000_criar_banco.sql"
if ! mysql --defaults-extra-file="$TMPFILE" < "$SCRIPT_DIR/000_criar_banco.sql"; then
  echo "ERRO: falha ao executar 000_criar_banco.sql" >&2
  exit 1
fi

MIGS=(
  "migrations/001_criar_tabela_clinicas.sql"
  "migrations/002_criar_tabela_profissionais.sql"
  "migrations/003_criar_tabela_prontuarios_anestesicos.sql"
  "migrations/004_criar_tabela_categorias_farmacos.sql"
  "migrations/005_criar_tabela_farmacos.sql"
  "migrations/006_criar_tabela_farmacos_categorias.sql"
  "migrations/007_criar_tabela_doses_farmacos.sql"
  "migrations/008_criar_tabela_medicacoes_prontuario.sql"
  "migrations/009_criar_tabela_fluidoterapias_prontuario.sql"
  "migrations/010_criar_tabela_anexos_prontuario.sql"
  "migrations/011_criar_tabela_monitorizacoes_extraidas.sql"
  "migrations/012_criar_tabela_monitorizacao_linhas.sql"
  "migrations/013_adicionar_colunas_cateter_membro_fluidoterapias.sql"
)

for m in "${MIGS[@]}"; do
  path="$SCRIPT_DIR/$m"
  if [ ! -f "$path" ]; then
    echo "ERRO: migration nao encontrada: $path" >&2
    exit 1
  fi
  echo "==> Executando migration: $m"
  if ! mysql --defaults-extra-file="$TMPFILE" "$DB_NAME" < "$path"; then
    echo "ERRO: falha ao executar migration $m" >&2
    exit 1
  fi
done

SEEDS=(
  "seeds/101_seed_profissional_inicial.sql"
  "seeds/102_seed_categorias_farmacos.sql"
  "seeds/103_seed_farmacos_iniciais.sql"
  "seeds/104_seed_farmacos_categorias.sql"
)

for s in "${SEEDS[@]}"; do
  path="$SCRIPT_DIR/$s"
  if [ ! -f "$path" ]; then
    echo "ERRO: seed nao encontrada: $path" >&2
    exit 1
  fi
  echo "==> Executando seed: $s"
  if ! mysql --defaults-extra-file="$TMPFILE" "$DB_NAME" < "$path"; then
    echo "ERRO: falha ao executar seed $s" >&2
    exit 1
  fi
done

# limpar variavel de senha
MYSQL_PASS=""

echo "==> Migrations e seeds executadas com sucesso."
