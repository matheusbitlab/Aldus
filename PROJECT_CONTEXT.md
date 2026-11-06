# Aldus Reader — Contexto do Projeto

Única leitura obrigatória por tarefa. Detalhes por área: `docs/context/` (só a seção que o mapa §6 indicar).
Histórico: `docs/context/historico/`. Requisitos/hipóteses de outras IAs: `docs/context/referencias/`.
Bugs ativos: [BUGS_ATUAIS.md](BUGS_ATUAIS.md). Regras de IA e limites: [AGENTS.md](AGENTS.md).
Reescrito em 06/11/2026 a partir do código (main `f61a0c8`), não só do texto do Codex.

**Ordem de confiança:** código/config/migrations/testes > este arquivo > `docs/context/*` e BUGS_ATUAIS.md >
`docs/context/referencias/` (handoffs do ChatGPT, snapshots de 02–20/10 e prompts: hipótese/requisito, nunca prova).

## 1. Protocolo de cada tarefa

1. `git status --short`, `git branch --show-current`, `git rev-parse HEAD`. Há untracked de terceiros (§3): preserve-os e
   faça stage só dos caminhos que você editou (`git add <caminho>`; nunca `-A`/`.`).
2. Leia este arquivo; abra no máximo os módulos que o mapa (§6) indicar, por seção. Use `rg -n` por símbolo antes de abrir
   arquivos grandes (`ReaderScreen.tsx` 1191 linhas, `EpubReaderDocument.ts` 755, `library.tsx` 658).
3. Edite o mínimo. Valide (§7): `npm run typecheck`, as suítes da área e, em mudança funcional, `npm run test:critical`,
   `npm run export:web`, `git diff --check`. Nunca declare PASS sem ter executado; diga o que não foi executado.
4. **Fechamento** (no mesmo commit local do código, só se o usuário pediu commit): atualizar **§3 Estado atual**, **§8 Pendências**
   e uma nova entrada no topo de **§10 Log** (máx. 5 entradas; mova as mais antigas, sem editar, para
   `docs/context/historico/AAAA-MM-DD-<tema>.md`). Mudou o estado de um recurso → corrija a matriz §5. Bug novo/resolvido →
   BUGS_ATUAIS.md. Decisão permanente de uma área → módulo em `docs/context/`.
5. Resposta ao usuário em pt-BR, curta: o que mudou, onde, validação (comando e resultado reais), próximo passo. Use
   IMPLEMENTADO / VALIDADO / PARCIAL / PENDENTE / NÃO TESTADO / INCONCLUSIVO / BLOQUEADO.

Não criar outros arquivos de contexto/handoff/checkpoint. `node scripts/validate-ai-instructions.cjs` ao editar
AGENTS.md/skills. `scripts/test-legal.cjs` exige que este arquivo mantenha o tratamento técnico de Batalha + Supabase (§4).

## 2. Produto e stack (conferido em package.json/app.json)

Leitor EPUB/PDF e estudo, Android + Web, pt-BR (antigo Kindle Reader). `aldus-reader` 1.0.0-beta.2, Android
`com.aldus.reader` versionCode 3 (handoffs antigos dizem `com.kindle.reader`: obsoleto), scheme `aldus`. Expo ~57.0.25,
React Native 0.86.3, React 19.2.3, expo-router (typedRoutes), Zustand 5, expo-sqlite, WebView 13, pdfjs-dist 6, jszip,
three (landing); nativewind/tailwind instalados mas a UI real usa StyleSheet + `src/theme`. TypeScript ~6.0.3, Node 24.
Backend: Supabase (Auth, Postgres/RLS, Storage, Edge Function `username-login`). Web via Vercel; Android via Gradle local
(`android/` versionado) ou EAS. iOS não é alvo. Remoto Git: `origin` = `github.com/matheusbitlab/Aldus` (branch oficial `main`).

Persistência (legado mantido, não renomear `kindle-*`/`@kindle/*`): Native SQLite `kindle-reader.db` (migrations v1–v5 em
`src/data/database/migrations/MigrationRunner.ts`) + AsyncStorage + arquivos; Web IndexedDB `kindle-reader-web` v6
(`webLibraryStore.ts`). Flashcards: `@kindle/flashcards.v1:<UUID>` / `kindle-flashcards.db` / IndexedDB `kindle-flashcards`.

## 3. Estado atual (verificado em 06/11/2026)

- Git: `main`, HEAD de referência `f61a0c8` (o commit deste registro vem depois). Untracked de terceiros, **não commitar**:
  `DesignIdeas/` e `DesignIdeas.zip` (referência visual) e `aldus-context.zip` (pacote de contexto externo; seu conteúdo útil — os
  dois handoffs do ChatGPT — foi copiado para `docs/context/referencias/`). Arquivos na raiz ignorados: `Livros/`, `debug-reflow-*`,
  `artifacts/`, `dist/`, `.expo/`.
- Validação local de 06/11 (HEAD `f61a0c8`): `npm run typecheck` PASS; `npm run test:critical` 87/87 PASS. Última rodada Web mais
  ampla (código `ea0b1ec`, igual ao UX atual): `export:web` PASS e 8 suítes Chromium PASS (`test:source-library:browser`,
  `test:library:bulk:web`, `test:library:web`, `test:saas:web`, `test:admin:web`, `test:reader:browser`, `test:reader:settings:web`,
  `test:reader:markings:web`). Nesta sessão **não** foram reexecutados export nem Chromium.
- Não verificável pelo código (vem só de registros em `historico/` e BUGS_ATUAIS.md): Supabase remoto (migrations aplicadas,
  Auth/OAuth, deploy de `username-login`, OWNER do Admin), Vercel, Redmi, APKs. Último APK/preview documentados (24/10) são do
  código `00b6e4d`, **não** do HEAD. Nada de Android físico, Supabase real, deploy ou APK foi exercitado em 06/11.
- Bugs EPUB "center reset" e "restauração de progresso": ver §5 e `docs/context/referencias/bugs-epub-center-reset-e-restore.md`.

## 4. Arquitetura (resumo) e invariantes

Camadas: `app/` (rotas Expo Router) → `src/presentation` (telas, componentes, contextos, stores Zustand) → `src/domain`
(entidades, contratos de repositório, usecases, regras puras) → `src/data` (SQLite/IndexedDB, importadores, EPUB, Sources, Drive,
Sync, Supabase). `src/community` e `src/admin` são verticais próprias (domain/application/data/presentation). Também: `src/legal`,
`src/marketing` (landing), `src/theme` (tokens, appUi), `src/utils` (diagnósticos opt-in), `modules/aldus-drive-auth` e
`modules/aldus-pdf-ocr` (Kotlin), `supabase/` (10 migrations imutáveis, `functions/username-login`, `admin/`, `audit/`, `tests/`).
Composição única: `src/presentation/services/dependencies.ts` — repositórios por plataforma (`Sqlite*` vs `IndexedDb*`, por
`Platform.OS`), embrulhados por `AccountBookRepository`/`scopeBookData` (escopo de conta) e `journal*` (outbox) →
`LibrarySyncService` + `LibraryLocalReplica`. **Reutilize essa composição; não crie persistência/Sync paralelos.** Arquivos
`.web`/`.native` (viewers, OCR, thumbnails, storage) são implementações separadas: leia as duas.
Providers (`app/_layout.tsx`): AppTheme → SafeArea → Auth → ReaderSettings; `AuthGuard` protege rotas privadas (sessão + perfil
ativo do mesmo UUID). Rotas: `(tabs)` library/search/study/settings; `reader/[bookId]`, `reader/web`; `sources`,
`services/[provider]`; `decks/[deckId]`, `study/[deckId]`, `battle`; `auth/*`; `account/*`; `community/*`; `plan/*`; `admin`; `legal/*`;
`preferences`, `support`; `index.web.tsx` = landing.

### Invariantes (violar = regressão)
- EPUB, PDF Original e PDF Reflow têm posições independentes; controles/tema/fonte/brilho **não** remontam o documento nem salvam
  posição transitória. Restauração só após `layoutReady` + ACK (`reflowRestoreState`). Controles são overlay estável: nunca mover o
  documento de ancestral por `controlsVisible` (causa do reset no Reflow). Página 1 legítima não é filtrada globalmente.
- Âncora `missing`/`ambiguous` → aviso, nunca navegação silenciosa. Posição textual EPUB/Reflow vive em `progress.cfiPosition`
  como envelope versionado (não é CFI real).
- IndexedDB: sucesso só em `transaction.oncomplete`. Preserve cancelamento/gerações, tombstones, CAS, recibos idempotentes, outbox
  durável; conta A≠B, retorno A→B→A exige epoch. Não limpar fila/cache nem subir timeout como "correção".
- NÃO INVENTAR DADOS: sem fonte confiável, `null`/indisponível; zero só com medição.
- Helpers enviados a WebView são código literal (`Function.toString` do Hermes não serve).
- Sources/UserSources ainda são **device-scoped** (chave global `kindle-reader.user-sources.v1`, BUG 12).
- Batalha de Flashcards só envia o deck escolhido ao Supabase quando habilitada (RPC `public.flashcard_battle`, pontuação e gabarito
  no servidor); estudo individual é local. Tratamento legal em `docs/context/legal-build-git.md`; contrato em `community-estudo.md`.
- UI pt-BR, sóbria, acessível; sem instrumentação, serviço pago ou envio de livros a IA externa sem pedido explícito.

## 5. Matriz de recursos (classificação com evidência, 06/11/2026)

Legenda: **IVER** = implementado e verificado (suíte/execução citada); **ISVS** = implementado sem validação suficiente;
**PARC** = parcial; **PLAN** = planejado/especificação; **PROP** = proposta não aprovada; **DESC** = desconhecido.
"Local" = Node/PGlite/Chromium controlado; nada disto prova Android físico, sessão autenticada ou deploy.

| Recurso | Classe | Evidência e limite |
| --- | --- | --- |
| Reader EPUB | IVER (Web) / físico até `c382f99` | `EpubReaderDocument.ts`, `EpubPageViewer.*`; `test-reader-{screen,navigation,location,native}`, `test-reading-anchors` (critical); `test:reader:{browser,epub:web}`; Redmi 23/10 (EPUB 4 categorias, restauração 15→16→15). HEAD atual não reexecutado no aparelho. |
| PDF Original | IVER (Web) / físico PARC | `PdfPageViewer.*`; `test:reader:pdf:web`; Redmi 23/10 em `53b4e32`. Seleção/grifos PDF e repetição na build atual pendentes. |
| PDF Reflow | IVER (Web) / Android PARC | `PdfReflowProcessor.*`, `PdfReflowDocumentBuilder.ts`, cache SQLite/IndexedDB; `test-pdf-reflow`, `test-reflow-*` (critical), `test:reader:reflow:web`. BUG 06: livro grande lento (584 págs ≈3m32 no Redmi, observação pontual). |
| Bug EPUB/Reflow "center reset" | Reflow: causa CONFIRMADA e corrigida (estrutural); EPUB: relato NÃO reproduzido | `ReaderScreen.tsx` ≈L1043-1052; `test-reader-screen.cjs` (10 toggles, mocks) e `test-reader-browser.cjs`. Sem confirmação do usuário no ambiente real. Sem entrada em BUGS_ATUAIS.md. |
| Bug restauração de progresso (era Reflow 1↔11) | Causa CONFIRMADA; handshake implementado; validação PARC | `ReaderScreen.tsx` L128/L769-822; sem teste Chromium dedicado de reabertura Reflow com total mudando; Redmi validou EPUB. |
| Marcações (grifos/marcadores) | IVER (Web) / físico PENDENTE | `StudyPanelControls.tsx`, `Study{Bookmarks,Highlights}.ts`; `test-study-storage`, `test:reader:markings:web`, `test:reader:study:web`. Seleção por toque no Android não homologada. |
| Biblioteca/organização/lote | IVER (local) | `library.tsx`, `OrganizeLibrarySelection.ts`; `test:library:*` (bulk, web, 1000 livros). |
| Importação EPUB/PDF + OCR | IVER (local); BUG 01 VALIDADO FÍSICO (Amêndoas); OCR Android ISVS | `LocalBookImportService.ts`, `src/data/epub/*`, `modules/aldus-pdf-ocr`; `test-book-import`, `test-epub-*`, `test-pdf-ocr`. |
| Flashcards, Estudo (4 respostas, SRS, sessões) | IVER (local); sem aparelho | `src/domain/study/flashcard{Scoring,Srs}.ts`, `components/flashcards/*`, `flashcardStorage.*`; `test-flashcard-{scoring,sessions,storage,ui}`, `test-flashcards` (critical). Pontuação +10/+5/−5/−10 é a **proposta do usuário já adotada no código**. |
| Batalha | ISVS | Migration `202610090001_flashcard_battles.sql`, `FlashcardBattleRepository.ts`, `app/battle.tsx`; `test-flashcard-battles` (PGlite), `test-battle-account`. Duas sessões Supabase reais nunca exercitadas; deploy só "informado pelo usuário". |
| Geração de cartões por livro | PARC (local determinístico) + PLAN/PROP (IA) | `flashcardGeneration.ts`: pergunta fixa + trecho, **não é IA**. Sem IA, consentimento, cota, fila de novos, volta à origem, Anki. Ver `referencias/requisitos-flashcards-batalha-geracao.md`. |
| Modo Viagem | DESC | Nenhum símbolo no código; `Prompt_Codex_Modo_Viagem.md` ausente. Existem brilho e `motionCues` (abaixo). |
| Brilho / motion cues | ISVS | Web: luminosidade em `ReaderScreen.tsx`; Native: `expo-brightness` + restauração; `test-motion-*` fora do npm. Brilho/permissões físicos pendentes; eficácia anti-enjoo não demonstrada. |
| Auth (email, Google PKCE, username) | IVER (local) / remoto ISVS | `auth*.ts`, `AuthContext.tsx`; `test-auth*` (critical). BUG 08 (cadastro/recovery reais) e BUG 09 (`username-login` não implantado) BLOQUEADOS externamente. |
| Library Sync (outbox/CAS/tombstone/RLS) | IVER (local/PGlite) / remoto ISVS | `src/data/library/*`, migrations `*library*`; `test:library:*`, `test:library:rls`. BUG 02: QA autenticado remoto pendente; BUG 11 deploy incremental pendente. |
| Sources / Drive | Sources IVER (local); Drive ISVS | `src/data/sources/*`, `src/data/drive/*`, `modules/aldus-drive-auth`; `test:source-catalog`, `test:drive`. BUG 03 (Drive real Android) e BUG 12 (Sources device-scoped) abertos. |
| Community | PARC (somente local v0.1) | `LocalCommunityRepository`; `test-community-*`. Migration `202610130001_community_foundation.sql` **não aplicada**; não existe `SupabaseCommunityRepository`. |
| SaaS/planos/cotas e Admin | IVER (local) / remoto ISVS | `src/domain/saas`, `src/admin`, migrations `20261015*`; `test:saas*`, `test:admin*`. Deploy/OWNER só por registro; login/TOTP real pendente. |
| Landing Web e legal | IVER (local/Chromium) | `src/marketing`, `src/legal`; `test:marketing*`, `test:legal*`. Deploy Vercel não reconferido. |
| Android (build/APK/módulos) | PARC | `android/`, `scripts/build-apk-local.mjs`; APK `00b6e4d`/`53b4e32` (privados, ignorados). Homologação física BLOQUEADA (Redmi ausente), APK do HEAD inexistente. |
| UX/UI reformulação (27/10) | IVER (Web controlado) / físico PENDENTE | commits `d6ef9c7`, `ea0b1ec`, `f970c2d`; `test-app-design`, 8 suítes Chromium. Falta revisão visual das tabs, texto ampliado Android, preview/APK novos. |
| Reflow/PDF seleção ↔ EPUB equivalência | PLAN | `reader.md`: grifos mapeados entre PDF e Reflow ainda não equivalem ao EPUB. |

## 6. Mapa tarefa → arquivos (caminhos conferidos no disco em 06/11/2026)

| Tarefa | Onde editar | Ler antes |
| --- | --- | --- |
| Abrir/ler livro, restauração, controles | `src/presentation/screens/ReaderScreen.tsx`, `components/reader/DocumentReaderAdapter.tsx`, `ReaderControls.tsx`, `ReaderContent.tsx`, `reader/ReaderGeometry.ts` | `docs/context/reader.md`, `referencias/bugs-epub-center-reset-e-restore.md`, skill reader-safety |
| Documento EPUB/layout/paginação/âncoras | `components/EpubReaderDocument.ts`, `ReaderAnchorDocument.ts`, `EpubPageViewer.{web,native}.tsx`, `src/domain/types/{readingAnchor,readerLocation,reader}.ts`, `usecases/UpdateReadingProgressUseCase.ts` | reader.md |
| Ajustes do Reader / tema / concentração | `ReaderSettingsPanel.tsx`, `ReaderSettingsSlider.tsx`, `contexts/ReaderSettingsContext.tsx`, `contexts/AppThemeContext.tsx`, `src/theme/` | reader.md |
| Marcações (grifos/marcadores) | `StudyPanelControls.tsx`, `StudyBookmarksPanel.tsx`, `StudyHighlightsPanel.tsx`, `usecases/Study{Bookmarks,Highlights}.ts`, repos `*Bookmark*`/`*Highlight*` | reader.md |
| Brilho / motion cues | `ReaderScreen.tsx` (brilho), `src/presentation/motion/useMotionCues.ts`, `stores/motionCuesStore.ts`, `components/MotionCues{Control,Overlay}.tsx` | reader.md (motion cues) |
| PDF Original / Reflow / OCR | `PdfPageViewer.*`, `PdfReflowProcessor.*`, `reflowOperation.ts`, `src/data/local/{PdfReflowDocumentBuilder,pdfReflowQuality,pdfOcr.native,reflowSerialization}.ts`, `*PdfReflowCacheRepository`, `modules/aldus-pdf-ocr` | `importacao-ocr.md` |
| Importar livro (arquivo/download) | `src/data/imports/LocalBookImportService.ts`, `src/data/epub/*`, `src/data/local/PdfFileImporter.ts`, `src/data/downloads/*`, `hooks/useBookImport.ts`, `BookImportModal.tsx` | importacao-ocr.md |
| Biblioteca (lista/grade/filtros/lote) | `app/(tabs)/library.tsx`, `BookCard.tsx`, `BookCover.tsx`, `LibraryBulkModal.tsx`, `BookOrganizationModal.tsx`, `stores/libraryStore.ts`, `usecases/OrganizeLibrarySelection.ts`, `src/data/local/LibraryOrganizationStore.ts` | `biblioteca-sync.md` |
| Sync/conta/outbox/RLS | `src/data/library/*` (`LibrarySyncService`, `LibrarySyncCoordinator`, `LibrarySyncPersistence`, `LibraryLocalReplica`, `AccountBookRepository`, `LibraryAccountScope`, `SupabaseLibraryAdapter`, `JournaledReadingData`), `supabase/migrations/*library*` | biblioteca-sync.md, skill library-sync |
| Sources/catálogos/Drive | `src/data/sources/*`, `src/data/drive/*`, `src/data/scraping/*`, `app/sources/*`, `SourceLibraryScreen.tsx`, `hooks/useSource*`, `modules/aldus-drive-auth` | `sources-drive.md`; `GOOGLE_AUTH_DRIVE_DEPLOYMENT.md` (raiz, só para deploy) |
| Busca | `app/(tabs)/search.tsx`, `stores/searchStore.ts`, `usecases/Search*UseCase.ts`, `src/domain/search/catalogRanking.ts` | sources-drive.md |
| Auth/perfil/OAuth/username | `contexts/AuthContext.tsx`, `AuthGuard.tsx`, `AuthForm.tsx`, `src/data/remote/auth*.ts`, `src/domain/auth/authRules.ts`, `app/auth/*`, `supabase/functions/username-login/*` | `auth.md` |
| Planos/cotas e Admin | `src/domain/saas/*`, `src/data/saas/SupabaseAccountPlanRepository.ts`, `presentation/saas/*`, `app/plan/*`; `src/admin/**`, `app/admin/index.tsx` (autorização real é RPC no servidor) | biblioteca-sync.md (6.1/6.2) |
| Flashcards/Estudo/Batalha | `app/(tabs)/study.tsx`, `app/decks`, `app/study`, `app/battle.tsx`, `src/domain/study/*`, `src/domain/types/flashcards.ts`, `src/data/local/Flashcard*`, `src/data/remote/FlashcardBattleRepository.ts`, `components/flashcards/*` | `community-estudo.md` §12, `referencias/requisitos-flashcards-batalha-geracao.md`, skill study-flashcards |
| Community | `src/community/**`, `app/community/*` | community-estudo.md §11/13, skill community |
| Navegação/tema/UI geral | `app/(tabs)/_layout.tsx`, `app/_layout.tsx`, `src/theme/{tokens,appUi}.ts`, `components/{AppUi,SettingsLayout,TopHeader}.tsx`, `screens/SettingsScreen.tsx` | skill interface-review |
| Landing/legal | `src/marketing/*`, `src/legal/*`, `app/legal/*`, `app/index.web.tsx`, `public/`; `LANDING_PAGE_CONTEXT.md` (raiz) | `legal-build-git.md` §14 |
| Build Web/CI | `package.json` (`export:web`), `scripts/{validate-web-env,write-build-metadata,write-public-web}.cjs`, `scripts/copy-books-to-dist.mjs`, `vercel.json`, `.github/workflows/validate.yml` | legal-build-git.md §16 |
| Build Android/APK | `android/`, `scripts/{build-apk-local.mjs,archive-commit-apk.mjs,release-signing.cjs}`, `eas.json` | legal-build-git.md §15, skill verify-android-apk-delivery |
| Supabase (migrations/RLS/deploy) | `supabase/migrations/*`, `supabase/{admin,audit,tests}`, `LIBRARY_SYNC_DEPLOYMENT.md` (raiz) | skill backend-operations; **nunca aplicar sem pedido** |

Documentos soltos na raiz (`GOOGLE_AUTH_DRIVE_DEPLOYMENT.md`, `LANDING_PAGE_CONTEXT.md`, `LIBRARY_SYNC_DEPLOYMENT.md`,
`RELATORIO_CORRECOES_INTEGRADAS.md`) são referência de operação/histórico; não os trate como estado atual sem conferir.

## 7. Validação (comandos reais de package.json)

Gates: `npm run typecheck`; `npm run test:critical` (87 suítes `scripts/test-*.cjs`, sem Android/Supabase real); `npm run export:web`;
`git diff --check`. Ferramentas de teste isoladas em `.expo/` (`npm run setup:test-tools`). Tempo típico: typecheck e critical levam alguns
minutos; rode em segundo plano. Por área:
- Reader: `test:reader:{browser,epub:web,reflow:web,study:web,pdf:web,settings:web,concentration:web,markings:web}` (Chromium; fora do critical)
- Biblioteca: `test:library:{account,sync,files,reading,bulk,bulk:web,coordinator,restart,web,rls}`
- Sources/Import: `test:source-catalog`, `test:source-library:browser`, `test:import`, `test:drive`, `test:ocr`
- SaaS/Admin: `test:saas`, `test:saas:quotas`, `test:saas:postgres`, `test:saas:web`, `test:admin`, `test:admin:web`
- Landing/legal: `test:marketing`, `test:marketing:web`, `test:legal`, `test:legal:browser`
- Sem comando npm (rodar `node scripts/test-<nome>.cjs`): `catalog-ranking`, `motion-cues`, `motion-lifecycle`, `search-pipeline`, `source-integrations`.
Export/build/teste controlado **não** comprova Android físico, sessão autenticada nem implantação remota.

## 8. Pendências e riscos (ordem sugerida)

1. **Documentar bugs EPUB/Reflow** em BUGS_ATUAIS.md (hoje ausentes) e decidir se o relato EPUB "center reset" ainda ocorre no ambiente real.
2. **Homologação física Android pendente** (Redmi): Reflow/PDF Original/seleção-grifos/brilho/permissões na build atual; restaurar
   `heads_up_notifications_enabled` para 1 quando o aparelho voltar (config temporária do aparelho, ver historico). Emulador isolado não
   iniciou o APK 00b6e4d (serviço phone).
3. **UX/UI**: faltam revisão visual humana das tabs (Estudo/Conta/Explorar), texto ampliado Android, preview Vercel e APK do HEAD.
4. **Backend remoto não comprovado**: Library Sync/Battle/Admin/SaaS (BUG 02, 11), `username-login` (BUG 09), cadastro/recovery (BUG 08),
   Drive real (BUG 03). Nada disto é verificável pelo código.
5. **Geração de flashcards por livro** é só local determinística (pergunta fixa): não vender como IA; IA exige decisão do usuário (§5).
6. **Sources device-scoped** (BUG 12) e snapshot/config sem isolamento por conta.
7. **Dependências** com avisos sem upgrade compatível (BUG 13; não rebaixar Expo/RN, sem `audit fix --force`).
8. Limites conhecidos: atomicidade do lote entre abas Web independentes não comprovada; Reflow grande lento e consome memória (BUG 06);
   Community sem backend; `FORENSIC` logs (≈50) atrás da flag `epubCenterResetDiagnostics`.
Áreas frágeis: `ReaderScreen.tsx`/`EpubReaderDocument.ts` (âncoras, ACK, geometria), `src/data/library/*` (outbox/CAS/epoch),
`LibraryOrganizationStore` (escrita única + CAS), cache Reflow (cancelamento durante gravação), `AccountBookRepository`/escopo de conta.

## 9. Regras de proteção (resumo; completo em AGENTS.md)

- **Git:** preservar untracked/modificados; sem reset/clean/stash/checkout para limpar; sem force push; sem troca de branch/merge/rebase
  sem pedido; stage por caminho. Commit só do que foi pedido; **push, deploy, migration, APK, instalação: só com pedido explícito**.
- **Aparelho (Redmi):** não desinstalar, não limpar dados, não instalar APK com assinatura incompatível por cima, não reduzir
  `versionCode`, não apagar livros/fontes/contas, não publicar nova Beta sem autorização; confirmar assinatura/versão/package antes de
  qualquer substituição; restaurar configurações temporárias do aparelho ao encerrar. O certificado do APK Beta privado **não** é o do
  Redmi pessoal.
- **Migrations/Supabase:** migrations em `supabase/migrations` são imutáveis e podem já estar aplicadas — não reaplicar; consultar o remoto
  só com autorização e ferramenta já configurada; não alterar RLS/Auth/buckets/Storage sem escopo explícito.
- **Segredos/dados:** não ler `.env*`, `credentials.json`, keystores, tokens, bancos ou livros pessoais; não repetir valores em logs/respostas;
  testes usam fixtures isoladas; `Livros/`, APKs, ZIPs e `DesignIdeas*` não entram em commits de código.
- **IA externa:** não enviar livros/trechos a serviço de IA sem pedido e consentimento explícito do usuário final.

## 10. Log (mais recente primeiro; máx. 5 entradas, resto → docs/context/historico/)

### 06/11/2026 — Onboarding 2: auditoria somente leitura + reescrita do contexto (Claude)
- IMPLEMENTADO (só docs): `PROJECT_CONTEXT.md` reescrito (matriz de recursos §5 com evidência; mapa §6 conferido no disco; regras §9);
  novos `docs/context/referencias/` com os dois handoffs do ChatGPT (copiados do `aldus-context.zip` untracked), a síntese verificada
  `bugs-epub-center-reset-e-restore.md` e `requisitos-flashcards-batalha-geracao.md` (requisito/proposta × código); log anterior de 06/11 movido
  para `historico/2026-11-06-ux-fechamento-e-onboarding-1.md`; AGENTS.md/README/skills alinhados à numeração `§`.
- VALIDADO: `typecheck` PASS; `test:critical` 87/87 PASS; `node scripts/validate-ai-instructions.cjs` e `git diff --check` (ver comandos na resposta).
  NÃO executado: export, Chromium, Android, Supabase.
- Achados: (a) `BUG_CONTEXT_EPUB_*`, `CONTEXTO_FLASHCARDS*`, `PROMPTS_REVISAO*`, `Prompt_Codex_App_Leitura_Completo`,
  `PROMPT_INTEGRACAO_FLASHCARDS*` foram apagados em `7f50a90` (recuperáveis em `7f50a90^`); (b) ausentes em qualquer lugar: `Pesquisa_Apps_Leitura_2026-10-05.md`,
  `Prompt_Codex_Modo_Viagem.md`, `PROPOSTA_FONTES_DE_LIVROS.md`; (c) "progress restore" original era PDF Reflow; (d) o reset do toque central só foi
  reproduzido/corrigido no Reflow; (e) geração local de flashcards usa pergunta fixa; (f) "Modo Viagem" não existe no código.
- Próximo passo sugerido: registrar os bugs A/B em BUGS_ATUAIS.md e aguardar o pedido do usuário (§8).

### 06/11/2026 — Entradas anteriores
- Fechamento UX/UI e Onboarding 1: ver `docs/context/historico/2026-11-06-ux-fechamento-e-onboarding-1.md`.
