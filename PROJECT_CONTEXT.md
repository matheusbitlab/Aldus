# Aldus Reader — Contexto do Projeto

Única leitura obrigatória por tarefa. Detalhes por área: `docs/context/` (ler só a seção que o mapa
indicar). Histórico cronológico: `docs/context/historico/`. Bugs ativos: [BUGS_ATUAIS.md](BUGS_ATUAIS.md).
Reescrito em 06/11/2026 a partir da análise do código em main `60b50c2` (não só do texto antigo).

## 1. Protocolo de cada tarefa

1. `git status --short`, `git branch --show-current`, `git rev-parse HEAD`. Há trabalho local não
   commitado de terceiros (ver §3): preserve-o, faça stage só por caminhos que você editou.
2. Leia este arquivo; abra no máximo os módulos do mapa (§5). Use `rg -n` por símbolo antes de abrir
   arquivos grandes (ReaderScreen 1191 linhas, EpubReaderDocument 755, library.tsx 658).
3. Edite o mínimo. Valide: `npm run typecheck`, testes da área (§6) e, em mudança funcional,
   `npm run test:critical`, `npm run export:web`, `git diff --check`. Nunca declare PASS sem ter executado.
4. Fechamento (obrigatório, no mesmo commit do código): atualizar neste arquivo **§3 Estado atual**,
   **§7 Pendências** e uma nova entrada no topo de **§8 Log**; manter o Log com no máximo 5 entradas
   e mover as mais antigas, sem editar, para `docs/context/historico/AAAA-MM-<tema>.md`. Bug novo/resolvido
   → BUGS_ATUAIS.md. Decisão permanente nova → módulo da área em `docs/context/`.
5. Resposta ao usuário em pt-BR, curta: o que mudou, onde, validação (comando e resultado reais),
   próximo passo. Use IMPLEMENTADO / VALIDADO / PARCIAL / PENDENTE / NÃO TESTADO / INCONCLUSIVO / BLOQUEADO.

Não criar outros arquivos de contexto/handoff. Não executar migration, deploy, build de APK, uso do
aparelho, acesso a `.env`/dados pessoais sem pedido explícito. Limites completos: [AGENTS.md](AGENTS.md).

## 2. Produto e stack (conferido em package.json/app.json)

App de leitura EPUB/PDF e estudo, Android + Web, pt-BR. `aldus-reader` 1.0.0-beta.2, Android
`com.aldus.reader` versionCode 3, scheme `aldus`. Expo ~57.0.25, React Native 0.86.3, React 19.2.3,
expo-router (typedRoutes), Zustand 5, expo-sqlite, WebView 13, pdfjs-dist 6, jszip, nativewind/tailwind
instalados (UI real usa StyleSheet + `src/theme`), TypeScript ~6.0.3, Node 24. Backend: Supabase
(Auth, Postgres/RLS, Storage, Edge Function `username-login`). Web publicada via Vercel; Android via
Gradle local (`android/` versionado) ou EAS. iOS não é alvo.

Persistência (legado mantido): Native SQLite `kindle-reader.db` (migrations v1–v5 em
`src/data/database/migrations/MigrationRunner.ts`) + AsyncStorage + arquivos; Web IndexedDB
`kindle-reader-web` v6 (`webLibraryStore.ts`). Chaves `kindle-*`/`@kindle/*` não se renomeiam.

## 3. Estado atual (verificado em 06/11/2026)

- Git: `main` em `60b50c2` (feat library: fontes simples e grade responsiva). **Árvore suja herdada
  do Codex, não commitada e não minha**: 16 arquivos de app (`app/(tabs)/{_layout,library,search,study}.tsx`,
  `app/_layout.tsx`, `app/sources/index.tsx`, `src/theme/tokens.ts`, `SettingsLayout`, `AuthForm`,
  `PlanScreens`, `admin/.../components.tsx`, `community/.../components.tsx`), `.gitignore` (+`.vercel`, `.env*`),
  `scripts/test-critical.cjs` (+`app-design`), `scripts/test-source-library-browser.cjs`, além de
  `scripts/test-app-design.cjs`, `DesignIdeas/` e `DesignIdeas.zip` (referência visual, não versionar).
  É a continuação da reformulação UX/UI de 27/10; sua validação final **não foi concluída** (ver §7).
- Validação local nesta sessão: `npm run typecheck` PASS (exit 0). `npm run test:critical`: resultado
  registrado no Log (§8). Matriz crítica agora tem 87 suítes (o texto antigo dizia 86; `app-design` é novo
  e não commitado). Nada de Android físico, Supabase remoto, deploy ou APK foi exercitado nesta sessão.
- Funcional e conectado no código: Reader EPUB/PDF Original/PDF Reflow com âncoras textuais; marcações
  (grifos/marcadores); importação (EPUB/PDF) com cancelamento; biblioteca com organização e lote;
  Library Sync durável (outbox/CAS/tombstone) escopado por conta; Sources/Drive; OCR Android;
  Auth Supabase (+Google PKCE, username); SaaS/planos/cotas e Aldus Admin; Flashcards/SRS/Battle;
  Community v0.1 **somente local** (`LocalCommunityRepository`; não existe repositório Supabase);
  landing Web cinematográfica; telas legais.
- Estado remoto/físico: tudo que é Supabase real, OAuth, Redmi e APK vem de registros históricos em
  `docs/context/historico/` e BUGS_ATUAIS.md — **não é verificável pelo código** e não foi reconferido.
  Último APK/preview documentados (24/10) correspondem a `00b6e4d`, não ao HEAD atual.

## 4. Arquitetura (resumo)

Camadas: `app/` (rotas Expo Router) → `src/presentation` (telas, componentes, contextos, stores Zustand)
→ `src/domain` (tipos, contratos de repositório, usecases, regras puras) → `src/data` (SQLite/IndexedDB,
importadores, EPUB, Sources, Drive, Sync, Supabase). `src/community` e `src/admin` são verticais próprias
(domain/application/data/presentation). `src/legal`, `src/marketing` (landing), `src/theme` (tokens, appUi).
Composição única: `src/presentation/services/dependencies.ts` — repositórios por plataforma
(`Sqlite*` vs `IndexedDb*`, escolhidos por `Platform.OS`), embrulhados por `AccountBookRepository`/
`scopeBookData` (escopo de conta) e `journal*` (outbox) → `LibrarySyncService` + `LibraryLocalReplica`.
**Reutilize essa composição; não crie persistência/Sync paralelos.** Arquivos `.web`/`.native` (viewers,
OCR, thumbnails, storage) são implementações separadas: leia as duas.
Providers em `app/_layout.tsx`: AppTheme → SafeArea → Auth → ReaderSettings; `AuthGuard` protege rotas
privadas (sessão + perfil ativo do mesmo UUID).
Rotas: `(tabs)` library/search/study/settings; `reader/[bookId]` e `reader/web`; `sources`, `services/[provider]`;
`decks/[deckId]`, `study/[deckId]`, `battle`; `auth/*`; `account/*`; `community/*`; `plan/*`; `admin`;
`legal/*`; `preferences`, `support`. Módulos Expo locais: `modules/aldus-drive-auth`, `modules/aldus-pdf-ocr` (Kotlin).
Supabase: 10 migrations imutáveis em `supabase/migrations`, função `username-login`, SQL de inventário/admin e testes manuais.

### Invariantes (violar = regressão)
- EPUB, PDF Original e PDF Reflow têm posições independentes; controles/tema/fonte/brilho não remontam o
  documento nem salvam posição transitória. Restauração só após `layoutReady` e ACK.
- Âncora `missing`/`ambiguous` → aviso, nunca navegação silenciosa. Posição textual EPUB/Reflow vive em
  `progress.cfiPosition` como envelope versionado (não é CFI real).
- IndexedDB: sucesso só em `transaction.oncomplete`. Preserve cancelamento/gerações, tombstones, CAS,
  recibos idempotentes, outbox durável; conta A≠B, retorno A→B→A exige epoch. Não limpar fila/cache nem
  subir timeout como "correção".
- NÃO INVENTAR DADOS: sem fonte confiável, `null`/indisponível; zero só com medição.
- Helpers enviados a WebView são código literal (Function.toString de Hermes não serve).
- Sources/UserSources ainda são **device-scoped** (chave global `kindle-reader.user-sources.v1`, BUG 12).
- Batalha de Flashcards só envia o deck escolhido ao Supabase quando habilitada; estudo individual é local
  (tratamento legal em docs/context/legal-build-git.md; contrato em community-estudo.md).
- UI pt-BR, sóbria, acessível; sem instrumentação, serviço pago ou envio de livros a IA externa sem pedido.

## 5. Mapa tarefa → arquivos (caminhos conferidos no repositório)

| Tarefa | Onde editar | Ler antes |
| --- | --- | --- |
| Abrir/ler livro, restauração, controles | `src/presentation/screens/ReaderScreen.tsx`, `components/reader/DocumentReaderAdapter.tsx`, `ReaderControls.tsx`, `ReaderContent.tsx`, `reader/ReaderGeometry.ts` | `docs/context/reader.md`, skill reader-safety |
| Documento EPUB/layout/paginação/âncoras | `components/EpubReaderDocument.ts`, `ReaderAnchorDocument.ts`, `EpubPageViewer.{web,native}.tsx`, `src/domain/types/{readingAnchor,readerLocation,reader}.ts`, `usecases/UpdateReadingProgressUseCase.ts` | reader.md |
| Ajustes do Reader / tema / concentração | `ReaderSettingsPanel.tsx`, `ReaderSettingsSlider.tsx`, `contexts/ReaderSettingsContext.tsx`, `AppThemeContext.tsx`, `src/theme/` | reader.md |
| Marcações (grifos/marcadores) | `StudyPanelControls.tsx`, `StudyBookmarksPanel.tsx`, `StudyHighlightsPanel.tsx`, `usecases/Study{Bookmarks,Highlights}.ts`, repos `*Bookmark*`/`*Highlight*` | reader.md |
| PDF Original / Reflow / OCR | `PdfPageViewer.*`, `PdfReflowProcessor.*`, `reflowOperation.ts`, `src/data/local/{PdfReflowDocumentBuilder,pdfReflowQuality,pdfOcr.native,reflowSerialization}.ts`, `SqlitePdfReflowCacheRepository`/`IndexedDbPdfReflowCacheRepository`, `modules/aldus-pdf-ocr` | `importacao-ocr.md` |
| Importar livro (arquivo/download) | `src/data/imports/LocalBookImportService.ts`, `src/data/epub/*`, `src/data/local/PdfFileImporter.ts`, `src/data/downloads/*`, `hooks/useBookImport.ts`, `BookImportModal.tsx` | importacao-ocr.md |
| Biblioteca (lista/grade/cards/filtros/lote) | `app/(tabs)/library.tsx`, `BookCard.tsx`, `BookCover.tsx`, `LibraryBulkModal.tsx`, `BookOrganizationModal.tsx`, `stores/libraryStore.ts`, `usecases/OrganizeLibrarySelection.ts`, `src/data/local/LibraryOrganizationStore.ts` | `biblioteca-sync.md` |
| Sync/conta/outbox/RLS | `src/data/library/*` (`LibrarySyncService`, `Coordinator`, `Persistence`, `LibraryLocalReplica`, `AccountBookRepository`, `LibraryAccountScope`, `SupabaseLibraryAdapter`), `JournaledReadingData.ts`, `supabase/migrations/*library*` | biblioteca-sync.md, skill library-sync |
| Sources/catálogos/Drive | `src/data/sources/*`, `src/data/drive/*`, `src/data/scraping/*`, `app/sources/*`, `SourceLibraryScreen.tsx`, `hooks/useSource*`, `modules/aldus-drive-auth` | `sources-drive.md` |
| Busca | `app/(tabs)/search.tsx`, `stores/searchStore.ts`, `usecases/Search*UseCase.ts`, `src/domain/search/catalogRanking.ts` | sources-drive.md |
| Auth/perfil/OAuth/username | `contexts/AuthContext.tsx`, `AuthGuard.tsx`, `AuthForm.tsx`, `src/data/remote/auth*.ts`, `src/domain/auth/authRules.ts`, `app/auth/*`, `supabase/functions/username-login/*` | `auth.md` |
| Planos/cotas (SaaS) | `src/domain/saas/*`, `src/data/saas/SupabaseAccountPlanRepository.ts`, `presentation/saas/*`, `app/plan/*` | biblioteca-sync.md (6.1) |
| Admin | `src/admin/**`, `app/admin/index.tsx` (autorização efetiva é RPC no servidor) | biblioteca-sync.md (6.2) |
| Estudo/Flashcards/Battle | `app/(tabs)/study.tsx`, `app/decks`, `app/study`, `app/battle.tsx`, `src/domain/study/*`, `src/data/local/Flashcard*`, `src/data/remote/FlashcardBattleRepository.ts`, `components/flashcards/*` | `community-estudo.md` (só se pedido) |
| Community | `src/community/**`, `app/community/*` | community-estudo.md |
| Navegação/tema/UI geral | `app/(tabs)/_layout.tsx`, `app/_layout.tsx`, `src/theme/{tokens,appUi}.ts`, `components/{AppUi,SettingsLayout,TopHeader}.tsx`, `screens/SettingsScreen.tsx` | skill interface-review |
| Landing/legal | `src/marketing/*`, `src/legal/*`, `app/legal/*`, `app/index.web.tsx`, `public/` | `legal-build-git.md` |
| Build Web/CI | `package.json` (`export:web`), `scripts/{validate-web-env,write-build-metadata,write-public-web,copy-books-to-dist}`, `vercel.json`, `.github/workflows/validate.yml` | legal-build-git.md |
| Build Android | `android/`, `scripts/{build-apk-local.mjs,archive-commit-apk.mjs,release-signing.cjs}`, `eas.json` | legal-build-git.md, skill verify-android-apk-delivery |

## 6. Validação (comandos reais de package.json)

Gates: `npm run typecheck`; `npm run test:critical` (87 suítes `scripts/test-*.cjs` determinísticas, sem
Android/Supabase real); `npm run export:web`; `git diff --check`. Ferramentas de teste isoladas em `.expo/`
(`npm run setup:test-tools`). Por área:
- Reader: `test:reader:{browser,epub:web,reflow:web,study:web,pdf:web,settings:web,concentration:web,markings:web}` (Chromium; fora do critical)
- Biblioteca: `test:library:{account,sync,files,reading,bulk,bulk:web,coordinator,restart,web,rls}`
- Sources/Import: `test:source-catalog`, `test:source-library:browser`, `test:import`, `test:drive`, `test:ocr`
- SaaS/Admin: `test:saas`, `test:saas:quotas`, `test:saas:postgres`, `test:saas:web`, `test:admin`, `test:admin:web`
- Landing/legal: `test:marketing`, `test:marketing:web`, `test:legal`, `test:legal:browser`
- Suítes existentes **fora** da matriz crítica: `catalog-ranking`, `motion-cues`, `motion-lifecycle`, `search-pipeline`,
  `source-integrations` (sem comando npm; rodar com `node scripts/test-<nome>.cjs`) e as `*-web`/browser acima.
Export/build/teste controlado **não** comprova Android físico, sessão autenticada nem implantação remota.

## 7. Pendências e riscos (ordem sugerida)

1. **Reformulação UX/UI 27/10 inacabada**: 16 arquivos de app não commitados + `test-app-design`. Falta
   revisar o diff, rodar export + `test:source-library:browser`/`test:library:bulk:web`, fechar contraste/rótulos,
   commitar por onda. Preview/APK existentes não representam esse diff.
2. **Homologação física Android pendente** (Redmi): seleção/grifos por toque, PDF Original/Leitura Livre,
   brilho/permissões na build atual; restaurar `heads_up_notifications_enabled` para 1 quando o aparelho voltar
   (configuração temporária do aparelho, ver historico). Emulador isolado não iniciou o APK 00b6e4d (serviço phone).
3. **Backend remoto não comprovado**: Library Sync/Battle/Admin/SaaS (BUG 02, 11), `username-login` não
   implantado (BUG 09), cadastro/recovery reais (BUG 08), Drive real (BUG 03). Nada disto é verificável pelo código.
4. **Sources device-scoped** (BUG 12) e snapshot/config sem isolamento por conta.
5. **Dependências** com avisos sem upgrade compatível (BUG 13; não rebaixar Expo/RN, sem `audit fix --force`).
6. Limites conhecidos: atomicidade do lote entre abas Web independentes não comprovada; Reflow grande é lento
   e consome memória (BUG 06); Community sem backend.
Áreas frágeis (alto risco ao editar): `ReaderScreen.tsx`/`EpubReaderDocument.ts` (âncoras, ACK, geometria),
`src/data/library/*` (outbox/CAS/epoch), `LibraryOrganizationStore` (escrita única + CAS), cache Reflow
(cancelamento durante gravação), `AccountBookRepository`/escopo de conta.

## 8. Log (mais recente primeiro; máx. 5 entradas, resto → docs/context/historico/)

### 06/11/2026 — Onboarding: análise ponta a ponta e reorganização do contexto
- Contexto reescrito (≈250 linhas); texto original dividido, sem reescrita, em `docs/context/*.md` e
  `docs/context/historico/*`. AGENTS.md, README e skills atualizados para a nova organização.
- Divergências achadas: (a) a divisão em `docs/context/` descrita no pedido **não existia** no checkout
  (PROJECT_CONTEXT tinha 2192 linhas e não havia `docs/`); (b) matriz crítica é 87 suítes, não 86 (por `app-design`,
  não commitado); (c) a seção 15 antiga cita versionCode=1/versionName 1.0.0, mas app.json é 1.0.0-beta.2/code 3;
  (d) contagens "57/57…86/86" nas seções antigas são snapshots datados; (e) o registro 27/10 parte de d5f0d86, o HEAD é 60b50c2
  (já contém Library/Sources/AppUi); (f) todos os caminhos de arquivo citados no texto antigo existem, salvo o APK debug
  gerado em `android/app/build/outputs/…` (artefato ignorado); (g) Community remota não existe no código, conforme o texto.
- Validação executada: typecheck PASS; test:critical 86/87 (única falha: `legal`, que exige "Batalha…Supabase" no PROJECT_CONTEXT.md; corrigido no texto e `node scripts/test-legal.cjs` passou isolado; matriz completa não reexecutada). Sem export (não solicitado), sem Android/Supabase.
- Commit só de documentação: não inclui o código modificado herdado (§3).
