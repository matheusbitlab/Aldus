# Prompts de revisão do Kindle Reader

## Prompt 1 — Revisão de design, fluidez e usabilidade

Leia o `PROJECT_CONTEXT.md`, os dossiês de bugs e todo o código do Kindle Reader. Faça uma revisão completa do design e da experiência de uso para deixar o app visualmente consistente, fluido, leve e fácil de usar.

Analise biblioteca, busca, detalhes do livro, leitor EPUB, PDF Original, PDF Reflow, controles, menus, configurações, anotações, flashcards e telas de erro.

Verifique:

- Hierarquia visual, espaçamentos, tipografia, contraste, cores, ícones e consistência entre telas.
- Clareza dos botões, estados de carregamento, vazio, erro, sucesso, cancelamento e processamento.
- Uso com uma mão, áreas de toque, gestos, acessibilidade, teclado, safe area e rotação.
- Feedback visual sem travar a leitura ou ocultar o conteúdo.
- Transições, abertura e fechamento dos controles, menus e modais.
- Re-renderizações desnecessárias, remounts, mudanças de layout e qualquer alteração que possa resetar a página ou o progresso.
- Desempenho percebido: abertura rápida, carregamento progressivo, placeholders e ausência de telas congeladas.
- Adaptação para livros empacotados e para todos os EPUBs/PDFs importados pelo usuário, incluindo livros grandes, escaneados, com imagens, tabelas, colunas, páginas duplas, capítulos incomuns e metadados incompletos.
- Coerência visual entre Web, Android e demais plataformas disponíveis.

Preserve o conteúdo e a posição de leitura ao abrir configurações, mostrar controles, alternar tema, ajustar fonte, trocar modo PDF ou voltar de uma anotação/flashcard.

Faça as melhorias diretamente no código quando houver segurança para isso. Não reduza funcionalidades para esconder problemas. Priorize as correções que melhoram a experiência geral e registre as decisões.

Valide com navegação real em EPUB/PDF, livros empacotados e arquivos adicionados pelo usuário. Teste abertura, leitura, navegação, retorno à posição, busca, sumário, controles, configurações, erros e rotação.

Execute apenas scripts existentes no projeto. Informe arquivos alterados, problemas encontrados, testes executados, pendências e limitações por plataforma.

Antes de qualquer alteração que exija recompilar e reinstalar o Android, avise claramente:
“Esta alteração exige recompilar e reinstalar o aplicativo no Android. Atualizar pelo Metro/Fast Refresh não será suficiente.”
Explique o motivo e forneça os comandos corretos.

## Prompt 2 — Revisão e correção do backend

Leia o `PROJECT_CONTEXT.md`, os códigos do Kindle Reader e os códigos dos serviços de backend relacionados a livros, usuários, sincronização, flashcards, geração por IA e batalhas.

Faça uma auditoria estrutural completa do backend e corrija falhas encontradas. Analise módulos, controllers, services, DTOs, validações, Prisma, migrations, filas, Redis, autenticação, armazenamento, logs, tratamento de erros, tarefas assíncronas e comunicação em tempo real.

A revisão deve garantir que as funções funcionem para:

- Livros empacotados no aplicativo.
- EPUBs e PDFs importados pelo usuário.
- Arquivos grandes, escaneados, com imagens, tabelas, colunas, páginas duplas e metadados incompletos.
- Mais de um livro, edição ou usuário ao mesmo tempo.
- Web, Android e demais clientes que utilizem a API.

Verifique especialmente:

- IDs estáveis para livros, edições, capítulos, trechos, cartões, revisões e partidas.
- Separação entre arquivo original, texto extraído, Reflow, OCR, cache, progresso, anotações e flashcards.
- Persistência correta para livros locais e importados pelo usuário.
- Idempotência em importação, processamento, geração de flashcards, revisões, sincronização e respostas de batalha.
- Retentativas sem duplicar dados ou cobrar/processar duas vezes.
- Transações, constraints, índices, paginação e consultas que possam ficar lentas ou inconsistentes.
- Filas e workers com progresso, cancelamento, retomada e recuperação de falhas.
- Tratamento de arquivos inválidos, extração corrompida, timeout, indisponibilidade do provedor e reconexão.
- Compatibilidade entre versões de migrations e dados já existentes.
- Contratos tipados e mensagens de erro úteis para o cliente.
- WebSockets com estado oficial da partida, desconexão, reconexão, timeout e encerramento único.
- Controle de propriedade: um usuário não pode consultar, alterar ou compartilhar livros, notas, cartões, históricos ou partidas de outro usuário.
- Compatibilidade do backend com livros que não possuem origem remota e com arquivos adicionados somente localmente.

Não faça reset do banco, não apague dados existentes e não substitua migrations já aplicadas. Crie migrations novas somente quando necessário e documente a compatibilidade.

Valide com testes unitários, integração e execução local dos serviços disponíveis. Teste pelo menos dois usuários, dois dispositivos/sessões, livros empacotados, livros importados, arquivos inválidos, reprocessamento, cancelamento, offline/online, conflitos e batalhas com desconexão.

Registre a arquitetura encontrada, falhas corrigidas, migrations, variáveis necessárias, comandos, testes aprovados e bloqueios externos. Não declare uma função pronta somente porque o endpoint ou a tela existe.

Antes de qualquer alteração que exija recompilar e reinstalar o Android, avise claramente:
“Esta alteração exige recompilar e reinstalar o aplicativo no Android. Atualizar pelo Metro/Fast Refresh não será suficiente.”
Explique o motivo e forneça os comandos corretos.

## Prompt 3 — Revisão de segurança

Faça uma auditoria de segurança completa no Kindle Reader, no backend, no banco, nas filas, no armazenamento de livros e na comunicação WebSocket.

Leia a estrutura real do projeto antes de modificar qualquer coisa. Procure brechas no cliente Web/Native, na API, na autenticação, na autorização, nos arquivos enviados e baixados, na geração por IA, nos flashcards, na sincronização e nas batalhas.

Verifique e corrija:

- Exposição de JWT secrets, chaves de IA, senhas, tokens, URLs privadas e credenciais no código, bundle Web, logs ou arquivos versionados.
- Uso correto de variáveis públicas do Expo: somente valores realmente públicos devem chegar ao cliente.
- Armazenamento, expiração, renovação e revogação de tokens.
- Autorização por usuário e por recurso em todos os endpoints, queries, uploads, downloads, sockets e eventos.
- Isolamento entre usuários, livros locais/importados, decks, cartões, anotações, progresso, histórico e partidas.
- Validação de tipo, tamanho, extensão, conteúdo e origem de EPUB/PDF, imagens, arquivos de importação e anexos.
- Path traversal, acesso a arquivos fora do diretório permitido, nomes maliciosos e arquivos compactados perigosos.
- XSS, HTML/iframe inseguro, scripts dentro de EPUB, conteúdo ativo, links externos e sanitização de texto renderizado.
- Injeção em Prisma/SQL, filtros, buscas, comandos, templates e prompts enviados a provedores de IA.
- Rate limiting, limites de upload, limites de processamento, abuso de OCR/IA, filas e criação de contas.
- Vazamento de dados em mensagens de erro, stack traces, logs, métricas e respostas da API.
- CORS, headers, cookies, transporte seguro e validação da origem dos sockets.
- Manipulação de respostas em batalhas: o cliente não pode definir acerto, pontuação, tempo oficial ou resultado.
- Replay, duplicação de eventos, alteração de IDs, enumeração de recursos e acesso após logout.
- Backups, migrations, volumes locais e dados sensíveis do PostgreSQL/Redis.
- Privacidade de livros pessoais e dos cartões gerados a partir deles.

Corrija os problemas com a menor alteração segura e sem remover funcionalidades importantes. Não apenas esconda alertas do scanner; confirme a causa e o comportamento corrigido.

Crie ou atualize testes de autorização, isolamento entre usuários, validação de arquivos, expiração de sessão, WebSocket, idempotência e limites. Use ferramentas de auditoria disponíveis no projeto e registre falsos positivos que tenham sido analisados.

Revise todas as funções para livros empacotados e também para EPUBs/PDFs adicionados pelo usuário. O tratamento de segurança não pode funcionar somente para o catálogo interno.

Informe riscos críticos, altos, médios e baixos, correções aplicadas, riscos pendentes e qualquer ação operacional necessária. Nunca imprima segredos nos logs ou no relatório.

Avise antes de mudanças que exigirem recompilar e reinstalar o Android, usando exatamente:
“Esta alteração exige recompilar e reinstalar o aplicativo no Android. Atualizar pelo Metro/Fast Refresh não será suficiente.”
Explique o motivo e informe os comandos.

## Prompt 4 — Revisão e otimização de desempenho

Faça uma auditoria de desempenho de ponta a ponta no Kindle Reader e nos serviços relacionados. Busque maneiras de deixar o app mais rápido, leve, estável e econômico em memória, armazenamento, rede, bateria e processamento.

Meça antes de otimizar e compare depois. Não faça otimizações especulativas que possam prejudicar a posição de leitura, a seleção, as anotações, os flashcards ou a qualidade do conteúdo.

Analise:

- Tempo de abertura da biblioteca e do primeiro livro.
- Fetch, download, validação, descompactação, extração, OCR, geração do Reflow, persistência, criação do iframe e primeira renderização.
- PDFs grandes, EPUBs com muitos capítulos, imagens, tabelas, colunas, páginas duplas e arquivos escaneados.
- Livros empacotados e todos os livros importados pelo usuário.
- Uso de memória, tamanho de blobs, IndexedDB/SQLite, cache, arquivos temporários e armazenamento duplicado.
- Re-renderizações, remounts, efeitos, listeners, ResizeObserver, paginação e atualizações de estado.
- Rolagem, troca de página, zoom, rotação, seleção, abertura dos controles e alteração de tema/fonte.
- Busca, sumário, biblioteca grande, capas e carregamento de metadados.
- Rede, prefetch, concorrência, retries, compressão, paginação da API e sincronização.
- Filas, Redis, workers, consultas Prisma, índices, N+1, payloads e tempo das rotas.
- Socket.IO, número de listeners, reconexão, eventos duplicados e consumo em batalhas.
- Processamento de IA/OCR, cache de resultados, cancelamento e retomada.
- Impacto de notificações, timers, reprodução de áudio e tarefas em segundo plano.

Priorize:

- Lazy loading e carregamento progressivo.
- Cache seguro por edição e invalidação correta.
- Processamento por capítulos/páginas/blocos.
- Cancelamento real e retomada.
- Limites de concorrência e backpressure.
- Memoização somente quando reduzir trabalho medido.
- Redução de payloads, consultas e renders.
- Persistência incremental sem corromper dados.
- Liberação de blobs, listeners, workers e recursos nativos.
- Feedback imediato ao usuário enquanto o processamento continua.

A otimização deve funcionar para qualquer livro compatível, inclusive arquivos adicionados pelo usuário, sem assumir nomes, número de capítulos, idioma, tamanho ou qualidade de extração.

Crie uma matriz simples com métrica antes, causa, mudança, métrica depois e risco. Valide em Web e Android quando disponíveis, usando pelo menos um EPUB pequeno, um EPUB grande, um PDF textual, um PDF com páginas duplas, um PDF escaneado e um arquivo importado pelo usuário.

Não considere passar no typecheck ou no build como prova de desempenho. Registre os testes reais, os ganhos medidos, regressões, limites e pendências.

Se alguma otimização exigir dependência nativa, alteração de configuração nativa ou recompilação, avise antes:
“Esta alteração exige recompilar e reinstalar o aplicativo no Android. Atualizar pelo Metro/Fast Refresh não será suficiente.”
Forneça o motivo e os comandos adequados.
