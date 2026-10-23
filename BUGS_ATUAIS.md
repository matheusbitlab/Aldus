# Aldus Reader — Bugs Atuais


## 23/10/2026 — continuidade entre processos corrigida; fechamento físico ainda parcial

CORRIGIDO E VALIDADO no Redmi (c382f99): EPUB 15→16→reinício offline→15 e 15→18→reinício offline→15 restauram página 3/13 e exatamente o recorte do corpo. Intenção textual agora persistida no campo existente de progresso, com envelope validado, restauração confirmada e proteção contra eventos iniciais; não depende só de memória. Margens após reinício, temas, quatro categorias, foco, navegação e reabertura passaram. Regressões SQLite em arquivo e Chromium EPUB/Reflow passaram. O FAIL histórico 2/13 permanece no registro anterior como baseline, não como estado atual da correção.

BLOQUEADO por ausência USB do Redmi: repetição atual de PDF Original/Leitura Livre, brilho, seleção/grifos afetados e UI Ciclo 2. A build instalada e exercitada era c382f99; não apresentar PDF testado em 53b4e32 ou emulador como prova física atual. Nenhuma desinstalação, limpeza ou adoção dos livros QA A/Amêndoas. Configuração temporária heads_up_notifications_enabled deve voltar de 0 para 1 quando o aparelho reconectar; Wi-Fi/dados restaurados 1/1, font_scale 1.0, keep-awake originalmente 3. Episódio de spinner no início do app recuperou após rede/reabertura, causa INCONCLUSIVA; UIAutomator 137 preservado como falha de ensaio.

CORRIGIDO no incremento Ciclo 2: seleção acessível por teclado (Space/Enter) e saída do filtro quando o último livro deixa uma coleção. Organização coletiva reutiliza modelo/Sync/outbox; CAS/guarda de conta em escrita local única impedem parcial conhecida e publicação tardia A→B→A. Renomeação inclui todos os membros e detecta alterações concorrentes. I/O de resultado indeterminado mantém write-ahead; Sync remoto continua por livro. Concorrência entre abas Web separadas não foi comprovada como atômica. Criação de coleção exige um livro no modelo existente, sem nova entidade vazia.

VALIDADO: 86/86 críticas, typecheck/export Web, regressões de Reader/organização/Sync e Chromium real dos componentes da biblioteca (8 layouts claro/escuro, mouse/toque/teclado, escala CSS, 1000 livros virtualizados). Checkout limpo com npm ci/setup e gates finais PASS. Preview 254d4b1 confirmado com sessão QA existente e EPUB sintético offline realmente renderizado; primeira captura ainda com loader foi mantida/reclassificada e repetida com ACK layoutReady. Novo login por senha e callbacks OAuth/recovery nesse origin não foram comprovados/alterados.

APK universal Beta 254d4b1 compilado, assinatura privada e bundle/source map verificados; instalação/hash e inicialização offline no emulador isolado passaram. APK ARM anterior falhou no AVD x86_64 por ABI/libreactnative.so, não por login; universal inclui x86_64. Certificado Beta não corresponde ao Redmi pessoal: não instalar por cima, não desinstalar para contornar. Entrega privada em partes + reconstrução SHA-256 testada; metadados remotos privados conferidos. Ver PROJECT_CONTEXT.md para hashes, caminhos, limites e evidências. Homologação integral física continua PARCIAL/BLOQUEADA até reconexão. Nenhuma migration/deploy de produção ou alteração de permissões.

Limite do emulador: o ensaio inicial 1080×2400 sofreu ANRs do Pixel Launcher e da System UI por pressão de memória do ambiente. Capturas mantidas; as duas inicializações offline foram repetidas em 540×1200/density 210, com Aldus em primeiro plano e login renderizado. Não é prova de desempenho físico ou autenticação.


## Ciclo 1, incremento 2 — homologação física de 23/10/2026

Continuação do checkpoint 225f9d1, sem refazer o painel. Implementados: seleção acessível das quatro categorias, valor numérico da fonte, slider Web por teclado e ponteiro (ef8f8c8, 53b4e32). Corrigida a deriva cumulativa da âncora em mudanças sucessivas de tipografia no documento EPUB/Leitura Livre (4872238): captura de intenção mantida até navegação explícita, sem novo armazenamento nem alteração de ReaderScreen, Sync, Auth ou landing.
VALIDADO no Redmi Android 16, APK com código de aplicação 53b4e3263978cf7d339decaba23d28aed3cea5c4: EPUB nas quatro categorias, abrir/fechar mantendo página e pixels do corpo; fonte 15→16→15 retorna 3/13→3/14→3/13; margens Larga→Normal→Larga restauram o corpo; Claro/Escuro/Sépia preservam posição. Ler em foco, recuperação dos controles, navegação e preferência de ocultar contagens/reabertura/reinício foram exercitados. PDF Original: quatro categorias, zoom 100→125→100, quatro rotações, foco e navegação 3/4→4/4→3/4. Leitura Livre: quatro categorias, foco repetido e reabertura em 6/8; retorno ao Original em 3/4. Página/fonte preservadas no tamanho salvo após reinício. Escalas físicas Android 130% e 160%: quatro categorias e fechamento visíveis, oito capturas; configuração restaurada para 100%. Não é prova integral de TalkBack ou de todos os controles por leitor de tela.
PARCIAL — fechamento integral do Ciclo 1 ainda pendente: no cenário adicional fonte 15→16, reinício e retorno a 15, o tamanho e a contagem oculta persistem e a página no tamanho salvo é restaurada, mas a volta à fonte anterior resulta em 2/13 em vez de 3/13. A intenção tipográfica retida é apenas em memória; a restauração existente usa página/progresso, sem persistir essa intenção textual. Não apagar a evidência FAIL nem declarar âncora durável exata comprovada entre processos. Abrir/fechar ajustes sem mudar tipografia passou; a lacuna requer solução de persistência compatível e nova prova física antes de encerrar integralmente a homologação. Ciclo 2 não iniciado.
Qualidade: 84/84 suítes críticas PASS após a correção da âncora, typecheck e export Web PASS. Chromium no documento real: EPUB e PDF Reflow, roundtrips tipográficos e navegação explícita PASS. Matriz do painel real em fixture controlada: 128 layouts (320/390/430/768/1440, claro/escuro, 100/130/160%, mais categorias PDF Original/Reflow), teclado, ponteiro, fechamento fixo, rolagem e isolamento dos ajustes PDF PASS. Scripts incorporados em package.json: test:reader:settings:web, test:reader:browser, test:reader:epub:web, test:reader:reflow:web (110cf0d). Ferramenta de bundling de teste esbuild 0.28.2 preparada isoladamente em .expo/reader-matrix-tools; não é dependência nativa ou de produção. Resultados controlados não substituem Android.
APK exclusivo de homologação: artifacts/apk/Aldus-53b4e32-cycle1-homologacao.apk; 346587934 bytes; SHA-256 093eb4f19868c1312eb96514fcdb84da5c782f5a1f0c5a8bf2a1912a76105caf. Package com.aldus.reader, 1.0.0-beta.2/code 3, não debuggable, bundle Hermes incluído, inicialização/reinício sem dependência de Metro. Certificado SHA-256 fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c igual ao instalado. adb install -r confirmado; hash instalado correlacionado e firstInstallTime 2026-10-11 21:38:27 preservado. Source map confere exatamente ReaderSettingsPanel, ReaderSettingsSlider e EpubReaderDocument com as fontes finais. Nenhuma desinstalação ou limpeza. Tela da biblioteca mostrava 35 livros antes/depois das atualizações; é contagem visual contextual, não inventário total nem prova de perda em relação aos 40 históricos.
Evidências locais ignoradas em .expo/research-cycle1-increment2: apk-install-anchor.json, final-source-map-proof.json, final-embedded-bundle-proof.json (bundle APK igual ao Hermes gerado), anchor-fixed-epub-preferences.json (inclui FAIL do cenário após reinício), pdf-final-physical.json, final-epub-cold-focus.json, android-font-scale.json, categories-web-results.json e capturas final-epub-*, final-pdf-*, android-font-*. Logs críticos/typecheck/export em .expo/cycle1-anchor-*.log. Captura categories-before-390.png é baseline Web controlado, não Android antigo. Sem acesso direto aos valores persistidos de âncora no APK release; prova física usa conteúdo/página visível e reabertura, complementada por regressão do documento real no Chromium.
Preservadas alterações locais preexistentes em .gitignore, PROJECT_CONTEXT.md e BUGS_ATUAIS.md; apenas esta seção documental foi adicionada ao índice. Nenhum deploy, migration remota, mudança de usuário/permissão, pagamento ou APK de distribuição. Módulos nativos não mudaram. Distribuição requer nova compilação assinada pela chave final e homologação da pendência de continuidade; o APK device-rehearsal não foi publicado como beta comercial. Configurações temporárias de teste do aparelho devem estar restauradas ao encerrar.


## Ciclo 1, incremento 2 — checkpoint de 23/10/2026

PARCIAL: painel do Reader organizado em Aparência, Tipografia, Página e layout e Concentração e conforto; fechamento fixo fora do scroll. Controles e handlers existentes preservados; nenhuma alteração no armazenamento, documentos, ReaderScreen ou landing.
Código: 29c2b87. Regressão de categorias: 8976ba8, incorporada à matriz crítica (84 entradas). Execução concluída: 83/83 suítes anteriores e nova suíte separada PASS; typecheck, export Web, ReaderScreen, paginação, persistência, concentração e 16 pares Chromium do rodapé PASS. Esses pares não comprovam o layout das novas categorias.
Redmi reconectado via ADB, Aldus em primeiro plano; tela atual mostra 35 livros. Isso não é inventário total nem prova de perda em relação aos 40 históricos. Nenhuma instalação, limpeza ou exclusão realizada neste checkpoint. APK instalado beta.2/code3 ainda não contém este incremento.
Compilação local exclusiva de homologação iniciada com device-rehearsal, sem publicação; log .expo/cycle1-increment2-android-build.log. Antes de instalar: conferir certificado contra pacote realmente instalado, package e versionCode. Não usar APK antigo como prova de JS novo.
Pendentes: matriz visual das categorias em 320/390/430/768/1440, temas e escalas 100/130/160%; inspeção e instalação compatível da build; EPUB/PDF Original/Leitura Livre físicos, foco, tipografia, âncoras, reabertura e reinício. Homologação física do incremento NÃO EXECUTADA; não declarar conclusão nem iniciar Ciclo 2.
Revisão auxiliar Astra não iniciou por limite de uso; implementação e testes acima executados pelo agente principal.


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

### 20/10/2026 — Capas, Ajustes e Admin

- IMPLEMENTADO/VALIDADO em contratos e interfaces controladas: capa EPUB declarada agora
  aproveitada; BookCover editorial em biblioteca/Drive/busca/seleção; fallback para imagem
  quebrada/pequena e fonte sem capa; sem download automático dos livros do Drive.
  Capas de importações antigas não são extraídas retroativamente. SVG/arte >1 MiB e PDF
  Native sem miniatura existente usam o placeholder, sem novo subsistema de renderização.
- IMPLEMENTADO/VALIDADO: Ajustes compactos, índice legal público e controles anteriores
  preservados; Admin com dez seções agrupadas e configurações editadas sob demanda.
  Histórico, revisões, MFA, confirmações, auditoria e permissões continuam nas camadas existentes.
- Leitura Livre: otimização experimental DESCARTADA. Weber 584 páginas no desktop apresentou
  ~22 ms de economia no agrupamento, sem comprovação de melhoria dos 212 s informados no
  Redmi. Nenhum algoritmo do Reader/extrator/cache de produção alterado. Dois avisos JBIG2
  no ensaio desktop limitam prova de imagens; tempos reais de WebView/ponte/OCR/cache Native
  continuam sem comparação pareada nesta rodada. Não declarar conversão acelerada.
- Redmi: 40 livros confirmados, navegação/temas/Legal/fonte 1,3x após reabertura e catálogo
  Teste preservado em cache com 713 livros. Atualização do Drive aguarda reconexão, não
  repetida aqui. Automação da árvore acessível após alterar escala exigiu reabrir o dev client;
  não houve prova de ANR. Preferências originais e APK independente 35d092b restaurados.
- Qualidade: 79/79 críticas, typecheck/export, regressões específicas e Chromium do export
  com PostgreSQL/PGlite isolado PASS. Não equivalem a validação remota ou TalkBack físico.
  Alterações novas exigem futuro bundle Android autorizado; APK/preview 35d092b são anteriores.
  Bloqueio Google invalid_client e investigação intermitente de perfil/memória anteriores
  permanecem abertos; esta revisão não alterou configuração OAuth nem declarou sua correção.


### 20/10/2026 — Beta: evidência e bloqueios atuais

- CORRIGIDO: CI Linux falhava em touchAction no componente de desenho; tipagem específica
  Web preserva Native. CI do código 579cf75 PASS, matriz 80/80. Identidade da versão Web
  agora usa configuração pública de fallback quando Constants.expoConfig não existir.
- IMPLEMENTADO: assinatura privada obrigatória e exceção explícita de ensaio; feedback
  manual, contato aprovado e metadados 1.0.0-beta.1/build 2. Novo APK e preview protegidos
  do mesmo código existem; isso não equivale a GO nem a instalação da nova chave no Redmi.
- Backup deixou de estar bloqueado: dump real + seis arquivos físicos cifrados, restore
  isolado de 65 tabelas e hashes conferidos. Serviços gerenciados/configurações externas
  e recuperação EFS/DPAPI fora desta máquina não foram reconstituídos.
- Piloto real teve 12 cenários PASS e uma asserção inicial de limpeza FAIL. Causa inicial
  não determinada; estado final confirmado por consulta do objeto ausente, GET 404,
  remoção repetida e tombstone idempotente. Conservar essa ressalva na entrega.
- QA A NÃO é mais puramente descartável: Amêndoas foi escolhido/importado pelo proprietário
  durante o seletor. Preservar livro local, conta e fila; não apagar nem transferir para
  a conta pessoal sem ação explícita. Ensaio dos dois arquivos sintéticos usa QA B.
- Redmi confirmou importação EPUB/PDF QA, Reader, avanço e marcador/nota; Storage B contém
  os dois arquivos (7.190 bytes), zero reservas. Ciclo completo com preview ainda em curso.
  Automação foi protegida contra leitura de XML antigo e toques fora do Aldus/seletor;
  perda de foco para outro aplicativo não é evidência de travamento do Aldus.
- Google invalid_client, username-login ausente, incidente intermitente de perfil e
  validação real de confirmação/recovery continuam abertos. Não alterar OAuth nem esconder
  Google sem autorização específica. Nova assinatura beta exige ensaio Drive separado.
- Retenção/identificação formal do controlador, custódia das chaves, instalação limpa da
  assinatura beta e admissão restrita precisam ser concluídas/aprovadas antes de convites.
  Sem deploy de produção, migrations, OWNER, cobrança ou convites nesta missão.


### 20/10/2026 — Beta: fechamento de Sync real e recuperação Android

- CORRIGIDO/VALIDADO: BookCover lançava exceção no onLoad real do React Native Web por
  assumir nativeEvent.source. 22eb657 aceita Native e target/naturalWidth/naturalHeight,
  mantendo fallback para imagens inválidas. Oito casos reais do novo preview e conflito
  em duas sessões reais PASS, zero exceções. Typecheck/export e 80/80 críticas PASS.
- CORRIGIDO no teste: CI Linux de 22eb657 falhou por espera de cache baseada em cem
  setImmediate; f521187 aguarda a fronteira efetiva de save. Reader de produção intacto.
  CI remoto 39477626025 SUCCESS. Não atribuir a falha do harness à conversão do Reader.
- VALIDADO nos artefatos funcionais 22eb657: Android→Web→Android para EPUB/PDF, progresso,
  notas, organização; grifo Web recebido no Redmi; nota Native offline sobrevive ao
  cold reopen e chega ao servidor após reconectar. Criação de grifo Native→Web pendente.
  Ensaios físicos usam derivado do mesmo payload com certificado antigo, não a chave nova.
- Recovery Android deixou de estar bloqueado: novo link abriu Redefinir senha, proprietário
  salvou nova senha, Auth aceitou e sessão original persistiu após reabrir. 40 livros
  confirmados. Primeiro link rejeitado com One-time token not found permanece registrado,
  sem causa original inventada. Cadastro/confirm atual e recovery Web ainda não validados.
- Novo APK privado/preview 22eb657 prontos, mas NO-GO: 27/34 portões PASS (79,4%), um FAIL
  e seis bloqueados. O APK de assinatura nova não foi instalado no Redmi; não apagar o app
  pessoal para testá-lo. Google invalid_client, username-login ausente, perfil novo
  intermitente e Drive com nova assinatura continuam pendentes. Sem convite/produção.
- Proteção de backup: temporários do restore/perfis QA sem herança EFS foram identificados
  e cifrados; dump e credenciais já protegidos, ACL privada mantida. Zero arquivos não
  vazios sem EFS na revisão final. Restore de 65 tabelas/seis objetos comprovado apenas
  neste Windows; custódia das chaves em outra máquina ainda depende do proprietário.
- Memória é só amostra release (PSS 235.756 KiB, sem CRASH/ANR retido), sem baseline
  dev/release ou prova de ausência de vazamentos. Leitura Livre grande não foi acelerada.
- Preservar QA A/Amêndoas e outbox; não tratar A como descartável. Seis arquivos privados
  anteriores e 40 livros originais mantidos. Nenhuma migration, OAuth, OWNER, cobrança
  ou produção modificada. Detalhes de hashes/caminhos/portões em PROJECT_CONTEXT.md.


### 21/10/2026 — Google Android corrigido; ajustes e homologação pendentes

- GOOGLE AUTH: causa remota confirmada no callback Google/Supabase: secret rejeitado
  com invalid_client. Proprietário, com aprovação específica, criou segunda chave
  no cliente Web existente e salvou somente o secret no Supabase, preservando anterior.
  Redmi retornou à conta original, servidor registrou login google e nova sessão,
  perfil ativo e 40 livros; sessão persiste após cold reopen. Google Android VALIDADO
  no payload 22eb657 compatível; Google Web segue pendente de allowlist/teste específico.
  Não confundir esse sucesso com autorização/indexação Google Drive.
- ff2f131: cache opcional com erro não substitui perfil remoto fresco/desativado.
  de64178: erro de exchange do provedor não é confundido com cancelamento. Regressões
  antes FAIL/depois PASS e typecheck da primeira correção PASS. Rebuild pendente;
  incidente original de primeiro perfil novo permanece com causa inconclusiva.
- REPRODUZIDO no Redmi: Ajustes empilha ícone/título/seta. Correção estática local e
  teste de navegação passam; confirmação física no novo artefato ainda pendente.
- APK privado 22eb657 instalado no AVD isolado com hash idêntico, mas a tradução
  ARM→x86_64 falha antes da UI em SoLoader/libreactnative.so. Não é PASS de runtime.
  Preparar próximo build com x86_64 nativo; não apagar o app pessoal do Redmi.
- NO-GO permanece. Evidências anteriores mantidas; novos resultados em PROJECT_CONTEXT.
  Sem migrations, RLS, OWNER, contas reais, Drive ou produção alterados nesta rodada.


### 21/10/2026 — Google Web e regressões beta.2

- Google Web REAL também validado no preview22eb657, com conta original/perfil, biblioteca,
  reload, logout e segunda entrada. Duas URLs exatas desse preview foram autorizadas e
  adicionadas; callbacks/Site URL Native preservados. Secret válido resolveu o exchange
  remoto; não enfraquecer PKCE/RLS nem confundir login com a autorização Google Drive.
- Cliente Android OAuth existente usa só certificado antigo. Nova assinatura privada
  ainda exige configuração/teste Drive autorizado em instalação isolada. OAuth está
  Externo/Testando, com três usuários de teste; nenhuma mudança de público foi feita.
- c92308f: beta.2/code3; typecheck,80/80 críticas,export e CI remoto39638828390 PASS.
  Novo preview protegido gfwlrbj7z READY com bundle conferido; fluxos autenticados nele
  e APK novo ainda pendentes. Build ARM64/ARMv7/x86_64 em execução, sem declarar sucesso.
- Cadastro sintético e e-mails autorizados; formulário preparado, senha e envio deixados
  ao proprietário. Cadastro/confirm/recovery Web não declarados PASS antes de resultado.
- Ajustes: correção7ed1339 aguardando novo APK físico. Leitura prolongada, grifo Native→Web,
  username-login, admissão/retenção e custódia fora deste Windows continuam pendentes.
  Somente C: disponível; não exportar PFX/keystore/segredos sem destino aprovado.


### 21/10/2026 — Novos bloqueios encontrados no cadastro real Web

- Conta de teste com endereço escolhido pelo proprietário foi criada e verificada;
  login por senha aceito. Link no Chrome do Redmi abriu a WEB do preview e mostrou erro
  de sessão genérico. Não foi falha da confirmação de e-mail, comprovada no servidor.
- 68d6061 diferencia ausência/incompatibilidade do verificador local de links expirados,
  orienta login por senha ou novo recovery no contexto correto; sem relaxar PKCE e sem
  afirmar confirmação baseada só em URL. SDK controlado/regressões antesFAIL/depoisPASS.
  A mensagem anterior não identifica a causa interna exata daquele callback real.
- BUG WEB REPRODUZIDO: primeira entrada confirmada sem username volta à landing como
  visitante, podendo entrar em loop de cadastro. f6cf52c encaminha perfil ativo/matching
  à conclusão existente, preservando bloqueios de conta desativada, UUID estranho, loading
  e ausência de perfil. Teste real do componente antesFAIL/depoisPASS; typecheckPASS.
  Conclusão remota do username foi deixada pendente até o preview corrigido. Incidente
  Native intermitente de19/10 permanece separado e inconclusivo.
- APK c92308f foi gerado com certificado privado/3ABIs e conferido, mas antecede essas
  correções e não deve ser entregue como artefato atualizado. Main atualf6cf52c enviada;
  matriz/export/build finais em andamento. Dados pessoais e conta QA A/outbox preservados.
- Templates atuais são padrão; não há SMTP personalizado. Site URL/template não foram
  alterados nesta análise. RecoveryWeb, grifoNative→Web, homologação prolongada, nova
  assinatura/Drive, custódia e admissão continuam pendentes. Sem GO ou convites.


### 21/10/2026 — Resultado físico beta.2 e bloqueio real de recovery

- CORRIGIDO/VALIDADO no Redmi Android16: Ajustes com ícone/título/seta alinhados, após
  atualização compatível f6cf52c beta.2/code3. Login Google original, identidade,40 livros
  e reabertura offline/sem Metro PASS; primeira instalação/dados preservados.
- Cadastro autorizado confirmado, perfil/username presentes, login e reload do preview
  f6cf52c PASS. Tela intermediária do dono não capturada; regressão de encaminhamento
  do componente real PASS. Incidente Native intermitente antigo permanece inconclusivo.
- Senha principal recusada nas duas plataformas; Native17:58:59UTC recebeu400/
  invalid_credentials com e-mail correto, antes da sessão. Conta ativa/confirmada e
  credencial presente; não atribuir a falha a perfil/Android, nem alterar senha automaticamente.
- Recovery principal extra autorizado às18:12:29UTC falhou com429/over_email_send_rate_limit.
  NÃO enviado, sem novo retry, mudança de SMTP/limites ou senha. Web recovery permanece
  BLOQUEADO até envio permitido e conclusão pessoal do proprietário.
- Por nova instrução explícita, projeto Vercel tornou-se público: somente SSO da Vercel
  desativado. Preview f6cf52c abre sem login Vercel; /admin e /library anônimos continuam
  sem acesso ao conteúdo privado. Seis callbacks exatos conferidos; Site URL preservado.
- Cliente OAuth Android do certificado beta criado sob aprovação específica; antigo e
  Web preservados. Funcionalidade Drive com nova assinatura ainda NÃO validada.
- APK privado f6cf52c gerado/conferido com bundle atualizado/3ABIs. Derivado Redmi de
  mesmo payload validado fisicamente; não confundir com execução da nova assinatura.
  AVD encerrado por orientação do dono. Typecheck,80/80 críticas,export e CI39643844900 PASS.
- Mantidos bloqueios de custódia externa, grifo Native→Web e leitura prolongada final,
  além de recuperação Web e runtime privado. Sem GO, produção, migrations ou pagamentos.


### 21/10/2026 — Homologação da landing Web cinematográfica

- SUBSTITUÍDO: sequência CSS anterior por livro sólido WebGL e morphing GPU entre estruturas distintas; um objeto principal fechado no início e no fim. Header/Auth/planos/FAQ/legal/SEO preservados.
- CORRIGIDOS durante revisão visual: oclusão do texto Reader pelo bloco de papel (folhas agora acima do bloco/abaixo da capa), proporção de flashcards, área reservada para legendas e sobreposição em landscape844×390. Contratos e capturas finais atualizados.
- 81/81 críticas, typecheck/export/marketing e Chromium72 amostras PASS. Timeout inicial do Battle sob carga concorrente preservado no log; rodada serial PASS, sem mudança do recurso. Harness corrigido para escrita momentânea do DevToolsActivePort/fechamento CDP e capitalização real dos títulos legais.
- Fallback estático validado com GPU indisponível/contexto perdido/perfil limitado/reduced motion/no-JS; sem branco, ciclo de retry ou rolagem vazia forçada. Dispose/remount, hold e reversibilidade PASS.
- DESEMPENHO: números comparativos e limites registrados no PROJECT_CONTEXT.md; rodadas em SwiftShader e D3D11 com hardware local confirmado, sem garantia universal de60FPS. Outros GPUs/mobile físico pendentes.
- Preview https://kindle-reader-odm52odxt-matheus-projects-70f48ed9.vercel.app, código82be6a46788b3bbb2d9a90aeccb4b9fd88f2b418; nenhuma produção/Auth/OAuth/conta/Supabase/Android alterada. Novo domínio de preview não recebe callbacks automaticamente. Bloqueios de beta/recovery/Drive/QA anteriores preservados.
- GPU local Intel HD520/D3D11 confirmada:240/240 frames com Canvas ativo/sem fallback nos dois tamanhos. Falso positivo de cold gap corrigido; sondas não dependem da cadência da mão do visitante. Outros dispositivos/mobile físico pendentes.


## Pesquisa de usuários — concentração (21/10/2026)

- Lacuna de UX tratada: ajustes agora expõem Concentração e Ler em foco, reutilizando a ocultação de controles existente. Nova preferência local persistida oculta porcentagem e contagem de páginas, inclusive da acessibilidade, sem remover o espaço do rodapé ou os controles de navegação.
- Compatibilidade: configuração v1 antiga mantém aparência e padrão de contagens visíveis; nenhuma preferência de fonte/margem é redefinida. Mudança não grava posição. ReaderScreen controlado conserva documento/página 51 ao entrar/sair do foco e alterar a opção.
- Validação: typecheck/export Web; 82/82 suítes críticas (antes 81); regressão específica de provider/footer; 16 pares de layouts Chromium com temas e texto ampliado. Capturas de componente sintético em .expo/research-cycle1. Não são prova de Android físico.
- Pendências: Redmi ausente no ADB nesta tarefa; falta ensaio físico de foco e reabertura em EPUB/PDF Original/Leitura Livre. Agrupamento completo de ajustes, organização coletiva, painel privado de metas e seleção/revisão de deck de grifos seguem como próximos ciclos. Geração local determinística tem implementação, mas não foi encontrada integração consumidora em src; não anunciar IA funcional.
- Nenhum problema remoto de Auth/Drive/Sync previamente aberto foi declarado resolvido. Sem APK, migrations, deploy ou dados pessoais alterados. Matriz detalhada e limites no PROJECT_CONTEXT.md.
