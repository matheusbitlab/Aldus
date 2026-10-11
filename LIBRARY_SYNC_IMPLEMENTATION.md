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
