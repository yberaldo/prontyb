# AGENTS.md — Prontyb

Projeto: PWA de prontuário anestésico veterinário.

Stack:
- Frontend: Vue 3 / Vite.
- Backend: Node.js / Fastify.
- Banco: MySQL.
- Repositório: yberaldo/prontyb.

Regras gerais:
- Responder sempre em português.
- Fazer alterações pequenas, focadas e reversíveis.
- Preservar a arquitetura existente e o comportamento atual.
- Antes de alterar código, entender os arquivos relevantes.
- Não fazer commit nem push sem pedido explícito.
- Não alterar .env, segredos, tokens, cookies, Authorization, senhas ou credenciais.
- Nunca exibir segredo completo no chat.
- Não rodar backend local, frontend local, npm start/dev, banco local, Docker, build, npm install ou npm update sem autorização explícita.
- VSCode local deve ser usado apenas para editar código, revisar diff, commitar e fazer push quando autorizado.
- Runtime, banco, Nginx, systemd e endpoints reais são validados somente no servidor por SSH, com comandos explícitos para execução manual pelo usuário.
- Não usar comandos destrutivos, deleção em massa, reset, DROP, TRUNCATE, rm -rf, rsync --delete ou migrations destrutivas sem confirmação explícita.
- Preferir testes unitários/localizados já existentes e comandos seguros.
- Se houver ambiguidade ou risco alto, parar e perguntar antes de agir.

Regras para backend:
- Preservar contratos atuais de API.
- Não quebrar o fluxo manual existente de criação/edição de prontuário.
- Mudanças em integração externa devem ser backend-only quando envolverem credenciais.
- Não introduzir dependências novas sem justificar.

Regras para frontend:
- Preservar layout e UX existentes, salvo pedido explícito.
- Não expor dados sensíveis no frontend.
- Não enviar cookies, tokens ou Authorization de terceiros para o navegador.
- Validar estados de erro de forma clara para o usuário.

Regras para banco:
- Migrations devem ser aditivas sempre que possível.
- Nunca apagar dados sem confirmação explícita.
- Antes de migration em produção, deve existir plano de validação e rollback.
- Não rodar migration real sem autorização explícita.

Integrações externas:
- Integrações externas devem ser backend-only quando envolverem credenciais.
- O frontend nunca deve receber cookie, token ou credencial de terceiros.
- Credenciais e sessoes de terceiros nao devem ser versionadas.
- Nao chamar integracao real sem pedido explicito.
- Testes devem usar mocks/stubs quando possivel.
- O fluxo manual existente deve continuar funcionando.
- Credenciais devem ser tratadas como segredo.
- Nao imprimir cookie ou credenciais em logs.

Resposta final esperada:
- Resumo técnico do que foi feito.
- Arquivos alterados.
- Testes executados ou motivo de não execução.
- Riscos ou pontos de atenção.
- Próximos passos recomendados.
