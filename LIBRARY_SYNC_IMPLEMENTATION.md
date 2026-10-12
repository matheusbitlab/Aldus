# Biblioteca vinculada à conta — 11/10/2026

Este checkpoint prevalece sobre afirmações históricas de ausência de ownership/sync. Retomar pelo próximo bloco incompleto; não repetir toda a auditoria. Baseline: `73f6dfe`, main; arquivos versionados limpos, somente caches Gradle não rastreados. Nenhum trabalho anterior descartado.

## Estado atual — fechamento do bloco 8

IMPLEMENTADO / VALIDADO CONTROLADO: blocos1–7 concluídos, bloco8 com documentação/legal e gates finais. Duas bases SQLite reais e restart em arquivo, PostgreSQL/PGlite executando as duas migrations, app Expo Web em Chrome com dois origins/IndexedDB PASS. Não equivale a Supabase/Storage HTTP real ou dois aparelhos físicos. Migrations CRIADAS — NÃO APLICADAS REMOTAMENTE. RLS REMOTO PENDENTE; STORAGE REMOTO PENDENTE; Android físico NÃO TESTADO. Inventário administrativo INCONCLUSIVO; implantação BLOQUEADA EXTERNAMENTE por ausência de acesso autorizado/admin/sessões reais de teste.

Sete commits iniciais têm APK PASS: 3be78c6 (157811058 bytes), d77f6e8 (157811058), 94b6ecb (157812334), 1e5cae9 (251434314), 2f21182 (251550590), 4313397 (251586402), 0b6b20b (251591062). Todos em artifacts/apk/Aldus-<hash>.apk, ignorados/não rastreados. O APK do commit final deve ser gerado imediatamente após commit; resultado durável em artifacts/apk/checkpoint.jsonl e relatório pós-commit artifacts/LIBRARY_SYNC_FINAL_REPORT.md. Não declarar PASS do último APK antes desse registro.

Os checkpoints por bloco abaixo preservam fatos históricos; pendências e estados de SDK anteriores foram superados quando indicado. Retomada: consultar ledger/relatório pós-commit para fechar commit/APK8, se faltar, e depois executar apenas as ações externas de LIBRARY_SYNC_DEPLOYMENT.md. Capa personalizada é etapa futura.

## Auditoria e mapa anterior

| Dado | Persistência anterior | Remoto anterior |
| --- | --- | --- |
| Book, arquivo EPUB/PDF, capa extraída, capítulos | SQLite/arquivos privados Native; IndexedDB/Blob Web | Não |
| Progresso/CFI/página/âncora | SQLite/IndexedDB; posições PDF também AsyncStorage | Não |
| Marcadores e notas | SQLite/IndexedDB, ID independente, `note` | Não |
| Grifos e comentários | SQLite/IndexedDB, ID independente, comentário em payload CFI | Não |
| Favoritos, coleções, tags, série/volume, estado, título/autor editados | AsyncStorage organization V1, revision local | Não |
| Proveniência da Source | sourceId/remoteBookId → bookId, SQLite/IndexedDB separado | Não |
| Conta, sessão e perfil | Supabase Auth/perfil + cache local | Sim |
| Outbox/biblioteca privada/Storage pessoal | Não existiam | Não comprovado |

Source Library permanece catálogo da fonte, não biblioteca pessoal. Importadores/download/parser/Reader/OCR existentes são reutilizados. Notes não têm repositório independente. EPUB/Reflow/Original conservam os recursos de estudo que já oferecem; sincronização não cria seleção textual em modos sem esse suporte.

## Bloco 1 — ownership local

IMPLEMENTADO: `ownerUserId`, account-scoped repository e guardas das entidades filhas/organização; SQLite migration v4 incremental, IndexedDB v5 compatível; sessão revoga scope sincronamente, limpa snapshot e rejeita resultados tardios. Repositórios verificam ownership em lookup por ID e mutações, não apenas filtros visuais. Logout/B não expõem A; relogin A conserva dados. SQL UPSERT preserva filhos, evitando cascata de INSERT OR REPLACE.

Legados: dono ausente/null permanece preservado e oculto da biblioteca da conta; `listLegacy/claimLegacy` permite adoção explícita. UI será incluída no bloco 6. Assets bundled recebem IDs locais por conta e mantêm assetId estável; bytes empacotados não precisam upload. Novas importações usam UUID, não filename/título+autor. Hash anterior era opcional/null, não existia cálculo grande obrigatório; integridade será tratada no bloco 4.

VALIDADO: teste `scripts/test-library-account.cjs` com SQLite real/ponte controlada, migration, legacy claim, A/logout/B/A, lookup/mutação cross-account, stale read e preservação de notas; typecheck; import lifecycle/download, organização e study-storage controlados PASS antes dos últimos ajustes de proteção/UUID. Gates finais do bloco serão registrados antes do commit.

PENDENTE: blocos 2–8; sync remoto/outbox/arquivos/progresso/UI/legal. NÃO TESTADO: Android físico e Auth/RLS/Storage real. INCONCLUSIVO: inventário administrativo remoto, nenhuma credencial administrativa disponível no ambiente auditado. BLOQUEADO EXTERNAMENTE: aplicação/verificação remota exige acesso autorizado ao projeto.

## APK obrigatório por commit

Infraestrutura oficial preservada: `npm run build:apk:local` → `scripts/build-apk-local.mjs` → Gradle assembleRelease. `scripts/archive-commit-apk.mjs` exige worktree/staging versionados limpos, captura HEAD antes/depois, chama o script oficial e arquiva `artifacts/apk/Aldus-<hash>.apk`. `artifacts/` e APKs estão ignorados; nenhum binário entra no Git. JDK17/SDK existentes configurados apenas no processo. Evidência pós-commit, que não pode fazer parte do próprio hash, fica no checkpoint durável local **artifacts/apk/checkpoint.jsonl**, com hash/path/tamanho/status/comando/log. Documentos de blocos posteriores incorporam os resultados já conhecidos.

Estado pré-commit: build inicial falhou por SDK location not found; repetição com `JAVA_HOME=C:/Program Files/Java/jdk-17`, `ANDROID_HOME=C:/Android/sdk` confirmou **APK BLOQUEADO POR AMBIENTE**: Platform36 e Build Tools35 ausentes/licenças não aceitas. SDK Manager não foi encontrado instalado. Tentativa de instalar somente Command Line Tools oficiais, checksum publicado conferido antes de executar; resultado será registrado. Não atribuir APK histórico a novo commit. Desbloqueio: SDK Manager legítimo, aceitar licenças e instalar `platforms;android-36`, `build-tools;35.0.0`, `build-tools;36.0.0`; repetir build oficial. Nenhuma migration histórica alterada.

## Ordem de continuação

1. Concluir gates/staged review/commit/APK bloco 1.
2. Auditar remoto read-only; criar schema/RLS/Storage incremental sem aplicar por hipótese.
3. Outbox persistente, engine/reconciliação/versionamento/conflitos/tombstones.
4. Transferência privada, cloud-only, integridade e abertura sob demanda.
5. Progresso/entidades pessoais existentes.
6. UI/ações/remoção/adoção explícita de legados.
7. Harness A/B/dispositivos e segurança SQL/Storage.
8. Textos de privacidade, documentos e validação final.

Gates finais bloco1 PASS: typecheck (após guardas Blob/PDF settings), test-library-account, test:import (após UUID/cancelamento de conta), test-library-organization, test-study-storage, export:web (2362 módulos) e diff check. Web exportado; UI e IndexedDB por esta matriz nova ainda NÃO TESTADOS. APK pós-commit registrado no ledger local.

## Bloco 2 — schema privado/RLS/Storage

IMPLEMENTADO: migration nova 202610110001_private_account_library.sql. user_library_items usa ownership auth.users, PK composta conta/kind/id, entidades independentes book/progress/bookmark/highlight/organization/pdf_position, revision por sequência servidor, updated_at servidor e deleted_at. Outbox usará RPC library_apply com CAS e recibo idempotente por operation UUID; cliente não tem escrita direta/sequence/recibos. Tombstone é permanente para a mesma identidade; novo import gera novo UUID. Payload máximo256KiB; arrays de grifos não são substituídos. Inventário read-only 02_library_sync_inventory.sql preparado.

Bucket aldus-private-library PRIVADO, limite preparado512MiB (plano remoto pode limitar mais), MIME EPUB/PDF, caminhos conta/livro/SHA256.ext, objetos imutáveis sem UPDATE/upsert. Policies próprias + fences RESTRICTIVE restringem policies permissivas preexistentes para este bucket. SELECT exige arquivo publicado em livro ativo; anon negado. INSERT exige livro ativo próprio; delete só prefixo próprio. Função de policy security definer com search_path vazio faz somente teste booleano próprio, permitindo negar anon sem exigir SELECT na tabela privada. Sem URL pública/service_role cliente/compartilhamento.

VALIDADO CONTROLADO: PostgreSQL real WASM PGlite executou migration inteira e RLS A→B/B→A/anon, Storage policies de listar/insert/update/delete, inclusive com policies permissivas preexistentes simuladas; CAS/retry/recibo alterado/relitura .9→.1/tombstone/filho após delete PASS. Não simula nem prova serviço HTTP Storage. Ferramenta instalada isoladamente em .expo/library-db-test, sem dependência do app/lockfile: npm install --ignore-scripts --package-lock=false --no-save --prefix .expo/library-db-test @electric-sql/pglite.

MIGRATION CRIADA — NÃO APLICADA REMOTAMENTE. Sonda pública atual: Auth200, OpenAPI401, tabelas antigas401/42501, username-login404. Somente configuração pública; sem acesso Postgres/admin/sessão de teste. RLS REMOTO PENDENTE; STORAGE REMOTO PENDENTE. Inventário remoto/schema/grants INCONCLUSIVOS. Aplicar somente após executar inventários e comparar migrations reais; não reaplicar históricas.

Bloco1 commit3be78c6 — feat: scope local library by account. APK pós-commit FAIL,0bytes/nenhum APK criado; log artifacts/apk/build-3be78c6.log: APK BLOQUEADO POR AMBIENTE (Platform36/BuildTools35/licenças). Download do SDK Manager oficial ainda em andamento; nenhum artefato antigo renomeado. Ledger durável artifacts/apk/checkpoint.jsonl.

PENDENTE: blocos3–8; Android físico/Supabase/Storage real NÃO TESTADOS. Bloco2 APK será executado imediatamente após commit e registrado no mesmo ledger.

## Bloco 3 — engine/outbox/reconciliação

IMPLEMENTADO: LibrarySyncService dedicado, persistence SQLite v5/IndexedDB v6 com transações estritas; read-modify-write Web atômico entre janelas. Entidades com fila dirty/ready, operation UUID, baseRevision/shadow e escrita antecipada antes da mutação local. Escrita local interrompida não é enviada ao servidor até ser reaplicada; falha não anuncia sucesso. Retry preserva operationId e usa receipt servidor; IDs independentes evitam duplicatas.

Pull inicial aprende tombstones antes de enviar filhos offline; push usa CAS; pull final reconcilia metadados. Tombstones de livros anulam alterações pendentes de filhos e impedem recriação. Conflitos da mesma entidade preservam intenção local separadamente e aplicam estado ordenado pelo servidor, com resolução explícita local/remoto. Percentual maior NÃO vence; releitura .9→.1 testada. Network requests congelam JWT da conta por operação: troca para B não envia payload A com sessão B. Respostas antigas descartadas por generation+Abort. Sem polling; ligação aos gatilhos/UI será concluída no bloco6. Nenhuma UI chama Supabase diretamente.

VALIDADO CONTROLADO: test-library-sync usa duas bases SQLite separadas e adapters controlados: offline/outbox/retry/resposta perdida/conflitos/releitura/tombstone vs nota offline/replay de escrita interrompida/troca de conta PASS. test-library-account atualizado v5 PASS; typecheck anterior aos últimos ajustes PASS, gate final em execução. IndexedDB atômico novo ainda requer browser real; Android/HTTP Supabase real NÃO TESTADOS.

PENDENTE: wiring dos dados/transferência/reading/UI/gatilhos/legal (blocos4–8), real remote. Migration permanece NÃO APLICADA. Bloco2 commit d77f6e8 APK FAIL/nenhum arquivo/0bytes, APK BLOQUEADO POR AMBIENTE, log artifacts/apk/build-d77f6e8.log. SDK Manager oficial segue download seguro; recordar resultado antes do fechamento.
Gates finais bloco3 PASS: typecheck, test:library:sync, test:library:account, export:web e diff check. SDK Manager oficial instalado e checksum SHA256 validado; licenças aceitas, componentes Android em instalação. APK pós-commit executado antes do próximo bloco.

## Bloco 4 — arquivos privados e integridade

IMPLEMENTADO: PrivateBookFileService e SupabaseBookFileDriver enviam o arquivo definitivo depois do import local completo. JWT congelado por operação; endpoints autenticados, sem URLs públicas ou tokens persistidos. Native usa upload binário pelo FileSystem; Web usa Blob. SHA256 incremental de 1 MiB, @noble/hashes2.0.1 MIT, notices/lockfile atualizados. Limite cliente 512 MiB, sujeito a limite menor do plano. Upload padrão/retry reinicia a transferência; TUS e retomada entre execuções NÃO IMPLEMENTADOS. Erro remoto preserva o livro local.

CLOUD_ONLY tem remotePath/hash/tamanho e filePath vazio. Download temporário, tamanho/SHA, staging dos importadores reais EPUB/PDF, promoção e capítulos precedem publicação do ponteiro. EPUB valida ZIP/XML/capítulos; PDF usa assinatura e checksum, decodificação completa no Reader. IDs e progresso preservados. Cancelamento/epoch descarta resposta tardia. Resposta perdida de upload recupera objeto existente por download privado e checksum antes de publicar. Remoção só local verifica remoto e guarda eviction durável para retry.

Migration 202610110002_private_library_file_recovery.sql CRIADA/NÃO APLICADA. SELECT permite ao dono acessar SHA-object de livro próprio não publicado ou tombstoned, para recovery e DELETE do Storage. INSERT exige pai ativo; UPDATE negado; outras contas/anon negados. Esta regra supersede SELECT somente publicado/ativo da migration1, mantendo privacidade.

Manifesto de 34 assets versionados com SHA/ID por conteúdo; aliases de IDs antigos preservam adoção explícita. Catálogo PDF corrigido para assets/Livros/. Catálogos incluem tombstones e não recriam livro removido. Assets confiáveis não são enviados. Capas extraídas são locais; capa personalizada nova fora do escopo. Web Book+metadata/Chapters/Blob usam transações estritas e ownership, sem falso sucesso em memória.

VALIDADO CONTROLADO: files com HTTP controlado e importadores reais, hash comparado a Node, offline/upload perdido/cloud-only/download/PDF/EPUB/formato inválido/corrupção/cancelamento/remover só local/reabrir PASS. Account/Sync/Import/RLS PostgreSQL controlado/Typecheck/Legal/Export/diff check PASS. Supabase/Storage HTTP real e Android físico NÃO TESTADOS; implantação BLOQUEADA EXTERNAMENTE por falta de admin; inventário INCONCLUSIVO.

APK bloco3 94b6ecb PASS, 157812334 bytes, build oficial 3m6s/981 tarefas após reparo SDK. Falhas SDK e primeira compilação x86 preservadas; mesmo alvo/código passou com -j1, causa transitória exata INCONCLUSIVA. SDK Manager oficial/checksum, Platform36/BuildTools35+36/CMake3.22.1/licenças instalados. APK ignorado/não rastreado. APKs1/2 ainda estavam pendentes neste checkpoint histórico; recuperação final registrada no topo e no bloco8.

## Bloco 5 — dados de leitura e repositories

IMPLEMENTADO: composition root liga repositories account-scoped à replica/journal/engine. LibraryLocalReplica usa owner+epoch, allowlist, proteção de colisão de IDs e caminhos locais. Livro remoto vira metadata-only ou asset bundled verificado. Import completo é salvo primeiro com syncUnjournaled durável; falha de outbox preserva livro e seed recupera. Mutação normal/DELETE usa write-ahead. Seed serializado lê estado atual, preserva dirty/conflict/tombstone e igualdade canônica evita eco de pulls.

Progresso capítulo/CFI/página/percentual bidirecional, ordenado pelo backend, incluindo releitura. Marcadores/notas e grifos/comentários com IDs estáveis independentes e tombstones individuais. Favoritos/coleções/tags/série/volume/status/título/autor personalizados por organização de cada livro. Capa não enviada. PDF sincroniza modo e posições Original/Reflow separadas; aparência/cache/OCR locais. Nenhum recurso de estudo novo em modo que não o oferecia.

Backup importPreservingExisting preserva atomicidade/idempotência. Merge da organização conserva transação com intents escritos antecipadamente em lote; conflito de revision local restaura intent anterior por operationId, sem replay indevido. Guardas verificam key==bookId; WebProgress/Blob estritos e com ownership. Falhas remotas não destroem dados locais.

VALIDADO CONTROLADO: duas bases SQLite reais/repositories/replica+journal/backend controlado, import offline, metadata B, progresso A→B→A .9→.1 e âncora, marcadores independentes/notas/comentários/deletes, favoritos/coleções/tags/PDF separado/aparência local, merge/revision conflict/ausência de qualquer RPC por eco/tombstone vs nota/A/logout/B PASS. ReaderScreen/Import/StudyStorage/Organization/Typecheck/Reading/Sync/Export/diff check PASS.

APK bloco4 1e5cae9 PASS, 251434314 bytes, build oficial 2m20s/981 tarefas. Aumento inclui os PDFs bundled do diretório correto, antes ausentes daquele catálogo. Ignorado/não rastreado/worktree limpo. Android físico NÃO TESTADO, ADB sem aparelhos. Duas migrations NÃO APLICADAS; RLS/Storage REMOTO PENDENTES. Os gatilhos/UI/integral Web/restart/legal ainda estavam pendentes neste checkpoint histórico; concluídos nos blocos seguintes.

## Bloco 6 — execução, estados e controles

IMPLEMENTADO: LibrarySyncCoordinator liga seed/outbox/pull, publicação do livro antes do upload, publicação de remotePath depois do upload e cleanup apenas depois de tombstone confirmado. Sync ao login/perfil ativo, foreground, retorno de rede (expo-network já instalado), importação/edição com debounce de 2,5s e ação manual; sem polling. Falha preserva biblioteca local. Pull não baixa arquivos. OpenBookUseCase chama ensureLocal; Reader cancela download ao desmontar. UI recebe LOCAL/SYNC_PENDING/UPLOADING/SYNCED/CLOUD_ONLY/DOWNLOADING/ERROR independentemente de readingStatus. Refresh após sync consulta somente dados locais e evita reimportação/loop dos catálogos.

Ajustes: estado, última sincronização, operações pendentes, erro/retry manual, conflitos com escolha explícita e adoção selecionada de livros antigos sem conta. Biblioteca: rótulo discreto e opções com confirmação separada. Remover cópia exige remotePath publicado/sem conflito e verifica bytes remotos antes de limpar ponteiro/eviction. Remover biblioteca escreve tombstone offline; DELETE privado acontece após confirmação e é retomado em falhas. Tombstone do pai impede reaplicação de conflito filho. Bytes locais de livros removidos permanecem inacessíveis no app; não se promete apagar caches de outros dispositivos. Sem capa personalizada nova, links públicos ou sharing.

Auth: eventos revogam imediatamente scope e resolução anterior, callbacks enfileirados/getSession ignoram resultado ultrapassado; refresh e signOut não restauram sessão anterior. Status e store usam geração, inclusive A→B→A. Política/Resumo/Termos v0.5 corrigidos antes de ativar uploads: privados no Supabase, automático, offline, exclusões e ausência de E2E; revisão final no bloco8.

VALIDADO CONTROLADO: test:library:coordinator com repositories SQLite reais prova import offline funcional, metadata antes do Storage, arquivo antes da publicação, nenhum download automático, OpenBook sob demanda, remover só local/reabrir, cleanup confirmado e tombstone/conta. Files/Reading/Sync, Auth flows instalados, ReaderScreen, Legal, typecheck e export:web PASS. Staged review explícito e diff check antes do commit. UI real/browser e restart em arquivo serão ampliados no bloco7. Android físico NÃO TESTADO; Supabase/RLS/Storage remoto PENDENTE, duas migrations CRIADAS/NÃO APLICADAS por ausência de admin. Inventário remoto INCONCLUSIVO; implantação BLOQUEADA EXTERNAMENTE.

APK bloco5 2f21182 PASS: C:/Kindle/artifacts/apk/Aldus-2f21182.apk, 251550590 bytes. Build oficial 1m14s/981 tasks. Ignorado, não rastreado, staging/worktree limpos; log build-2f21182-20261011230005070.log. APK bloco6 deve ser feito antes do bloco7 e registrado no ledger local.

## Bloco 7 — segurança e duas bases/dispositivos controlados

IMPLEMENTADO: validação de IDs remotos (tipo, comprimento, travessia, controles e prototype), datas/revisões/payloads limitados; conflito filho de pai tombstoned não reaplicável. Transferência/eviction por conta impede remoções concorrentes e download/upload durante eviction. Ponteiro vazio não é tratado como cópia local pronta, mesmo se restou Blob após falha de disco. Paths de remoção nativa recusam travessia. Cleanup confirmado lista apenas owner/book e apaga também objetos de upload com resposta perdida, com lista privada autenticada e paths SHA validados; falha mantém pendência durável. Status inclui exclusões de arquivo pendentes.

VALIDADO CONTROLADO: novo test:library:restart fecha/reabre dois arquivos SQLite, import/outbox offline, replay de gravação interrompida, releitura/âncora, metadata-only B, tombstone persistente e IDs/payloads maliciosos. Auth lifecycle testa callbacks A/B/A, getSession e profile atrasados e INITIAL_SESSION síncrono, todos PASS. Files usa PDF real gerado por pdf-lib, hash/bytes conferidos e decodificação controlada, erro de disco/retry, corrupção e cancelamento. Coordinator prova cleanup de objeto órfão de resposta perdida. Account/Reading/Sync/RLS PostgreSQL controlado PASS.

test:library:web PASS no app Expo exportado, Chrome headless isolado: dois origins com IndexedDB separados, EPUB real importado offline e preservado no reload; upload HTTP privado, B recebe metadados sem download, abre Reader real após baixar/validar, remove apenas local e reabre, aborto de transação da outbox conserva estado, exclusão se propaga e troca de conta nega Reader anterior. Iframe mantém sandbox; verificação usa texto real em srcdoc e callback de paginação recebido pelo host, sem retirar sandbox. Backend/Auth/Storage HTTP são fixtures controladas, NÃO Supabase real. Screenshots ignorados .expo/library-sync-validation. Sources browser regression PASS: lista/busca/index/import/reopen/offline/remove e IndexedDB rollback, 1000 itens/24 cards montados.

Gates: typecheck, account, sync, files, reading, coordinator, restart, RLS, Auth flows, ReaderScreen, Sources browser e export:web PASS; diff check/staged review explícito antes do commit. NÃO TESTADO: Android físico (ADB sem dispositivos), Supabase/RLS/Storage HTTP real. Migrations 1+2 CRIADAS/NÃO APLICADAS; acesso admin ausente, implantação BLOQUEADA EXTERNAMENTE e inventário remoto INCONCLUSIVO.

APK bloco6 4313397 PASS: C:/Kindle/artifacts/apk/Aldus-4313397.apk, 251586402 bytes, pipeline oficial, ignorado/não rastreado/estado do commit conferido. Recuperação dos APKs1/2 em checkout separado .expo/apk-worktrees, sem reset/stash do principal: primeira tentativa do hash3be78c6 falhou por JVM EXCEPTION_ACCESS_VIOLATION em R8; retry com worker1 falhou no linker de Reanimated por debug info inválida. Logs e JVM crash preservados; cache PCH gerado sendo recompilado, causa ainda INCONCLUSIVA até sucesso. Não atribuir APK de outro hash. APK bloco7 obrigatório após este commit.

## Bloco 8 — legal, documentação e fechamento

IMPLEMENTADO: Política/Resumo/Termos0.5 corrigidos antes da ativação no bloco6; revisão final inclui finalidade de sync e seção de direitos autorais para armazenamento privado, sem alegar aquisição dos direitos da obra. Inventário legal distingue dados remotos/local, ausência de E2E, exclusão com confirmação/retry e retenção de tombstones/recibos/caches/backups. Responsável/canal, prazos de retenção/expurgo, região e operação comercial permanecem externos, sem promessas inventadas.

Documentos principais atualizados; checkpoint4/5 reparado em UTF8 sem perder fatos. LIBRARY_SYNC_DEPLOYMENT.md contém passos de inventário, migrations novas, RLS/Storage HTTP A/B/anon e cenário A/B real. LIBRARY_SYNC_FINAL_REPORT.md cobre os 41 itens; versão pós-commit ignorada incorpora hashes/tamanhos finais e lista exata de arquivos.

Revisão das fontes oficiais Supabase encontrou HTTP400 legado para duplicidade de upload além de409 atual. Driver agora aceita400 SOMENTE com código de duplicidade identificado e mantém download/SHA/tamanho antes de publicar. Teste Web + fronteira Native controlada, erro400 genérico/inválido negado e recovery completo PASS. Supabase HTTP real permanece NÃO VALIDADO.

Recuperação APK1: SDK oficial reparado, checkout separado do hash intacto, JVM R8 EXCEPTION_ACCESS_VIOLATION, PCH/debug info inválida e limite de caminho Windows registrados. Mesmo alvo native recompilado com Ninja -j1 após remover apenas PCH gerado; checkout movido legitimamente para C:/a1 após parar daemon, sem reset/clean/stash do principal. Build oficial worker1 PASS14m5s/981tarefas. Causa exata do crash/PCH INCONCLUSIVA; ambiente recuperado, sem alterar aquele código. APK2 PASS1m47s, mesmo binário legítimo pois mudança era SQL/documentação e Gradle confirmou up-to-date. APK7 PASS10m30s, 251591062bytes. Logs de todas tentativas preservados/copied ao artifacts/apk e ledger; nenhuma falha ocultada, nenhum APK de outro hash renomeado.

Gates finais bloco8 PASS: typecheck, files (HTTP400/409, Native boundary, erro400 genérico e bytes remotos corrompidos não publicados), coordinator, legal/notices, export:web (2413 módulos), Web integral com dois origins/IndexedDB/Reader e legal browser claro/escuro/scroll5947/5947/retorno login. ADB continua sem dispositivos. node --check do gerador de relatório e diff check PASS; staged review explícito antes do commit. APK8 obrigatório em seguida, source/staging limpos, ledger pós-commit. PENDENTE EXTERNO: acesso/aplicação/validação remota, retenção/operação e Android físico. NÃO TESTADO: serviço Supabase/Storage real e aparelhos físicos. INCONCLUSIVO: inventário admin e causas transitórias antigas do ambiente. Nenhuma migration histórica reaplicada, nenhuma credencial/admin criada, nenhum envio público de livros.
