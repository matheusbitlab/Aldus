# Aldus Reader — Bugs Atuais

Atualizado em 15/10/2026. Branch `integration/comunidade-literaria`.
Baseline da campanha: `2f98b7937d6ea2b47e30d99e03ac1bec0f0d5a9a`.
Somente problemas ativos; remover após validação de resolução. Contexto permanente em PROJECT_CONTEXT.md.

## BUG 01 — Importação EPUB Amêndoas congela

### Prioridade
CRÍTICA.
### Status
IMPLEMENTADO / VALIDAÇÃO ANDROID PENDENTE.
### Sintoma e reprodução
Importar Amêndoas mantém “Lendo arquivo…”; Cancelar não responde. Outro EPUB funciona.
### Evidência e primeira divergência
Mecanismo confirmado no parser: CSS/fontes repetidos por capítulo, concorrência sem limite e ausência de cancelamento interno. O arquivo Amêndoas não foi localizado nesta máquina; causa física PROVÁVEL, não confirmada.
### Causa
CONFIRMADA para a amplificação sintética; INCONCLUSIVA para a primeira chamada física bloqueada.
### Arquivos envolvidos e correção
EpubParserService.ts, EpubTypes.ts, ImportEpubUseCase.ts: cache por parse, fontes compartilhadas no documento, capítulos sequenciais, yield cooperativo e signal até o parser. Sem mudança de schema nem de posição/controles do Reader.
### Testes realizados
Fixture de 91 capítulos: HTML 127.262.661 → 1.422.501 bytes; leituras de fontes 182 → 2; CSS 91 → 1; leituras simultâneas 182 → 1. Baseline 25.767 ms e primeira revisão 1.339 ms sob carga concorrente; revisão final 318 ms e Freud com 26 capítulos em 402 ms, em outra carga desktop. Não é benchmark Android. CSS aninhado/ciclos/ordem de fontes e condições, SVG/imagens, links, serialização e cancelamento PASS. test-book-import, test-catalogs, typecheck e export:web PASS.
### Testes pendentes e dependências externas
Mesmo Amêndoas real; Android, fontes/imagens em WebView, cancelamento e reopen no aparelho. APK PENDENTE DE BUILD CONSOLIDADO.
### Não regredir
Metadados, spine, CSS/fontes offline, imagens/SVG/srcset, links, rollback e isolamento por conta.

## BUG 02 — Library Sync sem contrato remoto

### Prioridade
ALTA.
### Status
BLOQUEADO EXTERNAMENTE.
### Sintoma e reprodução
“37 operações pendentes” e servidor indisponível; contador soma entidades dirty e arquivos.
### Evidência e primeira divergência
Sonda atual de 15/10/2026, 10:58 BRT: user_library_items e user_library_operations retornam 404/PGRST205; profiles retorna 401/42501. GET público do bucket retorna 400/NoSuchBucket, sem provar ausência física. Pull continua anterior a RPC/upload no código.
### Causa
Contrato REST indisponível CONFIRMADO atualmente; migration ausente PROVÁVEL. Sem inventário administrativo não distinguir ausência física, schema/projeto e cache.
### Arquivos envolvidos e correção
SupabaseLibraryAdapter, migrations 202610110001/002 e supabase/audit/02_library_sync_inventory.sql. scripts/audit-library-sync-public.cjs verifica somente metadados públicos, sem linhas/RPC/mutações. Procedimento humano em LIBRARY_SYNC_DEPLOYMENT.md. Nenhuma alteração ao engine/outbox nem SQL remoto.
### Testes realizados
Sonda pública reproduz o bloqueio atual. test-library-sync/files/reading-sync/coordinator/restart PASS com SQLite e fronteiras controladas; test-library-rls PASS em PostgreSQL/PGlite isolado com A/B/anon e fences de Storage. Preservação da fila, idempotência, CAS, isolamento e recuperação verificados. Não equivalem a deploy.
### Testes pendentes e dependências externas
Sem credencial Postgres/CLI/admin nem conexão do plugin Supabase neste ambiente. Operador: executar supabase/audit/01_inventory.sql e 02_library_sync_inventory.sql no projeto configurado, comparar ledger/objetos/ACL/RLS/bucket; aplicar 202610110001 → 202610110002 somente se ausentes e compatíveis, conforme LIBRARY_SYNC_DEPLOYMENT.md. Repetir inventário, HTTP A/B/anon e dois dispositivos. Não apagar as 37 pendências; contagem real do aparelho não foi inspecionada.
### Não regredir
RLS, Storage privado, CAS/recibos/tombstones, ownership e outbox durável; nenhum segredo no cliente.

## BUG 03 — Drive conectando/indexando sem conclusão

### Prioridade
ALTA.
### Status
IMPLEMENTADO / VALIDAÇÃO ANDROID PENDENTE.
### Sintoma e reprodução
Conectar/indexar a raiz 1PwrGP2UiCNGhyhvhDUpszZZwFjfkjaw4 pode não terminar no Android.
### Evidência e primeira divergência
Diagnóstico controlado: source ausente na fila deixa loading; signal do modal não chega ao refresh; falha do catálogo não aparece no modal. Tentativa física sem trace.
### Causa
Estados auxiliares CONFIRMADOS; causa física INCONCLUSIVA.
### Arquivos envolvidos e correção
SourceCatalogService, sourceStore e SourceManagerModal: signal propagado do modal/store ao catálogo; espera por rede/leitura/lookup responde a abort; fonte ausente/alterada termina em erro; cancelamento preserva snapshot anterior. Escrita nativa já iniciada permanece serializada até terminar, sem publicação tardia. Gerenciador oferece Cancelar indexação e mostra erro real do catálogo. Não alterado OAuth/crawler/árvore.
### Testes realizados
test-source-indexing/source-catalog/drive-tree/google-drive PASS: fonte desaparecida, cancelamento externo, Promise ignorando abort, leitura/lookup/save pendentes, writes tardias, snapshots, ciclos, paginação, busca e 500 pastas/5000 livros. Typecheck/export:web PASS. test-source-library-browser PASS no app exportado/IndexedDB real: árvore/breadcrumbs, fuzzy source-wide, importação, reload/offline/erro/rollback, com identidade e HTTP fixtures.
### Testes pendentes e dependências externas
API Drive autorizada e operação física; Google login relatado funcional, sem evidência para reabrir OAuth.
### Não regredir
Raiz, árvore/breadcrumbs, atalhos/ciclos, busca fuzzy local source-wide, snapshot offline e download só por escolha.

## BUG 04 — Backup da organização na Biblioteca

### Prioridade
MÉDIA.
### Status
ABERTO.
### Sintoma, reprodução, evidência e primeira divergência
Library monta o botão/modal de backup na barra de coleções; CONFIRMADO no JSX atual.
### Causa
CONFIRMADA: entrada de UX permanece ativa.
### Arquivos envolvidos e correção
library.tsx, OrganizationBackupModal e legal/data.tsx. Retirar da Biblioteca; preservar portabilidade em Ajustes → Privacidade e Dados.
### Testes realizados / pendentes
Implementação e testes pendentes; conferir isolamento/revisões e organização após reload.
### Dependências externas
Nenhuma para correção controlada.
### Não regredir
Organizar/filtros/coleções/tags/favoritos, armazenamento e journal; exportação manual não é requisito de sync.

## BUG 05 — Botão grande de opções em cada livro

### Prioridade
MÉDIA.
### Status
ABERTO.
### Sintoma, reprodução, evidência e primeira divergência
BookCloudControls repete “Opções de <título>” em cada card; CONFIRMADO no JSX.
### Causa
CONFIRMADA: botão usa texto longo sem limite e padding amplo.
### Arquivos envolvidos e correção
LibrarySyncControls e library.tsx. Manter remoção do dispositivo/conta e confirmações em menu discreto.
### Testes realizados / pendentes
Implementação e testes pendentes; preservar cenários de remoção da suíte Web.
### Dependências externas
Nenhuma para correção controlada; fluxo remoto real depende do BUG 02.
### Não regredir
Guardas de transferência/conta, bundled protegido, tombstone e verificação remota antes de evicção.
