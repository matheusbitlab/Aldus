# Aldus Reader — Contexto do Projeto

Atualizado em 15/10/2026. Fonte única de contexto permanente para IA.
Problemas ativos: [BUGS_ATUAIS.md](BUGS_ATUAIS.md). Código: HEAD atual da branch,
identificado pelo Git e pelo build-info.json do export, sem hash autorreferente inventado.
Branch única de integração: integration/comunidade-literaria. Reconciliação por Git após
fetch confirmou 7f50a9048876aec350186b594006c24f2bc73a22 como ancestral de
ea30fabe26405db6e1cf9f9870814ad903c3b9f3, ambos já publicados nessa branch.
Community integrada e origin/main (52456d9) também são ancestrais; nenhum merge adicional
necessário. As duas campanhas estão preservadas, sem reescrever história ou alterar main.
APK: PENDENTE DE BUILD CONSOLIDADO; nenhum APK gerado nesta campanha.

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
Supabase/Vercel aparecem instalados no catálogo de plugins nesta sessão, mas não expõem
ferramentas administrativas utilizáveis; isso supera a nota antiga de plugin não instalado.
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

Package com.aldus.reader, scheme aldus; applicationId antigo com.kindle.reader não compartilha
automaticamente dados privados com o novo. Versão/code genéricos não identificam um commit.
Infra local: android/ versionado, JDK 17 e SDK/build-tools/NDK declarados no Gradle.
Comandos existentes: npm run build:apk:local, build:apk:archive e build:apk (EAS preview APK).
Somente executar quando solicitado; não gerar APK por commit automaticamente.
O guard de variáveis públicas é compartilhado entre export Web e wrapper Android,
antes de embutir JS; configuração insegura impede build sem imprimir valores.

Release local usa a debug.keystore existente para testes; produção/EAS/Play exigem certificado
apropriado e fingerprint do artefato efetivo. Não atribuir SHA de debug a Play.
Artefatos ficam ignorados em artifacts/apk e não entram no Git; identidade exige hash,
tamanho, assinatura, package e fonte/bundle correspondente. Compilar não comprova instalação
ou funcionamento. Atualização física preserva dados; não desinstalar/limpar como diagnóstico.
JS pode usar Metro em development build compatível; APK release requer build consolidado
futuro para incluir o novo bundle. Esta campanha explicitamente não gera APK.

Wrapper local Windows usa caminho absoluto de gradlew.bat, com quoting para espaços e
windowsVerbatimArguments. Corrigido lookup quando NoDefaultCurrentDirectoryInExePath=1;
test-android-build-command.cjs reproduz o defeito e executa somente um .bat temporário de
echo, nunca Gradle. Package, keystore, versionCode=1 e versionName=1.0.0 não mudaram.
Antes de publicação futura, comparar versionCode com Play/instalação e escolher inteiro
maior; preservar certificado da linha instalada ou planejar migração. Não trocar por debug.

## 16. Git e fluxo de trabalho

Antes de editar: git status --short, branch --show-current, rev-parse HEAD e log recente.
Preservar trabalho existente; stage somente arquivos relacionados, revisar cached diff e check.
Commits por bloco, push da branch de trabalho após validação; sem force push, reset, clean,
stash ou descarte em massa. Nesta campanha, somente origin/integration/comunidade-literaria;
main permanece intocada. Migrations históricas são imutáveis; incrementais só após inventário.
Nunca commitar .env.local, tokens, secrets, keystores privados, APKs ou livros pessoais.

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
- Franquias/cotas/assinatura/billing são propostas sem preços ou integração pronta.
  Credenciais ficam no servidor; cancelamento de plano não tira cartões/revisão/export locais.
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
