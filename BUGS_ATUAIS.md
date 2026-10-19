# Aldus Reader — Bugs Atuais

Atualizado em 16/10/2026. Branch oficial main; integração antiga é somente histórica.
Referência funcional: HEAD da branch/commit que contém esta atualização.
Reconciliação Git: 7f50a9048876aec350186b594006c24f2bc73a22 é ancestral de
ea30fabe26405db6e1cf9f9870814ad903c3b9f3; ambos já presentes no remoto da integração.
Oito incidentes originais mantidos, além dos três problemas ativos adicionais 11–13;
nenhum encerramento é inferido de merge, export ou teste controlado.
Problemas ativos e validações recentes da campanha, sempre limitadas ao cenário executado.
Contexto permanente: [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md).
APK release consolidado: pendente. Homologação debug física em 16/10 no Redmi Android 16;
identidade do artefato, protocolo e limites de evidência em PROJECT_CONTEXT.md, seção 15.

Interface de 16/10: landing pública Web, acabamento Admin e apresentação pt-BR implementados
e homologados localmente; não encerram incidentes de Reader/Auth/Sync por inferência.
Dados financeiros e telemetria ausentes permanecem indisponíveis. Capturas Admin usam
fixtures identificadas, sem implantação remota ou provisionamento OWNER. Detalhes e
limites de validação na seção “Interface pública, Aldus Admin e português brasileiro”
de PROJECT_CONTEXT.md. Biblioteca mantém menu discreto e exportação nos Ajustes.

### Origem e escopo da campanha do caderno

| Entradas | Origem comprovada | Tratamento nesta campanha |
| --- | --- | --- |
| 01, 02, 03 | Relatos A/B/C do diagnóstico Android de 12/10, recuperado em Git; reiterados no pedido atual | Prioritários: EPUB, Sync e Drive |
| 06, 07 | Relatos D/E explicitamente reiterados no pedido; histórico físico de 09/10 | Prioritários: Reflow e Preferências |
| 08 | DIAGNOSTICO_BUGS_APK histórico, BUGS 5/6/7: email, cadastro e recovery | Caderno confirmado; falta evidência autenticada/configuração externa, sem expansão de Auth |
| 09, 10 | Endpoint/integração indisponíveis; origem como item independente do caderno não comprovada | Mantidos abertos, fora da correção prioritária; não inferir origem |
| 11–13 | Achados adicionais de conta desativada, Sources DEVICE e dependências | Preservados, sem auditoria/correção genérica nesta campanha |

Referência histórica somente via Git: 7f50a90^:DIAGNOSTICO_PENDENCIAS_ANDROID_2026-10-12.md
e 7f50a90^:DIAGNOSTICO_BUGS_APK.md. Não restaurar esses arquivos como contexto.

## BUG 01 — Importação do EPUB Amêndoas congela

- Prioridade original: CRÍTICA. Status: VALIDADO FÍSICO no cenário Amêndoas/Redmi de 16/10.
- Sintoma/reprodução: importar Amêndoas mantém “Lendo arquivo…” e Cancelar não responde;
  outro EPUB importa. Na campanha anterior o arquivo pessoal não foi localizado no computador;
  em 16/10 foi encontrado no Downloads do Redmi, sem copiar seu conteúdo para o Git.
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
  Nova primeira divergência CONFIRMADA no caminho Native: leitura Base64 seguida de atob
  e cópia por caractere bloqueava JS antes do ZIP. Agora usa File.bytes assíncrono já instalado.
  test-epub-native-read.cjs falha no baseline 3df3f5b e passa com bytes/cancel/erro/retry.
  Fixture controlada de 8 MiB: 11.184.812 caracteres Base64 decodificados → zero;
  etapa completa 3298→5 ms no desktop com filesystem controlado, não tempo Android.
- Testes realizados: fixture/fontes/condições CSS/SVG/srcset/imagens/links/JSON/cancelamento
  PASS; Freud saudável com 26 capítulos PASS; test-book-import/test-catalogs PASS.
  Baseline 25.767 ms e primeira revisão 1.339 ms sob carga concorrente; revisão final 318 ms
  e Freud 402 ms em outra carga desktop. Não usar como promessa de desempenho Android.
- Validação física em 16/10: EPUB original de 1.331.333 bytes importou em 16.295 ms no debug;
  nova tentativa cancelou durante reading em 3.986 ms, com terminal cancelled e sem livro
  adicional. Biblioteca 35→36 pela importação concluída; original conservou seu SHA-256.
  Foram encontradas quatro cópias locais com esse hash, sem baseline por arquivo que permita
  atribuir sua origem. Nenhuma foi apagada; não declarar limpeza física do cancelamento comprovada.
  Abertura/reabertura após parar e relançar o processo confirmou 15/728; runner final
  repetiu controles e reabertura a frio em 18/728, com 36 livros preservados.
- Nova falha física identificada na abertura: “Calculando páginas…” permanecia indefinidamente.
  Oito imagens lazy fora da coluna não eram solicitadas, mas a barreira layoutReady esperava
  todas. Contraprova diagnóstica solicitou as imagens e liberou 1/728; não é o teste final.
  Correção 101395c em EpubReaderDocument.ts instala listeners load/error antes de promover
  imagens pendentes a eager. Reabertura normal em outra WebView, sem intervenção no DOM,
  carregou as dez imagens e confirmou paginação. FontFaceSet estava loaded (nove declarações).
  Recursos não foram removidos. Novo test-epub-image-readiness falha no baseline f851b3a,
  passa corrigido; Chromium com imagem fora da coluna, matriz 66/66, typecheck/export PASS.
- Limites: desempenho medido no debug, não release; sem certificação de EPUBs ilimitados ou
  de todos os aparelhos. Uma descompressão ZIP já iniciada pode terminar internamente.
- Dependências externas do cenário original: arquivo e Redmi disponíveis; demais regressões
  físicas e resultados específicos continuam discriminados nos respectivos itens.
- Não regredir: metadata, spine, CSS/fontes/imagens, links, rollback, conta e EPUBs saudáveis.

## BUG 02 — Library Sync implantado, validação autenticada pendente

- Prioridade: ALTA. Status: PARCIAL / IMPLANTAÇÃO INFORMADA / VALIDAÇÃO AUTENTICADA PENDENTE.
- Sintoma/reprodução: “37 operações pendentes”, último sync ausente e servidor indisponível.
  37 é relato do aparelho; a UI soma entidades dirty e arquivos pendentes.
- Evidência histórica: 10:58 BRT HTTP404/PGRST205; após deploy informado, nova sonda de
  12:58 BRT retornou HTTP401/42501 nas duas tabelas. Usuário informou versions remotas
  20261015145012/20261015145018, bucket privado e sete policies. NÃO reaplicar 001/002.
- Reconferência real em 15/10 às 15:17 BRT: as duas tabelas seguem HTTP401/42501;
  RPCs reconferidas às 15:28 BRT: library_apply nulo negado (401/42501), helper Storage false.
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
  Nova causa de implementação CONFIRMADA: adapter aguardava sessão SDK/fetch/corpo sem
  corrida de cancelamento; podia manter a Promise pendente após cancelar. Agora usa withAbort
  nas três fronteiras e rejeita retorno de sessão tardio antes da rede; outbox não é alterada.
  test-library-remote --baseline falha em getSession pendente; corrigido passa sessão/rede/
  corpo/prazo de I/O/retry e separa contrato, sessão, autorização (42501) e rede.
- Testes realizados: library-sync/files/reading-sync/coordinator/restart PASS em SQLite/
  fronteiras controladas; library-rls PASS em PostgreSQL/PGlite A/B/anon e fences Storage.
  App Web com dois IndexedDB/HTTP fixture passou upload/download/remoções/rollback/conta.
- Testes pendentes: inventário admin, comparar implantação existente e avaliar somente a nova
  migration de hardening (BUG 11); HTTP autenticado A/B/disabled, Storage e dois aparelhos.
- Dependências externas: plugins Supabase/GitHub/Vercel disponíveis na Etapa 1.5; inventário
  remoto somente leitura confirmou ledger Library 20261015145012/018. Implantação requer
  autorização explícita e deve seguir [LIBRARY_SYNC_DEPLOYMENT.md](LIBRARY_SYNC_DEPLOYMENT.md):
  comparar ledger/objetos/ACL/RLS/bucket; reconhecer o mapeamento remoto 20261015145012/018;
  repetir inventário e testes autenticados. Não reaplicar nem editar migrations históricas.
- Não regredir: USER A != USER B, Storage privado, CAS/recibos/tombstones, offline e fila durável.

### SaaS Etapa 1 — dependência de implantação e validação da Library

- Status: IMPLEMENTADO LOCALMENTE / IMPLANTAÇÃO REMOTA E QA AUTENTICADO PENDENTES.
- Migration nova 20261015190705_saas_plans_entitlements.sql depende do hardening do BUG 11;
  preservar o mapeamento histórico do ledger e aplicar somente incrementais após inventário.
- Catálogo Free/Pro, concessão Free no servidor, assinatura, entitlements e snapshot tipado
  estão implementados. Free inclui Sync/Storage privado. Cliente não promove plano;
  master não significa Pro. Sem backend, plano é indisponível e leitura local permanece.
- Quotas preservam dados existentes acima do limite, atualizações/estudo e outbox;
  bloqueiam apenas novos livros remotos/crescimento de bytes. Legado sem metadata.size
  confiável mantém arquivo e reporta uso desconhecido (`null`), exigindo reconciliação
  administrativa antes de ampliar bytes. Não preencher tamanhos com JSON do cliente.
- Testes locais: SaaS PostgreSQL/PGlite (RLS A/B/anon, autopromoção, disabled, backfill,
  expirado/revogado, UPSERT no limite e probe/commit Storage), adapter controlado e
  compatibilidade SQLite/OpenBook PASS. Typecheck/export Web PASS; matriz crítica 56/56
  anterior à adição da suíte de compatibilidade, que também passou isoladamente.
- Pendente: inventário/implantação autorizada e HTTP real A/B/disabled, upload/download
  com versão real do Storage e concorrência entre dispositivos. O constraint trigger de
  bytes é deferred para não bloquear a sonda revertida de permissão; integração real não
  foi exercitada. Nenhuma certificação de produção/Android é inferida do PGlite/export.
- Não regredir: leitura local/importação, Sync no Free, USER A != USER B, Storage privado,
  perfis/contas desativadas, recibos e fila durável. Sem APK, cobrança ou Etapa 2.

### Aldus Admin Etapa 1.5 — ativação remota pendente

- IMPLEMENTADO LOCALMENTE / IMPLANTAÇÃO E QA REMOTO PENDENTES. Migration nova
  20261015194604_aldus_admin.sql depende de hardening e SaaS Etapa 1. Inventário do plugin
  list_migrations em 15/10 mostrou somente Battle/Library/recuperação com versões remotas
  20261015144958/20261015145012/20261015145018; não inferir estado de objetos fora do ledger.
- OWNER inicial não concedido. Script supabase/admin/bootstrap_aldus_owner.sql exige UUID
  Auth real, e-mail indicado confirmado e perfil ativo, em conexão confiável autorizada.
  Nenhuma conta real foi consultada/criada/alterada nem SQL administrativo remoto executado.
- Testes locais: PostgreSQL/RLS, bootstrap/MFA/revogação/último OWNER/CAS/auditoria,
  contrato/adapter, typecheck, export Web e matriz crítica 59/59 PASS. Ensaio Web real do
  app exportado com HTTP/PostgreSQL locais PASS em OWNER/ADMIN/comum, Pro/preços/avisos,
  confirmação, revogação e layouts desktop/mobile. Auth/JWT/TOTP são fixtures controladas.
- Pendente: inventário completo/implantação autorizada, identidade inicial e MFA reais,
  sessões HTTP A/B, disputa entre conexões PostgreSQL, Storage e validação Android.
- Configurações marcadas requires_deploy ficam armazenadas/versionadas até integração
  de runtime; só app.notice aparece em Ajustes nesta etapa. Financeiro sem provedor é
  indisponível, nunca receita zero presumida; sem logs de falhas ou telemetria inventados.
- Não regredir: Sync/Storage Free, Reader, dados privados, master separado de Admin/Pro,
  auditoria imutável, conta ativa e último OWNER. Sem APK/deploy/cobrança/Etapa 2 SaaS.

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
- Redmi/Android 16 em 16/10: Ajustes→Minhas fontes→biblioteca existente→gerenciador→
  fechar/retornar funcionaram. Fonte preservada com catálogo local vazio e mensagem
  explícita de reconexão necessária. Não havia grant válido para atualizar/indexar;
  API/indexação e cancelamento em andamento BLOQUEADOS nesta execução. Nenhum OAuth,
  consentimento, desativação, remoção ou alteração de arquivos foi realizado.
- Dependências externas: conta/grant e aparelho. Roteiro humano em
  [GOOGLE_AUTH_DRIVE_DEPLOYMENT.md](GOOGLE_AUTH_DRIVE_DEPLOYMENT.md); sem reabrir OAuth por hipótese.
- Não regredir: ROOT/árvore/atalhos de pasta/ciclos, fuzzy local, snapshot offline e download escolhido.
  Atalhos para arquivos continuam limitação conhecida, sem implementação especulativa nesta campanha.

## BUG 06 — Reflow grande demora em 98–100% e cancelamento final sem fechamento

- Prioridade: ALTA. Status: IMPLEMENTADO / ANDROID PARCIAL: CANCELAR, CONCLUSÃO E CACHE PASS.
- Sintoma/reprodução: histórico físico Weber 584 páginas parado em 582/584; cancelar/Back
  atrasados. Arquivo original de 969 páginas não identificado. Travamento físico não reproduzido.
- Evidência/primeira divergência: execução Weber eventualmente publicou cache; await exato
  do intervalo não foi isolado. República 525 páginas cancelou durante extração e depois
  concluiu, sem validar cancelamento na montagem final ou no arquivo de 969 páginas.
- Causa física: INCONCLUSIVA. Novas causas CONFIRMADAS no código: guard esperava bookId
  mas cache fornece id; save era rejeitado e o Reader ignorava erro/publicava antes do commit.
  Plano OCR repetia scans síncronos/flatMap; qualidade final, HTML e JSON também eram síncronos.
  Bytecode/scheduler histórico já corrigidos não são apresentados como defeitos novos.
- Arquivos: PdfReflowProcessor.native.tsx, PdfReflowDocumentBuilder.ts, ReaderScreen.tsx.
- Correção: guard aceita ID do cache apenas em repository findByBookId; preparação aguarda
  commit sem ocultar falha. Validação/OCR/HTML/JSON cooperativos, CPU budget de 8ms, aborto
  em cada fronteira, SQLite exclusivo/rollback e IndexedDB oncomplete/abort, geração protegida.
  Libera geometria/base64/WebView de extração antes do commit; Original e cache anterior preservados.
- Testes realizados: evidência histórica de extração/cancelamento/cache e suítes controladas;
  mudanças OCR posteriores não certificam a reprodução física específica.
- Novos testes: test-reflow-finalization (guard falha no baseline, SQLite real/rollback,
  IndexedDB abort após put, fixture JSON de 9,6MB, heartbeat/cancel), test-reader-screen
  --finalization-baseline falha antes do commit; corrigido mantém Back e ignora save tardio.
  test-reflow-native-lifecycle exercita componente Native real com bridge/IO controlados:
  cancel/unmount nos últimos 1%, falha de cache, terminal único e liberação da WebView.
  PDFs reais em desktop/texto sem imagens: Ócio 49p, Ética 63p, República 525p e Weber 584p
  passaram abertura→extração→montagem→validação→HTML→commit→releitura. Weber disponível:
  5.265.071 bytes, 2.055.524 caracteres; montagem 4675ms, cache/serialização 1665ms sob carga.
  Não é reprodução física, nem prova do PDF original de 969p ou de imagens/OCR Android.
  Web exportado/PDF.js real de 49p: falhou ao reabrir porque a assinatura metadata→fileHash
  da primeira sincronização invalidava o cache. Agora assinatura SHA-256 estável desde o
  primeiro preparo, calculada em blocos sem writes/Upload quando o hash ainda não existe.
  test-library-web.cjs --reflow passou Reader/commit/primeiro layout, reload em documento
  novo e reutilização do mesmo cache/updatedAt. Auth/Storage continuam fixtures HTTP.
  ReaderScreen passou dez toggles e tipografia na página intermediária sem remount/perda.
  Regressão de cancelamento OCR confirmada no componente Native: write temporária podia
  terminar após unmount sem cleanup. Nome agora único, limpeza do retorno tardio/parcial;
  test-reflow-native-lifecycle --ocr-temp-baseline falha no e54bf50 e versão corrigida passa.
- Redmi/Android 16 em 16/10, Weber 584p/5.265.071 bytes: extração chegou a 584/584;
  Cancelar durante “Validando texto extraído” removeu overlay e retornou ao Original
  1/584. Repetição concluiu validação→montagem→finalização→SUCCESS em 212.227ms pelos
  eventos START/SUCCESS (observação UI terminal em cerca de 225s), exibindo 1/2098.
  Voltar à biblioteca e reabrir recuperou 1/2098 sem novo START de extração: cache
  reutilizado. Não foi necessário alterar o processador nesta campanha.
  Tempo de preparo continua alto no debug; amostras PSS do processo aproximadamente
  1,3–1,6 GiB, sem medição de pico/conjunto de renderers ou diagnóstico de vazamento.
  Uma tentativa anterior ficou sem acompanhamento durante a pausa; a retomada encontrou
  Metro indisponível e modo Original, sem diagnóstico da causa. Não prova conclusão ou
  falha específica de cache. Relatórios locais ignorados:
  .expo/redmi-qa/reflow-summary.json e reflow-resume-observation.jsonl.
- Testes pendentes: Back especificamente na finalização, OCR físico (Weber tem texto),
  PDF original de 969p não identificado e desempenho em distribuição consolidada.
- Dependências externas: arquivo original; build release somente sob pedido específico.
- Não regredir: Original independente, cache validado, posição, cleanup e terminal único.

## BUG 07 — Rolagem do painel Preferências no Android

- Prioridade: MÉDIA. Status: ROLAGEM VALIDADA FISICAMENTE / REPAGINAÇÃO PARCIAL.
- Sintoma/reprodução: demonstração física de 09/10 registrou falha de rolagem global do painel.
- Evidência/primeira divergência: contraprova de backdrop/painel foi compilada; última nota
  ainda dizia teste em execução, sem resultado físico conclusivo. Slider/controles positivos
  em outros cenários não encerram a rolagem. Não é nova falha observada no HEAD desta campanha.
- Causa: INCONCLUSIVA; competição de Pressables ancestrais era hipótese.
- Arquivos: ReaderSettingsPanel.tsx, ReaderControls.tsx, ReaderScreen.tsx.
- Correção: nenhuma adicional; não alterar Reader sem nova primeira divergência.
- Testes realizados: controles e contratos Web/controlados anteriores positivos, não prova de scroll Native.
  Novo test-reader-preferences-layout.cjs: componente Native real em React, backdrop irmão
  sem Pressable ancestral, teclado e 12 layouts Yoga (retrato/paisagem, conteúdo curto/longo
  e equivalente a fonte ampliada) passaram. Slider real mantém gesto vertical no ScrollView.
  Nenhuma divergência de layout/contrato reproduzida; não foi feita alteração especulativa
  no painel, na paginação ou na WebView. Yoga/React não exercitam toques físicos Android.
- Redmi 23117RA68G/Android 16, development build compatível + Metro em 16/10:
  painel longo rolou de fonte até margens/modo anti-enjoo; arraste vertical iniciado
  sobre o slider rolou o painel sem alterar fonte 26px nem deslocamento do documento.
  Arraste horizontal alterou efetivamente a fonte para 22px; retorno a 26px confirmado
  na WebView. Claro e Sépia aplicaram cores distintas; Sépia original restaurado.
  Abrir/fechar o painel sem ajustes preservou 18/728 no runner físico. No ciclo de
  fonte 26→22→26 a página final foi 17/728: não comprova preservação exata da âncora.
  Nenhuma correção especulativa de layout foi feita. Evidências locais ignoradas:
  .expo/redmi-qa/reader-controls-result.json e preferences-*.json/PNG.
- Fonte do sistema 130%: navegação Meu Plano/Comparar e rolagem longa das Preferências
  PASS físico, com screenshots revisados; 100% original restaurado. Pedido de rotação
  via sistema manteve aplicativo em retrato (1080×2400), conforme bloqueio declarado,
  e configurações originais restauradas. Isso não testa gesto físico de girar o aparelho.
- Testes pendentes: precisão da âncora após repaginação, sensor/orientação física e
  TalkBack real. A validação da rolagem não encerra esses cenários independentes.
- Dependências externas: distribuição futura com bundle consolidado; debug usa Metro.
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

### SaaS Etapa 2 — quotas de Sync/Storage e validação remota pendente

- Status: IMPLEMENTADO LOCALMENTE / VALIDAÇÃO REMOTA AUTENTICADA PENDENTE.
- Incremental 20261015215745_saas_quota_reservations.sql: reserva transacional por objeto,
  fence RLS contra upload sem reserva, conferência deferred de bytes reais e reconciliação
  idempotente. Catálogo backend conserva Free 100/500 MiB e Pro 2000/10 GiB configuráveis.
- Livros, bytes de objetos existentes/órfãos e uploads reservados são medidos separadamente;
  objeto concluído não soma também a reserva. Tamanho desconhecido permanece null e exige
  reconciliação confiável; não usar fileSize/metadados do aplicativo como uso real.
- Recusas de cota preservam outbox/operationId e deixam notas/progresso/organização de livros
  existentes sincronizarem. Background não repete envios bloqueados com snapshot inalterado;
  mudança de capacidade ou Sincronizar agora retoma. Leitura/importação local e recuperação
  de arquivos existentes continuam. Downgrade acima da cota não exclui nem oculta dados.
- Evidência local: matriz crítica 62/62 PASS; 19 cenários SQL PGlite, SQLite/outbox e driver
  com HTTP controlado PASS; typecheck/export Web PASS. PGlite serializa solicitações:
  a homologação posterior acrescentou PostgreSQL nativo 17.6 com sessões independentes
  (19 cenários/cinco locks reais). Storage HTTP/Supabase autenticado continua pendente.
- Ledger remoto reconfirmado somente leitura: 20261015144958/20261015145012/20261015145018.
  Não aplicar a nova SQL diretamente sem reconciliar schema real, ledger, pré-requisitos,
  RLS/ACL e versão do Storage. Pendente autorização/implantação e validação real de A/B,
  disabled, bypass direto, probes, tamanho real, disputa de capacidade, cancelamento,
  conclusão tardia, objeto órfão, downgrade e recuperação da fila.
- Nenhum bug físico anterior foi encerrado por estes testes; nenhuma produção alterada.
  Nenhum APK foi iniciado nesta etapa e nenhum pagamento ativado. A implementação original
  na integração foi consolidada; novas implementações usam main.

### Homologação gratuita SaaS/Admin — bloqueios remotos remanescentes

- VALIDADO LOCALMENTE: quatro incrementais originais em PostgreSQL 17.6 isolado,
  biblioteca sintética anterior preservada, RLS/grants/RPCs/A-B/disabled/anon,
  autopromoção Pro/ADMIN negada, downgrade/upgrade, reservas/idempotência e falhas.
  19 cenários PASS, cinco disputas reais entre sessões, incluindo último OWNER/CAS Admin.
- Admin Web: dez áreas/formulários, TOTP controlado, OWNER/delegação/Pro negado,
  revogação/offline, auditoria, desktop/mobile PASS. E-mail pessoal retirado de fixtures.
  Auth/JWT/TOTP e bytes HTTP são controlados: não declarar validação GoTrue/S3 real.
- Ensaio de recuperação sintética PASS: cluster parado, SHA256, restauração em cluster
  novo, Auth/perfis/metadata/ledger/auditoria e bytes separados; corrupção rejeitada.
  Recuperação de PRODUÇÃO não comprovada. Sem exportação pessoal autorizada, pg_dump/
  pg_restore portátil ou restore gerenciado. Implantação depende dessa prova e aprovação.
- Remoto revalidado por contagem: duas contas reais, zero biblioteca/receipts/objetos;
  não usar contas reais como fixtures. Quatro incrementais continuam pendentes.
- Supabase Free: 50 MB/arquivo e 1 GB incluído por organização na Fase A, reconferir.
  Não equivale ao catálogo Aldus Free 500 MiB/Pro 10 GiB. Pro comercial não habilitado.
  Piloto remoto pequeno proposto, sem criação de projeto ou consumo pago.
- Backup/exportação/restore isolado já autorizados posteriormente, ainda não concluídos;
  não executados na Etapa 3. PENDENTE AUTORIZAÇÃO: incrementais/ledger, contas descartáveis
  e Auth/RLS/Storage reais, bootstrap OWNER com UUID reconfirmado (separado)
  e deploy Web (separado). Proprietário participa do login/TOTP; conferir protocolo de
  uploads em clientes antigos antes de rollout. Sem mudanças remotas nesta missão.
- Nenhum bug físico anterior encerrado. Sem APK/deploy/cobrança. Procedimento e evidência
  detalhados em PROJECT_CONTEXT.md; main permanece a branch oficial.

### SaaS Etapa 3 — interface pronta, ativação e QA físico pendentes

- IMPLEMENTADO/VALIDADO LOCALMENTE: Meu Plano e Comparar Planos, integrados a Ajustes,
  Conta, catálogo autenticado e RPCs SaaS/quotas existentes. Sem limites comerciais
  duplicados na UI, cache de entitlements, autopromoção ou contratação simulada.
- Uso desconhecido continua null/“Em verificação”; reservas separadas de bytes armazenados,
  progresso limitado a 0–100%, excesso e downgrade preservam os dados e a outbox.
  Conflito/bloqueio de franquia agora aparecem nos estados centrais dos livros; metadata
  sem remotePath confirmado não anuncia arquivo sincronizado na nuvem. Remoções atuais
  mantidas, com acesso a Meu Plano e ao gerenciamento existente da biblioteca.
- Sessão/rede/autorização/contrato inválido geram indisponibilidade recuperável. Fences
  por identidade/geração descartam A→B→A e respostas tardias. Offline/background/logout
  limpam a apresentação; reconexão/foco revalidam no servidor. Free nunca vira Pro local.
- Evidência: typecheck/export Web e matriz 64/64 PASS; 27 cenários SQL/TS novos, componentes
  Native e hook React controlados PASS; Chromium desktop/360px/claro/escuro/fonte ampliada,
  teclado/AX, consumo, erros/retry, trocas de conta e navegação PASS. Regressões Web Library
  (EPUB/Reader/IndexedDB/outbox) e Admin (TOTP/formulários) PASS. Dados sempre sintéticos.
- PENDENTE: quatro migrations de produção, backend/Auth/Storage gerenciados autenticados,
  recuperação real e autorizações já registradas. UI mostra serviço indisponível enquanto
  backend não estiver ativo. Catálogo Pro informativo, sem comercialização/pagamentos.
- Android físico permanece pendente; futuro build/instalação necessário para distribuir
  o novo bundle. Nenhum APK/deploy/migration remota/backup real nesta etapa. A janela de
  senha anterior foi encerrada sem leitura de credenciais. Bugs físicos anteriores intactos.

### Cadastro, Google e travamentos Android — atualização de 19/10/2026

- Cadastro HTTP 500: confirmado conflito profiles_username_unique_ci no trigger de criação
  do perfil durante o incidente. Correção local adia a reivindicação do username ao fluxo
  autenticado, sem modificar trigger/RLS remoto. Cadastro real autorizado criou identidade e
  perfil ativo/user; UI Verifique seu email. Ainda pendentes confirmação e login posterior.
- Login Google: SDK sem SubtleCrypto gerava PKCE plain, rejeitado pelo validador S256.
  Corrigidos RNG Native e desafio S256 preservando verifier e validações. Vetor correto no
  Hermes físico; autorização/callback/sessão completos ainda pendentes. Auditoria também
  encontrou allowlist remota ampla para caminho Native e localhost Web não preservado;
  nenhuma configuração externa alterada nesta missão.
- BUG-03: reconexão/indexação Google real concluiu no Redmi, 713 livros e 62 pastas, em
  117.056 ms. Cancelamento real encerrou loading preservando índice; erro network após
  segundo plano também terminou sem perda e retry explícito concluiu. SQLite persistiu;
  reabrir processo e abrir offline preservaram catálogo. 38 livros pessoais mantidos.
- Reduzidos trabalho duplicado ao abrir e busca síncrona grande; busca cooperativa cancela
  e rejeita resultados tardios. Não foi demonstrada causa única para todos os congelamentos
  relatados; não há baseline físico cronometrado comparável. Manter acompanhamento até
  completar importação física e fluxos de conta. Sem ANR no período inspecionado.
- Typecheck/export e matriz final 74/74 PASS; Sources UI/Chromium com fixtures controladas
  PASS, sem substituir prova física. Resultados adicionais de conta devem ser registrados
  ao concluir. Nenhum release/deploy/migration remota nesta correção.

### Fechamento dos ensaios Android — 19/10/2026

- Cadastro por e-mail VALIDADO com a identidade autorizada: criação, confirmação, login,
  conclusão do username e Free automático. Primeiro carregamento de perfil falhou e retry
  recuperou com HTTP 200; manter essa falha intermitente ABERTA, causa ainda inconclusiva.
- Google PARCIAL/BLOQUEADO: S256/RNG local corrigidos e fluxo abriu/recebeu consentimento
  real, mas Supabase registrou invalid_client na troca com Google. Sem sessão Google.
  Configuração do provedor remoto exige autorização específica, sem relaxar RLS/PKCE.
- Corrida de callback corrigida: Root registra URI Native validado; initial URL atrasada
  do development client não substitui evento real. Parâmetros de rota sem URI confiável
  não fazem exchange. Testes e erro sintético no Redmi PASS; não confundir com login Google.
- Drive: indexação completa e repetida com 713 livros/62 pastas, cancelamento, recuperação
  de erro e leitura offline/persistência demonstrados. EPUB importado sob demanda, aberto
  no Reader e retorno à fonte; contagem 38→39 por esse acréscimo, sem apagar os anteriores.
  Conta original restaurada e sessão validada no servidor; cadastro legado não foi adotado.
- Estabilidade não declarada universal: alto uso de memória observado no build de
  desenvolvimento e ausência de baseline físico equivalente; causa de todos os travamentos
  ainda não demonstrada. Sem ANR nos ensaios. PDF físico permanece fora da prova desta rodada.
- Gates finais 75/75 + typecheck/export + Auth/Chromium PASS. Futuro bundle Android
  necessário para distribuir; sem release, deploy ou alteração de configuração remota.
