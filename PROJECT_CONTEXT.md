# Aldus Reader — Contexto do Projeto

Atualizado em 16/10/2026. Fonte única de contexto permanente para IA.
Problemas ativos: [BUGS_ATUAIS.md](BUGS_ATUAIS.md). Código: HEAD atual da branch,
identificado pelo Git e pelo build-info.json do export, sem hash autorreferente inventado.
Branch oficial de desenvolvimento: main, por decisão do usuário em 15/10/2026.
Todas as próximas implementações devem partir da main, com commits e push para
origin/main, salvo instrução explícita em contrário. A integração da Etapa 2 foi
consolidada por fast-forward de 9cb5a968f0e5de9af0185e70a1e4fe3a8eba3e8f para
9b3c6198e2f89430c8b50f8e7f49349f853c2f01, preservando os quatro commits
502abc6, 34c589e, 5474b9c e 9b3c619. A homologação posterior parte de
c3c14689ee2a7aea8e3a1dd177c94ed3e1957c2b; o HEAD atual é obtido pelo Git.

Histórico da consolidação anterior (Etapa 1): após fetch, main/origin/main estavam em
52456d9740a6234db94508b3a3ed48ba3012d060,
ancestral de integration/comunidade-literaria em e8a2940089fd248ca4e9b917d16edd3213d45bc0.
Consolidação por fast-forward preservou todos os 34 commits adicionais, incluindo Community,
correções do caderno, Auth/segurança, Library Sync, Drive, Flashcards/Battle, EPUB/PDF Reflow,
SaaS Etapa 1 e migrations incrementais. Os commits SaaS 7bc7487, 0930ec3 e e8a2940 são
ancestrais da main. A branch antiga permanece preservada; BUGS_ATUAIS.md não foi alterado.
APK release consolidado: pendente. Homologação debug autorizada em 16/10/2026;
protocolo permanente e resultados Android estão na seção 15.

## 1. Visão geral

Aldus Reader é um aplicativo de biblioteca, leitura EPUB/PDF e estudo, com importação local,
catálogos pessoais/remotos, organização por conta e sincronização privada preparada.
Stack atual: TypeScript, Expo ~57.0.25, React Native 0.86.3, React 19.2.3,
Expo Router ~57.0.23 e Zustand. Android e Web têm implementações próprias; não presumir
paridade iOS de Drive, OCR, PDF ou sensores. O app exige sessão e perfil ativo para suas
rotas privadas; leitura offline preserva a identidade previamente validada, sem criar login.

Missão integrada: atualizações compatíveis somente no lockfile de transitivas shell-quote
1.10.0→1.12.0, undici 7.29.0→7.30.1, source-map-js 1.2.1→1.2.2 e brace-expansion
2.1.4→2.1.7. Não mudou Expo/RN nem houve audit fix --force. Auditoria npm de 15/10 13:17 BRT:
0 críticos, 58 altos, 12 moderados (70 registros incluindo propagação; não 70 causas únicas).
Restam causas em braces, decode-uri-component, node-forge, postcss-selector-parser e uuid.
Parte exige mudança incompatível/sem patch atual; não fazer downgrade Expo sugerido pelo npm.
O número é snapshot do serviço de advisories, não certificação de ausência de vulnerabilidade.

## 2. Arquitetura

- app/: rotas, tabs, providers e grupos protegidos do Expo Router.
- src/domain/: entidades, contratos de repositórios, casos de uso, âncoras e regras puras.
- src/data/: SQLite/IndexedDB, importadores, EPUB, PDFs derivados, Sources, Drive e Sync.
- src/presentation/: ReaderScreen, adapters, componentes, hooks, contextos e stores.
- src/community/: domínio, aplicação, dados, adapters e apresentação isolados da Community.
- src/admin/: contratos, adapter e apresentação do Aldus Admin; autorização efetiva por RPC.
- modules/: módulos Expo locais aldus-drive-auth e aldus-pdf-ocr.
- supabase/: migrations imutáveis, Edge Functions, inventários read-only, scripts admin e testes.
- Composição: src/presentation/services/dependencies.ts. Reutilizar seus repositories e serviços.
- Native: SQLite kindle-reader.db, schema local v5, arquivos controlados e AsyncStorage.
  Web: IndexedDB kindle-reader-web v6, Blob e transações confirmadas em oncomplete.
  Bancos/chaves kindle-* e @kindle/* são compatibilidade persistida, não branding público.

## 3. Reader

ReaderScreen abre pelo OpenBookUseCase; DocumentReaderAdapter escolhe EPUB, PDF Original
ou PDF Reflow. EPUB usa EpubPageViewer.web/native e o documento combinado
EpubReaderDocument, em iframe sandboxed na Web e WebView no Native. O HTML é memoizado
pela lista de capítulos; configurações tipográficas chegam por mensagem, sem recriar o viewer.

PDF Original usa o arquivo fonte e página/zoom próprios. Reflow é derivado separado,
criado somente por escolha, com extração por plataforma, builder, assinatura do arquivo,
versão de processador e cache validado. Falha/extração ilegível/OCR insuficiente volta ao
Original. Não confundir página fonte do PDF com paginação dinâmica do Reflow.

Restauração retém intenção persistida até layoutReady e ACK do destino; mensagens
provisórias não salvam posição. O documento vivo passa a conduzir navegação após ACK.
Original/Reflow mantêm posições independentes. Gravação confirmada é direta, sem debounce
que descarte o último avanço ao sair; updates funcionais preservam as configurações atuais.
Barra distingue preview de commit; origem/operação descartam mensagens ultrapassadas.
Página 1 legítima não pode ser bloqueada por filtro global. Largura de coluna é fracionária,
medida por getBoundingClientRect, e totais usam fragmentos reais para evitar coluna fantasma.

Controles são overlays estáveis: visibilidade muda opacidade/interatividade, sem trocar
ancestralidade, key ou viewport documental. Insets de Safe Area são aplicados uma vez;
wrappers absolutos têm limites completos. No Native, controles usam View/opacidade literal
no caminho já validado, conservando a animação Web. Helpers enviados a WebView são código
literal portátil: Function.toString de Hermes não é fonte JavaScript.

AppThemeContext e ReaderSettingsContext são separados. Temas do livro incluem Papel,
sépia/claros/escuros; e-reader é atalho de aparência, não emulação de hardware e-ink.
Brilho Web é luminosidade da página; Native aplica/restaura brilho da sessão e respeita
AppState/cleanup. Tema/fonte/brilho não comandam restauração nem remontam documento.

Preparação Reflow permanece cancelável até confirmar cache e preparar HTML. Plano OCR,
qualidade, builder, conversão de blocos/HTML e serialização SQLite cooperam em fatias de
CPU; Native usa idle com prazo e não setImmediate/microtasks. O cache usa record.id como
bookId no guard de conta, transação exclusiva SQLite e oncomplete IndexedDB, sem sucesso
em memória. Cancelar durante gravação faz rollback antes do commit; cache confirmado
anterior não é apagado. Retorno antigo não publica após Back/troca de modo/livro/unmount.
Leitura geométrica e WebView/base64 da extração são liberados antes da fase final.
Assinatura do cache é SHA-256 do conteúdo, inclusive antes do primeiro upload atribuir
fileHash ao livro. Quando ausente, localFingerprint reutiliza o driver/hash em blocos,
somente leitura, com conta/abort; não grava metadata nem altera fila. Primeira sincronização
não invalida o mesmo derivado. Budget de CPU usa relógio monotônico, não relógio civil.
JSON.parse do cache, clone IndexedDB, flatten final e primeiro layout continuam tendo
custo proporcional ao documento; não prometer suporte ilimitado ou validação Android.

EPUB possui marcadores/notas, grifos/cores/comentários, seleção e export/import por livro.
Âncoras exact/relocated permitem retorno; ambiguous/missing exigem aviso e nunca navegação
silenciosa. Importação de estudo é transacional/idempotente. PDF Original tem marcador
por página; seleção/grifos mapeados entre PDF e Reflow ainda não equivalem ao suporte EPUB.

Motion cues é experimental/manual, desligado por padrão. DeviceMotion Android, preferência
reader.motionCues.enabled, processamento em memória e overlay pointerEvents=none acima do
Reflow. Hidratação/foco/foreground/permissão controlam sessão e cleanup; não simular sensor
indisponível. Amostras não mudam documento/progresso. Eficácia anti-enjoo não foi demonstrada.

## 4. Importação

Biblioteca → DocumentPicker → LocalBookImportService → EpubFileImporter/PdfFileImporter →
repositories existentes → Biblioteca/Reader. DownloadManager reutiliza esse pipeline.
Fases: selecting/preparing/copying/reading/validating/reading_metadata/persisting/finalizing →
success, error ou cancelled. Remoto acrescenta downloading e terminais equivalentes.
operationId, geração e AbortSignal impedem callbacks antigos e retry depois de cancelar.

Native copia content:// ou file:// para books/temp e move para books/imported com nome
único. Nunca persiste URI temporária como arquivo definitivo nem apaga a origem do usuário.
Web mantém Blob persistente. Falha/cancel limpa temporário/destino próprio, inclusive escrita
nativa tardia; falha de capítulos compensa livro anterior ou oculta o novo incompleto.
Persistência/finalização são deliberadamente não canceláveis. importComplete só é publicado
depois do conteúdo durável. Importar deliberadamente de novo gera outro UUID, sem merge por título.

EPUB valida ZIP/mimetype/container/OPF; preserva metadata, manifest, spine, CSS, fontes,
imagens/SVG/srcset e links internos, com sanitização do HTML. Cache de CSS e resource→data URI
pertence a um único parse. Capítulos/recursos são processados com concorrência limitada e
yield cooperativo; cancelamento chega ao validador e às leituras ZIP. A API de ZIP corrente
pode terminar seu trabalho interno, mas não inicia etapas posteriores após abort.

O Reader já combina os capítulos em um documento: regras @font-face idênticas são
persistidas apenas na última posição original, preservando ordem e condições CSS.
Não descartar CSS/fontes nem remover recursos para reduzir memória. Fixture de 91 capítulos:
127.262.661 → 1.422.501 bytes de HTML, fontes 182→2 leituras, CSS 91→1, concorrência 182→1.
Amêndoas real e Android continuam pendentes; a fixture não é o arquivo pessoal.
PDF valida assinatura %PDF e usa o fluxo existente; importação não processa Reflow/OCR.
Percentual existe somente com total de bytes conhecido; demais etapas são indeterminadas.
Native EPUB lê Uint8Array pela API assíncrona File.bytes do Expo instalado, sem intermediários
Base64/atob/Uint8Array.from na thread JS. A leitura nativa em curso não é interrompível;
abort impede iniciar parse/publicação de seu retorno tardio. O ZIP e o documento completos
ainda precisam caber em memória; isto não demonstra capacidade ilimitada ou Amêndoas físico.

## 5. Biblioteca

Books e organização permanecem separados. Organização por livro: título/autor/capa,
favorito, coleções, tags, série/volume e unread/reading/completed/interrupted; editar estado
não altera posição nem arquivo. Chave/formatos legados são preservados por compatibilidade.
Cards mostram capa, título, autor, formato e status/progresso; menu de reticências de 44px
conserva as duas remoções com confirmação. Organizar mantém as edições existentes.
Não repetir o título inteiro em outro botão nem reservar o espaço do controle removido.

Remover deste dispositivo exige cópia privada remota confirmada/verificada e mantém a conta.
Remover da biblioteca escreve tombstone, inclusive offline; cleanup remoto só após confirmação.
Bundled e transferências têm guardas próprias; nenhum atalho de UI pode contorná-las.

Portabilidade opcional: Ajustes → Privacidade e Dados → Exportar meus dados.
Exporta somente organização, sem EPUB/PDF, progresso, notas ou configurações; não é backup
completo nem requisito de troca de aparelho. Importação JSON opcional mantém políticas
keep-local/use-imported e exige IDs de livros disponíveis na conta atual. A rota legal é
pública, mas a ação exige perfil ativo do mesmo usuário e esconde resposta antiga de outra conta.

## 6. Library Sync

Modelo oficial: entrar, ler/organizar e sincronizar automaticamente; outro dispositivo recebe
dados da mesma conta. Implementação local funciona antes do backend. AccountBookRepository,
AccountOrganizationRepository e LibraryAccountScope validam ownership/epoch em reads e writes.
Logout revoga acesso imediatamente, preserva bytes para relogin e não atribui legado sem dono.
Adoção de livros antigos é explícita; bundled usa identidade verificada e não é enviado.

LibrarySyncService + LibrarySyncCoordinator + replica/journal implementam outbox durável
dirty/ready, operation UUID, baseRevision/shadow, replay de escrita interrompida, CAS,
recibo idempotente e tombstone permanente. Pull inicial aprende exclusões antes do push;
conflito preserva intenção local e pede escolha explícita. Progresso maior/relógio local
não vence automaticamente. Tombstone do pai impede ressuscitar filhos offline.

Importação local completa precede publicação de metadata, upload privado e publicação de
remotePath. Outro dispositivo recebe CLOUD_ONLY, sem baixar EPUB/PDF até abrir.
Download em staging valida tamanho/SHA-256/formato e promove antes de expor ponteiro.
JWT é congelado por operação e respostas antigas são descartadas. Remoção local verifica
remoto; eviction e cleanup são recuperáveis. Falhas nunca apagam outbox para zerar contador.

Sync inclui livros, progresso/âncoras, marcadores/notas, grifos/comentários, organização e
modo/posições PDF separados. Sources/tokens/catálogos, capítulos, capas, OCR/cache, aparência
e Flashcards locais não são enviados por esse engine. Gatilhos: perfil ativo, import/edição,
foreground, retorno de rede e ação manual; sem polling agressivo.

Contrato preparado: public.user_library_items, user_library_operations, sequência de revisões
e RPC library_apply. Bucket aldus-private-library privado; caminho owner/book/SHA256.ext,
EPUB/PDF, teto cliente 512 MiB sujeito ao plano. Sem URL pública/upsert; RLS own SELECT,
escrita via RPC e fences de Storage. Funções SECURITY DEFINER usam search_path vazio e auth.uid.
Migrations 202610110001 e 202610110002 são históricas e não devem ser editadas/reaplicadas por hipótese.

Hardening incremental NOVO 20261015160539_library_active_account_fences.sql, validado
somente em PGlite: move a implementação CAS intacta para library_private (sem acesso cliente),
mantém assinatura pública num wrapper com perfil ativo e adiciona fences restritivas em
SELECT e Storage. Dados/recibos preservados; não aplicado remotamente. Inventariar definições
e schema livre antes do deploy. Grant anon do helper de fence não é vazamento por si só.

Evolução remota em 15/10: a sonda inicial de 10:58 BRT retornava HTTP404/PGRST205.
Na missão integrada, às 12:58 BRT, items/operations passaram a HTTP401/42501 ao anônimo.
O usuário informou aplicação remota 20261015145012=private_account_library e
20261015145018=private_library_file_recovery, equivalentes aos arquivos locais 202610110001/002;
bucket privado e sete policies já existentes. NÃO reaplicar nem reparar ledger por hipótese.
O inventário administrativo e sessões reais A/B continuam pendentes; a sonda pública não os substitui.
Nenhuma migration/DDL ou SQL administrativo remoto foi aplicado pelo agente; outbox preservada.
Sonda anônima real às13:23 BRT negou flashcard_battle/get e library_apply nulo (401/42501),
e library_object_allowed retornou200/false para path sintético. Não enviou conteúdo pessoal
ou operação válida; não é teste autenticado A/B nem aplicação de SQL/migration de produção.
Executar node scripts/audit-private-rpc-anon.cjs para repetir esse contrato público.
Sonda: node scripts/audit-library-sync-public.cjs, somente GET/limit=0 e chave pública.
Procedimento humano: [LIBRARY_SYNC_DEPLOYMENT.md](LIBRARY_SYNC_DEPLOYMENT.md), inventários
supabase/audit/01_inventory.sql e 02_library_sync_inventory.sql para comparar ledger,
definições/ACL/RLS e bucket já implantados. Considerar somente o hardening incremental
20261015160539 após esse inventário; nunca reaplicar 001/002 ou reparar versões por hipótese.

Reconferência pública de 15/10: tabelas às 15:17 BRT e RPCs às 15:28 BRT;
items/operations HTTP401/42501, sem PGRST205;
flashcard_battle/get e library_apply nulo HTTP401/42501, helper de Storage HTTP200/false.
Bucket retornou HTTP400/NoSuchBucket ao anônimo: isso não contradiz o bucket privado
informado nem comprova existência/ausência administrativa. Níveis atuais: IMPLEMENTADO
LOCALMENTE e VALIDADO ANÔNIMO; APLICADO REMOTAMENTE segundo o operador para 001/002.
VALIDADO AUTENTICADO, A/B, CONTA DESATIVADA, STORAGE real e ANDROID continuam pendentes.
O hardening incremental só tem prova local; não houve aplicação remota nesta reconciliação.

Limites: snapshot/outbox JSON por conta e full pull até 100×500 entidades; upload padrão,
sem TUS/resume persistente; parsers/Blob ainda podem usar memória proporcional ao livro.
Evicção verifica arquivo remoto inteiro e consome banda. Não há E2E, compartilhamento público
ou expurgo completo de tombstones/recibos/caches; exclusão de conta ainda é operacional.

Cancelamento/foreground do Sync: engine.cancel limpa running imediatamente sem apagar
outbox. Coordinator usa lifecycle próprio além do epoch de conta: stop invalida preparação
pendente, impede fases de rede posteriores e restart da mesma conta cria execução nova.
Retorno/finally antigo não sobrescreve o estado novo. test-library-cancellation.cjs reproduz
o baseline em --baseline e cobre cancelamento/stop/retomada sem alterar a fila.
O adapter REST propaga cancelamento também ao aguardar sessão SDK, fetch e corpo JSON:
uma Promise externa que não observa AbortSignal não mantém o chamador pendente nem inicia
rede depois do cancelamento. Prazo de I/O encerra a chamada sem tocar na outbox.
Erros distinguem contrato ausente, sessão, autorização/42501 e rede; não recomendar novo
login como solução automática para RLS/ACL negada. test-library-remote cobre essas fronteiras.

### 6.1. SaaS freemium — Etapa 1 (15/10/2026)

IMPLEMENTADO LOCALMENTE / IMPLANTAÇÃO REMOTA PENDENTE. Catálogo autoritativo em
public.saas_plans + saas_plan_features; assinatura em saas_account_subscriptions;
concessões específicas futuras em saas_account_entitlements. Papel master/overrides
anteriores não são assinatura e não promovem para Pro. Nenhum pagamento/provedor/add-on.

| Plano | Preço BRL | Livros sincronizados | Armazenamento privado |
| --- | --- | --- | --- |
| Free | R$ 0 | 100 | 500 MiB (524288000 bytes) |
| Pro | Não definido (`null`) | 2.000 | 10 GiB (10737418240 bytes) |

Valores iniciais configuráveis somente no backend. Todos os planos têm leitor completo,
importação, estudo básico, Sync de biblioteca/progresso/estudo/organização e EPUB/PDF privado.
O baseline não pode ser removido por configuração premium. Recursos novos usam chaves
extensíveis; novos planos usam IDs de catálogo, sem enum Free/Pro no cliente. Futuros
add-ons devem acrescentar concessões/limites no resolvedor do servidor, com nova migration
e versão de contrato quando necessário; não criar compra, saldo ou add-on no cache local.

Migration NOVA: 20261015190705_saas_plans_entitlements.sql, criada pela CLI. Depende de
profiles, Library/recuperação e 20261015160539_library_active_account_fences.sql.
Não editar/reaplicar 202610110001/002 nem reparar ledger remoto por hipótese. Antes de
implantar: inventariar definições/ACL/RLS e a versão real do Storage; reconciliar versões
20261015145012/018 informadas pelo operador; aplicar somente incrementais ausentes na ordem.
Nenhum DDL/migration/Edge Function/deploy remoto foi executado nesta etapa.

Free é atribuído pelo trigger de profiles a novos perfis ativos e na reativação; backfill
aditivo cobre ativos existentes sem tocar em perfis, livros, arquivos, recibos ou estudo.
Desativados não recebem concessão nova nem leem o snapshot. Clientes têm somente SELECT
próprio com RLS e RPC de consulta sem argumento de usuário. Somente service_role/backend
confiável altera catálogo/assinatura/entitlements; segredo nunca entra no bundle. JSON,
AsyncStorage, metadata de usuário/JWT e papel master não concedem plano. Assinatura
active/trialing vigente resolve plano concedido; expirada/revogada/futura volta ao Free.

RPC saas_account_snapshot retorna versão, conta, fonte server_database, plano efetivo,
preço nullable, limites, uso, restante, features e estado/origem/prazos da assinatura.
Uso deriva de livros remotos vivos e metadata.size do Storage, incluindo objetos ainda
não limpos após tombstone/staging. Não deriva de fileSize declarado no JSON do livro.
Tamanho legado desconhecido retorna `null` para uso/restante de bytes e impede apenas
crescimento de Storage até reconciliação confiável; nunca inventar zero nem apagar objeto.

Quota de livros usa trigger AFTER para respeitar UPSERT/CAS existente; serializa crescimento
por lock do perfil. Quota de bytes usa constraint trigger DEFERRABLE INITIALLY DEFERRED:
a sonda INSERT de permissão do Storage é revertida antes do tamanho definitivo; somente
completion durável confirma bytes, com lock por conta e sem confiar em contentLength.
Testes locais cobrem probe/savepoint/rollback e completion, inclusive aumento por UPDATE.
Requer READ COMMITTED como no Data API. Storage HTTP e disputa real entre dispositivos
continuam pendentes; não inferir da simulação PostgreSQL que upload de produção foi validado.

Compatibilidade: dados acima da franquia permanecem legíveis; atualizar livros existentes,
progresso/estudo/organização e excluir continua permitido. Limita apenas novos livros
remotos e crescimento de bytes. Leitura/importação local não consulta plano e mantém os
guards Auth existentes. Falha de quota preserva outbox e permite retry da mesma intenção.
Não há migração do schema local, Reader refatorado nem engine Sync substituído.

Contrato tipado: src/domain/saas/accountPlan.ts. Consumo comum Web/Android:
src/data/saas/SupabaseAccountPlanRepository.ts, exposto por accountPlanRepository na
composição existente. Congela JWT por chamada, valida owner/epoch A→B→A, contrato e
restante; cancelamento e prazo cobrem sessão/fetch/corpo. Sem backend/contrato válido,
retorna source=unavailable/snapshot=null; não inventa Pro, Free ou franquias. Resolução
cliente é indicativa para UI; futuras operações premium devem repetir autorização no
backend. Não há cache persistido de entitlements nem UI de compra nesta etapa.

VALIDADO LOCALMENTE: npm run test:saas (PostgreSQL/PGlite real para migration/RLS,
transporte controlado Web/Android e outbox SQLite/OpenBook), typecheck e export:web.
Matriz crítica anterior passou 56/56 incluindo as duas suítes SaaS iniciais; suíte adicional
de compatibilidade também passou e integra test:critical. Não é prova de Auth/Storage HTTP,
concorrência de duas sessões PostgreSQL, navegador real desta etapa ou aparelho Android.
Próximo passo operacional: implantação explicitamente autorizada após inventário, seguida
de testes autenticados A/B/desativada, upload/download e limites concorrentes. Etapa 2
não iniciada. Nenhum APK, cobrança ou mudança em main.

### 6.2. Aldus Admin — Etapa 1.5 (15/10/2026)

IMPLEMENTADO LOCALMENTE / ATIVAÇÃO REMOTA PENDENTE. Área /admin no Expo Router, com
entrada em Ajustes somente após aldus_admin_session confirmar a associação no servidor.
Layout Web usa largura responsiva própria; o frame e os fluxos do Reader permanecem.
Dez seções: Visão Geral, Usuários, Assinaturas, Planos e Preços, Armazenamento, Métricas,
Configurações, Administradores, Auditoria e Saúde do Sistema. Há loading, vazio, erro,
acesso negado e backend indisponível. Nenhuma concessão administrativa por cache offline.

Migration NOVA 20261015194604_aldus_admin.sql depende de profiles, Library/recuperação,
hardening de conta ativa e SaaS Etapa 1. Não modifica migrations históricas nem recria
catálogo/assinaturas. Cria aldus_admin_members, aldus_admin_audit, aldus_plan_proposals,
aldus_price_history, aldus_system_settings e aldus_setting_history, com RLS e sem acesso
direto de clientes. Schema aldus_admin_private guarda helpers, revisões e recibos.
saas_plans recebe descrição comercial e preço anual nullable; assinaturas não são
reescritas por alteração de preço. Histórico comercial imutável registra vigência imediata;
preço cobrado permanece indisponível. Agendamento automático de preço futuro não existe.

OWNER administra associações, catálogo, configurações e operações delegáveis. ADMIN recebe
somente users.read/users.write/subscriptions.manage/metrics.read/audit.read concedidos pelo
OWNER. ADMIN não gerencia outros administradores nem amplia as próprias permissões;
operações sobre a própria associação são negadas. master/Free/Pro não concedem administração.
O conjunto de permissões permite futura evolução de funções Suporte/Financeiro, sem criá-las.

Backend: aldus_admin_session, aldus_admin_read e aldus_admin_change; comandos são allowlist
tipada, não editor SQL/JSON genérico. Cada chamada valida auth.uid, sessão Auth ainda
existente/não expirada, e-mail confirmado, perfil ativo e associação/permissão atuais.
Alterações exigem JWT aal2 validado pelo gateway, sessão aal2 ligada a fator TOTP ainda
verificado e AMR TOTP assinado há no máximo 10 minutos. Sem essas provas, bloqueia.
Frontend tem enrollment/challenge TOTP pelo SDK existente; o segredo do próprio enrollment
fica apenas no estado transitório. MFA real do projeto ainda precisa de validação remota.

Todas as alterações exigem motivo e confirmação textual do recurso no modal e no servidor.
Revisão esperada impede lost update; lock transacional serializa mudanças/último OWNER.
UUID de requisição + recibo evita duplicação após resposta perdida; retry revalida permissões.
Casos negados retornam erro sanitizado sem rethrow para preservar a auditoria fora do
sub-bloco revertido. Auditoria registra ator/recurso/ação/horário/resultado/motivo e mudanças
mínimas, sem payloads de livros, tokens ou e-mails desnecessários. Triggers impedem UPDATE/
DELETE de auditoria e históricos de preços/configuração. Administradores não têm acesso
direto à biblioteca privada de outra conta, arquivos, caminhos, notas ou impersonação.

Triggers em associação/perfil protegem o último OWNER ativo inclusive em escrita confiável.
O painel exige tratar associação administrativa separadamente antes de desativar uma conta
administrativa. Nenhuma exclusão definitiva foi implementada. Mudanças de plano/revogação
de benefício não apagam dados nem removem Sync/Storage básico do Free.
Desativar não apaga arquivos nem revoga leitura offline já autorizada pelo cache existente;
o controle administrativo e os contratos remotos de conta ativa não usam esse cache.

Bootstrap preparado: supabase/admin/bootstrap_aldus_owner.sql. Somente conexão confiável
ao banco, depois de autorização explícita, configura aldus.bootstrap_owner_uuid com UUID
real independentemente conferido em Auth. O helper privado exige que esse UUID corresponda
ao e-mail indicado pelo proprietário, confirmado, com perfil ativo, e que bootstrap ainda
não tenha ocorrido. Ausência/mismatch/e-mail não confirmado interrompe sem criar conta.
Não executado em produção; existência/UUID/verificação da conta indicada NÃO foram consultados.
O e-mail não participa de autorização no cliente. O contato legal público já existente
pode coincidir com ele e permanece somente contato, sem privilégio.

Usuários: paginação de 25, busca por nome/username/e-mail/UUID, filtro plano/status/cadastro,
detalhes mínimos de conta, permissões efetivas, assinatura separada, uso/franquias e
recibos Sync. Conta ativa pode receber Pro manual com expiração obrigatória, revogação e
entitlements premium_ temporários. OWNER altera associação/role/permissões de outras contas
verificadas e cria propostas de planos sem ativá-las. Interface não executa compras.

Métricas reais são consultas ao backend: cadastrados/novos por período, últimos logins
(não usuários ativos), Free/Pro efetivos, assinaturas vigentes/expiradas, registros de Pro
manual, livros remotos vivos, objetos/bytes, média por conta, recibos Sync e cadastros/dia.
Tamanhos desconhecidos resultam em bytes/média indisponíveis, nunca zero inventado.
MRR/ARR/receita/cancelamentos/churn/transações/eventos/reembolsos ficam null com
“Aguardando integração de pagamentos”. Concessão Pro manual não é venda. Conversão histórica
Free→Pro, usuários ativos e falhas Auth/Sync/processamento não têm medição e ficam null.
Saúde comprova apenas a consulta ao banco e o horário; logs externos/Drive/Storage HTTP/
deploys ficam indisponíveis até conectores/telemetria sanitizada e sondas autorizadas.

Configuração allowlist: app.notice é aplicado em runtime em Ajustes; app.public_name,
app.institutional_url, app.policy_notice, operation.maintenance_notice,
operation.supported_version e flags opcionais Community/Battle/premium/experimental são
armazenadas/versionadas, mas marcadas requires_deploy=true (sem alterar automaticamente
esses recursos nesta etapa). Interface permite restaurar revisão histórica criando nova
revisão. Franquias/preços/entitlements do catálogo são efetivos no backend imediatamente.
Nenhuma chave genérica pode alterar Auth, RLS, Storage, secrets ou direitos básicos Free.

Inventário SOMENTE LEITURA pelos plugins em 15/10: Supabase projeto cmivracxuihtmsbmtuec
ACTIVE_HEALTHY; ledger lista apenas 20261015144958 flashcard_battles,
20261015145012 private_account_library e 20261015145018 private_library_file_recovery.
Não comprova ausência de objetos de Auth fora do ledger. Hardening/SaaS/Admin não aparecem
nesse inventário. Vercel: pesquisa por projeto aldus na conta conectada retornou vazio;
não inferir ausência global de deployment ou monitoramento pronto. GitHub conectado
confirmou acesso ao repositório. Nenhum SQL administrativo remoto, DDL, conta real,
bootstrap, migration ou deploy foi executado pelo agente.

VALIDADO LOCALMENTE: typecheck/export Web, test:admin (PostgreSQL/PGlite real, contratos e
transporte controlado) e matriz crítica 59/59 incluindo Auth/SaaS/segurança/Reader/Library/
Community/Flashcards. test:admin:web usa app exportado → HTTP local → migrations PostgreSQL
reais; exercita OWNER/ADMIN/comum, rota direta, revogação de sessão, offline, concessão Pro,
preços/configuração com confirmação/auditoria e aviso em Ajustes. Capturas desktop/mobile
em .expo/admin-validation foram inspecionadas. Auth/JWT/TOTP dessas provas são fixtures,
não identidades reais; Promise.all/CAS local não prova disputa entre sessões PostgreSQL.

Ativação pendente: autorização explícita, inventário completo de objetos/ACL/RLS/Storage/
schemas Auth e mapeamento do ledger; aplicar somente incrementais ausentes na ordem; verificar
UUID/e-mail confirmado do proprietário e executar bootstrap confiável; habilitar e testar
TOTP real, HTTP A/B/revogação/último OWNER, ações concorrentes e auditoria. Não reaplicar
migrations históricas por hipótese. Atualização Android requer nova compilação/instalação
do app para incluir a rota/componentes; nenhum APK nem validação física nesta etapa.
Sem cobrança, provedor escolhido, gateway, SaaS Etapa 2 ou novo recurso de Reader.

## 7. Sources

Source Library é catálogo da fonte, separado da biblioteca pessoal. Configuração local e
snapshot metadata persistem em SQLite/IndexedDB; vínculos sourceId+remoteBookId→bookId
sobrevivem ao reload. Remover fonte elimina configuração/snapshot/vínculos, preservando
livros importados e seus dados. Não vincular importação antiga por coincidência de título.

Catálogo completo: Drive EPUB/PDF e JSON V1 estático EPUB, array ou books[], sem paginação
oculta. Gutendex/Gutenberg/OPDS/HTML parametrizado são pesquisa/aquisição, sem simular estante
completa. Resposta inválida não vira catálogo vazio. APIs não passam por robots de scraping;
HTML respeita a política da fonte. Project Gutenberg usa OPDS/aquisição explícita e contato
EXPO_PUBLIC_CATALOG_CONTACT. BibliON/MEC são serviços WebView independentes.

Snapshots schemaVersion2 guardam rootFolderId/folders+books atomicamente, com rollback,
identidade de fonte e gerações. Busca fuzzy local compartilha catalogRanking, tokens Unicode,
diacríticos, prefixos e uma edição/transposição conservadora; índice preparado por snapshot.
Grade/lista virtualizadas, breadcrumbs e busca source-wide mostram caminho e ações.
Listar/pesquisar nunca baixa EPUB/PDF nem envia uma chamada Drive por tecla.
CORS da aquisição difere de CORS da busca; não usar proxy/no-cors para fingir suporte.

## 8. Google Drive

Login Google Supabase autentica o Aldus; autorização Drive é outro contrato.
Android: módulo aldus-drive-auth, AuthorizationClient/PendingIntent/ActivityResult, package
e certificado corretos. Web: GIS token model, Client ID público e gesto de usuário.
Scope apenas https://www.googleapis.com/auth/drive.readonly; sem secret nem provider token
Supabase reaproveitado. Grants ficam em memória, expiram e pedem reconexão; cache SDK e
revogação best effort não garantem seletor de outra conta.

GoogleDriveService valida raiz por metadata e faz BFS paginada de pastas/subpastas/atalhos
de pasta alcançados, IDs reais, resource keys, Shared Drive e proteção de ciclos/aliases.
Não lista todo o Drive nem exige que a conta seja dona da pasta compartilhada.
Destinos externos só por atalho encontrado e permissão existente. Atalhos para arquivos e
exportar Google Docs ainda não são suportados; não anunciá-los como implementados.
ROOT real de referência: 1PwrGP2UiCNGhyhvhDUpszZZwFjfkjaw4.

Refresh publica árvore completa ou conserva snapshot anterior; erro de ramo não é sucesso
parcial. O crawl continua serial e pode levar tempo; não foi substituído por outro crawler.
Cancelamento do modal/store chega ao catálogo, leitura/lookup e rede. Fonte removida/alterada
termina em erro. Escrita nativa iniciada permanece na fila até terminar, mas não publica
resultado cancelado nem ultrapassa a geração nova. O modal oferece Cancelar indexação e
mostra o erro do catálogo em vez de inferir sucesso pelo grant.

Usuário relata login Google funcionando; a causa exata da tentativa física de indexação
continua sem trace. Não reabrir OAuth sem evidência nova. [GOOGLE_AUTH_DRIVE_DEPLOYMENT.md](GOOGLE_AUTH_DRIVE_DEPLOYMENT.md)
é roteiro operacional de configuração/teste, não checkpoint do estado atual.
Página pública de pasta não comprova files.list autenticado nem importação no Aldus.

Missão integrada: mudança síncrona do LibraryAccountScope limpa todos os grants e índices
Drive em memória, incluindo consentimentos pendentes; retorno antigo não pode autorizar B.
Snapshots/configuração Sources continuam DEVICE-scoped, não são promessa de isolamento
persistido por conta; não atribuir automaticamente os legados a uma identidade.

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

## 10. OCR

Android: aldus-pdf-ocr, PdfRenderer e ML Kit Text Recognition v2 latino empacotado 16.0.1.
Reconhecimento é local, página a página, com bitmap limitado e geometria no sistema PDF.
PDF híbrido reconhece somente páginas necessárias; usuário escolhe Reconhecer texto ou
continuar no Original. Web declara indisponibilidade; não simula OCR.

Estados: TEXT_VALID, OCR_REQUIRED, OCR_PROCESSING, OCR_VALID, OCR_INSUFFICIENT,
PROCESSING_ERROR. Cache/processador v12 valida proveniência text-extraction/ocr/hybrid,
engine/versão, páginas e qualidade; rejeita cache antigo/parcial/inconsistente.
Abort impede novas páginas/publicação; tarefa ML Kit corrente não expõe cancelamento e
seu retorno é descartado/liberado. Não inventar texto nem promover extração ilegível.
Temporários OCR têm nome único por operação. Escrita Native não interrompível que termina
após unmount/abort remove o próprio arquivo; escrita parcial com erro também tenta limpeza.
Não reutilizar o nome de outra operação nem apagar PDF de origem. Data URI exige staging,
não é um caminho de arquivo local para PdfRenderer.

Sociedade/Manifesto têm extração textual inválida conhecida; Original continua disponível.
Gates controlados/compilação não demonstram OCR visual físico. Conteúdo/reconhecimento não
é enviado para OCR remoto; o SDK pode comunicar métricas técnicas/compatibilidade.
Revisão dos transitivos nativos/Data safety e validação no Android continuam necessárias.

## 11. Community

Community v0.1 preservada em src/community/ e app/community/, entrada em Ajustes.
Modelos: LiteraryProfile, ReadingStats, ReadingActivity, LiteraryLevel, Achievement,
Progression e contratos Follow, BookClub, DiscussionThread, CommunityPost/Comment/spoilers.
Home/perfil/editor/meta/timeline/prévia de privacidade e foundations de clubes/fóruns/pessoas
existem. Empty states não representam rede social publicada; não iniciar Etapa 2 implicitamente.

LocalCommunityRepository: chave @aldus/community.v1:<userId codificado>, revisão,
serialização v1, filas por storage/conta, corrupção/falha preservando dados. Web exige
Web Locks para escrita entre abas; Native usa AsyncStorage/fila. Provider esconde resultado
de outra identidade e usa Auth apenas na borda; domínio/application não dependem de Supabase.

LegacyReadingDataSource é somente leitura e continua declarando scope=device/userId=null,
com inclusão opt-in por conta e desligada por padrão. Repository da Library ser account-scoped
não autoriza inventar histórico medido. Ausente é null, não zero; última página não é páginas
lidas e última abertura não é sessão. Interrompido não significa abandonado. Sem data real,
occurredAt=null. Não inferir gêneros/tempo/streak/conclusões anuais.

Progressão interna: início 10, conclusão 100, dia medido 5; chaves semânticas impedem pontos
duplicados em refresh/toggle. Releitura exige identidade confiável do evento, não UUID da UI.
Perfil privado por padrão. FOLLOWERS falha fechado sem relação verificada. PUBLIC é prévia local,
não publicação real. XP local não é pontuação autoritativa para enviar ao servidor.

Migration 202610130001_community_foundation.sql prepara profiles/stats/activities/awards/
achievements com auth.users, owner e privacidade. Derivados não aceitam escrita cliente;
atividade pública exige perfil público. Testada em PostgreSQL/PGlite local, não aplicada
remotamente. Não existe SupabaseCommunityRepository nesta entrega. Social graph depende
de servidor/eventos confiáveis, sync/conflitos e testes A/B/anon antes de habilitar publicação.

## 12. Flashcards

Termos da UI: deck/decks e flashcard/flashcards. Editor completo: deck, título centralizado,
afirmação multilinha, true/false explícito, explicação no verso e imagem/desenho opcionais;
frente sem gabarito, verso após resposta, sem área vazia quando não há visual.
Criação/edição preserva rascunho em falha, previne toque duplicado e confirma saída alterada.
PNG/JPEG/WebP até 3 MB; desenho local com traço/apagar/desfazer/limpar e limite 2.500 pontos.
Título até 240, afirmação 20.000, explicação 30.000 caracteres; não definir gabarito silencioso.

| Resposta | Julgamento | Confiança | Acerto / erro |
| --- | --- | --- | --- |
| XX | Falso | Alta | +10 / -10 |
| X | Falso | Baixa | +5 / -5 |
| ✓ | Verdadeiro | Baixa | +5 / -5 |
| ✓✓ | Verdadeiro | Alta | +10 / -10 |

Zero inicial, negativos permitidos, verde=acerto e vermelho=erro, inclusive gabarito falso.
Mesma regra versionada no Study e Battle; sem bônus/cronômetro. Resposta/avanço e conteúdo
congelado são duráveis/idempotentes antes de revelar. Resumo mostra pontos/acertos/erros/
explicações; retomar não reinicia a sessão. SRS SM-2 existente é preservado, separado do placar.

Persistência por conta @kindle/flashcards.v1:<UUID>, SQLite kv-store kindle-flashcards.db
no Native e IndexedDB kindle-flashcards/snapshots na Web. Migração copia legado da mesma
conta sem apagá-lo/sobrescrever o novo. Quota falha explicitamente; oncomplete confirma Web.
Cartões incompletos exigem revisão antes de uso. Geração local por capítulos/grifos cria
rascunhos editáveis com origem, sem IA remota/gabarito inventado. Origem exata pelo Reader,
Anki e sync de cartões/revisões ainda são evoluções, não parte do engine da Library.

Batalha: cliente Supabase e RPC public.flashcard_battle(action,payload), auth.uid,
schema flashcard_private, snapshots/filas/gabaritos privados e pontuação no servidor.
N=3/5/10/15; dois usuários distintos escolhem decks suficientes e confirmam.
A fornece N para B e B fornece N para A, sorteio sem repetição e sem mudar propriedade.
Cada um avança independentemente; primeiro a terminar espera; maior pontuação vence, empate
por igualdade. Sem derrota por desconexão, expiração ou abandono presumido.
Retomada consulta partida; polling de 3s só na tela ativa/foreground. Deck de batalha até
500 cartões/16 MB; gabarito/explicação não são enviados antes da resposta aceita.

Cliente Battle congela UUID/epoch/JWT para toda operação upload→join, usa HTTP autenticado
com cancelamento ao trocar conta e rejeita resposta A→B→A. UI remonta somente o conteúdo
da batalha ao mudar UUID e ignora load/resultado após blur. Não altera estudo/SRS local.
Testes test-battle-account.cjs e PostgreSQL real test-flashcard-battles.cjs não equivalem
a duas sessões Supabase autenticadas independentes.

Migration 202610090001_flashcard_battles.sql e supabase/tests/flashcard_battles_manual.sql
passaram historicamente em PostgreSQL isolado; usuário informou deploy real como versão
20261015144958=flashcard_battles. Não reaplicar. Duas sessões reais continuam pendentes.
Verificar Auth/ledger antes de aplicar. O projeto doador C:/Flashcards não é o backend do Aldus:
JWT distinto, gateway com isCorrect do cliente e regras de HP/velocidade não são reutilizados.
Nenhuma geração por IA/cobrança/serviço doador deve ser anunciada como concluída.

## 13. Comunidade futura

Sequência real: Social Graph/perfis públicos → feed → clubes/leitura conjunta → fóruns/
teorias/spoilers → desafios/achievements ampliados → moderação/denúncias/bloqueios.
Relações/verificações, acesso a clubes, autoria e eventos/XP devem ser autoritativos no servidor.
Sem criar followers/clubes/posts falsos, ativar FOLLOWERS ou enviar livros privados por padrão.

## 14. Legal

Telas públicas e fontes: src/legal/legalContent.ts, legalConfig.ts, appMetadata.ts e
app/legal/*.tsx. Privacidade/Termos acessíveis antes de login; política atual descreve
Auth/Supabase privado, Sources/Drive, OCR, sensores, offline, exclusões e ausência de E2E.
LGPD, privacidade, termos e direitos autorais exigem revisão operacional/profissional;
o app não certifica conformidade nem concede licença para a obra sincronizada.

Batalha preparada envia deck escolhido ao Supabase somente quando habilitada; estudo individual
é local. PUBLIC da Community não significa publicação remota. Revisar textos antes de ativar
novos tratamentos. Controlador/canal via EXPO_PUBLIC_LEGAL_CONTROLLER_NAME e
EXPO_PUBLIC_LEGAL_CONTACT_EMAIL, sem inventar identidade, DPO, prazo de retenção ou endereço.
Retenção/expurgo, exclusão de conta, região/contratos, menores e obrigações ML Kit/Drive
continuam pendências de operação, não permissões administrativas do cliente.

THIRD_PARTY_NOTICES.md e src/legal/thirdPartyNotices.generated.ts são gerados por
npm run legal:notices; npm run legal:notices:check verifica 38 dependências diretas.
Comparação normaliza CRLF no Windows. Não remover avisos/licenças para cumprir a regra de
dois contextos. Transitivos/artefatos nativos exigem revisão própria antes de distribuição.

## 15. Build Android

### Homologação física contínua — autorização de 16/10/2026

O Redmi conectado via USB é o dispositivo oficial de homologação Android. O Codex deve utilizá-lo autonomamente para testes físicos sempre que disponível e relevante, preservando dados e distinguindo testes reais de simulações.

Usar ADB e preferir development build/Metro compatíveis. APK debug temporário é autorizado
para homologação, sem publicar release. Antes de atualizar, conferir package, versão e
certificado da instalação. Nunca desinstalar, limpar dados, trocar applicationId ou substituir
assinatura incompatível sem autorização específica. USB unauthorized exige confirmação
no aparelho; não contornar bloqueio de tela. Preservar livros, arquivos, contas, preferências,
progresso e outbox. Não ampliar essa autorização para produção, pagamentos ou privilégios.
Resultados físicos devem identificar aparelho/Android, fonte/artefato, cenário e evidência;
usar PASS físico, FAIL físico, PASS controlado, NÃO EXECUTADO ou BLOQUEADO. Um bug original
só é encerrado após reproduzir o cenário original e validar sua correção no aparelho.
Configurações temporárias do sistema usadas nos ensaios devem ser registradas localmente
e restauradas. Não versionar capturas com notificações externas ou conteúdo pessoal.

Execução física de 16/10/2026: Redmi 23117RA68G, Android 16/API 36, ARM64,
com.aldus.reader 1.0.0/code 1. Debug temporário atualizado com install -r após comparar
package/certificado; firstInstallTime e 35 livros anteriores preservados, sem uninstall/clear.
APK debug em android/app/build/outputs/apk/debug/app-debug.apk, 106.185.143 bytes,
SHA-256 BC28BAB08CC720BB17096E62CC49C710DB16EA567615249CE8FBDC79393590DE.
Certificado SHA-256 fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c.
Esse APK carrega JS pelo Metro/USB: hash do APK não identifica o bundle dinâmico.
Fonte nativa f851b3a; correção JS 101395c validada via Metro, sem recompilação nativa.
Não foi gerado release. O development build depende do Metro para retomar o projeto.

PASS físico: arquivo original Amêndoas disponível no aparelho; importação em 16,295s,
cancelamento durante leitura em 3,986s sem livro adicional, biblioteca 35→36 apenas pela
importação concluída. Bytes originais preservados (SHA-256 nos relatórios locais).
Foi reproduzido bloqueio de paginação por imagens lazy fora da tela: readiness aguardava
recursos que o Chromium não solicitava. waitForImage instala listeners antes de promover
loading=lazy para eager; nova WebView normal carregou as dez imagens e paginou sem intervenção.
Controles Buscar/Sumário/Aparência/Estudos, anterior/próxima, retorno à biblioteca e reabertura
após encerramento do processo preservaram 18/728. Rolagem longa de Preferências e gesto
vertical iniciado no slider funcionaram sem alterar fonte/documento. Fonte 26→22→26 e
temas Claro/Sépia funcionaram, com valores originais restaurados; ciclo tipográfico terminou
17/728, portanto precisão da âncora continua parcial. Quatro cópias locais iguais ao EPUB
foram encontradas sem baseline por arquivo; origem/limpeza inconclusivas, nada apagado.

PASS controlado: matriz crítica 66/66, typecheck, export Web e Chromium com documento
gerado/imagens lazy; regressão de readiness falha no baseline anterior e passa com a correção.
Ferramentas Metro excluem artefatos gerados preservando fontes/dependency dist/entry virtual.
Automação física reproduzível: scripts/redmi-qa.cjs; evidências/capturas ignoradas em
.expo/redmi-qa. Falhas de seletor/espera do harness foram corrigidas e repetidas; não foram
tratadas como falhas do Reader. Ausência de crash nos logs amostrados não certifica todos
os cenários. BUGS_ATUAIS.md mantém resultados parciais e dependências externas por cenário.

SaaS 3 PASS físico: Ajustes→Meu Plano→retry→Comparar→retorno; backend ainda indisponível,
sem fabricar Free/Pro ou consumo zero. Com Wi-Fi e dados móveis temporariamente desligados,
ambas as telas mostraram erro de conexão; EPUB local abriu, avançou 17→18/728 e reabriu
em 18/728. Rede original (ambas habilitadas) restaurada e conferida. JS via USB continuou
disponível; não certifica cold start offline de release. Drive: navegação/gerenciador/retorno
PASS físico, fonte existente preservada; indexação/API/cancelamento em andamento BLOQUEADOS
por reconexão necessária, sem renovar OAuth nem modificar arquivos/contas.

PDF Reflow PASS físico parcial: Weber 584 páginas/5.265.071 bytes; cancelamento após
extração completa durante validação retornou ao Original 1/584. Repetição passou por
montagem/validação/finalização e SUCCESS em 212.227ms no debug; primeira paginação 1/2098.
Voltar à biblioteca/reabrir reutilizou cache, sem novo START de extração. A latência segue
alta; amostras PSS do processo em torno de 1,3–1,6 GiB não provam pico nem vazamento.
Back durante finalização permanece inconclusivo; OCR físico e arquivo original de 969p
não foram validados. Nenhum cache/livro anterior foi apagado para forçar novos testes.
Fonte do sistema 130% PASS físico em Meu Plano/Comparar/rolagem longa das Preferências,
com capturas revisadas; 100% restaurado. Solicitação de rotação pelo sistema manteve o
app em retrato 1080×2400, como declarado no manifesto; não prova giro físico/sensor.
TalkBack físico não executado; labels de navegação foram usados pela automação Native.
Conferência final: biblioteca 36 livros; PDF Original do Weber restaurado em 1/584,
cache Reflow mantido; hash do EPUB original inalterado. Rede, fonte do sistema, rotação
e heads-up notifications coincidiram integralmente com o baseline. Forward CDP temporário
removido; reverse USB/Metro mantidos para usar o development build. Buffer consultado
do PID final sem assinaturas FATAL/erro JS/ANR, sem inferir ausência em todo o histórico.

Package com.aldus.reader, scheme aldus; applicationId antigo com.kindle.reader não compartilha
automaticamente dados privados com o novo. Versão/code genéricos não identificam um commit.
Infra local: android/ versionado, JDK 17 e SDK/build-tools/NDK declarados no Gradle.
Comandos existentes: npm run build:apk:local, build:apk:archive e build:apk (EAS preview APK).
Build de distribuição somente quando solicitado; a autorização de homologação acima
permite build debug quando necessário aos testes físicos, sem gerar release por commit.
O guard de variáveis públicas é compartilhado entre export Web e wrapper Android,
antes de embutir JS; configuração insegura impede build sem imprimir valores.

Release local usa a debug.keystore existente para testes; produção/EAS/Play exigem certificado
apropriado e fingerprint do artefato efetivo. Não atribuir SHA de debug a Play.
Artefatos ficam ignorados em artifacts/apk e não entram no Git; identidade exige hash,
tamanho, assinatura, package e fonte/bundle correspondente. Compilar não comprova instalação
ou funcionamento. Atualização física preserva dados; não desinstalar/limpar como diagnóstico.
JS pode usar Metro em development build compatível; APK release requer build consolidado
futuro para incluir o novo bundle. A missão SaaS anterior não gerou APK; os testes físicos
autorizados em 16/10 permitem apenas o debug temporário descrito acima.

Wrapper local Windows usa caminho absoluto de gradlew.bat, com quoting para espaços e
windowsVerbatimArguments. Corrigido lookup quando NoDefaultCurrentDirectoryInExePath=1;
test-android-build-command.cjs reproduz o defeito e executa somente um .bat temporário de
echo, nunca Gradle. Package, keystore, versionCode=1 e versionName=1.0.0 não mudaram.
Antes de publicação futura, comparar versionCode com Play/instalação e escolher inteiro
maior; preservar certificado da linha instalada ou planejar migração. Não trocar por debug.

## 16. Git e fluxo de trabalho

Antes de editar: git status --short, branch --show-current, rev-parse HEAD e log recente.
Preservar trabalho existente; stage somente arquivos relacionados, revisar cached diff e check.
Trabalhar normalmente na main, com commits por bloco e push para origin/main após validação.
Criar branches separadas somente para trabalhos experimentais, arriscados ou isolados que
justifiquem isso. Se main estiver protegida, usar Pull Request sem contornar a proteção.
Nunca fazer force push, reescrever histórico publicado, reset, clean, stash ou descarte
em massa. integration/comunidade-literaria é histórica, não a branch padrão; não foi apagada.
Migrations históricas são imutáveis; incrementais só após inventário e autorização remota.
Nunca commitar .env.local, tokens, secrets, keystores privados, APKs ou livros pessoais.

Validação local da primeira consolidação na main (Etapa 1) em 15/10/2026: typecheck, export:web e
test:critical PASS (57/57 suítes), cobrindo Community, Reader/EPUB/Reflow, Library Sync,
Auth/segurança, Drive, Flashcards/Battle e SaaS. Código/migrations são idênticos à integração;
a única edição nova desta consolidação é este documento. BUGS_ATUAIS.md foi preservado
byte a byte. Testes controlados/export não equivalem a validação física, Storage/Auth HTTP
ou implantação remota. Nenhum APK, deploy Supabase, migration de produção ou SaaS Etapa 2.

Consolidação da Etapa 2 na main em 15/10/2026: fetch confirmou as duas branches locais
alinhadas aos respectivos remotos e main ancestral da integração. Fast-forward de
9cb5a96 para 9b3c619 preservou integralmente Admin 1.5, Community, Reader, Auth, Sync,
SaaS e migrations. Typecheck e export:web PASS; test:critical 62/62 PASS, incluindo
admin-security/admin-client, saas-schema/saas-client/saas-compatibility e as três suítes
de cotas (SQL PGlite, cliente SQLite e driver HTTP controlado). Apenas este documento
foi editado após a integração; BUGS_ATUAIS.md e todos os arquivos de aplicação/testes/
migrations permanecem idênticos à integração. Plugins GitHub, Supabase e Vercel foram
consultados somente para leitura. Nenhum APK, deploy, migration remota ou nova etapa SaaS.
As pendências de validação autenticada/concorrência remota da Etapa 2 continuam abertas.

Web/CI: npm run build delega a export:web. Antes do Expo, validate-web-env.cjs rejeita
chaves privadas/public env insegura; Vercel produção exige configuração legal real.
Depois do export, write-build-metadata.cjs gera dist/build-info.json com commit, dirty,
data, ambiente não sensível e SHA-256 dos arquivos JS/HTML/CSS (não de livros/contas).
VERCEL_GIT_COMMIT_SHA/GITHUB_SHA precisam corresponder ao HEAD. dirty=true nunca é
prova de build limpa. O metadata não inclui env, JWT, host privado ou dados de usuário.
vercel.json fixa build/output/install e headers compatíveis com o iframe do Reader.
.github/workflows/validate.yml: Node24, npm ci, ferramentas de teste isoladas, typecheck,
Deno check, matriz test:critical, export/metadata, diff check e audit crítico. Actions pinadas
por SHA, contents:read, checkout sem persistir credencial. Sem segredo/deploy automático.
Workflow preparado/localmente validado; só execução Actions real comprova CI remoto.
Testes controlados não certificam produção ou Android. A matriz inclui leitura binária
Native, cache/commit/cancelamento final Reflow e adapter REST com sessão/rede pendentes.
Vercel Git integration/checks/permissões/logs dependem do operador; não presumir deploy
com base no último commit. README contém roteiro humano; não publicar produção sozinho.

## 17. Funcionalidades implementadas

Reader EPUB/PDF Original/Reflow, estudo EPUB, organização, importação determinística,
Sources e Drive hierárquico, OCR Android local, Auth/conta/permissões, engine privado de
Library Sync, Flashcards/Study/Battle preparado e Community v0.1 estão conectados no código.
Validação de um módulo não prova os demais: Library/Battle foram implantados segundo o
operador, mas ainda faltam sessões reais; Community remota e novos fluxos Native não têm
validação física nesta campanha. Migração nova de perfil ativo ainda não foi implantada.

15/10: testes EPUB/catálogos/importação, estados/árvore/Drive/Sources, Library SQLite/restart/
files/coordinator/leitura/RLS PGlite, Auth e Community domínio/dados/provider/UI/schema passaram.
UI da Library e export opcional passaram em React; app exportado/Chrome com dois IndexedDB
passou importação offline/reload, metadata-only, upload HTTP fixture, Reader sob demanda,
remoções e conta cruzada. Sources browser passou árvore/fuzzy/offline/rollback/virtualização.
Typecheck, export:web e checagens legais passaram. Supabase/Auth/Drive dos harnesses são
fixtures salvo a sonda pública explicitamente identificada. Nenhum teste físico novo.

Evidência física histórica de 09/10, anterior ao bundle atual: EPUB Freud com controles e
reabertura em 220/631; Ócio Reflow em 5/32; Sociedade Original em 78/169. Amostras reais do
DeviceMotion, overlay e três ciclos foreground/background também foram observados.
Esses resultados superam notas antigas de controles/bytecode/sensor ausentes e evitam
ressuscitar defeitos corrigidos. Não certificam recursos novos, toda matriz de restauração,
rotação/cutout, scroll do painel ou cancelamento final de arquivos grandes.

## 18. Funcionalidades futuras

- Capa personalizada por seleção/arquivo e eventual sync; URL de capa atual continua local.
- Perfis por livro, histórico de navegação, notas de rodapé e overrides EPUB após estabilização.
- Vocabulário/dicionário/tradução/TTS com fontes/motores/licenças adequados.
- Sessões reais de leitura/foreground/inatividade para estatísticas, metas, streak e tempo;
  não derivar páginas lidas de última página nem tempo de lastOpenedDate.
- Mapeamento de estudo PDF Original/Reflow, PDFs duplos/híbridos, camadas de reparo,
  leitura paralela/bilíngue e retomada baseada em trechos recuperáveis.
- Flashcards por capítulos/grifos/livro inteiro com processamento gradual, progresso,
  cancelamento, prévia editável, deduplicação, referências verificáveis e aprovação.
  IA externa somente com ação explícita informando dados enviados/custos; não confundir
  geração local com IA. Export Anki, origem no Reader e sync de revisões ainda pendentes.
- Franquias/assinatura e Admin foram implementados localmente nas seções 6.1/6.2.
  Billing e preços efetivamente cobrados dependem de integração futura explicitamente
  autorizada; não iniciada. Credenciais ficam no servidor; cancelamento de plano não tira
  cartões/revisão/export locais.
- Escala do Sync (cursor/entidades incrementais/TUS), retenção e exclusão de conta;
  social e moderação seguem a seção 13. Nenhum roadmap autoriza implementar outra etapa sozinho.

## 19. Regras de não regressão

Preservar Original/Reflow separados, arquivos pessoais, conta A != B, transações duráveis,
snapshots offline e progresso confirmado. Não remontar viewer ao abrir controles/settings.
Não introduzir timeout maior, delay/spinner ou limpeza de fila como correção causal.
Não publicar HTML/cache/parcial como documento validado nem fonte parcial como índice completo.
Diagnósticos são opt-in/allowlisted, sem tokens, URLs credenciadas, conteúdo ou dados de contas.

Gates gerais: npm run typecheck; npm run export:web; git diff --check.
Por área: node scripts/test-epub-resources.cjs, test-book-import.cjs, test-catalogs.cjs;
test-source-indexing.cjs, test-source-catalog.cjs, test-drive-tree.cjs, test-google-drive.cjs;
test-library-ui.cjs, test-library-organization.cjs e test-library-web.cjs;
test-library-account/sync/files/reading-sync/coordinator/restart/rls.cjs;
test-auth-flows.cjs, test-auth-callback.cjs, test-auth.cjs --auth-only;
test-community-domain/data/provider/ui/schema.cjs. Usar nomes reais expandidos dos scripts.
Se mexer no Reader, executar suas suítes Native/Screen/browser/âncoras e testar EPUB,
Original/Reflow em página intermediária, dez toggles, tipografia, Back/reopen e modo PDF.

Ferramentas de teste ficam em caches ignorados .expo/auth-test-tools (React/test-renderer
19.2.3), .expo/library-db-test (PGlite 0.5.8) e .expo/flashcard-db-test (PGlite/fake-indexeddb).
O ensaio de layout das Preferências usa yoga-layout 3.2.1 em .expo/layout-test, isolado
do app, também instalado pelo CI. Hierarquia nativa e layout não simulam toque físico.
Node 24 fornece node:sqlite. Instalar ferramentas isoladas sem mudar manifests do app.
Browser usa perfil descartável, identidade/HTTP fictícios, IndexedDB real e espera commits;
injetar fixtures só na página principal, preservando sandbox e sem tocar dados do usuário.
Não atribuir PASS a script inexistente ou confundir export/build com Android, conta real ou RLS remoto.

## 20. Regras para futuras IAs

Antes de qualquer alteração, ler integralmente PROJECT_CONTEXT.md.
Para bugs, ler também BUGS_ATUAIS.md. Estes são os únicos dois contextos oficiais.
Arquitetura/decisão/feature atualiza este documento; bug novo atualiza BUGS_ATUAIS.md.
Bug validado resolvido sai da lista ativa; fica somente sua decisão permanente aqui.
Não criar outros arquivos de contexto, diagnóstico, handoff, checkpoint, correções ou equivalentes.
Exceção explícita da missão integrada: RELATORIO_CORRECOES_INTEGRADAS.md é snapshot de
entrega solicitado pelo usuário, não terceira fonte obrigatória de contexto ou regra para
criar novos relatórios a cada alteração. Os dois contextos oficiais continuam estes.

Consolidação de 15/10 inventariou 33 Markdown técnicos/operacionais/gerados iniciais.
Conteúdo útil de contextos, roadmap, Flashcards, Auth, Reader, Drive, Community e diagnósticos
foi absorvido; 28 arquivos redundantes foram removidos, recuperáveis no histórico Git.
Cronologias/prompts antigos completos/logs gigantes e hipóteses descartadas não são contexto atual.
Mantidos além dos dois oficiais: README.md (execução), LIBRARY_SYNC_DEPLOYMENT.md e
GOOGLE_AUTH_DRIVE_DEPLOYMENT.md (procedimentos humanos), THIRD_PARTY_NOTICES.md (avisos gerados).
Migrations, scripts operacionais, testes e textos legais do app continuam em seus diretórios.
Artefatos ignorados são evidência auxiliar, nunca terceira fonte de contexto obrigatória.

## SaaS — Etapa 2: cotas reais de Sync e Storage (15/10/2026)

IMPLEMENTADO LOCALMENTE / ATIVAÇÃO REMOTA E QA AUTENTICADO PENDENTES.
A implementação foi produzida originalmente em integration/comunidade-literaria,
que recebeu main 9cb5a96 por fast-forward, preservando Admin 1.5 e todo o histórico.
Os quatro commits da Etapa 2 foram depois consolidados na main por fast-forward.
A referência à integração é somente histórica: novas implementações devem partir
da main e ser enviadas a origin/main, salvo instrução explícita em contrário.

- Catálogo existente continua sendo a autoridade: Free 100 livros / 524288000 bytes
  (500 MiB), Pro 2000 livros / 10737418240 bytes (10 GiB). Valores não foram duplicados
  no cliente; alterações confiáveis do catálogo/assinatura são resolvidas no servidor.
- Incremental nova: 20261015215745_saas_quota_reservations.sql. Nenhuma migration
  histórica foi editada. Reserva privada por (conta, caminho imutável), token por lease,
  tamanho declarado limitado e expiração de 15 minutos. Cliente não escreve no ledger.
- RPCs autenticadas saas_quota_snapshot, saas_reserve_upload e saas_finish_upload;
  saas_upload_reserved serve à fence restritiva de INSERT do Storage. Auth ativo,
  propriedade e livro remoto existente continuam obrigatórios. Sem service_role cliente.
- Medição: livros remotos vivos; objetos reais registrados no Storage, inclusive antigos,
  órfãos/não publicados e tombstonados; bytes do metadata.size preenchido pelo Storage;
  bytes/número de reservas válidas ainda sem objeto; capacidade restante desconta ambos.
  Um objeto é contado uma vez, independentemente de retry/referências de metadados.
  Isto não é inventário do S3 fora de storage.objects. Tamanho legado desconhecido
  produz null e bloqueia crescimento até reconciliação confiável, sem apagar o objeto.
- Reserva, confirmação e trigger de conclusão usam o mesmo lock de linha do perfil.
  Crescimento exige READ COMMITTED para renovar a visão após esperar o lock. O servidor
  revalida limite atual e tamanho real exatamente igual à reserva no commit do Storage.
  Mantido constraint trigger deferred para a sonda de autorização revertida do Storage.
  RLS impede upload direto sem reserva e UPDATE/upsert imutável continua proibido.
- Retry do mesmo caminho reaproveita reserva; objeto existente retorna exists, seguido
  da verificação de integridade já existente. Finalização/cancelamento são idempotentes;
  token antigo não cancela lease novo. Objeto gravado ganha prioridade sobre cancelamento.
  Reserva expirada/cancelada não autoriza conclusão tardia. Falhas/abort/rede perdida
  reconciliam sem DELETE; na ausência de resposta, a reserva expira. Não há limpeza nova.
- Reuso do LibrarySyncService/Coordinator, outbox durável e SupabaseLibraryAdapter.
  Recusa de livro não interrompe progresso/notas/grifos/organização de livros existentes;
  filhos do novo livro recusado ficam pendentes. Upload só ocorre após metadata confirmada.
  Bloqueios de cota por conta persistem no journal SQLite/IndexedDB, sem tirar dirty ou
  trocar operationId. Não repetem envio em background com capacidade inalterada; retomam
  após mudança do snapshot confiável ou ação explícita Sincronizar agora. UI mostra uso,
  reserva, disponibilidade, excesso e motivo. Nenhum gate novo em leitura/importação local.
- Compatibilidade progressiva: RPC de medição ausente não inventa plano nem interrompe
  o RPC existente de metadados. Arquivos novos sempre exigem reserva, falhando fechado
  até implantação. Troca de conta descarta resposta tardia e mantém JWT da operação.
- Downgrade: nenhum dado excluído/ocultado. Livros locais, dados remotos existentes,
  downloads/retry de objeto existente e alterações de leitura continuam disponíveis;
  somente crescimento acima da franquia é recusado. Upgrade preserva e retoma a fila.
- Validação: matriz crítica 62/62 PASS; 19 cenários SQL PGlite, testes de cliente com
  SQLite real e driver HTTP controlado PASS, além de regressões de Sync/coordenador/
  cancelamento/transferência e UI. Typecheck e export Web PASS. Limites de fronteira
  usam catálogo reduzido em fixtures; os valores Free/Pro iniciais também são verificados.
- PGlite serializa conexões e não comprova disputa de locks. A homologação posterior
  abaixo acrescentou PostgreSQL nativo com sessões independentes, sem Docker/serviço
  global. Storage HTTP gerenciado e Android continuam pendentes.
- Inventário remoto somente leitura reconfirmou ledger com 20261015144958,
  20261015145012 e 20261015145018. Antes de implantação autorizada: reconciliar schema,
  ledger e RLS/ACL/Storage da instância com os pré-requisitos incrementais (incluindo
  perfis ativos, SaaS 1 e Admin quando aplicável), testar A/B/disabled e probe/conclusão,
  tamanho real, reservas concorrentes, cancelamento/expiração e downgrade reais.
  Nenhuma migration remota, deploy, cobrança, limpeza destrutiva ou APK desta etapa.

## Preparação final de homologação gratuita — 15/10/2026

IMPLEMENTADO / VALIDADO LOCALMENTE; SERVIÇOS GERENCIADOS E RECUPERAÇÃO DE PRODUÇÃO PENDENTES.
Trabalho em C:\Kindle, main. Sem alteração de app, migrations ou dependências de produção.
Nenhum usuário/plano real modificado, APK, deploy ou cobrança.

Ambiente: `npm run test:saas:setup` instala somente ferramentas isoladas em
.expo/saas-tools, ignorado pelo Git, com lifecycle scripts desativados:
@embedded-postgres/windows-x64 17.6.0-beta.15 (PostgreSQL 17.6) e pg 8.23.1.
`npm run test:saas:postgres` cria cluster loopback, porta/senha aleatórias e SCRAM;
não aceita URL de produção. Seis identidades sintéticas @aldus.example.invalid:
A/B Free, C Pro, D desativada, OWNER e ADMIN. Nenhuma identidade pessoal copiada.
Sem Docker, instalação global ou serviço persistente. Artefatos/dados ficam em .expo.

As quatro incrementais originais passam nesta ordem sobre baseline compatível com os
objetos relevantes do inventário remoto, preservando perfis e biblioteca sintética anterior:

1. 20261015160539_library_active_account_fences.sql: profiles/biblioteca/recovery.
2. 20261015190705_saas_plans_entitlements.sql: conta ativa/biblioteca.
3. 20261015194604_aldus_admin.sql: SaaS 1, Auth sessions/factors.
4. 20261015215745_saas_quota_reservations.sql: biblioteca/hardening/SaaS 1.

Ledger sintético conserva o mapeamento histórico remoto Battle=20261015144958,
biblioteca=20261015145012 e recovery=20261015145018, mais SHA256 das fontes.
Reexecução controlada confere hashes. Falha intermediária injetada em cópia em memória
da SaaS 1 reverte a transação/dados; nenhum arquivo de migration foi alterado.

PostgreSQL nativo: 19 cenários PASS; cinco esperas reais em pg_blocking_pids com
PIDs/sessões distintos: fronteira de livros, bytes reservados, retry do mesmo caminho,
CAS administrativo e revogação cruzada de OWNER. Verificados catálogo comercial original,
contagem/idempotência, rollback/probe, falha de gravação, tamanho divergente, resposta
perdida, expiração/cancelamento/retorno tardio, downgrade/upgrade e estudos existentes.
RLS A/B/anon/desativado, autopromoção Pro/admin, MFA recente, auditoria e último OWNER PASS.
Administrador não lê conteúdo privado alheio. Papéis/claims SQL são controlados, não JWT
verificado por GoTrue/PostgREST. Storage reproduz UUID/campos/índices parciais relevantes
do remoto com versionamento desativado, sem implementar S3/API. Fronteiras 500 MiB/10 GiB
usam metadata sintética: objeto físico tem nove bytes; não houve transferência de GB.

Admin Web exportado: HTTP local e migrations em PGlite, dez seções, desktop/mobile,
formulários de assinatura/entitlement/conta/administrador/preço/configuração/rollback,
revogação, Pro sem papel administrativo, sessão/offline e aviso nos Ajustes PASS.
TOTP controlado cobre enrollment/challenge/código inválido/válido; vetores RFC6238 PASS.
Não equivale ao enrollment real Supabase. Capturas identificam dados sintéticos.
Receita/MRR indisponíveis, sem vendas fictícias. E-mail pessoal removido das fixtures.
O backend HTTP do ensaio Web Library foi atualizado para usar RPCs SQL reais das quatro
incrementais, substituindo protocolo de fixture anterior sem reservas. Bytes são fixture
HTTP; não é validação de Storage gerenciado. Matriz crítica 62/62, typecheck, export Web,
suítes SaaS/quotas/Admin PASS; testes Web são reportados separadamente dos gates estáticos.
Library Web PASS: duas origens/IndexedDB independentes, EPUB real sintético importado
offline e reaberto, upload reservado/confirmado via SQL, livro somente na nuvem,
download ao abrir no Reader, remoção só do dispositivo/reabertura, rollback de outbox,
troca de conta e exclusão permanente solicitada no próprio ensaio sintético.

Backup: scripts/saas-local-backup.cjs aceita somente cluster sintético marcado sob .expo.
Para o servidor antes de copiar PG/WAL/config, separa objetos físicos e gera SHA256.
Restauração em NOVO cluster 17.6 confere Auth/perfis/biblioteca/ledger/auditoria/bytes;
backup adulterado é rejeitado. PASS local. Não comprova recuperação de produção.
Esta distribuição não inclui pg_dump/pg_restore; não houve exportação remota nem prova
de PITR/restore gerenciado. Auth/SMTP/OAuth/secrets/configuração do provedor precisam de
inventário recuperável separado; dump SQL não contém objetos físicos. Exportação remota
de dados pessoais exige aprovação específica, destino privado fora do Git e teste de
restauração isolado. Implantação permanece pendente sem recuperação comprovável.

Revalidação remota mínima somente leitura: cmivracxuihtmsbmtuec conserva duas contas,
zero linhas biblioteca/receipts e zero objetos privados. Não são fixtures disponíveis.
Quatro incrementais ainda pendentes. Supabase Free: teto global 50 MB/arquivo e 1 GB
incluído por organização conforme Fase A, reconferir configurações antes de aplicar.
Bucket privado 512 MiB não supera teto global. Catálogo Aldus preservado: Free 100/500 MiB
com Sync/Storage gratuitos, Pro 2.000/10 GiB sem ativação comercial. Franquia comercial
não garante capacidade agregada máxima de todos os usuários no provedor gratuito.

`npm run saas:deployment:plan` somente lê Git/fontes/evidência, sem conectar ou executar
SQL. Registra hashes/dependências/gates e piloto PROPOSTO: seis usuários descartáveis,
arquivo até 256 KiB e total até 5 MiB, apenas após aprovação; não muda planos comerciais.
Sequência mínima futura, com autorização explícita e parada em qualquer divergência:

1. Autorizar backup/exportação necessários e comprovar recuperação; inventário final
   mínimo ledger/objetos/RLS/ACL/bucket/configuração, confrontando definições históricas.
2. Autorizar/aplicar incrementais na ordem acima; validar objetos/grants/definers/
   search_path/dados por transação e registrar versão REAL/hash no histórico adotado.
   apply_migration não recebe versão explícita: mapear versão retornada, sem repair por
   tentativa/erro, db push indiscriminado ou reaplicação dos três históricos equivalentes.
3. Autorizar contas sintéticas remotas e sessões reais A/B/disabled/anon; service_role
   não representa usuários. Pilotar Storage privado, probe/commit/tamanho real, bypass,
   reservas concorrentes/cancel/retry/expiração e reconciliação sem limpeza destrutiva.
4. Conferir clientes antigos: novos uploads exigem reserva/finalização. Leitura/downloads
   e alterações existentes preservados. Android antigo pode exigir atualização futura,
   não gerada aqui. Nunca relaxar RLS para contornar incompatibilidade.
5. Bootstrap OWNER requer aprovação SEPARADA, UUID real reconfirmado/e-mail verificado/
   perfil ativo e ausência de bootstrap anterior. Proprietário faz login/enrollment TOTP/
   verify; confirmar associação no banco e sessão real /admin, MFA/revogação/auditoria.
6. Deploy Web requer autorização separada; /admin publicado indisponível na Fase A.
   Aplicar SQL não publica a interface. Validar painel com backend real antes de ativar.

Falha: parar e diagnosticar schema/ledger em leitura. Sem rollback de produção presumido,
replay automático, relaxamento RLS, reset ou restore destrutivo não aprovado.
Evidência ignorada: .expo/saas-homologation/result.json (hashes/locks/restore),
deployment-plan.json, logs de testes/export e capturas admin-validation/library-sync-validation.

## SaaS — Etapa 3: experiência de planos e armazenamento (15/10/2026)

IMPLEMENTADO E VALIDADO LOCALMENTE. Início na main e109c89, limpa e alinhada a origin/main
após fetch. Desenvolvimento em C:\Kindle; main continua o padrão. Não houve alteração de
migrations, Reader, dependências nativas, pagamentos, serviços remotos ou dados reais.

- Rotas protegidas /plan (Meu Plano) e /plan/compare (Comparar Planos), acessíveis pelos
  Ajustes e pela Conta. A área de planos usa largura responsiva na Web, mantendo a moldura
  das demais telas e a navegação principal. Ajustes preserva Sync, temas, privacidade,
  exportação, Community e Admin; suas linhas ganharam rótulos/hints acessíveis explícitos.
- Reuso de AccountPlanSnapshot e QuotaSnapshot. SupabaseAccountPlanRepository conserva
  read() e acrescenta readExperience()/readCatalog(). Plano usa saas_account_snapshot;
  uso/reservas usam SupabaseLibraryAdapter.quota()/saas_quota_snapshot existentes.
  Catálogo consulta saas_plans e saas_plan_features autenticadas, sob RLS já implementada.
  CatalogPlan é projeção tipada dessas tabelas no mesmo domínio, não catálogo local.
  Nenhum novo RPC, setter de assinatura, cache persistido de permissões ou fonte JWT de plano.
- Preços, limites e recursos vêm do servidor. Free mostra o zero do catálogo; Pro nulo
  mostra “Preço ainda não disponível”. Preços mensal/anual configurados são informativos;
  contratação permanece desabilitada, sem trial automático ou criação de assinatura.
  Recursos essenciais Free preservados; benefícios premium futuros não são inventados.
- Meu Plano apresenta plano efetivo, estado active/trialing/expired/revoked, origem da
  concessão, prazo quando existente, benefícios implementados e horário da consulta.
  Free é permanente; uma concessão administrativa Pro não comprova compra. Concessão
  expirada/revogada pode coexistir com plano efetivo Free, explicitamente explicado.
- Consumo: livros usados/restantes, bytes efetivamente registrados, objetos, bytes e
  quantidade de reservas e saldo que já desconta reservas. Bytes/KiB/MiB/GiB formatados;
  null é “Em verificação”, jamais zero. Barras limitadas a 0–100%, valores acessíveis
  explícitos para Native/Web; excesso continua numericamente visível, inclusive um byte.
  Alertas de limite/downgrade preservam leitura, importação, biblioteca, estudos e outbox.
- Controller de apresentação somente em memória. Consultas canceladas no blur/background,
  logout/troca de conta e atualização; identidade + geração protegem inclusive A→B→A
  no mesmo ciclo de renderização. Dados anteriores somem antes de nova consulta. Offline
  limpa a apresentação; reconexão/foco/foreground reconsulta. Prazo Pro aberto agenda
  atualização ao vencer. Falha de sessão, autorização, rede, serviço ausente ou contrato
  incoerente mostra indisponibilidade e retry, sem fabricar Free/Pro ou uso.
- Classificação central LibrarySyncCoordinator agora distingue conflito e bloqueio pela
  franquia. Reutiliza o ledger de quotaBlocks e sua comparação de assinatura, sem novo
  mecanismo de Sync/retry. Metadata isolada não afirma bytes sincronizados: remotePath
  precisa coincidir com a shadow confirmada. Local, pendente, transferindo, cloud-only,
  sincronizado e erro conservam o fluxo existente. Link de bloqueio leva a Meu Plano.
  Remoções/confirmadores atuais preservados; a tela de plano apenas abre a biblioteca.
- LibrarySyncControls reutilizado em Meu Plano com resumo de quota suprimido para evitar
  duplicação; Sincronizar agora, legado e conflitos conservados. Formatação compartilhada
  corrige rótulos de unidades. Nenhum gate de plano foi inserido na leitura/importação.

Validação desta etapa: typecheck/export Web PASS; matriz crítica 64/64 PASS, incluindo
SaaS/quotas, Auth, Library Sync/SQLite/outbox, Admin, EPUB/PDF, Community e Flashcards/Battle.
test:saas inclui 27 cenários novos de contrato/repository/controller com SQL original
em PGlite, além de componentes Native controlados e hook React real (A→B→A em lote,
resposta tardia, offline/reconexão, logout e cleanup). test:saas:web exercita o export no
Chromium com HTTP/Auth sintéticos: navegação Ajustes/planos/biblioteca, catálogo alterado,
Free/Pro, zero/parcial/exato/excesso/desconhecido/reservas, expiração, falhas/retry, trocas
de identidade via SDK com redirecionamento do AuthGuard, retorno à área e resposta antiga,
offline/reconexão real do navegador, teclado/AX, desktop/360px, claro/escuro e fonte 150%.
As metadata grandes são fixtures históricas isoladas, não transferência física de GB.
test:library:web PASS com EPUB real sintético, duas origens IndexedDB, importação offline,
upload reservado/confirmado, Reader/download, remoção local, outbox e troca de conta.
test:admin:web PASS com dez áreas, TOTP controlado e formulários/concessão/revogação.
Capturas revisadas em .expo/saas-stage3-web, identificadas como dados sintéticos.
Testes em navegador/primitivas controladas NÃO provam toque, gestos ou instalação Android.

Operação: as quatro incrementais continuam pendentes em produção, conforme contexto do
proprietário; nenhuma nova auditoria remota foi necessária para a interface. Sem backend
SaaS ativo, as telas exibem indisponibilidade. Free 100/500 MiB e Pro 2.000/10 GiB continuam
limites comerciais do catálogo, não garantia agregada da infraestrutura Supabase Free.
Pro comercial/pagamentos não ativados. Nenhum deploy Web ou APK gerado.

Backup real permanece pendente da intervenção local do proprietário e das condições de
recuperação já registradas; exportação/restauração isolada já foram autorizadas nas tarefas
anteriores, mas estão expressamente fora da execução da Etapa 3. A janela da tarefa anterior
foi encerrada sem ler credenciais, evitando acionamento durante a Etapa 3. Clientes oficiais
17.11 foram preparados fora do repositório na tarefa anterior; isso não é backup concluído.
Workspace criptografado para restore e dependências do Vault continuam pendentes.
Para receber as telas no Android instalado será necessário futuro build/instalação com o
bundle atualizado; nenhuma dependência nativa mudou. Próximo passo: revisão/QA físico quando
autorizado e implantação assistida do backend somente após recuperação comprovada e nova
autorização específica. Publicação Web e bootstrap OWNER continuam operações separadas.

## Interface pública, Aldus Admin e português brasileiro (16/10/2026)

IMPLEMENTADO localmente a partir de main/origin/main 44c1d45, inicialmente limpas e
alinhadas após fetch. Trabalho em C:\Kindle. Nenhuma migration, dependência nativa,
estrutura persistida, permissão remota ou conteúdo do Reader foi alterado nesta tarefa.

- Apresentação pt-BR centralizada em src/presentation/i18n/ptBR.ts: Gratuito/Pro,
  Proprietário/Administrador, permissões, concessões, estados, ações e configurações.
  Datas e números brasileiros; filtros DD/MM/AAAA e expiração DD/MM/AAAA HH:mm (UTC)
  convertem para os contratos ISO existentes com validação de datas reais. Nomes
  comerciais personalizados são preservados. IDs free/pro, OWNER/ADMIN, rotas,
  tabelas, chaves premium_, nomes de livros/autores e termos Reader/deck/flashcard/
  EPUB/PDF permanecem intactos. Auditoria AST cobre texto JSX e atributos visíveis
  literais em app/src; regressões de rótulos cobrem os enums dinâmicos conhecidos.
  A auditoria estática não certifica traduções de conteúdo externo arbitrário.
- Aldus Admin mantém as dez seções e o mesmo repository/RPC/MFA. Desktop com menu
  lateral recolhível e largura integral; celular com navegação expansível, indicadores
  adaptáveis, tabela de usuários semântica no desktop e cartões em telas pequenas.
  Foco, contraste, estados de seleção, confirmação rolável, feedback de envio e
  atualização dos dados após salvar foram refinados. Controles da revisão anterior
  são removidos enquanto o novo snapshot é consultado. Filtros e paginação conservados;
  busca da auditoria é explicitamente restrita à página carregada.
- Formulários reais existentes: conta ativa/desativada, concessão/revogação Pro e
  permissões adicionais, catálogo/preços/franquias/propostas, configurações/revisões/
  restauração e associação/delegação/revogação administrativa. Nenhuma ação concede
  acesso somente pelo frontend. Mutação continua exigindo servidor, MFA recente,
  motivo, confirmação, revisão e identificador idempotente. Não há acesso administrativo
  ao conteúdo privado da biblioteca. Pro não concede papel administrativo.
- Métricas: cadastros por dia e distribuição atual de planos usam somente o snapshot;
  dados vazios não geram gráficos fictícios. Acessos não são chamados de usuários ativos.
  Receita mensal/anual/total, conversão, cancelamentos e histórico de pagamentos exibem
  “Aguardando integração de pagamentos.” Concessão manual não é venda. Crescimento
  histórico de Storage e sondas operacionais ausentes são declarados indisponíveis.
  Repository rejeita métricas incompletas, evitando zeros inventados; média de bytes
  fracionária válida é formatada sem confundir tamanho real de arquivo com média.
- Landing pública exclusiva Web em app/index.web.tsx e src/marketing, sem novo framework
  ou biblioteca de animação. Cabeçalho/mobile menu, hero, prévia ilustrativa interativa,
  recursos, etapas, planos, perguntas frequentes e rodapé legal. Entrar/Criar conta usam
  Auth real; visitante autenticado tem acesso à biblioteca. Contratação Pro desabilitada,
  preço indefinido explícito, nuvem em ativação e recursos sociais em homologação.
  Leitura local continua gratuita. FAQ distingue offline Android de carregamento inicial
  Web. Não foram inventados clientes, depoimentos, faturamento ou disponibilidade remota.
- Catálogo público anônimo: referência inicial GERADA da migration SaaS imutável por
  scripts/generate-public-catalog.cjs, validada pelo parser CatalogPlan existente.
  Não é permissão, uso da conta ou consulta ao catálogo atual de produção. Usuário com
  sessão elegível consulta readCatalog() existente e recebe mudanças do backend.
  A referência inicial é identificada na página; não há API pública de catálogo criada,
  grant novo ou migration. Free 100/500 MiB e Pro 2.000/10 GiB permanecem configuração
  comercial, sem garantia de capacidade agregada no Supabase Free nem oferta Pro ativa.
- Entrada Native app/index.tsx conservada. Root Web pública não fica no frame de celular
  nem inicia Library Sync; demais rotas mantêm os guards e o mesmo coordenador. Menu de
  três pontos da Biblioteca e exportação em Ajustes preservados: não foi reintroduzido
  botão grande “Opções de…” ou “Backup da organização” na Biblioteca.
- Animações CSS leves, entrada/revelação por rolagem, realces e hover/foco. Sem rolagem
  artificial; respeita prefers-reduced-motion, inclusive mudança durante a sessão.
  Prévia tem navegação por teclado, tabs/arrow/Home/End, temas ilustrativos e dados
  explicitamente demonstrativos. Não apresenta biblioteca pessoal na página pública.
- SEO: export:web gera HTML público indexável usando o MESMO LandingDocument, mesmo
  sem JavaScript. Rotas privadas usam app.html sem conteúdo de marketing e noindex;
  rewrites Vercel preparados localmente. Título, descrição, Open Graph, idioma pt-BR,
  robots e imagem própria public/aldus-share.png. EXPO_PUBLIC_SITE_URL valida origem
  HTTP(S) sem credenciais/caminho/query e habilita canonical/sitemap/imagem absoluta.
  Domínio não foi inventado: configuração definitiva continua pendente. Contato legal
  usa somente a configuração pública existente. Sem pixels, analytics ou deploy.

Validação: typecheck, export Web e matriz crítica 69/69 PASS. Inclui Auth, SaaS/quotas,
Library/SQLite/outbox, Admin, EPUB/PDF/Reflow/OCR, Community, Flashcards e Battle. Novas
suítes test-pt-br, test-admin-presentation e test-marketing integradas à matriz. Export
verificado também por test-web-build --exported. Chromium Admin PASS: dez áreas, TOTP
sintético certo/errado, papel delegado, Pro negado, formulários, revogação, offline e
desktop/mobile, incluindo leitura atrasada após salvar.
Ambos os temas administrativos, claro e escuro, foram conferidos no Chromium; preferência
salva foi usada para testar o tema, sem inferir cobertura de troca de tema do sistema.
Chromium marketing PASS em
320/360/430/768/1024/1440/1920: HTML sem JS, login/cadastro/biblioteca, catálogo autenticado
alterado, rotas protegidas/Admin negado, menu, FAQ, teclado, foco e redução de movimento.
SaaS Web e Library Web PASS (importação EPUB real sintética offline, duas origens
IndexedDB, upload reservado, download/Reader, remoção local e outbox). Auth/HTTP/TOTP e
Storage dos ensaios são controlados; SQL em PGlite não comprova serviço gerenciado nem
concorrência PostgreSQL entre sessões independentes. Nenhuma escrita remota executada.

Redmi USB Android 16: alterações JS recebidas pelo debug já instalado via Metro. Entrada
continua Biblioteca; Meu Plano/Comparar com indisponibilidade/retry/retorno e acesso
direto Admin negado/indisponível foram exercitados fisicamente. Não é prova do painel
OWNER autorizado ou de SaaS remoto. Biblioteca com 36 livros preservada. Capturas e
relatórios locais ignorados em .expo/marketing-validation, .expo/admin-validation e
.expo/redmi-qa; capturas administrativas identificam dados sintéticos. Nenhum APK foi
gerado ou instalado nesta tarefa; código nativo intacto. Debug usa Metro; distribuição
Android futura precisa incorporar o novo bundle em build próprio autorizado.

Pendências: recuperação do backup real, implantação incremental e validação autenticada
Auth/RLS/Storage, bootstrap OWNER específico, TOTP real do proprietário, domínio/contato
institucional definitivos e publicação Web autorizada. Produção não foi modificada.
Continuar na main; não abrir janela de senha, aplicar migrations, conceder OWNER, ativar
pagamentos ou publicar automaticamente em tarefas de interface.

### Livro 3D interativo da landing — 16/10/2026

- Implementação Web a partir da main 761c28d, alinhada ao remoto após fetch. Os dois
  documentos oficiais já continham registros operacionais posteriores; essas alterações
  foram preservadas separadamente das mudanças de interface desta etapa.
- ScrollBookStory substitui a prévia por UM livro: capa verde com espessura, lombada,
  miolo/arestas, marcador terracota e quatro folhas com quatro segmentos conectados cada.
  Faces frente/verso e dobradiças em preserve-3d, sem imagem esticada, vídeo, canvas ou
  dependência gráfica nova. Biblioteca, Reader, estudo, planos e convite final aparecem
  impressos nas páginas; conteúdo demonstrativo identificado e sem bibliotecas privadas.
- bookMotion.ts contém a geometria pura, contínua e reversível. Progresso calculado pelo
  scrollTop da região data-landing-scroll/.al-page-scroll e posições reais da trilha,
  cabeçalho e sticky. Eventos passivos/RAF sob demanda e ResizeObserver; nenhuma animação
  autônoma ou atualização React por frame. Parar mantém a pose; voltar ao topo fecha.
- Navegação explícita por etapas e opção Pular demonstração. Legenda acessível anuncia
  somente mudanças de capítulo; geometria duplicada oculta da árvore assistiva. Redução
  de movimento elimina a trilha longa e usa composição estática com navegação, inclusive
  se a preferência mudar durante a visita. Sem JS: livro estático/conteúdo indexável,
  instrução pt-BR, fallback de redução de movimento e demais seções disponíveis.
- Desktop, celular, tablet e telas baixas usam proporções coerentes; paisagem curta
  apresenta duas colunas. Bordas reais das folhas, inclusive curvas, foram verificadas
  contra título, viewport e cabeçalho. Nenhum bloqueio ou interceptação da rolagem nativa.
- Planos usam o MESMO CatalogPlan recebido pela landing e a referência inicial gerada
  existente, sem copiar limites para regras novas. Gratuito conserva Sync/Storage; Pro
  sem contratação/preço inventado. Franquia não é uso real nem promessa de infraestrutura.
- Metro passou a excluir somente artifacts da raiz do projeto, além de dist; entregas
  locais não pertencem ao grafo runtime. Regressão preserva pastas homônimas de dependências.
- Gates locais: typecheck, export Web e 69/69 críticas; SSR/geometria/pt-BR e Chromium com
  roda nativa, scroll real interno (window.scrollY permanece zero), pausa, reversão,
  botões/teclado, redução de movimento em runtime/sem JS, Auth/SEO e rotas protegidas.
  Dez viewports: 320x568/800, 360x800, 430x932, 768x1024, 844x390, 1024x800, 1440x540/1000
  e 1920x1080. Ensaios HTTP/Auth controlados; não comprovam sessões reais do Supabase.
- Capturas locais ignoradas em .expo/marketing-validation: landing-desktop/mobile,
  book-library/reader/study/plans/final e book-nojs-reduced-motion. Nenhum novo deploy,
  alteração Supabase, bootstrap, cobrança, APK ou teste físico Android nesta etapa.
  Entrada Native e Reader intactos; não exige recompilação nativa para esse recurso Web.

### Android: cadastro, PKCE e catálogos grandes — 19/10/2026

- main atualizada por fast-forward seguro de 10d6d24 para 112450d; alterações anteriores
  de fontes e documentação preservadas. O redesign de Minhas bibliotecas já existia no
  worktree; esta correção priorizou estabilidade, busca e fluxos preparados existentes.
- Redmi Android 16: APK instalado originalmente 1.0.0/code 1, atualizado em 17/10,
  Supabase público cmivracxuihtmsbmtuec. SHA-256 do APK inspecionado:
  60066f5377b24d0beb72c8fed8441d893a4464ee1ac1db1aeb3b66f3ad5758dd.
  O bundle difere do release 761c28d; não foi atribuída uma revisão exata sem prova.
  Development build existente instalado com adb install -r após conferir a mesma assinatura,
  sem desinstalar/limpar dados; o código atual foi carregado via Metro. Nenhum release gerado.
- Cadastro: quatro /signup HTTP 500 do incidente de 17/10 classificados por leitura
  remota como conflito único profiles/username. O trigger auth_create_profile insere o
  username fornecido nos metadados e abortava a criação da identidade quando ocupado.
  Cliente agora envia preferred_username como sugestão, deixa o perfil inicial sem username
  e usa o fluxo autenticado existente para reivindicá-lo após confirmação de e-mail.
  Conflito e falha de rede em completar perfil possuem erro recuperável e encerram busy.
- SDK Supabase instalado reproduz code_challenge_method=plain sem SubtleCrypto; era a
  condição rejeitada pelo validador S256. Native usa SecureRandom do Expo Core existente
  para getRandomValues e SHA-256 de @noble/hashes para endurecer os desafios de OAuth e
  signup/recovery/OTP, preservando o verifier armazenado pelo SDK. Sem fallback Math.random,
  sem SubtleCrypto fictício, sem relaxar origem/callback/PKCE, sem dependência nativa nova.
  Hermes físico confirmou ausência de subtle, RNG disponível e vetor RFC 7636 S256 correto.
- Auditoria remota somente leitura: redirect Native e recovery corretos; Web localhost
  não preservado e caminho Native não aprovado aceito pelo servidor. Configuração Auth
  externa não alterada. As quatro migrations SaaS/Admin já constam no ledger remoto sob
  versões de 16/10 documentadas anteriormente; não foram reaplicadas nesta execução.
- Catálogos: snapshot imutável reaproveitado após validar conta/identidade; índices e
  ordenações construídos somente quando usados; Intl.Collator reutilizado. Busca coopera
  em lotes de 100, pode ser cancelada e descarta respostas antigas. JSON é serializado
  antes da transação SQLite exclusiva, mantendo rollback e verificações de cancelamento.
- Físico: 38 livros pessoais preservados antes e após reiniciar. Catálogo existente:
  713 livros / 62 pastas visíveis (63 nós incluindo raiz). Abertura, busca, pastas, rolagem,
  Voltar, cancelamento real e nova tentativa exercitados; sem ANR registrado pelo Android.
  Indexação Google real terminou em 117.056 ms, com 713 livros e 62 pastas consultadas;
  serialização 11,8 ms e escrita SQLite 60,9 ms. Catálogo reaberto após encerrar o processo
  e também com Wi-Fi/dados móveis desligados, sem nova indexação. Rede restaurada.
  Tentativa anterior após segundo plano terminou em erro network após 34 pastas;
  carregamento terminou, índice anterior preservado e retry explícito posterior concluiu.
- Leitura SQLite inicial 49,2 ms, parse 7,7 ms, árvore inicial 15,6 ms e callback de frame
  após mount 748,1 ms no build de desenvolvimento. Busca cooperativa dos 713 registros:
  229 ms e 25 callbacks de timer; isso não mede FPS nem latência de toque. Não existe
  medição física anterior equivalente para afirmar percentuais de ganho ou encerrar todos
  os congelamentos intermitentes. Fixtures isoladas de 1.000/5.000/10.000 e cancelamento
  têm evidência controlada distinta do aparelho.
- Gates: typecheck, export Web e matriz crítica final 74/74 PASS; Sources UI controlada
  PASS; Chromium exportado PASS para navegação, busca, importação, IndexedDB/rollback,
  offline, remoção preservando arquivo e 1.000 livros com 24 cards montados. Testes foram
  adaptados às labels/ownership atuais e resposta HTTP retida explicitamente durante loading,
  sem depender de atraso artificial curto. Nova Sources UI incorporada à matriz crítica.
- Cadastro real autorizado: UI Verifique seu email; servidor confirmou uma identidade nova,
  um perfil ativo/user, plano Free automático e username ainda não reivindicado. Confirmação de e-mail, login posterior
  e login Google continuam em andamento; não declarar PASS completo por fixtures ou vetor
  PKCE. Senha e confirmação entram exclusivamente no Redmi; sem credenciais no Git.
  Importação física sob demanda e reprodução de todos os congelamentos continuam pendentes.
- Necessário futuro bundle Android para distribuir as correções; development build atual
  serve apenas à homologação. Sem migrations/configurações remotas, deploy ou cobrança.

### Resultado físico de Auth/Drive — 19/10/2026 (complemento)

- Cadastro de teste expressamente autorizado: identidade criada, e-mail confirmado,
  login por senha realizado, nome de usuário concluído pelo fluxo autenticado e perfil
  active/user com Free automático. Credenciais inseridas exclusivamente pelo proprietário
  no Redmi; e-mail e senha de teste não foram acrescentados ao Git.
- O link de confirmação foi aberto no computador: confirmou o e-mail no servidor, mas
  não poderia abrir o Android em outro aparelho. Entrada manual posterior no Redmi validada.
- No primeiro login houve falha ao consultar o perfil, apesar da senha e sessão aceitas.
  Tentar novamente recuperou o perfil com HTTP 200, sem modificar RLS. Causa desse evento
  intermitente permanece INCONCLUSIVA; não atribuir a credenciais inválidas nem encerrar
  esse acompanhamento por ter funcionado no retry.
- Isolamento real A/B: a conta de teste mostrou 34 assets bundled, zero livros privados
  da conta original e zero fontes atribuídas a ela. Uma fonte legada permaneceu sem adoção
  automática. A conta original foi restaurada por e-mail/senha e confirmada por getUser
  no servidor; voltou aos 38 livros, uma fonte ativa e um cadastro legado preservado.
- Login Google real: autorização abriu no Chrome do Redmi, o proprietário escolheu sua
  conta e confirmou. Logs remotos da janela 17:44–17:47 UTC registraram invalid_client
  na troca do código do provedor no /callback. NÃO houve sessão Google válida. Bloqueio
  EXTERNO na configuração OAuth Google/Supabase, distinto da autorização Native do Drive.
  Conferir o par Client ID/secret do provedor e seu callback exige acesso protegido e
  autorização específica; nada foi alterado no Google Cloud ou na configuração Auth.
- Detectada também corrida local: useURL recebia o endereço inicial do development client
  depois do evento de callback, substituindo a mensagem do provedor por origem inválida.
  Agora o Root captura o callback Native validado antes da tela; evento novo prevalece sobre
  initial URL atrasada. Cache contém só um URI efêmero, sem persistir/logar códigos; novas
  operações/logout o invalidam. Parâmetros de rota Native sozinhos não autorizam exchange.
  Esquema/host/caminho/credenciais continuam estritos. Ensaio físico com erro sintético
  confirmou mensagem do provedor e estado terminal correto; NÃO é PASS de login Google real.
- Nova reconexão Drive após trocar contas concluiu os mesmos 713 livros/62 pastas. Importação
  explícita de um EPUB real concluiu, ofereceu Abrir livro, abriu no Reader com controles e
  retornou à fonte pelo Voltar. Biblioteca passou legitimamente de 38 para 39, mantendo os
  anteriores; nova reabertura com o código final preservou os 39. Nenhuma fonte foi removida.
- Memória no development build ficou elevada (amostras PSS 712.814–913.368 KB; heap JS
  ~64 MB em uma amostra). Não comparar diretamente ao APK release inicial e não inferir
  vazamento/causa única desses números. Manter investigação de memória/congelamentos
  intermitentes; Android não registrou ANR nos ensaios. PDF físico não foi revalidado aqui.
- Gates finais: typecheck/export Web, 75/75 suítes críticas, Auth/callback/PKCE e ensaio
  Chromium do export atual PASS. Regressores incluem callback antes de mount, initial URL
  atrasada, reset de operação e parâmetros Native sem origem confiável. Provas físicas,
  fixtures e bloqueios do provedor permanecem distintos.
- Sem release/deploy/migrations/RLS/configuração OAuth/OWNER/pagamentos. Conta de teste
  real e operações normais autorizadas do aplicativo são as exceções explicitamente
  consentidas; não afirmar ausência total de escrita remota. A conta original está ativa.
  Development build depende do Metro local; distribuição independente requer futuro build
  Android autorizado. Rede e ajuste temporário de manter a tela ligada foram restaurados.
  Alterações documentais preexistentes e .gitignore permanecem preservadas fora destes commits.

### 20/10/2026 — Capas editoriais, Ajustes e organização do Admin

- Trabalho na main, partindo de 35d092bf512cc7f96d2c2ad864c956ade62462e7. As alterações
  preexistentes de .gitignore e destes dois documentos foram preservadas sem reset/clean/stash
  e não foram incluídas nos commits desta revisão.
- Capas: BookCover compartilhado por biblioteca, fontes/Drive, busca/detalhes e seleção
  de livros. Original disponível, miniatura alternativa quando fornecida e fallback editorial
  determinístico; carregamento/erro, proporção preservada, imagem pequena rejeitada e
  downsampling Android. Sem imagens geradas por IA, arquivos de placeholder ou busca externa.
  As 35 imagens estáticas existentes mantêm dimensões válidas e não foram substituídas.
- EPUB: declarações EPUB 3 cover-image, meta cover do EPUB 2 e guia HTML/raster, inclusive
  caminhos relativos fora da pasta do OPF. Extração apenas da capa declarada, limitada a
  1 MiB, com assinatura raster verificada; reaproveita recursos já lidos. Usa coverImagePath
  persistido existente. Arte inválida/ausente/grande não impede importação nem leitura.
  Não há reimportação automática de livros antigos. Capas vetoriais SVG não ganham um
  novo renderizador Native: nesses casos ou sem capa disponível usa-se o fallback editorial.
- PDF: Web mantém renderização só da primeira página, canvas limitado a 300 x 480 e
  destruição do documento/worker também em falhas. Android reutiliza miniatura local válida;
  o módulo atual só expõe OCR, não thumbnail, portanto sem miniatura usa o placeholder.
  Não foi acionado Reflow/OCR para gerar capas, nem adicionada dependência Native.
- Ajustes: identidade compacta, grupos Conta e plano, Leitura e aparência, Biblioteca e
  serviços, Comunidade e Privacidade e informações. Sincronização, tema, conforto e serviços
  usam subdivisões internas; preferências e operações anteriores continuam disponíveis.
  Índice Legal e informações público, além dos sete documentos públicos existentes.
  A entrada Admin depende da mesma autorização verificada no servidor.
- Admin: dez seções agrupadas em quatro áreas; lateral recolhível no desktop e menu
  fechado inicialmente no celular. Configurações em lista resumida, editor só após seleção,
  histórico e identificadores avançados recolhíveis. Contratos/chaves/RPCs/MFA/confirmações,
  revisões, auditoria e proteção do último OWNER preservados. Sem mutações administrativas reais.
- Leitura Livre: nenhuma otimização de produção adotada. Experimento local com o Weber
  empacotado (5.265.071 bytes, 584 páginas, 58.594 itens) comparou agrupamento linear a busca
  binária: medianas 213,96 ms e 191,49 ms em oito execuções alternadas; linhas e documento
  textual idênticos. Economia de ~22 ms insuficiente para justificar mudança sem prova Native.
  No mesmo ensaio Node/PDF.js 6.3.289: leitura 3,34 ms, base64 2,69 ms, abertura 167,91 ms,
  texto 7.374 ms, listas de operações 5.921 ms, montagem/validação 1.282 ms, serialização
  15,55 ms e gravação de arquivo temporário 16,17 ms. JSON de ponte foi apenas simulado.
  Houve dois avisos JBIG2 no desktop; pixels/OCR/ponte real/SQLite/memória móvel não foram
  validados nesse ensaio. Os ~212 s previamente informados no Redmi não são comparáveis.
  Extrator WebView/PDF.js 3.11.174, Reader, imagens, OCR, validação e cache de produção intactos.
- Qualidade: typecheck/export Web; matriz 79/79; novas regressões de capas/miniaturas,
  Ajustes e Admin, mais reexecução das suítes afetadas após revisão. Chromium do export:
  Admin com HTTP/Auth/TOTP sintéticos e PostgreSQL/PGlite isolado, dez seções e operações
  auditadas, edição/rollback de configuração, teclado, telas móveis e fonte ampliada;
  fontes com mil itens, 24 cartões montados, grade/lista, busca, importação e IndexedDB.
  Esses ensaios não são validação de Supabase gerenciado. Capturas locais em .expo/admin-validation
  e .expo/source-library-validation; medições/logs em artifacts/design-20261020 (ignorados).
  Bundle Web principal: 5.623.899 bytes contra 5.617.078 em 35d092b (+6.821); gzip
  1.472.471 contra 1.470.417 (+2.054). Zero dependências Native e imagens bitmap novas.
  Isso não mede RSS do Android nem tamanho de um APK com as novas telas.
- Redmi Android 16: development build já existente, compatível por assinatura, com JS novo;
  40 livros preservados (o proprietário confirmou a importação adicional desde os 39).
  Ajustes/Legal/temas/rolagem e fonte 1,3x após reabertura, fonte Teste, pastas e grade/lista
  exercitados. Catálogo em cache com 713 livros/62 pastas + raiz; pede reconexão para atualizar,
  sem novo consentimento, indexação ou importação nesta revisão. Três fontes atuais preservadas.
  Após mudar font_scale a automação precisou reabrir o development build para recuperar a
  árvore acessível; a captura já mostrava a biblioteca. Não classificar isso como ANR provado.
  Preferências restauradas (tema sistema, escala 1,0 e manter tela ligada 0).
- Entrega anterior concluída separadamente: APK independente 35d092b, 345.627.034 bytes,
  SHA-256 F0B152615D2A6F45C7DBA64414FBA25A14B6A125ABCFA5077E691EA0B1748117,
  artifacts/apk/Aldus-35d092b.apk e cópia USB Download/Aldus-35d092b.apk. Mesmo package/certificado,
  install -r, primeiro install preservado; restaurado no aparelho ao terminar e aberto sem Metro.
  Preview anterior somente homologação: https://kindle-reader-gzaek9u7j-matheus-projects-70f48ed9.vercel.app
  (commit 35d092b, conteúdo remoto verificado). APK/preview anteriores NÃO incluem esta revisão.
  Nova distribuição Android precisará de novo bundle/build autorizado; sem nova dependência Native.
- Sem novo APK de distribuição nesta revisão, deploy de produção, mudanças Supabase,
  migrations, OAuth, OWNER ou pagamentos. Push da main não aciona o projeto Vercel inspecionado:
  não há integração Git conectada; o preview anterior foi envio explícito estático.
