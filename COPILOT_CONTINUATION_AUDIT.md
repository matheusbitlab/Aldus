# Auditoria do estado recebido — 2026-10-05

Mapa produzido antes das edições e consolidado nesta continuação. Foram recebidos **32 arquivos rastreados modificados**, não 24. Havia também arquivos/diretórios não rastreados. O único commit anterior é `f454d43` (Initial commit, autor registrado MatheusBorbaDev); o diff agrega várias sessões. Não é possível atribuir cada linha ao Copilot. Nenhum reset, clean, checkout de reversão ou descarte foi executado.

Os três contextos foram lidos integralmente, assim como README, documentação de fontes nele e nos contextos. Não foram encontrados documentos separados de Fontes nem AGENTS.md/instruções adicionais no repositório ou nos ancestrais consultados. Seções recentes prevaleceram.

| Arquivo rastreado recebido | Classificação inicial | Achado |
| --- | --- | --- |
| README.md | PARCIAL | Histórico e descrição de fontes divergem da UI atual. |
| app/(tabs)/_layout.tsx | CONCLUÍDA / NÃO VALIDADA | Tabs com tema global e rótulos portugueses. |
| app/(tabs)/library.tsx | CONCLUÍDA / NÃO VALIDADA | Biblioteca, importação local, filtros, ordenação, Sol/Lua. |
| app/(tabs)/search.tsx | PARCIAL | Redesign, detalhes e aquisição conectados; selector Zustand instável. |
| app/(tabs)/settings.tsx | CONCLUÍDA / NÃO VALIDADA | Cinco seções, tema, leitura, conforto e fontes. |
| app/_layout.tsx | CONCLUÍDA / NÃO VALIDADA | Providers, fontes, shell e safe-area. |
| app/index.tsx | CONCLUÍDA | Redirecionamento à Biblioteca. |
| package.json | SÓ INFRAESTRUTURA | Expo 57 e dependências nativas já recebidas. |
| package-lock.json | SÓ INFRAESTRUTURA | Lock correspondente ao workspace recebido; não atualizado nesta continuação. |
| src/data/database/migrations/MigrationRunner.ts | SÓ INFRAESTRUTURA | Cache Reflow SQLite v2. |
| src/data/downloads/DownloadManager.ts | PARCIAL | Web ligado ao importer; URL usada como nome de caminho Native, sem timeout Web. |
| src/data/downloads/StorageValidator.ts | SÓ INFRAESTRUTURA | FileSystem legacy, limite de espaço preservado. |
| src/data/epub/EpubFileImporter.ts | CONCLUÍDA / NÃO VALIDADA | Blob/IndexedDB Web e arquivos Native; importer existente reutilizado. |
| src/data/epub/EpubParserService.ts | CONCLUÍDA / NÃO VALIDADA | Recursos inline e links entre capítulos; preservado. |
| src/data/repositories/SqliteBookRepository.ts | CONCLUÍDA | Quantidade de placeholders corrigida. |
| src/data/scraping/GutenbergSearchPlugin.ts | SÓ INFRAESTRUTURA / NÃO VALIDADA | Scraper legado; não ativo na UI. |
| src/data/scraping/RobotsCacheService.ts | PARCIAL | Exceções Gutendex/Web já presentes, contrariando o achado anterior. |
| src/domain/types/reader.ts | CONCLUÍDA | Inclui Papel. |
| src/domain/types/search.ts | SÓ INFRAESTRUTURA | Metadados, status por fonte e próxima página. |
| src/domain/usecases/ImportEpubUseCase.ts | PARCIAL | IDs de capítulos derivados apenas do OPF podiam colidir entre livros. |
| src/domain/usecases/SearchBooksUseCase.ts | PARCIAL | Fontes paralelas e status; gate genérico robots para todos os plugins. |
| src/presentation/components/BottomFooter.tsx | CONCLUÍDA / NÃO VALIDADA | Página, total, navegação, safe-area. |
| src/presentation/components/ReaderControls.tsx | PARCIAL | Slot estável; cores ainda do livro, não do tema global. |
| src/presentation/components/ReaderSettingsPanel.tsx | CONCLUÍDA / NÃO VALIDADA | Papel, brilho, tipografia, anti-enjoo; e-reader é atalho Papel. |
| src/presentation/components/TopHeader.tsx | CONCLUÍDA / NÃO VALIDADA | Configurações, busca e sumário. |
| src/presentation/contexts/ReaderSettingsContext.tsx | CONCLUÍDA / NÃO VALIDADA | Preferências persistidas; tema separado do app. |
| src/presentation/screens/ReaderScreen.tsx | CONCLUÍDA / NÃO VALIDADA nesta sessão | Correções históricas, handshake, overlay, brilho; EPUB reset ainda aberto. |
| src/presentation/services/dependencies.ts | SÓ INFRAESTRUTURA | Composição por plataforma; Gutendex e download registrados. |
| src/presentation/stores/libraryStore.ts | CONCLUÍDA / NÃO VALIDADA | Catálogos locais e Biblioteca. |
| src/presentation/stores/readerStore.ts | CONCLUÍDA | Visibilidade independente da posição. |
| src/presentation/stores/searchStore.ts | PARCIAL | Seis estados, paginação Gutendex; sem proteção contra respostas obsoletas. |
| src/theme/tokens.ts | CONCLUÍDA | Paletas globais e Papel separado. |

Arquivos novos recebidos relevantes: `GutendexSearchPlugin`, `UserSourceSearchPlugin`, `BNDigitalSearchPlugin`, `UserSourceRepository`, `sourceStore`, `SourceManagerModal`, `AppThemeContext`, componentes EPUB/PDF, IndexedDB, caches Reflow, módulos motion e testes. Gutendex/Minhas Fontes eram PARCIAIS; JSON AUSENTE; motion CONECTADO, Native NÃO TESTADO. `SearchCatalogsUseCase` é infraestrutura incompleta e não usada pela UI (factory não consumida); não criamos outro caminho de busca. Artefatos `.browser-*`, logs, perfil Chrome, `.idea`, `.vscode`, `android`, `assets`, `Livros`, scripts e sondas foram preservados.

## Inventário das fontes após a continuação

| Fonte exibida | Adapter / busca | Paginação | Detalhes | Aquisição | Login | Estado |
| --- | --- | --- | --- | --- | --- | --- |
| Gutendex | API JSON real; caso de uso live PASS | `next` conectado no store | Metadados reais no modal | EPUB real; download Web depende de CORS Gutenberg | Não | IMPLEMENTADO; browser desta sessão expira, validação UI externa INCONCLUSIVA |
| Minhas Fontes / JSON | Adapter real, schema estrito, filtro local sem acentos | Catálogo estático, até 50 resultados por consulta | Metadados do JSON | EPUB pelo manager existente | Não | VALIDADO em Chrome com catálogo local e EPUB real |
| Minhas Fontes / OPDS | Adapter Atom real | Adapter extrai `next`, store ainda não pagina OPDS | Metadados Atom | EPUB | Não | PARCIAL / NÃO TESTADO live |
| Minhas Fontes / HTML | Extração legada de links EPUB | Não | Título disponível no HTML | EPUB | Não | PARCIAL / NÃO TESTADO live; sujeito a política e CORS |
| Gutenberg | Scraper legado fora da lista ativa | Não conectado | Não validado | Não validado | Não | EM BREVE |
| BNDigital | Scraper legado fora da lista ativa | Não conectado | Não validado | Não validado | Não | EM BREVE |
| BibliON / MEC | Portais em Contas; não são adapters de catálogo | Não | Não integrado | Sem importação integrada | Somente site externo | PARCIAL; WebView/contas não validados, não equivalem a login/sync do app |

## Contrato JSON V1

Aceita array ou `{ "books": [...] }`. Cada livro exige `title` e `url` HTTP/HTTPS de EPUB; opcionais `author`, `language`, `description`, `coverUrl` e `format: "epub"`. URLs relativas resolvidas contra o catálogo. Busca local em título/autor/descrição. Catálogos vazios válidos; resposta HTML/JSON malformado/schema inválido gera erro em vez de sucesso vazio. Servidores externos devem permitir CORS na Web. CRUD existente foi estendido; remover uma fonte não remove livros.

## Robots e CORS

1. Gate já existia no commit inicial; autor Git registrado não prova autoria pelo Copilot.
2. Não é necessário para consumir a API pública Gutendex ou catálogos JSON/OPDS.
3. Inicialmente SearchBooks chamava o gate para todos os plugins, mas exceções recebidas evitavam fetch em Gutendex/Web.
4. Portanto **não foi confirmado fetch cross-origin de robots no estado recebido**. Isso contradiz o último diagnóstico do Copilot.
5. CORS de robots não era o bloqueio atual de Gutendex. O arquivo real não enviou ACAO e declara `Disallow: /books/`; a exceção já o ignorava.
6. API independente: HTTP 200, 231 livros para dickens, 23 EPUBs mapeados, próxima página; com Origin de navegador, ACAO `*`.
7. Política agora explícita no plugin: `requiresRobotsPolicy` somente para scraping HTML; APIs não passam pelo gate. HTTP/HTTPS, resposta/schema, timeout/cancelamento, throttle e validação EPUB são os controles aplicáveis. Nenhum proxy ou `no-cors` introduzido.

Referências primárias: [RFC 9309](https://www.rfc-editor.org/rfc/rfc9309.html) (robots não constitui autorização) e [Gutendex](https://gutendex.com/) (contrato público da API).

Download real de `https://www.gutenberg.org/ebooks/98.epub3.images`: 302 para EPUB de 7.923.060 bytes, HTTP 200, sem ACAO. CORS da aquisição é independente de CORS da API. O fallback Web permite salvar no navegador e importar manualmente. Não declarar download automático Gutendex Web aprovado.
