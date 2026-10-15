# Google Auth e Drive — procedimento de configuração e teste físico

Procedimento humano; estado atual somente em [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md)
e [BUGS_ATUAIS.md](BUGS_ATUAIS.md). Atualizado em 15/10/2026.
O usuário relatou Google funcionando após a sonda histórica abaixo. Não alterar OAuth
para tratar indexação sem uma nova evidência de falha de autorização/callback.
Nenhum painel foi alterado nesta campanha; migrations da biblioteca têm roteiro próprio.

## Referência histórica para investigar uma falha de callback

`npm run audit:auth:redirects` inicia OAuth Google/PKCE com a configuração pública do projeto e devolve ao callback Supabase o `state` real junto de um cancelamento simulado. Não entra em conta, envia email ou troca código. Estado/cookies/verifier/tokens não são registrados.

Em 12/10/2026, `redirectTo=aldus://auth/callback` e o mesmo callback com `?next=reset-password` receberam HTTP302 do endpoint **Supabase `/auth/v1/callback` para localhost**, enquanto `http://localhost:8081/auth/callback` foi preservado. Controle com esquema não autorizado recebeu o mesmo fallback. Evidência ignorada: `artifacts/auth/urgent/redirect-probe.json`.

Isso comprova quem produziu a URL nessa sonda: o Supabase/GoTrue. O campo administrativo exato ainda precisa de consulta. A combinação é consistente com deep links ausentes/não correspondentes na allowlist e fallback em Site URL localhost: [`GetReferrer` no GoTrue v2.197.0](https://raw.githubusercontent.com/supabase/auth/v2.197.0/internal/utilities/request.go) valida `redirect_to`/referrer e usa Site URL se forem rejeitados. Não atribuir o localhost ao módulo Drive Android: ele não usa redirect HTTP.

A sonda mede retorno de **cancelamento** do provedor; não comprova consentimento, client secret, troca final de código, perfil ou email de recovery. A tela Google abriu no navegador do app na auditoria anterior, mas isso não prova o retorno.

## Supabase — projeto `cmivracxuihtmsbmtuec`

1. Dashboard → **Authentication → URL Configuration**. Guardar somente os destinos atuais, sem segredos. Conferir **Site URL** e **Redirect URLs**. A distribuição Android não deve depender de localhost como destino padrão. Se o projeto for exclusivamente Native, definir `aldus://auth/callback` como Site URL; se também publicar Web, usar a origem HTTPS real publicada. Não inventar domínio nem remover os destinos de desenvolvimento necessários.
2. Adicionar exatamente `aldus://auth/callback` à allowlist. Para recovery, adicionar correspondência da query. O Supabase usa padrões glob, nos quais `?` é metacaractere: usar o padrão com `\?`, **`aldus://auth/callback\?next=reset-password`**, e conferir pela sonda. Se a versão/console normalizar padrões de outra forma, conferir o resultado efetivo, sem recorrer a `aldus://**`. Não colocar barra final incompatível com o destino solicitado.
3. Preservar `http://localhost:8081/auth/callback` somente para Web de desenvolvimento. Adicionar o callback `/auth/callback` na origem HTTPS real do Web publicado, e o equivalente de recovery. O APK sempre solicita o deep link literal, sem localhost.
4. **Authentication → Providers → Google**: provider habilitado e Web OAuth Client ID/secret correspondentes. O secret pertence somente a essa configuração segura, nunca ao Expo/APK/Git. Não rotacionar ou substituir valores sem verificar o client real e seus logs.
5. **Authentication → Email Templates → Reset Password**: usar o link de verificação fornecido pelo Supabase (`{{ .ConfirmationURL }}`) para preservar o redirect solicitado. Remover somente hardcode localhost comprovado. Confirmar no mesmo aparelho que recovery retorna com `next=reset-password`.
6. Executar `npm run audit:auth:redirects -- --expect-native`. Critério: native e native_recovery **PASS**, callback recebido em `aldus://auth/callback`, recovery preservado. Os controles de esquema desconhecido e path `aldus://auth/unapproved-callback` devem continuar rejeitados e Web dev preservado; o comando exige esses três gates. Nenhuma allowlist ampla.
7. Validar login Google completo no aparelho e consultar Auth Logs sem copiar codes/tokens. Uma falha de token exchange é diferente de callback recusado. Confirmar sessão, profile/username e Home; não alterar RLS para contornar erro.

## Google Cloud — dois contratos independentes

O projeto Cloud efetivo não pode ser identificado por um Client ID público ou package apenas. Conferir o client do provider Supabase e o projeto do client Android Drive no console; eles podem ser separados.

**Google → Supabase:** Google Auth Platform → Clients → client **Web application** usado pelo Supabase. Authorized redirect URI: `https://cmivracxuihtmsbmtuec.supabase.co/auth/v1/callback`. Não substituir por `aldus://...`. O deep link pertence ao trecho Supabase → Aldus. Conferir consentimento/Audience/test users e acesso às contas usadas, sem alterar scopes do login para conceder Drive.

**Drive Android:** APIs & Services → Library → **Google Drive API → Enable**, no projeto OAuth correspondente. Google Auth Platform → Clients → client **Android**, package `com.aldus.reader`, SHA-1 abaixo. Android usa Play Services `AuthorizationClient` → `PendingIntent` quando necessário → `AuthorizationResult`; nenhuma origem/redirect localhost participa. Data Access mantém somente `https://www.googleapis.com/auth/drive.readonly`. Não ampliar para `drive`.

**Drive Web:** client **Web application** próprio/autorizado para GIS, Authorized JavaScript origins com a origem exata de desenvolvimento ou produção (sem path). Definir apenas o ID público em `EXPO_PUBLIC_GOOGLE_DRIVE_WEB_CLIENT_ID`; ainda ausente no ambiente auditado. Não copiar o secret ou presumir que o client Supabase pode ser reutilizado sem conferir origens/projeto. GIS token model não necessita callback redirect URI. Preservar abertura por gesto explícito.

**Consentimento:** Google Auth Platform → Audience. Se Testing, conferir a conta real do aparelho entre os test users. Verificação/publicação do scope restrito drive.readonly depende do cenário do produto. Não declarar concluído sem acesso ao console.

## Assinatura do APK efetivamente testável

| Campo | Evidência local |
| --- | --- |
| Package | `com.aldus.reader` (APK/Gradle) |
| Variant | `release`, `debuggable=false` |
| Origem da chave | `android/app/debug.keystore`, `signingConfigs.debug` usado pelo release local atual |
| SHA-1 do certificado do APK | `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25` |

Fingerprint confirmado por `apksigner verify --print-certs` no APK `Aldus-eab97ee.apk`; repetir no novo APK. Não é prova da chave EAS, upload ou Play App Signing. Para esses canais, obter o certificado do artefato real/Play Console → App integrity e registrar Android clients correspondentes. Nenhuma senha de keystore deve constar no relatório.

## Roteiro obrigatório no aparelho

Na próxima validação com aparelho autorizado, identificar o APK do commit correspondente
e preservar dados. A campanha de 15/10 não gera/instala APK. Estes cenários são um roteiro,
não resultados físicos atuais; nunca marcar PASS por typecheck/mocks.

| Caso | Evidência exigida |
| --- | --- |
| Login Google Aldus | Consentir → Supabase → `aldus://auth/callback` → sessão/profile → Home; zero localhost. |
| Recovery | Email → verificação → deep link com next → nova senha → login; zero localhost. |
| Conectar Drive | Fontes → Minhas fontes → Drive → AuthorizationClient → retorno ao Aldus → autorização da conta escolhida; zero localhost. |
| Pasta real própria/compartilhada | Folder ID real válido → validar raiz → paginação completa → EPUB/PDF; respeita permissão da conta, não exige ownership. Nenhum livro baixado durante listagem. |
| Importar EPUB | Ação explícita → download autenticado → importador existente → Library → abrir livro. |
| Relançar | Configuração e snapshot preservados; credencial de memória perdida pede Reconectar; refresh após autorizar funciona. |
| Expirar/revogar | Categoria correta, reconectar de verdade, nenhum apagamento do catálogo local. |
| Trocar conta Google | Conta selecionada no consentimento determina as permissões Drive; token Supabase não é reutilizado. |
| Lifecycle | Foreground/background/browser/resolution/volta; operação antiga não termina a nova; CONNECTING termina em sucesso/cancelamento/erro. |

Diagnósticos são opt-in por build; seguem allowlist sem code/token/verifier/secret/senha/URL completa/conteúdo da pasta. Habilitar flags somente para capturas autorizadas. A ausência de callback não pode ser interpretada como recebimento bem-sucedido.

Referências oficiais: [redirects Supabase](https://supabase.com/docs/guides/auth/redirect-urls), [deep linking](https://supabase.com/docs/guides/auth/native-mobile-deep-linking), [AuthorizationClient Android](https://developer.android.com/identity/authorization), [erros Drive](https://developers.google.com/workspace/drive/api/guides/handle-errors).
