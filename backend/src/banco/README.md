# Banco de dados — Migrations e Seeds

Estes scripts foram preparados para serem executados em um servidor Ubuntu Server que já possui MySQL instalado. Não usam Docker.

Requisitos
- Servidor Ubuntu Server com `mysql` (cliente) e servidor MySQL instalados.
- Não é necessário executar nada no Windows local.

Arquivos principais
- `executar_migrations.sh`: executa `000_criar_banco.sql`, as migrations (001..012) e as seeds (101..104).
- `validar_banco.sh`: executa consultas de validação do schema e das seeds.
- `000_criar_banco.sql`: cria a base `prontuario_anestesico_veterinario`.
- `migrations/`: contém as migrations 001 a 012.
- `seeds/`: contém as seeds 101 a 104.

Permissões
Conceda permissão de execucao aos scripts:

```bash
chmod +x backend/src/banco/executar_migrations.sh
chmod +x backend/src/banco/validar_banco.sh
```

Como copiar o projeto para o servidor

Use `scp`, `rsync` ou outro mecanismo para copiar a pasta do projeto para o servidor. Exemplo com `rsync`:

```bash
rsync -av --progress /caminho/local/para/projeto/ usuario@servidor:/caminho/deploy/
```

Executando as migrations e seeds

No servidor, entre na pasta do projeto e execute (exemplo com `root`):

```bash
./backend/src/banco/executar_migrations.sh root
```

O script pedirá a única vez a senha do usuário MySQL no início da execução. Para passar outro usuário, substitua `root` pelo nome desejado:

```bash
./backend/src/banco/executar_migrations.sh nome_do_usuario
```

Observação de segurança: o script cria temporariamente um arquivo `defaults-extra-file` seguro (permissão `600`) contendo as credenciais para evitar múltiplos prompts de senha. Esse arquivo é removido automaticamente ao final da execução ou em caso de erro.

Validando o schema e os dados

Após executar as migrations e seeds, rode o script de validacao (exemplo com `root`):

```bash
./backend/src/banco/validar_banco.sh root
```

O script de validacao também pedirá a senha uma unica vez e usará um arquivo temporario seguro para autenticar ao MySQL durante as consultas.

Contagens esperadas (MVP)
- `profissionais`: pelo menos 1
- `categorias_farmacos`: 10
- `farmacos`: 39
- `farmacos_categorias`: ~47 (relacionamentos)

Observacoes importantes
- Os scripts usam caminhos relativos a partir da propria pasta `backend/src/banco`.
- Os scripts **nao** contem senha fixa e confiam no prompt interativo do cliente `mysql`.
- Não use Docker para esta etapa.
- Não modifique os arquivos SQL gerados sem necessidade.

Se houver qualquer erro ao executar as migrations, o script `executar_migrations.sh` irá parar na primeira falha e mostrar a mensagem de erro retornada pelo cliente MySQL.
