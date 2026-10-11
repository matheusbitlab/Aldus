# Google Drive — terceira etapa, 11/10/2026

## Arquitetura e estado

IMPLEMENTADO: UserSourceRepository/AsyncStorage persistem `kind=google-drive`, `id` (sourceId estável), nome, URL, folderId/resourceKey não secretos. SearchPlugin ganhou método assíncrono opcional; GoogleDriveSearchPlugin → GoogleDriveService → ranking compartilhado. Seleção consulta adapter antes da busca; Todas/geração/abort/parciais preservados. Google Supabase é login PKCE, não autorização Drive: nenhum provider token reaproveitado. Reader/OCR/Reflow/Auth geral/flashcards não alterados.

DRIVE — AUTH/CONEXÃO: Web Google Identity Services token model/script oficial pré-carregado no modal/popup por gesto explícito; Android módulo Expo AldusDriveAuth/AuthorizationClient/Play Services Auth 22.0.0/resolução Activity. iOS/Expo Go/build sem módulo: indisponibilidade explícita. Sem backend de tokens, segredo, service account ou service_role.

Scope único: `https://www.googleapis.com/auth/drive.readonly`, restrito, **leitura/download de todo o Drive**, não só pasta. Restrição às consultas da pasta é comportamento do app, NÃO fronteira OAuth. Sem escrita/delete/upload. `drive.file` concede arquivos individualmente selecionados/compartilhados com app; não assumir autorização transitiva para filhos preexistentes ao selecionar pasta. `drive.metadata.readonly` não permite baixar conteúdo. Alternativa menor exigiria Picker/seleção individual, mudando o produto; full `drive` é desnecessário.

Tokens app só memória por sourceId; Web expires_in, Android 45 min conservadores (API sem expires_in, cache SDK pode vencer antes, sempre tratar 401). Google Play Services mantém cache próprio; clearToken em invalidação/desconexão. Sem refresh token/offline access. Reload perde tokens/índice, não fonte. Conectar/Atualizar é ação explícita; busca não abre popup espontâneo. Autorização limitada 120 s, metadata 20 s, revogação 10 s. Erros sanitizados, sem resposta/token em logs.

Disconnect limpa sessão/índice e tenta POST de revogação. Offline/sem token: revogação remota NÃO confirmada; UI orienta myaccount.google.com/connections. Remover apaga configuração/conexão/índice, não livros importados. Revogar pode afetar grants/fontes da mesma conta/projeto; preferir projeto Google dedicado ao Drive, separado do Google Supabase. Não prometer revogação isolada por pasta.

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

DRIVE — DOWNLOAD/IMPORT: PENDENTE neste checkpoint; downloadRequest já valida pertencimento ao índice, existência/permissão atual e retorna alt=media+headers transitórios, nunca no store.

VALIDADO COM MOCKS: test-google-drive, test-catalog-ranking, test-search-pipeline, test-source-integrations e typecheck/test:legal. Parsing/metadata/paginação/cache/update/formato/HTTP/rede/abort/late/desconexão/permissão/source-specific/ranking. Export Web PASS (2344 módulos). Android autolinking PASS; tentativa `:aldus-drive-auth:compileDebugKotlin :app:processDebugMainManifest` BLOQUEADA antes da compilação por SDK Platform 36/Build Tools 35 ausentes e licenças não aceitas em C:/Android/sdk. Não aceitar licenças automaticamente pelo usuário; instalar/aceitar pelo SDK Manager e repetir. Kotlin/APK/Android físico NÃO TESTADOS. **NÃO TESTADO COM CONTA REAL**: mocks não validam console/consentimento/token/SHA/origens/download real.

Próxima etapa: BIBLIOTECA PERMANENTE POR FONTE, não implementada agora.

Referências oficiais: [scopes](https://developers.google.com/workspace/drive/api/guides/api-specific-auth), [GIS Web](https://developers.google.com/identity/oauth2/web/guides/use-token-model), [Android](https://developer.android.com/identity/authorization), [files.list](https://developers.google.com/workspace/drive/api/reference/rest/v3/files/list), [resource keys](https://developers.google.com/workspace/drive/api/guides/resource-keys).
