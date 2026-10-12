# Biblioteca vinculada à conta e sincronização — relatório final

11/10/2026. Baseline `73f6dfe`, branch `main`. **IMPLEMENTADO / VALIDADO CONTROLADO**. **MIGRATIONS CRIADAS — NÃO APLICADAS REMOTAMENTE**, **RLS REMOTO PENDENTE**, **STORAGE REMOTO PENDENTE**, Android físico **NÃO TESTADO**. A implantação real está **BLOQUEADA EXTERNAMENTE** por falta de acesso administrativo/sessões de teste; o inventário remoto é **INCONCLUSIVO**. Isso não impede leitura local nem a validação controlada executada.

Este documento versionado descreve a implementação e os resultados conhecidos antes do próprio commit. O último hash e seu APK só podem ser registrados depois desse commit. A versão completa pós-commit é `artifacts/LIBRARY_SYNC_FINAL_REPORT.md`, gerada por `scripts/report-library-sync-artifacts.mjs` a partir do Git e do ledger real `artifacts/apk/checkpoint.jsonl`. Nenhum APK/segredo/livro pessoal entra no Git.

## 1. Modelo anterior da Library

Book/arquivo/capa/capítulos/progresso/marcadores/grifos eram SQLite e arquivos no Native; IndexedDB/Blob no Web. Organização e posições PDF também usavam AsyncStorage. Não existiam ownership da biblioteca, outbox ou sincronização de livros. Conta/perfil já usavam Supabase. Source Library era e continua catálogo local da fonte, com vínculo separado para o livro importado. Importadores, downloads, parser, Reader, Reflow/OCR e Drive existentes foram reutilizados.

## 2. Ownership novo

`ownerUserId` obrigatório para novos livros da conta, UUID de importação independente de nome/título/autor. Repositories de Book/filhos/Blob/organização verificam ownership no lookup e na mutação. Scope com generation/epoch evita resultados tardios, inclusive A→B→A. SQLite v5 e IndexedDB v6 com migrações locais incrementais; UPSERT evita cascata destrutiva em filhos. Identidades de bundled verificadas incluem conta/conteúdo.

## 3. Livros legados

Dono ausente/null permanece sem dono e preservado; não é atribuído à primeira conta. Ajustes oferece seleção explícita de livros antigos e confirmação. Claim conserva IDs, arquivos, progresso e notas. Adoção de bundled legado pode conservar identidade antiga paralela ao asset novo; não há merge destrutivo ou deduplicação automática por título. Anônimo e outra conta não recebem esses livros pela biblioteca pessoal.

## 4. Schema remoto

`user_library_items` com PK composta user_id/kind/id, parent book_id, payload JSON (allowlist no cliente), revision de sequência do servidor, updated_at/deleted_at. Kinds book/progress/bookmark/highlight/organization/pdf_position. `user_library_operations` guarda request/response por operation UUID da conta. RPC `library_apply` usa actor da sessão, CAS, recibo idempotente, lock por conta/livro e tombstone permanente. Limite payload256KiB.

## 5. Migrations

Criadas `202610110001_private_account_library.sql` e `202610110002_private_library_file_recovery.sql`. Ambas executadas em PostgreSQL/PGlite controlado, **nenhuma aplicada remotamente**. Migrations históricas não foram alteradas/reaplicadas. Inventários read-only01/02 e roteiro em LIBRARY_SYNC_DEPLOYMENT.md. Somente configuração pública estava disponível; não houve credencial administrativa nem criação de usuários reais.

## 6. Bucket/storage

Preparado `aldus-private-library`, privado, MIME EPUB/PDF, teto512MiB sujeito ao plano real. Path `<ownerUUID>/<bookId>/<SHA256>.epub|pdf`. Objetos imutáveis, sem upsert/URL pública/signed URL permanente. SDK/REST só com chave pública e JWT próprio congelado por operação. Chaves administrativas não são usadas no cliente. Aplicação e estado efetivo do bucket remoto não foram comprovados.

## 7. Policies

INSERT exige livro próprio ativo. SELECT final permite SHA-object de livro próprio, inclusive não publicado ou tombstoned, necessário para recovery e DELETE autenticado. UPDATE/substituição negados. DELETE somente próprio. Fences RESTRICTIVE impedem policies permissivas preexistentes de abrir este bucket. Testes SQL controlados também simulam policies antigas permissivas. Não há publicação, link para livro, biblioteca entre usuários ou marketplace.

## 8. RLS

SELECT dos items por `auth.uid()=user_id`; escrita somente via RPC, sem grants diretos de escrita/recibo/sequence. Funções SECURITY DEFINER com search_path vazio e actor derivado de auth.uid. SQL/PGlite executou privilégios, policies, CAS/recibos/pai/tombstone/Storage object rows de verdade. Isso comprova o modelo SQL controlado e não o serviço HTTP/configuração remota. **RLS REMOTO PENDENTE**.

## 9. User A × User B

Controlled A→B/B→A/anon negados em SQL/Storage policies, repositories, organization, leitura/Blob/filhos e Auth lifecycle. Trocas durante requests mantêm JWT da operação e descartam respostas tardias. Web real com fixture Auth prova que B não abre Reader de A. Acesso a DB/Storage HTTP remoto com JWTs reais não foi testado; roteiro externo inclui listar/baixar/upload/substituir/delete e anonimato.

## 10. Sync Engine

LibrarySyncService dedicada e coordinator separado da UI. Pull inicial aprende exclusões, push publica livros antes dos filhos, CAS resolve ordem de servidor, pull final reconcilia. Seed usa repositories atuais dentro da fila exclusiva e igualdade canônica elimina eco. Login/profile ativo, foreground, reconexão, mutações com debounce2,5s e Sincronizar agora; sem polling agressivo.

## 11. Outbox

Durável por conta em SQLite/IndexedDB, operation UUID/baseRevision/shadow/dirty/ready. Intenção escrita antes da mutação; `ready=false` interrompido reaplica local antes de enviar. Erro de persistência não vira sucesso fictício. Import local completo recebe syncUnjournaled; se journal falha, livro funciona e próximo seed recupera. Conflito de revision local restaura intent anterior sem replay indevido.

## 12. Offline

Arquivo local e alterações funcionam sem sucesso remoto. Outbox/import persistem após fechar/reabrir SQLite e reload Web real. Reconexão retoma sincronização. CLOUD_ONLY precisa conexão para o primeiro download. Remoção só local exige cópia remota confirmada e verificada; erro/rede indisponível preserva a cópia local. Logout conserva cache, bloqueando acesso por outra conta.

## 13. Idempotência

Mesmo operationId/request retorna recibo sem duplicar entidade ou revision; conteúdo diferente com mesmo UUID é negado. IDs próprios de marcadores/grifos, igualdade canônica sem eco e objetos SHA imutáveis. Upload com resposta perdida verifica objeto existente por download/SHA/tamanho. Revisão final suporta HTTP400 com código de duplicidade identificado e409; erro400 genérico/inválido é negado, sem publicar referência.

## 14. Conflitos

Revision/backend ordering, sem depender só de relógio local nem maior progresso. Mesma entidade preserva intenção local e remoto em conflito; Ajustes permite escolher explicitamente. Entidades independentes convivem. Organization é por livro; edição concorrente da mesma organização pede resolução. Tombstone de pai vence alterações offline de filhos e não permite reaplicação que ressuscite o livro.

## 15. Upload EPUB/PDF

Importação local termina antes do envio e usa arquivo definitivo controlado, jamais URI temporária do picker. Coordinator registra livro, envia arquivo, publica remotePath. Native upload binário FileSystem e hash em chunks; Web Blob. Erro mantém local e pendência/estado. Cancelamento de sessão/operação e timeout. Upload padrão/retry reinicia; TUS/resume persistente não implementado.

## 16. Download em segundo dispositivo

Metadata-only sincroniza Book sem bytes. OpenBookUseCase/Reader chama ensureLocal sob demanda: autenticação privada→temp→tamanho/SHA/formato→staging dos importadores existentes→promoção/chapters→ponteiro local→Reader. Falha/cancelamento não expõe livro parcial; erro de disco conserva ponteiro vazio e permite retry. IDs e dados pessoais são preservados.

## 17. CLOUD_ONLY

Livro remoto ativo com caminho local vazio aparece na biblioteca e não baixa automaticamente. Ao tocar passa a DOWNLOADING; sucesso deixa cópia local e leitura normal. Remover só a cópia retorna a CLOUD_ONLY. Estado de disponibilidade é separado do estado de leitura. Testes coordinator e Web real verificam zero downloads antes do toque.

## 18. Integridade/hash

SHA256 incremental1MiB interoperável com Node, sem arquivo completo em RAM somente para hash. Tamanho/SHA e paths validados; IDs/datas/revisões/prototype/travessia recusados. EPUB usa parser real ZIP/XML/chapters. PDF conserva validação de assinatura existente mais SHA/tamanho; decodificação completa cabe ao Reader. PDF real gerado/decodificado em teste controlado; não alegar renderização física validada. Corrupção e formato inválido não publicam ponteiro local.

## 19. Progresso

Capítulo, CFI/âncora, página/percentual A→B→A. Releitura .9→.1 PASS, com revision do backend. PDF guarda modo e posições Original/Reflow separadas. Aparência/brilho/cache não sincronizam. Persistência/restart/controlados PASS; Reader Web real abriu o EPUB privado e reportou paginação ao host.

## 20. Bookmarks

Marcadores com IDs estáveis individuais e tombstone de remoção offline. Dois dispositivos criam marcadores independentes sem substituir array gigante. Mutações passam pelo journal scoped; collision com outro livro/conta é rejeitada. Controlados PASS.

## 21. Highlights

Grifos individuais com IDs estáveis, posição/trecho/cor e comentário existente. Alterar/excluir offline sincroniza por entidade. Comentário continua no payload CFI, sem reimplementar modelo de estudo. Testes de leitura/StudyStorage/ReaderScreen PASS.

## 22. Notes

Não havia repositório de notes independente; notas de marcador e comentários de grifo existentes sincronizam com suas entidades. Não foi inventado modelo novo. Preservação de IDs/conteúdo em claim, edições e deletions controladas PASS.

## 23. Favorites

Favorito pertence à organização account-scoped de cada livro e sincroniza. Allowlist remove revision/updatedAt local e capa. Testes A/B/merge/controlados PASS.

## 24. Collections/tags

Coleções e tags existentes, série/volume/status e título/autor personalizados sincronizam por livro. Backup/merge mantém transação/idempotência e proteção de ownership. Conflito da mesma organização é explícito; arrays globais de highlights não são substituídos. Capas ficam locais.

## 25. Livros de Sources

Depois de importados por Drive/Gutendex/JSON/etc., arquivo definitivo pertence à biblioteca pessoal e pode subir privado; outro aparelho não depende da Source original. Catálogo/configuração/proveniência sourceId/remoteBookId e credenciais permanecem locais, fora do payload. Remover fonte conserva arquivo/dados pessoais. Testes Sources/Drive/import e Sources browser regression PASS controlado.

## 26. Bundled books

Manifesto de34 assets versionados, SHA/ID por conteúdo e aliases históricos. Assets verificados não são enviados; progresso/dados pessoais sincronizam. Catálogo consulta tombstones e não recria bundled removido. PDF usa assets/Livros/ correto; isso aumentou APK a partir do bloco4. Legados podem manter identidade antiga quando escolhidos, sem apagar dados. Sem sincronização de capa personalizada nova.

## 27. Logout/troca de conta

Scope revogado sincronamente; status/store/repositories/Blob não expõem A a B. Epoch evita ABA e response tardia; Auth event tickets ignoram getSession/profile/callback antigo. signOut atrasado não remove nova conta. Relogin A recupera dados. Bytes podem permanecer isolados no armazenamento: bloqueio de acesso no app não é apagamento seguro de disco.

## 28. Remover deste dispositivo

Controle separado, com confirmação. Exige remotePath publicado sem dirty/conflito, verifica remoto antes de esvaziar ponteiro e apagar cópia controlada. Eviction marker durável permite recovery; locks evitam concorrer com upload/open. Mantém conta/progresso e vira CLOUD_ONLY. Assets empacotados não têm exclusão física individual. Testes Web/Files/Coordinator PASS.

## 29. Remover da biblioteca

Escreve tombstone mesmo offline e propaga; livro/filhos não ressuscitam após restart/outbox antiga. Cleanup privado só depois da confirmação, lista owner/book e remove SHA-objects publicados e órfãos de upload perdido. Falha mantém pendência para retry. Registros/tombstones/recibos/caches e backups não têm expurgo completo nesta etapa; nenhum prazo de retenção foi inventado.

## 30. UI de sincronização

Library mostra LOCAL/SYNC_PENDING/UPLOADING/SYNCED/CLOUD_ONLY/DOWNLOADING/ERROR discretamente, independente de readingStatus. Ajustes: estado, operações/arquivos pendentes, última sync, erro/retry manual, resolução de conflitos e adoção selecionada de legados. Opções do livro separam as duas remoções com confirmação. Pull/refresh local evitam loop/reimportação.

## 31. Privacidade/Legal

Política/Privacidade e Dados/Termos0.5 preparados antes da ativação; revisão final atualiza finalidade, direitos autorais e inventário. Divulgação Supabase privado, upload automático, metadata-first/download ao abrir, offline, ownership, exclusão com confirmação/retry e ausência de E2E. Direitos da obra permanecem com titulares. Revisão profissional, responsável/canal/região/contratos/retention/account deletion continuam pendentes operacionais; não há certificação de conformidade. Referências primárias: [LGPD](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm) e [direitos autorais](https://www.planalto.gov.br/ccivil_03/leis/l9610.htm).

## 32. Device A × Device B controlado

Duas bases SQLite reais e teste de restart com dois arquivos separados. A importa offline→outbox→B metadata/cloud-only; B abre/posição/releitura→A recebe; notas/grifos/organização/deletes/tombstones/recovery testados. App Expo exportado em Chrome real usa dois origins com IndexedDB separados; fixtures Auth/REST/Storage controladas. Importador EPUB real, reload, upload, nenhum download antecipado, download/Reader real, remove/reabre, delete/cleanup e conta B negada PASS. Iframe conserva sandbox; prova usa srcdoc real e callback de paginação, sem retirar sandbox.

## 33. Supabase real

**NÃO VALIDADO** para esta biblioteca. Sonda pública confirmou Auth disponível e introspecção negada, sem provar schema/RLS. Sem credencial admin/Postgres ou sessões reais de teste, não houve aplicação de migration/RPC real. **RLS REMOTO PENDENTE**. LIBRARY_SYNC_DEPLOYMENT.md descreve exatamente a ação externa necessária.

## 34. Storage real

**NÃO VALIDADO** por HTTP real. Modelo/policies executados em PostgreSQL controlado; HTTP do harness é fixture. Bucket/plano/policies existentes e upload/download/delete/RLS A/B/anon precisam de validação externa após aplicação. **STORAGE REMOTO PENDENTE**. Não há arquivo enviado ao bucket real nesta tarefa.

## 35. Android físico

**NÃO VALIDADO / NÃO TESTADO**; ADB não mostrou aparelhos durante a validação. APKs oficiais compilados não comprovam instalação, Reader/PDF/OCR/FileSystem em dispositivo físico. SDK legítimo reparado: JDK17, Platform36, BuildTools35+36, CMake3.22.1/NDK/licenças. Native boundary/compilação foram testados sem alegar aparelho real.

## 36. Web

Typecheck/export Web/Legal/Source regression e app Chrome controlado PASS. IndexedDB/Blob/transação/Reader reais em dois origins; rollback de outbox em transaction.abort conserva estado. Supabase/Storage/Auth externo são fixtures. Screenshots ignorados em .expo/library-sync-validation e .expo/library-legal-validation. Não equivale a validação de Safari/iOS ou ambiente público de produção.

## 37. Limitações

Upload padrão sem TUS/resume persistente, embora o fornecedor recomende TUS acima de6MB; retry reinicia. Cliente512MiB sujeito ao plano, redes/baixa memória ainda exigem aparelhos reais. Hash em chunks, parsers/Blob Web podem usar memória do livro completo. Pull completo máximo100×500 entidades e snapshot JSON por conta O(N), sem cursor incremental persistido. Remover só local baixa remoto inteiro para verificar e consome banda. PDF pré-promoção valida assinatura/SHA/tamanho, não decodificação integral. Sem E2E, sharing público, sync de catálogo/token Source, capa personalizada nova, exclusão de conta/expurgo automático/retention definida. Bases locais com identidade antiga podem conservar duplicata bundled; preservação preferida a merge destrutivo. Sem Android físico nem deploy real.

Fontes técnicas atuais: [upload padrão/TUS](https://supabase.com/docs/guides/storage/uploads/standard-uploads), [controle de acesso](https://supabase.com/docs/guides/storage/security/access-control), [códigos de erro](https://supabase.com/docs/guides/storage/debugging/error-codes). Recomendações não substituem validação do projeto remoto.

## 38. Arquivos modificados

Modelos/repositories/SQLite/IndexedDB/Blob, Auth/store/dependencies, import/catalog bundled/OpenBook/Reader, serviços account/replica/journal/sync/transfer/coordinator, Library/Ajustes/controles, SQL incremental/inventário, harnesses, hashing/notices/lockfile, arquivo de APK/reporte e documentos. A lista exata desde73f6dfe, incluindo o próprio commit final, é gerada no final da versão pós-commit a partir de `git diff --name-only`. Arquivos EPUB/PDF versionados já existentes não foram adicionados/regravados; arquivos pessoais/test DB/APKs/secrets ficam fora do Git.

## 39. Documentação

LIBRARY_SYNC_IMPLEMENTATION.md (checkpoint/histórico por bloco), LIBRARY_SYNC_DEPLOYMENT.md (pendências e roteiro real), este relatório41itens e versão pós-commit. PROJECT_CONTEXT.md, ROADMAP_FUNCIONALIDADES.md, CORRECOES_BUGS_APK_PROGRESSO.md, AUTH_IMPLEMENTATION.md, LEGAL_IMPLEMENTATION_NOTES.md, SOURCE_LIBRARY_IMPLEMENTATION.md e GOOGLE_DRIVE_IMPLEMENTATION.md atualizados. Documentos históricos preservados e marcados como superados quando divergentes. Ledger/logs/APKs/relatório pós-commit ignorados.

## 40. Commits

| Hash | Mensagem | Escopo |
| --- | --- | --- |
| 3be78c645f6638352c3129ade279d46db733f67d | feat: scope local library by account | Ownership, legados, repositories, identidade e arquivo de APK |
| d77f6e85d723d24509f858a68ab187d2fec6cfa5 | feat: add private account library storage model | Schema/RPC/RLS/bucket/policies e PostgreSQL controlado |
| 94b6ecbd452a7e1f17a826bb62c50daeee430d83 | feat: add offline-first library sync engine | Outbox, CAS, replay, conflicts/tombstones e isolamento |
| 1e5cae9cf769c84a1952ace1f1930f83fec61f32 | feat: sync private book files across devices | Arquivos SHA, staging privado, bundles e recovery policies |
| 2f21182a3ce0518d0697bcf1e65b8ae195a04b41 | feat: sync reading state across devices | Replica/journal, progresso/estudo/organização/PDF |
| 43133977235cfa48d2954f771e1040dabd5c5a45 | feat: add account library sync controls | Gatilhos, UI, download ao abrir, remoções e legal0.5 |
| 0b6b20b5159e46d11a0287363e966a55cf7cb20b | test: validate private library across devices and accounts | Restart/Chrome/A×B, malicious IDs, Auth/recovery/cleanup |
| Commit que contém este relatório; hash no ledger pós-commit | Fechamento do bloco8 | Compatibilidade HTTP400 legado, legal/documentação/relatório e gates finais |

## 41. APKs gerados

| Commit | Arquivo / path | Tamanho (bytes) | Build |
| --- | --- | ---: | --- |
| 3be78c6 | C:/KIndle/artifacts/apk/Aldus-3be78c6.apk | 157811058 | PASS, recuperado no hash intacto |
| d77f6e8 | C:/KIndle/artifacts/apk/Aldus-d77f6e8.apk | 157811058 | PASS, backend-only; Gradle up-to-date legítimo |
| 94b6ecb | C:/KIndle/artifacts/apk/Aldus-94b6ecb.apk | 157812334 | PASS |
| 1e5cae9 | C:/KIndle/artifacts/apk/Aldus-1e5cae9.apk | 251434314 | PASS |
| 2f21182 | C:/KIndle/artifacts/apk/Aldus-2f21182.apk | 251550590 | PASS |
| 4313397 | C:/KIndle/artifacts/apk/Aldus-4313397.apk | 251586402 | PASS |
| 0b6b20b | C:/KIndle/artifacts/apk/Aldus-0b6b20b.apk | 251591062 | PASS |
| Commit deste relatório | artifacts/apk/Aldus-<hash>.apk | Registrar após build oficial | Gate obrigatório pós-commit |

<!-- ARTIFACTS_END -->

Falhas iniciais de SDK/licenças, JVM R8, PCH/debug info e caminho Windows constam no checkpoint/logs/ledger. Ambiente recuperado com ferramentas oficiais e checkout isolado curto C:/a1, sem reset/clean/stash do principal. Os APKs1/2 vieram do build executado nos hashes corretos; o mesmo binário do bloco2 é esperado por mudanças só SQL/documentação. O salto de tamanho no bloco4 inclui PDFs bundled do diretório corrigido. Nenhuma falha foi substituída por falsa alegação de APK, nenhum binário antigo de hash diferente foi renomeado. Antes/depois do build: HEAD e source/staging limpos, arquivo existe/tamanho>0/ignorável/não rastreado; ledger tem hash/path/bytes/PASS ouFAIL/comando/log.

## Gates e evidências

PASS na matriz acumulada: typecheck, Library account/sync/files/reading/coordinator/restart/RLS, Auth flows, ReaderScreen, Import, StudyStorage/organization, Drive, Sources/catalog/actions/browser, Legal/notices/browser e export Web. SQL usa PGlite real; SQLite usa bancos reais com fronteira Expo controlada; Web usa UI/IndexedDB/Blob/Reader real e HTTP fixtures. Erros de execução de ferramentas (browser sem endpoint CDP, tentativa de script de import com nome incorreto) foram corrigidos e os comandos corretos passaram; não classificados como falha de app. Falhas ambientais dos APKs permanecem no ledger.

Gates finais bloco8 repetidos após alteração: typecheck/files/coordinator/legal/notices/export Web2413módulos/Library Web integral/Legal browser PASS. Duplicidade HTTP400/409 e recuperação com bytes corrompidos negada cobertas; Native upload boundary controlada. Legal browser claro/escuro/rolagem5947/5947/retorno login. ADB sem dispositivos; diff check e sintaxe do gerador PASS. Não houve nova alteração de implementação após esses resultados.

O cenário final A importa offline→sync privado→B metadata-only→toque/download/validação→Reader, incluindo progresso e remoções, passou **CONTROLADO**. Sucesso em dois aparelhos com Supabase/Storage reais só pode ser declarado após as ações externas de LIBRARY_SYNC_DEPLOYMENT.md. APK físico e implantação real continuam pendentes, sem fingir validação.
