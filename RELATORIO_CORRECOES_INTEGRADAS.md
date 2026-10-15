# Aldus — Correções integradas e estabilização

15/10/2026. Snapshot de entrega solicitado explicitamente nesta missão, não terceiro
contexto obrigatório. Fontes permanentes: [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md) e
[BUGS_ATUAIS.md](BUGS_ATUAIS.md). Histórico anterior continua no Git; os documentos
solicitados que haviam sido consolidados foram consultados em 7f50a90^, sem restaurar
checkpoints obsoletos como fontes atuais.

Branch: integration/comunidade-literaria. HEAD inicial:
7f50a9048876aec350186b594006c24f2bc73a22. Main não alterada.
O hash da entrega documental é o commit que contém este relatório; não presumir seu
próprio hash antes de commit. Logs/artefatos ignorados não são contexto obrigatório.

## 1. Correções efetivas

| Área | Causa comprovada no código/teste | Implementação | Estado |
| --- | --- | --- | --- |
| Username público | Sem proteção distribuída, JSON sem teto de bytes e estado do perfil verificado só antes do Auth | handler testável, Redis/Lua atômico global/origem/username, HMAC, TTL, fail-closed, limites de entrada e rechecagem de perfil | IMPLEMENTADO / DEPLOY E REDIS REAIS PENDENTES |
| Sessão/perfil | Provider/guard/feature access não exigiam explicitamente igualdade dos UUIDs em todos os caminhos | Rejeição antes de cache/publicação, guard e canUse defensivos | VALIDADO CONTROLADO |
| Batalha | Upload e join podiam observar identidades diferentes; resposta antiga podia aparecer após troca/blur | JWT/UUID/epoch congelados na operação composta, abort/owner check, conteúdo da tela por UUID e revisão | VALIDADO CONTROLADO / MULTIPLAYER REMOTO PENDENTE |
| Library remota disabled | library_apply validava auth.uid mas não account_status; ownership não significava conta ativa | Migration incremental: implementação CAS intacta em schema privado, wrapper ativo e fences RLS/Storage | IMPLEMENTADO / DEPLOY INCREMENTAL PENDENTE |
| Cancelamento Sync | Cancel deixava running ativo; preparação pendente podia iniciar rede após stop e restart reutilizar execução antiga | Estado terminal imediato e lifecycle separado do epoch de conta | VALIDADO CONTROLADO E WEB |
| Drive | Grants/índice em memória sobreviviam à troca de conta Aldus | Revogação síncrona no scope, incluindo authorize pendente e índices em andamento | VALIDADO CONTROLADO / API E ANDROID REAIS PENDENTES |
| Dependências | Quatro transitivas em faixas vulneráveis | Updates compatíveis no lockfile, sem trocar Expo/RN | VALIDADO LOCAL; OUTROS AVISOS ABERTOS |
| Build Windows | gradlew.bat por nome falha com lookup do diretório corrente desabilitado | Caminho absoluto, quoting de espaços e argumentos Windows literais | VALIDADO COM CMD REAL E BAT DE ECHO; NÃO EXECUTOU GRADLE |
| Web/CI | Build/output implícitos e sem identidade verificável do commit | Configuração estática explícita, guard de env pública, metadata/hash, CI crítico e actions pinadas | IMPLEMENTADO / CONFIGURAÇÃO VERCEL E CI REMOTO PENDENTES |

Nenhuma reescrita de Reader/OCR/Reflow ou da arquitetura offline-first foi feita.
Community v0.1, estudo local, SRS, package e assinatura foram preservados.

## 2. Segurança e limites reais

- Username mantém verify_jwt=false porque antecede o login. Chave administrativa só no
  servidor; cliente recebe os tokens da própria sessão, nunca email resolvido/service_role.
- Limites compartilhados: 300/min global, 30/min origem, 8/15min username. Não são contador
  em memória nem IP como única defesa. Header encaminhado é suplementar e pode ser falsificado;
  os outros dois limites continuam valendo. Contadores não são zerados no login bem-sucedido.
- Redis armazena identificadores HMAC, sem senha/email/conteúdo; TTL máximo de janela 900s.
  Configuração/erro do Redis retorna503 antes de consultar perfis. Rejeição429 inclui Retry-After.
  Revisar processador/privacidade/retention e tráfego esperado antes de ativar. Não há promessa
  de tempo constante ou proteção DDoS de infraestrutura; limites por conta têm tradeoff de
  bloqueio temporário por abuso direcionado. Auth/provider mantém suas próprias proteções.
- Corpos limitados a8192 bytes, username3–24 e senha até1024 caracteres. Credencial errada,
  conta inexistente/desativada e sessão de outro UUID têm resposta genérica equivalente.
- Testes PostgreSQL reais isolados negam leitura de perfil alheio, promoção de role/status,
  escrita em overrides, bypass da implementação privada e arquivos de outra conta.
- library_object_allowed acessível ao anon NÃO foi classificado automaticamente como brecha:
  fences públicas precisam chamá-lo; UID nulo retorna false, sem expor perfil/arquivo.
- Não foram criadas policies permissivas para silenciar alertas de RLS sem policies.
  Tabelas legadas/internas continuam sem acesso direto quando esse era o desenho intencional.
- Busca heurística nos textos rastreados não encontrou tokens secretos reconhecidos,
  JWT service_role ou private keys. Não é prova de scanner completo nem de histórico inteiro.
  Rotação do Google Client Secret historicamente exposto continua ação administrativa a conferir.
- Sources persistidos continuam DEVICE-scoped. Grants agora são revogados, mas isso NÃO
  resolve visibilidade local de configuração/snapshot entre contas. BUG12 registra a lacuna;
  não foi inventado ownership de legado nem apagado catálogo/livro para escondê-la.

## 3. Banco de dados — informado versus verificado

Projeto esperado: cmivracxuihtmsbmtuec (Kindle reader).

| Versão remota informada pelo operador | Arquivo local equivalente |
| --- | --- |
| 20261015144958 | 202610090001_flashcard_battles.sql |
| 20261015145012 | 202610110001_private_account_library.sql |
| 20261015145018 | 202610110002_private_library_file_recovery.sql |

NÃO reaplicar, recriar tabelas ou reparar ledger por número diferente. Operador informou
bucket aldus-private-library privado com sete policies e duas contas preexistentes.
Essas duas contas não foram presumidas contas de teste nem modificadas.

Verificação pública real nesta missão:

- 12:58 BRT: user_library_items e user_library_operations HTTP401/42501, superando o404
  observado antes do deploy. Não é prova de funcionamento autenticado ou inventário completo.
- 13:23 BRT: flashcard_battle/get e library_apply com operação nula foram negados ao anon
  (401/42501). library_object_allowed com path sintético devolveu200/false.
  Sonda reproduzível: node scripts/audit-private-rpc-anon.cjs. Nenhum identificador de
  operação válido, sessão ou conteúdo de usuário foi enviado, nem dado pessoal modificado.
- Bucket invisível ao anônimo não prova ausência física; confirmação administrativa continua
  pendente. Não houve novo deploy SQL/Edge pelo agente nem teste autenticado de produção.

Migration NOVA preparada: 20261015160539_library_active_account_fences.sql, gerada pela
CLI e executada somente em PostgreSQL/PGlite isolado. Preserva linhas/recibos e implementação
CAS; requer inventário/comparação antes da aplicação remota. Procedimento exato:
[LIBRARY_SYNC_DEPLOYMENT.md](LIBRARY_SYNC_DEPLOYMENT.md).

## 4. Integrações

- GitHub: commits pequenos na branch de integração, sem force ou alteração de main.
  CI preparado com Node24, npm ci, Deno, suítes críticas, export, metadata e gate de
  advisories críticos. Não confundir YAML/teste local com execução Actions remota.
  Consulta anônima da API Actions retornou404; não permitiu confirmar runs/conclusões.
- Supabase/Vercel: aparecem instalados no catálogo de plugins e com permissões de baixo
  risco, mas suas ferramentas administrativas não foram expostas nesta sessão.
  Supabase CLI projects list confirmou ausência de access token. Não foi pedido segredo
  no chat, não houve login administrativo automático ou contorno de permissão.
- OAuth real, cancelamento do provedor: Native e recovery exatos agora são preservados;
  Web dev localhost:8081 retornou para aldus, e path Native não aprovado foi aceito.
  O gate completo de redirects continua FAIL EXTERNO. Isso supera o antigo diagnóstico
  de Native→localhost sem afirmar consentimento/login/recovery por email no aparelho.
- Drive: 401/403/expiração/paginação/árvore/download/cancelamento e limpeza por conta
  passaram em fronteiras controladas. Não houve consentimento/API Drive autorizada real
  nem validação física da pasta de referência. Escopo drive.readonly preservado.
- Vercel kindle-reader: nenhum deploy ou acesso a logs efetuado. Deployment de06/10 e403
  vêm da auditoria fornecida, não de consulta autenticada desta missão. Não presumir estado
  atual, domínio ou equipe a partir do nome. README contém configuração/CI/permissões.

## 5. Testes e evidências

Comandos executados nesta missão e fronteiras:

- npm run typecheck: PASS.
- npm run export:web: PASS; Expo2438 módulos, app/assets exportados e build-info gerado.
  Build executado com alterações ainda não commitadas registra dirty=true, não build limpa.
- npx --yes deno@2.9.6 check supabase/functions/username-login/index.ts: PASS.
- Matrizes npm run test:critical: 47/47, depois48/48 e matriz final49/49 PASS, incluindo
  a nova suíte de cancelamento/lifecycle Sync. Não equivalem a teste remoto/Android.
- test-username-login.cjs: erros uniformes, perfil ativo tardio, body/tipos/limites,
  fail-closed, múltiplos workers/requests e canários; SDK Supabase instalado estabelece
  sessão via invoke→setSession→SIGNED_IN, sem sessão nova na falha. HTTP/Redis controlados.
- test-integrated-security.cjs: reproduz defeito disabled original, aplica migration nova,
  compara linhas antes/depois e testa A/B/disabled/anon, grants e Storage em PostgreSQL real local.
- test-flashcard-battles.cjs: RPC PostgreSQL real, N3/5/10/15, confirmação, ocultação,
  conteúdo congelado, oito combinações de confiança/gabarito, pontuação autoritativa,
  idempotência, reconexão e espera. NÃO duas sessões Supabase reais nem prova de carga concorrente.
- Library account/sync/files/reading/coordinator/restart/rls: PASS; SQLite/PGlite reais,
  EPUB/PDF, SHA-256, offline, perda de resposta, conflitos/tombstones, upload interrompido,
  remoção/reabertura, progress/notes/highlights e A/B. Fronteira remota é fixture.
- test-library-web.cjs: PASS, app exportado em Chrome com dois IndexedDB independentes,
  importação/Reader real sob demanda, metadata-only, HTTP fixture, rollback e troca de conta.
  Após corrigir lifecycle e harness, duas execuções consecutivas passaram no mesmo export.
- test-source-library-browser.cjs: PASS após substituir clique antecipado por espera de
  botão habilitado/rota correta no harness; não foi alteração de produção para mascarar falha.
  Árvore/fuzzy/offline/IndexedDB/rollback/remoção e1000 livros/24 cards montados cobertos.
- Na repetição Library Web, o harness observou idle e tentou clicar depois que o auto-sync
  já havia iniciado. Check+click passaram a ser atômicos no navegador, sem aumentar timeout.
  A investigação também reproduziu defeitos independentes de stop/cancel no produto:
  test-library-cancellation.cjs --baseline confirma running preso e rede após stop;
  teste corrigido verifica terminal, retomada e descarte de preparação antiga, sem limpar outbox.
  Repetições posteriores também expuseram startup Chrome/CDP indisponível e consulta de
  body durante navegação: falhas de ferramenta/harness, não prova de falha do app.
  O harness trata body ainda ausente e ativa a aba que representa o dispositivo em uso,
  evitando throttling artificial da aba oculta. Não desabilita guardas ou sandbox do produto.
- test-reader-browser.cjs: PASS em Chrome local com perfil descartável, colunas fracionárias,
  página final/totais, tipografia/âncora, slider e alvos dos controles acima do iframe.
- Importadores/EPUB/Reader Native controlado/Settings/Reflow scheduler/âncoras/Community/
  Legal passam nas suítes; não certificam Amêndoas real, 98–100% no PDF físico ou gestos Android.
- test-web-build.cjs --exported: PASS, YAML/permissions/actions/config, env sem secretos,
  commit/hash e recomputação efetiva do conteúdo exportado.
- test-android-build-command.cjs: PASS com cmd Windows real, caminho com espaço e lookup
  desabilitado; apenas bat de echo temporário. Nenhum Gradle, SDK install ou APK.
- git diff --check: PASS nas etapas validadas.

npm audit --omit=dev (snapshot13:17 BRT): 0 críticos, 58 altos, 12 moderados. Os70 registros
incluem propagação entre pacotes, não70 causas independentes. Restam braces,
decode-uri-component, node-forge, postcss-selector-parser e uuid. Não há declaração de
segurança integral nem downgrade Expo44/major upgrade automático. CI bloqueia críticos.
Atualizados shell-quote1.12.0, undici7.30.1, source-map-js1.2.2, brace-expansion2.1.7.
O caso shell-quote de newline após comentário foi rejeitado em teste sem executar comando.

## 6. Android

Nenhum arquivo nativo, package, scheme, certificado ou versionCode foi alterado.
Atualização JS pelo Metro basta em development build compatível. Para APK release já
instalado, estas alterações exigem recompilar e instalar o bundle novo; Fast Refresh
não atualiza um release empacotado. Quando o usuário solicitar build consolidado:

```powershell
npm run build:apk:local
```

Usar JDK17/SDK existente e certificado compatível com a instalação. Antes de publicação,
conferir versionCode atual no dispositivo/Play e incrementar em mudança planejada.
Não desinstalar, limpar dados ou trocar assinatura para resolver atualização.
APK NÃO GERADO NESTA MISSÃO; validação física continua pendente.

## 7. Pendências externas — operação exata

### Supabase/username

Autenticar o CLI pelo operador autorizado (ou reabrir sessão com ferramentas Supabase
autenticadas). Confirmar projeto cmivracxuihtmsbmtuec. Configurar Redis compatível com EVAL,
HTTPS e credencial de menor escopo. Criar fora do Git um arquivo de secrets que contenha
somente UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN e USERNAME_LOGIN_HMAC_KEY
aleatório com pelo menos32 caracteres. Nunca usar EXPO_PUBLIC_* ou colar tokens no chat.

Após testes reais do limitador, revisão de processador/aviso de privacidade e código revisado:

```powershell
npx --yes supabase@2.101.0 login
npx --yes supabase@2.101.0 projects list -o json
npx --yes supabase@2.101.0 secrets set --project-ref cmivracxuihtmsbmtuec --env-file C:\seguro\aldus-edge.env
npx --yes supabase@2.101.0 functions deploy username-login --project-ref cmivracxuihtmsbmtuec --no-verify-jwt --use-api
```

Não executar sem Redis configurado; a função deve fechar503, não cair para modo inseguro.
Testar username correto/incorreto/inexistente/disabled, limites em múltiplas instâncias,
falha Redis e sessão no cliente. Conferir leaked-password protection em Authentication →
Security and Protection (disponibilidade depende do plano); não foi lida nesta sessão.

### Banco/RLS/Storage

Executar inventários read-only e comparar as três versões já implantadas. Aplicar SOMENTE
a migration nova após revisão. Rodar roteiro de [Library Sync](LIBRARY_SYNC_DEPLOYMENT.md)
com duas contas de TESTE dedicadas/autorizadas, mais disabled/anon. Usar JWT de cada usuário,
nunca service_role como prova de isolamento. Não testar escrita nas duas contas preexistentes
por suposição; preservar fila e livros locais. Multiplayer integral requer essas duas sessões.

### Callbacks/Google

Conferir Site URL Web HTTPS real e Redirect URLs exatas, sem aldus://**; preservar localhost
de desenvolvimento quando usado e query de recovery corretamente escapada. Repetir sonda
até Native/recovery/Web/controles passarem. Depois testar consentimento, sessão/perfil e
recovery completo por email no Android. Roteiro: [Google Auth/Drive](GOOGLE_AUTH_DRIVE_DEPLOYMENT.md).

### Vercel/GitHub

Selecionar equipe proprietária do kindle-reader, conectar matheusbitlab/Aldus e revisar
branch de produção. Build npm run build, output dist e variáveis públicas corretas;
configurar identidade/canal legal real para produção. Habilitar checks de CI/branch protection.
Logs403: administrador deve conferir membro/escopo de projeto e observabilidade, reautorizar
integração na equipe correta e repetir consulta. Não contornar controle nem desativar proteção.
Comparar commit do deployment com /build-info.json (dirty=false/hash), testar preview e só
então aprovar produção. Nenhuma publicação foi feita nesta missão.

## 8. Arquivos e commits

Mudanças concentradas em username-login, AuthProvider/AuthGuard, Battle repository/tela,
Drive lifecycle, nova migration/inventário/testes, lockfile de quatro transitivas e ferramentas
de build/CI. Não foram alterados livros pessoais, migrations históricas, Community ou módulos
nativos. Lista exata: git diff --name-only 7f50a90..HEAD; commits: git log --reverse 7f50a90..HEAD.

- d3f150b — proteção distribuída do login username.
- 92cc1fe — fronteiras de conta Auth/Battle/Drive e hardening SQL incremental.
- 30a64a9 — quatro transitivas compatíveis.
- 47eb981 — wrapper Windows explícito, sem build APK.
- ee8ab5a — limite na fronteira de expiração e sessão username com SDK instalado.
- f9b918b — CI/Web rastreável, guard de env Web/Android, sondas e harnesses.
- Todos esses commits tiveram push para integration/comunidade-literaria. O commit
  documental de fechamento é identificado pelo histórico Git e resposta final.
- 42ae07d — primeiro relatório integrado. A correção adicional de lifecycle Sync e os
  ajustes de harness foram registrados em commit posterior, sem apagar esse histórico.

## 9. Contexto e próximos passos

PROJECT_CONTEXT.md atualizado com evolução real do backend/callbacks, arquitetura e
decisões; BUGS_ATUAIS.md mantém somente pendências, incluindo Sources DEVICE e advisories.
As antigas notas foram superadas por novas evidências, não apagadas do histórico.
Próximos passos são deploy/testes administrativos acima, ownership Sources com adoção
explícita, regressões físicas Amêndoas/Drive/Reflow/Preferências e revisão dos advisories
restantes. Não declarar todos os problemas encerrados enquanto esses itens permanecerem.

## Referências primárias consultadas

- [Supabase rate limiting](https://supabase.com/docs/guides/functions/examples/rate-limiting).
- [Funções e privilégios](https://supabase.com/docs/guides/database/functions).
- [Segurança de senhas](https://supabase.com/docs/guides/auth/password-security).
- [Mudança TLS do changelog](https://supabase.com/changelog/cbc-tls-ciphers-deprecated):
  retirada de ciphers CBC legados prevista a partir de10/11; não motivou enfraquecer TLS.
- [Vercel configuração](https://vercel.com/docs/project-configuration),
  [Deployment Checks](https://vercel.com/docs/deployment-checks),
  [papéis de acesso](https://vercel.com/docs/rbac/access-roles).
- [Advisory shell-quote](https://github.com/advisories/GHSA-pqg4-j6r4-53mv),
  [undici](https://github.com/advisories/GHSA-w293-vg96-wgc3),
  [brace-expansion](https://github.com/advisories/GHSA-q2hr-2g5m-vwhr),
  [source-map-js](https://github.com/advisories/GHSA-68fv-2mgg-jv7q).
