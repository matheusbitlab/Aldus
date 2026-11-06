---
name: aldus-validation
description: "Selecionar e executar verificações do Aldus Reader e classificar evidências de código, testes controlados, navegador, backend e Android sem confundir seus alcances."
---

# Validação proporcional à mudança

Leia o [README](../../../README.md), os scripts atuais de [package.json](../../../package.json)
e `scripts/test-critical.cjs`. Contagens de suítes nos registros são históricas; use a
saída da execução atual. Não invente nomes de comandos.

## Preparar o ambiente

- Node 24 é a linha documentada. Num checkout novo, `npm ci` respeita o lockfile e
  `npm run setup:test-tools` prepara ferramentas isoladas em `.expo`. No checkout em uso,
  confira o que falta antes de reinstalar; não altere dependências do app para um harness.
- O preflight indica presença de diretórios, sem certificar versões, integridade ou acesso.
  Dependência ausente é bloqueio de ambiente, não justificativa para esconder um erro de tipo.
- Browser exige export e Chrome/Edge compatível. `scripts/browser-path.cjs` aceita
  `CHROME_PATH`/`CHROMIUM_PATH`. Use perfil isolado e fixture sintética; não abra dados pessoais.
- Consulte o código de um script antes de executar sondas Auth/Supabase, setup de backend,
  QA físico ou comandos com possíveis efeitos externos. O prefixo `test` não garante isolamento.

## Gates e escolha de cenários

Para mudanças funcionais, rode `npm run typecheck`, `npm run test:critical`,
`npm run export:web` e `git diff --check`. Execute sequencialmente tarefas que escrevem
em `dist`/fixtures/perfis comuns. Testes por domínio complementam a matriz geral:

| Mudança | Comandos adicionais pertinentes |
| --- | --- |
| Documento EPUB/Reflow/âncoras | `npm run test:reader:epub:web`; `npm run test:reader:reflow:web`; `npm run test:reader:study:web` |
| PDF Original | `npm run test:reader:pdf:web` |
| Marcações/seleção/backup | `npm run test:reader:markings:web`; `node scripts/test-reading-anchors.cjs`; `node scripts/test-study-storage.cjs` |
| Aparência, concentração e geometria | `npm run test:reader:settings:web`; `npm run test:reader:concentration:web` |
| Biblioteca/organização em lote | `npm run test:library:bulk`; `npm run test:library:bulk:web`; `npm run test:library:web` |
| Conta/Sync/arquivos/progresso | `npm run test:library:account`; `npm run test:library:sync`; `npm run test:library:files`; `npm run test:library:reading`; `npm run test:library:restart` |
| Importação/Drive/Sources | `npm run test:import`; `npm run test:drive`; `npm run test:source-catalog`; `npm run test:source-library:browser` |
| Auth/Community | Suítes `test-auth-*.cjs` e `test-community-*.cjs` selecionadas na matriz crítica |
| SaaS/Admin | `npm run test:saas`; `npm run test:saas:quotas`; `npm run test:admin`; browser `test:saas:web`/`test:admin:web` |
| Landing/legal | `npm run test:marketing`; `npm run test:marketing:web`; `npm run test:legal`; `npm run legal:notices:check` |
| Instruções/skills e seus utilitários | `node scripts/validate-ai-instructions.cjs`; preflight em texto/JSON; `git diff --check` |

Escolha testes adicionais pelo comportamento afetado; não execute todos os browsers por
hábito. O teste de regressão deve observar a falha/contrato, idealmente falhar no baseline
isolado, e não apenas procurar uma string ou repetir a implementação.

## Interpretar o resultado

- `IMPLEMENTADO`: código presente. `VALIDADO`: cenário realmente passou, com revisão,
  ambiente e fronteiras controladas/gerenciadas explicitados.
- `PARCIAL`: parte da matriz passou. `PENDENTE`/`NÃO TESTADO`: falta executar. `BLOQUEADO`:
  dependência concreta impediu o cenário. `INCONCLUSIVO`: ensaio não permite concluir.
- Typecheck/export não provam execução. PGlite/SQLite/HTTP fixture não provam Supabase
  gerenciado. DOM/CSS/props controladas não provam gestos ou persistência Android.
- PDF já carregado offline não prova cold start. Texto CSS 130% não prova font_scale Android.
  Tela com loader não prova Reader pronto; espere documento/layoutReady/ACK pertinentes.
- Falha de seletor/espera/expectativa do harness deve ser registrada e corrigida nele,
  sem anunciar bug do produto resolvido. Preserve evidência de falha e reteste.
- Registre saída real e código de saída; comando iniciado não é PASS. Se houver processo
  em andamento, aguarde conclusão ou registre-o como pendente. Não reutilize logs de outra revisão.

Não execute uma suíte de aplicação por uma alteração exclusivamente documental. Valide
links, frontmatter, utilitários e preservação do worktree. Relate essa limitação no fechamento.
