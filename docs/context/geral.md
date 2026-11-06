# Referência geral — visão, arquitetura, funcionalidades e regras de não regressão

> Módulo de referência. Ler quando a tarefa tocar arquitetura, persistência ou testes por área.
> Texto preservado do PROJECT_CONTEXT.md original (2192 linhas, escrito pelo Codex), movido sem reescrita em 06/11/2026. Trate como hipótese: confira Git/código antes de confiar. O estado atual e as pendências estão em [PROJECT_CONTEXT.md](../../PROJECT_CONTEXT.md).

## 1. Visão geral

Aldus Reader é um aplicativo de biblioteca, leitura EPUB/PDF e estudo, com importação local,
catálogos pessoais/remotos, organização por conta e sincronização privada preparada.
Stack atual: TypeScript, Expo ~57.0.25, React Native 0.86.3, React 19.2.3,
Expo Router ~57.0.23 e Zustand. Android e Web têm implementações próprias; não presumir
paridade iOS de Drive, OCR, PDF ou sensores. O app exige sessão e perfil ativo para suas
rotas privadas; leitura offline preserva a identidade previamente validada, sem criar login.

Missão integrada: atualizações compatíveis somente no lockfile de transitivas shell-quote
1.10.0→1.12.0, undici 7.29.0→7.30.1, source-map-js 1.2.1→1.2.2 e brace-expansion
2.1.4→2.1.7. Não mudou Expo/RN nem houve audit fix --force. Auditoria npm de 15/10 13:17 BRT:
0 críticos, 58 altos, 12 moderados (70 registros incluindo propagação; não 70 causas únicas).
Restam causas em braces, decode-uri-component, node-forge, postcss-selector-parser e uuid.
Parte exige mudança incompatível/sem patch atual; não fazer downgrade Expo sugerido pelo npm.
O número é snapshot do serviço de advisories, não certificação de ausência de vulnerabilidade.

## 2. Arquitetura

- app/: rotas, tabs, providers e grupos protegidos do Expo Router.
- src/domain/: entidades, contratos de repositórios, casos de uso, âncoras e regras puras.
- src/data/: SQLite/IndexedDB, importadores, EPUB, PDFs derivados, Sources, Drive e Sync.
- src/presentation/: ReaderScreen, adapters, componentes, hooks, contextos e stores.
- src/community/: domínio, aplicação, dados, adapters e apresentação isolados da Community.
- src/admin/: contratos, adapter e apresentação do Aldus Admin; autorização efetiva por RPC.
- modules/: módulos Expo locais aldus-drive-auth e aldus-pdf-ocr.
- supabase/: migrations imutáveis, Edge Functions, inventários read-only, scripts admin e testes.
- Composição: src/presentation/services/dependencies.ts. Reutilizar seus repositories e serviços.
- Native: SQLite kindle-reader.db, schema local v5, arquivos controlados e AsyncStorage.
  Web: IndexedDB kindle-reader-web v6, Blob e transações confirmadas em oncomplete.
  Bancos/chaves kindle-* e @kindle/* são compatibilidade persistida, não branding público.


## 17. Funcionalidades implementadas

Reader EPUB/PDF Original/Reflow, estudo EPUB, organização, importação determinística,
Sources e Drive hierárquico, OCR Android local, Auth/conta/permissões, engine privado de
Library Sync, Flashcards/Study/Battle preparado e Community v0.1 estão conectados no código.
Validação de um módulo não prova os demais: Library/Battle foram implantados segundo o
operador, mas ainda faltam sessões reais; Community remota e novos fluxos Native não têm
validação física nesta campanha. Migração nova de perfil ativo ainda não foi implantada.

15/10: testes EPUB/catálogos/importação, estados/árvore/Drive/Sources, Library SQLite/restart/
files/coordinator/leitura/RLS PGlite, Auth e Community domínio/dados/provider/UI/schema passaram.
UI da Library e export opcional passaram em React; app exportado/Chrome com dois IndexedDB
passou importação offline/reload, metadata-only, upload HTTP fixture, Reader sob demanda,
remoções e conta cruzada. Sources browser passou árvore/fuzzy/offline/rollback/virtualização.
Typecheck, export:web e checagens legais passaram. Supabase/Auth/Drive dos harnesses são
fixtures salvo a sonda pública explicitamente identificada. Nenhum teste físico novo.

Evidência física histórica de 09/10, anterior ao bundle atual: EPUB Freud com controles e
reabertura em 220/631; Ócio Reflow em 5/32; Sociedade Original em 78/169. Amostras reais do
DeviceMotion, overlay e três ciclos foreground/background também foram observados.
Esses resultados superam notas antigas de controles/bytecode/sensor ausentes e evitam
ressuscitar defeitos corrigidos. Não certificam recursos novos, toda matriz de restauração,
rotação/cutout, scroll do painel ou cancelamento final de arquivos grandes.

## 18. Funcionalidades futuras

- Capa personalizada por seleção/arquivo e eventual sync; URL de capa atual continua local.
- Perfis por livro, histórico de navegação, notas de rodapé e overrides EPUB após estabilização.
- Vocabulário/dicionário/tradução/TTS com fontes/motores/licenças adequados.
- Sessões reais de leitura/foreground/inatividade para estatísticas, metas, streak e tempo;
  não derivar páginas lidas de última página nem tempo de lastOpenedDate.
- Mapeamento de estudo PDF Original/Reflow, PDFs duplos/híbridos, camadas de reparo,
  leitura paralela/bilíngue e retomada baseada em trechos recuperáveis.
- Flashcards por capítulos/grifos/livro inteiro com processamento gradual, progresso,
  cancelamento, prévia editável, deduplicação, referências verificáveis e aprovação.
  IA externa somente com ação explícita informando dados enviados/custos; não confundir
  geração local com IA. Export Anki, origem no Reader e sync de revisões ainda pendentes.
- Franquias/assinatura e Admin foram implementados localmente nas seções 6.1/6.2.
  Billing e preços efetivamente cobrados dependem de integração futura explicitamente
  autorizada; não iniciada. Credenciais ficam no servidor; cancelamento de plano não tira
  cartões/revisão/export locais.
- Escala do Sync (cursor/entidades incrementais/TUS), retenção e exclusão de conta;
  social e moderação seguem a seção 13. Nenhum roadmap autoriza implementar outra etapa sozinho.

## 19. Regras de não regressão

Preservar Original/Reflow separados, arquivos pessoais, conta A != B, transações duráveis,
snapshots offline e progresso confirmado. Não remontar viewer ao abrir controles/settings.
Não introduzir timeout maior, delay/spinner ou limpeza de fila como correção causal.
Não publicar HTML/cache/parcial como documento validado nem fonte parcial como índice completo.
Diagnósticos são opt-in/allowlisted, sem tokens, URLs credenciadas, conteúdo ou dados de contas.

Gates gerais: npm run typecheck; npm run export:web; git diff --check.
Por área: node scripts/test-epub-resources.cjs, test-book-import.cjs, test-catalogs.cjs;
test-source-indexing.cjs, test-source-catalog.cjs, test-drive-tree.cjs, test-google-drive.cjs;
test-library-ui.cjs, test-library-organization.cjs e test-library-web.cjs;
test-library-account/sync/files/reading-sync/coordinator/restart/rls.cjs;
test-auth-flows.cjs, test-auth-callback.cjs, test-auth.cjs --auth-only;
test-community-domain/data/provider/ui/schema.cjs. Usar nomes reais expandidos dos scripts.
Se mexer no Reader, executar suas suítes Native/Screen/browser/âncoras e testar EPUB,
Original/Reflow em página intermediária, dez toggles, tipografia, Back/reopen e modo PDF.

Ferramentas de teste ficam em caches ignorados .expo/auth-test-tools (React/test-renderer
19.2.3), .expo/library-db-test (PGlite 0.5.8) e .expo/flashcard-db-test (PGlite/fake-indexeddb).
O ensaio de layout das Preferências usa yoga-layout 3.2.1 em .expo/layout-test, isolado
do app, também instalado pelo CI. Hierarquia nativa e layout não simulam toque físico.
Node 24 fornece node:sqlite. Instalar ferramentas isoladas sem mudar manifests do app.
Browser usa perfil descartável, identidade/HTTP fictícios, IndexedDB real e espera commits;
injetar fixtures só na página principal, preservando sandbox e sem tocar dados do usuário.
Não atribuir PASS a script inexistente ou confundir export/build com Android, conta real ou RLS remoto.
