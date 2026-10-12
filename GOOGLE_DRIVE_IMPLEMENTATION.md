# Google Drive — atualizado em 12/10/2026

## Correção urgente de Auth/Drive — causa e limites atuais

**LOCALHOST COMPROVADO NO SUPABASE, NÃO NO ADAPTER DRIVE.** A sonda HTTP real de 12/10/2026 iniciou OAuth Google/PKCE no projeto `cmivracxuihtmsbmtuec` e devolveu o estado real ao callback Supabase com cancelamento do provider. Quando o `redirect_to` solicitado era `aldus://auth/callback` ou sua variante de recovery, a resposta `Location` do Supabase foi `http://localhost:8081/`. O Web dev `http://localhost:8081/auth/callback` foi preservado; um scheme de controle não cadastrado também caiu na raiz localhost. Isso comprova que o backend produz o fallback no cancelamento e que o contrato Native está recusado nessa sonda; a configuração administrativa exata e o retorno após consentimento bem-sucedido precisam de confirmação remota. Não se inferiu a conclusão de um login a partir do primeiro 302 Google. Evidência sanitizada: `artifacts/auth/urgent/redirect-probe.json`; execução reproduzível: `npm run audit:auth:redirects`.

**DRIVE ANDROID — CAMINHO NATIVO COMPROVADO NO APK BASELINE.** `artifacts/auth/urgent/APK_BASELINE_EVIDENCE.json` registra `Aldus-eab97ee.apk`: módulo Expo `AldusDriveAuth` presente no registro e no DEX, chamada a `Identity.getAuthorizationClient(...).authorize()`, `PendingIntent`/`startIntentSenderForResult` e `getAuthorizationResultFromIntent`. O bundle seleciona GIS somente com `Platform.OS === "web"`; Android consulta somente o módulo Native. Não havia fallback GIS/browser/localhost no Drive Android auditado. Esse exame prova empacotamento e despacho, sem equivaler a uma execução em aparelho.

**CORREÇÕES DRIVE IMPLEMENTADAS:**

- Android mantém `AuthorizationClient`/PendingIntent/ActivityResult. `authorize(operationId)` e `cancelAuthorization(operationId)` identificam a operação; um cancelamento antigo não encerra a nova. Resultado atrasado com outro request code é ignorado. Falta de módulo ou Activity encerra com erro de configuração, sem abrir Web. Cancelamento, sessão necessária, configuração, rede, escopo negado e falha desconhecida permanecem separados. Falha genérica de Play Services não é chamada de recusa do usuário.
- Web mantém GIS token model por clique, Client ID público do ambiente e origem real do navegador. Reconexão não aguarda o `clearToken` Web antes de `requestAccessToken`, preservando o gesto do popup. O prompt solicita seletor de conta/consentimento; popup fechado e popup bloqueado têm mensagens distintas. Nenhum redirect customizado foi inventado para GIS.
- `drive.readonly` permanece o único scope. Tokens do app continuam somente em memória; token Supabase não é usado como token Drive. SDK Android mantém seu cache próprio. Expiração local/HTTP401 e scope insuficiente conhecido pedem reconexão, invalidando o índice em memória e preservando o catálogo persistido. `clearToken` não garante seletor ou troca de conta no Android; `AuthorizationResult` não informa a identidade da conta e não foram acrescentados scopes de perfil.
- O adapter usa somente reasons conhecidos no corpo JSON Google para distinguir API desabilitada (`accessNotConfigured`/`SERVICE_DISABLED`), limite (inclusive HTTP403), scope insuficiente e permissão de arquivo. HTTP403 sem reason suficiente permanece `UNKNOWN`; não vira automaticamente pasta inválida ou autorização negada. Mensagens brutas/respostas Google não chegam a logs ou persistência.
- Minhas fontes mostra **Conectado / Atualizar** quando há grant válido e **Reconectar** quando ele falta/expirou. Atualizar aproveita o grant válido. A operação permanece ocupada até salvar/atualizar o catálogo e termina em `finally`; autorização é limitada a 120 s. Fechar o modal aborta a operação; uma conclusão antiga não apaga grant de conexão nova. Mensagens específicas alcançam também o overview/biblioteca da fonte. Falha/revogação não elimina o último snapshot.

| Categoria sanitizada (`DriveError.category`) | Situação |
| --- | --- |
| `AUTH_CANCELLED` | Usuário fechou/cancelou a autorização |
| `AUTH_REQUIRED` | Grant ausente; popup Web bloqueado tem orientação própria |
| `AUTH_DENIED` | Provider negou o grant ou scope obrigatório não foi concedido/aceito |
| `TOKEN_EXPIRED` | Prazo local ou HTTP401; expiração e revogação não são distinguíveis só pelo 401 |
| `DRIVE_API_DISABLED` | Reason Google conhecido para serviço desabilitado |
| `FOLDER_NOT_FOUND` | HTTP404, que pode significar ausência ou recurso não visível |
| `FOLDER_FORBIDDEN` | Reason conhecido de permissão de arquivo ou canDownload=false |
| `NETWORK_ERROR` | Falha de transporte ou timeout |
| `RATE_LIMIT` | HTTP429 ou reason Google conhecido de limite |
| `INVALID_FOLDER` | Parsing inválido ou ID que não representa pasta real |
| `UNKNOWN` | Configuração/build, resposta HTTP403 sem reason suficiente ou falha não identificada |

`DriveError.code` mantém os identificadores anteriores para os consumers existentes; `category` oferece a taxonomia técnica solicitada. Diagnóstico `[DriveDiagnostic]` é opt-in por `EXPO_PUBLIC_DRIVE_DIAGNOSTICS=1` ou `EXPO_PUBLIC_AUTH_DIAGNOSTICS=1`: operationId, flow DRIVE, plataforma, implementação `AUTHORIZATION_CLIENT`/`GIS_WEB`, appState, callbackReceived, authorizationResult e categoria. A resolução/ActivityResult envia somente ID/etapa via evento Expo; emissão é best effort e nunca interrompe o resultado. `callbackReceived` representa ActivityResult observado, não qualquer rejeição de Task. Sucesso de cache sem ActivityResult não finge retorno de consentimento. Token, code, verifier, senha, segredo, conta, folderId e URL retornada não fazem parte da allowlist. Drive não usa URI de callback; initialRedirectScheme é `none`.

**ASSINATURA DO APK REAL AUDITADO:** package `com.aldus.reader`, variant `release` local, chave `android/app/debug.keystore` porque o Gradle atual assina debug e release com `signingConfigs.debug`. Certificado do APK baseline verificado por `apksigner`: SHA-1 `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25`. Isso identifica exclusivamente os APKs locais atuais; não identifica EAS nem Play signing. Nenhuma senha da chave foi adicionada ao diagnóstico/documentação.

**CONFIGURAÇÃO EXTERNA — NÃO CONFIRMADA:** projeto Google Cloud dono do client Android, Drive API habilitada, Android client com package/SHA acima, consentimento/Testing/test users e permissões da pasta real requerem acesso administrativo à conta correta. O projeto Cloud Drive não pode ser deduzido do provider Google/Supabase. `EXPO_PUBLIC_GOOGLE_DRIVE_WEB_CLIENT_ID` continua ausente do ambiente local auditado; isso bloqueia GIS Web, sem bloquear o caminho AuthorizationClient Android. Não preencher com um Client ID suposto ou secret. O checklist exato está abaixo; os redirects Supabase pertencem ao fluxo de Auth e estão documentados em `AUTH_IMPLEMENTATION.md`.

**VALIDAÇÃO ATUAL:** typecheck, `npm run test:drive`, `npm run test:source-catalog`, `node scripts/test-source-integrations.cjs` PASS. Kotlin `:aldus-drive-auth:compileReleaseKotlin` PASS com JDK17/SDK legítimo, após fornecer `ANDROID_HOME=C:\Android\sdk`. Testes executam código real JS/adapters/repos e fronteiras Google/ponte/HTTP controladas: dispatch Android mesmo com GIS global disponível/sem Client ID Web, módulo ausente sem fallback, pre-abort, callback tardio, geração durante clearToken, gesto Web síncrono, cancelamento/denial/popup/expiração/reconnect, razão específica de HTTP403, pasta de outra conta compartilhada (sem filtro de ownership), EPUB/PDF metadata/páginas/rollback/snapshot e download para pipeline existente. A inspeção DEX/manifesta/assinatura é real; os resultados de Drive HTTP dessa suíte são fixtures.

**ANDROID REAL — PENDENTE.** Sem aparelho ADB disponível, login/retorno foreground/background, pasta real cadastrada, listagem EPUB/PDF/paginação, importação de livro autorizado/reabertura, revogação real e troca de conta Google permanecem pendentes. Nenhum folderId do usuário ou token de conta real está disponível neste workspace; não foi substituído por uma pasta pública aleatória. Nenhuma listagem ou importação real foi declarada concluída. O APK e o relatório pós-commit são registrados pelo fluxo principal em `artifacts/apk`/relatório da tarefa; compilar Kotlin e passar mocks não resolve o bloqueio remoto do Supabase nem prova o teste físico.

Referências de configuração e limites: [autorização Android e seleção da conta](https://developer.android.com/identity/authorization), [GIS token model](https://developers.google.com/identity/oauth2/web/guides/use-token-model), [reasons de erros Drive](https://developers.google.com/workspace/drive/api/guides/handle-errors).

## Evolução atual — cópia privada da biblioteca Aldus

Autorização Drive continua separada de login/sessão Supabase, somente leitura e tokens em memória. O app não envia nem modifica arquivos no Drive. Depois da importação local existente, o livro pertence à conta Aldus e seu arquivo definitivo pode ser enviado ao Storage privado do Supabase; metadados/progresso/estudo sincronizam. Outro aparelho recebe metadados e baixa a cópia pessoal ao abrir, sem depender de autorização Drive. Catálogo, folderId/resourceKey, vínculos e credenciais da fonte não são enviados com a biblioteca.

test:drive/test:source-catalog e Sources browser PASS controlado após integração. Drive real e Android físico NÃO TESTADOS; Supabase/RLS/Storage real PENDENTES e duas migrations NÃO APLICADAS. Detalhes/limites/implantação: LIBRARY_SYNC_IMPLEMENTATION.md e LIBRARY_SYNC_DEPLOYMENT.md. Registros anteriores de sem cloud sync devem ser lidos como checkpoints históricos da integração Drive, não estado atual da biblioteca pessoal.

## Evolução na quarta etapa — biblioteca permanente por fonte

Agora há /sources/[sourceId], snapshot de metadados persistente SQLite/IndexedDB, busca local e refresh atômico via listagem paginada já existente. Reload perde apenas tokens/índice memória, não o catálogo local. Desconectar preserva snapshot; remover purga configuração/catalog/link mas preserva Library. Importação registra sourceId+fileId->bookId somente após sucesso, sem igualdade de títulos; estado remoto/importando/importado/indisponível separado de leitura. Detalhes/gates atuais em SOURCE_LIBRARY_IMPLEMENTATION.md. As afirmações abaixo de índice exclusivamente em memória e próxima etapa não implementada são históricas. GOOGLE DRIVE REAL — NÃO TESTADO; sem subpastas/atalhos/upload/sync.

## Arquitetura e estado

IMPLEMENTADO: UserSourceRepository/AsyncStorage persistem `kind=google-drive`, `id` (sourceId estável), nome, URL, folderId/resourceKey não secretos. SearchPlugin ganhou método assíncrono opcional; GoogleDriveSearchPlugin → GoogleDriveService → ranking compartilhado. Seleção consulta adapter antes da busca; Todas/geração/abort/parciais preservados. Google Supabase é login PKCE, não autorização Drive: nenhum provider token reaproveitado. Reader/OCR/Reflow/Auth geral/flashcards não alterados.

DRIVE — AUTH/CONEXÃO: Web Google Identity Services token model/script oficial pré-carregado no modal/popup por gesto explícito; Android módulo Expo AldusDriveAuth/AuthorizationClient/Play Services Auth 22.0.0/resolução Activity. iOS/Expo Go/build sem módulo: indisponibilidade explícita. Sem backend de tokens, segredo, service account ou service_role.

Scope único: `https://www.googleapis.com/auth/drive.readonly`, restrito, **leitura/download de todo o Drive**, não só pasta. Restrição às consultas da pasta é comportamento do app, NÃO fronteira OAuth. Sem escrita/delete/upload. `drive.file` concede arquivos individualmente selecionados/compartilhados com app; não assumir autorização transitiva para filhos preexistentes ao selecionar pasta. `drive.metadata.readonly` não permite baixar conteúdo. Alternativa menor exigiria Picker/seleção individual, mudando o produto; full `drive` é desnecessário.

Tokens app só memória por sourceId; Web expires_in, Android 45 min conservadores (API sem expires_in, cache SDK pode vencer antes, sempre tratar 401). Google Play Services mantém cache próprio; clearToken em invalidação/desconexão. Sem refresh token/offline access. Reload perde tokens/índice, não fonte. Conectar/Atualizar é ação explícita; busca não abre popup espontâneo. Autorização limitada 120 s, metadata 20 s, revogação 10 s. Erros sanitizados, sem resposta/token em logs.

Disconnect limpa sessão/índice e tenta GIS revoke na Web/POST nativo de revogação. Offline/sem token: revogação remota NÃO confirmada; UI orienta myaccount.google.com/connections. Remover apaga configuração/conexão/índice, não livros importados. Revogar pode afetar grants/fontes da mesma conta/projeto; preferir projeto Google dedicado ao Drive, separado do Google Supabase. Não prometer revogação isolada por pasta.

## Configuração externa exata — PENDENTE, nenhum painel alterado

1. Google Cloud → projeto dedicado → APIs & Services → Library → Google Drive API → Enable.
2. Google Auth Platform → Branding/Audience/Data Access: nome Aldus Reader, emails reais, domínio e URLs públicas Política/Termos; drive.readonly. Testing: cadastrar test users. Público: verificação de escopo restrito e avaliação dos requisitos de security assessment conforme regras/arquitetura Google; não alegar aprovação antes de confirmar.
3. Clients → Create client → Web application: Authorized JavaScript origins exatas (scheme/host/porta, sem path), p.ex. http://localhost:8081 e origem HTTPS publicada. Copiar **somente Client ID público** para `EXPO_PUBLIC_GOOGLE_DRIVE_WEB_CLIENT_ID` no ambiente de build; reexportar/rebuildar. Token model popup NÃO usa redirect URI: `aldus://auth/callback` não é callback Drive Web. Nunca colocar client_secret no app.
4. Clients → Create client → Android: package `com.aldus.reader`, SHA-1 da assinatura exata do APK. Registrar debug/EAS/release/Play conforme usado; obter por `keytool -list -v -keystore <arquivo> -alias <alias>` (senha no prompt) ou Play Console → App integrity → App signing key certificate. Fingerprint histórico debug em AUTH_IMPLEMENTATION não prova produção. Android não usa Client ID env nem custom redirect URI: AuthorizationClient identifica package/SHA, sem google-services.json nesta API. Precisa Play Services e novo APK autolinkado.
5. Confirmar políticas Workspace/admin, consentimento e permissão real da pasta na conta autorizada. Supabase Google/callback/secret existentes separados e não alterados. Nunca registrar tokens nas evidências.

## Listagem e pesquisa

DRIVE — LISTAGEM: ID `[A-Za-z0-9_-]` 10–200 caracteres ou HTTPS drive.google.com `/drive/folders/ID`, `/drive/u/N/folders/ID`, `/folders/ID`, `/open?id=ID`, `/folderview?id=ID`, resourcekey opcional. Rejeita arquivo/host falso/http/credenciais/injeção. files.get confirma raiz folder não excluída. 404 = inexistente OU não visível, não é sempre distinguível. Resource key no header X-Goog-Drive-Resource-Keys.

Somente filhos diretos, fora da lixeira; fields id/name/MIME/size/modifiedTime/resourceKey/canDownload. EPUB/PDF por MIME/extensão; Docs/Sheets/outros/atalhos/subpastas excluídos; raiz-atilho recusada. Sem recursão/shortcut resolution/Docs export, explicitamente. Não baixa livro/HEAD por resultado/capa nem lê EPUB para extrair autoria. Drive não fornece autor literário: não inventar; filename pode incluir autor, outras fontes usam author real.

Shared drive usa driveId/corpora=drive, demais corpora=user. Page size 1000, nextPageToken até o fim inclusive página vazia; token repetido/incompleteSearch/limite de segurança falha, sem fingir índice completo. 401 expira; 403 permissão/API/consentimento; 404 não encontrado/não visível; 429 limite; rede/API separados. Sem retries em loop.

Índice só memória por sourceId/folderId, TTL 5 min; substituição completa após todas páginas/token válido/geração corrente, nunca parcial após falha/abort. Atualizar reconecta/refaz índice; não Cloud Sync. Persistir fonte ativa não comprova token atual. Índice persistente opcional não implementado.

DRIVE — SEARCH: NFKD/diacríticos Unicode/caixa/pontuação/separadores/espaços/extensão final EPUB/PDF; original intacto. Tokens únicos reordenáveis/lista curta herdada artigos/conectivos. Exato título 500, tokens título/prefixos >=3 letras 400+, título+autor 300+, assuntos 150, fuzzy uma edição/transposição 100 (mesma inicial, >=4 letras, âncora exata ou termo único >=6). Uma letra/vazio/erros excessivos sem resultado. Sem lib nova. Fallback remoto anterior no máximo um; Drive ranking local, não envia query Google.

## Aquisição e evidência

DRIVE — DOWNLOAD/IMPORT: IMPLEMENTADO / VALIDADO COM MOCKS. DownloadJob guarda format/sourceId/fileId, nunca token/header. DriveDownloadResolver verifica fonte ativa/persistida e chama downloadRequest para confirmar pertença ao índice/permissão atual; headers só na variável transitória do DownloadManager. EPUB usa EpubFileImporter existente; PDF usa PdfFileImporter existente (sem parser/persistência paralelos). Biblioteca recarrega após sucesso. HTTP falho é rejeitado antes de mover/importar; 401 invalida grant/índice, não vira arquivo corrompido. Resposta de token antigo não invalida conexão nova.

Native baixa em books/temp, verifica HTTP/tamanho, move para books/imported e passa URI ao importer; falha/cancel limpa temp e arquivo movido, incluindo escrita nativa tardia. Web faz streaming em Blob e passa ao importer, sem refetch não autenticado. Bytes/total reais dão percentual; total ausente é indeterminado. operationId/AbortSignal/terminal/stale guards preservados. Ajustes estritamente dependentes: checagem HTTP nativa, cleanup tardio demonstrado em teste, timeout Web por inatividade 60 s (não duração inteira para arquivo grande), cancelamento até persistência existente. Não alterados os importadores/lifecycle local. Web continua necessitando memória proporcional ao arquivo (chunks+Blob); não há streaming direto para disco/resume. Native usa downloader Expo existente, sem novo timeout/resume automático.

## Gates finais — 11/10/2026

PASS: npm run typecheck; node scripts/test-catalog-ranking.cjs; npm run test:drive (metadata/auth wrapper/repositório/resolver + download EPUB/PDF/8 MiB/cancel/erros/cleanup Native mocks); node scripts/test-source-integrations.cjs; node scripts/test-search-pipeline.cjs; node scripts/test-catalogs.cjs; npm run test:import; npm run test:legal; npm run legal:notices:check; npm run export:web (2345 módulos); git diff --check. Fronteiras OAuth/SKD/HTTP/FS são controladas nos testes, não conta real. scripts Sources receberam mocks da nova fronteira Native para não tentar executar código RN em Node.

| Consulta testada | Primeiro resultado da fixture |
| --- | --- |
| Memórias Póstumas de Brás Cubas; memorias postumas de bras cubas; bras cubas; memorias bras | Memórias Póstumas de Brás Cubas.epub |
| Dom Casmuro; casmurro dom | Dom Casmurro |
| revoluçao dos bichos; revolucao bichos | A Revolução dos Bichos.pdf |
| sociedade espetaculo | A Sociedade do Espetáculo |
| Machdo Assis | Memórias Póstumas de Brás Cubas.epub (autor real na fixture; também encontra Dom Casmurro) |
| CAPITAL; O Banquete | O Capital; O Banquete, respectivamente |
| vazio; a; x; @@!; casxxxmurro; memorias bras astronauta | sem resultado |

VALIDAÇÃO REAL PENDENTE: após configurar Cloud e build, cadastrar pasta pequena real com EPUB/PDF/arquivos outros; verificar metadata sem alt=media durante busca; testar pasta vazia e >1000 filhos; importar EPUB/PDF pequeno/grande; cancelar antes/durante download; conferir biblioteca e reabrir livros; expirar/revogar autorização e receber reconectar; 403/404 de pasta inacessível; desconectar/remover preservando importados; testar Web popup bloqueado/negado e Android retorno/certificado. Não executar no Drive de usuário sem autorização; nenhuma conta real foi conectada nesta tarefa.

Arquivos: src/data/drive/{DriveAuthorization,DriveErrors,driveFolder,drivePlatformAuth,GoogleDriveService,driveDependencies,DriveDownloadResolver}.ts; src/data/scraping/{GoogleDriveSearchPlugin,catalogPlugins}.ts; src/domain/search/catalogRanking.ts; src/domain/types/{sources,search,download}.ts; src/domain/usecases/SearchBooksUseCase.ts; src/data/downloads/DownloadManager.ts; src/presentation/{components/SourceManagerModal.tsx,stores/sourceStore.ts,services/dependencies.ts}; app/(tabs)/search.tsx; modules/aldus-drive-auth/{expo-module.config.json,android/build.gradle,android/src/main/AndroidManifest.xml,android/src/main/java/expo/modules/aldusdriveauth/AldusDriveAuthModule.kt}; scripts/test-{catalog-ranking,catalogs,search-pipeline,google-drive,drive-download}.cjs; package.json; src/legal/{legalConfig,legalContent}.ts; este documento e PROJECT_CONTEXT/ROADMAP_FUNCIONALIDADES/CORRECOES_BUGS_APK_PROGRESSO/LEGAL_IMPLEMENTATION_NOTES/AUTH_IMPLEMENTATION. Nenhum .env/token/secret/APK/keystore/artifact incluído.

Android autolinking PASS; tentativa `:aldus-drive-auth:compileDebugKotlin :app:processDebugMainManifest` BLOQUEADA antes da compilação por SDK Platform 36/Build Tools 35 ausentes e licenças não aceitas em C:/Android/sdk. Não aceitar licenças automaticamente pelo usuário; instalar/aceitar pelo SDK Manager e repetir. Kotlin/APK/Android físico NÃO TESTADOS. **NÃO TESTADO COM CONTA REAL**: mocks não validam console/consentimento/token/SHA/origens/download real.

Próxima etapa: BIBLIOTECA PERMANENTE POR FONTE, não implementada agora.

Referências oficiais: [scopes](https://developers.google.com/workspace/drive/api/guides/api-specific-auth), [GIS Web](https://developers.google.com/identity/oauth2/web/guides/use-token-model), [Android](https://developer.android.com/identity/authorization), [files.list](https://developers.google.com/workspace/drive/api/reference/rest/v3/files/list), [resource keys](https://developers.google.com/workspace/drive/api/guides/resource-keys).
