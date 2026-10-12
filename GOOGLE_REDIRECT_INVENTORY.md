# Google/Auth/Drive — inventário de redirects e prova do APK

Auditoria: 12/10/2026. Baseline: `eab97eeac2c6c3acec9af84c551ced8bd1b772ce`. As linhas abaixo pertencem ao baseline, antes das correções desta tarefa. O inventário integral com textos completos está no artefato ignorado `artifacts/auth/urgent/REDIRECT_INVENTORY_BASELINE.json`.

## Quem produz localhost

A sonda real do projeto `cmivracxuihtmsbmtuec.supabase.co` iniciou OAuth PKCE e concluiu o callback Google → Supabase com cancelamento controlado do provedor. Não houve login de usuário, envio de email, troca de authorization code nem sessão criada. O endpoint `/auth/v1/callback` do Supabase respondeu 302 para `http://localhost:8081/` ao solicitar tanto o callback Native quanto a variante recovery; a origem Web de desenvolvimento foi preservada. Portanto o produtor comprovado desse destino é o redirect do Supabase, coerente com fallback à Site URL por redirect não aceito. O detalhe administrativo da allowlist ainda exige consulta ao painel; a sonda não leu a configuração interna.

| Pedido ao Supabase | Retorno real sanitizado | Classificação |
|---|---|---|
| `aldus://auth/callback` | `http://localhost:8081/` | NATIVE INCORRETO — configuração/redirect remoto |
| `aldus://auth/callback?next=reset-password` | `http://localhost:8081/` | NATIVE INCORRETO — configuração/redirect remoto |
| `http://localhost:8081/auth/callback` | `http://localhost:8081/auth/callback` | DEV WEB LEGÍTIMO |
| `aldus-test-invalid://auth/callback` | `http://localhost:8081/` | TESTE — controle de callback deliberadamente inválido |

Evidência: `artifacts/auth/urgent/redirect-probe.json`. O controle com scheme inválido também terminou no mesmo fallback; os cancelamentos foram reconhecidos pelo serviço. Não atribuir o incidente ao link da pasta ou à Drive API, nem confundir esse callback Supabase com a autorização Drive.

No código baseline, `authService.authCallbackUrl` escolhe `aldus://auth/callback` para Android. Seu `http://localhost:8081` é um fallback silencioso exclusivo do ramo Web sem `window`; é FALLBACK PERIGOSO para Web/SSR e deve ser removido sem apagar localhost legítimo de desenvolvimento. Esse fallback cliente não foi demonstrado como produtor do retorno Native observado.

## Busca global e classificação

Pesquisados: localhost, 127.0.0.1, 8081, 19006, auth/callback, redirectTo, redirectUri, redirect_uri, makeRedirectUri, WebBrowser, AuthSession, signInWithOAuth, exchangeCodeForSession, AuthorizationClient, GoogleSignin e GIS. `git grep -n -I -i -E` pesquisou todos os arquivos de texto rastreados no baseline; busca complementar em src/app/android/modules/scripts conferiu os caminhos efetivos.

Excluídos do inventário funcional: binários, `package-lock.json` (metadados de dependências), `node_modules` (terceiros), `dist`, `.expo`, `artifacts`, builds e `.gradle` (bundles/probes/caches gerados). Produtos Native foram inspecionados separadamente como evidência do APK. Não foi omitido um arquivo executável próprio por conter localhost.

| Categoria principal | Ocorrências baseline |
|---|---:|
| DEV WEB LEGÍTIMO | 1 |
| FALLBACK PERIGOSO | 1 |
| NATIVE INCORRETO no código próprio | 0 |
| TESTE | 16 |
| DOCUMENTAÇÃO | 59 |
| NATIVE CORRETO, categoria adicional para contratos válidos | 9 |
| NÃO RELEVANTE, números coincidentes em hashes | 2 |

As referências documentais a `kindlereader://` são registros históricos. O contrato vigente é `aldus://`. Trechos longos foram abreviados nesta tabela; o JSON ignorado preserva todos os textos/linhas encontrados. Funções compartilhadas Web/Native foram classificadas pelo contrato Native correto, sem sugerir que a Web precise de deep link.

| Arquivo:linha baseline | Categoria | Ocorrência |
|---|---|---|
| AUTH_IMPLEMENTATION.md:13 | DOCUMENTAÇÃO | IMPLEMENTADO: AuthorizationClient Android (package/SHA) e GIS token model Web (EXPO_PUBLIC_GOOGLE_DRIVE_WEB_CLIENT_ID), drive.readonly sem tokens Supabase/client_secret. Tokens app memória, expires_in Web/45 min conservadores Android/401… |
| AUTH_IMPLEMENTATION.md:49 | DOCUMENTAÇÃO | - Google usa 'signInWithOAuth' do Supabase e o callback PKCE em '/auth/callback'. Web e Native compartilham o mesmo serviço. O Native usa o esquema 'aldus://auth/callback' e o browser do sistema via 'expo-linking'; não foi adicionado mód… |
| AUTH_IMPLEMENTATION.md:65 | DOCUMENTAÇÃO | 3. **Supabase — Auth URLs/Google:** **Authentication → URL Configuration**: manter 'http://localhost:8081' só para desenvolvimento; remover o callback antigo 'kindlereader://auth/callback' quando nenhuma build antiga depender dele; inclu… |
| BUG_CONTEXT_EPUB_CENTER_RESET.md:326 | DOCUMENTAÇÃO | - O servidor Web que já ocupava a porta 8081 não pôde ser inspecionado no ambiente restrito; a aplicação foi iniciada em 8082. Chrome Headless 154 no Windows abriu a biblioteca real. Livro: EPUB empacotado 'bundled-epub-1e9e1db1', “Sigmu… |
| BUG_CONTEXT_EPUB_CENTER_RESET.md:394 | DOCUMENTAÇÃO | - Servidor Expo Web iniciado em 'http://127.0.0.1:8086/library'; browser integrado do VS Code, distinto do browser/dispositivo real onde o usuário reproduz o bug. |
| BUG_CONTEXT_EPUB_PROGRESS_RESTORE.md:108 | DOCUMENTAÇÃO | Esta continuação não confirmou nem refutou a correção. O Expo iniciou em 'http://127.0.0.1:8084'; 'GET /library' respondeu HTTP 200. Tentei abrir a rota com perfis isolados: |
| BUG_CONTEXT_EPUB_PROGRESS_RESTORE.md:110 | DOCUMENTAÇÃO | - Chrome não headless: '"C:\Program Files\Google\Chrome\Application\chrome.exe" --no-first-run --no-default-browser-check --disable-background-networking --remote-debugging-address=127.0.0.1 --remote-debugging-port=9350 --user-data-dir=C… |
| BUG_CONTEXT_EPUB_PROGRESS_RESTORE.md:111 | DOCUMENTAÇÃO | - Chrome não headless com tentativa de renderização por software: '"C:\Program Files\Google\Chrome\Application\chrome.exe" --no-first-run --no-default-browser-check --disable-background-networking --disable-gpu --disable-gpu-compositing … |
| BUG_CONTEXT_EPUB_PROGRESS_RESTORE.md:112 | DOCUMENTAÇÃO | - Edge headless: '"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --headless=new --disable-gpu --no-first-run --no-default-browser-check --disable-background-networking --remote-debugging-address=127.0.0.1 --remote-debuggi… |
| BUG_CONTEXT_EPUB_PROGRESS_RESTORE.md:113 | DOCUMENTAÇÃO | - Repetição Edge headless: '"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --headless=new --disable-gpu --disable-gpu-compositing --no-first-run --no-default-browser-check --disable-background-networking --remote-debuggin… |
| CORRECOES_BUGS_APK_PROGRESSO.md:17 | DOCUMENTAÇÃO | DRIVE — AUTH/CONEXÃO / LISTAGEM: Android separado do Supabase/GIS Web, tokens memória/fontes estáveis. Parsing/paginação/TTL/refresh/erros/abort/late validados com mocks; store source-specific Drive e regressões JSON/OPDS/HTML/parciais/s… |
| CORRECOES_BUGS_APK_PROGRESSO.md:63 | DOCUMENTAÇÃO | BUG 5: A–E/SDK/guards revalidados **PASS controlado**; incidente físico e conta válida real continuam **PARCIAIS / NÃO TESTADOS**. BUG 6: validação e categorias sanitizadas **PASS controlado**; signup, trigger/profile, policy, rate limit… |
| CORRECOES_BUGS_APK_PROGRESSO.md:136 | DOCUMENTAÇÃO | Causa externa sustentada pelo código GoTrue v2.197.0: 'Unable to exchange external code' surge em 'GetOAuthToken', antes do PKCE cliente. Motivo específico exige Auth Logs/token error do provedor. Defeitos locais reproduzidos com fonte H… |
| CORRECOES_BUGS_APK_PROGRESSO.md:139 | DOCUMENTAÇÃO | Reproduzido SDK error de recovery silenciosamente aceito no baseline. 'sendRecoveryEmail' distingue falhas de rede/backend/rate limit de resposta genérica para conta específica; ForgotPassword mostra erro operacional. ResetPassword passa… |
| CORRECOES_BUGS_APK_PROGRESSO.md:146 | DOCUMENTAÇÃO | 3. Supabase → Authentication → URL Configuration: Site URL deve ser destino publicado válido (ou deep link oficial na distribuição somente Native), sem localhost de produção. Redirect URLs: 'kindlereader://auth/callback' e 'kindlereader:… |
| CORRECOES_BUGS_APK_PROGRESSO.md:227 | DOCUMENTAÇÃO | - Auth: 'app/auth/callback.tsx', 'app/auth/forgot-password.tsx', 'app/auth/reset-password.tsx', 'src/data/remote/authService.ts' (este já tinha alterações). |
| CORRECOES_BUGS_APK_PROGRESSO.md:383 | DOCUMENTAÇÃO | \| 7 — Recovery \| SDK error ignorado; localhost/config remoto não verificável \| Erros operacionais; next/query/hash; reset finally \| Baseline/recovery URL/callback PASS; email completo não testado \| BLOQUEADO POR CONFIGURAÇÃO EXTERNA \| |
| DIAGNOSTICO_BUGS_APK.md:25 | DOCUMENTAÇÃO | \| 7 \| Recuperação retorna para localhost \| ALTA \| Native envia deep link com 'next=reset-password'; allowlist/Site URL/template efetivos não foram disponibilizados \| INCONCLUSIVO \| |
| DIAGNOSTICO_BUGS_APK.md:255 | DOCUMENTAÇÃO | 'loginWithGoogle' → 'signInWithOAuth(provider=google, redirectTo=kindlereader://auth/callback, skipBrowserRedirect=true)' → 'Linking.openURL(data.url)' → browser externo → Google → '/auth/v1/callback' do Supabase → deep link → 'app/auth/… |
| DIAGNOSTICO_BUGS_APK.md:259 | DOCUMENTAÇÃO | - 'authService.ts:46–53' usa browser do sistema via Linking. **Não há WebBrowser/openAuthSessionAsync no caminho atual**; não se deve descrever uma API que não está implementada. |
| DIAGNOSTICO_BUGS_APK.md:261 | DOCUMENTAÇÃO | - A frase relatada é produzida especificamente em 'app/auth/callback.tsx:40–41', quando a descrição contém **'Unable to exchange external code'**. Esse ramo termina antes de chamar 'exchangeCallbackCode'. |
| DIAGNOSTICO_BUGS_APK.md:281 | DOCUMENTAÇÃO | 'authService.ts:6', ':46', ':61'; 'supabase.ts:14'; 'app/auth/callback.tsx:33'; 'AuthContext.tsx:31', ':72'; 'app.json' (scheme); Manifest Native (intent-filter); código oficial GoTrue 'oAuthCallback'. |
| DIAGNOSTICO_BUGS_APK.md:291 | DOCUMENTAÇÃO | - **Código — CORREÇÃO DE CÓDIGO somente após revisão:** avaliar tratamento do callback, deduplicação por operação e observabilidade por etapa. Não introduzir WebBrowser como suposta correção antes de identificar a falha. |
| DIAGNOSTICO_BUGS_APK.md:424 | DOCUMENTAÇÃO | ## BUG 7 — Recuperação de senha retorna para localhost |
| DIAGNOSTICO_BUGS_APK.md:428 | DOCUMENTAÇÃO | Email chega, link abre 'http://localhost:8081' no celular e não permite redefinição. |
| DIAGNOSTICO_BUGS_APK.md:432 | DOCUMENTAÇÃO | 'ForgotPassword.submit' → 'sendRecoveryEmail' → 'resetPasswordForEmail(email, {redirectTo})' → verificação do link no Supabase/template → redirect → 'auth/callback' → troca PKCE → 'next=reset-password' → 'auth/reset-password'. |
| DIAGNOSTICO_BUGS_APK.md:436 | DOCUMENTAÇÃO | - **Valor que o código Native passa ao SDK:** 'kindlereader://auth/callback?next=reset-password' ('authService:6–10', ':58'). Ele não escolhe localhost no ramo Native. |
| DIAGNOSTICO_BUGS_APK.md:437 | DOCUMENTAÇÃO | - Web usa '${window.location.origin}/auth/callback?next=reset-password'; na ausência de window usa 'http://localhost:8081'. O sourcemap Android confirma esse serviço no build local. |
| DIAGNOSTICO_BUGS_APK.md:440 | DOCUMENTAÇÃO | - A documentação de implantação existente recomenda 'kindlereader://auth/callback' na allowlist, mas não explicita a variante **com query '?next=reset-password'**. Isso é uma lacuna das instruções, não prova da allowlist efetivamente con… |
| DIAGNOSTICO_BUGS_APK.md:443 | DOCUMENTAÇÃO | - 'sendRecoveryEmail' ignora o 'error' retornado pelo SDK; a UI também mostra resposta genérica em vários erros. Isso não explica o localhost, mas impede usar “email solicitado” como confirmação de redirect aceito. |
| DIAGNOSTICO_BUGS_APK.md:447 | DOCUMENTAÇÃO | O endereço localhost **não é selecionado pelo código Native atual**. Há um mecanismo externo concreto para o resultado: redirect não aceito → Site URL, ou template apontando diretamente para SiteURL. A query do recovery é um candidato ve… |
| DIAGNOSTICO_BUGS_APK.md:455 | DOCUMENTAÇÃO | 'authService.ts:6', ':56'; 'app/auth/forgot-password.tsx:8'; 'app/auth/callback.tsx:57'; 'app/auth/reset-password.tsx:11'; Manifest/app.json; SDK 'resetPasswordForEmail'; GoTrue 'GetReferrer/IsRedirectURLValid'. |
| DIAGNOSTICO_BUGS_APK.md:465 | DOCUMENTAÇÃO | - **Código — CORREÇÃO DE CÓDIGO posterior:** manter rotas Web/Native e contexto recovery coerentes; observar resultado SDK sem alterar a política anti-enumeração. Não adicionar fallback local para localhost. |
| GOOGLE_DRIVE_IMPLEMENTATION.md:17 | DOCUMENTAÇÃO | DRIVE — AUTH/CONEXÃO: Web Google Identity Services token model/script oficial pré-carregado no modal/popup por gesto explícito; Android módulo Expo AldusDriveAuth/AuthorizationClient/Play Services Auth 22.0.0/resolução Activity. iOS/Expo… |
| GOOGLE_DRIVE_IMPLEMENTATION.md:23 | DOCUMENTAÇÃO | Disconnect limpa sessão/índice e tenta GIS revoke na Web/POST nativo de revogação. Offline/sem token: revogação remota NÃO confirmada; UI orienta myaccount.google.com/connections. Remover apaga configuração/conexão/índice, não livros imp… |
| GOOGLE_DRIVE_IMPLEMENTATION.md:29 | DOCUMENTAÇÃO | 3. Clients → Create client → Web application: Authorized JavaScript origins exatas (scheme/host/porta, sem path), p.ex. http://localhost:8081 e origem HTTPS publicada. Copiar **somente Client ID público** para 'EXPO_PUBLIC_GOOGLE_DRIVE_W… |
| GOOGLE_DRIVE_IMPLEMENTATION.md:30 | DOCUMENTAÇÃO | 4. Clients → Create client → Android: package 'com.aldus.reader', SHA-1 da assinatura exata do APK. Registrar debug/EAS/release/Play conforme usado; obter por 'keytool -list -v -keystore <arquivo> -alias <alias>' (senha no prompt) ou Pla… |
| GOOGLE_DRIVE_IMPLEMENTATION.md:73 | DOCUMENTAÇÃO | Referências oficiais: [scopes](https://developers.google.com/workspace/drive/api/guides/api-specific-auth), [GIS Web](https://developers.google.com/identity/oauth2/web/guides/use-token-model), [Android](https://developer.android.com/iden… |
| LEGAL_IMPLEMENTATION_NOTES.md:21 | DOCUMENTAÇÃO | Checkpoint Drive final: download explícito entrega EPUB/PDF ao importador existente, sem upload; metadata índice memória, config local, credenciais app memória/header transitório, API Google direta. GIS script só carregado no modal quand… |
| LEGAL_IMPLEMENTATION_NOTES.md:53 | DOCUMENTAÇÃO | Google Drive agora implementado (NÃO TESTADO COM CONTA REAL): autorização separada Android AuthorizationClient/Web GIS; drive.readonly restrito/amplo leitura/download, consultas app só na pasta direta. Configuração nome/URL/folderId/reso… |
| PROJECT_CONTEXT.md:15 | DOCUMENTAÇÃO | DRIVE — AUTH/CONEXÃO / LISTAGEM: IMPLEMENTADO e VALIDADO COM MOCKS. Android AuthorizationClient/GIS Web, drive.readonly amplo somente leitura, tokens memória/expiração/clearToken/401/reconnect explícito/revogação best effort. Fonte estáv… |
| PROJECT_CONTEXT.md:44 | DOCUMENTAÇÃO | **AUTH CLIENT / BUGS 4–7:** não surgiu divergência local nova que justificasse reescrever o fluxo. BUG 5 A–E passou novamente em componentes reais com fronteiras controladas: credencial inválida não libera acesso; sessão+perfil ativo são… |
| PROJECT_CONTEXT.md:74 | DOCUMENTAÇÃO | **IMPLEMENTADO:** identidade pública migrada de Kindle Reader para **Aldus Reader**, com nome curto/Expo **Aldus**. 'package.json'/lockfile usam 'aldus-reader'; 'app.json' usa slug 'aldus-reader', scheme 'aldus', Web name 'Aldus Reader'/… |
| PROJECT_CONTEXT.md:80 | DOCUMENTAÇÃO | **PENDENTE — CONFIGURAÇÃO EXTERNA:** no Supabase, cadastrar 'aldus://auth/callback' e 'aldus://auth/callback?next=reset-password' nas Redirect URLs; remover o callback antigo apenas quando nenhuma build antiga precisar dele. No Google Cl… |
| PROJECT_CONTEXT.md:144 | DOCUMENTAÇÃO | Gates finais PASS: typecheck, export Web (2335 módulos), Auth/callback, Reflow, Reader Native/Screen, Sources/catálogos, motion/lifecycle, anchors/storage/organização. Livros reais no Chromium e cinco PDFs Web PASS. Diff da campanha PASS… |
| PROJECT_CONTEXT.md:342 | DOCUMENTAÇÃO | - **Spinner infinito na tela de callback de autenticação ao receber erro OAuth (2026-10-06):** quando o provedor externo (Google) ou o Supabase redirecionavam com parâmetros de erro ('error', 'error_code', 'error_description') via query … |
| PROJECT_CONTEXT.md:358 | DOCUMENTAÇÃO | **Problema:** tela de callback de autenticação ('/auth/callback') ficava travada indefinidamente em "Concluindo acesso" com spinner de carregamento quando o fluxo OAuth do Supabase/Google retornava erro na URL ('error=server_error&error_… |
| PROJECT_CONTEXT.md:362 | DOCUMENTAÇÃO | 2. No fluxo cliente: 'app/auth/callback.tsx' consumia apenas o parâmetro 'code' via 'useLocalSearchParams'. Como 'code' vinha indefinido, o efeito retornava precocemente sem atualizar o estado 'error'. O componente mantinha 'error = null… |
| PROJECT_CONTEXT.md:370 | DOCUMENTAÇÃO | **Arquivos alterados:** 'app/auth/callback.tsx', 'PROJECT_CONTEXT.md'. |
| PROJECT_CONTEXT.md:491 | DOCUMENTAÇÃO | O servidor Expo em '127.0.0.1:8084' respondeu HTTP 200 para '/library'. Foram tentados Chrome não headless, Chrome não headless com opções SwiftShader/desativação de GPU e Edge headless, cada qual com perfil isolado. Chrome e Edge regist… |
| PROJECT_CONTEXT.md:1057 | DOCUMENTAÇÃO | - Chrome headless Windows, perfil isolado, aplicação exportada em http://127.0.0.1:8097: Biblioteca, Sol/Lua persistido, Ajustes, anti-enjoo indisponível Web, fonte JSON CRUD/reload, loading termina, erro total/erro parcial, detalhes, aq… |
| PROJECT_CONTEXT.md:1210 | DOCUMENTAÇÃO | **Auth/UI no código:** telas Login, Criar Conta, Recuperar Senha, Redefinir Senha, callback PKCE, Escolher Usuário; Conta, Editar Perfil, Alterar Senha e Sair. 'AuthProvider' restaura sessão, busca perfil/overrides, usa cache por UUID pa… |
| PROJECT_CONTEXT.md:1223 | DOCUMENTAÇÃO | Na tentativa de login social via Google na versão Web ('localhost:8081'), o navegador foi redirecionado para a rota '/auth/callback' com parâmetros de erro na URL: |
| PROJECT_CONTEXT.md:1232 | DOCUMENTAÇÃO | - O Supabase redirecionou a aplicação cliente para 'http://localhost:8081/auth/callback' com 'error=server_error' e a descrição detalhada. |
| PROJECT_CONTEXT.md:1233 | DOCUMENTAÇÃO | 2. **Defeito de UX na rota cliente ('app/auth/callback.tsx'):** |
| PROJECT_CONTEXT.md:1241 | DOCUMENTAÇÃO | - Em 'app/auth/callback.tsx': |
| PROMPT_INTEGRACAO_FLASHCARDS_KINDLE_READER.md:154 | DOCUMENTAÇÃO | Documente acesso à API no navegador, emulador e Android físico. Use endereços adequados a cada ambiente; o localhost do telefone não é o computador. |
| ROADMAP_FUNCIONALIDADES.md:17 | DOCUMENTAÇÃO | AUTH/CONEXÃO e LISTAGEM IMPLEMENTADOS, Drive mocks/pipeline/parsing/erros/cancel/source-specific PASS. Configuração externa PENDENTE; NÃO TESTADO COM CONTA REAL. Android AuthorizationClient/Web GIS sem segredo, drive.readonly. Download/i… |
| ROADMAP_FUNCIONALIDADES.md:87 | DOCUMENTAÇÃO | - ✅ Deep link/callback Native: 'aldus://auth/callback'; recovery: 'aldus://auth/callback?next=reset-password'. |
| modules/aldus-drive-auth/android/src/main/java/expo/modules/aldusdriveauth/AldusDriveAuthModule.kt:29 | NATIVE CORRETO | Identity.getAuthorizationClient(activity).authorize(request) |
| modules/aldus-drive-auth/android/src/main/java/expo/modules/aldusdriveauth/AldusDriveAuthModule.kt:42 | NATIVE CORRETO | try { complete(Identity.getAuthorizationClient(appContext.throwingActivity).getAuthorizationResultFromIntent(intent)) } |
| modules/aldus-drive-auth/android/src/main/java/expo/modules/aldusdriveauth/AldusDriveAuthModule.kt:47 | NATIVE CORRETO | Identity.getAuthorizationClient(appContext.reactContext!!) |
| scripts/test-auth-callback.cjs:17 | TESTE | const source = baseline && ['app/auth/callback.tsx', 'src/data/remote/authService.ts'].includes(file) |
| scripts/test-auth-callback.cjs:33 | TESTE | const client={auth:{exchangeCodeForSession:()=>{calls++;return gate;},resetPasswordForEmail:async(email,options)=>{urls.push(options.redirectTo);return {error:nextError};}}}; |
| scripts/test-auth-callback.cjs:41 | TESTE | const Screen=load('app/auth/callback.tsx').default; |
| scripts/test-auth-callback.cjs:60 | TESTE | assert.equal(urls.at(-1),'aldus://auth/callback?next=reset-password'); |
| scripts/test-auth-callback.cjs:63 | TESTE | assert.deepEqual(readAuthCallback('aldus://auth/callback?next=reset-password#code=fixture').next,'reset-password'); |
| scripts/test-auth-callback.cjs:64 | TESTE | assert.equal(readAuthCallback('aldus://auth/callback#error_description=Unable+to+exchange+external+code').error_description,'Unable to exchange external code'); |
| scripts/test-google-drive.cjs:107 | TESTE | console.log('PASS Web GIS gesture/scope/denial/close/late/config and Android wrapper cancel/late/iOS unavailable (controlled boundaries)'); |
| scripts/test-legal-browser.cjs:4 | TESTE | const endpoint = process.env.LEGAL_PREVIEW_CDP_URL \|\| "http://127.0.0.1:9333"; |
| scripts/test-legal-browser.cjs:5 | TESTE | const previewOrigin = process.env.LEGAL_PREVIEW_ORIGIN \|\| "http://127.0.0.1:4877"; |
| scripts/test-library-web.cjs:30 | TESTE | await new Promise(r=>server.listen(0,'0.0.0.0',r));const originA='http://127.0.0.1:${server.address().port}',originB='http://localhost:${server.address().port}'; |
| scripts/test-library-web.cjs:34 | TESTE | let port;for(let i=0;i<80;i++){const f=path.join(profileDirectory,'DevToolsActivePort');if(fs.existsSync(f)){port=fs.readFileSync(f,'utf8').split('\n')[0];break;}await wait(100);}assert.ok(port);const tabs=await(await fetch('http://127.0… |
| scripts/test-reader-browser.cjs:29 | TESTE | const target=(await(await fetch('http://127.0.0.1:9382/json/list')).json()).find(t=>t.type==='page'); |
| scripts/test-search-pipeline.cjs:46 | TESTE | await new Promise(r=>server.listen(0,'127.0.0.1',r)); |
| scripts/test-search-pipeline.cjs:47 | TESTE | try{const base='http://127.0.0.1:${server.address().port}'; |
| scripts/test-source-library-browser.cjs:31 | TESTE | await new Promise(r => server.listen(0, '127.0.0.1', r)); const origin = 'http://127.0.0.1:${server.address().port}'; |
| scripts/test-source-library-browser.cjs:36 | TESTE | assert.ok(port, 'Chrome CDP startup'); const tabs = await (await fetch('http://127.0.0.1:${port}/json')).json(); client = await cdp(tabs.find(t => t.type === 'page').webSocketDebuggerUrl); |
| src/data/library/bundledBookManifest.json:157 | NÃO RELEVANTE | "id": "bundled-pdf-6e3708c620be9a335b56a991685e60904aca48081c97d289c019a3f248a17898", |
| src/data/library/bundledBookManifest.json:158 | NÃO RELEVANTE | "hash": "6e3708c620be9a335b56a991685e60904aca48081c97d289c019a3f248a17898", |
| src/data/remote/authService.ts:10 | FALLBACK PERIGOSO | ? '${typeof window === "undefined" ? "http://localhost:8081" : window.location.origin}/auth/callback' |
| src/data/remote/authService.ts:11 | NATIVE CORRETO | : "aldus://auth/callback"; |
| src/data/remote/authService.ts:52 | NATIVE CORRETO | options: { emailRedirectTo: authCallbackUrl(), data: { username: normalizeUsername(username), display_name: name.trim() } }, |
| src/data/remote/authService.ts:68 | NATIVE CORRETO | const { data, error } = await client.auth.signInWithOAuth({ |
| src/data/remote/authService.ts:70 | NATIVE CORRETO | options: { redirectTo: authCallbackUrl(), skipBrowserRedirect: Platform.OS !== "web" }, |
| src/data/remote/authService.ts:78 | NATIVE CORRETO | const { error } = await requireSupabase().auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo: authCallbackUrl("reset-password") }); |
| src/data/remote/authService.ts:96 | NATIVE CORRETO | const { error } = await requireSupabase().auth.exchangeCodeForSession(code); |
| src/presentation/components/SourceManagerModal.tsx:48 | DEV WEB LEGÍTIMO | // A saved Drive source also needs GIS ready for the row's reconnect gesture. |

## Fluxos efetivos conferidos

- Login Aldus: `authService.loginWithGoogle` → Supabase PKCE `signInWithOAuth` com `redirectTo=aldus://auth/callback` no Android → `Linking.openURL` → Google → callback HTTPS do Supabase → deep link Aldus → `app/auth/callback` → `exchangeCodeForSession` → evento Auth → perfil/guard. Recovery solicita `aldus://auth/callback?next=reset-password`.
- Drive Android: `SourceManagerModal.probe`, chamado por salvar/atualizar/ativar fonte Drive → `googleDrive.connect` → `DriveAuthorization.connect` → `drivePlatformAuth.authorize` ramo Android → `requireOptionalNativeModule("AldusDriveAuth")` → `AuthorizationClient.authorize` → PendingIntent/resolução quando necessária → `OnActivityResult` → `getAuthorizationResultFromIntent` → credencial apenas em memória → API Drive. `sourceCatalogAdapter.list` usa a listagem Drive já autorizada.
- Drive Web: ramo `Platform.OS === "web"` → GIS `initTokenClient/requestAccessToken` com popup token model. O serviço não define redirect_uri, não usa callback Supabase e não constrói localhost.
- Android sem módulo: falha explícita de configuração. Não existe fallback para Web/GIS no wrapper baseline. Scope preservado: `https://www.googleapis.com/auth/drive.readonly`.

## APK real do baseline

| Propriedade | Prova |
|---|---|
| Arquivo | `artifacts/apk/Aldus-eab97ee.apk`, 251587130 bytes |
| SHA256 APK | `402e136a8b24eed5fceacb532cfa21728c05a0b86a2b518efa3300d1654845d1` |
| Package | `com.aldus.reader`, obtido por `apkanalyzer manifest application-id` |
| Variante | release local, `apkanalyzer manifest debuggable=false`; bundle gerado em release |
| Origem da chave | `android/app/debug.keystore`; Gradle release usa `signingConfigs.debug` |
| SHA-1 diretamente do APK | `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25`, `apksigner verify --print-certs` PASS |
| Manifest | MainActivity `singleTask`, intent VIEW/DEFAULT/BROWSABLE com scheme `aldus`; scheme Expo development adicional |
| Registro Native no DEX | `ExpoModulesPackageList.<clinit>` contém const-class de `expo.modules.aldusdriveauth.AldusDriveAuthModule` |
| Chamada nativa no DEX | corpo authorize cria `AuthorizationRequest`, solicita drive.readonly e invoca `Identity.getAuthorizationClient(activity).authorize` |
| Resolução e retorno no DEX | `AuthorizationResult.hasResolution`, `Activity.startIntentSenderForResult`, listener OnActivityResult e `getAuthorizationResultFromIntent` presentes |
| Bundle Hermes do APK | 7077040 bytes, SHA256 `9DD89BB905476048D74190FADF7FE0E6946F018DC33D495785A360A090492B96`; idêntico ao arquivo gerado release |
| Strings do bundle | `AldusDriveAuth` e `aldus://auth/callback` presentes; URL de carregamento GIS ausente no bundle Android |
| Android físico | ADB sem aparelhos; **ANDROID REAL — PENDENTE** |

A chave debug local também assina este release local. Esse SHA-1 não prova certificados EAS, upload ou Play App Signing; registrar cada certificado efetivamente usado no respectivo OAuth Android client. Nenhuma senha foi incluída neste laudo.

Evidências ignoradas: `APK_BASELINE_EVIDENCE.json`, `apk-eab97ee-manifest.xml`, `apk-eab97ee-module-registry.txt`, `apk-eab97ee-drive-module.txt`, `apk-eab97ee-authorize-body-alt.txt`, `apk-eab97ee-resolution-body.txt`, `apk-eab97ee-activity-result-body.txt` e `apk-eab97ee-bundle-proof.json`, em `artifacts/auth/urgent/`.

Essas provas confirmam o caminho compilado/registrado neste APK; não provam que o aparelho do usuário está executando esse mesmo arquivo, nem substituem teste Android real com login, consentimento, conta escolhida e pasta autorizada. A causa específica de eventual falha Drive exige diagnóstico do módulo e resposta sanitizada da API; o localhost Supabase está comprovado separadamente.

## Limites externos

Configuração administrativa Supabase/Google Cloud, Drive API habilitada, OAuth Android client package/SHA-1, consent screen/test users, login real, pasta real, importação e troca de contas continuam pendentes até haver acesso e aparelho. As correções cliente precisam de gates/commit/APK no checkpoint da tarefa; este documento é inventário e evidência do baseline, não declaração de resolução física.

## Regressão independente do Web desta tarefa

`node scripts/test-source-library-browser.cjs` PASS no app exportado: rotas Sources, grade/lista/busca, importação EPUB pelo pipeline real, reabertura, refresh com erro, offline, reconexão necessária, snapshot persistido, vazio e remoção preservando livro/Blob. IndexedDB real passou no rollback; 1000 metadados indexados com 24 cards montados. Supabase e HTTP da fonte eram fixtures controladas; isso não valida login Google, token/pasta Drive reais nem Android. Capturas em `.expo/source-library-validation/`; revisão de lifecycle/diagnósticos em `artifacts/auth/urgent/DRIVE_REVIEW.md`.
