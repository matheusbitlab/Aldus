# Biblioteca vinculada à conta — 11/10/2026

Este checkpoint prevalece sobre afirmações históricas de ausência de ownership/sync. Retomar pelo próximo bloco incompleto; não repetir toda a auditoria. Baseline: `73f6dfe`, main; arquivos versionados limpos, somente caches Gradle não rastreados. Nenhum trabalho anterior descartado.

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

## Bloco 4 ? arquivos privados e integridade

IMPLEMENTADO: PrivateBookFileService + SupabaseBookFileDriver; upload do arquivo definitivo somente depois do import local completo e registro remoto (coordinator no pr?ximo bloco). Storage autenticado com JWT congelado por opera??o, sem URL p?blica/signed URL/token persistido. Native upload BINARY_CONTENT pelo FileSystem, sem arquivo inteiro em RAM JS; Web envia Blob. Hash SHA256 incremental em blocos de1MiB (@noble/hashes2.0.1 MIT, lockfile e notices atualizados). Limite cliente512MiB, plano/bucket remoto pode limitar mais. Upload padr?o, retry reinicia transfer?ncia; TUS/resume entre execu??es N?O IMPLEMENTADO. Erro mant?m arquivo local utiliz?vel.

CLOUD_ONLY: metadata tem remotePath+hash+tamanho e caminho local vazio. ensureLocal baixa em temp, compara tamanho/hash, reutiliza importadores EPUB/PDF existentes contra staging isolado, promove Blob/arquivo e cap?tulos antes de publicar caminho local. EPUB valida ZIP/XML/cap?tulos; PDF reutiliza valida??o de assinatura existente, decodifica??o completa cabe ao Reader. Progresso e IDs n?o s?o reimportados/substitu?dos. Cancelamento/epoch e cleanup tardio; recovery de perda de resposta faz409?download privado?checksum?publica??o idempotente. Remover s? c?pia verifica c?pia remota primeiro e mant?m marcador de eviction dur?vel para retry; UI/coordinator no bloco6. SDK Android f?sico ainda N?O TESTADO.

Migration incremental202610110002_private_library_file_recovery.sql CRIADA, N?O APLICADA REMOTAMENTE. SELECT privado permite ao dono verificar objeto n?o publicado de livro pr?prio e acessar objeto pr?prio tombstoned para API DELETE do Storage (exige SELECT+DELETE); outros usu?rios/anon continuam negados, INSERT exige pai ativo, UPDATE negado. Esta regra substitui o requisito anterior de publica??o ativa somente para leitura; n?o muda ownership nem publica arquivos. Cleanup ap?s tombstone confirmado ser? conectado no bloco6; reten??o at? retry deve constar na pol?tica.

Bundled: manifesto de34 assets versionados com SHA256 por stream e IDs derivados do conte?do, n?o nome/t?tulo. resolve conserva aliases locais hist?ricos para ado??o expl?cita; dados antigos preservados, incluindo bundled unowned agora eleg?veis a claim. Cat?logo PDF corrigido de Livros/ ausente para assets/Livros/. Cat?logos consultam registros owned inclusive tombstones: reload n?o ressuscita bundled removido. Assets confi?veis n?o s?o enviados. Capa personalizada continua fora do escopo; capas extra?das continuam locais e podem ser reextra?das ao baixar.

Web: Blob, Book e Chapters passam a persist?ncia estrita; Book+metadata e substitui??o de cap?tulos t?m transa??o at?mica/oncomplete, sem sucesso fict?cio em mem?ria. Falha de storage permanece erro. Migrations hist?ricas n?o alteradas. Gera??o de manifest: node scripts/generate-bundled-book-manifest.mjs (somente arquivos j? versionados).

VALIDADO CONTROLADO: test:library:files usa HTTP/Storage controlados e importadores reais, Node SHA256 comparado a leitura em chunks, offline, upload de resposta perdida, download metadata-only/sob demanda, formato inv?lido, corrup??o, cancel conta, remover local/reabrir PASS. SQL real controlado/PGlite executa as duas migrations, ownership/anon/fences e DELETE p?s-tombstone PASS. Account/Sync/Import PASS. Gates finais Typecheck/Legal/Export em execu??o. Supabase HTTP/Storage HTTP real e Android f?sico N?O TESTADOS; RLS REMOTO PENDENTE; STORAGE REMOTO PENDENTE. Deploy remoto BLOQUEADO EXTERNAMENTE por aus?ncia de acesso administrativo; invent?rio remoto INCONCLUSIVO.

APK bloco3 94b6ecb PASS: C:/Kindle/artifacts/apk/Aldus-94b6ecb.apk,157812334bytes, build oficial3m6s/981tasks ap?s SDK repair. Primeira tentativa SDK concorreu com instala??o e foi preservada em build-94b6ecb-sdk-install.log; primeiro build nativo falhou no compiler x86 sem diagn?stico em build-94b6ecb-native-first.log. Mesmo alvo/c?digo PASS -j1, causa exata transit?ria INCONCLUSIVA; pipeline oficial repetido com workers.max2 PASS, sem alterar c?digo/arquiteturas. SDK Manager oficial/checksum, Platform36/BuildTools35+36/CMake3.22.1/licen?as instalados. APK ignorado/n?o rastreado/staging limpo conferidos. Archive usa log ?nico por tentativa e workers.max2 por padr?o no processo. APKs3be78c6/d77f6e8 permanecem pendentes de recomposi??o isolada dos hashes; falhas e0bytes no ledger.

PENDENTE: wiring/triggers/leitura/UI/legal/matriz final (blocos5?8). Checkpoint APK ap?s commit ? artifacts/apk/checkpoint.jsonl, n?o reutilizar APK de outro hash.
Gates finais bloco4 PASS: typecheck, import, account, sync, files, RLS PostgreSQL controlado, legal/notices, export:web e diff check. Assets com cache já processado conservam caminho/capítulos/progresso. Próximo passo: staged review/commit/build oficial e conferir APK antes do bloco5.

## Bloco 5 ? dados de leitura e liga??o aos repositories

IMPLEMENTADO: composition root conecta AccountBookRepository e child/organization repositories ? engine; raw repositories ficam internos. LibraryLocalReplica faz apply/seed com owner+epoch, allowlist de campos, colis?es de IDs negadas e rejei??o de caminhos locais remotos. Livro recebido vira metadados/caminho vazio ou asset bundled com SHA confi?vel. UI ainda n?o dispara rede; ativa??o/gatilhos no bloco6. Import incomplete oculto; import completo gravado primeiro com syncUnjournaled dur?vel, falha de outbox n?o desfaz livro v?lido e pr?ximo seed recupera. Book normal/DELETE usa write-ahead. Seed l? dado atual dentro da fila exclusiva; preserva dirty/conflict/tombstone; equality can?nica evita eco de pulls.

Progresso bidirecional com chapter/CFI/p?gina/percentual; updatedAt local n?o arbitra conflito. Marcadores/notas e grifos/coment?rios usam entidades est?veis independentes, remove offline vira tombstone individual. Favoritos, cole??es, tags, s?rie/volume/status e t?tulo/autor personalizados via organization, por livro; capa extra?da/customizada n?o enviada. PDF sincroniza modo e posi??es pr?prias Original/Reflow; apar?ncia/cache/OCR ficam no dispositivo. Recursos de estudo continuam limitados aos modos que j? os oferecem.

Backups: importPreservingExisting mant?m atomicidade/idempot?ncia e seed recupera entidades novas; organization merge mant?m transa??o existente com intents de entidades escritas antecipadamente em lote. Revision conflict local rejeitado n?o vira replay: fila anterior restaurada por operationId. Guardas verificam key==bookId no merge, n?o apenas keys de UI. WebProgress agora estritamente IndexedDB; Blob save/delete verificam conta al?m do get. Dados j? locais n?o s?o destru?dos por ownership ou falha remota.

VALIDADO CONTROLADO: duas bases SQLite reais com repositories completos, replica+journal e backend controlado: import local/offline, cloud metadata, A?B?A/progresso .9?.1+?ncora, marcadores independentes/edit notes/comments, exclus?es offline, favorito/cole??o/tags, posi??es PDF separadas, apar?ncia local, merge, conflict revision local n?o reaplicado, aus?ncia de QUALQUER novo RPC por eco de pull, tombstone vs nota offline e A/logout/B PASS. ReaderScreen regression/Import/StudyStorage/Organization PASS; typecheck e export:web PASS antes dos ?ltimos ajustes de batch. Gates finais abaixo.

APK bloco4 1e5cae9 PASS: C:/Kindle/artifacts/apk/Aldus-1e5cae9.apk,251434314bytes, build oficial2m20s/981tasks. Aumento de tamanho inclui os PDFs bundled do diret?rio correto, antes n?o inclu?dos por aquele cat?logo. Hash/arquivo ignorado/n?o rastreado/worktree limpo conferidos. Android f?sico N?O TESTADO (ADB sem aparelhos). RLS/Storage REMOTO PENDENTE; migrations1+2 N?O APLICADAS. Sem admin: deploy BLOQUEADO EXTERNAMENTE/invent?rio INCONCLUSIVO.

PENDENTE: gatilhos/UI/open sob demanda/cleanup remoto ligado e legal final, testes integra??o/restart/browser (blocos6?8). APK bloco5 obrigat?rio logo ap?s commit, ledger local artifacts/apk/checkpoint.jsonl. Os APKs dos hashes3be78c6/d77f6e8 ainda exigem build isolado para recupera??o das pend?ncias iniciais.

Gates finais bloco5 PASS: typecheck, test:library:reading, test:library:sync, export:web e git diff --check. Staged review por lista explicita; APK oficial em seguida.
