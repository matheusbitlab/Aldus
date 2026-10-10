# Fontes e aquisições — 09/10/2026

Flashcards NÃO ALTERADOS / fora do escopo. Este documento distingue adaptação local, consulta remota e aquisição no APK.

| Fonte/tipo | Antes desta fase | Agora | Limite real |
|---|---|---|---|
| Gutendex | FUNCIONAL nas consultas físicas registradas | Preservado, API JSON e aquisições EPUB | Rede/CORS e disponibilidade do catálogo |
| JSON cadastrado | PARCIAL, filtro literal | FUNCIONAL em HTTP local e CRUD controlados | Precisa catálogo real cadastrado; aceita lista ou books, links EPUB HTTP/HTTPS |
| OPDS cadastrado | PARCIAL, MIME/navegação/erros limitados | IMPLEMENTADO parser validado, aquisições explícitas e entradas parciais | Fonte real deve fornecer feed; não tratar HTML de erro como catálogo vazio |
| HTML cadastrado | PARCIAL | Preservado para páginas autorizadas com links EPUB reais | Não é crawler universal; robots respeitado, sites dinâmicos/detalhes não são aquisições |
| Gutenberg direto | PLACEHOLDER na UI; parser HTML QUEBRADO/inativo | IMPLEMENTADO via OPDS oficial, consulta e resolução de aquisição VALIDADO FUNCIONALMENTE na rede | Contato público do aplicativo obrigatório; configurado com o contato autorizado pelo usuário. APK desta fase ainda PENDENTE |
| BNDigital | PLACEHOLDER na UI; rota presumida/parser incompleto | BLOQUEADO / NÃO VIÁVEL NO MODELO ATUAL | Portal retornou HTTP 403; consulta/acervo/DocReader não forneceu aquisição EPUB/PDF validada nesta avaliação. Sem bypass/scrape especulativo |
| webview legado | NÃO IMPLEMENTADA como catálogo | Erro explícito por fonte | Página de leitura não equivale a aquisição de arquivo importável |

Gutenberg: endpoint real `https://www.gutenberg.org/ebooks/search.opds/?query=machado` respondeu 200 application/atom+xml, 23 registros de livros no teste do caso. Categorias Authors/Subjects descartadas. Registro `/ebooks/55752.opds` respondeu 200 e ofereceu `https://www.gutenberg.org/ebooks/55752.epub.noimages`, título Dom Casmurro/autor Machado de Assis. Uma requisição por página pesquisada; sem hidratar todos os registros. Aquisição é resolvida somente no botão Baixar e adicionar, com AbortSignal e erro visível. Sem aquisição inventada a partir do ID. OPDS parcial mostra formato ainda desconhecido até obter o link real.

Contato em EXPO_PUBLIC_CATALOG_CONTACT, User-Agent AldusReader/1.0 com contato; não publicar valores de sessão/credenciais. Política oficial permite OPDS com contato e volume de navegação humana: [termos](https://www.gutenberg.org/policy/terms_of_use.html), [catálogos/feed oficial](https://www.gutenberg.org/ebooks/offline_catalogs.html). XML OPDS está anunciado para transição em 2027; não afirmar suporte futuro ao OPDS2 ainda restrito a testes. Scraping geral não autorizado: [acesso automatizado](https://www.gutenberg.org/policy/robot_access.html).

BNDigital: [portal](https://bndigital.bn.gov.br/), [orientação oficial de busca/reutilização](https://bndigital.bn.gov.br/perguntas-e-respostas/). Não anunciar como Em breve sem causa; UI identifica indisponibilidade e explica o bloqueio observado. Fontes bndigital/webview legadas não passam silenciosamente pelo parser de HTML e não bloqueiam outras fontes ativas.

Semântica: fonte específica consulta somente aquela; Todos reúne built-ins ativos e fontes cadastradas ativas; Minhas Fontes reúne somente cadastradas. Loading/success/empty/error/cancelled por fonte; resultados parciais publicados à medida que terminam. Cancelamento/stale e prazo de rede existente preservados; nenhuma nova variante infinita/retry.

Testes: test-source-integrations offline PASS (estrutura oficial, aquisição explícita, MIME, User-Agent, next, erros de XML/HTML, cancelamento, HTML relativo, bloqueio BN); --live PASS com consulta real + resolução de aquisição Gutenberg. test-search-pipeline PASS (histórico separado, parciais, deadlines/body, isolamento/abort/stale, HTTP JSON/503); testes de catálogo/download/importação e retorno físico serão registrados no checkpoint canônico quando terminarem.
