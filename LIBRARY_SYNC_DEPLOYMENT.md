# Implantação da biblioteca privada — procedimento operacional

Procedimento humano atualizado em 15/10/2026. Estado e bugs atuais somente em
[PROJECT_CONTEXT.md](PROJECT_CONTEXT.md) e [BUGS_ATUAIS.md](BUGS_ATUAIS.md).
As migrations locais não provam aplicação remota. A sonda read-only
`node scripts/audit-library-sync-public.cjs` verifica visibilidade REST, sem linhas,
RPC ou escrita, mas não substitui inventário administrativo de schema/RLS/Storage.

## Inventário antes de qualquer aplicação

Um operador autorizado deve executar `supabase/audit/01_inventory.sql` e `supabase/audit/02_library_sync_inventory.sql` no projeto correto, somente leitura. Conferir `supabase_migrations.schema_migrations`, `auth.users`, grants/roles/functions/search_path, RLS, tabelas/policies preexistentes, bucket e configuração Storage. Comparar o resultado com arquivos locais; a presença de uma migration no Git não prova aplicação. Não reaplicar as migrations históricas nem enviar credenciais administrativas ao cliente.

As duas novas migrations pressupõem schemas Supabase `auth`/`storage`, papéis `anon`/`authenticated` e sessão JWT. Se já houver tabelas/functions/policies com esses nomes, analisar a divergência antes de executar; não apagar dados nem improvisar um reset. Backup/recuperação operacional devem ser conferidos pelo operador.

## Migrações existentes — NÃO reaplicar

O operador informou aplicação em 15/10/2026 no projeto cmivracxuihtmsbmtuec:

| Versão remota | Arquivo local equivalente |
| --- | --- |
| 20261015144958 | 202610090001_flashcard_battles.sql |
| 20261015145012 | 202610110001_private_account_library.sql |
| 20261015145018 | 202610110002_private_library_file_recovery.sql |

Não executar `db push` indiscriminado: versões diferentes não significam migrations ausentes.
Não reparar/apagar entradas do ledger, recriar tabelas ou reaplicar esses três arquivos.
O inventário deve preservar esse mapeamento; comparar definições, não somente números.

## Hardening incremental novo — pendente de implantação

`supabase/migrations/20261015160539_library_active_account_fences.sql` foi gerada por
`supabase migration new` e validada em PostgreSQL/PGlite, não no projeto remoto.
Ela requer a biblioteca já implantada e cria schema library_private; verificar antes se
o nome está livre e se library_apply ainda corresponde à implementação auditada.

Operador autorizado: executar 01_inventory.sql e 02_library_sync_inventory.sql; conferir
ledger/definitions/ACL/RLS/bucket e backup operacional; revisar a migration NOVA; aplicar
somente seu conteúdo transacional pela infraestrutura aprovada; registrar essa versão
no ledger adotado pelo projeto e repetir inventário/testes HTTP A/B/disabled/anon.
Não usar service_role para representar os usuários nos testes de RLS.

A migration move a implementação CAS intacta para schema privado e mantém assinatura
pública em wrapper que exige perfil ativo; acrescenta fences restritivas sem alterar
dados ou policies de outros buckets. Teste local: node scripts/test-integrated-security.cjs.
library_object_allowed(text,boolean) mantém EXECUTE para anon porque fences públicas a
avaliam; ela retorna false a anônimos e paths alheios. Não remover o grant isoladamente.

Cada arquivo é transacional. A migration1 recusa bucket preexistente público; não contornar esse erro tornando a biblioteca pública. Após sucesso, registrar aplicação no histórico adotado pelo projeto e repetir os inventários. Conferir bucket `aldus-private-library`, `public=false`, limite preparado de 536870912 bytes e MIME `application/epub+zip` / `application/pdf`. Conferir limites efetivos do plano; o cliente aceita até512MiB, mas isso não promete que o plano aceite esse tamanho.

Database: `user_library_items`, `user_library_operations`, sequência de revision, RPC `library_apply`. Cliente autenticado lê somente seus items; escreve via RPC/CAS/recibo. Cliente/anon não escrevem diretamente, não leem recibos e não usam a sequência. Funções SECURITY DEFINER têm `search_path=''`; actor vem de `auth.uid()`, não de um owner recebido do cliente. Papéis de produto/master não dão acesso à biblioteca de outra pessoa.

Storage final: caminho `<ownerUUID>/<bookId>/<sha256>.epub|pdf`, privado e imutável. INSERT exige livro próprio ativo; SELECT permite objetos SHA próprios de livro existente, inclusive não publicados ou tombstoned, para recuperação/DELETE. UPDATE/upsert negados. DELETE só próprio. Fences RESTRICTIVE limitam policies permissivas antigas para este bucket, sem transformar outros buckets. Conferir também ACLs reais de `storage.objects`, RLS e execução das funções auxiliares.

## Testes HTTP reais com duas contas

Criar/usar contas reais de teste autorizadas A e B, com perfis válidos, e sessões separadas. Usar a chave pública e JWT da conta adequada nos pedidos de teste; guardar segredos fora do Git/logs. Não usar service_role para provar isolamento: essa chave ignora RLS. HTTP200 do Auth não substitui estes testes. Limpar somente fixtures de teste identificadas e pertencentes à conta correspondente.

| Operação | A nos próprios dados | A nos dados B / B nos dados A | Anon |
| --- | --- | --- | --- |
| SELECT/listar items | Somente rows próprias | Zero rows/negação, sem dados | Negado |
| RPC create/edit/progress | Sucesso/CAS/revision servidor | Nunca modifica owner alheio; actor é a sessão | Negado |
| Escrita direta / recibos / sequência | Negada | Negada | Negada |
| Listar/baixar objeto privado | Próprio, conforme livro/path | Negado, nenhuma metadata/bytes | Negado |
| Upload de novo SHA | Livro próprio ativo | Negado | Negado |
| Substituir/upsert/UPDATE | Negado | Negado | Negado |
| DELETE privado | Próprio, inclusive após tombstone | Negado | Negado |

Testar prefixos maliciosos, path com owner B, nome/extensão/hash inválidos, livro inexistente, upload após tombstone, headers de upsert e policies permissivas antigas. Conferir bucket privado e rota pública sem JWT: nenhum byte pode ser publicado. Não inferir autorização somente de um status: comparar as rows/bytes antes/depois.

RPC: repetir o mesmo operationId/request deve devolver recibo sem nova revision; reutilizar UUID com conteúdo diferente deve falhar. BaseRevision antiga deve produzir conflito sem sobrescrita. Progresso .9→.1 deve funcionar como releitura. Tombstone impede recriação com mesma identidade e envio de filhos offline. Simular resposta perdida de upload e duplicidade HTTP400 identificada/409; recovery deve baixar o próprio objeto e verificar tamanho/SHA antes de publicar remotePath. Erro400 genérico não é duplicidade.

## Cenário completo em dois dispositivos reais

1. A e B com a mesma conta, armazenamento local separado. A importa EPUB real e PDF real; leitura local funciona antes de sucesso remoto.
2. A offline importa/edita progresso/nota/grifo; relançar confirma persistência da fila. Reconectar e sincronizar publica metadata, envia bytes e publica referência privada.
3. B sincroniza: livro aparece CLOUD_ONLY; tráfego confirma nenhum EPUB/PDF antecipado. Tocar baixa privado em temp, valida tamanho/SHA/formato, salva e abre Reader. Verificar EPUB/posição e PDF Original/Reflow em aparelho.
4. B altera progresso para releitura e dados independentes; A recebe. Edits da mesma entidade mostram conflito, sem regra de maior percentual ou relógio do aparelho.
5. B remove só a cópia deste dispositivo: verifica remoto, vira CLOUD_ONLY, preserva dados de leitura, reabre por download. Offline/servidor inacessível não deve descartar a única cópia.
6. A remove da biblioteca e sincroniza; B aprende tombstone e não ressuscita após edição offline/restart. Cleanup exclui objetos próprios, inclusive órfão de resposta perdida; erro mantém pendência para retry.
7. A/logout/B não expõe livros/progresso/Blob/status da conta A; login A retorna dados. Revogar conta durante download/upload/profile/pull descarta resultado tardio. Repetir A→B→A.
8. Escolher explicitamente apenas um legado preserva IDs/notas/progresso; os demais permanecem sem dono. Bundled confiável não gera upload; bundled tombstoned não reaparece.

Quando uma build consolidada for solicitada, identificar o artefato/hash correspondente
ao código testado. A campanha de 15/10 não gera APK. Build não comprova instalação,
renderização, FileSystem, OCR ou comportamento físico; registrar resultados separadamente.

## Operação e limites a definir

Responsável/canal, bases por tratamento, região/contratos, atendimento de direitos, exclusão de conta, retenção de tombstones/recibos/filhos/caches/logs/backups e expurgo devem ser definidos antes de operação comercial. Exclusão lógica e cleanup pelo cliente não são uma promessa de eliminação física imediata de todos os dados. Sem E2E; administradores/provedores têm seus controles operacionais próprios. Não inserir segredos no app nem anunciar conformidade certificada.

Upload usa endpoint padrão, não TUS/resume persistente. O Supabase recomenda TUS para arquivos acima de6MB; redes móveis/arquivos grandes exigem validação adicional e uma evolução futura dessa transferência. [Upload padrão](https://supabase.com/docs/guides/storage/uploads/standard-uploads), [retomada TUS](https://supabase.com/docs/guides/storage/uploads/resumable-uploads). RLS/UPDATE para upsert e risco de service key documentados pelo fornecedor: [controle de acesso](https://supabase.com/docs/guides/storage/security/access-control). Compatibilidade de códigos: [erros do Storage](https://supabase.com/docs/guides/storage/debugging/error-codes).

Full pull limitado a100 páginas de500 entidades; snapshot/outbox JSON por conta é serializado em cada alteração. Grandes bibliotecas precisam de evolução para cursor incremental e tabelas por entidade. Hash usa chunks, mas parsers existentes e Blob Web ainda podem consumir memória do livro completo; testar arquivos grandes/baixa memória. Remover só local verifica o arquivo remoto inteiro e consome banda. PDF pré-promoção valida assinatura/SHA/tamanho; decodificação completa e renderização devem ser validadas no Reader físico. Capas personalizadas não sincronizam nesta etapa.

## Repetir a validação controlada

`npm run typecheck`, `npm run test:library:account`, `npm run test:library:sync`, `npm run test:library:files`, `npm run test:library:reading`, `npm run test:library:coordinator`, `npm run test:library:restart`, `npm run test:library:rls`, `npm run export:web` e `npm run test:library:web`.

O teste RLS executa PostgreSQL/PGlite real em ambiente isolado: instalar a ferramenta de teste se ausente com `npm install --ignore-scripts --package-lock=false --no-save --prefix .expo/library-db-test @electric-sql/pglite`. Não é dependência runtime do app. Web requer Chrome e export; usa dois origins/IndexedDB reais e fixtures de HTTP/Auth/Storage. Os testes SQLite exigem o Node com `node:sqlite` disponível. Ver scripts para requisitos. Estes testes não aplicam migrations no projeto remoto.

Não gerar APK automaticamente após commits. Somente quando autorizado, usar o pipeline
oficial `npm run build:apk:local` ou seu wrapper `build:apk:archive`, com fonte/staging
identificados e hash/bytes/log no ledger ignorado. O verificador de artefatos é uma
ferramenta opcional para uma faixa de commits que realmente possua builds registrados;
não é gate de campanhas sem APK. Não versionar binários, ledger, screenshots, bancos ou credenciais.
