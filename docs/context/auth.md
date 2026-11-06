# Auth, contas e username-login

> Módulo de referência. Ler ao mexer em Auth, perfil, OAuth, recovery ou Edge Function.
> Texto preservado do PROJECT_CONTEXT.md original (2192 linhas, escrito pelo Codex), movido sem reescrita em 06/11/2026. Trate como hipótese: confira Git/código antes de confiar. O estado atual e as pendências estão em [PROJECT_CONTEXT.md](../../PROJECT_CONTEXT.md).

## 9. Auth

Supabase SDK persistSession/autoRefresh, email/senha, cadastro, username, Google PKCE,
perfil e recuperação. Rotas privadas exigem sessão, profile do mesmo UUID, username e
account_status=active. Tickets/generation revogam A→B→A, eventos e respostas antigas.
Master amplia features do produto; nunca concede leitura da biblioteca de outra pessoa.
role/status/overrides não são editáveis pelo cliente.
AuthProvider rejeita profile remoto cujo UUID difere da sessão antes de publicar/cachear;
AuthGuard e canUse repetem a igualdade, inclusive durante transições de conta.
Provisionamento humano: supabase/admin/provision_master_and_test.sql exige dois UUIDs reais
e distintos de auth.users; supabase/tests/rls_manual.sql testa A/B/anon e autopromoção com
rollback. Executar somente depois do inventário e com acesso autorizado; não provisionar
credenciais/contas fictícias em produção nem usar IDs de public.users por suposição.

Callback Native: aldus://auth/callback; recovery: aldus://auth/callback?next=reset-password.
Web usa origin real; SSR sem browser falha explicitamente. Authorize é validado antes de
abrir navegador; troca PKCE é única e requer sessão. Erros query/hash/cancelamento têm terminal,
sem code/token/verifier/secret na UI ou logs. Email confirmado/perfil são distintos de senha.

Nova sonda real de cancelamento OAuth na missão integrada: Native e recovery exatos PASS,
superando o fallback localhost de 12/10. Web localhost:8081 foi redirecionado para aldus,
e aldus://auth/unapproved-callback foi aceito: allowlist/Site URL precisam de revisão admin.
Não equivale a login consentido, recovery por email ou execução Android. Preservar histórico
sanitizado em artifacts/auth/urgent/redirect-probe.json; detalhes operacionais no deployment.

Username depende da Edge Function supabase/functions/username-login/index.ts; resolução
de email fica no servidor. handler.ts implementa limite Redis/Upstash atômico compartilhado:
300/min global, 30/min origem e 8/15min username, sem reset no sucesso; HMAC nos identificadores.
Origem encaminhada é apenas suplementar, não identidade confiável. Falha/config ausente do
limitador fecha com 503 antes de consultar perfis. JSON até 8192 bytes, password até 1024 caracteres,
erros de credenciais uniformes e perfil ativo reconferido antes de devolver tokens. Não promete
tempo constante. verify_jwt=false é necessário ao login público; não é a defesa antiabuso.
Secrets exclusivos da função: UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN e
USERNAME_LOGIN_HMAC_KEY (aleatório >=32 caracteres), além dos secrets Supabase de servidor.
Não implantar sem configurar/testar Redis. node scripts/test-username-login.cjs cobre o contrato
e concorrência com Redis/Auth controlados, não serviço real nem proteção DDoS de infraestrutura.
Supabase/GitHub/Vercel expõem ferramentas conectadas nesta sessão. Na Etapa 1.5 foram
usadas apenas para inventários de leitura (seção 6.2), sem SQL administrativo remoto,
mudança em contas ou deploy. Isso supera a nota anterior de ferramentas indisponíveis.
OPTIONS username-login reconferido em 15/10 às 14:22 BRT: HTTP404/NOT_FOUND.
Implantação da função e testes reais continuam pendentes. Redis está implementado/testado
com contrato controlado; configuração, conectividade e limites do serviço remoto não verificados.
Signup/recovery e RLS efetivos precisam de teste remoto/logs, sem presumir que arquivo SQL
foi aplicado. Cache offline do mesmo usuário não cria sessão; o cache de perfil ainda
não tem TTL e não certifica status remoto atual. Não afrouxar guard/RLS para resolver conexão.
