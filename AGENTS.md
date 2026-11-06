# Instruções para IAs — Aldus Reader

Este arquivo orienta qualquer IA que trabalhe neste repositório. O produto é um leitor
EPUB/PDF para Android e Web, em TypeScript, Expo e React Native. Responda ao usuário
em português, salvo pedido diferente. As instruções atuais do usuário prevalecem sobre
estas convenções; documentos antigos não ampliam o escopo autorizado.

## Entrada obrigatória

1. Confirme a raiz com `git rev-parse --show-toplevel`. Neste Windows, o código está em
   `C:\KIndle`; a pasta de conversa `Aldus reader` pode estar vazia e não é outro checkout.
2. Execute `node scripts/ai-project-preflight.cjs`. É uma inspeção local somente leitura:
   não instala dependências, não executa testes, não acessa serviços nem usa aparelho.
3. Leia [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md) inteiro: é a única leitura obrigatória (protocolo,
   estado atual, mapa tarefa→arquivos, pendências, log recente). Abra os módulos de
   `docs/context/` só quando o mapa indicar, lendo por seção. Para correções, leia também a
   entrada pertinente de [BUGS_ATUAIS.md](BUGS_ATUAIS.md). Confira Git/código antes de confiar em registro antigo.
4. Leia a skill [aldus-project-continuity](.agents/skills/aldus-project-continuity/SKILL.md)
   ao iniciar, retomar após interrupção/compactação ou preparar a passagem de trabalho.
   Carregue as demais skills somente quando a tarefa exigir.
5. Identifique objetivo, critérios de aceite, trabalho local preexistente e o próximo
   passo autorizado. Prossiga sem pedir nova confirmação para operações já autorizadas.

## Fontes e manutenção do conhecimento

- `PROJECT_CONTEXT.md`: protocolo, estado atual, arquitetura, matriz de recursos (§5), mapa (§6), pendências, regras de proteção e log
  curto (máx. 5 entradas). `docs/context/*.md`: referência por área; `docs/context/historico/`: cronologia antiga;
  `docs/context/referencias/`: handoffs do ChatGPT e requisitos (hipótese, não prova).
- `BUGS_ATUAIS.md`: problemas ativos, reprodução, limites de validação e bloqueios.
- `README.md`: instalação/execução; `package.json`: comandos reais; código e Git: estado real.
- `AGENTS.md` e `.agents/skills/`: procedimentos reutilizáveis, sem histórico paralelo.
- Evidência recente da mesma revisão/plataforma substitui conclusões antigas sobre o mesmo
  cenário. Os módulos e o histórico em `docs/context/` preservam texto antigo: são hipótese a confirmar no código.
- Não crie novos arquivos de contexto, diagnóstico, handoff ou checkpoint. Atualize os
  documentos oficiais (PROJECT_CONTEXT.md, BUGS_ATUAIS.md e, para decisões permanentes de uma
  área, o módulo em `docs/context/`). Ao fechar, aplique o protocolo do §1 de PROJECT_CONTEXT.md
  (estado, pendências, log, rolamento para `docs/context/historico/`). Use o [modelo de registro](.agents/skills/aldus-project-continuity/references/session-record.md)
  dentro deles; o modelo vazio não é uma terceira fonte de estado.
- `.expo`, `dist` e `artifacts` são regeneráveis/ignorados. Se uma evidência local sumiu,
  registre que não pôde reconferi-la; não reconstrua um PASS por suposição.

## Preservação e limites

- Mapeie `git status --short`, branch, HEAD e diferenças antes de editar. Não assuma
  autoria das mudanças existentes. Preserve arquivos modificados e não versionados.
- Não use reset/clean/stash/descarte ou troca de branch para limpar o ambiente. Não
  reescreva histórico publicado nem faça force push. Stage por caminhos/hunks revisados.
- `main` é a linha oficial atual; a integração Community é histórica. Confirme a branch
  real. Este guia não autoriza commit, push, deploy ou instalação fora do pedido vigente.
  Respeite proteção de branch e autorizações já dadas na sessão, sem perguntar novamente.
- Não misture DesignIdeas/ZIPs, APKs, bancos, livros pessoais, tokens, `.env`, backups ou
  chaves privadas com entregas de código. DesignIdeas é referência, não dependência.
- Alterações remotas de schema/Auth/RLS/OAuth, bootstrap Admin, pagamentos, publicação
  em produção e exportação de dados privados precisam estar no escopo autorizado.
  Uma autorização histórica concluída não autoriza uma nova operação diferente.
- Em auditoria somente leitura, não corrija código, instale ferramentas, compile APK ou
  use aparelho sem que isso faça parte do pedido. Não expanda para Flashcards por associação.
- Não exponha valores de credenciais em logs, comandos, capturas ou respostas. Testes
  usam fixtures/perfis isolados, sem reaproveitar sessão ou biblioteca pessoal.

## Invariantes do produto

- Reutilize a composição em `src/presentation/services/dependencies.ts`, repositórios,
  organização e outbox existentes. Não crie persistência/Sync paralelos.
- Preserve os bancos/chaves legados `kindle-*`/`@kindle/*`; branding público não justifica
  renomeá-los. Conta A e conta B não compartilham dados privados; retornos A→B→A exigem epoch.
- EPUB, PDF Original e PDF Reflow têm caminhos e posições próprios. Controles, tema e
  aparência não remontam o documento nem salvam posições transitórias.
- Âncoras `missing`/`ambiguous` exigem aviso; não navegue silenciosamente. IndexedDB só
  confirma sucesso em `transaction.oncomplete`; erro/abort não é gravação concluída.
- Preserve cancelamento, gerações, tombstones, CAS, recibos idempotentes e outbox durável.
  Não limpe filas/caches ou aumente timeouts como substituto de correção causal.
- NÃO INVENTAR DADOS: métricas/preços/uso/datas/ownership sem fonte confiável ficam
  `null`/indisponíveis. Zero exige medição ou contrato que efetivamente o estabeleça.
- UI em pt-BR, acessível, sóbria e literária. Não acrescente instrumentação, serviço pago
  ou envio de livros a IA externa sem pedido específico.

## Skills locais

| Quando usar | Skill |
| --- | --- |
| Entrada, retomada e fechamento de sessão | [aldus-project-continuity](.agents/skills/aldus-project-continuity/SKILL.md) |
| Seleção de testes e interpretação de evidência | [aldus-validation](.agents/skills/aldus-validation/SKILL.md) |
| Reader, EPUB, Original/Reflow, âncoras e marcações | [aldus-reader-safety](.agents/skills/aldus-reader-safety/SKILL.md) |
| Biblioteca, organização, conta, progresso e Sync | [aldus-library-sync](.agents/skills/aldus-library-sync/SKILL.md) |
| Importação, Sources, catálogos e Drive | [aldus-sources-drive](.agents/skills/aldus-sources-drive/SKILL.md) |
| Community, privacidade e métricas de leitura | [aldus-community](.agents/skills/aldus-community/SKILL.md) |
| Estudo, Flashcards, SRS e Battle, quando solicitados | [aldus-study-flashcards](.agents/skills/aldus-study-flashcards/SKILL.md) |
| Interface, temas, responsividade e acessibilidade | [aldus-interface-review](.agents/skills/aldus-interface-review/SKILL.md) |
| Supabase, Auth, Admin, quotas e operação remota | [aldus-backend-operations](.agents/skills/aldus-backend-operations/SKILL.md) |
| Export, preview, publicação e identidade Web | [aldus-web-delivery](.agents/skills/aldus-web-delivery/SKILL.md) |
| Build, assinatura, entrega e instalação APK | [verify-android-apk-delivery](.agents/skills/verify-android-apk-delivery/SKILL.md) |

As skills são Markdown com frontmatter, versionáveis em `.agents/skills`. Se a IA não
tiver descoberta automática de skills, abra os arquivos indicados manualmente. Não
dependa de memória pessoal, plugin específico ou caminhos da instalação deste usuário.

## Validação e conclusão

Mudanças funcionais exigem os testes pertinentes e os gates gerais `npm run typecheck`,
`npm run test:critical`, `npm run export:web` e `git diff --check`. Consulte a skill de
validação para ambiente, comandos por área e limites. Não execute instalação ou build
pesados apenas para revisar documentação.

Para editar este processo/skills, execute `node scripts/validate-ai-instructions.cjs` e
`git diff --check`. Não use um teste antigo como evidência da revisão atual.

Ao fechar, registre o que mudou, revisão e sujeira relevante, comandos/saídas realmente
observados, limites, bloqueios e próximo passo concreto nos documentos oficiais pertinentes.
Na resposta, diferencie `IMPLEMENTADO`, `VALIDADO` (com ambiente/cenário), `PARCIAL`,
`PENDENTE`, `NÃO TESTADO`, `INCONCLUSIVO` e `BLOQUEADO`. Uma build, um export ou um teste
controlado não comprova funcionamento físico, sessão autenticada nem implantação remota.
