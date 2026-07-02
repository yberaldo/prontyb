# Backend — Fastify

Este diretorio contem a base inicial do backend em Fastify para o projeto
Prontuario Anestesico Veterinario (MVP).

Passos iniciais

1. Copie o exemplo de variaveis de ambiente:

```bash
cp .env.example .env
```

2. Ajuste `.env` com as configuracoes do MySQL e da porta.

3. Instale dependencias e rode em desenvolviento:

```bash
npm install
npm run dev
```

ou em producao:

```bash
npm start
```

Endpoints disponiveis

- `GET /api/saude` — retorna informacoes basicas do servico.
- `GET /api/banco/status` — verifica conexao com o banco (executa `SELECT 1 AS conectado`).

Observacoes

- O plugin do banco usa `mysql2/promise` e registra o pool como `fastify.mysql`.
- CORS esta habilitado com `origin: true` para desenvolvimento; em producao restrinja os origins.
- Nao ha autenticacao nesta camada; validacoes de coerencia entre categoria/subcategoria ficam a cargo da API.
