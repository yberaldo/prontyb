# Contrato Petlove por Microchip - Prontyb

## Estado atual

- O fluxo manual do Prontyb continua funcionando.
- O modo Petlove no frontend exibe apenas o campo de microchip e o botao Buscar.
- O backend possui um client preparatorio, desabilitado por padrao, para o contrato interno observado.
- Sem configuracao valida, a rota responde `503 PETLOVE_NAO_CONFIGURADA`.
- A ativacao depende de configuracao exclusivamente server-side e nao altera o contrato do frontend.

## Decisao tecnica

- Nao existe API oficial publica ou documentada da Petlove disponivel para este projeto.
- O contrato observado deve ser tratado como interno e restrito ao backend.
- Qualquer uso futuro deve ocorrer somente no servidor, com sessao autenticada.
- O frontend nunca deve receber, exibir, salvar ou logar credenciais Petlove.
- Nao tentar burlar CAPTCHA, 2FA, bloqueios, limites ou termos.
- Se houver CAPTCHA, 2FA ou bloqueio, a integracao deve parar e exigir intervencao humana.

## Limites e seguranca

- A integracao futura deve ser server-side only.
- O identificador operacional do fluxo e o `microchip`.
- `petlove_id`, se existir em legado de banco ou resposta interna, deve ser ignorado no fluxo novo.
- O frontend nao deve pedir, mostrar ou enviar `petlove_id`.
- Nao armazenar nem expor cookies, tokens, headers de autenticacao, HTML bruto ou JSON bruto completo da Petlove.
- Nao registrar dados sensiveis em logs aplicacionais.
- A primeira fase deve priorizar minimizacao de dados.

## Endpoint interno observado

- Requisicao observada na Central Petlove apos autenticacao manual:

```http
GET /api/atendimento/{microchip}
```

- Essa chamada retorna JSON com dados do pet.
- Este comportamento deve ser entendido como contrato interno observado, nao como API oficial publica.
- O microchip aparece na URL somente nessa chamada upstream. No contrato publico Prontyb, ele continua sendo enviado exclusivamente no body de `POST /api/petlove/pacientes/buscar-por-microchip`.

## Configuracao backend

- `PETLOVE_BUSCA_HABILITADA`: habilita somente quando tem valor literal `true`.
- `PETLOVE_BASE_URL`: URL base HTTPS do upstream.
- `PETLOVE_AUTH_COOKIE`: cookie ou sessao usado apenas pelo backend.
- `PETLOVE_TIMEOUT_MS`: timeout opcional entre 1000 e 15000 ms; quando ausente, usa o padrao seguro interno.
- Feature flag desligada, URL invalida, cookie ausente ou timeout invalido mantem a busca como nao configurada.
- Nenhum valor de configuracao e registrado em log ou retornado na API.

## Homologacao manual via CLI

O backend possui uma ferramenta isolada para consultar o upstream real manualmente por
SSH, sem iniciar o servidor HTTP, acessar banco ou usar a rota publica:

```sh
cd backend
npm run homologar:petlove
```

O operador informa interativamente a URL base HTTPS, o cookie de autenticacao, o
microchip e, opcionalmente, o timeout entre 1000 e 15000 ms. Em terminal interativo,
a entrada do cookie fica oculta. A ferramenta valida os dados, configura
`PETLOVE_BUSCA_HABILITADA`, `PETLOVE_BASE_URL`, `PETLOVE_AUTH_COOKIE` e
`PETLOVE_TIMEOUT_MS` somente no processo temporario do CLI e carrega o servico de
consulta apenas depois disso.

A saida de sucesso e um resumo sanitizado: especie, sexo, indicadores booleanos de
presenca, microchip mascarado e nomes dos campos normalizados. Nao sao impressos
cookie, URL upstream completa, resposta bruta, `petlove_id`, microchip completo,
nome do animal, nome do tutor ou data de nascimento. Erros exibem somente
`ok=false`, codigo e mensagem sanitizada, sem stack trace.

Cuidados operacionais obrigatorios:

- Nunca colar o cookie em chat, ticket ou mensagem.
- Nunca commitar o cookie ou qualquer outra credencial.
- Nunca colocar o cookie em `.env` local.
- Nao ativar nem alterar o servico systemd antes de concluir a homologacao manual.
- Executar somente em sessao SSH confiavel e encerrar o terminal apos o teste.
- Interromper diante de CAPTCHA, 2FA, bloqueio ou exigencia de intervencao humana.

A ferramenta nao configura producao. A rota publica
`POST /api/petlove/pacientes/buscar-por-microchip` continua respondendo
`503 PETLOVE_NAO_CONFIGURADA` enquanto o ambiente do systemd nao tiver configuracao
valida, incluindo `PETLOVE_BUSCA_HABILITADA=true`.

## Normalizacao campo a campo

### Mapeamento principal

- `microchip` -> `microchip`
  - aplicar `trim`.
  - e o identificador principal do fluxo Petlove no Prontyb.
- `name` -> `nome_animal`
  - aplicar `trim`.
- `race.name` -> `raca`
  - texto livre.
- `race.specie.name` -> `especie`
  - `"Cachorro"` -> `"canina"`
  - `"Gato"` -> `"felina"`
  - outros valores -> erro amigavel bloqueante.
- `sex` -> `sexo`
  - `"Macho"` -> `"macho"`
  - `"Femea"` -> `"femea"`
  - outros valores -> `null` ou campo vazio, sem bloquear.
- `birthday` -> `data_nascimento`
  - preencher em `YYYY-MM-DD`.
  - calcular idade textual no padrao atual do Prontyb.
- `user_name` -> `nome_tutor`
  - aplicar `trim`.
- `userPetWeightHistoric`
  - usar o item mais recente por `created_at`.
  - converter string decimal, como `"2.500"`, para numero `2.5`.
  - se nao houver peso valido, deixar `peso` como `null` ou vazio.
- `petlove_id`
  - campo legado/técnico, ignorado no contrato normalizado novo.
  - nao deve ser solicitado pelo frontend nem usado como entrada do fluxo.
- `plans[0].name`
  - ignorar na primeira fase, salvo decisao futura explicita.

### Exemplo de contrato interno sugerido

```json
{
  "ok": true,
  "dados": {
    "origem_paciente": "petlove",
    "microchip": "<MICROCHIP_FICTICIO>",
    "nome_animal": "<NOME_FICTICIO_PET>",
    "especie": "canina",
    "raca": "<RACA_FICTICIA>",
    "sexo": "femea",
    "data_nascimento": "2018-05-04",
    "idade": "8 anos",
    "peso": 2.5,
    "nome_tutor": "<NOME_FICTICIO_TUTOR>"
  },
  "warnings": [],
  "meta": {
    "fonte": "petlove"
  }
}
```

Observacao: em resposta real do backend, o fluxo novo continua sendo definido pelo `microchip`; `petlove_id`, quando existir por legado, deve ser tratado como tecnico/ignorado.

## Erros amigaveis

- `Microchip nao encontrado na Petlove`
- `Nenhum atendimento encontrado para este microchip`
- `Paciente Petlove sem data de nascimento`
- `Especie Petlove nao suportada`
- `Sessao Petlove expirada`
- `Conta Petlove exige intervencao humana`
- `Petlove exigiu CAPTCHA ou 2FA; operacao interrompida`
- `Falha ao consultar Petlove`
- `Resposta Petlove invalida`

## LGPD e dados que nao devem ser logados

- `microchip` completo
- nome do tutor
- telefone
- data de nascimento
- nome completo do pet quando combinado com outros identificadores
- cookies
- tokens
- headers de autenticacao
- session ids
- resposta JSON completa da Petlove
- HTML bruto da Petlove
- dados de login
- dados de CAPTCHA/2FA
- historico completo de peso

## Fora de escopo

- Configurar ou ativar a integracao em producao.
- Tratar o endpoint observado como API oficial ou estavel.
- Alterar frontend.
- Alterar backend de producao nesta tarefa.
- Alterar banco de dados.
- Criar migration.
- Mexer em `.env`.
- Rodar backend local.
- Rodar `npm start` ou `npm run dev`.
- Usar `curl localhost`.
- Conectar em MySQL local.
- Registrar credenciais, cookies, tokens ou dados reais.
- Tentar contornar CAPTCHA, 2FA, bloqueios ou termos.
## Homologacao manual via CLI

Quando for necessario validar a integracao Petlove manualmente, use a tela de login humana da Central Petlove no navegador:

`https://central-de-saude.petlove.com.br/#/login`

Para o CLI e para o backend, a base tecnica usada deve ser apenas:

`https://central-de-saude.petlove.com.br`

O fluxo continua backend-only e nao deve ser ativado no systemd por padrao.
Cookie nunca deve ser colado em chat, commit, arquivo `.env` local, documentacao ou qualquer outro meio persistente.
Nao salve cookie, token, Authorization, sessao ou microchip em nenhum arquivo.

Enquanto `PETLOVE_BUSCA_HABILITADA=true` nao estiver configurado explicitamente no ambiente do systemd, a rota publica continua respondendo `503` com `PETLOVE_NAO_CONFIGURADA`.
