---
name: aldus-sources-drive
description: "Corrigir importação EPUB/PDF, Sources e catálogos pessoais ou Google Drive no Aldus, preservando arquivos, snapshots completos, cancelamento e a separação entre login e autorização Drive."
---

# Importação, Sources e Drive

Leia o [contexto](../../../PROJECT_CONTEXT.md) e os módulos
[importacao-ocr](../../../docs/context/importacao-ocr.md) e [sources-drive](../../../docs/context/sources-drive.md). Para operação/configuração Google, use também
o [procedimento existente](../../../GOOGLE_AUTH_DRIVE_DEPLOYMENT.md), sem tomá-lo como
prova de que uma etapa já ocorreu.

## Importação

- Reutilize `LocalBookImportService` e importadores atuais. Native copia para temporário
  próprio e promove para arquivo controlado; Web persiste Blob. Nunca apague a origem pessoal.
- Não persista `content://` temporário como arquivo definitivo. Falha limpa apenas os
  temporários da operação e compensa/oculta importação incompleta pelo contrato existente.
- `importComplete` só ocorre depois de conteúdo durável. Respeite fases deliberadamente
  não canceláveis de persistência/finalização; abort impede publicar retorno antigo.
- Importação deliberadamente repetida gera outro UUID. Não faça merge por título.
- EPUB preserva metadata/spine/CSS/fontes/imagens/SVG/srcset e sanitização. Cache de recursos
  pertence a um parse; concorrência limitada e yield preservam responsividade. Não remova
  CSS/fontes para disfarçar custo de memória. Native usa bytes assíncronos, sem cópia Base64
  na thread JS. PDF importado não inicia OCR/Reflow automaticamente.
- Percentual exige total confiável de bytes; etapa sem total é indeterminada.

## Sources e catálogos

- Catálogo de uma fonte é separado da biblioteca pessoal. Remover fonte preserva livros
  importados. Vínculo usa IDs reais, não coincidência de título.
- Refresh publica árvore/snapshot completo atomicamente ou mantém o anterior. Erro de
  ramo/resposta inválida não equivale a catálogo vazio/sucesso parcial.
- Listar/pesquisar não baixa EPUB/PDF, não chama Drive por tecla e mantém virtualização.
  Preserve paginação, índice local e cancelamento de indexação.
- CORS de busca e de aquisição são distintos. Não use `no-cors`/proxy para fingir suporte.
  HTML respeita política da fonte; catálogo de pesquisa não vira estante completa por inferência.

## Drive

- Login Google no Supabase autentica o Aldus; Drive usa grant separado. Android usa
  `aldus-drive-auth`/AuthorizationClient e certificado/package reais; Web usa GIS por gesto.
  Scope existente é `drive.readonly`; não amplie escopo nem reutilize provider token de login.
- Grants em memória expiram e são invalidados na troca de conta. Retorno antigo de
  consentimento não autoriza a nova identidade. Snapshots persistidos DEVICE não ganham dono.
- Crawl começa na raiz autorizada e percorre BFS paginada, subpastas/atalhos suportados,
  resource keys e Shared Drives, com proteção de ciclos. Não liste todo o Drive nem exija
  que a conta seja dona de pasta compartilhada. Confirme suporte de atalhos/export antes de anunciar.
- Página pública de pasta não prova `files.list` autenticado. Não reabra configuração OAuth
  sem localizar se a falha é login, grant, raiz, paginação, snapshot ou importação.

Valide importação/cancel/retry, recursos EPUB, árvore/lookup/download e Sources browser
com as suítes de [aldus-validation](../aldus-validation/SKILL.md). Ensaios com pasta/conta
real exigem escopo autorizado e não substituem a fixture. Não exporte livros/arquivos para evidência.
