# Google Auth/callback/Drive — relatório, 12/10/2026

**Correções cliente implementadas; configuração remota ainda bloqueada; ANDROID REAL — PENDENTE.**
Baseline `eab97eeac2c6c3acec9af84c551ced8bd1b772ce`; Git iniciou limpo.
Não declarar o incidente físico resolvido: o endpoint Supabase ainda devolve localhost.

## 1. Quem gerava localhost

**Comprovado no servidor:** `/auth/v1/callback` do Supabase produziu HTTP302 para `http://localhost:8081/` ao receber cancelamento Google simulado com o state real de OAuth/PKCE iniciado com `redirectTo=aldus://auth/callback`. A variante recovery recebeu o mesmo fallback. Web dev foi preservado; controles de esquema/path não autorizado caíram no fallback. Evidência sanitizada em `artifacts/auth/urgent/redirect-probe.json` e comando `npm run audit:auth:redirects -- --expect-native`: **FAIL_EXTERNAL_CONFIGURATION**.

O mecanismo é coerente com `GetReferrer`/allowlist → Site URL no GoTrue. O painel exato ainda não foi consultado. Não foi necessário autenticar conta, criar sessão ou enviar email; essa prova é de retorno de cancelamento e não de consentimento concluído.

O fallback em `authService.authCallbackUrl` era exclusivo de Web sem `window`, perigoso em SSR e removido. Não há prova de que ele produzia localhost no Android. O inventário de todas as 88 linhas relevantes do baseline e a prova de APK estão em `GOOGLE_REDIRECT_INVENTORY.md`; documentos históricos e localhost de testes/dev não foram apagados.

## 2. Login Google do Aldus

Anterior: PKCE Supabase com deep link Native literal, Linking/browser externo e callback compartilhado. Novo: contrato por plataforma centralizado, origem Web lida somente na Web (React Native pode definir window sem location), sem localhost fallback SSR; authorize SDK validado antes de abrir; respostas antigas não abrem outro browser; callback recusado quando scheme/host/path não corresponde à plataforma; troca PKCE single-use exige sessão/identidade/credenciais retornadas pelo SDK. Diagnósticos permitem somente campos estruturais conhecidos. Cancelamento tem mensagem própria.

Destino final Native continua `aldus://auth/callback`. Google → Supabase continua HTTPS; Supabase → Aldus é o deep link. AuthContext/guard/profile existentes foram preservados e revalidados. Android login completo/sessão/profile/Home: **PENDENTE**, sem aparelho/admin/conta interativa autorizada. O código cliente não pode obrigar o Supabase a aceitar URL fora da allowlist.

## 3. Supabase

Projeto `cmivracxuihtmsbmtuec`; Auth acessível e Google publicamente habilitado. Native/recovery não preservados pela sonda real. Conferir Site URL segura e allowlist exata `aldus://auth/callback`, padrão recovery `aldus://auth/callback\?next=reset-password` e callbacks Web na origem real. Não usar wildcard amplo. A sonda exige aceitação Native/recovery, rejeição de esquema/path de controle e preservação Web dev.

Provider Google deve usar Web OAuth Client com callback `https://cmivracxuihtmsbmtuec.supabase.co/auth/v1/callback`; secret somente no Supabase. Nenhuma configuração remota foi alterada. Plugin Supabase sugerido na auditoria anterior permanece não instalado/conectado; não há acesso admin disponível. Checklist exato em `GOOGLE_AUTH_DRIVE_DEPLOYMENT.md`.

## 4. Google Cloud

Projeto Cloud do Drive e do Web Client Supabase: **não confirmado**, sem console autenticado. Drive API habilitada, Android OAuth client, consentimento/Audience/test users e publicação/verificação: **PENDENTES**. Não deduzir o projeto Cloud do hostname Supabase nem substituir client IDs por hipótese.

Package: `com.aldus.reader`. Variante local: `release`, debuggable=false; Gradle usa `signingConfigs.debug`, chave `android/app/debug.keystore`. SHA-1 diretamente confirmado por apksigner no APK baseline: **`5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25`**. Não equivale ao certificado EAS/Play/upload. Novo APK será conferido após o build; evidência em `artifacts/auth/urgent/`.

## 5. Drive Android

Implementação efetiva: `SourceManagerModal` → `DriveAuthorization` → ramo Android de `drivePlatformAuth` → módulo Expo `AldusDriveAuth` → `AuthorizationClient`. DEX/registro/Manifest/bundle do APK baseline comprovam esse caminho empacotado; não é prova de execução no aparelho do usuário. Não havia fallback Android → GIS/browser/localhost. Sem módulo/Activity, erro de configuração explícito.

Correções: IDs nas chamadas authorize/cancel, request code e geração contra operação antiga, PendingIntent/resolution/ActivityResult preservados, erros SDK distintos e desconhecidos mantidos UNKNOWN, diagnóstico ActivityResult real em vez de presumir retorno pelo término da Promise. Emissão diagnóstica best effort. Scope permanece somente `drive.readonly`. Não foi acrescentado client secret ou token Supabase ao fluxo.

## 6. Drive Web

GIS preservado; reconexão solicita token dentro do gesto e distingue popup fechado/bloqueado/denial/configuração. `select_account consent` permite escolher a conta no popup. Origin real do navegador e Client ID público próprio, sem redirect localhost inventado.

Google Identity Services carregou HTTP200 e o botão Google Auth do app abriu a tela real de login Google no Chrome isolado. Esses dois resultados não provam um grant Drive: `EXPO_PUBLIC_GOOGLE_DRIVE_WEB_CLIENT_ID` continua ausente e autorização Drive real **PENDENTE**. SDK/gesto/scope/cancelamento/late callbacks têm testes controlados.

## 7. Pasta real

Folder ID do usuário cadastrado no aparelho: **não disponível neste workspace**. ADB sem dispositivo e sem credencial Drive real. Folder ID aceito, listagem/paginação e EPUB/PDF reais: **PENDENTES**; não foi usada pasta pública aleatória em substituição.

Testes do adapter real com HTTP fixtures cobrem parsing/raiz, paginação completa/shared drive, pasta compartilhada pertencente a outra conta sem filtro de ownership, EPUB/PDF, resource key, ausência de download na listagem e snapshot anterior preservado em falha/resultado parcial. Não representam permissão real da conta Google do usuário.

## 8. Importação de livro do Drive

Drive → download → importadores existentes → Library: **PASS controlado** para EPUB/PDF, progresso, headers transitórios, erro antes do parser e cancelamento. Importação EPUB pelo app Web real/IndexedDB com fonte de teste também PASS. Download/import/abertura de EPUB da pasta Drive autorizada real: **PENDENTE**. Importadores gerais/Reader não foram alterados.

## 9. Token e reauth

Grants só em memória; sem refresh token persistido, token em URL/job/log ou mistura com Supabase. Prazo local, HTTP401 e scope insuficiente conhecido invalidam grant/índice memória; reconexão e clearToken nativo são limitados e protegidos por geração. Web não perde gesto por aguardar clearToken. Snapshot persistido e fonte sobrevivem a falha/revogação/reinício; nenhum apagamento da Library.

Categorias sanitizadas: AUTH_CANCELLED, AUTH_REQUIRED, AUTH_DENIED, TOKEN_EXPIRED, DRIVE_API_DISABLED, FOLDER_NOT_FOUND, FOLDER_FORBIDDEN, NETWORK_ERROR, RATE_LIMIT, INVALID_FOLDER, UNKNOWN. HTTP403 sem reason suficiente não presume recusa do usuário; expiração e revogação não são distinguíveis somente por HTTP401. Mensagens amigas específicas chegam a Minhas fontes e ao overview. Atualizar aproveita grant válido; Reconectar pede autorização quando falta/expirou; finally encerra busy após persistência/indexação.

Android clearToken não garante seletor/troca de conta; AuthorizationResult não traz identidade. Teste com conta diferente permanece físico pendente; não ampliamos scopes de perfil para inferir identidade.

## 10. Recovery

Contrato Native literal `aldus://auth/callback?next=reset-password`, sem fallback cliente localhost. Parsing, callback/session e navegação de recovery passaram controlados. Sonda real dessa URL no cancelamento OAuth ainda recebeu localhost: **bloqueio remoto permanece**. Email → aparelho → nova senha → login ainda **PENDENTE**; auditar allowlist/padrão query, Site URL e template ConfirmationURL conforme deployment.

## 11. Testes controlados e navegador

PASS: `npm run typecheck`; `node scripts/test-auth-flows.cjs`; `node scripts/test-auth-callback.cjs` (SDK instalado para geração PKCE, Native/RN window sem location, Web/SSR, sessão ausente, stale e sanitização); `node scripts/test-auth.cjs --auth-only`; `npm run test:drive`; `npm run test:source-catalog`; `node scripts/test-source-integrations.cjs`; `npm run test:import`; Kotlin `:aldus-drive-auth:compileReleaseKotlin`; `npm run export:web` (2416 módulos); `node scripts/test-source-library-browser.cjs`; `git diff --check`.

Sources no app exportado/Chrome isolado: UI/IndexedDB reais, EPUB importado/reabertura/rollback/offline/auth_required/removal preservando livro+Blob, 1000 metadados/24 cards PASS. Supabase/HTTP fonte eram fixtures. Login Google inicial e GIS HTTP200 foram acessos reais no browser, sem autenticar conta. Sonda real de retorno Native é **FAIL externo**, não deve aparecer entre gates PASS.

## 12. Android real

**ANDROID REAL — PENDENTE.** ADB sem aparelhos. Não houve instalação nem consentimento/login real, execução física de módulo, pasta real, importação Drive real, reinício/revogação/troca de conta real ou validação foreground/background/browser/volta no APK atualizado. Roteiro de todos os sete casos + recovery em `GOOGLE_AUTH_DRIVE_DEPLOYMENT.md`. Nenhum PASS físico foi atribuído a mocks, DEX ou build.

## 13. Bloqueios externos

Acesso admin Supabase para URL Configuration/provider/logs; console Google Cloud do projeto correto para API/client/consentimento/test users/origins; Client ID público Drive Web validado; aparelho ADB autorizado; login/conta Google e pasta real disponíveis. Nenhum secret/senha/token deve ser enviado para docs ou APK. Não reabertas migrations/RLS/Library Sync e outras funcionalidades.

## 14. Arquivos modificados

- Documentos: AUTH_IMPLEMENTATION.md; GOOGLE_DRIVE_IMPLEMENTATION.md; PROJECT_CONTEXT.md; ROADMAP_FUNCIONALIDADES.md; CORRECOES_BUGS_APK_PROGRESSO.md; GOOGLE_AUTH_DRIVE_DEPLOYMENT.md; GOOGLE_REDIRECT_INVENTORY.md; GOOGLE_AUTH_DRIVE_FINAL_REPORT.md.
- Auth: app/auth/callback.tsx; src/data/remote/authService.ts; src/data/remote/authCallback.ts; src/data/remote/authRedirect.ts; src/utils/authDiagnostics.ts; src/utils/authOAuthDiagnostics.ts.
- Drive: src/data/drive/DriveAuthorization.ts; src/data/drive/DriveErrors.ts; src/data/drive/GoogleDriveService.ts; src/data/drive/drivePlatformAuth.ts; src/utils/driveDiagnostics.ts; modules/aldus-drive-auth/android/src/main/java/expo/modules/aldusdriveauth/AldusDriveAuthModule.kt.
- UX/catalog: src/data/sources/SourceCatalogService.ts; src/presentation/components/SourceManagerModal.tsx; src/presentation/components/SourceSummaryRow.tsx.
- Verificação: package.json; scripts/audit-google-redirects.cjs; scripts/test-auth-callback.cjs; scripts/test-google-drive.cjs; scripts/test-drive-download.cjs; scripts/test-source-catalog.cjs.

Nenhuma alteração funcional em OCR/Reflow/Reader/Library Sync/Backup/capas/Flashcards/importação geral.

## 15. Documentação

Os cinco documentos obrigatórios foram atualizados. Deployment distingue os dois fluxos, SHA real/variant/keystore, allowlist/query sem wildcard amplo, client secret servidor, API/consentimento e testes físicos. Inventário preserva baseline e classificação. Relatório pós-commit ignorado em `artifacts/auth/urgent/GOOGLE_AUTH_DRIVE_FINAL_REPORT.md` incorpora hash/APK/bytes/status e conferência do artefato sem necessidade de alterar o próprio commit.

## 16. Commits

Checkpoint integrado Auth/callback + Drive/lifecycle/UX + testes/documentação. O hash/mensagem/escopo finais ficam no registro abaixo da versão pós-commit; este documento não presume hash antes da criação do commit. Nenhum push/force push, reset, clean, restore, stash ou descarte de trabalho anterior.

## 17. APKs

Depois do commit, `npm run build:apk:archive` chama o pipeline oficial Gradle assembleRelease com source/staging do hash limpos; arquiva `artifacts/apk/Aldus-<hash>.apk`, ignorado/não rastreado. Ledger `artifacts/apk/checkpoint.jsonl` registra commit/path/bytes/PASS ou FAIL/log; confirmação de assinatura/Manifest/DEX segue em artefatos ignorados. Não declarar PASS do APK antes dessa execução.

<!--COMMIT_AND_APK-->
