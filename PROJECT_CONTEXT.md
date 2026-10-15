
USER LIBRARY SYNC — checkpoint final 11/10/2026: ownership por conta, SQLite v5/IndexedDB v6, adoção explícita de legados, outbox durável/CAS/recibos/tombstones, arquivos privados SHA256, download sob demanda, dados de leitura e UI implementados. VALIDADO CONTROLADO em duas bases SQLite reais, PostgreSQL/PGlite e app Web/Chrome com dois IndexedDB. Supabase/RLS/Storage HTTP real NÃO VALIDADOS; duas migrations CRIADAS/NÃO APLICADAS, sem acesso admin. Android físico NÃO TESTADO. SDK legítimo reparado; APKs dos sete commits iniciais PASS, incluindo recuperação dos dois primeiros em checkout isolado. Bloco8/último APK registrados no ledger pós-commit. Documentos canônicos: LIBRARY_SYNC_IMPLEMENTATION.md, LIBRARY_SYNC_DEPLOYMENT.md, LIBRARY_SYNC_FINAL_REPORT.md; resultado pós-commit em artifacts/apk/checkpoint.jsonl e artifacts/LIBRARY_SYNC_FINAL_REPORT.md. Textos públicos0.5. Próxima etapa funcional: capa personalizada, ainda não implementada. Os checkpoints abaixo são históricos quando divergirem deste estado.
# PROJECT CONTEXT

## Campanha atual — 15/10/2026

Branch `integration/comunidade-literaria`, baseline `2f98b79`; worktree inicial limpo.
Community v0.1 integrada e preservada. As dependências foram restauradas antes desta
campanha. Nenhum APK será gerado: PENDENTE DE BUILD CONSOLIDADO.
Somente PROJECT_CONTEXT.md e BUGS_ATUAIS.md serão fontes oficiais de contexto para IA.
EPUB agora usa cache por importação, fontes compartilhadas no documento combinado,
processamento sequencial e yield/cancelamento cooperativo; schema e posição do Reader
permanecem iguais. Evidências, limites e próximos bugs estão em BUGS_ATUAIS.md.
Os adendos históricos abaixo serão absorvidos e removidos na consolidação documental.
Sync remoto novamente indisponível em 15/10: duas tabelas esperadas com 404/PGRST205.
Sem acesso administrativo conectado; nenhum deploy ou descarte da outbox. Sonda somente
leitura: `node scripts/audit-library-sync-public.cjs`; implantação humana em
LIBRARY_SYNC_DEPLOYMENT.md após inventário/ledger. Bucket físico permanece inconclusivo.

## Adendo atual — Drive com pastas navegáveis, 12/10/2026

IMPLEMENTADO / VALIDADO CONTROLADO E WEB: SourceCatalog schemaVersion2 mantém folders+books em um único snapshot JSON SQLite/IndexedDB, sem migration nova. IDs reais, raiz delimitada, BFS paginada por pasta e atalhos externos alcançados, visitedFolderIds/ciclos, renomear/mover/remover/adicionar e publicação atômica. SourceLibraryScreen mostra pastas e BookCard juntos, breadcrumbs/pai/raiz/Back Android; pesquisa padrão em toda a fonte com caminho e ações diretas, incluindo nomes de pastas. Motor fuzzy original prepara índice uma vez por snapshot; Search Drive também usa snapshot local, sem API/refazer árvore por consulta. Download/import existentes só por escolha. Testes ROOT/A/B/back, busca Dom Casmuro estando em C, atalhos/ciclos/homônimos, offline/reopen/rollback e 500 pastas/5000 livros PASS controlados. Política0.6 descreve subpastas/atalhos e caminhos locais.

Pasta real agora conhecida: 1PwrGP2UiCNGhyhvhDUpszZZwFjfkjaw4, página pública livros geral observada em Chrome isolado sem login. Isso confirma nomes da raiz, não grant/API/importação pelo Aldus. Android ADB sem dispositivo: **ANDROID REAL — PENDENTE**. Bloqueio Supabase→localhost continua o da etapa anterior. Documento DRIVE_FOLDER_NAVIGATION_IMPLEMENTATION.md; commit/APK no relatório pós-commit artifacts/drive-tree/DRIVE_FOLDER_NAVIGATION_FINAL_REPORT.md e ledger artifacts/apk/checkpoint.jsonl. Nenhuma mudança funcional em Auth/Reader/OCR/Reflow/Library Sync/Backup/capas/Flashcards/importadores gerais.

## Prioridade atual — Google Auth/callback/Drive, 12/10/2026

CAUSA REMOTA REPRODUZIDA: o endpoint Supabase `/auth/v1/callback` produziu HTTP302 para `http://localhost:8081/` após OAuth PKCE iniciado com `aldus://auth/callback` e cancelamento Google simulado com state real. Recovery foi igualmente rejeitado; Web localhost:8081/auth/callback foi preservado. `npm run audit:auth:redirects -- --expect-native` registra FAIL_EXTERNAL_CONFIGURATION. Isso supera a auditoria anterior, que somente chegou à tela de login Google. Allowlist/Site URL administrativos ainda NÃO CONSULTADOS/ALTERADOS; não afirmar login completo corrigido.

APK baseline eab97ee comprova package `com.aldus.reader`, scheme `aldus`, MainActivity singleTask e módulo Drive registrado chamando AuthorizationClient; GIS está separado por plataforma e não é fallback Android. SHA-1 do APK release local: `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25`, assinatura `android/app/debug.keystore`, diferente de uma garantia sobre EAS/Play. Inventário completo em GOOGLE_REDIRECT_INVENTORY.md.

Correções cliente implementadas e gates controlados PASS: callback por plataforma sem fallback Web/SSR localhost e sem leitura de window.location no React Native, URL SDK validada antes do browser, PKCE único com sessão obrigatória e diagnóstico sanitizado; Drive conserva drive.readonly/AuthorizationClient, categorias distintas, reconexão por gesto, IDs contra cancelamento antigo e UX que verifica credencial atual. Typecheck, Auth/Drive/catalog/import, Kotlin e Web exportado/Chrome passaram. Android clearToken não garante seletor de conta; esse caso exige teste físico. Configuração externa/roteiro físico exatos em GOOGLE_AUTH_DRIVE_DEPLOYMENT.md; relatório de 17 itens em GOOGLE_AUTH_DRIVE_FINAL_REPORT.md e versão pós-commit em artifacts/auth/urgent/GOOGLE_AUTH_DRIVE_FINAL_REPORT.md. Android ADB sem dispositivos: **ANDROID REAL — PENDENTE**; pasta real/listagem/importação/revogação/conta real igualmente PENDENTES. Nenhuma alteração em Reader/OCR/Reflow/Library Sync/Backup/capas/Flashcards/importadores gerais. Próxima atividade necessária é concluir a configuração externa e os testes físicos; capa personalizada não é prioridade desta tarefa.

SOURCE LIBRARY — VALIDADA (controlado + Web, quarta etapa): biblioteca permanente por fonte concluída; Drive EPUB/PDF e JSON estático EPUB, /sources/[sourceId], SQLite v3/IndexedDB v4, refresh completo atômico/gerações, busca local motor original, BookCard grade/lista, importação existente e vínculo sourceId+remoteBookId->bookId, remoção sem tocar Library. Typecheck/Source Catalog/Search/Drive/import/persistência/legal/notices/export Web/diff check PASS. Web exportado/Chrome isolado: UI+IndexedDB real+EPUB real, reload/rollback/offline/estados/1000 itens (24 cards montados)/Blob preservado PASS; identidade Supabase e HTTP externos são fixtures. Drive real NÃO TESTADO; Android build/ponte/físico NÃO VALIDADOS nesta etapa, nenhum módulo nativo alterado. Política pública0.4. Detalhes/limites/arquivos em SOURCE_LIBRARY_IMPLEMENTATION.md. Checkpoints abaixo são históricos. Próxima etapa BIBLIOTECA VINCULADA À CONTA / SYNC ENTRE APARELHOS, NÃO iniciada.

SOURCE LIBRARY — UI: rotas protegidas /sources e /sources/[sourceId], overview com nome/tipo/quantidade/data/conexão, biblioteca virtualizada FlatList grade/lista reutilizando BookCard/placeholder, busca local ranker original, A–Z/Z–A/recentes e estados explícitos. Ajustes agora abre Fontes; endpoints somente pesquisa não recebem biblioteca fictícia. typecheck PASS. Ações de aquisição e lifecycle de fonte em integração; visual Web ainda PENDENTE.

SOURCE LIBRARY — AUDITORIA / SOURCE CATALOG — PERSISTÊNCIA (quarta etapa, 11/10/2026): contrato genérico, capabilities, SQLite v3/IndexedDB v4 e refresh atômico implementados. Testes controlados de snapshot/reabertura/gerações/remoção/1000 itens e typecheck/ranking PASS; UI/ações/IndexedDB real/visual ainda PENDENTES. Fonte removida não acessa livros pessoais. Detalhes em SOURCE_LIBRARY_IMPLEMENTATION.md. Checkpoints anteriores sobre índice exclusivamente em memória são históricos. Sem Cloud Sync; próxima etapa BIBLIOTECA VINCULADA À CONTA.

## Itens novos — Google Drive, 11/10/2026 (implementado; validação externa pendente)

DRIVE — DOWNLOAD/IMPORT / CHECKPOINT FINAL: IMPLEMENTADO e VALIDADO COM MOCKS. DownloadManager estendido de forma restrita com headers transitórios/resolver de fonte persistida/EPUB+PdfFileImporter existentes, sem tokens em job. Aquisição única explícita; HTTP/401 antes do parser; bytes reais/indeterminado/operationId/AbortSignal/terminal guard. Native temp/move/cleanup após erro/cancel/escrita tardia testado, Web streaming Blob/timeout por inatividade 60 s. Não reescritos importadores, Reader/OCR/Reflow/Auth geral. Fonte removida preserva livros. Todos gates typecheck/ranking/Drive metadata+auth+download/Sources/catalogs/import/legal/notices/Web export (2345 módulos)/diff check PASS. Android autolinking PASS; Kotlin/manifest/APK BLOQUEADOS por Platform 36/Build Tools 35/licenças SDK, físico NÃO TESTADO. Google real NÃO TESTADO; API/consentimento/client/origins/SHA externamente PENDENTES. Textos públicos 0.3 e notas atualizados. Roteiro/arquivos/limites em GOOGLE_DRIVE_IMPLEMENTATION.md. Registro anterior de download PENDENTE abaixo é histórico, superado por este checkpoint. Próxima etapa BIBLIOTECA PERMANENTE POR FONTE.

DRIVE — AUTH/CONEXÃO / LISTAGEM: IMPLEMENTADO e VALIDADO COM MOCKS. Android AuthorizationClient/GIS Web, drive.readonly amplo somente leitura, tokens memória/expiração/clearToken/401/reconnect explícito/revogação best effort. Fonte estável folderId/resourceKey; plugin assíncrono no use case existente. Parsing seguro, raiz validada, paginação completa metadados EPUB/PDF/shared drive, TTL 5 min memória/refresh, geração/abort sem cache parcial. Atalhos/subpastas/Docs excluídos; nenhum download de conteúdo/autoria inventada. Configuração externa em GOOGLE_DRIVE_IMPLEMENTATION.md. Conta real/Android físico NÃO TESTADOS; DownloadManager ainda PENDENTE.

DRIVE — AUDITORIA: VALIDADO por inspeção. Fontes pessoais usam UserSourceRepository/AsyncStorage, configuredCatalog/SearchPlugin e SearchBooksUseCase; seleção escolhe adapters antes da consulta, Todas publica resultados parciais, searchStore conserva geração/AbortSignal. ScrapedLink carrega título/autor/formato/URL, mas faltavam IDs Drive e execução autenticada assíncrona. DownloadManager existente importa somente EPUB; PDF exige extensão restrita para reutilizar PdfFileImporter. Login Google Supabase é PKCE de identidade, NÃO autorização Drive; nenhum provider token será reutilizado.

DRIVE — SEARCH: IMPLEMENTADO compartilhado em catalogRanking, sem biblioteca nova. Extensões finais EPUB/PDF e diacríticos Unicode são ignorados somente para ranking; título exibido preservado. Tokens reordenados, prefixos (mínimo 3 letras), autor com peso menor e uma edição/transposição conservadora. Uma letra/vazio não encontra livros; removida maioria 2/3 que aceitava termo totalmente alheio. Testes pedidos ampliados. Drive real NÃO TESTADO. Próxima etapa: BIBLIOTECA PERMANENTE POR FONTE; Reader/OCR/Auth geral preservados.


## Itens novos — OCR local de PDF, 11/10/2026

**AUDITORIA A–E:** baseline classificado como **E**, com comportamento **A** visível: havia somente detecção de texto corrompido/insuficiente e fallback ao PDF Original; não havia engine, provider, módulo, cache OCR nem OCR funcional oculto. A pipeline preexistente de PDF Original, extração PDF.js, builder Reflow, validação conservadora, posições e cache foi preservada.

**IMPLEMENTADO:** Android usa módulo Expo local `aldus-pdf-ocr`, `PdfRenderer` e ML Kit Text Recognition v2 latino empacotado (`com.google.mlkit:text-recognition:16.0.1`). A detecção é por página e também considera insuficiência global; PDF misto envia somente páginas necessárias. Estados semânticos: `TEXT_VALID`, `OCR_REQUIRED`, `OCR_PROCESSING`, `OCR_VALID`, `OCR_INSUFFICIENT`, `PROCESSING_ERROR`. Antes da tarefa pesada a UI pergunta **Reconhecer texto** ou **Continuar no PDF Original**. OCR ocorre página a página, com bitmap limitado, normalização NFC, limites convertidos ao sistema PDF e validação mínima de caracteres/letras/palavras; resultado ruim retorna ao Original. A Web declara indisponibilidade do OCR local e oferece o Original.

**CACHE/LIFECYCLE:** processador v12; documentos derivados carregam proveniência (`text-extraction`, `ocr` ou `hybrid`), páginas OCR, engine/versão e validação v1. Cache antigo/parcial/inconsistente é rejeitado. A operação existente conserva geração/AbortSignal/terminal único; cancelar impede novas páginas e callbacks tardios. A tarefa corrente do ML Kit não é cancelável pela API, mas o resultado é descartado e recursos são liberados ao completar. Nenhum conteúdo foi enviado a servidor.

**UX:** corrigido banner superior estreito; mensagem encolhe/quebra e o botão **Fechar** preserva largura e área de toque.

**DEPENDÊNCIA/PRIVACIDADE:** nova dependência nativa Gradle inevitável; modelo latino empacotado funciona sem download inicial, acrescenta aproximadamente 4 MB por script e suporta português. ML Kit declara processamento de entrada/saída no dispositivo, mas pode enviar métricas técnicas e consultar correções/compatibilidade; documentos públicos 0.2 e notas legais registram a distinção. Auditoria de transitivos/Data safety/termos permanece antes de publicação.

**EVIDÊNCIA:** testes controlados de policy, qualidade, acentos, cache/proveniência, progresso, consentimento, fallback Web, cancelamento/scheduling, ReaderScreen e navegação PASS. PDFs reais: Sociedade/Manifesto `OCR_REQUIRED`; Ócio/Banquete/República Reflow normal. Autolinking PASS. Kotlin/APK e aparelho real permanecem **NÃO TESTADOS** porque o SDK local não tem Platform 36/Build Tools 35 licenciados; não declarar OCR físico concluído.

## Etapa 3 — Auth, Supabase, RLS e controle de acesso, 10/10/2026

**ESTADO REMOTO — PARCIALMENTE OBSERVÁVEL / INVENTÁRIO ADMINISTRATIVO BLOQUEADO:** a fonte de verdade continua sendo o projeto Supabase remoto, mas este ambiente possui somente URL e chave pública do app. Não há sessão do Dashboard, credencial Postgres, projeto linkado, `psql` ou Docker; `npx supabase` não conseguiu instalar o binário `win32-x64`. Nenhum SQL foi executado. `auth.users`, PK/FK/defaults/checks/índices, histórico de migrations, triggers, grants, flags reais de RLS, policies e Security Advisor permanecem **INCONCLUSIVOS** até execução de `supabase/audit/01_inventory.sql` por operador autorizado.

**SONDA PÚBLICA VALIDADA:** `npm.cmd run audit:supabase:public` confirmou GoTrue `v2.197.0` saudável, email e Google habilitados, signup permitido e confirmação de email exigida. OpenAPI recusou introspecção com 401. `profiles`, `user_feature_overrides`, `users`, `decks`, `cards`, `battles`, `study_sessions` e `card_reviews` recusaram `anon` com HTTP 401/PostgreSQL `42501`, sem ler linhas. Isso comprova somente recusa ao cliente anônimo nesta sonda; **não** comprova existência/colunas, RLS ou policy. `username-login` respondeu 404/`NOT_FOUND`, logo o login por username não está disponível no endpoint esperado.

**MIGRATIONS — NÃO ALTERADAS / NÃO REAPLICADAS:** os registros históricos divergem e os arquivos locais não provam o remoto. As migrations `202610060000_lock_legacy_public_tables.sql` e `202610060001_profiles_and_features.sql` foram auditadas estaticamente: a intenção é deny-all nas seis tabelas legadas; `profiles.id → auth.users(id) ON DELETE CASCADE`; role `user|master`; status `active|disabled`; trigger `SECURITY DEFINER` com `search_path=''`; criação sempre `user/active`; RLS por `auth.uid`; e grants de profile limitados a username/display/avatar. Nenhuma policy genérica ou promoção automática de master foi adicionada. O inventário read-only foi ampliado para defaults, checks, ACLs e configuração das funções. Só depois do resultado remoto será legítimo marcar migration como já aplicada ou criar uma nova incremental.

**AUTH CLIENT / BUGS 4–7:** não surgiu divergência local nova que justificasse reescrever o fluxo. BUG 5 A–E passou novamente em componentes reais com fronteiras controladas: credencial inválida não libera acesso; sessão+perfil ativo são necessários; tentativa inválida não vira sucesso de sessão anterior; falha de profile não vira senha; falha de router não vira credencial. BUG 6 preserva `code/status/categoria` sanitizados e separa validação local, policy, trigger, constraint, rate limit e confirmação, porém signup real/profile/email continuam **NÃO TESTADOS**. Google mantém uma única troca PKCE e erros sanitizados; a falha histórica Google→Supabase exige Auth Logs/credenciais do provider e permanece **BLOQUEADA EXTERNAMENTE**. Recovery usa exatamente `aldus://auth/callback?next=reset-password`; callback/parser/update controlados passaram, mas email→app→nova senha real e configuração de URL/template seguem **NÃO TESTADOS / BLOQUEADOS EXTERNAMENTE**.

**SESSÃO, GUARD E OFFLINE — VALIDADO CONTROLADO:** acesso exige sessão válida, profile do mesmo UUID, username e `account_status=active`; profile/cache isolado, cache de UUID diferente e conta disabled são bloqueados. Cache do mesmo UUID pode preservar experiência local quando uma sessão previamente válida existe e a leitura remota falha; ele não cria identidade nem substitui autenticação inicial. O risco preexistente de cache sem TTL permanece documentado. Diagnósticos continuam opt-in e não registram senha, tokens, code, verifier, sessão ou segredo.

**MASTER / USER / RLS A×B — NÃO TESTADOS REMOTAMENTE:** regra local dá ao master acesso a features de produto, sem conceder leitura de dados privados de terceiros; user respeita override. Contrato SQL estático impede update cliente de role/status/overrides e o script administrativo exige UUIDs reais sem credenciais hardcoded. `supabase/tests/rls_manual.sql` foi completado para A→B, B→A, update próprio, tentativas de autopromoção/override, legados deny-all e `anon`, com rollback; sem UUIDs/acesso, não foi executado. Nenhuma conta master/test foi provisionada; account disabled, login válido, logout/relogin, signup, Google e recovery reais também não foram testados. Flashcards funcionais permaneceram **NÃO ALTERADOS**; somente sua regra de acesso existente foi revalidada.

**VALIDAÇÃO LOCAL:** `npm.cmd run audit:supabase:public`, `node scripts/test-auth-flows.cjs`, `node scripts/test-auth.cjs --auth-only`, `node scripts/test-auth-callback.cjs`, `npm.cmd run typecheck`, `npm.cmd run export:web` (2331 módulos) e `git diff --check` passaram. A tentativa adicional de executar o roteiro RLS em PostgreSQL WASM não iniciou porque a ferramenta isolada `.expo/flashcard-db-test` não está instalada; nenhum PASS foi atribuído. Esses gates não substituem conta real, email entregue, Android, RLS ou configuração administrativa. A implementação jurídica não mudou porque nenhum dado/provider/retenção/comportamento remoto foi alterado; `legalContent` e `LEGAL_IMPLEMENTATION_NOTES.md` permanecem adequados ao comportamento conhecido.

**ANDROID OAUTH:** `com.aldus.reader` e scheme `aldus` permanecem corretos. `keytool` do JDK 17 leu `android/app/debug.keystore` e retornou SHA-1 `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25`; ele identifica somente a assinatura debug versionada, que o Gradle atual também usa no release local. Não é SHA-1 de EAS/produção/Play. Nenhum Client OAuth ou painel Google foi alterado.

## Etapa 2 — Legal, Privacidade e Sobre, 10/10/2026

**IMPLEMENTADO:** seção **Legal e Informações** em Ajustes, com Sobre o Aldus Reader, Política de Privacidade, Termos de Uso, Direitos Autorais e Conteúdo, Licenças de terceiros, Privacidade e Dados e versão/build derivados da configuração em execução. Privacidade e Termos também estão acessíveis em Login e Cadastro, fora do guard autenticado. O cadastro declara leitura dos documentos sem criar consentimento geral.

Os textos públicos partem de auditoria do repositório: biblioteca/leitura/estudo individual predominantemente locais; Auth/perfil no Supabase; Google opcional; consultas e downloads diretos de catálogos; WebViews BibliON/MEC; sensor de movimento processado em memória; batalha de flashcards potencialmente remota. Retenção, controlador, canal legal, encarregado, transferências e aplicação das regras remotas não foram inventados. `EXPO_PUBLIC_LEGAL_CONTROLLER_NAME` e `EXPO_PUBLIC_LEGAL_CONTACT_EMAIL` permitem publicar identidade/canal depois da validação.

**LICENÇAS:** `scripts/generate-third-party-notices.cjs` gera `THIRD_PARTY_NOTICES.md` e `src/legal/thirdPartyNotices.generated.ts` a partir das 37 dependências diretas de runtime, agrupando textos idênticos. A tela permite busca e abertura dos textos sob demanda. Auditoria transitiva/nativa continua pendente antes de distribuição comercial.

**LIMITES DECLARADOS:** implementação jurídica inicial, sem alegação de conformidade definitiva. Revisão profissional, operação de direitos dos titulares, exclusão de conta, retenção remota, suboperadores/transferências, proteção de menores e conferência do ambiente Supabase/Google ainda são pendências. Detalhes e TODOs internos em `LEGAL_IMPLEMENTATION_NOTES.md`.

**PENDENTE:** preencher controlador e contato validados, definir processos operacionais e concluir revisão jurídica. **NÃO TESTADO:** Android/iOS físico, canal real de titulares e ambiente remoto sob estas políticas. **INCONCLUSIVO:** identidade do controlador/encarregado, bases definitivas por finalidade, prazos de retenção e transferências internacionais não podem ser determinados apenas pelo código.

**ESCOPO FUNCIONAL PRESERVADO:** nenhum fluxo de OCR, Drive, sync, Reader, Reflow, Search, Sources, anti-enjoo, Flashcards, cobrança ou conteúdo pré-existente foi alterado; a etapa acrescenta informação, rotas e navegação legal. A versão do app não foi duplicada em string fixa.

**VALIDAÇÃO:** `npm run typecheck`, `npm run test:legal`, `npm run legal:notices:check`, `npm run export:web` e `git diff --check`. No Web exportado, `npm run test:legal:browser` confirmou paletas clara/escura distintas, rolagem da Política até o fim (4138/4138) e retorno direto para Login. Android/iOS físico ainda não foi testado nesta etapa.

## Projeto atual: Aldus Reader — identidade/branding, 10/10/2026

Esta seção é o estado canônico atual da identidade e prevalece sobre nomes e identificadores presentes nos registros históricos abaixo.

**IMPLEMENTADO:** identidade pública migrada de Kindle Reader para **Aldus Reader**, com nome curto/Expo **Aldus**. `package.json`/lockfile usam `aldus-reader`; `app.json` usa slug `aldus-reader`, scheme `aldus`, Web name `Aldus Reader`/short name `Aldus` e Android package `com.aldus.reader`. O callback Native passou de `kindlereader://auth/callback` para `aldus://auth/callback`. Namespace/applicationId, classes Kotlin, diretórios Java, Manifest, intent filters, nome Gradle e label Android foram migrados em conjunto. UI de Auth/Conta/Estudo, título Web, origem sintética dos WebViews, nome de download e User-Agent do catálogo também usam Aldus. O repositório remoto já é `matheusbitlab/Aldus` e não foi alterado. O `extra.eas.projectId` foi preservado por ser identificador externo do projeto existente.

**ARQUIVOS PRINCIPAIS ALTERADOS:** `app.json`, `package.json`, `package-lock.json`, `app/_layout.tsx`, telas/componentes com marca visível, `src/data/remote/authService.ts`, `android/app/build.gradle`, `android/settings.gradle`, `android/app/src/main/AndroidManifest.xml`, `android/app/src/main/res/values/strings.xml`, `android/app/src/main/java/com/aldus/reader/{MainActivity,MainApplication}.kt`, testes de Auth/fontes e documentação atual.

**VALIDADO LOCALMENTE:** `npm.cmd run typecheck` PASS; `node scripts/test-auth-callback.cjs`, `node scripts/test-auth-flows.cjs`, `node scripts/test-auth.cjs --auth-only` e `node scripts/test-source-integrations.cjs` PASS; `npm.cmd run export:web` PASS (2319 módulos e `<title>Aldus Reader</title>`); configuração pública do Expo confirmou `name=Aldus`, `slug=aldus-reader`, `scheme=aldus`, Web name `Aldus Reader` e `android.package=com.aldus.reader`; `:app:processDebugMainManifest` PASS e o manifesto mesclado confirmou package/classes/providers `com.aldus.reader`, schemes `aldus` e `exp+aldus-reader`; `git diff --check` PASS.

**PENDENTE — CONFIGURAÇÃO EXTERNA:** no Supabase, cadastrar `aldus://auth/callback` e `aldus://auth/callback?next=reset-password` nas Redirect URLs; remover o callback antigo apenas quando nenhuma build antiga precisar dele. No Google Cloud/Play, registrar `com.aldus.reader` com os SHA-1 dos certificados efetivamente usados (debug/teste, EAS/produção e Play App Signing conforme aplicável). Provider/consentimento/Client Secret permanecem tarefas administrativas; nenhum painel externo foi alterado nesta etapa. O EAS `projectId` existente deve ser conferido antes da próxima build em nuvem, sem regeneração automática.

**NÃO ALTERADO:** Reader, OCR, Reflow, Sources como funcionalidade, Flashcards como funcionalidade, sync, Google Drive, Política de Privacidade, Termos de Uso, Sobre Nós, migrations e configuração remota. Chaves `@kindle/*`, bancos `kindle-*.db`/IndexedDB e formatos `kindle-*` de backup/âncoras foram preservados como contratos legados de persistência para não perder dados nem invalidar imports; não representam a marca pública atual. Caminhos locais `C:\Kindle`/`C:\KIndle`, nomes de documentos históricos e evidências de APK anteriores também foram preservados.

**NÃO TESTADO:** login Google/recovery real depois da troca de callback, entrega de email, retorno Native em aparelho, instalação/upgrade do novo applicationId, APK/AAB final e configurações Supabase/Google/Play. Como `com.aldus.reader` é um novo applicationId para o Android, ele instala como app distinto e não herda automaticamente o sandbox/dados privados de `com.kindle.reader`.

## Retomada prioritária Reader/Sources/Search — 09/10/2026

Pedido mais recente: continuar todos os bugs da campanha, **EXCETO FLASHCARDS**, cujo trabalho anterior permanece preservado/NÃO ALTERADO nesta fase. Prioridades: trepidação ao arrastar barra; scroll/gestos de Preferências; fontes reais além de Gutendex; pesquisa tolerante. Este checkpoint prevalece para o escopo atual sobre a seção Flashcards seguinte, que registra a fase anterior.

VALIDADO automaticamente: primeira divergência no ReaderScreen real controlado: onValueChange promovia/persistia destino antes de ACK; confirmação antiga modificava a prop usada como comando (51→61→51 sem gesto novo). IMPLEMENTADO: preview local BottomFooter, commit único, confirmado/destino separados no ReaderScreen, comandos explícitos com ID Native/Web, pageNumber reservado ao restore inicial; transição conserva ID/origem, confirmação não reenvia navegação e ACK anterior não sobrescreve posição já aceita. Typecheck/Reader navigation EPUB+Reflow/Native/Screen/bytecode/Chromium PASS, inclusive Freud e Ócio reais, identidade, tipografia/âncoras, página real1 e persistência. VALIDADO FISICAMENTE no primeiro build diagnóstico: EPUB drag1015→429/1443, preview mantém confirmado1015; um comando/ACK429, toggles estáveis e reabre429. Nova granulação por página (Native anterior128 passos), matriz completa EPUB/Reflow/Original e última fonte ainda PENDENTES. Sem timer/retry/filtro page=1 novo.

Menus: swipe vertical iniciado no slider nativo não rolou no baseline, mas áreas livres/botões chegaram ao fim. Sliders direcionais IMPLEMENTADOS/testes de direção/preview/commit/acessibilidade PASS; primeiro retorno físico do conjunto ainda NÃO PASSOU (scroll bloqueado mesmo em outras regiões). Separação backdrop Pressable irmão/painel View e diagnóstico de viewport/content/offset IMPLEMENTADOS para contraprova, NÃO TESTADOS FISICAMENTE. Adapter suspende touch zones/teclado só durante painel e reativa ao fechar, preservando viewer. Não marcar resolvido por teste de handlers.

Fontes: Gutenberg OPDS oficial IMPLEMENTADO, contato público autorizado/configurado, consulta e resolução real Dom Casmurro VALIDADA na rede/Node, uma página por pesquisa e aquisição somente por ação explícita. JSON/OPDS/HTML e aquisições parciais validados controladamente; filtros escolhem plugins, cinco estados por fonte, abort/stale/parciais preservados. BNDigital BLOQUEADA HTTP403, aquisição EPUB/PDF não validada, indisponibilidade explícita; webview não é aquisição. Inventário/termos/limites em FONTES_INDEXACOES_VALIDACAO.md. APK final destes fluxos ainda PENDENTE.

Pesquisa tolerante IMPLEMENTADA: NFKD/diacríticos/caixa/pontuação/espaços/artigos/tokens, título+autor, ranking exato/tokens/mistos/maioria conservadora/fuzzy de uma edição/transposição, candidatos limitados e no máximo um fallback remoto reduzido; paginação não repete pesquisa. Matriz local exata/noaccents/noarticle/parciais/misto/reordenado/typo/vazio/cancel/stale PASS; fixtures não comprovam disponibilidade remota. Novos arquivos catalogRanking, OpdsCatalog, catalogPlugins, ReaderSettingsSlider, readerNavigationDiagnostics e testes source-integrations/catalog-ranking/reader-navigation/settings; componentes Reader/viewers/documento, store/usecase Search, SourceManagerModal e tela search alterados. Checkpoint canônico contém todos os arquivos/gates e resultados por modo.

APK diagnóstico de Reader 09/10 13:50:10, 207665582 bytes, hash E67AACBE86301DDE2C2EA161FF3F71A8B0131740E1507084324632833487F7A2, instalado por install-r/base.apk idêntico; assinatura/bundle/12 fontes conferidos, 35 livros/sessão preservados. Segundo diagnóstico compilado em14:09:23, 207678610 bytes, hash67CB09C8B95904D8121BCC907329ED7FCD3A354A6C45344C7A067B9E05F6BF17: última correção de painel/step e Sources/Search, assinatura/bundle/23 módulos conferidos, NÃO INSTALADO. Em14:15 o usuário propôs demonstração manual; toques automáticos/instalação suspensos, observação somente por tela/vídeo/eventos sanitizados no primeiro APK (PDF Original78/169 inicialmente). Sem reprodução confirmada nesse checkpoint. Flashcards congelados/NÃO ALTERADOS desde mudança de escopo. Estados/evidências em CORRECOES_BUGS_APK_PROGRESSO.md; nenhum descarte Git/migration remota/limpeza de dados.

## Decks e flashcards — implementação de 09/10/2026

Novo pedido autoriza o módulo Flashcards, antes fora do escopo da campanha APK. Implementados editor completo com edição/gabarito explícito/prévia/anexo/desenho/proteção de saída, deck com listagem/edição, pontuação comum ±10/±5, estudo durável/idempotente com conteúdo congelado e resumo, além de cliente de batalha Supabase e migration autoritativa privada. Native usa SQLite existente e Web IndexedDB, com migração por cópia de chaves AsyncStorage da mesma conta; legado não apagado. Flashcards incompletos exigem revisão; geração local passa a salvar rascunhos sem gabarito automático.

VALIDADO localmente: pontuação, sessões/retentativas/contas/falhas, componentes React editor/desenho/estudo, armazenamento grande/commit/abort, migration/RPC em PostgreSQL WASM isolado com dois actors/outsider/anon, todas as quantidades, segredo, congelamento, retomada, espera e empate. TypeScript/export Web/diff no fechamento. NÃO TESTADOS: novo módulo Android/ponte Expo SQLite, navegador autenticado e batalha em duas contas no Supabase remoto. Migration nova preparada, não aplicada remotamente; sem expiração/derrota automática por conexão. Não reutilizado o gateway doador que aceita acerto do cliente/identidade JWT distinta.

Guia canônico/arquivos/configuração/testes/limites: `FLASHCARDS_IMPLEMENTACAO.md`. Nenhuma dependência/configuração nativa alterada, nenhum APK gerado. Development build compatível pode carregar JS pelo Metro; o APK release instalado precisa de recompilação/reinstalação futura para incluir estas mudanças. Checkpoints de APK abaixo continuam retratando o bundle anterior; não são prova física deste módulo. Reader e trabalho prévio preservados.

## Fechamento da rodada física — 09/10/2026

Esta seção e a tabela final de `CORRECOES_BUGS_APK_PROGRESSO.md` prevalecem sobre todos os checkpoints históricos abaixo. Todos os grupos 1–10 e a regressão de posição foram processados; isso não significa que todos os incidentes estejam integralmente resolvidos.

APK normal vigente: `android/app/build/outputs/apk/release/app-release.apk`, 207579358 bytes, gerado em 08/10/2026 16:11:48 -03:00; SHA256 `BF49499ADB7079BA0ED8696935EC84E418FE4D74C30BA8E8094A430BF6D38F33`. Build 3m21s/export Web 2335 módulos PASS; bundle e mapa de seis fontes finais conferidos. Instalado por atualização sem limpar dados; hash do base.apk novamente conferido no Redmi em 09/10 e idêntico. Diagnósticos Reflow/Reader UI/Motion desligados; nenhum evento desses prefixos no processo normal consultado. Certificado Android Debug preexistente preservado.

Correções finais mantidas: helpers literais portáveis em vez de Function.toString Hermes no WebView; cooperação Native por idle/Abort; wrappers overlay completos; controles Native com View/opacidade literal e pointerEvents por visible, animação Web mantida; anti-enjoo acima do Reflow; largura DOM fracionária e contagem por fragmentos/índices de coluna. A composição unificada experimental foi descartada. Fronteira Animated/native driver/estado/hit testing tem FORTE EVIDÊNCIA; mecanismo interno exato não isolado.

VALIDADO fisicamente no APK normal final: EPUB Freud busca/sumário/aparência/estudo somente leitura, setas 220/631→221/631→220/631, Back do header e reabertura 220/631. Em 09/10, Ócio Reflow busca/sumário/aparência, setas 5/32→6/32→5/32, Back e reabertura 5/32; Sociedade PDF Original aparência/estudo somente leitura, setas 78/169→79/169→78/169, Back e reabertura 78/169. Capturas confirmam texto legível. O roteiro foi ajustado aos títulos/controles próprios de PDF Original/Reflow, sem mudança do produto.

Biblioteca agora com 35 livros, incluindo Minor Dialogues observado ao retomar; nenhum import/download/exclusão executado nesta rodada. Preferência anti-enjoo checked=false novamente conferida; aparelho deixado na biblioteca sem filtro. Nenhuma migration/dependência/configuração remota/Flashcard alterada. Trabalho anterior preservado.

PARCIAL/PENDENTE: Auth real e configuração administrativa Google/Supabase/signup/recovery; arquivo original de 969 páginas não identificado; causa do intervalo Weber 582/584 INCONCLUSIVA; cancelamento físico na montagem final/busca, cutout/rotação/matriz tipográfica e encerramento forçado não validados. Sensor real/overlay/três ciclos foreground/background já PASS, mas movimento/eficácia anti-enjoo permanecem pendentes. Detalhes, manifesto de arquivos e tabela por incidente no checkpoint canônico.

## Retomada física final — 08/10/2026, 15:30

APK normal 15:03:38 compilado/verificado/instalado preservando sessão e 34 livros, flags diagnósticas 0; SHA256 `25805705753D59C3DA188FEF96A8C63DEE45401956A188A5A448301C707CCB46`. Inclui largura DOM fracionária e contagem pela extensão real dos capítulos, evitando última coluna vazia. Artefato, assinatura, bundle e cinco fontes conferidos; build 7m54s, export Web 2335, typecheck/Native/Screen/browser PASS. Deriva distante fisicamente corrigida e fechamento por Back/reabertura manual do EPUB voltou a 220/631 com mesmo trecho. Anti-enjoo original off restaurado.

Nova pendência física EPUB e Reflow normal: controles visíveis com bounds corretos sem resposta aos toques atuais; áreas central/laterais e Back físico respondem. Experimento de composição ReaderScreen não melhorou, DESCARTADO por patch; APK normal anterior reinstalado às 15:38:35, hash idêntico. Os PRESS/painéis positivos anteriores foram da variante diagnóstica. Em segundo experimento, ReaderControls Native usa View/opacidade literal por visible e mantém animação Web; typecheck/ReaderScreen/Native PASS, build/export em execução. Fronteira Animated/native driver/hit testing é hipótese em teste, não causa confirmada. Helper UI agora exige dump novo/comprimido. Checkpoint canônico e tabela final em CORRECOES_BUGS_APK_PROGRESSO.md.

## Validação física após desbloqueio — 08/10/2026 (prevalece sobre histórico)

Biblioteca 34 livros e sessão anterior acessíveis no Redmi Android 16, sem desinstalar/limpar storage. Sociedade Native rejeitou corrupção e retornou Original. Ócio Native REPRODUZIU bytecode; causa Function.toString de três helpers em Hermes. Fonte literal portátil corrigida em EpubReaderDocument/ReaderAnchorDocument; testes baseline/paridade PASS e retorno físico Ócio legível sem bytecode VALIDADO. Não desligado Hermes nem alterado PDF.js.

Gutendex Native sucesso real (Seneca/detalhes) após erro terminal; Minhas Fontes vazio terminal. Cancel de busca não comprovado. Busca/sumário/Aa/Back Reflow responderam fisicamente. Nova causa rodapé CONFIRMADA: wrapper zero-height com filho absoluto bottom=0. Wrappers overlay agora têm limites completos, flow preservado; retorno físico rodapé/slider/setas visíveis e navegação PASS. Browser ReaderControls real + iframe seis hits PASS.

Anti-enjoo: disponibilidade Expo/permissão/samples reais e opacity 0,6 VALIDADO, três ciclos Home/retorno com stop/subscribed/amostras. Nova causa visual: overlay atrás do Reflow z20; root agora z30/pointerEvents none e oito pontos no Reflow pronto VALIDADO. Aparelho parado x/y=0; resposta a movimento/eficácia PENDENTES. Restaurar off original ao fechar.

Weber 584 páginas ficou 582/584 (99%) antes de eventualmente publicar cache legível; await exato INCONCLUSIVO. Scheduler corrigido: RN setImmediate microtask→requestIdleCallback/Abort cleanup, baseline/atual PASS. A República 525 páginas fisicamente CANCEL na extração página 25→Original, reentrada complete/SUCCESS→Reflow. Isso não valida Cancelar na montagem/969 páginas. Sem novo timeout/delay.

EPUB físico em página distante apresentou deriva horizontal. Causa comprovada: clientWidth inteiro versus coluna fracionária; baseline browser página 120 mediu 33,47px de erro. getPageWidth agora usa getBoundingClientRect; atual Freud/Ócio PASS (<0,05px), tipografia/display/transition/header PASS. Revalidação física dessa última revisão e APK normal final em conclusão. Checkpoint canônico CORRECOES_BUGS_APK_PROGRESSO.md; Auth real e rotação/cutout continuam pendentes, Flashcards/dependências/migrations preservados.

## Fechamento local da campanha APK — 08/10/2026

Todos os grupos A–E/BUGS 1–10 e posição foram processados; mecanismos locais corrigidos e testados, sem declarar incidentes físicos resolvidos. Checkpoint canônico: `CORRECOES_BUGS_APK_PROGRESSO.md`, com manifesto, causas/provas, passos externos e tabela final. Flashcards/worktree anterior preservados; nenhuma migration/dependência/configuração remota alterada.

Gates finais PASS: typecheck, export Web (2335 módulos), Auth/callback, Reflow, Reader Native/Screen, Sources/catálogos, motion/lifecycle, anchors/storage/organização. Livros reais no Chromium e cinco PDFs Web PASS. Diff da campanha PASS; global mantém apenas EOF preexistente Flashcards. Gutendex live deu erro terminal de acesso/rede, sem validação de sucesso online. ADB permaneceu vazio durante esses testes; aparelho apareceu na conferência final, atualização física descrita abaixo.

APK final VALIDADO como artefato: `C:\KIndle\android\app\build\outputs\apk\release\app-release.apk`, 207573078 bytes, 08/10/2026 09:47:07 -03:00, SHA256 `2E015D86256403AEC5ADBFDCE69AE52C800B124DA8EB2588C090C5BFFA4186A5`. Build JDK17 PASS (7m13s), package `com.kindle.reader`, v1/1.0.0, API 24–36, quatro ABIs; apksigner v2 PASS, certificado Android Debug já configurado. Bundle do APK idêntico ao gerado após último ReaderScreen. Ao aparecer Xiaomi 23117RA68G/Android 16 no ADB, `adb install -r` PASS sobre instalação de 07/10, sem desinstalar/limpar dados. Processo inicia; tela está bloqueada, aguardando desbloqueio pelo usuário para teste de UI. Instalação/assinatura não provam funcionamento dos bugs.

Estado real: BUGS 1/2/3/5/8/9 e posição PARCIAL; BUGS 4/6/7 BLOQUEADOS por acesso/configuração externa; BUG 10 INCONCLUSIVO no Redmi. Inventário físico anuncia os cinco tipos necessários ao DeviceMotion; ACTIVITY_RECOGNITION já concedida. Falta de sensor não está demonstrada, fallback não justificado. `bytecode`, memória/969 páginas, hit testing Native completo, login real, eventos no app e reabertura física continuam sem prova. Código local concluído; próximo teste de UI depende do desbloqueio, Auth depende de Dashboard/logs.

## Campanha APK — revisão integrada final, 08/10/2026

Novas causas de posição CONFIRMADAS e CORRIGIDAS: viewer Reflow vazio durante preparo publicava 1/1 e gravava .5→0; candidato documental agora só existe após publicação validada. Cancel/erro/cache image-based/derivado inválido restauravam progressos de modos incorretos; `returnToOriginal` usa posição Original própria. Timer de gravação de 500ms capturava settings antigos e revertia modo após troca; cleanup descartava a última posição ao fechar. Removido debounce: posição confirmada inicia gravação diretamente, atualizador funcional conserva settings atuais. VALIDADO em ReaderScreen real com fronteiras controladas: preparo sem escrita, .5→51/101 após ack, total provisório não persiste, UI/settings preservam instância, page=1 real aceita sem filtro, Back/cancel/erro/invalid retornam .2→21/101 Original, EPUB handshake/insets únicos, troca de modo permanece Original e fechamento imediato conserva a última escrita. Não prova conclusão de transação em encerramento forçado do processo.

VALIDADO Chromium com livros reais: Freud EPUB (26 capítulos) página 30→91, âncora 18111 visível; Ócio Reflow (49 páginas fonte/9 capítulos) página 22→66, âncora 23117 visível após tipografia. Display/transition/header 5 botões PASS. Não comprova fechamento/reabertura em app autenticado ou Android. Mecanismos locais de posição agora têm prova de documento/livro/React; incidente físico permanece PARCIAL. Tentativa APK JBR25 falhou no CMake worklets; build e recompilação final com JDK17 instalado PASS, artefato conferido no fechamento acima. Não houve upgrade/prebuild/instalação em aparelho.

## Campanha APK — grupo Anti-enjoo, 08/10/2026

IMPLEMENTADO: watchdog não mata listener após ausência de dados; neutraliza/oculta cues e recupera com próxima amostra real válida. Toggle revalida disponibilidade/permissão após unavailable. Baseline hook real controlado reproduziu morte definitiva da sessão; atual VALIDADO em late sample, três ciclos background/foreground, toggle/unmount/um listener, overlay pointerEvents none. Testes motion-cues/lifecycle/typecheck/export Web 2335/diff de grupo PASS. Arquivos session/useMotionCues/sensor/MotionCuesControl/motionDiagnostics e testes. Diagnóstico opt-in captura capacidades/permissão/eventos/forma/normalização/overlay, sem livro/credenciais; desligado por padrão. Sem timer de movimento/retry/novas dependências.

INCONCLUSIVO BUG 10 no Redmi: nenhum evento/inventário físico capturado (ADB vazio). DeviceMotion instalado exige cinco sensores; Accelerometer é independente mas entrega g + gravidade, sem orientação do display. Isso NÃO prova falta de sensor nesse Redmi nem autoriza declarar fallback correto; fallback NÃO IMPLEMENTADO antes da evidência exigida. Overlay não bloqueia toques e sensores continuam isolados do documento; Reader/anchors/persistência/Flashcards NÃO ALTERADOS por este grupo. Passos de captura e limites no checkpoint. Grupos A–E/regressões/build local concluídos; físico pendente.

## Campanha APK — grupo Sources, 08/10/2026

IMPLEMENTADO BUG 9: seleção real de plugins (Gutendex nem lê storage de fontes), cancelamento no ciclo inteiro, parciais por fonte com UI apropriada, histórico independente e instrumentação por operationId opt-in sem query/URL/credentials. Baseline reproduziu await history.save, Promise.all retendo parciais e body que ignora abort após deadline existente; fronteiras corrigidas sem novo timeout/retry/proxy. VALIDADO: pipeline/estados/cancel/list/throttle/supersession, HTTP local real JSON ativo/inválido/503, test-catalogs download/import/biblioteca. Typecheck/export Web 2334/diff do grupo PASS. PARCIAL: live Gutendex resultou erro terminal de acesso/rede, sucesso online NÃO VALIDADO; await do incidente Native INCONCLUSIVO sem aparelho. Arquivos usecase/fetcher/throttle/robots/search types/store/tela/cancellation/diagnostics/teste. Risco: história persiste após rede e pode perder última consulta em encerramento imediato. Biblioteca/originais/anotações/Reader/Auth/migrations/Flashcards NÃO ALTERADOS pelo grupo. Detalhes no checkpoint.

## Campanha APK — grupo Reader UI, 08/10/2026

IMPLEMENTADO: superfície documental única com insets Native/zeros Web para EPUB/Original/Reflow, independente dos controles. Header continua proprietário só do seu padding. Feedback abaixo da altura medida do header evita interceptar botões sem alterar z/árvore do documento. VALIDADO em Chromium com TopHeader real e estilos RN projetados: baseline feedback recebe clique, atual 5 botões recebem clique. Wrapper Native zero-height permanece INCONCLUSIVO, sem patch por hipótese; captura opt-in de bounds/pointerEvents/z/elevation/overflow/onPress desligada por padrão.

Posição: três divergências reproduzidas e CORRIGIDAS — tipografia preservava número mas perdia trecho; display no meio da transição sobrescrevia target; Native ignorava handshake e injetava antes do load. Agora documento preserva âncora após fontes/frame, espera transitionend; Native mantém source por capítulos e load/layout/ack; EPUB usa handshake igual Reflow, sem ignore page=1. VALIDADO controlado: âncora 39778 permanece na tela após página 30→97, display mantém identidade/página, transition mantém alvo, Native callback/theme/font mantém source e restaura só após layout/target. Sem novo delay/debounce/timeout. Arquivos ReaderScreen/Geometry/Controls/TopHeader/EpubDocument/NativeViewer/diagnóstico e testes reader-browser/native. Typecheck/export Web (2332)/reading-anchors/diff de grupo PASS.

PARCIAL para BUGS 2/3 e incidente de posição no APK: cutout/rotação/toques reais/fechar-reabrir/app autenticado inteiro NÃO TESTADOS. ADB sem aparelho. Teste browser usa fixture longa no documento compartilhado por EPUB/Reflow. Segurança dos anchors/estudo preservada pelos testes existentes; PDF Original/persistências/Flashcards NÃO ALTERADOS. Detalhes, riscos e retomada em CORRECOES_BUGS_APK_PROGRESSO.md.

## Campanha APK — grupo Reflow, 08/10/2026

IMPLEMENTADO: contrato comum de qualidade raw/derivado, sequência completa, indicador v1 e cache derivado v11 validado além da assinatura; rejeição legível para Original. VALIDADO: cinco PDFs reais com motor Web (Sociedade/Manifesto fallback; Ócio/Banquete/República Reflow), cache inválido/legado e builder sync/async/cancel. Native usa o mesmo contrato, mas execução PDF.js WebView física NÃO TESTADA. Arquivos: pdfReader, pdfReflowQuality, builder, caches, processadores, ReaderScreen, reflowOperation/Props, reflowDiagnostics, test-pdf-reflow.

IMPLEMENTADO: operação terminal única, AbortSignal, IDs, cleanup/destruição/worker, renderer failure, Back e cancelamento, montagem cooperativa por página, etapas sem falso 100%; publicação sem await de cache. VALIDADO controlado: cancelar com getPage pendente e durante builder, sem bridge tardia, página/tarefa limpas, geração seguinte conclui, hook de exceção de script. INCONCLUSIVO: origem de bytecode (injeção valida captura, não reproduz incidente); pendência original de 969 páginas/memória/canvas/toque físico. Diagnóstico opt-in seguro desligado por padrão. Sem timeouts/retries novos. PARCIAL para BUGS 1/8 no APK. Gates em conclusão; resultados finais no checkpoint.

NÃO ALTERADO: original, biblioteca, progressos/anotações, parser EPUB, dependências/CDN Native existente, migrations, Flashcards. Invalidação requer reprocessar derivado, não destrói dados. Riscos de imagem/canvas e leitura local não abortável documentados em CORRECOES_BUGS_APK_PROGRESSO.md. Export do grupo Auth concluído PASS.

## Campanha APK — grupo Auth, 08/10/2026

IMPLEMENTADO: callback sanitiza descrição bruta OAuth, lê query/fragmento Web/Native e cada efeito acompanha uma troca PKCE single-use compartilhada em memória (último código somente, sem logs). Baseline HEAD em teste React reproduziu efeito encerrado sem navegação e exposição de descrição; versão atual PASS. Recovery informa falha operacional em vez de falso envio; reset libera busy no finally. Arquivos: app/auth/{callback,forgot-password,reset-password}.tsx, src/data/remote/authService.ts, novo authCallback.ts, scripts/test-auth-callback.cjs. BUGS 5/6 existentes revalidados, sem refazer guards/validações.

VALIDADO controlado: login A–E/SDK, signup/categorias, callback baseline versus atual, URL Native com next, sanitização. Typecheck PASS; export em execução no checkpoint. NÃO TESTADO: conta válida real, email completo, consentimento, PKCE Android físico, RLS real. Sondas em 08/10: health 200/v2.197.0; Google/email ativos; profiles/overrides sem linhas 401/42501 (não prova de ausência). Apenas configuração pública disponível; ADB sem aparelho. BLOQUEADO externo: logs/policy/schema/Google/allowlist/template. Nenhuma migration/dependência instalada ou config remota alterada. Fluxos Reader/Sources/sensores/Flashcards NÃO ALTERADOS por este grupo. Passos manuais e evidências em CORRECOES_BUGS_APK_PROGRESSO.md.

## 2026-10-07 — Checkpoint da fase 1 de Auth (BUGS 5 e 6)

Escopo desta execução: somente login email/cadastro, a partir de DIAGNOSTICO_BUGS_APK.md. Baseline `77c490c`; único arquivo não rastreado recebido: o diagnóstico, preservado. Status/diff/stat/name-only conferidos; sem descarte de trabalho. Contextos, Auth, guards, cliente e migrations lidos antes de alterar produção.

**VALIDADO antes das correções:** teste React dos componentes atuais com Supabase/router/storage controlados (`scripts/test-auth-flows.cjs --baseline`). A: senha inválida sem sessão não navega/libera; B: sessão só libera com perfil ativo resolvido; C: sessão restaurada redireciona antes do formulário e tentativa inválida no serviço continua rejeitada; D: falha de perfil bloqueia e não vira erro de senha; logout retira acesso. E: exceção controlada de `router.replace` depois do sucesso Auth aparece no erro local de login e, após resolver perfil, o guard permite acesso. Primeira divergência comprovada: erro de navegação classificado na mesma operação de autenticação. Isso não identifica ainda a causa do incidente físico.

**BUG 6:** códigos `weak_password`, `unexpected_failure`, `over_email_send_rate_limit` e `user_already_exists` foram injetados separadamente no serviço real; todos perdem code/status na mesma conversão genérica. Cadastro com campos válidos alcança confirmação no teste controlado. A rejeição efetiva do APK continua **INCONCLUSIVA**; não há evidência para mudar policy/trigger/schema.

**Remoto:** uma tentativa com identidade aleatória de teste em `example.invalid` retornou HTTP 400/`invalid_credentials`, sem sessão antes/depois e sem SIGNED_IN. Health HTTP 200/v2.197.0; signup email habilitado, confirmação exigida, policy de senha não exposta em settings. Apenas chave pública disponível; nenhuma conta válida de teste ou credencial administrativa fornecida. ADB sem dispositivo. Autenticação válida e schema/RLS reais: **NÃO TESTADOS / PENDENTES**.

Próxima implementação: separar erro de navegação no login; preservar code/status/categoria sanitizados no cadastro; instrumentação opt-in para a evidência faltante. **NÃO ALTERADO** até este checkpoint: produção, migrations, configuração remota, Google/recovery, Reader/Reflow/Sources/anti-enjoo/Flashcards. Ferramenta React de teste isolada em `.expo/auth-test-tools`, sem dependência de produção. Não declarar os dois incidentes resolvidos por simulação/build.

### Resultado da fase 1 — BUGS 5 e 6 (2026-10-07)

Este fechamento prevalece sobre o checkpoint acima e sobre os estados históricos de Auth. **IMPLEMENTADO e VALIDADO em testes controlados**: tratamento separado de erro de navegação no login e preservação sanitizada de falhas do cadastro. **INCONCLUSIVO**: qual sequência ocorreu no APK do usuário e qual rejeição impediu seu cadastro. Nenhum dos dois relatos físicos está marcado como resolvido.

#### BUG 5: causa comprovada, correção e limites

O `try` de `Login.run` abrangia `await loginWithIdentifier(...)` e `router.replace("/")`. Em React com os componentes reais e fronteiras Supabase/router/storage controladas, injetou-se falha apenas no router após sucesso Auth e adiou-se a resposta de perfil: a mensagem da exception apareceu no erro local do formulário; ao resolver perfil ativo, `AuthGuard` permitiu acesso e Login retornou Redirect. Primeira divergência: falha da navegação tratada como falha da operação de login, apesar da sessão válida. **Confiança CONFIRMADA para esse caminho reproduzido; INCONCLUSIVA para sua participação no incidente do aparelho.**

A correção mínima separa os dois `try/catch`: rejeição de autenticação termina o handler sem navegação; exceção posterior do router informa autenticação concluída com falha de abertura e recebe estágio diagnóstico `navigation`. Não transforma rejeição em sucesso, não fabrica sessão, não altera precedência de profile/session nem apaga sessões anteriores em falha de credenciais. Erro bruto de navegação não é exibido. O sucesso de autenticação continua sujeito à autorização global.

**Autoridade de acesso preservada:** AppShell/Stack.Protected exige `!loading && session && profile.username && account_status === active`; AuthGuard aplica o mesmo bloqueio nas rotas; Index encaminha sessão ausente ao login, perfil indisponível à tela de erro, conta disabled ao bloqueio e username faltante à conclusão de perfil. Perfil/cache sozinhos não satisfazem essas condições. Profile remoto usa UUID da sessão; fallback de cache exige o mesmo UUID. A sessão vem do Supabase Auth, não de `public.users`.

O SDK instalado também foi executado com HTTP controlado: senha inválida não cria sessão; SIGNED_IN acontece antes de a Promise de login resolver; falha subsequente de credenciais mantém a sessão anterior, mas retorna erro e nenhuma nova sessão/SIGNED_IN. Na UI testada, uma sessão já restaurada com perfil redireciona antes de exibir o formulário; não há atribuição de sucesso dessa tentativa inválida. A hidratação/timeline específica do APK ainda falta. Uma chamada REAL ao servidor, sem sessão e com identidade aleatória em domínio reservado `example.invalid`, respondeu 400/invalid_credentials e permaneceu sem sessão.

#### BUG 6: causa ainda inconclusiva; perda diagnóstica corrigida

**Causa do bloqueio de todas as senhas: INCONCLUSIVO.** Última etapa comprovada: as regras locais deixam chegar a signUp com nome preenchido, username válido, email válido, senha de oito ou mais caracteres e confirmação idêntica. Primeira etapa desconhecida no incidente real: resposta do signUp e eventual operação de trigger/constraint/email. Cadastro controlado com esses dados chega a “Verifique seu email” sem liberar o app.

**Defeito comprovado e corrigido:** o serviço convertia qualquer erro backend na mesma Error, descartando code/status. Foram injetados separadamente weak_password/422, unexpected_failure/500, over_email_send_rate_limit/429 e user_already_exists/422; o baseline perdeu os quatro códigos. `AuthOperationError` agora conserva code conhecido, status HTTP e categoria sanitizada, sem causa/message/body originais. Códigos desconhecidos são representados por `unknown`, não por texto livre. Falha de transporte conhecida conserva a categoria network.

Mensagens por categoria distinguem policy de senha, email inválido, rate limit, serviço indisponível, verificação e backend. Conta existente/não autorizada e erro desconhecido compartilham mensagem neutra, sem expor existência de email; não foi adicionado endpoint de consulta de contas. `23505` significa conflito sem identificar automaticamente username/email; unexpected_failure/500 não prova trigger. Não se recomenda trocar username ou senha como suposta solução de falha do servidor. Estas alterações recuperam informação e corrigem a classificação, **não resolvem por si a rejeição real**.

**Policy:** frontend mantém exatamente mínimo oito caracteres (`string.length`), confirmação exata e nenhuma regra nova de composição/trim. `/auth/v1/settings` atual informou email habilitado, signup permitido e confirmação exigida, sem expor mínimo/composição/proteção contra senha vazada. Não foi enfraquecida nem alterada configuração remota. A mensagem weak_password só aparece quando o backend retorna essa categoria; não afirma quais exigências estão configuradas.

#### Schema e segurança

Lidas as duas migrations existentes. `auth.users` é a fonte de identidade; `public.profiles.id` referencia `auth.users(id)`; a tabela legada `public.users` não é substituta do Auth. Criar uma linha pública manualmente não cria credenciais válidas. Nenhuma tabela foi apagada/renomeada.

Na migration local, auth_create_profile é SECURITY DEFINER com search_path vazio e execução revogada para clientes; trigger AFTER INSERT em auth.users cria perfil com role=user/status=active, ignorando role solicitado em metadata. Username é normalizado, validado e tem índice único case insensitive; conflito nesse índice pode abortar cadastro, mas não foi constatado no servidor. SELECT e UPDATE de profile têm RLS por auth.uid; cliente recebe UPDATE apenas de username/display_name/avatar_url. Não recebe escrita em role/account_status ou user_feature_overrides. **Nenhuma migration criada ou aplicada**, nenhum SQL remoto executado, nenhum service_role introduzido no cliente. Grants/RLS/trigger efetivamente implantados e resistência à autopromoção de um usuário real continuam **NÃO TESTADOS** por falta de conta de teste/acesso administrativo.

#### Instrumentação de investigação mantida, opt-in

`src/utils/authDiagnostics.ts` usa `EXPO_PUBLIC_AUTH_DIAGNOSTICS=1`; ausência/qualquer outro valor deixa logs desligados. Sem endpoint, arquivo de log, storage de credenciais ou histórico persistente de eventos. Logger mantém somente um correlator temporário, filtra eventos/campos por allowlist e descarta mensagem bruta, objetos e chaves desconhecidas. UUIDs precisam ter formato UUID; nenhuma senha, confirmação, email, access/refresh token, authorization code, verifier ou secret é registrado. Contagem de senha só é número.

Eventos: LOGIN_ATTEMPT_STARTED, SIGN_IN_RESULT, AUTH_EVENT, PROFILE_RESOLUTION, AUTH_GUARD_DECISION (shell/rota), LOGIN_UI_RESULT, SIGNUP_STARTED, SUPABASE_SIGNUP_RESULT e SIGNUP_UI_RESULT. Registram sessão anterior presente/UUID, resultado/code/status/categoria, perfil remoto/cache, username presente/status, decisão de acesso e etapa de UI. Eventos assíncronos correlacionados por UUID/última operação são explicitamente `correlation=candidate`, não prova automática de causalidade. A chamada direta ao serviço fora da UI pode não ter operationId.

Cache de perfil recebe somente metadata aditiva `cachedAt` para medir idade; registros antigos continuam aceitos com idade desconhecida (`null`). Não foi introduzido TTL nem alterada a autorização offline. Falha de leitura remota é distinguida de falha de gravação do cache. A aplicação não pode observar execução interna do trigger: **PROFILE_CREATION remoto exige Auth/Postgres Logs**. UUID retornado no signup, sobretudo sem sessão, não prova email entregue nem criação de um novo registro público.

Instrumentação permanece necessária porque os dois incidentes físicos são inconclusivos; está silenciosa por padrão e não substitui correção. Remover chamadas/logger após a captura e revisão causal; não houve console temporário com credenciais ou dump bruto deixado no produto.

#### Matriz obrigatória e resultados

Os testes React montam Login/Signup/AuthProvider/AuthGuard reais; RN, router, storage e servidor têm fronteiras controladas. Teste adicional executa o SDK Supabase real com HTTP controlado. Não simulam o compositor Android, Stack completo do Expo, teclado, entrega de email ou RLS remoto. react-test-renderer 19.2.3 avisa depreciação; usado só na ferramenta isolada, não no app.

| Teste | Resultado e limite |
|---|---|
| 1. Credenciais inválidas não dão acesso | **VALIDADO** no componente/SDK controlados e chamada remota sem sessão (400 invalid_credentials) |
| 2. Credenciais válidas entram | **VALIDADO controlado**: bloqueado enquanto perfil pendente; permitido após perfil ativo. Conta real: **NÃO TESTADO** |
| 3. Erro de profile não aparece como senha inválida | **VALIDADO controlado**: acesso bloqueado, erro de perfil separado |
| 4. Sessão anterior não transforma rejeição em sucesso | **VALIDADO controlado**: UI restaurada redireciona antes do form; serviço/SDK rejeitam nova tentativa, sem novo SIGNED_IN. Timing físico: **PENDENTE** |
| 5. Logout remove acesso atual | **VALIDADO controlado** no Provider/Guard e SDK; sessão/cache próprios removidos |
| 6. Cadastro com dados válidos segue fluxo | **VALIDADO controlado** até confirmação, sem acesso antes de sessão/perfil; cadastro/email reais **NÃO TESTADOS** |
| 7. Senha inválida tem motivo coerente | **VALIDADO controlado**: mínimo local e weak_password remoto separados; policy real **PENDENTE** |
| 8. Erro de username não vira erro de senha | **VALIDADO controlado**: formato inválido não chama API; conflito 23505 é neutro, sem inventar constraint causadora |
| 9. Backend/profile/trigger não é classificado como senha | **VALIDADO controlado** para 500/permission/profile; trigger efetivo **NÃO TESTADO** |
| 10. Usuário não se promove a master | **VALIDADO somente contrato SQL estático** (grants, default role, FK, overrides). Tentativa com usuário normal/RLS remoto: **NÃO TESTADO / PENDENTE** |

Também aprovados: disabled/username ausente bloqueados; cache sem sessão/UUID diferente bloqueado; comportamento offline de cache do mesmo UUID preservado; confirmação desigual não chama signup; serialização hostil dos diagnósticos não vaza canários; logs desativados não emitem nada.

Checks: `node scripts/test-auth-flows.cjs` PASS; `node scripts/test-auth.cjs --auth-only` PASS (regras de username/role/status/permissão, sem executar repositório ou funcionalidades Flashcards); `npm.cmd run typecheck` PASS; `npm.cmd run export:web` PASS (2326 módulos/34 livros). Diff check do escopo Auth PASS. Checagens finais após documentação registradas abaixo.

**Fechamento dos checks:** baseline histórico `77c490c` e versão atual repetidos com React **19.2.3**, igual ao app, e renderer **19.2.3**: PASS, reproduzindo as duas falhas locais no baseline e aprovando a regressão atual. A instalação inicial de ferramenta tinha resolvido peer React 19.3.0; foi fixada explicitamente e as provas repetidas, sem alterar dependências do app. Typecheck final PASS; export Web final PASS (2326 módulos, cópia concluída); testes de Auth atuais/diagnósticos PASS; whitespace dos três arquivos novos PASS; diff check dos arquivos desta fase PASS. Diff check global permanece com falha de whitespace externa em Flashcards, descrita abaixo. Nenhum PASS de UI Android/Auth remoto válido/RLS real foi inferido desses gates.

Browser visual **NÃO TESTADO**: revisão automática recusou iniciar Chrome isolado (`blocked by policy`). A porta local 9333 encontrada não respondeu como endpoint CDP; não se acessou perfil pessoal. ADB sem dispositivo; APK novo não foi gerado/instalado nesta fase. O APK standalone contém JS embutido sem OTA: precisa novo build/instalação para receber o código ou habilitar diagnóstico; não basta Fast Refresh.

#### Arquivos desta fase, preservação e próximos passos

- Produção: `app/auth/login.tsx`, `app/auth/signup.tsx`, `src/data/remote/authService.ts`, novos `src/data/remote/authErrors.ts` e `src/utils/authDiagnostics.ts`.
- Instrumentação: `src/presentation/contexts/AuthContext.tsx`, `src/presentation/components/AuthGuard.tsx`, `app/_layout.tsx`; condições de autorização/layout preservadas.
- Testes: novo `scripts/test-auth-flows.cjs`; opção `--auth-only` em `scripts/test-auth.cjs` preserva execução padrão anterior.
- Documentação: `PROJECT_CONTEXT.md`, `ROADMAP_FUNCIONALIDADES.md`. Diagnóstico recebido preservado. Package/lockfile/dependências Native **NÃO ALTERADOS**.

Durante a execução surgiram mudanças concorrentes em arquivos de Flashcards e documentos/testes relacionados, ausentes no baseline. São externas a esta fase; não foram editadas, revertidas, analisadas funcionalmente nem incluídas na alegação de autoria. O diff check global detectou linha em branco extra em `src/domain/types/flashcards.ts:151`; preservar esse arquivo e registrar o resultado, não corrigir fora de escopo. Builds refletem o estado compartilhado naquele momento.

**Ações manuais pendentes:** reproduzir A–E no aparelho com build de diagnóstico e uma conta REAL de Auth de teste; capturar apenas linhas `[AuthDiagnostic]`, identificar primeiro estágio divergente. No BUG 6, correlacionar operação/horário com Auth Logs e, se erro de banco, Postgres Logs para distinguir trigger/constraint/grant; conferir policy de senha em leitura no Dashboard e verificar existência do usuário em Authentication → Users e perfil pelo UUID. Não enviar credenciais/URLs com tokens; não criar conta apenas em public.users. Rodar teste de tentativa de alteração de role/override com usuário normal em ambiente autorizado; nenhum PASS remoto presumido.

Para repetir testes locais, preparar ferramenta isolada com `npm.cmd install --no-save --package-lock=false --ignore-scripts --prefix .expo/auth-test-tools react@19.2.3 react-test-renderer@19.2.3` e executar os dois scripts acima. React de teste é conferido contra a versão do app. O modo `--baseline` lê os cinco fontes Auth do commit `77c490c` em memória, sem restaurar arquivos, para repetir a prova anterior à correção. Para captura futura no APK, definir `EXPO_PUBLIC_AUTH_DIAGNOSTICS=1` somente no processo de build (`npm.cmd run build:apk:local`); reinstalar preservando dados, filtrar saída por `[AuthDiagnostic]` e voltar ao build normal após investigação. A flag não contém segredo. Não foi alterado `.env.local`.

**Riscos restantes:** cache de perfil offline sem TTL permanece contrato anterior; perfil ativo em cache não confirma status remoto atual. Componentes com respostas controladas não reproduzem timing físico/Stack completo. Policy, triggers, migrations e grants reais não acessíveis pela chave pública. Não aplicar mudanças adicionais de sessão, SQL ou password policy por hipótese.

**NÃO ALTERADO por esta fase:** Google Login/BUG 4, recovery/BUG 7, Reader, Reflow, Sources, anti-enjoo e funcionalidades Flashcards; sem refactor geral, troca de Supabase, commit ou alteração remota. Próxima etapa autorizável: obter evidência faltante dos BUGS 5/6 e corrigir apenas a primeira divergência comprovada.

Referências primárias consultadas para classificar falhas, sem inferir configuração do projeto: [Supabase Auth error codes](https://supabase.com/docs/guides/auth/debugging/error-codes), [falhas de criação de usuário e banco](https://supabase.com/docs/guides/troubleshooting/database-error-saving-new-user-RU_EwB), [signInWithPassword](https://supabase.com/docs/reference/javascript/auth-signinwithpassword) e [signOut](https://supabase.com/docs/reference/javascript/auth-signout).

## 1. Visão geral do projeto

Aplicativo de biblioteca e leitura de livros digitais. A base usa TypeScript, React Native e Expo/Expo Router, com alvos Web e Native. A interface é organizada em telas, componentes de apresentação, casos de uso, repositórios e serviços. Há caminhos específicos para EPUB e PDF no Web e Native.

## 2. Arquitetura atual

- `app/`: rotas Expo Router e composição/providers da aplicação.
- `src/domain/`: entidades, tipos, repositórios e casos de uso.
- `src/data/`: persistência, importação, parser, downloads e fontes/catálogos.
- `src/presentation/`: telas, componentes, contextos e stores.
- `ReaderScreen` (`src/presentation/screens/ReaderScreen.tsx`) carrega o livro/capítulos, configura restauração e progresso, e compõe os controles e o adapter.
- `DocumentReaderAdapter` (`src/presentation/components/reader/DocumentReaderAdapter.tsx`) escolhe EPUB, PDF Original, PDF Reflow ou conteúdo de texto e instala as zonas de navegação.
- EPUB Web: `EpubPageViewer.web.tsx` cria um `srcDoc` por lista de capítulos e hospeda a paginação em iframe. `EpubReaderDocument.ts` gera o HTML/CSS/JS executado nesse iframe.
- Parser EPUB: `src/data/epub/EpubFileImporter.ts` e `EpubParserService.ts`; capítulos persistidos são consumidos pelo caso de uso de abertura/repositório.
- PDF Original: `PdfPageViewer` com implementações por plataforma. PDF Reflow: `PdfReflowProcessor` e tipos/cache próprios; seu documento derivado não substitui o PDF original.
- Persistência e cache usam implementações SQLite e IndexedDB em arquivos específicos de plataforma. Consulte as interfaces em `src/domain/repositories/` antes de alterar.
- Biblioteca/downloads: telas em `app/(tabs)/`, stores e serviços em `src/data/` e `src/presentation/`.
- Navegação entre telas usa Expo Router; navegação de páginas EPUB é uma mensagem para o iframe.

## 3. Fluxo de abertura de EPUB

1. A rota/tela do Reader entrega `bookId` a `ReaderScreen`.
2. Um efeito chama `appDependencies.openBook.execute(bookId)`.
3. Para um EPUB empacotado sem capítulos persistidos, a tela resolve a URI pelo catálogo empacotado, chama `epubImporter.importFromUri(...)` e lê livro/capítulos novamente.
4. `ReaderScreen` guarda capítulos, tipo, caminho e progresso inicial; então monta `DocumentReaderAdapter`.
5. O adapter seleciona `EpubPageViewer`. No Web, ele gera o HTML por `createEpubReaderDocument(chapters, settings)` e o entrega ao `iframe` via `srcDoc`.
6. Ao carregar, o iframe recebe `display`, a página atual e tipografia. O script calcula páginas, reporta `page` por `postMessage`, e a tela atualiza página/progresso.

Os spans de diagnóstico existentes em `src/utils/epubOpenMetrics.ts` e chamadas no fluxo registram eventos quando habilitados; não confundir esses eventos com uma medição visual de pixels renderizados.

## 4. Fluxo de navegação EPUB

- Estado de página atual mantido pelo Reader: `epubPage`; pedido animado é `epubNavigationRequest`.
- No iframe, `currentPage` representa a página exibida e `targetPage` o destino durante animação. `navigatePage()` aplica classe de transição; `transitionend` em `transform` confirma a página via `finishNavigation()`.
- `goToPage()` é navegação direta e sincroniza o transform e o estado reportado.
- `resize`, `ResizeObserver`, imagens e alterações de tipografia chamam recálculo de layout. Esse caminho deve manter a posição lógica e não reaplicar restauração de abertura.
- Na abertura, `initialEpubProgress` é usado na primeira informação de paginação quando `epubTotalPages` ainda é zero e então é limpo.
- O iframe é preservado enquanto a lista `chapters` não muda; `srcDoc` é memoizado por essa lista. Não introduzir `key` dependente de página/UI.
- A mudança de 2026-10-02 memoiza o viewer Web e estabiliza callback para que alterações apenas nas barras não re-renderizem a subárvore do iframe. Isso ainda requer teste funcional no navegador.

## 5. Fluxo de PDF

### PDF Original

Usa `PdfPageViewer` e o arquivo fonte, com estado próprio de página/layout/zoom/rotação. Não alterar como efeito colateral de trabalho EPUB.

### PDF Reflow

Usa documento derivado e componentes/cache próprios (`PdfReflowProcessor`, tipos `pdfReader` e repositórios de cache). Preservar distinção entre página real do PDF e páginas estimadas/derivadas. Não processar Reflow antecipadamente sem solicitação e análise própria.

## 6. Configurações do leitor

`ReaderSettingsContext` mantém configurações visuais; o Reader as aplica ao documento. O estado inclui tamanho e família de fonte, margem/largura máxima, altura de linha, espaçamento de parágrafo, alinhamento, seleção e tema/paleta. Header oferece configurações, busca e sumário quando aplicáveis. `ReaderSettingsPanel` contém os painéis visuais/funcionais. Mudanças de UI ou tema não devem restaurar progresso de abertura.

## 7. Bugs conhecidos

### Resolvidos

- **Spinner infinito na tela de callback de autenticação ao receber erro OAuth (2026-10-06):** quando o provedor externo (Google) ou o Supabase redirecionavam com parâmetros de erro (`error`, `error_code`, `error_description`) via query ou fragmento `#hash`, a rota `app/auth/callback.tsx` ignorava os erros pois aguardava apenas o parâmetro `code`. Com isso, a tela ficava permanentemente presa no título "Concluindo acesso" com `ActivityIndicator` ativo. Resolvido com a extração de parâmetros de erro da query e do hash, interrupção imediata do loading, exibição de mensagem descritiva de falha e botão para retorno ao login.

### Em investigação

- EPUB Web volta à primeira página ao tocar no centro para abrir os controles. **Reprodução funcional confirmada no ambiente real do usuário:** basta UM ÚNICO clique central para abrir os controles e o EPUB reseta para o início; não há segundo clique. Este é o bug registrado em `BUG_CONTEXT_EPUB_CENTER_RESET.md`, não apenas um relato histórico. Um ensaio separado em Chrome Headless não reproduziu, mas não invalida a reprodução real. A causa no caminho EPUB continua sem captura runtime que identifique a primeira escrita/mensagem causadora; não marcar como resolvido.
- Em 2026-10-02 foi isolada a subárvore do `EpubPageViewer` de rerenderizações apenas de UI. O teste controlado/headless e a tentativa posterior no browser integrado não reproduziram o reset. Isso não invalida a reprodução funcional confirmada pelo usuário no ambiente real: um clique central único abre os controles e retorna o EPUB ao início. A causa e a correção continuam pendentes.
- Dossiê forense detalhado, com histórico, limites das evidências, estado, hipóteses e plano de instrumentação: [BUG_CONTEXT_EPUB_CENTER_RESET.md](BUG_CONTEXT_EPUB_CENTER_RESET.md). A causa raiz continua sem confirmação runtime.

### Ainda não investigados

- Nenhum item adicional confirmado nesta tarefa. Adicione novos relatos aqui sem convertê-los em causas sem evidência.

## 8. Alterações já realizadas

### [2026-10-06] — Tratamento de erros e extração de hash no callback de autenticação

**Problema:** tela de callback de autenticação (`/auth/callback`) ficava travada indefinidamente em "Concluindo acesso" com spinner de carregamento quando o fluxo OAuth do Supabase/Google retornava erro na URL (`error=server_error&error_code=unexpected_failure&error_description=Unable+to+exchange+external+code...`).

**Causa:**
1. No fluxo remoto: o Supabase Auth falhou ao trocar o authorization code retornado pelo Google (`4/0A...`) junto à API de tokens do Google (`Unable to exchange external code`), redirecionando a aplicação para o callback com parâmetros de erro na query e/ou no hash `#error=...`.
2. No fluxo cliente: `app/auth/callback.tsx` consumia apenas o parâmetro `code` via `useLocalSearchParams`. Como `code` vinha indefinido, o efeito retornava precocemente sem atualizar o estado `error`. O componente mantinha `error = null` e renderizava o spinner indefinidamente.

**Solução:**
- Implementada a função auxiliar `extractCallbackParams()` para capturar `code`, `error`, `error_description` e `error_code` tanto de `window.location.search` quanto de `window.location.hash` na Web.
- Tipado e expandido `useLocalSearchParams` para incluir os parâmetros de erro do Expo Router.
- Verificação prioritária de `effectiveError`: interrupção do carregamento, mapeamento de mensagens (ex.: "Unable to exchange external code" traduzido para orientação sobre expiração ou credenciais OAuth do Google no Supabase) e renderização acessível com `AuthLink` para retornar ao login.
- Fallback quando a URL não contém código nem erro para evitar carregamento fantasma.

**Arquivos alterados:** `app/auth/callback.tsx`, `PROJECT_CONTEXT.md`.

**Validação:** `npm.cmd run typecheck` PASS; `node scripts/test-auth.cjs` PASS.

### [2026-10-02] — Isolar iframe EPUB de mudanças das barras

**Problema:** abrir/fechar as barras foi associado pelo usuário a retorno do EPUB Web à página 1.

**Causa:** a auditoria não encontrou caminho que zere a página em resposta direta ao estado das barras. Identificou que o controle de visibilidade era passado sem uso ao adapter e que mudanças de layout podem limitar a página ao total medido. A conexão entre o clique e um resize/medição inválida permanece hipótese ainda não confirmada.

**Solução:** remover `controlsVisible` como prop sem uso do adapter; estabilizar o callback de informação de página e memoizar `EpubPageViewer` para não re-renderizar o iframe por alterações exclusivas das barras.

**Arquivos alterados:** `src/presentation/screens/ReaderScreen.tsx`, `src/presentation/components/reader/DocumentReaderAdapter.tsx`, `src/presentation/components/EpubPageViewer.web.tsx`, `PROJECT_CONTEXT.md`.

**Validação:** typecheck, export Web e diff check solicitados nesta tarefa; ver resultados após execução abaixo. Teste controlado em Chrome Headless: página 15 preservada em três alternâncias; o defeito não se reproduziu. Teste no ambiente original do relato: pendente.

**Observações:** build não prova a correção funcional. Manter bug em investigação até teste no navegador.

## 9. Decisões arquiteturais

- O EPUB empacotado é importado sob demanda quando o livro é aberto e não possui capítulos persistidos; não processar todos os livros da biblioteca de forma especulativa.
- EPUB Web usa capítulos preparados e um documento HTML em iframe.
- Página atual e página destino durante transição são estados distintos; `transitionend` confirma a navegação animada.
- PDF Original e PDF Reflow são caminhos separados; Reflow é derivado.
- Não alterar parser, cache, downloads, PDF ou Reader para corrigir regressões de controles EPUB sem necessidade comprovada.

## 10. Testes realizados

- `npm.cmd run typecheck`: PASSOU (2026-10-02).
- `npm.cmd run export:web`: PASSOU (2026-10-02). Metro descartou cache ilegível e fez full crawl; bundle e cópia dos assets terminaram com sucesso.
- `git diff --check`: PASSOU (2026-10-02), a confirmar na checagem final após atualização deste arquivo.
- Regressão manual EPUB em navegador (página intermediária, abrir/fechar barras repetidamente): NÃO TESTADO.
- Não marcar bug como resolvido apenas pelo sucesso dos comandos de build.

## 11. Próximos passos

- Executar as validações desta alteração.
- Testar no Web: abrir EPUB, avançar até página intermediária (ex. 10), abrir e fechar controles várias vezes e verificar que a mesma posição continua visível.
- Se persistir, registrar eventos reais de resize/ResizeObserver, mensagens `page`, `iframe.onload` e página antes/depois do clique para identificar a primeira chamada que altera a página; não adotar atraso ou compensação artificial.
- Usar `BUG_CONTEXT_EPUB_CENTER_RESET.md` como contexto para investigação independente; não repetir correções hipotéticas antes de identificar a primeira escrita/mensagem que introduz página 1.

## 12. Regras importantes para futuras IAs

- Antes de mexer no Reader, leia este arquivo e confirme o comportamento no código atual.
- Faça mudanças pequenas e preserve o escopo explícito do usuário.
- Não afirme causa confirmada quando houver apenas hipótese; diferencie auditoria estática, build e validação funcional.
- Controles visuais não devem reabrir/recriar o EPUB, iframe nem progresso.
- Não remover a conclusão de navegação EPUB por `transitionend` nem misturar página atual e página destino.
- Não alterar parser EPUB/PDF, PDF Original/Reflow, cache, downloads, busca ou métricas sem autorização e necessidade demonstrada.
- Execute somente as validações pedidas/aplicáveis e atualize este arquivo junto de alterações relevantes.

### Atualização de diagnóstico do Reflow — 2026-10-02

A causa confirmada do texto corrompido no Reflow foi a ausência de validação do conteúdo bruto extraído do PDF.js. O pipeline aceitava `page.getTextContent().items[].str` sem medir se a string continha caracteres de substituição (`�`/`\uFFFD`), uso privado (`\uE000-\uF8FF`) ou proporção muito baixa de caracteres legíveis. O documento derivado era então montado e renderizado como se o texto fosse confiável, mesmo quando o conteúdo do PDF já estava corrompido antes da camada HTML/CSS.

Arquivos alterados para a correção: `src/presentation/components/PdfReflowProcessor.web.tsx`, `src/presentation/screens/ReaderScreen.tsx` e `src/presentation/components/ReaderSettingsPanel.tsx`.

O comportamento atual é conservador: quando a extração do PDF.js não produz texto utilizável, o Reflow falha de forma explícita e retorna ao PDF Original em vez de renderizar um documento quase vazio ou preenchido por quadrados. A correção não tenta OCR ou inventar texto; ela garante que o PDF original continue utilizável e que o Reflow só abra quando o texto bruto tiver qualidade mínima aceitável.

Validação de layout: a largura do painel de aparência foi limitada a um máximo coerente em desktop e a camada de fundo do painel foi centralizada para manter o layout antes de mudanças de viewport. A área do documento Reflow continua sendo tratada separadamente dos controles do leitor.

### Diagnóstico final do Reflow e validação da extração bruta — 2026-10-05

A validação executada nesta sessão confirmou a causa raiz do problema: a corrupção aparece já em `page.getTextContent().items[].str` do PDF.js, antes de qualquer `PdfReflowDocumentBuilder`, HTML ou DOM. O padrão é consistente para os PDFs problemáticos:

- `o-banquete.pdf`: 140.678 caracteres, 109.305 letras, 0 caracteres de controle.
- `sobre-o-ocio.pdf`: 26.524 caracteres, 21.398 letras, 0 caracteres de controle.
- `manifestocomunista.pdf`: 72.318 caracteres, 2.046 letras, 46.120 caracteres de controle, proporção 63,8%.
- `sociedade do espetaculo.pdf`: 194.073 caracteres, 4.177 letras, 120.122 caracteres de controle, proporção 61,9%.
- `contratosocial.pdf`: 277.613 caracteres, 4.472 letras, 206.782 caracteres de controle, proporção 74,5%.
- `divina-comedia.pdf`: 684.897 caracteres, 31.910 letras, 475.287 caracteres de controle, proporção 69,4%.
- `dostoievski-fiodor-os-irmaos-karamazov-completo.pdf`: 1.750.403 caracteres, 7.881 letras, 1.369.710 caracteres de controle, proporção 78,3%.
- `o-capital-livro-1.pdf`: 2.558.272 caracteres, 2.027.113 letras, 0 caracteres de controle.

Os PDFs problemáticos têm o mesmo padrão: muito poucos caracteres legíveis e altos valores de caracteres de controle ASCII (`\u0001`, `\u0002`, etc.), em vez de texto em linguagem natural. Isso alinha com a hipótese de que a extração contextual do PDF.js está corrompida antes da reconstrução do documento Reflow.

A regra de validação foi reforçada para rejeitar documentos que atendam conjuntamente:

- `controlChars >= 100`
- `controlRatio >= 0.2`
- `letterRatio < 0.35` ou `controlRatio > 0.6 && letterRatio < 0.5`

Isso preserva o comportamento conservador do fallback e evita que documentos validos com algumas pontuações, símbolos ou acentos sejam descartados por regra genérica. O validador continua rejeitando texto parcialmente ilegível sem inventar caracteres nem tentar OCR.

A invalidation do cache também foi aplicada via `PDF_REFLOW_PROCESSOR_VERSION` em `src/domain/types/pdfReader.ts`, para assegurar que documentos já processados com a regra anterior não sejam reutilizados por um cache legado quando a validação foi reforçada.

Resultado esperado do pipeline agora:

- PDFs limpos e legíveis continuam abrindo em Reflow.
- PDFs com extração bruta corrompida retornam ao PDF Original, sem exibir `Leitura livre pronta` sobre conteúdo lixo.
- O comportamento de fallback permanece explícito e não transforma texto ruim em um documento “preparado”.

### Atualização de investigação runtime — 2026-10-02

O fluxo instrumentado foi exercitado em Chrome Headless 154/Windows com o EPUB empacotado “Sigmund Freud Na Sua Época E Em Nosso Tempo” (26 capítulos). Na página 15, três cliques no botão central abriram/fecharam os controles sem alterar página, progresso, transform ou instância do iframe. O Reader e o adapter renderizaram; o viewer e o documento iframe não apresentaram atividade associada aos cliques. O bug não se reproduziu nesse ambiente, portanto a causa raiz permanece desconhecida e o relato permanece em investigação. Limitação: viewport 764×429 e uso do Chrome Headless. Repetir com o ambiente exato do relato; detalhes e instrumentação em [BUG_CONTEXT_EPUB_CENTER_RESET.md](BUG_CONTEXT_EPUB_CENTER_RESET.md).


### Ensaio runtime em Leitura Livre/Reflow — 2026-10-02

No PDF empacotado “Manifesto Comunista”, selecionei “Leitura Livre” no seletor e esperei a interface exibir “Leitura livre pronta.” Na página 15 de 223, o primeiro clique central reproduziu o reset. O toggle mudou `controlsVisible` para true e o ramo Reflow moveu o `readerDocument` para dentro de `ReaderControls` em fluxo; o runtime registrou unmount/remount do adapter, viewer e iframe. A nova instância começou em `currentPage=1`, o `ResizeObserver` recalculou altura (428×384 para 428×228) e total de páginas (223 para 413), e a mensagem `page=1` fez `ReaderScreen` gravar `epubPage 15→1`. Mensagens subsequentes de página 1/15 oscilaram, então encerrei o navegador e não contabilizei toggles ou resize adicionais. Esta é evidência runtime para PDF Reflow; EPUB não usa `pdfReadingMode`. Nenhuma correção foi aplicada. O dossiê contém timestamps e limitações completos.

### Correção estrutural do reset em Reflow — 2026-10-02

A causa confirmada era a mudança de ancestralidade de `readerDocument` ao abrir controles no ramo PDF Reflow. A mudança desmontava adapter/viewer/iframe; a nova instância iniciava em página 1, e sua mensagem `page=1` atualizava a página do Reader. `ReaderScreen.tsx` agora conserva o documento dentro do mesmo `ReaderControls` e `ReaderControls.tsx` reserva um slot estável para ele, alternando apenas o layout e a visibilidade/interatividade dos controles.

Em Chrome Headless 154/Windows, no PDF empacotado “Manifesto Comunista” com “Leitura Livre” selecionada, 10 alternâncias na página 15 não desmontaram o iframe nem mudaram a página. Navegação até 18 e mudanças de tema/fonte/espaçamento também preservaram a posição. Resize/reflow alterou a altura útil de 384 para 228px e o total de páginas variou 223↔413, mas a página lógica foi mantida. A medição externa da janela não confirmou mudança de viewport.

Limitações restantes: o caso de fechar/reabrir tem uma oscilação de mensagens página 1/11 durante a restauração de progresso e não foi considerado aprovado; testes de navegador pós-correção em EPUB e PDF Original também estão pendentes. Não atribuir esses problemas à correção dos controles sem investigação específica. Detalhes em [BUG_CONTEXT_EPUB_CENTER_RESET.md](BUG_CONTEXT_EPUB_CENTER_RESET.md).

### Investigação separada: restauração de progresso em PDF Reflow

A oscilação após fechar e reabrir “Manifesto Comunista” em Leitura Livre tem dossiê próprio em [BUG_CONTEXT_EPUB_PROGRESS_RESTORE.md](BUG_CONTEXT_EPUB_PROGRESS_RESTORE.md). A captura preservada mostra o percentual 0.058333…, conversão inicial com 165 páginas para página 11, mudança reportada para 241 páginas, page info atrasado `page=1` que sobrescreve a restauração, e respostas posteriores `page=11` que iniciam a alternância. Nenhuma correção foi implementada. A captura concreta cobre a posição salva equivalente à página 15; repetir páginas 5, 18 e próxima do final continua pendente, assim como medir CLOSE/pageNumber persistido diretamente e associar com exatidão o recálculo que altera 165→241. Este problema é distinto do reset ao abrir/fechar controles.

### Correção implementada para a restauração de progresso em Reflow — 2026-10-02

Foi implementado um handshake de inicialização em três fases (`pending`, `applying`, `inactive`). O iframe sinaliza `layoutReady` depois da prontidão de fontes/imagens e de um recálculo de layout. O Reader converte o percentual salvo usando esse total, envia o destino e mantém mensagens fora do alvo sem alterar o estado até receber o ACK da página/total. Se o total mudar durante a aplicação, recalcula o destino com o total novo. Depois do ACK, page info volta a ser aceito normalmente. O iframe começa com a restauração pendente desde a criação do srcDoc e não envia um comando inicial de página 1; recálculos leem a página lógica atual na hora de aplicar o frame para evitar replay de estado capturado anteriormente. O handshake não usa timeout, retry ou regra especial para página 1; o caminho tipográfico normal após a restauração foi preservado.

O handshake é restrito ao PDF Reflow. EPUB e PDF Original não passam por essa máquina; o slot estável do ReaderControls também foi preservado. `npm.cmd run typecheck`, `npm.cmd run export:web` e `git diff --check` passaram na versão final, mas não foi possível executar o ensaio pós-mudança: Chrome e Edge headless encerraram por falha fatal do processo GPU. Reaberturas em posições baixa/intermediária/próxima do final e toggles dos controles estão pendentes. A correção não deve ser declarada resolvida até validação manual/browser sem oscilação. Detalhes e limites em [BUG_CONTEXT_EPUB_PROGRESS_RESTORE.md](BUG_CONTEXT_EPUB_PROGRESS_RESTORE.md).

#### Nova tentativa de browser — 2026-10-02

O servidor Expo em `127.0.0.1:8084` respondeu HTTP 200 para `/library`. Foram tentados Chrome não headless, Chrome não headless com opções SwiftShader/desativação de GPU e Edge headless, cada qual com perfil isolado. Chrome e Edge registraram falha fatal `GPU process isn't usable`; o subprocesso GPU reportou `-1073741790` (`0xC0000022`). Edge chegou a expor via CDP um alvo para `/library`, mas a sessão deixou de responder antes de inspeção funcional. Em uma repetição, o processo principal Edge permaneceu ativo após 15 s sem CDP; não foi obtido exit code do processo principal. Nenhum livro ou fluxo de restauração foi validado nesta sessão.

**Status da validação da restauração:** Implementação concluída, validação funcional pendente. A matriz de reabertura em posições baixas/intermediárias/próximas do final, 10 toggles de controles na página 15, navegação/estilo, PDF Original e smoke de EPUB continua pendente. Evidências e comandos estão em [BUG_CONTEXT_EPUB_PROGRESS_RESTORE.md](BUG_CONTEXT_EPUB_PROGRESS_RESTORE.md).

### Validação final de fim de semana — 2026-10-02

- `npm.cmd run typecheck`: PASSOU.
- `npm.cmd run export:web`: PASSOU e gerou a pasta `dist` com os 34 livros e os assets do catálogo.
- `git diff --check`: PASSOU.
- Smoke test no navegador: a biblioteca carregou, o livro Manifesto Comunista entrou em Leitura Livre e exibiu `Leitura livre pronta.`, e o EPUB `Sigmund Freud ...` abriu com conteúdo visível. O ambiente de export está pronto para uso pessoal localmente em `c:\KIndle\dist`.
- O cenário de restauração de progresso permanece pendente de validação funcional em ambiente gráfico estável; não houve nova correção de código para esse caminho.

### Consolidação da investigação — 2026-10-02

Esta atualização é documental. Não foi aplicada nenhuma correção de código nesta etapa. As conclusões abaixo consolidam o estado da investigação e prevalecem sobre descrições anteriores que chamavam a reprodução do EPUB de apenas relato ou diziam que o teste no ambiente real ainda estava pendente.

#### Alterações de código feitas

- `src/data/local/PdfReflowDocumentBuilder.ts`: foi corrigida a continuidade/truncagem de texto entre linhas e páginas no documento Reflow. O builder mantém parágrafos através de quebras de página quando a geometria indica continuação, só inicia novo parágrafo em separação vertical ou indício de recuo após pontuação final, e une palavras hifenizadas que continuam em minúscula na linha seguinte. Também ignora rótulos de capítulo repetidos antes de descarregar o parágrafo, evitando que cabeçalhos correntes de página dividam o texto. Há reconstrução específica para texto com letras espaçadas/tracking. A implementação está no arquivo atual; uma validação funcional comparativa completa do texto renderizado ainda não está registrada.
- `src/presentation/components/PdfReflowProcessor.web.tsx`: a extração bruta do PDF.js é avaliada antes de montar o documento. Quando há quantidade/proporção alta de caracteres de controle, o processamento falha explicitamente e o fluxo retorna ao modo PDF Original, em vez de apresentar texto sem sentido no Reflow. Não há OCR nem reconstrução inventada para um mapa de caracteres danificado.
- O caminho do Reflow mantém e serializa imagens extraídas dos operadores de imagem do PDF.js. A detecção de capitular decorativa e sua apresentação como imagem no documento derivado também estão implementadas. Isso não resolve automaticamente glifos de fonte/símbolos cujo mapa textual do PDF esteja corrompido.
- Para o bug de controles em PDF Reflow, `ReaderScreen.tsx` e `ReaderControls.tsx` mantêm o documento no mesmo slot/ancestralidade ao alternar overlay/flow. O ensaio após essa mudança preservou a página em 10 alternâncias, navegação e mudanças de aparência. Essa correção é específica do PDF Reflow e não corrige o reset confirmado no EPUB Web.
- Para restauração de progresso do PDF Reflow, existe handshake `pending/applying/inactive` com sinal `layoutReady` e confirmação do destino. Typecheck e export passaram; o ensaio funcional depois dessa implementação não pôde ser concluído por falha do processo GPU nos browsers usados.

#### Testes e investigações executados

- `npm.cmd run typecheck`: PASSOU na validação registrada em 2026-10-02.
- `npm.cmd run export:web`: PASSOU na validação registrada em 2026-10-02, com export dos assets/livros.
- `git diff --check`: PASSOU na validação registrada antes desta atualização documental.
- `node debug-reflow-metrics-temp.mjs`: executado nesta consolidação para medir texto obtido de `PDFPageProxy.getTextContent()` pelo PDF.js nos arquivos locais. O script não modifica os PDFs nem o código da aplicação.
- Chrome Headless 154/Windows: o EPUB empacotado Sigmund Freud permaneceu na página 15 durante três cliques centrais num teste anterior; viewport CSS 764×429. É resultado negativo apenas naquele cenário e não refuta o reset de um clique no ambiente real do usuário.
- Chrome Headless 154/Windows, Manifesto Comunista em Leitura Livre, antes da correção estrutural dos controles: clique central desmontou/remontou adapter/viewer/iframe, a nova instância iniciou em página 1 e a mensagem recebida pelo Reader gravou `epubPage 15→1`.
- No mesmo cenário após a correção estrutural: 10 alternâncias preservaram página 15 sem remontar o iframe; navegação até 18 e mudanças de tema/fonte/espaçamento preservaram a página. A altura útil mudou 384→228 px e o total estimado variou 223↔413, sem perda da posição lógica.
- Chrome e Edge foram tentados para validar a restauração de progresso após o handshake; o processo GPU falhou (`GPU process isn't usable`, subprocesso reportou `0xC0000022`). Não há resultado funcional pós-handshake.
- Um smoke test Web anterior abriu a biblioteca, abriu o Manifesto em Leitura Livre mostrando “Leitura livre pronta.” e abriu o EPUB Sigmund Freud com conteúdo visível. Não equivale a validar restauração do PDF Original ou corrigir o reset EPUB real.

#### Resultados funcionais e causa do texto corrompido

- **EPUB Web, ambiente real do usuário:** bug reproduzido funcionalmente. UM clique central para abrir os controles basta para voltar ao início; não existe segundo clique. A correção não está identificada. O resultado headless que preservou a página permanece válido para aquele ambiente de teste, não para o ambiente real.
- **PDF Reflow, alternância dos controles:** a causa foi confirmada por runtime como mudança de ancestralidade do documento, causando unmount/remount e página 1 inicial. A correção estrutural foi validada no Chrome Headless, conforme acima.
- **PDF.js já entrega texto corrompido para o Manifesto Comunista:** a sonda mediu `Livros/manifestocomunista.pdf`, 68 páginas: 21.509 itens, 72.318 caracteres, apenas 2.046 letras e 46.120 caracteres de controle (63,8% do total). Na página 2, 366 de 542 caracteres eram controles e havia apenas 2 letras. A extração retornou controles como `\u0001`, `\u0002` etc.; não eram caracteres introduzidos pelo HTML nem pelo `PdfReflowDocumentBuilder`.
- Dois testes de CMap para a página 2 do Manifesto (CMaps locais da versão instalada e CMaps remotos do PDF.js 3.11.174) produziram as mesmas métricas e exemplos; a troca de CMap não recuperou o texto. A evidência localiza a corrupção antes do builder, na extração textual do PDF.js/dados de fonte/mapeamento do próprio PDF. A causa interna exata (fonte/CMap/encoding do arquivo) não foi isolada.
- **PDF de comparação com extração legível:** `Livros/sobre-o-ocio.pdf`, 49 páginas: 3.071 itens, 26.524 caracteres, 21.398 letras e zero caracteres de controle no scan integral. `Livros/sociedade do espetaculo.pdf` também mostra o mesmo padrão de corrupção (169 páginas; 120.122 controles em 194.073 caracteres), portanto não deve ser usado como exemplo “bom”.
- A sonda também encontrou outros arquivos com muitos controles, por exemplo `contratosocial.pdf` (77,8% nos três primeiros páginas amostradas), `divina-comedia.pdf` (70,1%) e `dostoievski-fiodor-os-irmaos-karamazov-completo.pdf` (74,8%). `o-capital-livro-1.pdf` não retornou texto nas três primeiras páginas. Esses casos não receberam scan integral nesta execução, exceto Manifesto, Sobre o Ócio e Sociedade do Espetáculo.

#### PDF Original: estado da restauração

- O arquivo fonte não é substituído pelo documento derivado Reflow. No erro de extração/corrupção, o caminho atual muda `mode` para `original`, limpa o documento Reflow e informa que o PDF Original continua disponível. Na abertura, o progresso do Original usa `originalProgress` salvo quando disponível, com fallback para o progresso geral; na mudança de modo, usa `originalProgress ?? progress`.
- **Resultado funcional da restauração do Original:** o fallback está implementado no código, mas não há nesta investigação um ensaio de browser documentado que tenha provocado a falha de extração do Manifesto e confirmado visualmente a abertura/restauração do Original e sua página salva. Não afirmar que essa restauração foi validada. O PDF Original é o caminho de leitura independente e continua disponível pelo código; sua validação funcional após erro Reflow é pendente.

#### Estado da investigação dos ícones/glifos

- Ainda não há causa ou correção confirmada para ícones/símbolos incorporados nos PDFs que não apareçam corretamente no Reflow. A sonda do Manifesto registrou zero caracteres na Private Use Area, mas muitos controles e quase nenhuma letra; isso é evidência de mapeamento textual ruim, não prova de que os controles sejam ícones nem identifica o desenho correspondente.
- Imagens representadas pelos operadores de imagem do PDF.js são extraídas como imagens; glifos de fonte continuam dependentes do texto/mapeamento que o PDF.js entrega. Não foi concluída uma comparação visual por página que identifique quais marcas são imagens, glifos ou texto codificado incorretamente. Manter este item em investigação separada.
- Os ícones da interface do aplicativo usam Ionicons (`@expo/vector-icons`); esta investigação não encontrou nem validou defeito nesses ícones de UI. Não confundir esses ícones com símbolos/glifos contidos no PDF.

#### Instrumentação temporária

- Logs `FORENSIC` foram adicionados aos fluxos de `ReaderScreen.tsx`, `ReadingTouchZones.tsx`, `DocumentReaderAdapter.tsx`, `EpubPageViewer.web.tsx` e `EpubReaderDocument.ts`. Registram toggles, estado de página/progresso, render/mount, `srcDoc`, mensagens do iframe, dimensões, resize/ResizeObserver, recálculo e navegação. A instrumentação alterou os fontes de runtime e segue presente no estado atual; não foi removida nesta consolidação.
- Utilitários temporários de browser/CDP presentes na raiz: `.browser-advance.cjs`, `.browser-cdp-runner.cjs`, `.browser-diagnostic.cjs`, `.browser-forensic-summary.cjs`, `.browser-forensic-tail.cjs`, `.browser-inspect.cjs`, `.browser-mouse.cjs`, `.browser-navigation-step.cjs`, logs `.browser-diagnostic-chrome-all.out/.err` e perfil `.browser-diagnostic-chrome-all/`. São artefatos de investigação, não funcionalidades do produto.
- Sondas de extração presentes na raiz: `debug-reflow-metrics-temp.mjs` (scan e comparação de CMaps) e `debug-reflow-scan.js` (sonda anterior/amostrada). Mantê-las classificadas como temporárias.
- Os relatórios runtime completos e limites dos ensaios do EPUB e da correção dos controles PDF Reflow permanecem em `BUG_CONTEXT_EPUB_CENTER_RESET.md`; a corrida de restauração do PDF Reflow e validação pendente permanecem em `BUG_CONTEXT_EPUB_PROGRESS_RESTORE.md`.

#### Pendências restantes

- Investigar e corrigir o reset EPUB Web reproduzido no ambiente real do usuário com UM clique central; capturar a primeira escrita/mensagem que muda a página e validar no mesmo ambiente. Não considerar o ensaio headless negativo como resolução.
- Fazer validação funcional comparativa do texto Reflow do builder após a correção da truncagem, incluindo quebra entre páginas, hifenização e rótulos correntes; builds não comprovam completude visual/textual.
- Continuar a causa-raiz da codificação de texto do Manifesto e dos outros PDFs com muitos caracteres de controle. PDF.js já recebe/entrega conteúdo inadequado antes do builder; CMap testado não resolveu. OCR ou outro mapeamento não foi implementado.
- Identificar visualmente os “ícones”/símbolos afetados e distinguir imagem, glifo de fonte e caracteres de controle; ainda sem diagnóstico conclusivo.
- Confirmar em browser estável que um erro do Reflow no Manifesto volta ao PDF Original e que o progresso/página original é restaurado corretamente.
- Validar a implementação do handshake de restauração Reflow em posições baixas, intermediárias e próximas do fim, além dos toggles/navegação, num browser com processo GPU funcional.
- Avaliar remoção organizada da instrumentação e dos arquivos temporários somente após preservar as evidências necessárias; nenhuma limpeza foi feita nesta etapa documental.

### Atualização de safe area e painel de aparência — 2026-10-05

- A build foi reinstalada do zero e validada novamente em Web exportado; `npm.cmd run typecheck`, `npm.cmd run export:web` e `git diff --check` passaram sem erros bloqueadores.
- O shell do app e o painel de configuração passaram a respeitar os insets reais do dispositivo. O `SafeAreaProvider` do app foi mantido como fonte de insets e o contêiner em `app/_layout.tsx` agora aplica preenchimento estrutural ao frame em desktop e ao mobile real.
- O painel de aparência usa controles segmentados e sliders modernos para fonte, linha, parágrafo, margem/largura e tema, evitando o layout antigo de vários botões `Aa`.
- O banner/feedback de status do Reader foi deslocado para abaixo da barra do sistema usando o inset superior real, sem duplicar padding do documento ou do footer.
- A correção foi validada via typecheck e export Web; a checagem visual em device real continua pendente para inspeção no Android físico, mas a estrutura do layout está coerente com a safe-area mobile requisitada.

### Continuação da investigação — 2026-10-02

#### Baseline desta continuação

- Antes de editar, `git status --short` mostrou um worktree amplo já modificado e com muitos arquivos untracked. As modificações rastreadas abrangiam README/package, rotas e telas da biblioteca, banco/download/importação/EPUB, Reader e componentes/contexts/stores/theme. Entre os untracked estavam `PROJECT_CONTEXT.md`, os dois `BUG_CONTEXT_*.md`, `Livros/`, `assets/`, `android/`, rotas/serviços, módulos Web/IndexedDB, PDF/EPUB, fontes, scripts e utilitários `.browser-*`. Nenhuma alteração pré-existente foi descartada.
- `git diff` foi executado antes das alterações desta continuação; ele continha mudanças extensas no worktree, e não representa os untracked. A exportação Web gerou/atualizou `dist/`.
- Baseline: `npm.cmd run typecheck` PASSOU; `npm.cmd run export:web` PASSOU e copiou os 34 livros; `git diff --check` PASSOU sem erros de whitespace, com avisos de conversão LF→CRLF.
- Os três documentos de investigação foram lidos integralmente. A reprodução do usuário é tratada como real; os resultados negativos abaixo são apenas dos browsers disponíveis nesta sessão.

#### Reset EPUB — um clique observado

- O usuário confirmou no ambiente real do usuário a reprodução visual: página intermediária → **um único clique central** → controles abrem → reset ao início. Não há segundo clique, Next/Previous nem slider. Essa é a reprodução funcional do bug, embora não tenha sido possível acessar esse browser/dispositivo para observar seu runtime.
- Tentativa runtime nesta sessão: Expo Web na porta `8086`, browser integrado, EPUB “Sigmund Freud Na Sua Época E Em Nosso Tempo”, viewport da página 428×516. A página foi posicionada via API do iframe em 15/877. Antes do clique: `epubPage=15`, progresso `0.01598173515981735`, transform `translateX(-5992px)`, `scrollWidth=375356`, `pageWidth=428`, um iframe, `srcDoc` com 4.870.676 caracteres.
- Foi feito exatamente um clique central. A captura registrou `controlsVisible=false→true`; `ReaderScreen` renderizou mantendo `epubPage=15`, total 877 e o mesmo progresso; o Adapter renderizou com `changedEpubProps` vazio. Depois, a página continuou 15/877, transform e dimensões permaneceram iguais, count de iframe continuou 1 e o comprimento de `srcDoc` não mudou.
- Não apareceu `EpubPageViewer` render/mount/unmount, `iframe.onload` ou mensagem de página na captura recebida depois do clique. O primeiro valor `1` não foi produzido nesse ensaio porque o bug não se reproduziu. `currentPage/targetPage` internos do iframe não ficaram diretamente acessíveis nessa captura; não inferir seus valores além da página/transform confirmados.
- Resultado: rerender de `ReaderScreen`/Adapter sem props EPUB alteradas não mudou a página neste browser integrado. Isso não identifica nem refuta a causa no ambiente real. Não foi aplicada correção EPUB e não foram feitos 10 toggles: a sequência do bug não ocorreu; repetir alternâncias depois de uma correção não se aplica ainda.
- Os logs `FORENSIC` continuam nos cinco fontes de runtime, mas agora só são emitidos quando `localStorage.epubCenterResetDiagnostics === "1"`; por padrão ficam silenciosos. Habilitar no browser real via DevTools (`localStorage.setItem("epubCenterResetDiagnostics", "1")`) e recarregar antes da reprodução. Nenhum log pós-clique desta sessão indicou a primeira operação causadora porque não houve reset.

#### Regressão Reflow: truncagem de Sobre o Ócio

- A correção do estado de sumário em `src/data/local/PdfReflowDocumentBuilder.ts` está presente e foi preservada. Quando `tocMode` está ativo e uma linha deixa de ser uma entrada válida do sumário, o builder sai do modo de sumário e volta a processar a linha como conteúdo normal. Não remover esse retorno ao fluxo normal.
- No browser integrado, “Sobre o Ócio” processou em Leitura Livre. Extração bruta PDF.js: **26.524 caracteres** em 49 páginas. Registro do cache/documento builder: **26.939 caracteres**, 40 páginas com texto, 49 páginas fonte e 9 capítulos. DOM integral do `#reader-content`: **27.170 caracteres**. No viewport 428×516, a UI paginou em **44 páginas lógicas**.
- O conteúdo final estava presente no builder e no DOM, incluindo ficha/registro e “BAIXE LIVROS · 2026” no fim. Isso confirma conteúdo final, aproximação raw→builder→DOM e paginação plausível nesse viewport. Observação residual: capítulos II–VII ficaram praticamente só com o título, e o capítulo VIII contém a maior parte do texto; a contagem do builder é completa, mas a divisão em capítulos não ficou uniforme.

#### Manifesto, fallback e risco de falso positivo

- Nova execução de `node debug-reflow-metrics-temp.mjs`: em `Livros/manifestocomunista.pdf`, PDF.js retornou 72.318 caracteres em 68 páginas, 46.120 caracteres de controle (63,8%) e 2.046 letras. Page 2 repetiu 366 controles/542 caracteres. CMaps locais e os CMaps remotos 3.11 continuaram com a mesma extração. A corrupção continua anterior ao Processor/Builder/HTML.
- O runtime em Leitura Livre acionou o fallback: a UI informou que a extração estava corrompida e voltou ao PDF Original; total 68 páginas e canvas do Original com conteúdo não branco. Resultado: comportamento de fallback para Manifesto PASSOU.
- O controle bom “Sobre o Ócio” foi aceito pelo Reflow e ficou completo. Várias amostras locais adicionais limpas no scan inicial também não atingem o sinal de controles (por exemplo A República, Dom Casmurro, O Alienista, Weber Ética e outros).
- **Risco ainda aberto:** o predicado ativo continua sendo `controlCharacters >= 100 && controlCharacters / totalCharacters >= 0.2`. O scan amostral também encontrou proporções altas em Contrato Social (77,8%), Divina Comédia (70,1%) e Irmãos Karamazov (74,8%); não foi confirmado visualmente se esses casos são textos de fonte/codificação inválida ou falsos positivos em PDFs cujo texto deveria ser legível. Não afirmar ausência geral de falsos positivos nem ampliar a heurística. Investigar esses candidatos antes de tratar o critério como universal.
- O aviso temporário de página sem texto em `PdfReflowProcessor.web.tsx` não estava atrás de flag no baseline. Foi colocado atrás de `localStorage.pdfReflowDiagnostics === "1"`, com acesso à storage protegido; desligado por padrão e sem mudança na decisão de fallback. Os logs EPUB usam a flag independente `localStorage.epubCenterResetDiagnostics === "1"`. `npm.cmd run typecheck` passou após as alterações de instrumentação.

#### PDF Original e ícones

- “Sobre o Ócio” em PDF Original exibiu 49 páginas e canvas renderizado (364×516; pixels não brancos). Navegação pelo controle “Ir para página” chegou a 25/49 e exibiu 50%; anterior/próxima via eventos de botão DOM fez 25→26→25. Ao voltar à biblioteca e reabrir o mesmo livro, restaurou 25/49 e 50%. Restauração básica do PDF Original PASSOU nesse cenário.
- O handler `handlePdfTotalPages` ainda rejeita `count` não finito ou `<=0`; não houve regressão observada nessa proteção. Durante o Original ocorreu um request `ERR_ABORTED` do Expo para a URI intermediária do asset, mas o PDF terminou renderizado no canvas e manteve total/navegação/restauração.
- No browser integrado, os ícones da biblioteca foram visualmente renderizados corretamente no screenshot. Verificação: face `ionicons` status `loaded`, `document.fonts.check('16px Ionicons') === true`, `font-family` computada `ionicons` e `Ionicons.ttf` HTTP 200. Isso só confirma o browser integrado; os quadrados relatados no ambiente real do usuário seguem pendentes e não foram alterados.
- Regressão mobile de margens/safe-area/painel responsivo não foi validada separadamente nesta sessão.

#### Próxima ação

- Para resolver o EPUB, é necessária uma captura no browser real em que o usuário reproduz o reset. A tentativa integrada não gerou um primeiro “1” para rastrear; não fazer patch de navegação, clamp, transitionend ou remount por hipótese. Coletar logs desde a página intermediária e o único clique, correlacionando página/transform/mensagens e, se o defeito ocorrer, a primeira escrita/mensagem igual a 1.
- Validar o handshake de restauração PDF Reflow pós-implementação segue pendente; não foi coberto por este teste do Original.

# HANDOFF FINAL PARA CODEX — ESTADO ATUAL

## 1) Estado da sessão atual

Este arquivo foi atualizado na sessão atual com o estado verificado do código e dos testes do momento. Não há correção funcional nova após este ponto; esta seção documenta apenas o estado conhecido e o handoff para execução futura.

### Alterações desta sessão (documentadas, sem nova correção funcional depois dessa etapa)

#### app/_layout.tsx
- Problema: o shell da aplicação não aplicava o inset do sistema de forma estrutural e o contêiner que envolve o Stack podia conflitar com a safe-area do Android real.
- Alteração feita: o layout foi reorganizado para usar `SafeAreaProvider` + `useSafeAreaInsets()` em um subcomponente, aplicando padding ao frame quando a plataforma é web desktop/phone frame, sem duplicar o inset do documento.
- Inset/safe-area usado: `Math.max(insets.top, 12)` e `Math.max(insets.bottom, 8)` no frame quando `Platform.OS === "web" && width > 480`, mantendo o shell na estrutura correta.
- Afeta: Web desktop/phone frame e o caminho em que o Shell é renderizado; o Android nativo foi ajustado estruturalmente no mesmo padrão, mas a validação em aparelho real continua pendente.
- Alteração além de layout: nenhuma no fluxo funcional do app; apenas layout/shell e posicionamento do contêiner geral.

#### src/presentation/components/ReaderSettingsPanel.tsx
- Problema: painel de configuração colocava o modal/overlay sem respeitar corretamente o inset inferior/superior do dispositivo, especialmente no mobile real e no bottom sheet do Reader.
- Alteração feita: importou `useSafeAreaInsets()` e aplicou `paddingTop`/`paddingBottom` ao backdrop do modal. O painel continua com o mesmo conteúdo funcional, mas com padding do shell do sistema.
- Inset/safe-area usado: `Math.max(insets.top, 12)` e `Math.max(insets.bottom, 12)` no backdrop do modal.
- Afeta: Web e Android; a implementação é compartilhada para as duas plataformas, mas ainda não foi validada em Android físico.
- Alteração além de layout: não houve mudança no comportamento do painel, somente no ajuste de safe-area e no espaçamento visual.

#### src/presentation/screens/ReaderScreen.tsx
- Problema: o feedback de estado do Reflow (`reflowFeedback`) e a estrutura do Reader podiam ficar no mesmo nível visual da status bar no mobile, conflitando com a área do sistema.
- Alteração feita: o `reflowFeedback` foi deslocado com `top: statusInsetTop + 12` e o shell do reader foi mantido com a estrutura de inset real. O restante do comportamento não foi alterado.
- Inset/safe-area usado: `const statusInsetTop = Math.max(insets.top, 12);` e o inset real do SafeAreaContext.
- Afeta: Web e Android no mesmo caminho do Reader, mas a validação real em Android continua pendente.
- Alteração além de layout: nenhuma no fluxo de leitura, progresso, fallback ou EPUB; apenas reajuste estrutural do posicionamento do alerta/status.

### Safe Area implementada, mas não validada em Android físico

- SAFE AREA DO SHELL: IMPLEMENTADA NO CÓDIGO.
- SAFE AREA DO READER: IMPLEMENTADA NO CÓDIGO COM `useSafeAreaInsets()` e insets explícitos.
- VALIDAÇÃO EM ANDROID FÍSICO: PENDENTE.
- O bug observado no aparelho era conteúdo/status superior entrando na área do relógio, Wi‑Fi, sinal e bateria. Isso não deve ser confundido com margem tipográfica interna do livro. A correção implementada afeta a estrutura do shell e do painel, não a margem interna do documento Reflow.

## 2) Menu moderno no código vs Android real

### Investigação apenas no código

- Componente que o Android realmente renderiza no caminho do Reader: `ReaderScreen.tsx` usa `ReaderSettingsPanel.tsx` como modal de aparência para o painel de configurações. `ReaderControls.tsx` é o shell de controles do Reader (header/footer), não é o menu de aparência.
- Componente com sliders/segmentados: `src/presentation/components/ReaderSettingsPanel.tsx`.
- Componente com controles antigos: não existe um caminho alternativo identificado em `.native.tsx` / `.web.tsx` para esse painel no código atual; o mesmo componente é usado no fluxo principal.
- Existem implementações diferentes por plataforma? Não foi encontrado um `ReaderSettingsPanel.native.tsx` ou `ReaderSettingsPanel.web.tsx`. O caminho do código atual aponta para o mesmo arquivo em todas as plataformas.
- `ReaderControls` usa o mesmo `ReaderSettingsPanel` em todas as plataformas? Sim, no código atual: `ReaderScreen` instancia `ReaderSettingsPanel` diretamente e `ReaderControls` é um shell de navegação/controles, não um menu de aparência.
- Existe código antigo ainda conectado ao caminho Native? Não foi identificado um segundo painel antigo; a divergência relevante é entre o código que implementa o painel moderno e o runtime Android observado no usuário, que mostrou os botões antigos. Isso indica divergência de plataforma/instalação/runtime, não um segundo componente ativo no código atual.

Classificação:
- MENU MODERNO NO CÓDIGO: SIM
- MENU MODERNO CONFIRMADO NO ANDROID: NÃO
- DIVERGÊNCIA: DIVERGENTE — IMPLEMENTAÇÃO EXISTE, MAS BUILD/PLATAFORMA REAL USA OUTRO CAMINHO OU EXIBE OUTRO ESTADO

## 3) Reflow: não é corrigido globalmente

## CORREÇÕES REFLOW NÃO SÃO GLOBAIS

Temos evidência real de comportamento diferente entre livros. O fato de alguns livros funcionarem não prova que o pipeline Reflow está corrigido globalmente.

| Livro | Reflow abre | Texto legível | Conteúdo completo | Fallback | Evidência | Estado |
| --- | --- | --- | --- | --- | --- | --- |
| O Banquete | PASS CONFIRMADO | PASS CONFIRMADO | PASS CONFIRMADO | NÃO APLICÁVEL | teste real no celular; leitura visual coerente; acentos e conteúdo consistentes | HISTÓRICO POSITIVO / PASS CONFIRMADO |
| Sobre o Ócio | PASS CONFIRMADO | PASS CONFIRMADO | PASS CONFIRMADO | NÃO APLICÁVEL | correção de truncagem `tocMode` e conteúdo final visível em teste anterior | HISTÓRICO POSITIVO / PASS CONFIRMADO |
| Manifesto Comunista | PASS CONFIRMADO | FAIL CONFIRMADO | FAIL CONFIRMADO | PASS CONFIRMADO | PDF.js entrega texto corrompido; fallback para PDF Original passou em teste anterior | PASS/FAIL MIXTO |
| sociedade do espetáculo | PASS CONFIRMADO | FAIL CONFIRMADO | FAIL CONFIRMADO | PENDENTE | build nova; instalação limpa; conteúdo ilegível com números/símbolos/letras isoladas; não capturado pela mesma detecção do Manifesto | FAIL CONFIRMADO |

### IMPLEMENTADO — tema global do aplicativo separado do tema do leitor (2026-10-05)

#### O que foi investigado
- O app não possuía um tema global separado da leitura. O estado visual do leitor era mantido em `ReaderSettingsContext`, e a biblioteca/busca/configurações também consumiam esse mesmo contexto para definir o fundo e texto da UI global.
- O problema era arquitetural: o app forcava a leitura e o shell a depender do mesmo contexto de tema do livro, o que tornava impossível alterar a aparência do aplicativo sem abrir um livro.

#### Arquitetura anterior
- `ReaderSettingsContext` armazenava `theme`, `font`, `fontSize`, `margin`, `maxWidth`, e `palette` para o leitor.
- Esse mesmo contexto era usado em telas fora do Reader, como biblioteca, busca e ajustes.
- Não existia provider global de aparência do app nem persistência para tema do app.
- As telas do shell e tabs não tinham acesso ao tema global antes de abrir um livro.

#### Arquitetura nova
- Foi criado `AppThemeContext` em `src/presentation/contexts/AppThemeContext.tsx`.
- Foi centralizado o token de tema global em `src/theme/tokens.ts` com `AppThemeMode` e `appThemeTokens`.
- O provider global é montado em `app/_layout.tsx` antes do shell e do `ReaderSettingsProvider`.
- O tema do aplicativo agora é separado do leitor e tem três opções: `Sistema`, `Claro` e `Escuro`.
- O tema de leitura continua em `ReaderSettingsContext`, com `light`, `sepia`, `dark` e `black`, sem ser acoplado ao tema global.

#### Onde o tema era armazenado antes
- Antes: `ReaderSettingsContext` local no React tree, sem persistência real, e usado em telas de app.

#### Como a persistência funciona agora
- A escolha do usuário é persistida em AsyncStorage com a chave `@kindle/appTheme`.
- O provider lê a preferência ao iniciar e aplica imediatamente o tema correto antes do shell montar.
- Se o modo for `Sistema`, o valor segue `useColorScheme()` do React Native/Expo automaticamente.

#### Implementado e alterado
- `src/presentation/contexts/AppThemeContext.tsx`: novo provider global de aparência do app.
- `src/theme/tokens.ts`: tokens do tema global (`AppThemeMode`, `AppThemePalette`, `appThemeTokens`, `resolveAppThemeName`).
- `app/_layout.tsx`: `AppThemeProvider` embutido antes do shell; `StatusBar` sincronizado com o tema global; fundos do shell e phone-frame ajustados por tema.
- `app/(tabs)/_layout.tsx`: tabs agora usam as cores do tema global.
- `app/(tabs)/settings.tsx`: nova UI de aparência com ações de `Sistema`, `Claro` e `Escuro` fora do Reader.
- `app/(tabs)/library.tsx` e `app/(tabs)/search.tsx`: passaram a consumir o tema global e não o `ReaderSettingsContext`.

#### Como o tema global ficou separado do tema do Reader
- `ReaderSettingsContext` continua responsável somente por: fonte, margem, largura, espaçamento, alinhamento e tema de leitura (`light`/`sepia`/`dark`/`black`).
- O tema global do app é controlado por `AppThemeContext` e não altera página, progresso, PDF, EPUB, Reflow, iframe ou documento do livro.
- Alterar a preferência do app não dispara destruição do documento nem restauração do progresso do leitor.

#### Validação executada
- `npm.cmd run typecheck`: PASSOU.
- `npm.cmd run export:web`: PASSOU.
- `git diff --check`: PASSOU.

#### Pendências / validação visual complementar
- Validação em Android físico continua pendente.
- A UI de tema do app foi validada por código e build, mas não foi verificada em dispositivo real nesta sessão.
- O componente `ReaderSettingsPanel` e o Reader continuam separados e preservados; não houve alteração de lógica EPUB/PDF/Reflow.

#### O que foi deliberadamente deixado sem alteração
- Reflow/Reader document pipeline e fallback de PDF.
- EPUB algorithm/parser and the existing EPUB reset work.
- PDF Reflow cache/version logic.
- Reader appearance settings and file-specific reading themes.

#### Riscos e limitações
- O tema global em `System` depende de `useColorScheme()` do dispositivo e do ambiente Web/Native; a renderização em hardware real deve ser confirmada no Android.
- O app pouco dependeu de um provider global antes; a mudança foi arquitetural e não substituiu a lógica de leitura do livro.
- Visuals do shell e tabs foram alinhados com os tokens, mas a validação em físico é o próximo passo para confirmar sem “flash”/brancura.

### IMPLEMENTADO / VALIDADO / PENDENTE / NÃO ALTERADO

- IMPLEMENTADO: tema global do app separado do tema do Reader, provider e persistência via AsyncStorage.
- VALIDADO: typecheck, export web e diff check.
- PENDENTE: Android real e verificação funcional de abertura do app sem flash / ajuste visual no dispositivo.
- NÃO ALTERADO: leitura do livro, EPUB, PDF Reflow, cache, fallback e aparência do leitor.


Observação obrigatória:
- O Banquete é controle positivo.
- Sobre o Ócio é positivo histórico com correção de truncagem.
- Manifesto Comunista demonstrou corrupção real e fallback funcional.
- sociedade do espetáculo mostrou “Leitura livre pronta” e conteúdo visualmente ilegível mesmo em instalação nova, sem ser capturado pela mesma detecção usada no Manifesto.

## 4) Safe area e margens internas do Reflow

- MARGENS INTERNAS DO REFLOW: o documento Reflow continua com margens internas e layout de leitura tratados separadamente da estrutura do shell. A correção implementada desta sessão não mexeu na margem tipográfica interna do conteúdo; foi aplicada ao shell e ao painel do Reader.
- SAFE AREA DO SHELL: ALTERAÇÃO IMPLEMENTADA NESTA SESSÃO em `app/_layout.tsx`, `ReaderSettingsPanel.tsx` e `ReaderScreen.tsx`.
- VALIDAÇÃO EM ANDROID FÍSICO: PENDENTE.
- O bug observado no aparelho era o conteúdo/status superior entrando na área de relógio, Wi‑Fi, sinal e bateria; isso não é a mesma coisa que a margem tipográfica interna do livro.

## 5) EPUB reset

EPUB CENTER RESET: ABERTO

- Reprodução real: SIM
- Sequência: página intermediária → UM clique central → controles aparecem → volta ao início
- Browser integrado: NÃO reproduziu
- Causa atual: DESCONHECIDA
- Correção nesta sessão: NENHUMA

## 6) Diagnósticos

Os diagnósticos continuam disponíveis no código.

- `localStorage.epubCenterResetDiagnostics`
  - Como ativar: `localStorage.setItem("epubCenterResetDiagnostics", "1")`
  - Como desligar: `localStorage.setItem("epubCenterResetDiagnostics", "0")` ou remover a chave
  - Módulos que logam: `src/utils/epubOpenMetrics.ts`; `src/presentation/components/EpubReaderDocument.ts`; logs `FORENSIC` em `ReaderScreen.tsx` e `DocumentReaderAdapter.tsx`/`EpubPageViewer.web.tsx`
  - Estado padrão: desligado

- `localStorage.pdfReflowDiagnostics`
  - Como ativar: `localStorage.setItem("pdfReflowDiagnostics", "1")`
  - Como desligar: `localStorage.setItem("pdfReflowDiagnostics", "0")` ou remover a chave
  - Módulos que logam: `src/presentation/components/PdfReflowProcessor.web.tsx`
  - Estado padrão: desligado

## 7) Estado dos gates da sessão

Esses gates provam sanidade de build, NÃO validação funcional.

- typecheck: PASS
- export:web: PASS
- git diff --check: PASS

A execução de prova foi:
- `npm.cmd run typecheck`
- `npm.cmd run export:web`
- `git diff --check`

## 8) Estado do workspace

Comandos executados:
- `git status --short`
- `git diff --stat`

Arquivos alterados nesta sessão:
- `app/_layout.tsx`
- `src/presentation/components/ReaderSettingsPanel.tsx`
- `src/presentation/screens/ReaderScreen.tsx`
- `PROJECT_CONTEXT.md`

Não foi realizado limpeza do workspace, nem remoção de artefatos de investigação. O objetivo desta etapa foi apenas documentação e inspeção, sem novas correções funcionais.

## 9) Restrições finais do handoff

A partir deste ponto:
- não corrigir safe-area novamente;
- não modificar menu;
- não modificar fallback;
- não modificar PDF.js;
- não modificar Reader;
- não modificar EPUB;
- não refatorar.

## 10) Resumo de handoff para o Codex

- O conteúdo foi documentado com evidência atual do código e da sessão.
- O shell e painel foram ajustados estruturalmente para safe-area, mas o Android físico ainda não foi validado.
- O menu moderno existe no código, mas a confirmação no Android real diverge do resultado observado e deve ser tratada como divergência de runtime/plataforma.
- O Reflow não está globalmente corrigido; há diferenciação real entre livros.
- O reset central do EPUB continua aberto e não foi alterado.
- O estado de build está estável e sanidade de export foi confirmada, mas isso não substitui validação funcional real.

# HANDOFF CODEX PRONTO

- PROJECT_CONTEXT.md atualizado: SIM
- Safe Area implementada: SIM
- Safe Area validada em Android físico: NÃO
- Menu moderno existe no código: SIM
- Menu moderno confirmado no Android: NÃO
- Divergência de plataforma no menu: SIM
- O Banquete: PASS CONFIRMADO / HISTÓRICO POSITIVO
- Sobre o Ócio: PASS CONFIRMADO / HISTÓRICO POSITIVO
- Manifesto: PASS/FAIL MIXTO com fallback funcional
- sociedade do espetáculo: FAIL CONFIRMADO
- Reflow globalmente corrigido: NÃO / INCONCLUSIVO
- EPUB reset: ABERTO
- Typecheck: PASS
- Export: PASS
- Diff check: PASS
- Arquivos alterados: app/_layout.tsx; src/presentation/components/ReaderSettingsPanel.tsx; src/presentation/screens/ReaderScreen.tsx; PROJECT_CONTEXT.md
- Código funcional alterado após este pedido: NENHUM
- Seção HANDOFF FINAL PARA CODEX: CRIADA

## 2026-10-05 — Modo viagem experimental

Implementado controle manual no painel de aparência, desligado por padrão, com a descrição solicitada. Preferência global em AsyncStorage (`reader.motionCues.enabled`) e store Zustand independente da tipografia. Overlay absoluto irmão da árvore documental, oito pontos (quatro por borda), safe-area, contraste pela paleta ativa, pointerEvents none e ocultação de acessibilidade. Não adiciona key nem altera ancestralidade do documento. ReaderScreen não assina a preferência nem recebe amostras. EPUB, PDF Original e Reflow usam o mesmo overlay; parsers, caches, navegação, fallback e PDF_REFLOW_PROCESSOR_VERSION = 10 preservados. As mudanças preexistentes do workspace foram mantidas. Não foi encontrado AGENTS.md no workspace nem nos ancestrais consultados. Este pedido autoriza as inserções mínimas no Reader/painel apesar das restrições do handoff anterior.

Dependência instalada por `npx.cmd expo install expo-sensors`: expo-sensors 57.0.3. Confirmados instalados: Expo 57.0.25, RN 0.86.3, Reanimated 4.5.1. Framework não atualizado.

API conferida na documentação Expo SDK 57 e no código Android instalado. DeviceMotion usa TYPE_LINEAR_ACCELERATION em m/s², timestamp em segundos e eixos de dispositivo sem rotação aplicada. Para orientação 0: (x,-y); 90: (y,x); 180: (-x,y); -90: (-y,-x). A API fornece rotação de tela, aplicada uma vez. App atualmente bloqueado em retrato. Ajuste físico dos sinais, inclusive aparelhos com orientação natural diferente, pendente. Não usa gravidade, GPS, inclinação ou giroscópio como identificação de curvas; nenhuma integração de velocidade/posição. Ganho, zona morta, filtro exponencial pelo delta temporal, limites e watchdog centralizados como parâmetros de protótipo em processing.ts. Intervalo 33 ms (~30 Hz). DeviceMotion internamente combina vários sensores; consumo real depende da implementação e precisa medição física.

Permissões: implementação instalada solicita ACTIVITY_RECOGNITION no Android >= 10, incluída no manifesto da biblioteca; consultada e solicitada apenas na ativação manual. Preferência restaurada nunca provoca solicitação automática. Web/iOS indisponíveis nesta versão. Importação dinâmica captura ausência do módulo em binários antigos; é necessário novo build nativo para incluir a dependência. Sem alternativa simulada quando sensores indisponíveis. Ausência de amostras novas/válidas por 1,5 s cancela assinatura, zera animação e informa indisponibilidade. Desativar/ativar permite nova tentativa; negação de permissão pode exigir configurações do Android.

Ciclo de vida isolado: habilitação + hidratação + foco via Expo Router + AppState ativo. Sessões canceláveis impedem listeners depois de verificações assíncronas obsoletas. Cleanup remove somente a assinatura própria e cancela watchdog/animações; filtros reiniciados no neutro. Amostras alteram apenas refs/variáveis da sessão e shared values Reanimated. Status compartilhado muda apenas em transições.

Arquivos desta implementação:
- package.json e package-lock.json (dependência);
- src/presentation/screens/ReaderScreen.tsx e components/ReaderSettingsPanel.tsx (inserções);
- components/MotionCuesOverlay.tsx e MotionCuesControl.tsx;
- stores/motionCuesStore.ts;
- motion/processing.ts, session.ts, sensor.ts e useMotionCues.ts;
- scripts/test-motion-cues.cjs e PROJECT_CONTEXT.md.

Verificações executadas:
- npm.cmd run typecheck: PASS.
- npm.cmd run export:web: PASS, incluindo cópia dos livros.
- node scripts/test-motion-cues.cjs: PASS. Usa Node assert e transpileModule do TypeScript já instalado, sem framework adicional. Repouso/ruído, positivo/negativo, saturação, quatro orientações, inválidos, equivalência temporal do filtro e retorno neutro; cancelamento assíncrono antes de assinatura, cleanup repetido para disable/blur/background e watchdog com dados inválidos. Inspeção estática verifica overlay único e ausência da store no Reader ou dependência dos viewers/adapter. Isso não substitui teste de montagem/progresso em runtime.
- git diff --check: PASS, apenas avisos de conversão LF/CRLF.
- npx.cmd expo export --platform android --output-dir .expo/motion-cues-android: PASS (bundle Hermes); repetido após integração final, resultado registrado abaixo.
- android/gradlew.bat :app:assembleDebug: não executou compilação; JAVA_HOME ausente e java fora do PATH. ADB não localizado. Nenhum aparelho disponível; validação nativa/visual física PENDENTE.

Roteiro físico pendente: instalar build Android novo com expo-sensors; abrir EPUB, PDF Original e Reflow disponível em páginas intermediárias. Registrar página/progresso antes e depois de alternar Modo viagem rapidamente dez vezes; verificar movimento em repouso, deslocamento lateral e acelerações conhecidas, limites, safe-area e texto central livre. Navegar páginas, tocar centro, abrir controles/busca/sumário, selecionar texto onde permitido e testar zoom do PDF. Trocar claro/sépia/escuro e confirmar contraste. App bloqueia rotação atualmente; se liberada futuramente, testar ambos os sentidos de paisagem. Sair/voltar ao app e navegar para biblioteca/retornar: pontos param no background/perda de foco, retomam do neutro e não acumulam listeners (instrumentar contagem na sessão se necessário). Negar permissão, testar aparelho sem sensores e binário antigo; leitura deve continuar. Na Web, confirmar controle indisponível.

Reset EPUB: antes, já confirmado pelo usuário ao tocar centro, causa desconhecida; após, sem reprodução física disponível. Não foi corrigido nem atribuído ao overlay. Preservação de montagem verificada pela estrutura e inspeção de dependências; confirmação funcional de página/progresso pendente. Build/testes sintéticos não demonstram redução de enjoo. Sensores medem o aparelho e movimentos da mão; recurso experimental sem promessa de equivalência ao iPhone.

Referências: https://docs.expo.dev/versions/v57.0.0/sdk/devicemotion/ e https://developer.android.com/develop/sensors-and-location/sensors/sensors_overview ; conferência complementar em node_modules/expo-sensors/src/DeviceMotion.ts e android/src/main/java/expo/modules/sensors/modules/DeviceMotionModule.kt.

Resultado final: export Android repetido após todas as inserções PASS (2789 módulos, bundle Hermes entry-88f7ac61b209bfc82d5adda5b0c8b101.hbc). Typecheck e testes sintéticos finais PASS. Sem APK/aparelho validado: impedimento de Java persiste. A checagem de disponibilidade desta versão de DeviceMotion exige o conjunto de sensores internos, conforme implementação instalada; aparelhos sem um deles podem ter o recurso indisponível mesmo com acelerômetro. Nenhuma alternativa foi adicionada nesta versão.

## 2026-10-05 — Regressão ao alternar controles do Reader

Esta é a atualização mais recente e prevalece sobre os status anteriores do reset de controles descritos acima.

### Causa encontrada

- Em `ReaderScreen.tsx`, `flowReflowControls = isReflowPdf && controlsVisible` alternava `ReaderControls.layoutMode` entre `overlay` e `flow` no PDF Reflow.
- O documento permanecia no mesmo filho do `ReaderControls`, portanto não houve remount do adapter/viewer/iframe. Porém, `flow` trocava a viewport do documento de `reflowDocumentOverlay` (absolute fill) para `reflowDocumentFlow` (flex), mudando sua altura útil. `ResizeObserver`/`recalculateLayout` repaginava o documento e podia enviar `page=1` durante a transição.
- Antes da correção, browser integrado a 1024×768, PDF “Sobre o Ócio”, página 15: dez toggles alternaram o total entre 44 e 34 e geraram dez mensagens `page=1`. A UI permaneceu na página 15 pelo handshake de restauração Reflow; não houve mount/unmount nem persistência na rodada isolada.
- No EPUB Web, essa reprodução não ocorreu no browser integrado: alternar controles não mudou página, total, ancestralidade ou iframe. O relato específico do Android/ambiente original continua sem confirmação nesse runtime; não atribuir a causa Android ao fluxo `flow` do PDF Reflow.

### Correções

- `ReaderScreen` mantém `layoutMode="overlay"` em todos os estados de visibilidade do PDF Reflow. Abrir/fechar só altera opacidade/interatividade; a viewport documental não é reduzida nem reposicionada.
- O EPUB comum agora rastreia `pendingEpubNavigationTarget`. `page=1` é stale quando a página atual válida é maior que 1 e não há intenção explícita de ir à primeira página. Nesse caso, atualiza somente `totalPages`; página, capítulo, progresso e persistência ficam intactos. Navegação explícita para a página 1 continua permitida. PDF Reflow mantém seu handshake próprio.
- O efeito de brilho nativo tinha `useRef`/`useEffect` abaixo dos retornos condicionais loading/error e causava “Rendered more hooks than during the previous render”. As refs/efeito foram movidos para a sequência estável de hooks; brilho só é aplicado quando `bookStatus === "ready"`.
- Tema, fonte e brilho não controlam keys nem a posição do adapter. A tipografia continua dinâmica e o HTML do iframe permanece memoizado pela lista de capítulos.
- Os logs temporários `[ReaderLifecycle]`, `[ReaderControls]`, `[ReaderNavigation]` e `[ReaderProgress]` desta reprodução foram removidos. A instrumentação forense preexistente continua opt-in por `epubCenterResetDiagnostics`.

### Validação runtime

- PDF Reflow “Sobre o Ócio”, página 15/34 após a correção: dez alternâncias, estados true/false alternados, total estável, zero mount/unmount de adapter/viewer, zero `page=1` recebido e zero persistência na rodada isolada.
- EPUB Web, página 15/673: dez alternâncias mantiveram a página; zero mount/unmount e zero `page=1`. Uma persistência debounced apareceu na rodada iniciada logo após navegar à página 15, sem mudança visível de página/progresso; não foi atribuída ao toggle.
- PDF Original “Sobre o Ócio”, página 15/49: dez alternâncias mantiveram a página; zero mount/unmount e zero `page=1`. A persistência observada foi compatível com o debounce da navegação prévia.
- Preferências no EPUB: tema Papel manteve 15/673. Família/tamanho da fonte mantiveram índice 15 enquanto o total recalculou até 1514; uma mensagem `page=1` chegou, mas página/progresso permaneceram em 15/1%, sem remount ou persistência. Brilho ajustado por ponteiro a 77% manteve a página 15.
- Resize Web retrato→paisagem preservou página 15; o total mudou de 1514 para 1150, sem remount/persistência. Isso não substitui teste de rotação em Android físico.
- O Manifesto Comunista retornou ao PDF Original pelo fallback existente de extração inválida; não foi contado como teste de Reflow.
- Limite: o browser integrado não é o Android em que o reset EPUB foi relatado. Repetir nesse dispositivo continua recomendado.

### Regra de regressão obrigatória

Qualquer alteração em `ReaderScreen` que mexa na estrutura JSX, ancestralidade/posição do documento ou layout dos controles precisa testar EPUB, PDF Reflow e PDF Original suportados: navegar até página 10+, alternar controles pelo centro pelo menos dez vezes e verificar a página/progresso, total, mounts/unmounts do adapter/viewer e recriação do iframe. Mudanças de layout também precisam confirmar que abrir/fechar controles não altera a viewport documental.

### Builds e Android

- `npm.cmd run typecheck`: PASSOU após as correções de hooks e proteção stale.
- `npm.cmd run export:web`: PASSOU na validação final; exportou 2247 módulos e copiou os 34 arquivos de livro para `dist/assets/Livros`.
- Esta correção só altera JavaScript/JSX compartilhado: não adiciona módulo nativo, dependência, plugin ou configuração Expo e não exige rebuild Android por si só. Um binário anterior à inclusão preexistente de `expo-brightness` ainda precisa ser recompilado para conter essa dependência.

## 2026-10-05 — Implementação de tema Papel e brilho do leitor

### Investigação inicial
- O app já vinha com a arquitetura atual de `ReaderSettingsContext`, `ReaderSettingsPanel` e `ReaderScreen` separada do tema global do app.
- A proposta de tema `Papel` e o ajuste de brilho do leitor não existiam ainda na camada de leitura; a configuração visual tinha apenas `light`, `sepia`, `dark` e `black`.
- O pacote `expo-brightness` não estava instalado na build atual; o controle nativo de brilho exigia módulo novo e rebuild Android.

### Estado encontrado
- `ReaderSettingsContext` persistia apenas fonte, margem, altura de linha, espaçamento e tema do leitor, sem brilho manual nem persistência do valor do leitor.
- `ReaderSettingsPanel` já era o ponto central de UI de aparência do Reader, e a lógica de tema do leitor era compartilhada por EPUB e PDF Reflow.
- O sistema global do app já havia sido separado em `AppThemeContext`, mas o tema do livro ainda não tinha a opção `paper`.

### O que foi implementado
- Adicionado o tema `paper` a `ReaderTheme`, `readerThemes` e ao painel de aparência.
- A paleta `paper` usa fundo `#F5F1E7`, texto principal `#111111`, texto secundário `#37372F`, mantendo contraste alto e legibilidade sem perder nitidez.
- Adicionada persistência local das preferências de brilho em `ReaderSettingsContext` via AsyncStorage: chave `@kindle/reader-settings.v1`.
- Adicionado controle de brilho no `ReaderSettingsPanel`:
  - Web: `Luminosidade da página` com slider e percentual.
  - Native: `Usar brilho do aparelho` com toggle e slider manual quando desligado.
- Implementado ajuste visual da página apenas no documento em `ReaderScreen`, preservando os controles do Reader legíveis e sem alterar documento/pdf/iframe.
- Instalado o módulo `expo-brightness` via `npx expo install expo-brightness`.
- Implementado comportamento nativo de Android para aplicar e restaurar o brilho da sessão sem modificar o brilho global do dispositivo em forma persistente.

### Decisões arquiteturais
- Mantivemos a arquitetura existente de `ReaderSettingsContext` e `ReaderSettingsPanel`; não foi criada uma segunda arquitetura de temas.
- O ajuste de luminosidade da página foi aplicado na superfície do documento do Reader e não no shell da interface, preservando legibilidade dos controles.
- O brilho nativo foi isolado por sessão do Reader e restaurado ao sair ou desmontar; o valor persistido é apenas a preferência do usuário, não o brilho original do sistema.

### Arquivos alterados
- `src/domain/types/reader.ts`
- `src/theme/tokens.ts`
- `src/presentation/contexts/ReaderSettingsContext.tsx`
- `src/presentation/components/ReaderSettingsPanel.tsx`
- `src/presentation/screens/ReaderScreen.tsx`
- `package.json`
- `package-lock.json`

### Dependências adicionadas
- `expo-brightness` (compatível com Expo SDK 57)

### Rebuild necessário
- Android: SIM
- Motivo: módulo nativo da Expo foi adicionado; a build instalada precisa ser recompilada para incluir a biblioteca e o comportamento do brilho da atividade.

### Validação executada
- `npm.cmd run typecheck`: PASS
- `npm.cmd run export:web`: PASS
- `git diff --check`: PASS

### Pendências e limitações
- Validação do brilho real em Android físico continua pendente, porque o ambiente disponível não inclui aparelho/emulador com build nativa atualizada.
- Não houve validação funcional do brilho em iPhone real nesta sessão.
- O comportamento do tema `paper` foi confirmado por código e build, mas não por inspeção visual em device nativo.
- Não foi alterado o conteúdo do EPUB/PDF original, nem o mecanismo de Reflow, como prescrito pela arquitetura e pelos requisitos de não regressão.

### Estado final desta sessão
- IMPLEMENTADO: tema `paper` + brilho do leitor + persistência + UI.
- VALIDADO: typecheck + export Web + diff check.
- PENDENTE: validação em Android/iPhone reais e smoke visual do Reader com tema Papel e brilho.
- NÃO ALTERADO: Reflow, parser EPUB/PDF, cache, fallback e fluxo de progresso original.


# CONTINUAÇÃO CODEX APÓS INTERRUPÇÃO DO COPILOT — 2026-10-05

## Estado recebido e preservação

PROJECT_CONTEXT.md: LIDO. BUG_CONTEXT_EPUB_CENTER_RESET.md: LIDO. BUG_CONTEXT_EPUB_PROGRESS_RESTORE.md: LIDO. README e documentos de fontes existentes também lidos. Seções recentes prevaleceram. Sem AGENTS.md/instruções adicionais encontrados no workspace/ancestrais consultados. Nenhuma implementação foi reiniciada, nenhuma alteração descartada; não usados reset, clean ou checkout de reversão.

Foram recebidos **32 arquivos rastreados modificados**, além de numerosos untracked (incluindo estes contextos, módulos EPUB/PDF/IndexedDB, fontes, motion, assets, android, scripts e artefatos de investigação). Isso excede os aproximadamente 24 mencionados no pedido. `git status --short`, `git diff --stat`, `git diff --name-only` e inspeção dos diffs foram executados antes das edições. O Git tem somente o commit inicial: não é possível distinguir com certeza autoria Copilot versus sessões anteriores. Mapa por cada um dos 32 arquivos e inventário de fontes: [COPILOT_CONTINUATION_AUDIT.md](COPILOT_CONTINUATION_AUDIT.md).

CONCLUÍDO no código recebido: Sol/Lua na Biblioteca, Ajustes com cinco seções, provider global persistente, Papel, controles de brilho, anti-enjoo ligado aos sensores Android. NÃO VALIDADO inicialmente: UI real, aquisição, novos módulos Native. PARCIAL: Busca/fontes/download, tema de controles do Reader. AUSENTE: JSON. QUEBRADO identificado: selector Zustand retornava nova lista em cada leitura; timeout de rede era removido antes de consumir o corpo; nenhuma proteção contra resposta antiga; URL usada como trecho do caminho Native; IDs de capítulos sem isolamento por livro.

## Alterações e motivos

- SearchBooksUseCase aplica robots somente a plugins `requiresRobotsPolicy`; Gutendex/JSON/OPDS não consultam robots. HTTP/HTTPS validado, throttle e timeout mantidos. Gutenberg legado e HTML customizado declaram política de scraping. Não há proxy nem uso de no-cors.
- Search usa selector estável de sources e deriva lista em useMemo, evitando instabilidade useSyncExternalStore/Zustand 5. Chips compactos não expandem verticalmente; inclui Todos/Gutendex/Minhas Fontes e fontes reais habilitadas. Metadados mostram formato/idioma. Redesign existente preservado.
- NetworkFetcher mantém timeout/cancelamento até a leitura completa do texto. SearchStore cancela a busca anterior e usa versão de requisição: respostas obsoletas não sobrescrevem query/resultados atuais. Seis estados preservados: idle/loading/success/empty/partial/error. Paginação com falha mantém resultados e URL para nova tentativa. Parser Gutendex rejeita resposta malformada em vez de apresentá-la como vazia.
- JSON V1 implementado em UserSourceSearchPlugin e no formulário existente: array ou `{ books: [...] }`, title/url obrigatórios, EPUB HTTP/HTTPS, URLs relativas, capa/metadados opcionais e filtro local sem acentos. CRUD usa o repositório/store já existentes; fonte só fica ativa após schema/conexão válidos. Nomes reservados/duplicados rejeitados; erro de persistência mostrado no formulário. Catálogo estático V1, limite existente de 50 resultados por consulta; sem login/PDF/paginação remota JSON.
- Download reutiliza DownloadManager/EpubFileImporter/ImportEpubUseCase. Native usa chave segura derivada do ID junto do nome, evitando URL no caminho e colisão entre aquisições de fontes diferentes com mesmo título. Erros antes do download deixam estado failed, em vez de queued permanente. Web possui timeout de 60 s por tentativa e fallback de arrayBuffer quando não há stream. Busca/listagem nunca baixa EPUB/PDF.
- ImportEpubUseCase passou a prefixar IDs de capítulos novos com bookId: EPUBs com o mesmo caminho OPF não sobrescrevem capítulos de outro livro em IndexedDB/SQLite. Parser, conteúdo e capítulos já persistidos não foram migrados nem alterados. Teste com dois EPUBs usando o mesmo OPF confirmou isolamento.
- UI de aquisição desabilita ação queued/downloading; completado oferece abrir Biblioteca. Falha Web permite salvar arquivo no navegador e importar localmente. Essa alternativa é explícita e não é descrita como download automático aprovado.
- ReaderControls agora usa AppThemeContext para cores do shell, sem trocar JSX, layout, ancestralidade, slot, keys ou props do documento. PdfModeChooser usa tema global. Tema do livro/ReaderSettingsPanel continua separado como edição/preview da aparência de leitura. Rótulo Web passa a mostrar Luminosidade da página. Nenhuma mudança funcional em ReaderScreen/EPUB/PDF/Reflow nesta continuação.

## Busca: robots, CORS e Gutendex

O diagnóstico anterior foi auditado e **não se confirmou no workspace recebido**. SearchBooks ainda chamava robots genericamente, mas RobotsCacheService já retornava true para gutendex.com/books/ e para browser, sem fetch. A regra original aparece no commit inicial f454d43, autor registrado MatheusBorbaDev; isso não prova que Copilot a introduziu. Seu objetivo histórico era scraping Gutenberg. Robots não é autorização de navegador (RFC 9309).

A API pública Gutendex independe de robots. Testes HTTP reais: consulta dickens HTTP 200, count 231; com Origin de navegador, Access-Control-Allow-Origin: *. O caso de uso real mapeou 23 aquisições EPUB e uma next URL. Robots real: HTTP 200, sem ACAO, `Disallow: /books/`. Esse arquivo não foi o bloqueio atual: já havia exceção e agora o contrato de APIs não passa pelo gate.

Causa comprovada de instabilidade potencial da tela: selector criando array novo; falhas de estado concorrente/timeout também corrigidas. **Causa do timeout de conexão HTTPS no Chrome desta sessão: INCONCLUSIVA**. A chamada do app expirou em aproximadamente 12 s; fetch direto no mesmo Chrome também expirou com 25 s. A UI terminou loading e mostrou erro total. Com JSON local ativo, terminou em erro parcial e manteve resultado JSON. Não atribuir esse timeout a robots ou a CORS da API, que enviou ACAO *. Não declarar Gutendex UI Web validada por causa do PASS Node/HTTP.

Aquisição é outra origem: Gutenberg redirecionou o EPUB 98 para cache/epub/98/pg98-images-3.epub, entregou HTTP 200 e 7.923.060 bytes, mas sem ACAO. Download automático Web pode ser bloqueado por CORS mesmo com busca bem sucedida. Arquivo real foi baixado por curl para auditoria, sem proxy aplicativo. Fluxo JSON em Chrome usou esse mesmo EPUB servido por endpoint local de teste, não um EPUB simulado nem prova de CORS Gutenberg liberado.

Referências: https://gutendex.com/ e https://www.rfc-editor.org/rfc/rfc9309.html . Política legítima: adapters oficiais, URLs HTTP/HTTPS, schema, rate limit, timeout/cancelamento, respostas HTTP e validação EPUB na importação. Scrapers legados não são apresentados como fontes prontas.

## Inventário final

- Gutendex: IMPLEMENTADO/CONECTADO; VALIDADO no caso de uso live, API, mapping, next e URL real de aquisição. Busca UI Chrome externa INCONCLUSIVA por timeout; download automático Web não aprovado; Native NÃO TESTADO.
- JSON/Minhas Fontes: IMPLEMENTADO/CONECTADO/VALIDADO em Chrome: adicionar, testar, persistir após reload, desabilitar, habilitar, editar, remover, buscar, detalhes e aquisição até Biblioteca/Reader. Remoção preservou livro importado. JSON aceita EPUB V1.
- OPDS: adapter Atom real, detalhes e aquisição EPUB; `next` extraído pelo adapter mas paginação customizada ainda não consumida pelo store. PARCIAL; fonte externa live NÃO TESTADA.
- HTML customizado: extração legada de links EPUB, sem paginação/login; PARCIAL/NÃO TESTADO live. Teste de conexão não demonstra capacidade geral de busca do site.
- Gutenberg direto e BNDigital: adapters legados não ativos; EM BREVE na interface, sem promessa de busca/detalhes/download funcional.
- BibliON/MEC: atalhos de portais em Contas, sem adapter, importação integrada ou sessão/login sincronizado no app; PARCIAL/NÃO TESTADO nesta continuação. WebView na Web continua pendência.
- Sol/Lua: IMPLEMENTADO/CONECTADO/VALIDADO na Biblioteca Web, ícones sunny/moon, alternância e persistência. Sistema permanece nos Ajustes. Android visual NÃO TESTADO.
- Tema global: IMPLEMENTADO/CONECTADO; Biblioteca, Busca, tabs, Ajustes, fontes/detalhes, controles Reader e seletor PDF usam provider. Livro usa outro contexto. Persistência separada app=light, livro=paper confirmada após reload. Shell Reader usa tokens globais; validação visual Native PENDENTE.
- Ajustes: CONECTADO/VALIDADO Web, seções Aparência, Leitura, Conforto, Fontes e catálogos, Contas. Anti-enjoo e Fontes acessíveis.
- Anti-enjoo: IMPLEMENTADO/CONECTADO, DeviceMotion/expo-sensors, preferência persistente e overlay isolado; testes sintéticos PASS. Indisponível explicitamente na Web. Android físico/permissões/sensação de conforto NÃO TESTADOS. Nome antigo MotionSicknessOverlay corresponde ao atual MotionCuesOverlay.
- Papel: IMPLEMENTADO/CONECTADO/VALIDADO em EPUB Web; paleta computada rgb(245,241,231)/rgb(17,17,17), preferência paper persistida. PDF Original não recebe recoloração do conteúdo.
- Modo Kindle: PARCIAL. Toggle Modo e-reader já recebido é atalho para Papel, conforme descrição da UI. Não há simulação independente de e-ink/refresh/hardware. Nenhum modo duplicado criado.
- Brilho: IMPLEMENTADO/CONECTADO. Web Luminosidade da página/slider/% acessível no Reader e configurações persistidas. Native Usar brilho do aparelho, ajuste manual e restauração já existentes, NÃO TESTADOS em hardware. Luminosidade Web é composição visual existente e não altera brilho do aparelho.
- Biblioteca: VALIDADA Web, 34 livros iniciais, 35 após aquisição; livro real abriu no Reader com texto e 1486 páginas nesse viewport. Remover a fonte preservou o livro.

## Arquivos desta continuação

Alterados: README.md; app/(tabs)/search.tsx; src/domain/types/search.ts; src/domain/types/sources.ts; src/domain/usecases/SearchBooksUseCase.ts; src/domain/usecases/ImportEpubUseCase.ts; src/data/scraping/NetworkFetcherService.ts; src/data/scraping/GutenbergSearchPlugin.ts; src/data/scraping/GutendexSearchPlugin.ts; src/data/scraping/UserSourceSearchPlugin.ts; src/data/downloads/DownloadManager.ts; src/presentation/stores/searchStore.ts; src/presentation/components/SourceManagerModal.tsx; src/presentation/components/ReaderControls.tsx; src/presentation/components/ReaderSettingsPanel.tsx; src/presentation/components/PdfModeChooser.tsx; PROJECT_CONTEXT.md.

Criados: COPILOT_CONTINUATION_AUDIT.md e scripts/test-catalogs.cjs. Artefatos de auditoria no diretório ignorado .expo: respostas/headers HTTP, EPUB real baixado, perfil Chrome headless, helper CDP e servidor local. Não usados para alterar dados de usuário: testes de browser em perfil isolado. Artefatos recebidos foram preservados.

## Testes, limites e pendências

- npm.cmd run typecheck: PASS na versão final.
- npm.cmd run export:web: PASS na versão final, 2245 módulos e 34 livros copiados. Build não comprova comportamento funcional.
- git diff --check: executar novamente após esta atualização; resultado final registrado abaixo.
- node scripts/test-catalogs.cjs --live: PASS. Schema/URLs JSON, filtros sem acentos, CRUD com armazenamento simulado, erros por fonte, bypass robots APIs, política de crawler, timeout do corpo/cancelamento, estados e race de respostas antigas; download sintético ZIP -> parser real -> import -> Library -> OpenBook, isolamento entre livros e fonte removida; caso de uso Gutendex com rede real retorna 23 EPUBs. Persistência Node usa fallback em memória, sem alegar IndexedDB real nesse teste.
- node scripts/test-motion-cues.cjs: PASS, sinais/cancelamento/watchdog/isolamento anteriores preservados.
- Chrome headless Windows, perfil isolado, aplicação exportada em http://127.0.0.1:8097: Biblioteca, Sol/Lua persistido, Ajustes, anti-enjoo indisponível Web, fonte JSON CRUD/reload, loading termina, erro total/erro parcial, detalhes, aquisição EPUB real por servidor local, Library e texto real no Reader, Papel e controle luminosidade PASS. Importação e persistência IndexedDB reais no browser. Após reload manteve preferências e livro. Primeira tentativa de verificar edição usou espera menor que throttle e foi repetida aguardando conclusão; edição final confirmada.
- NÃO TESTADO: Android/iPhone físicos, intensidade/restauração brilho nativo, movimento real/permissões, download Native, OPDS/HTML live, portais/contas, repetição completa de restauração Reflow e EPUB/PDF após esta continuação. ReaderScreen/árvore/layout/algoritmos não alterados. Gutendex UI externa permaneceu INCONCLUSIVA por timeout deste Chrome; validar no browser/dispositivo habitual.
- PENDENTE: suporte de paginação de fontes customizadas, catálogo JSON além de 50 resultados/consulta quando necessário, autenticação e PDF remoto fora da V1. SourceCatalogsUseCase legado permanece infraestrutura incompleta sem ligação à UI, sem criar caminho duplicado.
- NÃO ALTERADO: tocMode, completude Sobre o Ócio, fallback Manifesto/Sociedade, PDF Original, totalPages, progresso/restauração, handshake Reflow, slot estável, currentPage/targetPage, transitionend, safe-area e parsers.
- Bugs anteriores: EPUB reset ABERTO — NÃO ALTERADO. Limitações/falsos positivos e validação da restauração Reflow continuam conforme dossiês; esta tarefa não os resolve.
- Dependências Native recebidas: expo-sensors ~57.0.3 e expo-brightness ~57.0.2 (além da infraestrutura Native preexistente). Nenhuma dependência instalada/atualizada por esta continuação.
- RECOMPILAR/REINSTALAR ANDROID: SIM, se o APK instalado antecede sensores/brilho. É necessário incluir módulos nativos recebidos; alterações JavaScript desta continuação não acrescentam módulo. Nenhum APK gerado.

Resultado final de git diff --check: PASS, exit code 0; somente avisos LF/CRLF. Confirmação adicional no bundle final: livro importado reabriu após navegação/reload, texto real presente; cor do documento Papel rgb(17,17,17), ícone do shell global rgb(23,26,29), preferência de luminosidade 65 persistida. Contexto e histórico anteriores preservados.

## 2026-10-06 — Retomada após interrupção: checkpoint de auditoria

- Lidos integralmente os quatro contextos obrigatórios, ROADMAP, COPILOT_CONTINUATION_AUDIT, prompt completo e README. PROPOSTA_FONTES_DE_LIVROS.md e Pesquisa_Apps_Leitura_2026-10-05.md não encontrados no workspace; nenhuma AGENTS.md encontrada. Contexto recente confrontado com fontes/diffs, sem descartar trabalho.
- Baseline real: master, único commit f454d43; 39 arquivos rastreados modificados, +7722/-5918 (inclui lockfile), além de numerosos untracked. Comandos status/diff/stat/name-only/branch/log executados. Os números antigos de 33 arquivos não descrevem este baseline.
- Já existiam repositórios Bookmark/Highlight SQLite no commit inicial. A integração nova recebida acrescenta IndexedDB estrito, findById, âncoras textuais V1, StudyBookmarks/StudyHighlights, painéis, mensagens no documento e seleção com touch zones desmontadas durante seleção. Comentários dos grifos vivem no JSON startCfi/endCfi; notas dos marcadores no campo note. Não existe um terceiro repositório independente de comentários a duplicar.
- Organização recebida: AsyncStorage @kindle/library-organization.v1, fila de gravação, revision, validação e merge idempotente. Backup kindle-library-organization V1 inclui título/autor/capa editada, favorito, coleções, tags, série/volume e status; exclui progresso, arquivos, marcadores, grifos/comentários e configurações. Exports de estudo são separados e por livro.
- Lacunas encontradas: importação dos painéis salva item a item (risco de falha parcial); seleção/captura, cores/comentários, reaplicação e recuperação precisam prova Web real. Grifos/estudo Reflow não são disponibilizados pela UI atual, PDF Original oferece apenas marcador de página fonte. Não anunciar suporte equivalente entre modos.
- Baseline typecheck, export:web (2255 módulos/34 livros), test-library-organization e test-reading-anchors PASS. Testes Node usam armazenamento injetado ou validação de domínio; não provam IndexedDB/UI. Validação funcional desta retomada ainda em andamento.
- ADB disponível em Android/Sdk/platform-tools; adb devices sem aparelho. ANDROID FÍSICO: PENDENTE. Nenhuma dependência/configuração Native alterada; sem APK gerado. Alterações previstas são TS/JS com módulos já existentes.
- Preservados: reset EPUB ABERTO, proteção stale recebida (não tratada como solução), currentPage/targetPage/transitionend, iframe/srcDoc, handshake Reflow, slot overlay, tocMode, processor versão 10, heurísticas/fallback, PDF Original, safe-area, brilho/sensores/fontes. Artefatos .browser-*, debug-reflow-* e .expo/CDP classificados como DIAGNÓSTICO/TESTE, não removidos.
- Próximo bloco: tornar import de estudo transacional nos repositórios existentes, provar falhas/duplicatas e validar CRUD/seleção/reabertura no navegador isolado. Não iniciar features posteriores antes de estabilizar esta etapa.

### Checkpoint 2 — importação transacional e seleção

- Acrescentado importPreservingExisting aos contratos BookmarkRepository/HighlightRepository e às implementações existentes; painéis usam essa operação em vez de saves individuais. IndexedDB verifica IDs e grava em uma única readwrite transaction, confirmando apenas oncomplete; abort desfaz tudo. SQLite usa withExclusiveTransactionAsync e queries no objeto transaction da API instalada, sem novo banco/dependência/migração. IDs locais são preservados, colisão com outro livro aborta o lote; contagens imported/skipped aparecem na UI.
- Arquivos: contratos, IndexedDbRepositories, webLibraryStore, SqliteBookmarkRepository/SqliteHighlightRepository, StudyBookmarksPanel/StudyHighlightsPanel. Schema de backup/âncora permanece V1, banco Web V3/SQLite V2; comentários continuam nos campos existentes.
- ReaderScreen agora oculta controles durante seleção e bloqueia handleProgress/changePage nessa fase (rodapé antes permanecia ativo); erros da seleção aparecem no overlay. Troca de livro invalida solicitações antigas/feedback. ReaderAnchorDocument cancela a captura agendada se a solicitação tiver sido cancelada antes do frame. Não alterados algoritmos EPUB/restore/paginação.
- Teste de baseline Web real: Chrome diagnóstico, contexto separado sem dados pessoais; Sigmund Freud, viewport iframe 428×414,5, página 700/1109, 1 iframe. Captura textual no capítulo 18, marcador salvo e verificado no IndexedDB; seleção por mouse real capturou “A ambiguidade presen”, página 700 preservada, mesmo iframe/srcDoc. Resultado negativo do reset neste cenário não resolve o bug real.
- scripts/test-study-storage.cjs PASS: SQL real via node:sqlite com adapter de ponte Expo, CRUD/importação/idempotência/rollback por colisão e falha de escrita injetada após um item; Web sem IndexedDB recusa read/save/delete/import. Não equivale a Android físico nem ao teste de IndexedDB real da versão final.
- Typecheck, test-reading-anchors e export:web PASS após estas alterações. Nova build Android NÃO necessária para este delta JS/TS; sem aparelho. Validação final de CRUD/comentários/cores/reabertura/importação e regressão Reader ainda em andamento.

### Checkpoint 3 — estudo EPUB validado no Web real

- Chrome headless existente em CDP 9371, Target.createBrowserContext isolado, app exportado servido localmente em 8097. Inicialização de um novo processo Chrome foi rejeitada pela política automática; a validação usou contexto separado no Chrome diagnóstico já ativo, sem tocar a biblioteca do perfil anterior. Nenhum artefato recebido foi removido.
- CRUD de marcador nomeado, edição da nota, criação de grifo por arraste real (20 caracteres), amarelo→azul, edição/remoção do comentário, JSON/Markdown/texto e importação pela UI PASS. IndexedDB consultado diretamente após ações. Fechar/voltar à biblioteca/reabrir manteve o marcador e reaplicou CSS Highlight. Excluir/importar recuperou nota e comentário exatos; repetir import retornou zero novos registros. Importação aceita apenas o mesmo livro/edição e preserva registros locais.
- Confirmada proteção da seleção inclusive por acionamento programático do rodapé; touch zones ausentes durante seleção. A captura não mudou página nem iframe. Fonte/tamanho (16→24 via controle touch real), margens 46px/largura 600px e Papel aplicados pela UI; marcadores e grifos reencontraram texto visível após repaginação. O grifo azul foi confirmado visualmente em screenshot, não somente pela existência da API CSS. Na configuração final, retorno ao marcador: página 1743/2747; retorno ao grifo: 1744/2747. Dez toggles preservaram página, iframe único e srcDoc de 4.882.972 caracteres, viewport externo 764×485. Isso é NÃO REPRODUZIU NESSE CENÁRIO, não resolução do reset EPUB real.
- Ambiguidade testada no capítulo real com “Freud” repetido e contexto vazio; ausência testada com frase inexistente importada. Para marcadores e grifos, a UI recusou navegação, preservou notas/exportação e não pintou grifos errados. Os registros de teste foram removidos pela UI. Dados antigos/malformados não derrubam a renderização dos grifos válidos: ReaderAnchorDocument valida cada âncora/formato e conta as inválidas como não localizadas. Backup de marcador agora recusa textPreview divergente de anchor.quote; teste de domínio acrescentado.
- Teste IndexedDB real do código fonte: lote idempotente, colisão cross-book com rollback, falha de quota injetada após primeiro add com rollback, sucesso do request seguido de abort (não anuncia commit) PASS em bookmarks e highlights. Sem storage paralelo, migração ou dependência.
- Artefatos preservados em .expo: study-ui-result-20261006.json, study-typography-result-20261006.json, study-ambiguity-result-20261006.json, study-highlight-visible-20261006.png e drivers/cenários study-*.cjs. São TESTE/DIAGNÓSTICO, não módulos do produto. Teste SQL durável em scripts/test-study-storage.cjs. Scripts CDP tiveram ajustes de sincronização/seletores antes dos ensaios PASS; falhas de driver não foram atribuídas ao app.
- Limite observado na restauração EPUB por percentual já recebida: após sair de 700/1109 e reabrir, UI chegou a 680/1109; marcadores/grifos textuais voltaram ao trecho correto. Não corrigido nem ocultado nesta retomada; posição intermediária preservada, equivalência exata do progresso precisa investigação própria. Native/Reflow não validados como estudo; grifos Reflow seguem não expostos e Original é marcador por página fonte. Ainda pendentes: exclusão seguida de nova reabertura, organização Web/restore e smoke PDF.

### Checkpoint 4 — organização e recuperação de feedback do Reader

- Organização Web real PASS: título/autor, favorito, coleções, tags, série/volume, Interrompido e busca por metadados; preferências mantidas após reload. Exportar→editar→restaurar pela UI aprovou manter-local e usar-importado, repetição sem duplicata e nenhuma alteração de reading_progress/bookmarks/highlights. Evidência em .expo/study-library-result-20261006.json. Nenhuma mudança no código de organização nesta retomada.
- Smoke inicial Sobre o Ócio em Reflow: texto integral/final presente, página 15, dez toggles com mesmo iframe/srcDoc. PDF Original renderizou canvas não branco e marcador por página fonte. Esses cenários passaram; não provaram mapeamento fino Reflow↔Original.
- Lacuna real adicional: JSX de reflowFeedback em ReaderScreen continha somente o botão Fechar e omitia o valor da mensagem. Isso deixava o usuário sem explicação ao falhar o Reflow, embora handleReflowError já escrevesse a mensagem correta. Restaurado Text com o conteúdo existente e accessibilityLiveRegion polite no mesmo overlay. Não alterados fallback/heurísticas/processor/árvore documental/handshake. Validação final com mensagens visíveis e PDFs corrompidos em andamento.

- Evidência visual adicional na validação de fonte: Sem serifa emitia System no iframe; CSS inicial tinha fallbacks de sistema, mas updateTypography usava System, Georgia, serif. Portanto a opção caía visualmente em Georgia após atualizar. EpubReaderDocument agora traduz System para uma lista CSS system-ui/.../sans-serif, usando a mesma função pura no HTML inicial e na atualização dinâmica. Token React Native em theme/tokens não foi alterado; sem dependência Native. Não é patch do reset/navegação: só lista CSS de fonte. Teste sintático do documento inteiro e fallback acrescentado a test-reading-anchors. A validação anterior de fonte era de controles/lista CSS, não comprovava família visual distinta; nova validação real de fonte em andamento.

### Checkpoint 5 — fechamento funcional e handoff, 2026-10-06

Este registro prevalece sobre pendências intermediárias dos checkpoints 1–4 sem apagar o histórico. Continuação concluída nesta etapa: estudo EPUB Web e sanidade do código interrompido. O roadmap geral continua PARCIAL.

**Encontrado / existente / parcial:** organização e estudo já estavam conectados; repositórios Bookmark/Highlight anteriores foram reutilizados. Lacunas efetivamente corrigidas: importação por item sem atomicidade; rodapé/progresso ativos na seleção; captura agendada obsoleta; ausência da mensagem de fallback; discrepância CSS inicial/dinâmica de Sem serifa; âncora de grifo inválida podia interromper renderização. Organização não foi reimplementada. Notes/comments não ganharam storage paralelo.

**Alterado / como / por quê:** importPreservingExisting executa leitura de colisões e inserts na mesma transação dos repositórios existentes. IndexedDB anuncia sucesso só em oncomplete; SQLite usa a API transacional instalada, queries no objeto da transação. Preserva registros locais; repetir import é idempotente; colisão cross-book/falha abortam o lote. O Reader oculta/bloqueia controles de navegação na seleção, invalida solicitações ao trocar livro e mostra erro no overlay. Documento valida âncoras por item e só aceita quote/contexto/chapter exatos e unívocos; ausência/ambiguidade não têm fallback aproximado. CSS de fonte usa função única para geração inicial e atualização. Mensagem Reflow usa o feedback já existente no mesmo overlay. Mudanças mínimas para completar implementação recebida e resolver falhas demonstradas, sem refatorar parser/paginação.

**Arquivos alterados nesta retomada (não confundir com baseline recebido):**

- src/domain/repositories/BookmarkRepository.ts; src/domain/repositories/HighlightRepository.ts.
- src/data/database/connection/webLibraryStore.ts; src/data/repositories/IndexedDbRepositories.ts; src/data/repositories/SqliteBookmarkRepository.ts; src/data/repositories/SqliteHighlightRepository.ts.
- src/domain/usecases/StudyBookmarks.ts.
- src/presentation/screens/ReaderScreen.tsx; src/presentation/components/ReaderAnchorDocument.ts; src/presentation/components/EpubReaderDocument.ts; src/presentation/components/StudyBookmarksPanel.tsx; src/presentation/components/StudyHighlightsPanel.tsx.
- scripts/test-reading-anchors.cjs; PROJECT_CONTEXT.md; ROADMAP_FUNCIONALIDADES.md.
- Criado teste durável scripts/test-study-storage.cjs. Nenhum componente/repositório de produção novo duplicado. Nenhum package/configuração Native modificado nesta retomada.

**Tipos/schema/persistência:** novo método nos contratos Bookmark/Highlight; formatos JSON e âncoras permanecem V1, IndexedDB V3/SQLite V2, sem migração. Marcador EPUB: chapterId + offsets + quote + prefix/suffix de até 64 + path; resolver usa capítulo/texto/contexto, não número de página nem path sozinho. Marcador Original: sourcePage, sem promessa de grifo textual. Nota no campo note; comentário codificado no payload de grifo startCfi/endCfi. Web usa IndexedDB estrito para estudo; Native SQLite existente. Organização usa AsyncStorage existente/fila/revision.

**Validação funcional final Web:**

- EPUB real Freud: criação/edição/exclusão de marcador e nota; seleção por arraste real de “A ambiguidade presen”; duas cores amarelo/azul; CRUD de comentário; close/reopen com reaplicação visual; JSON/Markdown/texto e import após remover dados recuperam conteúdo exato; repetição import retorna 0 novos/1 ignorado. Confirmação direta no IndexedDB e screenshot do grifo, não só memória/API CSS. Touch zones e rodapé não viram página durante seleção.
- Âncoras ambíguas (“Freud” repetido) e ausentes testadas no capítulo real para ambos os tipos; UI recusa navegação, preserva dados/export e não pinta trecho errado. Registros diagnósticos removidos pela UI.
- Versão FINAL com correção CSS: Georgia 16→system-ui 24, margem 46→18px, largura 600→1200px, Papel mantido. Marcador/grifo retornam ao texto correto visível. Retorno ao grifo 1507/2361; dez toggles mantêm página, iframe único e mesmo srcDoc (4.883.240 caracteres), viewport externo 764×485. Screenshot study-sans-highlight-final-20261006.png confirma fonte sem serifa e grifo azul. Ao excluir ambos e reabrir, registros desse EPUB no IndexedDB = 0 e CSS Highlights = 0. Isso conclui pendência de exclusão/reabertura do checkpoint 3.
- Teste original de centro: começou em 700/1109, viewport iframe 428×414,5, único iframe, sem mudança de srcDoc/página por controles. Resultado exclusivamente NÃO REPRODUZIU NESSE CENÁRIO. Não resolve reprodução do usuário.
- Organização real: título/autor, favoritos, coleções/tags, série/volume e Interrompido; reload persistiu. Restore da exportação após editar, ambas as políticas de conflito, idempotência e preservação de progresso/estudo PASS. Capa aceita/exportada pelo schema; edição visual de capa não retestada aqui. Outros estados de leitura têm testes de domínio, não nova matriz visual de todos os estados.
- IndexedDB real: atomicidade, colisão entre livros, quota injetada após primeira gravação, request bem sucedido seguido por abort e idempotência PASS, para bookmarks/highlights. SQL real via node:sqlite: CRUD/rollback/trigger de falha PASS. Não confundir adapter de teste com ponte Expo física.
- Sobre o Ócio Reflow: 27.103 caracteres e conteúdo final presentes, 15/54 e dez toggles estáveis, iframe/srcDoc mantidos. Avançado o item de validação de estabilidade no roadmap: progresso confirmado em IndexedDB nas páginas 5, 27 e 52/54, saída e reabertura pelo app recuperaram cada uma corretamente; após confirmação não houve mensagem de página 1. Não é prova Native nem matrix completa de fontes/viewport.
- PDF Original: canvas não branco, marcador nomeado e nota por página fonte 14/49; retorno/toggles PASS. Manifesto 68/Sociedade 169 páginas: fallback corrompido visível, modo Original e canvas final não branco confirmados aguardando terminar o carregamento. Nenhuma nova heurística, hack por livro ou mudança processor.

**Gates e testes de código finais:** npm.cmd run typecheck PASS; npm.cmd run export:web PASS após última mudança de produção (2255 módulos/34 livros). node scripts/test-study-storage.cjs, test-reading-anchors.cjs, test-library-organization.cjs, test-motion-cues.cjs e test-catalogs.cjs PASS. Catálogos sem --live nesta retomada; não repetir alegação de aprovação Gutendex UI externa. Teste Node organização usa storage injetado; teste browser usa persistência real. Export log final .expo/study-export-final-v2-20261006.log. Diff check final será registrado logo abaixo após esta documentação.

**Backup auditado por conteúdo:** kindle-library-organization V1 contém organização, título/autor/capa editada, favoritos, coleções/tags, série/volume/status; NÃO contém reading_progress, arquivos EPUB/PDF, configurações, marcadores/notas, grifos/comentários. Estes quatro últimos têm exportações separadas por livro (JSON V1 recuperável; Markdown/texto para consulta). Restore da organização e estudo separados PASS, conflitos/duplicatas PASS; import de estudo local preservado + rollback do lote PASS. Backup geral PARCIAL. Livro/edição incompatível e schemas/cores/quotes inválidos recusados; registro legado sem âncora não ganha navegação falsa. Sem empacotamento completo ou sincronização externa.

**Funções anteriores auditadas, sem recriação:** tema global AppThemeContext e Sol/Lua/Sistema, persistência separada de leitura; Papel no EPUB/Reflow e Original separado. Web Papel e tipografia testados nesta retomada; Sol/Lua/global tinham validação Web real anterior e não foram retestados integralmente aqui. Luminosidade Web compõe só superfície documental e mantém controles fora dela; validação anterior preservada, sem nova matriz do slider. Fontes: Gutendex caso de uso histórico aprovado, UI externa inconclusiva; JSON fluxo anterior aprovado, regressão de código/catálogos PASS agora; OPDS/HTML parcial, placeholders Gutenberg/BNDigital mantidos; busca não baixa livros. Sensores: DeviceMotion, oito pontos, overlay pointerEvents none, foco/AppState/cleanup/suavização já existentes; teste sintético PASS, conforto real não testado.

**Brilho Native — lacuna estática encontrada:** efeito recebido em ReaderScreen tem manual/sistema/percentual/captura/cleanup, mas NÃO observa AppState. disposed é conferido só após isAvailableAsync; após getBrightnessAsync/setBrightnessAsync pode aplicar/registrar brilho depois do cleanup. Trocas rápidas também podem sobrepor apply/restore; falhas são engolidas. Isso é risco identificado por código, não reprodução física; permanece PARCIAL, exige revisão de lifecycle e teste background/foreground/saída em device. Nenhuma alteração nesse efeito nesta retomada. Safe area estrutural e sensores não refeitos sem evidência.

**Não testado / pendências / riscos:** Android/iPhone físico, ponte SQLite Expo, seleção WebView/touch real em aparelho, brilho/restauração/AppState, motion real/permissões, safe area física, offline com rede desligada, fontes externas live/download Native, edição visual de capa, todos os estados organizacionais na UI, estudo Reflow e mapeamento fino PDF. Anchor requer mesma edição; EPUB texto alterado pode ficar ausente/ambíguo e é declarado. Mudança tipográfica pode alterar/clamp número de página; foi validado retorno textual pelas âncoras, não preservação exata de texto em toda alteração de aparência. CSS Highlights/WebView Native ainda requer compatibilidade física.

**Bugs anteriores / deliberadamente preservado:** EPUB reset ABERTO, sem nova compensação, timeout, retry ou descarte global de page=1. Proteção stale herdada não tratada como solução. Diferença de reabertura EPUB observada 700/1109→680/1109 continua pendente, sem diagnóstico causal anunciado. Não alterados currentPage/targetPage/transitionend/algoritmos de navegação, slot/ancestralidade/keys/iframe/srcDoc, handshake Reflow pending/applying/inactive, tocMode, processor V10/cache/fallback/conteúdo PDF, parsers, safe area, temas/sensores/storage de organização/fontes.

**Web/Native e APK:** estudo funcional aprovado EPUB Web; PDF Original só marcador por página; Reflow sem estudo exposto. Native implementação existente + SQL testado, funcional físico PENDENTE. ADB disponível, adb devices sem aparelho. Nenhuma dependência instalada/configuração Native alterada; delta TS/JS não exige recompilar APK que já contenha módulos recebidos. APK anterior a expo-brightness/expo-sensors ainda exige atualização por razões históricas. Nenhum APK gerado/reinstalado.

**Artefatos / preservação / próximo passo:** baseline 39 arquivos rastreados modificados +7722/-5918 e muitos untracked preservado, sem reset/clean/restore/stash. Artefatos recebidos .browser-*, debug-reflow-* e .expo/CDP são DIAGNÓSTICO/TESTE, não apagados. Novos .expo/study-* são evidências/driver/screenshot/logs ignorados; scripts/test-study-storage.cjs é TESTE durável; código src é PRODUÇÃO. Browser usado em contexto isolado do Chrome diagnóstico, sem dados pessoais. Evidências finais: study-final-anchors-result-20261006.json, study-ui-result-20261006.json, study-ambiguity-result-20261006.json, study-library-result-20261006.json, study-pdf-result-20261006.json, study-reflow-reopen-result-20261006.json. Inicialização de Chrome novo rejeitada por política automática, superada usando contexto isolado no diagnóstico já ativo. Próxima prioridade do roadmap é estabilidade/posições duráveis: rastrear primeira operação incorreta na reabertura EPUB e no reset real, depois validar Native e avançar estudo Reflow. Etapas 4–11 não foram iniciadas fora da ordem. Não há commit novo nem descarte de trabalho.

Fechamento dos gates: git diff --check PASS (exit 0), apenas avisos de conversão LF/CRLF nos arquivos recebidos/rastreados. Não houve falhas de Runtime nos ensaios Web finais (errors=[] nos artefatos). Reflow emitiu mensagens iniciais page=1 enquanto montava/calculava layout; o teste aprovou destino salvo confirmado e ausência de retorno a 1 DEPOIS da confirmação, sem afirmar ausência absoluta de page=1 no carregamento. Servidor de diagnóstico local em 8097 e contexto Chrome isolado mantidos para revisão; artefatos preservados.

### Auditoria cruzada dos quatro chats — 2026-10-06

| Área | Feature | Código | UI | Persistência | Web | Android | Estado |
|---|---|---:|---:|---:|---:|---:|---|
| Estudo | Marcadores/notas/âncora/retorno | ✅ | ✅ | ✅ | ✅ | 🧪 | ✅ IMPLEMENTADO E VALIDADO no Web |
| Estudo | Grifos, cores e comentários | ✅ | ✅ | ✅ | ✅ | 🧪 | ✅ IMPLEMENTADO E VALIDADO no Web |
| Estudo | Flashcards/repetição/Anki | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | 📋 APENAS PROPOSTA/ROADMAP |
| Biblioteca | Metadados, favorito, coleções/tags, série/volume/status | ✅ | ✅ | ✅ | ✅ | 🧪 | ✅ IMPLEMENTADO E VALIDADO no Web |
| Backup | Organização V1 e conflitos | ✅ | ✅ | ✅ | ✅ | 🧪 | 🟡 BACKUP DA ORGANIZAÇÃO |
| Backup | Pacote completo com arquivos/progresso/configurações | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | 📋 APENAS PROPOSTA/ROADMAP |
| Sync/monetização | Nuvem, assinatura, billing, backend, autenticação | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | 📋 APENAS PROPOSTA/ROADMAP |
| Indexação | Gutendex adapter/mapping/caso de uso | ✅ | 🧪 | ✅ | 🧪 | 🧪 | 🧪 AGUARDANDO ambiente/rede na UI |
| Indexação | JSON Sources CRUD e aquisição | ✅ | ✅ | ✅ | ✅ | 🧪 | ✅ IMPLEMENTADO E VALIDADO no Web |
| Indexação | Busca unificada, timeout, concorrência, erro parcial/total | ✅ | ✅ | ✅ | ✅ | 🧪 | ✅ IMPLEMENTADO E VALIDADO por testes e fluxo JSON |
| Indexação | OPDS/HTML | 🟡 | 🟡 | 🟡 | ⬜ | 🧪 | 🟡 PARCIAL |
| Indexação | BNDigital/Gutenberg direto | ⬜ | “Em breve” | ⬜ | ⬜ | ⬜ | 📋 APENAS PROPOSTA/ROADMAP |
| Indexação local | Conteúdo completo de EPUB/PDF antecipadamente | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | 📋 APENAS PROPOSTA/ROADMAP; arquitetura usa processamento sob demanda |
| Anti-enjoo | Toggle, persistência, DeviceMotion, overlay isolado | ✅ | ✅ | ✅ | N/A | 🧪 | 🧪 IMPLEMENTADO — AGUARDANDO DEVICE |
| Kindle visual | Papel, EPUB/Reflow, Original preservado | ✅ | ✅ | ✅ | ✅ | 🧪 | ✅ Web; Android pendente |
| Kindle visual | Luminosidade Web | ✅ | ✅ | ✅ | ✅ | N/A | ✅ IMPLEMENTADO E VALIDADO no Web |
| Kindle visual | Brilho Native lifecycle | ✅ | ✅ | ✅ | N/A | 🧪 | 🧪 IMPLEMENTADO — AGUARDANDO DEVICE |
| Kindle visual | Sol/Lua e tema global | ✅ | ✅ | ✅ | ✅ | 🧪 | ✅ Web; visual Android pendente |

**Correção Native realizada nesta auditoria:** `ReaderScreen.tsx` agora serializa operações do `expo-brightness`, observa `AppState`, restaura em background/saída, reaplica em foreground, remove o listener e invalida operações antigas. Typecheck PASS; intensidade real, background/foreground real e restauração física continuam 🧪 por ausência de device.

**Itens explicitamente fora de “concluído”:** flashcards, repetição espaçada, “Abrir trecho no livro” para cartões, geração por capítulo/conteúdo lido, aprovação de cartões, exportação Anki, sync, nuvem, assinatura, billing, backend, autenticação, OCR em lote e backup completo. Não há documentos encontrados para `CONTEXTO_FLASHCARDS_ESTUDO.md` ou `Pesquisa_Apps_Leitura_2026-10-05.md`; propostas não foram convertidas em código.

### Checkpoint 6 — auditoria e primeira integração Flashcards, 2026-10-06

- Lidos integralmente `PROMPT_INTEGRACAO_FLASHCARDS_KINDLE_READER.md`, `CONTEXTO_FLASHCARDS_ESTUDO.md`, `PROJECT_CONTEXT.md` e os códigos acessíveis de `C:\Flashcards` e `C:\KIndle`. Inventários, versões, manifests, lockfiles, rotas, stores/hooks, contratos compartilhados, Prisma schema, auth, IA, estudo, batalha e testes foram confrontados. O projeto doador existe completo em `C:\Flashcards`; não foi reconstruído por descrição.
- Versões efetivas: ambos React/RN 19.2.3/0.86.3 e Expo 57; doador usa Router ~57.0.20, Zustand 4.5.5, NativeWind 2, Socket.IO client; Reader usa Router ~57.0.23, Zustand 5.0.2, NativeWind 4, sem Socket.IO. Não houve substituição de package.json, lockfile, NativeWind global ou estilos do Reader.
- O doador tem núcleo SM-2, decks/cards Prisma, auth JWT, Gemini opcional e gateway Socket.IO, mas mobile usa dados SAMPLE/setTimeout, IA salva diretamente sem preview/fila/referências, não há migrations Prisma no workspace e o gateway aceita `isCorrect` do cliente. `npm run build:server` PASS; Jest server/mobile permaneceu sem conclusão e foi interrompido, portanto não é aprovação. Esses pontos impedem marcar sync/IA/batalha como funcionais; detalhes em `INTEGRATION_FLASHCARDS.md`.
- Primeira integração local no Reader: contratos `src/domain/types/flashcards.ts`; SM-2 puro `src/domain/study/flashcardSrs.ts`; geração local de candidatos por capítulos reais `src/domain/study/flashcardGeneration.ts`; repositório AsyncStorage serializado `src/data/local/FlashcardRepository.ts` com chave `@kindle/flashcards.v1`; UI `app/(tabs)/study.tsx` e `app/study/[deckId].tsx`; aba no `_layout`; ação “Criar flashcard” no `StudyHighlightsPanel`.
- Cartões mantêm `bookId`, edição implícita, capítulo, quote, prefix/suffix e tipo de origem; aprovação é explícita; geração não envia conteúdo para IA e não dispara automaticamente na importação. Revisões locais funcionam offline, com evento de ID estável e SM-2 1–4 adaptado do doador.
- Validação: `node scripts/test-flashcards.cjs` PASS (SM-2, geração por capítulo/origem, armazenamento local e evento de revisão idempotente); smoke Chrome isolado de aba Estudo/criação/persistência/prévia PASS em `.expo/flashcards-local-smoke-20261006.json`; typecheck e export Web PASS. O smoke não valida Android nem backend.
- Não testado: edição/exclusão de cartão pela UI, exportação Anki, “Abrir origem” exato via âncora, geração IA real, OCR, login/troca de conta, API, sync entre dispositivos, reconciliação, Redis/worker e batalha entre duas sessões. Não simulamos segundo jogador nem chamamos serviço externo.
- Nenhuma dependência/configuração/migration Native foi alterada. Android físico continua pendente; esta etapa não exige recompilar/reinstalar APK. Alteração futura de dependência Native será avisada antes.
- Deliberadamente intactos: Reader/EPUB/PDF, slot/iframe/srcDoc, progresso, âncoras existentes, backup V1, temas, anti-enjoo, brilho lifecycle corrigido, pipeline PDF e fontes. Próxima etapa autorizada: UI CRUD/editável de cartões e “Abrir origem” exato, depois contrato API/sync seguro; batalhas só após servidor corrigir validação.

### Checkpoint 7 — ambiente remoto Supabase preparado, 2026-10-06

- O SDK `@supabase/supabase-js` já estava efetivamente instalado (`2.117.2`) e no lockfile; nenhuma alteração de versão foi necessária.
- Criado `.env.local` com as variáveis Supabase fornecidas. `.env*.local` foi adicionado ao `.gitignore` para não versionar credenciais/configuração local.
- Criado `src/data/remote/supabase.ts` com sessão persistente em `AsyncStorage`, `autoRefreshToken` e `detectSessionInUrl: false`. O export nullable e `requireSupabase()` mantêm o Reader offline quando o ambiente remoto não estiver configurado.
- O exemplo Todo não foi copiado para `App.tsx`: o projeto usa Expo Router e o Reader continua sendo o shell principal. Ainda não há contrato de tabelas, auth de usuário, sync de flashcards/revisões ou batalha Supabase concluídos.
- Gates após a configuração: `npm.cmd ls @supabase/supabase-js --depth=0`, `npm.cmd run typecheck` e `npm.cmd run export:web` PASS; Expo carregou `.env.local` no export Web (2260 módulos).
- Bloqueios específicos permanecem: schema/RLS/auth e estratégia de reconciliação ainda precisam ser definidos; ambiente doador/migrations/worker não comprovados; Android físico ausente. A etapa não alterou dependências/configuração Native e não exige novo APK.

### Checkpoint 8 — autenticação, perfis e controle de acesso, 2026-10-06

**Estado inicial/auditoria:** nenhuma tela/guard/role estava implementada no Reader; só o SDK/client Supabase. `app.json`, Gradle e Manifest já tinham scheme `kindlereader` e package `com.kindle.reader`; `expo-linking` já estava instalado. `expo-web-browser`/`expo-auth-session` não estavam. O projeto doador Prisma tem `public.users` próprio com `passwordHash` e FKs de decks/sessões/batalhas, sem relação declarada com `auth.users`. Nenhuma migration Supabase local preexistia. Worktree master com único commit f454d43 e alterações anteriores amplas foi preservado; executados status, diff stat, diff name-only, branch e log antes do código. Os contextos obrigatórios foram lidos, inclusive os bugs EPUB/Reflow, que não foram alterados.

**Auditoria remota parcial:** `/auth/v1/health` HTTP 200. Introspecção PostgREST de esquema com publishable key HTTP 401 (`Secret API key required`). `profiles` e `user_feature_overrides` retornam PGRST205 (ausentes). Probes com `limit=0` confirmaram `public.users(id,email,username,passwordHash)`, `decks(id,userId)`, `cards(id,deckId)`, `card_reviews(id,sessionId,cardId)`, `study_sessions(id,userId)` e `battles(id,player1Id,player2Id,winnerId)`, sem ler linhas/valores. A API aceita selecionar `passwordHash` com chave publicável; combinado com alertas CRITICAL de RLS Disabled relatados pelo usuário, isso torna o bloqueio remoto prioritário. FKs, grants, triggers, funções, policies, índices e RLS efetivo exigem `supabase/audit/01_inventory.sql` no SQL Editor. `public.users` não foi excluída, renomeada nem vinculada por suposição a `auth.users`.

**Migrations preparadas, NÃO aplicadas:** `202610060000_lock_legacy_public_tables.sql` deve ser aplicada primeiro: habilita RLS e revoga `PUBLIC/anon/authenticated` nas seis tabelas críticas, sem policy `using(true)` e sem mexer em dados. Isso é deny all para cliente legada até ownership real ser mapeado. `202610060001_profiles_and_features.sql` cria `profiles` com FK a `auth.users`, username lowercase/regex/unique case insensitive, role user/master, status active/disabled, trigger para cadastro/backfill, RLS própria, override com RLS e grants de update só para nome/username/avatar. Cadastro nunca atribui master automaticamente. Security Advisor remoto e RLS A/B permanecem PENDENTES de aplicação/teste; não dizer alertas corrigidos. Warnings de FK devem ser avaliados pela carga real; unused indexes não foram removidos.

**Auth/UI no código:** telas Login, Criar Conta, Recuperar Senha, Redefinir Senha, callback PKCE, Escolher Usuário; Conta, Editar Perfil, Alterar Senha e Sair. `AuthProvider` restaura sessão, busca perfil/overrides, usa cache por UUID para leitura local sem rede, não desmonta Reader em refresh de token, e `Stack.Protected` barra rotas do app sem perfil ativo/com username. Tema global e safe-area existentes são usados. Email/password usa Supabase Auth; username/password chama `username-login` Edge Function, que resolve email somente server side e só retorna tokens após senha correta. Google usa `signInWithOAuth` e deep link existente. Nenhum secret Google/service role foi gravado no app. Google Provider, Edge Function e migrations ainda não foram implantados; não há login real aprovado.

**Feature access:** `canUseFeature` central: master ativo com username sempre permite; usuário normal respeita override; status disabled/username incompleto bloqueiam. Aba Estudo oculta para TEST; rota direta mostra mensagem de acesso negado; criação/geração/revisão/conversão de grifo checam novamente. Flashcards locais novos usam chave AsyncStorage por UUID; chave V1 anterior permanece preservada, sem associá-la automaticamente a contas. Biblioteca/estudo de leitura locais existentes continuam dados do dispositivo e não foram particionados por conta. Script admin exige UUIDs explícitos e atribui MASTER/TEST sem credenciais hardcoded.

**Validação:** `node scripts/test-auth.cjs` PASS para username/role/status/override e isolamento de flashcards por conta. `npm.cmd run typecheck` PASS, `npm.cmd run export:web` PASS (2318 módulos) após a implementação inicial; executar gates finais após docs. `adb devices` sem device. Debug keystore padrão ausente; `keytool` disponível. Não houve mudança de app.json/Gradle/Manifest, dependência Native ou APK; esta etapa por si não exige rebuild, mas testar Android requer build que já contenha o scheme e dependências prévias. Tentativa de abrir Chrome isolado para smoke Web foi rejeitada por revisão automática (`blocked by policy`); não há validação visual Auth. Nenhum teste real de Google, cadastro, username, email, reset, A/B, master/test ou Security Advisor foi alegado. Bug reset EPUB permanece ABERTO.

**Manual/bloqueios:** instruções de aplicação, Google Cloud, Supabase, SHA-1/EAS/Play Console e riscos em `AUTH_IMPLEMENTATION.md`. O Client Secret Google antigo deve ser rotacionado manualmente. Para fechar esta entrega funcional faltam: aplicar migrations/admin script, implantar Edge Function, configurar provider Google e redirects, testar duas contas reais/Web/Android, conferir Security Advisor e executar RLS A/B. Sem acesso administrativo remoto, não é possível concluir esses itens neste workspace.

**Gates finais desta etapa:** `npm.cmd run typecheck` PASS após o último código; `npm.cmd run export:web` PASS após o último código (2319 módulos/34 livros); `node scripts/test-auth.cjs` e `node scripts/test-flashcards.cjs` PASS; `git diff --check` PASS (avisos LF/CRLF apenas); verificação de whitespace nos novos SQL/docs PASS. `Stack.Protected` foi complementado por `AuthGuard` nas rotas diretas Reader/serviços/conta/estudo sem alterar ReaderScreen ou documento. Esses resultados não equivalem a Auth/RLS funcional no servidor. O probe remoto não leu linhas nem segredos, apenas status e nomes de colunas com `limit=0`. Chrome isolado para smoke visual foi rejeitado por revisão automática (`blocked by policy`).

### Checkpoint 9 — diagnóstico de erro OAuth e correção de tela de callback travada, 2026-10-06

**Contexto e incidente reportado:**
Na tentativa de login social via Google na versão Web (`localhost:8081`), o navegador foi redirecionado para a rota `/auth/callback` com parâmetros de erro na URL:
`?error=server_error&error_code=unexpected_failure&error_description=Unable+to+exchange+external+code%3A+4%2F0A...` (e fragmentos correspondentes no `#hash`). A interface exibia permanentemente o título "Concluindo acesso" com um spinner girando indefinidamente.

**Diagnóstico e causa raiz técnica:**
1. **Falha de troca de código OAuth (Supabase Auth ↔ Google Token API):**
   - O prefixo `4/0A...` na descrição do erro é um authorization code emitido pelo Google após consentimento do usuário.
   - O Google redirecionou para `https://cmivracxuihtmsbmtuec.supabase.co/auth/v1/callback?code=4/0A...`.
   - O servidor Supabase Auth executou uma requisição POST para a API de tokens do Google (`https://oauth2.googleapis.com/token`) para trocar o código por tokens de acesso/id.
   - O Google recusou a troca (prováveis causas: Google Client Secret divergente ou rotacionado sem atualização no painel do Supabase, Authorized Redirect URI divergente no Google Cloud Console, credencial Google criada como tipo diferente de "Web application", consent screen em modo "Testing" sem o email na lista de test users, ou expiração/reuso do authorization code de uso único).
   - O Supabase redirecionou a aplicação cliente para `http://localhost:8081/auth/callback` com `error=server_error` e a descrição detalhada.
2. **Defeito de UX na rota cliente (`app/auth/callback.tsx`):**
   - O componente lia apenas `const { code, next } = useLocalSearchParams()`.
   - Quando ocorria erro de OAuth no servidor, o parâmetro `code` vinha indefinido.
   - O efeito do componente executava `if (typeof code !== "string" ...) return;` e abandonava a execução sem alterar o estado `error`.
   - Como `error` permanecia `null`, o JSX renderizava eternamente o estado de carregamento (`ActivityIndicator`), gerando a sensação de congelamento ou loop infinito.
   - Além disso, no fluxo Web, respostas com fragmento `#hash` (`#error=...` ou `#access_token=...`) não eram parseadas pelo `useLocalSearchParams` do Expo Router.

**Alterações realizadas:**
- Em `app/auth/callback.tsx`:
  - Adicionada a função auxiliar `extractCallbackParams()` para extrair parâmetros tanto da query string (`window.location.search`) quanto do hash fragment (`window.location.hash`) na Web.
  - Expandida a tipagem e desestruturação de `useLocalSearchParams` para incluir `error`, `error_description` e `error_code`.
  - No `useEffect`, adicionada prioridade para `effectiveError`: quando identificado erro de callback, o carregamento é interrompido imediatamente e uma mensagem legível em português é atribuída ao estado (com tratamento específico amigável para "Unable to exchange external code" apontando para a expiração do código ou divergência de credenciais no Supabase).
  - Adicionado fallback para quando nenhum código nem erro for detectado na URL, definindo erro de link inválido/expirado em vez de manter o spinner ativo.
  - Exibição de alerta acessível com `AuthLink` ("Voltar para entrar") apontando para `/auth/login`.

**Validação e gates:**
- `npm.cmd run typecheck`: PASS (TypeScript sem erros).
- `node scripts/test-auth.cjs`: PASS (regras de autenticação e isolamento de flashcards validados).
## Revisões sequenciais 1–4 — 2026-10-06

Pedido: `PROMPTS_REVISAO_KINDLE_READER.md`, executado em ordem. Auditoria inicial: árvore, scripts, dossiês EPUB, fluxos Reader/EPUB/PDF, importadores, persistência local, Supabase e código doador em `C:\Flashcards\apps\server`. O Reader continua app principal. Não houve mudança de dependência ou configuração nativa nesta revisão; não exige novo APK por este delta. O histórico prévio de dependências nativas ainda pode exigir APK atualizado para teste físico.

**1. Design/usabilidade.** O teclado global da leitura virava páginas mesmo com foco em links/botões e com modificadores; `ReadingTouchZones` agora respeita foco interativo e Alt/Ctrl/Meta. Preservada a árvore do documento, `srcDoc`, paginação, restauração e o overlay. Revisão estática de biblioteca, controles, painéis, erros, EPUB, PDF Original/Reflow e estudo: importação já apresenta processamento e erro; modos PDF diferem em recursos de estudo. Navegação real/rotação em Android não foi possível (sem dispositivo); o bug do reset EPUB no ambiente do usuário e a reabertura 700→680 continuam abertos. Não declarar usabilidade universal aprovada por inspeção estática.

**2. Backend/dados.** O app usa IndexedDB na Web, SQLite no Native, AsyncStorage para flashcards/organização, Supabase opcional para identidade. Não há Nest/Prisma/Redis/Socket.IO em `C:\KIndle`; o projeto doador `C:\Flashcards\apps\server` contém Nest/Prisma/Socket.IO, mas não está integrado como API de produção do Reader. Falha corrigida: mutações simultâneas de `LocalFlashcardRepository` podiam sobrescrever snapshots; leitura–mutação–gravação agora é serial. Teste existente ampliado com 20 decks simultâneos e revisão idempotente. Persistência cross-device, batalha real, filas/OCR/IA remota e dois usuários/dispositivos continuam **não validados**. No doador, `CardsController` expõe leituras sem verificação de deck privado e `BattleGateway` confia em `userId`, `isCorrect` e `responseTimeMs` enviados pelo cliente; não conectar esse servidor ao Reader nem anunciar batalhas reais antes de autenticação e avaliação oficial no servidor. Nenhuma migration foi aplicada ou substituída.

**3. Segurança.** EPUB empacotado, importado e Reflow passam pelo documento compartilhado. Parser e documento removem tags ativas, handlers inline inclusive sem aspas, e URLs `javascript:`/`vbscript:`/`data:text/html`. O documento adiciona CSP para bloquear rede, frames e forms; iframe Web roda com `sandbox=allow-scripts`. Teste existente constrói EPUB hostil e verifica parser/documento. Limitação: sanitização por regex não equivale a parser HTML de segurança formal; cobertura de WebView Native e conteúdo malformado é pendente. `npm audit --omit=dev --audit-level=high` retornou 40 alertas (1 crítico, 25 altos, 14 moderados) em dependências instaladas; parte do caminho envolve ferramenta de build, o que não prova exploração no bundle. Não foi executado `npm audit fix --force` porque propõe atualizações principais potencialmente incompatíveis. Risco **crítico operacional** pré-existente: tabelas públicas do Supabase sem RLS conforme auditoria anterior; migrations preparadas em `supabase/migrations/` ainda não aplicadas por ausência de acesso administrativo. Não expor dados remotos ou afirmar isolamento até aplicar/verificar RLS. Credencial previamente exposta requer rotação operacional; nenhum segredo é reproduzido aqui.

**4. Desempenho.** Benchmark adicionado ao script existente `scripts/test-catalogs.cjs --benchmark-parser` com EPUB real de 7.923.060 bytes. Antes (ms): 942, 861, 750; depois da reutilização do ZIP validado: primeira rodada concorrente com typecheck 2600, 1372, 1344; rodada isolada 970, 774, 737. Mediana isolada 861→774 ms, mas amostra pequena e variável: ganho não comprovado. `EpubParserService` agora usa uma única abertura JSZip para validar e ler o livro, evitando trabalho redundante sem mudar capítulos/conteúdo. Matriz: EPUB 7,9 MB | causa: ZIP aberto duas vezes | mudança: reutilizar instância validada | antes 942/861/750 ms | depois isolado 970/774/737 ms | risco: baixo para resultado, ganho inconclusivo. Tempo até primeiro pixel, memória, bateria e PDFs textuais/duplos/escaneados não foram medidos nesta rodada; não usar typecheck/export como prova de desempenho.

**Validação desta revisão:** `npm run typecheck`, `npm run export:web` (2319 módulos, 34 livros copiados), `node scripts/test-flashcards.cjs`, `test-catalogs.cjs` com benchmark, `test-auth.cjs`, `test-reading-anchors.cjs`, `test-study-storage.cjs`, `test-library-organization.cjs`, `test-motion-cues.cjs` e `git diff --check`: PASS. Testes sintéticos usam storage em memória onde indicado; não substituem Web/Android reais. Pendente: browser real com EPUB/PDF empacotados/importados, PDF escaneado/duplo, rotação, offline/online, dois usuários/sessões, reprocessamento/cancelamento e batalha com desconexão; RLS aplicada e validada, backend doador autorizado por recurso e prova de compatibilidade Native. Não foi criado APK nem apagado dado/arquivo existente.

**Complemento PDF da revisão:** PdfFileImporter verifica a assinatura %PDF- antes de persistir EPUB/PDF selecionado como PDF, em Blob Web e leitura parcial Native. Teste existente cobre rejeição de arquivo inválido sem entrada na biblioteca e importação de PDF real de 1,2 MB para armazenamento Web simulado. Isso não valida a estrutura completa do PDF; arquivos com cabeçalho correto mas corrompidos ainda dependem do parser/visualizador. PDF Native não executado em dispositivo.

**Complemento servidor doador:** Em C:\Flashcards\apps\server, CardsController agora exige JWT nas duas rotas de leitura; CardsService verifica dono ou publicidade antes de listar/retornar cartões. Teste novo cards.service.spec.ts cobre bloqueio de segundo usuário, proprietário e deck público. npm run build --workspace @flashcards/server e npm test --workspace @flashcards/server -- --runInBand passaram (3 suites, 13 testes). O servidor continua separado, usa identidade JWT própria incompatível com Supabase do Reader, e BattleGateway ainda aceita dados decisivos do cliente; nenhuma batalha real foi validada ou conectada. A exigência de login para leitura até de deck público é mudança de contrato do doador.

## Itens novos — importação determinística (10–11/10/2026)

**Escopo e estado:** itens 2 (experiência de importação) e 6 (loading infinito) **IMPLEMENTADOS**. Lifecycle local/remoto e matriz automatizada **VALIDADOS**; export Web **VALIDADO**; UI em navegador real e Android físico **NÃO TESTADOS**. Reader/Reflow, OCR, Auth, Sources/Search, Drive/Sync, Flashcards e Legal **NÃO ALTERADOS**, exceto a apresentação da aquisição remota em `search.tsx`, dependência direta.

**Pipeline anterior:** Biblioteca mantinha `importing=true` em torno de uma única cadeia `DocumentPicker → leitura → parser/thumbnail → persistência → reload`. Não havia operationId, fase, abort cooperativo ou proteção contra resposta antiga. Native persistia o URI temporário do picker. EPUB/PDF salvavam o livro antes de substituir capítulos sem compensação completa. DownloadManager repetia toda tentativa com backoff, inclusive após cancelamento, e callbacks tardios podiam publicar estado; falha após mover o EPUB Native não removia o destino importado. A UI remota mostrava percentual `0%` mesmo sem `Content-Length` e não apresentava as fases de importação.

**Primeira divergência / causa:** uma Promise iniciada e nunca resolvida/rejeitada mantinha o booleano local até um `finally` que não podia executar. No remoto, abort era classificado como falha comum pelo wrapper de retry e podia iniciar outra tentativa. Confiança **alta** para essas causas arquiteturais e **inconclusiva** para a API exata que pendurou em cada aparelho relatado, pois não houve reprodução física.

**Arquitetura nova:** `BookImportLifecycle` e DownloadManager atribuem `operationId`, AbortController, geração e terminal único. Eventos de geração antiga são ignorados. Fases locais: `selecting → preparing → copying → reading → validating → reading_metadata → persisting → finalizing → success|error|cancelled`; remoto: `preparing → downloading → validating → reading_metadata → persisting → finalizing → completed|failed|cancelled`. Persistência/finalização são não canceláveis; antes delas, cancelar aborta leitura/download/importador e termina a UI mesmo se a Promise nativa original não responder. Não há delay/debounce/retry novo; o timeout Web de 60 s já existente foi preservado e não é a correção causal.

```text
EPUB local: picker → URI/Blob → detectar → Native temp→imported | Web Blob → ler → validar ZIP/OPF → metadados/capítulos → persistir → Biblioteca
PDF local:  picker → URI/Blob → detectar/%PDF → Native temp→imported | Web Blob → validar → metadados/thumbnail opcional → persistir → Biblioteca
EPUB remoto: resolver URL → bytes (recebidos/total quando conhecido) → Native temp→imported | Web Blob → validar → metadados/capítulos → persistir → Biblioteca
Empacotados: registro/importação sob demanda na abertura, **NÃO ALTERADO**.
```

**Progresso e UX:** o modal local informa arquivo, formato, etapa, erro categorizado, cancelamento, sucesso, Abrir livro e Ir para Biblioteca. O detalhe remoto informa cada fase, Cancelar/Tentar novamente e conclusão. Percentual existe apenas no download com total conhecido; picker/cópia/leitura/validação/parser/metadados/persistência são indeterminados. `EXPO_PUBLIC_IMPORT_DIAGNOSTICS=1` habilita diagnóstico opt-in allowlisted com operationId, tipo/origem/fase/evento/duração/tamanho/tipo de URI/terminal, sem nome/conteúdo/tokens/credenciais/dados pessoais.

**Arquivos, Android e dados:** `content://` e `file://` são copiados, nunca tratados como caminho durável nem apagados. Native cria `books/temp` e `books/imported`, usa nome único por operação e agenda limpeza imediata mais compensatória se copy/move concluir tarde. Web remove Blob salvo quando o import falha. Falha de capítulos restaura livro anterior ou aplica soft-delete no novo; PDF também remove o Blob parcial. PDF Reflow continua pertencendo ao Reader e não roda na importação. Reimportação deliberada permanece permitida, com ID/caminho novo em cada operação e sem deduplicação agressiva.

**Validação:** `npm run test:import` PASS: EPUB/PDF pequeno/grande, `file://`/`content://`, inválido, extensão errada, cancelamento inicial/no meio (incluindo copy pendente), duplicado, nova importação após erro/cancelamento, rollback, download com progresso real/indeterminado, cancelamento sem retry, stale generation e cleanup Native. `npm run typecheck`, `node scripts/test-catalogs.cjs`, `npm run export:web` (2336 módulos) e `git diff --check` PASS. Testes usam fronteiras controladas/mocks onde indicado; export não comprova interação. **PENDENTE / NÃO TESTADO:** Chrome interativo desta UI, IndexedDB por esta matriz específica, SAF/SQLite/armazenamento/arquivo grande em Android real, pouco espaço, interrupção de processo e reprodução no celular afetado.
