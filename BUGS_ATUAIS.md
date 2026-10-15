# Aldus Reader — Bugs Atuais

Atualizado em 15/10/2026. Branch integration/comunidade-literaria.
Referência funcional: HEAD da branch/commit que contém esta atualização.
Reconciliação Git: 7f50a9048876aec350186b594006c24f2bc73a22 é ancestral de
ea30fabe26405db6e1cf9f9870814ad903c3b9f3; ambos já presentes no remoto da integração.
Oito incidentes originais mantidos, além dos três problemas ativos adicionais 11–13;
nenhum encerramento é inferido de merge, export ou teste controlado.
Somente problemas ativos. Contexto permanente: [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md).
APK: PENDENTE DE BUILD CONSOLIDADO, por decisão do usuário. Nenhuma validação física nova.

## BUG 01 — Importação do EPUB Amêndoas congela

- Prioridade: CRÍTICA. Status: IMPLEMENTADO / VALIDAÇÃO ANDROID PENDENTE.
- Sintoma/reprodução: importar Amêndoas mantém “Lendo arquivo…” e Cancelar não responde;
  outro EPUB importa. O arquivo pessoal não foi localizado nesta máquina.
- Evidência: parser do baseline repetia CSS/fontes por capítulo e não recebia signal.
  Fixture de 91 capítulos: HTML 127.262.661 → 1.422.501 bytes; fontes 182→2 leituras,
  CSS 91→1 e leituras simultâneas 182→1. Não é medição do arquivo Amêndoas.
- Primeira divergência: amplificação durante recursos/CSS confirmada na fixture;
  primeira chamada bloqueada no Android continua sem trace.
- Causa: CONFIRMADA para o mecanismo; PROVÁVEL para Amêndoas físico.
- Arquivos: src/data/epub/EpubParserService.ts, EpubValidatorService.ts, EpubTypes.ts,
  src/domain/usecases/ImportEpubUseCase.ts; scripts/test-epub-resources.cjs.
- Correção: cache por parse, capítulos/recursos sequenciais, yield cooperativo, abort entre
  etapas/leitura e fontes idênticas apenas na última posição original, preservando cascata.
- Testes realizados: fixture/fontes/condições CSS/SVG/srcset/imagens/links/JSON/cancelamento
  PASS; Freud saudável com 26 capítulos PASS; test-book-import/test-catalogs PASS.
  Baseline 25.767 ms e primeira revisão 1.339 ms sob carga concorrente; revisão final 318 ms
  e Freud 402 ms em outra carga desktop. Não usar como promessa de desempenho Android.
- Testes pendentes: mesmo Amêndoas real, Android/WebView, fonte/imagens/offline/reopen,
  cancelamento e memória no aparelho. Uma descompressão ZIP já iniciada pode terminar internamente.
- Dependências externas: arquivo original e validação no próximo build consolidado.
- Não regredir: metadata, spine, CSS/fontes/imagens, links, rollback, conta e EPUBs saudáveis.

## BUG 02 — Library Sync implantado, validação autenticada pendente

- Prioridade: ALTA. Status: PARCIAL / IMPLANTAÇÃO INFORMADA / VALIDAÇÃO AUTENTICADA PENDENTE.
- Sintoma/reprodução: “37 operações pendentes”, último sync ausente e servidor indisponível.
  37 é relato do aparelho; a UI soma entidades dirty e arquivos pendentes.
- Evidência histórica: 10:58 BRT HTTP404/PGRST205; após deploy informado, nova sonda de
  12:58 BRT retornou HTTP401/42501 nas duas tabelas. Usuário informou versions remotas
  20261015145012/20261015145018, bucket privado e sete policies. NÃO reaplicar 001/002.
- Reconferência real em 15/10 às 14:22 BRT: as duas tabelas seguem HTTP401/42501;
  library_apply nulo negado (401/42501), helper Storage retorna false ao anônimo.
  Bucket HTTP400/NoSuchBucket ao anônimo não comprova ausência de bucket privado.
  IMPLEMENTADO LOCALMENTE / VALIDADO ANÔNIMO; APLICADO REMOTAMENTE conforme operador.
  VALIDADO AUTENTICADO / A-B / CONTA DESATIVADA / STORAGE real / ANDROID: PENDENTES.
- Primeira divergência atual: fluxo autenticado não executado neste ambiente; sem nova
  tentativa do aparelho não atribuir as 37 pendências ao antigo contrato ausente.
- Causa atual: INCONCLUSIVA. A causa histórica de contrato ausente foi superada pelo deploy
  informado e pela mudança na sonda; invisibilidade anônima não prova bucket ausente.
- Arquivos: SupabaseLibraryAdapter.ts, migrations 202610110001/002, supabase/audit/01_inventory.sql,
  02_library_sync_inventory.sql e scripts/audit-library-sync-public.cjs.
- Correção: sonda read-only reproduzível e inventário completado; engine/outbox preservados.
  Nenhum SQL remoto, deploy ou descarte de operações foi executado.
  Na missão integrada, engine.cancel passou a encerrar running; coordinator ganhou lifecycle
  para impedir rede após stop e permitir restart da mesma conta sem reutilizar Promise antiga.
  Causa desses caminhos CONFIRMADA em teste controlado; não atribuída ao relato físico de37 operações.
- Testes realizados: library-sync/files/reading-sync/coordinator/restart PASS em SQLite/
  fronteiras controladas; library-rls PASS em PostgreSQL/PGlite A/B/anon e fences Storage.
  App Web com dois IndexedDB/HTTP fixture passou upload/download/remoções/rollback/conta.
- Testes pendentes: inventário admin, comparar implantação existente e avaliar somente a nova
  migration de hardening (BUG 11); HTTP autenticado A/B/disabled, Storage e dois aparelhos.
- Dependências externas: plugins instalados sem ferramentas administrativas expostas e CLI
  sem access token. Operador autorizado deve seguir [LIBRARY_SYNC_DEPLOYMENT.md](LIBRARY_SYNC_DEPLOYMENT.md):
  comparar ledger/objetos/ACL/RLS/bucket; reconhecer o mapeamento remoto 20261015145012/018;
  repetir inventário e testes autenticados. Não reaplicar nem editar migrations históricas.
- Não regredir: USER A != USER B, Storage privado, CAS/recibos/tombstones, offline e fila durável.

## BUG 03 — Drive real preso em conectar/indexar

- Prioridade: ALTA. Status: IMPLEMENTADO / VALIDAÇÃO ANDROID PENDENTE.
- Sintoma/reprodução: cadastrar/atualizar ROOT 1PwrGP2UiCNGhyhvhDUpszZZwFjfkjaw4 pode manter
  “Conectando / indexando…” no Android. Login Google foi relatado funcional.
- Evidência: diagnóstico controlado e HEAD confirmavam fonte ausente na fila deixando loading,
  signal externo sem propagação e erro do catálogo omitido no gerenciador.
- Primeira divergência: esses caminhos de estado são reproduzíveis; tentativa física não tem trace.
- Causa: CONFIRMADA nos caminhos corrigidos; INCONCLUSIVA para a operação real da pasta.
- Arquivos: SourceCatalogService.ts, sourceStore.ts, SourceManagerModal.tsx;
  scripts/test-source-indexing.cjs e suítes de Drive/Sources.
- Correção: abort até catálogo/leitura/lookup/rede, fonte ausente/alterada termina em erro,
  cancelar conserva snapshot e bloqueia publicação tardia, write nativa permanece na fila.
  Modal oferece Cancelar indexação e exibe erro real do catálogo; crawler/OAuth preservados.
- Testes realizados: source-indexing/catalog, drive-tree/google-drive PASS; 500 pastas/5000
  livros, ciclos/paginação/keys/lookup/save pendentes e writes tardias. Browser real/IndexedDB
  com fixtures passou árvore/breadcrumbs/busca source-wide/import/offline/rollback.
- Testes pendentes: API Drive autorizada e trace da mesma tentativa no Android, distinguindo
  authorize/root/list/página/queue/persistência/publicação. Página pública não equivale à API.
- Dependências externas: conta/grant e aparelho. Roteiro humano em
  [GOOGLE_AUTH_DRIVE_DEPLOYMENT.md](GOOGLE_AUTH_DRIVE_DEPLOYMENT.md); sem reabrir OAuth por hipótese.
- Não regredir: ROOT/árvore/atalhos de pasta/ciclos, fuzzy local, snapshot offline e download escolhido.
  Atalhos para arquivos continuam limitação conhecida, sem implementação especulativa nesta campanha.

## BUG 06 — Reflow grande demora em 98–100% e cancelamento final sem fechamento

- Prioridade: ALTA. Status: ABERTO.
- Sintoma/reprodução: histórico físico Weber 584 páginas parado em 582/584; cancelar/Back
  atrasados. Arquivo original de 969 páginas não identificado. Não reproduzido nesta campanha.
- Evidência/primeira divergência: execução Weber eventualmente publicou cache; await exato
  do intervalo não foi isolado. República 525 páginas cancelou durante extração e depois
  concluiu, sem validar cancelamento na montagem final ou no arquivo de 969 páginas.
- Causa: INCONCLUSIVA para o intervalo físico. Scheduler microtask/idle e bytecode Hermes
  já foram corrigidos e tiveram provas posteriores; não ressuscitar esses defeitos.
- Arquivos: PdfReflowProcessor.native.tsx, PdfReflowDocumentBuilder.ts, ReaderScreen.tsx.
- Correção: nenhuma adicional nesta campanha; preservar qualidade/fallback/OCR e cancelamento existentes.
- Testes realizados: evidência histórica de extração/cancelamento/cache e suítes controladas;
  mudanças OCR posteriores não certificam a reprodução física específica.
- Testes pendentes: mesmo PDF/build, fases 98–100%, memória/thread JS, cancel/Back e reopen.
- Dependências externas: arquivo/aparelho e próximo build consolidado.
- Não regredir: Original independente, cache validado, posição, cleanup e terminal único.

## BUG 07 — Rolagem do painel Preferências no Android ainda sem fechamento

- Prioridade: MÉDIA. Status: ABERTO.
- Sintoma/reprodução: demonstração física de 09/10 registrou falha de rolagem global do painel.
- Evidência/primeira divergência: contraprova de backdrop/painel foi compilada; última nota
  ainda dizia teste em execução, sem resultado físico conclusivo. Slider/controles positivos
  em outros cenários não encerram a rolagem. Não é nova falha observada no HEAD desta campanha.
- Causa: INCONCLUSIVA; competição de Pressables ancestrais era hipótese.
- Arquivos: ReaderSettingsPanel.tsx, ReaderControls.tsx, ReaderScreen.tsx.
- Correção: nenhuma adicional; não alterar Reader sem nova primeira divergência.
- Testes realizados: controles e contratos Web/controlados anteriores positivos, não prova de scroll Native.
- Testes pendentes: painel longo, arraste vertical/slider, fontes ampliadas, safe area e Android.
- Dependências externas: aparelho/build consolidado.
- Não regredir: texto/posição/instância do viewer e separação de gesto do painel/documento.

## BUG 08 — Incidentes email/cadastro/recovery ainda sem fechamento real

- Prioridade: ALTA. Status: BLOQUEADO EXTERNAMENTE.
- Sintoma/reprodução: relatos históricos de erro seguido de entrada, rejeição de cadastro
  e recovery voltando para localhost; sem nova captura dessas operações nesta campanha.
- Evidência/primeira divergência: cliente já separa credencial, navegação, perfil e erros
  operacionais. Não existe prova de acesso sem sessão. A sonda de callback de 12/10 foi de
  cancelamento OAuth; usuário relatou Google funcionando depois, o que supera a antiga
  generalização de “Google sempre bloqueado”, sem validar cadastro/recovery.
  Nova sonda real desta missão preservou Native/recovery exatos; porém callback Web dev
  virou aldus e caminho Native não aprovado foi aceito. Ajuste remoto pendente, não defeito
  comprovado na construção do callback cliente.
- Causa: INCONCLUSIVA para os incidentes atuais; configuração/policy/logs exigem acesso autorizado.
- Arquivos: app/auth/, AuthContext.tsx, authService.ts, authRedirect.ts e inventário Auth.
- Correção: nenhuma expansão Auth nesta campanha; preservados os guardas/correções existentes.
- Testes realizados: test-auth-flows/auth-callback PASS, incluindo SDK HTTP controlado,
  sessão/perfil/conta disabled, races A/B/ABA, PKCE e recuperação exata.
- Testes pendentes: contas reais, Auth/Postgres Logs sanitizados, policy/trigger/profile/email,
  recovery→app→senha→login, RLS A/B/anon e identificação do build instalado.
- Dependências externas: operador Supabase/contas/aparelho; roteiro humano
  [GOOGLE_AUTH_DRIVE_DEPLOYMENT.md](GOOGLE_AUTH_DRIVE_DEPLOYMENT.md).
- Não regredir: sessão e profile ativo do mesmo UUID, master sem acesso a dados alheios,
  secret somente no servidor; não reabrir Google/Drive genericamente sem evidência.

## BUG 09 — Login por username depende de função não implantada

- Prioridade: MÉDIA. Status: BLOQUEADO EXTERNAMENTE.
- Sintoma/reprodução: login por username chama Edge Function username-login.
- Evidência/primeira divergência: OPTIONS /functions/v1/username-login retornou
  HTTP404/NOT_FOUND reconfirmado em 15/10/2026 às 14:22 BRT, sem autenticar/criar conta.
- Causa: endpoint esperado indisponível CONFIRMADO; estado administrativo final não inventariado.
- Arquivos: supabase/functions/username-login/index.ts e src/data/remote/authService.ts.
- Correção: handler público com Redis/Upstash atômico global/origem/username, HMAC,
  fail-closed, body limitado e rechecagem de perfil ativo. verify_jwt=false preservado.
- Testes realizados: node scripts/test-username-login.cjs PASS: credenciais erradas,
  inexistente/disabled, perfil desativado durante login, session owner, corpo inválido/grande,
  falha do limitador, 24 pedidos concorrentes em 4 workers (8 aceitos) e canários de segredo.
  Redis REST/Auth são controlados; Redis e Auth reais continuam pendentes.
- Testes pendentes: deploy, rate limit/abuso, usuário inexistente/senha errada com mesma resposta,
  login válido sem devolver email ou credencial privada ao cliente.
- Dependências externas: conferir projeto/ledger e Auth; operador pode executar
  supabase functions deploy username-login --no-verify-jwt --project-ref <projeto verificado>,
  configurando secrets somente no ambiente da função.
- Não regredir: não expor service_role, não usar public.users como auth.users nem enumerar emails.

## BUG 10 — Integração BNDigital indisponível

- Prioridade: BAIXA. Status: BLOQUEADO EXTERNAMENTE.
- Sintoma/reprodução: fonte BNDigital informa integração indisponível.
- Evidência/primeira divergência: BNDigitalSearchPlugin permanece com motivo explícito;
  última prova de rede foi HTTP403 em 09/10 e aquisição EPUB/PDF não validada.
  Não houve nova tentativa externa nem prova de mudança desse contrato nesta campanha.
- Causa: restrição externa/ausência de aquisição suportada PROVÁVEL; contrato atual completo INCONCLUSIVO.
- Arquivos: BNDigitalSearchPlugin.ts, catalogPlugins.ts e test-source-integrations.cjs.
- Correção: nenhuma tentativa de bypass/crawler especulativo; mensagem explícita preservada.
- Testes realizados: inspeção atual do bloqueio declarado; regressões anteriores de fontes.
- Testes pendentes/dependências externas: acesso/documentação oficial que permita consulta e aquisição.
- Não regredir: não tratar DocReader/página HTML como EPUB/PDF nem bloquear fontes funcionais.

## BUG 11 — Conta desativada ainda pode usar o contrato remoto da Library

- Prioridade: ALTA. Status: IMPLEMENTADO / DEPLOY INCREMENTAL PENDENTE.
- Causa CONFIRMADA no PostgreSQL local: library_apply original valida auth.uid mas não
  account_status; RLS/Storage próprios também não exigem perfil ativo. Remoto não explorado.
- Correção: migration 20261015160539_library_active_account_fences.sql move implementação
  CAS intacta para schema privado, publica wrapper com perfil ativo e fences restritivas.
  Não altera registros, grants de outros buckets ou migrations históricas. Helper anon
  library_object_allowed é necessário às fences e retorna false para anon/paths alheios;
  grant anon por si só não é vazamento confirmado.
- Testes: node scripts/test-integrated-security.cjs PASS em PostgreSQL/PGlite real;
  reproduz baseline, preserva linhas, bloqueia disabled/A-B/anon e autopromoção/overrides.
- Pendente: inventário admin do projeto cmivracxuihtmsbmtuec, comparação de definições e
  implantação somente da migration NOVA, seguida de HTTP A/B/disabled/anon e Storage.
- Não regredir: recibos/CAS/idempotência, livros locais offline e dados de produção.

## BUG 12 — Configuração e snapshot Sources persistidos ainda são do dispositivo

- Prioridade: ALTA. Status: PARCIAL / ABERTO.
- Causa CONFIRMADA: UserSourceRepository usa chave global kindle-reader.user-sources.v1,
  e snapshots/vínculos não têm owner. Outra conta no mesmo dispositivo pode ver metadados
  locais da fonte. Não implica acesso a bytes privados Drive sem nova autorização.
- Correção desta missão: grants/índices em memória são limpos sincronicamente ao trocar
  conta; consentimento pendente e resposta antiga são rejeitados. Snapshots preservados.
- Testes: test-google-drive.cjs PASS para clearSession e callback antigo; não certifica
  isolamento persistido de Sources (que continua ausente por contrato DEVICE).
- Pendente: ownership por conta e adoção explícita dos legados, sem inferir dono, ocultar
  definitivamente fontes existentes nem apagar livros/catálogos. Exige migração/UI próprias.
- Arquivos: UserSourceRepository, sourceStore, repositories de SourceCatalog e driveDependencies.
- Não regredir: raiz, árvore, snapshots offline e biblioteca pessoal; não atribuir legado automaticamente.

## BUG 13 — Avisos de dependências sem atualização compatível validada

- Prioridade: ALTA. Status: PARCIAL / ABERTO.
- Evidência: npm audit --omit=dev de 15/10 13:17 BRT: 70 registros propagados,
  0 críticos/58 altos/12 moderados, com causas em braces, decode-uri-component,
  node-forge, postcss-selector-parser e uuid. Versão em advisories não prova explorabilidade.
- Correção: quatro transitivas atualizadas dentro das faixas existentes; shell-quote
  rejeita o caso de newline após comentário; matriz crítica/export passou após atualização.
- Pendente: patches upstream/compatibilidade da cadeia Tailwind/Router/Expo e análise de
  alcançabilidade. Não aplicar downgrade Expo44 ou major upgrades só para zerar contador.
- Arquivos: package-lock.json; CI mantém avisos visíveis e bloqueia novos críticos.
- Não regredir: SDK57/RN0.86, build Web/Android e notices/licenças.
