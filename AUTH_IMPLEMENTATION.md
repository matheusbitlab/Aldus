# Autenticação, perfis e acesso — 2026-10-06

O Aldus Reader mantém Expo Router e Supabase Auth. Este documento distingue código preparado de configuração e testes no projeto remoto. Não há sincronização de livros/cartões nem cobrança nesta etapa.

## Auditoria do banco

`supabase/audit/01_inventory.sql` consulta tabelas, colunas, FKs, RLS, policies, índices, triggers e funções sem modificar dados. A chave publishable não permite essa introspecção completa: `GET /rest/v1/` respondeu HTTP 401 (`Secret API key required`). A API Auth respondeu HTTP 200. As consultas com `limit=0` confirmaram a presença dos campos abaixo sem ler linhas ou valores:

| Tabela | Colunas confirmadas na API | RLS remoto | Risco / ação |
|---|---|---|---|
| `auth.users` | Não exposta por PostgREST | Gerida pelo Supabase | Fonte de identidade; confirmar relações via SQL Editor |
| `public.users` | `id,email,username,passwordHash` | Security Advisor relatou desativado | **Crítico:** coluna de hash selecionável com chave publishable; bloquear grants e ativar RLS imediatamente |
| `public.decks` | `id,userId` | Security Advisor relatou desativado | Bloquear acesso cliente até vincular dono legado a `auth.users` |
| `public.cards` | `id,deckId` | Security Advisor relatou desativado | Bloquear; card herda dono via deck depois da auditoria de FK |
| `public.card_reviews` | `id,sessionId,cardId` | Security Advisor relatou desativado | Bloquear; conferir usuário da sessão e dono do card |
| `public.study_sessions` | `id,userId` | Security Advisor relatou desativado | Bloquear até existir vínculo de identidade |
| `public.battles` | `id,player1Id,player2Id,winnerId` | Security Advisor relatou desativado | Bloquear; política futura precisa contemplar ambos os jogadores |
| `public.profiles` | Ausente (`PGRST205`) | N/A | Criar ligado a `auth.users` |
| `public.user_feature_overrides` | Ausente (`PGRST205`) | N/A | Criar controle de features |

O schema Prisma do projeto doador define `public.users` com `passwordHash` e UUID próprio, ligado a decks, sessões e batalhas. Ele não define FK para `auth.users`; **não assumir que os UUIDs existentes coincidem**. A API pública confirmou nomes de colunas, mas não FKs, políticas ou índices efetivos. Não foi feita consulta de linhas. Nenhuma tabela foi excluída ou renomeada.

## Migrations preparadas

1. `supabase/migrations/202610060000_lock_legacy_public_tables.sql`: deve ser aplicada **primeiro**. Ativa RLS e retira grants de `PUBLIC`, `anon` e `authenticated` das seis tabelas legadas se existirem. **Não adiciona policy permissiva.** Isso bloqueia o acesso do app cliente a essas tabelas até uma migração de ownership auditada; o Reader usa estudo local nesta etapa.
2. `supabase/migrations/202610060001_profiles_and_features.sql`: cria perfis ligados a `auth.users`, username normalizado, único e case insensitive, role/status restritos, gatilho seguro para novos usuários, backfill não destrutivo, overrides, grants de atualização apenas em `username/display_name/avatar_url`, RLS próprio. Novos usuários recebem sempre `role=user`; Google sem username passa pela tela de conclusão.

As migrations **não foram aplicadas** ao banco remoto por falta de acesso administrativo. Os alertas CRITICAL continuam abertos no projeto remoto. Após aplicar, executar `supabase/audit/01_inventory.sql` novamente e verificar Security Advisor. Não remover índices marcados como unused automaticamente. `winnerId` em `battles` é candidato a índice se FK/queries reais confirmarem necessidade.

`supabase/admin/provision_master_and_test.sql` exige dois UUIDs reais e distintos de `auth.users`. Faz MASTER via role e TEST via override `flashcards=false`, sem email/username/credenciais hardcoded. Não foi executado.

## Aplicativo implementado

- Login, cadastro, esqueci senha, redefinir senha, callback OAuth e escolha de username ficam em `app/auth/`. Conta, edição de perfil, alteração de senha e sair ficam em `app/account/`, com acesso em Ajustes.
- `AuthProvider` recupera sessão, carrega perfil/overrides, observa mudanças de auth, usa cache de perfil para uso local temporário sem rede e bloqueia o shell até resolver o estado inicial. `Stack.Protected` e `AuthGuard` nas rotas diretas impedem montar Reader/serviços/conta/estudo sem perfil ativo e username. Conta desativada vê mensagem no índice.
- Email/senha usa `signInWithPassword`. Username/senha usa a Edge Function `username-login`: o cliente só envia usuário/senha; a resolução de email ocorre na função com acesso server side, e email nunca é retornado diretamente. A função precisa ser implantada e seu endpoint público precisa de controles de abuso antes de produção.
- Google usa `signInWithOAuth` do Supabase e o callback PKCE em `/auth/callback`. Web e Native compartilham o mesmo serviço. O Native usa o esquema `aldus://auth/callback` e o browser do sistema via `expo-linking`; não foi adicionado módulo Native.
- Recuperação envia resposta genérica, callback troca código por sessão e permite `updateUser({password})`. A alteração de senha dentro da conta usa a mesma API.
- `useFeatureAccess("flashcards")` aplica `role=master` como acesso total a features; usuário normal lê override. A aba Estudo fica oculta quando negada; rotas diretas mostram mensagem, ações de gerar/criar/revisar e converter grifo rechecadas. Cartões locais novos usam chave AsyncStorage por UUID da conta; o armazenamento legado sem dono é preservado, sem atribuição automática a outra pessoa.
- Biblioteca, livros, marcadores e grifos locais existentes permanecem no armazenamento do dispositivo. Isso significa que troca de conta no mesmo dispositivo ainda pode mostrar dados locais da biblioteca; isolamento completo desses dados é trabalho específico posterior e não deve ser confundido com sync ou isolamento de flashcards.

## Validação e limites

- `npm.cmd run typecheck`, `npm.cmd run export:web` (2319 módulos/34 livros), `node scripts/test-auth.cjs`, `node scripts/test-flashcards.cjs` e `git diff --check` passaram. Esses gates não executam navegação visual nem login remoto.
- O endpoint Auth `/auth/v1/health` respondeu HTTP 200. `profiles` e `user_feature_overrides` não existem no projeto remoto. Portanto cadastro completo, perfil remoto, login username, Google, reset por email, MASTER/TEST e RLS A/B **não têm PASS funcional**.
- `adb devices` não encontrou dispositivo. O esquema e o package já estão em `app.json`, Gradle e Manifest; esta etapa não alterou configuração/dependência Native. O debug keystore padrão não existe no computador. Não foi gerado APK.
- Expo Web exportado não confirma fluxo Auth, Google, email delivery, retorno Android ou política de banco. O bug de reset EPUB permanece aberto, fora deste trabalho.

## Ações externas exatas

1. **Supabase — bloquear exposição e criar perfis:** Dashboard do projeto → **SQL Editor** → **New query**. Executar **imediatamente** `202610060000_lock_legacy_public_tables.sql`, que bloqueia acesso cliente a users/decks/cards/reviews/sessions/battles. Depois executar `supabase/audit/01_inventory.sql` e guardar os resultados para comparar FKs/índices/policies; então executar `202610060001_profiles_and_features.sql`. Não executar políticas liberais por conta própria. Em **Database → Security Advisor**, atualizar e confirmar desaparecimento dos CRITICAL de RLS Disabled in Public. Se alguma migration falhar, guardar o erro exato e não assumir que houve aplicação parcial.
2. **Supabase — username login:** Dashboard → **Edge Functions** → criar `username-login` com `supabase/functions/username-login/index.ts`. Configurar **Verify JWT = off** para permitir login sem sessão. Alternativa CLI, após autenticação do operador: `npx supabase functions deploy username-login --no-verify-jwt --project-ref cmivracxuihtmsbmtuec`. Secrets `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` e chave pública devem existir somente no ambiente da função; verificar em **Edge Functions → Secrets**, sem copiar para Expo. Ativar proteção contra abuso/rate limit antes de produção. Testar usuário inexistente e senha errada com a mesma resposta genérica.
3. **Supabase — Auth URLs/Google:** **Authentication → URL Configuration**: manter `http://localhost:8081` só para desenvolvimento; remover o callback antigo `kindlereader://auth/callback` quando nenhuma build antiga depender dele; incluir `aldus://auth/callback` e `aldus://auth/callback?next=reset-password` nas Redirect URLs, além do domínio Web publicado antes de produção. **Authentication → Providers → Google**: habilitar e preencher o Web Client ID e o secret novo gerado após rotação. Não guardar o secret no app. Verificar configurações de confirmação de email e templates de recuperação.
4. **Google Cloud — secret e OAuth:** **Google Auth Platform → Clients**: abrir Web Client existente, rotacionar o Client Secret antigo exposto e copiar o novo apenas para **Supabase → Authentication → Providers → Google**. Em **Authorized redirect URIs**, manter `https://cmivracxuihtmsbmtuec.supabase.co/auth/v1/callback`. Configurar consent screen/test users ou publicar o app OAuth conforme estado do projeto; realizar login real em duas contas.
5. **Master e Test:** criar duas contas por email/Google e confirmar email. Em **Supabase → Authentication → Users**, copiar apenas os UUIDs dos dois usuários. Substituir os dois `null` em `supabase/admin/provision_master_and_test.sql` pelos UUIDs e executar no SQL Editor. Depois sair e entrar de novo nas duas contas; confirmar MASTER com Estudo e TEST sem Estudo, inclusive URL `/study/<id>` e ação de grifo. Não registrar passwords nos arquivos.
6. **RLS A/B:** usar dois UUIDs reais em `supabase/tests/rls_manual.sql` e executar as consultas separadamente em ambiente de teste. Verificar SELECT/INSERT/UPDATE/DELETE, inclusive tentativa de B sobre dados de A. A política atual das tabelas legadas é deny all para clientes; A não pode inserir decks remotos até contrato de ownership. Depois do teste, rever Security Advisor e warnings de FK; criar índices só para FKs/queries efetivas.
7. **Android/Play:** package atual: `com.aldus.reader`; scheme: `aldus`. O debug keystore padrão (`%USERPROFILE%\.android\debug.keystore`) não existe neste computador. Para uma keystore real, usar `keytool -list -v -keystore <CAMINHO_DA_KEYSTORE> -alias <ALIAS>` e informar a senha no prompt; obter caminho/alias pelo EAS Credentials se a build for EAS. Em **Google Auth Platform → Clients → Create client → Android**, preencher `com.aldus.reader` e o SHA-1 do certificado que assina a build testada. Em **Play Console → Release → Setup → App integrity → App signing key certificate**, copiar o SHA-1 de Play App Signing e registrá-lo também para publicação. O fluxo atual é OAuth hospedado pelo Supabase com Web Client; a criação do Android Client precisa ser validada contra o método final de distribuição. O package antigo `com.kindle.reader` representa outro aplicativo para Android e não compartilha automaticamente os dados privados da instalação anterior.

Referências oficiais: [Supabase User Management](https://supabase.com/docs/guides/auth/managing-user-data), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [Supabase deep linking](https://supabase.com/docs/guides/auth/native-mobile-deep-linking), [Expo protected routes](https://docs.expo.dev/router/advanced/authentication/), [Expo OAuth](https://docs.expo.dev/guides/authentication/).
