# Contrato Petlove por Microchip - Prontyb

## Estado atual

- O fluxo manual do Prontyb continua funcionando.
- O modo Petlove no frontend exibe apenas o campo de microchip e o botao Buscar.
- A busca real ainda nao existe no produto.
- Nao ha implementacao oficial da integracao Petlove neste repositorio.
- O que existe hoje e apenas a observacao de um contrato interno de resposta, visto apos login manual e autenticado na Central Petlove.

## Decisao tecnica

- Nao existe API oficial publica ou documentada da Petlove disponivel para este projeto.
- O contrato observado deve ser tratado como interno e restrito ao backend.
- Qualquer uso futuro deve ocorrer somente no servidor, com sessao autenticada.
- O frontend nunca deve receber, exibir, salvar ou logar credenciais Petlove.
- Nao tentar burlar CAPTCHA, 2FA, bloqueios, limites ou termos.
- Se houver CAPTCHA, 2FA ou bloqueio, a integracao deve parar e exigir intervencao humana.

## Limites e seguranca

- A integracao futura deve ser server-side only.
- O cliente comum nao pode enviar `petlove_id` arbitrario para ser aceito como confiavel.
- O valor `petlove_id` somente deve ser aceito quando vier de fluxo confiavel do backend.
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

## Normalizacao campo a campo

### Mapeamento principal

- `id` -> `petlove_id`
  - aceitar somente a partir de fluxo confiavel do backend.
  - nunca aceitar `petlove_id` arbitrario vindo do cliente comum.
- `name` -> `nome_animal`
  - aplicar `trim`.
- `microchip` -> `microchip`
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
- `plans[0].name`
  - ignorar na primeira fase, salvo decisao futura explicita.

### Exemplo de contrato interno sugerido

```json
{
  "ok": true,
  "dados": {
    "origem_paciente": "petlove",
    "petlove_id": 1125114,
    "microchip": "982126*********",
    "nome_animal": "Pet Exemplo",
    "especie": "canina",
    "raca": "Yorkshire Terrier",
    "sexo": "femea",
    "data_nascimento": "2018-05-04",
    "idade": "8 anos",
    "peso": 2.5,
    "nome_tutor": "Tutor Exemplo"
  },
  "warnings": [],
  "meta": {
    "fonte": "petlove"
  }
}
```

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

## Arquivos futuros impactados

Arquivos provaveis de implementacao futura, apenas para referencia:

- `frontend/src/pages/ProntuarioCreateView.vue`
- `frontend/src/types/api.ts`
- `frontend/src/api/prontuarios.ts`
- `backend/src/rotas/prontuarios_anestesicos.rotas.js`
- `backend/src/controladores/prontuarios_anestesicos.controlador.js`
- `backend/src/servicos/prontuarios_anestesicos.servico.js`
- `backend/src/repositorios/prontuarios_anestesicos.repositorio.js`
- `backend/src/servicos/petlove.servico.js`
- eventual rota backend-only para busca por microchip

## Fora de escopo

- Implementar a integracao Petlove.
- Criar endpoint definitivo de producao.
- Criar client HTTP para Petlove.
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
