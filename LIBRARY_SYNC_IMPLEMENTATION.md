# Biblioteca vinculada à conta — 11/10/2026

Este checkpoint prevalece sobre afirmações históricas de ausência de ownership/sync. Retomar pelo próximo bloco incompleto; não repetir toda a auditoria. Baseline: `73f6dfe`, master; arquivos versionados limpos, somente caches Gradle não rastreados. Nenhum trabalho anterior descartado.

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
