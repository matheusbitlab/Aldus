# Drive — pastas navegáveis e busca em toda a fonte, 12/10/2026

Implementado e validado com adapter/SQLite controlados e app Web/IndexedDB reais. A pasta pública real foi visualizada sem login; OAuth/API/importação pelo Aldus e Android físico continuam PENDENTES. Baseline limpo `5cfb9618e540ac29dbbb0b202ddb62ed8d67dc7f`.

## Modelo e persistência

`SourceCatalog` conserva a gravação única de JSON em SQLite `source_catalogs` e IndexedDB `source_catalogs`; acrescenta schemaVersion=2, rootFolderId e folders. Não cria tabela paralela ou migration de Library Sync. Snapshots antigos, sem folders/root, continuam visíveis offline como catálogo legado; uma atualização inclui a árvore.

`SourceFolder`: id real do item Drive, sourceId, remoteFolderId real do conteúdo, parentFolderId real, name, relativePath, isShortcut, shortcutTargetId e updatedAt. Pasta normal tem id=remoteFolderId; atalho conserva seu próprio ID e aponta ao ID real do destino. Nome/caminho não são identidade. IDs de fontes/arquivos continuam nos vínculos sourceId+remoteBookId→bookId existentes; mover/renomear livro não troca o ID nem sobrescreve a cópia pessoal.

Livros recebem parentFolderId, relativeFolderPath, normalizedTitle e normalizedAuthor quando disponível. Apenas metadados permitidos entram no snapshot; token/header não entra. Paths usam o separador visual ` › `, conservando nomes que já incluem `/`. O caminho de busca é a primeira rota alcançada na indexação; múltiplos atalhos ao mesmo destino não duplicam livros no índice global.

## Indexação, raiz e atalhos

`GoogleDriveService.listCatalog` faz BFS iterativa, valida MIME/metadata da raiz e de cada pasta alcançada, consome todas as páginas por parent ID e inclui EPUB/PDF. Consulta apenas filhos da raiz ou de pastas/destinos de atalhos encontrados; não busca parents da raiz para subir, não lista todo o Drive nem filtra por ownership. Shared Drive/corpora e resource keys são tratados por pasta/destino.

O probe de conexão em SourceManagerModal usa validateRoot (um GET de metadata), seguido do refresh explícito que constrói a árvore. Assim conectar/salvar não percorre centenas de pastas duas vezes. Falha posterior de qualquer ramo é exibida no estado do catálogo e não publica resultado parcial.

`scheduledFolderIds` e `visitedFolderIds` usam IDs reais do conteúdo. Cada pasta física é listada uma vez; alias continuam visíveis e abrem o mesmo conteúdo local. Atalho para ancestral retorna à ocorrência já presente nos breadcrumbs, sem crescer indefinidamente. Destino externo só entra se um atalho alcançado o indicar e a conta tiver acesso. Atalhos para arquivos e exportação Google Docs continuam fora do escopo.

Só publica o resultado depois da árvore inteira; timeout/abort/403/404/rate limit, paginação incompleta/repetida ou falha de qualquer ramo preservam o snapshot anterior. Isso inclui destino de atalho inacessível: não anuncia árvore completa omitindo silenciosamente o ramo. Limites defensivos: 20.000 IDs de pastas de conteúdo, 50.000 entradas de pasta/atalho, 200.000 livros e 10.000 tokens de página por pasta; atingir limite falha sem snapshot parcial. Autorização e geração continuam validadas antes de publicar.

`SourceCatalogService` valida unicidade, raiz, alcance e parent dos livros e grava folders+items no mesmo snapshot atômico. Renomear/mover/adicionar/remover reaparece no próximo refresh completo. Falha de gravação também mantém catálogo anterior. A publicação/troca de fonte preserva as proteções de geração e fila existentes.

Download continua explícito por SourceBookSheet→DownloadManager→importadores existentes→Library→Reader. O resolver aceita arquivos de qualquer pasta indexada e faz metadata check; se o arquivo mudou para fora do parent conhecido, exige atualização, sem baixar por uma localização antiga. Indexação nunca usa alt=media.

## Navegação e pesquisa

SourceLibraryScreen começa na ROOT e mostra folders+BookCard na mesma FlatList virtualizada, grade/lista. Pastas têm ícone/nome/atalho/contagem local barata, sem capa fictícia. Breadcrumbs por IDs permitem voltar ao pai e à raiz. Cabeçalho e hardware Back Android voltam ao pai dentro da fonte e a Fontes na raiz; modais conservam seu próprio fechamento. Um refresh revalida o trail e recolhe pastas removidas/movidas até o último ancestral válido.

Pesquisar usa todos os livros do snapshot, qualquer que seja a pasta aberta. Mostra caminho e abre diretamente as ações do livro. Resultados de livros precedem os de pastas; na navegação, pastas precedem livros. Pesquisa por nomes de pastas usa o mesmo ranker e abre a rota por IDs. Limpar a pesquisa volta ao conteúdo da pasta corrente. Não há chamada Google a cada caractere nem refresh implícito por pesquisa.

O algoritmo tolerante `catalogRanking` foi preservado; `createCatalogSearchIndex` prepara os tokens de livros uma vez por snapshot. SourceCatalogService prepara índices/ordenações no refresh/load e usa WeakMap por array imutável; SourceTree mantém mapas parent→children e índice de pastas por catálogo. Consultas só tokenizam o texto pesquisado e aplicam o scorer existente, sem um segundo fuzzy. A pesquisa global do app via GoogleDriveSearchPlugin também lê o snapshot local; sem catálogo, orienta atualizar explicitamente em Minhas fontes.

## Validação

PASS: typecheck; test:drive (Google auth/erros anteriores + novo test-drive-tree + download); test:source-catalog; catálogo/ranking/search-pipeline/source-integrations; import; export Web; source-library-browser; legal/notices; diff check. Resultados finais e APK ficam no registro pós-commit.

Fixture obrigatório exercitado: ROOT mostra A/C/Livro Root; A mostra B/Livro A; B mostra Dom Casmurro; voltar B→A→ROOT; `Dom Casmuro` na ROOT e em C encontra o mesmo livro com `Pasta A › Pasta B`. Fixture adicional cobre pastas homônimas, paginação por pasta, Shared Drive, targetResourceKey, dois atalhos ao destino externo, ciclo para ROOT e aquisição profunda. SQLite fechado/reaberto preserva árvore/vínculos sem token/rede; erro profundo e falha de disco preservam o snapshot inteiro; rename/add/remove/move e arquivo movido para fora são verificados.

Desktop fixture de 500 pastas/5.000 livros: indexação completa+SQLite ~309ms; 20 buscas locais ~86ms, sem API por consulta. Não é benchmark Android nem latência Google real. Browser real: ROOT/A/B/back/breadcrumbs, busca global a partir de C/caminho/ações, busca de pasta, atalho/ciclo e IndexedDB após reload PASS; zero requests Drive e zero media requests nessa navegação. Regressão JSON/import/remoção, rollback IndexedDB, 1.000 itens e virtualização (24 cards montados) também PASS. Conta Supabase e fontes HTTP são fixtures. Screenshots em `.expo/source-library-validation/drive-tree-*.png`.

Os harnesses Node de Search/Catalog ganharam somente fronteiras explícitas de persistência para não carregar Expo SQLite no Node; o trecho de aquisição do harness antigo usa adapter de memória declarado, enquanto IndexedDB real é validado no browser. Nenhuma alteração funcional nos importadores, Reader/OCR/Reflow/Library Sync/Backup/capas/Flashcards ou Auth.

## Pasta real e limites externos

URL fornecida: `https://drive.google.com/drive/folders/1PwrGP2UiCNGhyhvhDUpszZZwFjfkjaw4`. Parsing aceito. HTTP200 e Chrome isolado sem sessão Google mostram título **livros geral - Google Drive** e pastas reais: 01 - LIVROS AVULSOS, alemão, aquileanos, clássicos br, devils night, japonês, livros coreanos, livros terror e quadrinhos. 15 linhas na página pública; nenhum clique/login/download feito. Evidência `artifacts/drive-tree/real-folder-public-probe.json` e screenshot `real-folder-public-page.png`.

Isso confirma visibilidade pública/nomes da raiz, não grant drive.readonly, listagem do adapter dentro do Aldus, subpastas reais, paginação API, importação/abertura de livro ou conta escolhida. Esses oito critérios reais do adendo continuam PENDENTES por falta de credencial Drive autorizada/aparelho. ADB sem dispositivo: **ANDROID REAL — PENDENTE**. O erro remoto Supabase→localhost identificado na tarefa anterior não foi corrigido por mudanças de pastas; deployment Auth/Google Cloud continua em GOOGLE_AUTH_DRIVE_DEPLOYMENT.md.

Política de privacidade0.6, vigente12/10/2026, explicita subpastas/atalhos externos alcançados, caminhos locais, pesquisa local e download por escolha. Scope continua drive.readonly; nenhum segredo ou token novo no APK. Somente artefatos locais ignorados, nenhum push.

Referências oficiais: [shortcuts](https://developers.google.com/workspace/drive/api/guides/shortcuts), [files.list](https://developers.google.com/workspace/drive/api/reference/rest/v3/files/list), [resource keys](https://developers.google.com/workspace/drive/api/guides/resource-keys).

## Commit e APK

Checkpoint integrado navegação/indexação/persistência/busca/testes/documentação. Após commit, o pipeline oficial `npm run build:apk:archive` exige worktree limpo e registra hash/path/bytes/PASS/FAIL em `artifacts/apk/checkpoint.jsonl`; APK ignorado em `artifacts/apk/Aldus-<hash>.apk`. Registro final pós-commit: `artifacts/drive-tree/DRIVE_FOLDER_NAVIGATION_FINAL_REPORT.md`.

<!--COMMIT_AND_APK-->
