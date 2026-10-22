# Contexto da Landing Page do Aldus Reader

Este documento descreve somente a landing page pública do Aldus Reader. Ele não substitui `PROJECT_CONTEXT.md` e não documenta Reader autenticado, Supabase, SaaS, Admin, Android ou operações de usuários.

## Estado atual

- Branch de desenvolvimento: `main`.
- Base conferida em 22/10/2026: `6c8e80b28326b2d27628269f77dfc18020fe3021`, alinhada a `origin/main` antes da revisão.
- Implementação principal: `src/marketing/LandingDocument.tsx`.
- Página Web: `src/marketing/LandingPage.web.tsx`.
- Estilos: `src/marketing/landingStyles.ts`.
- SEO e URL pública: `src/marketing/seo.ts`.
- Entrada Web: `app/index.web.tsx`.
- História visual do livro: `src/marketing/ScrollBookStory.tsx` e `src/marketing/cinematic/`.

## Proposta e conteúdo

A landing apresenta o Aldus como um espaço pessoal para leitura, organização e estudo. A leitura local é o ponto de entrada. O conteúdo atual cobre:

- Leitura EPUB e PDF;
- Importação local;
- Organização e progresso;
- Notas, grifos e flashcards;
- Sincronização e armazenamento privado, descritos como serviços em ativação e sujeitos à franquia;
- Comunidade e batalhas apresentadas como evolução em desenvolvimento/homologação;
- Planos Free e Pro vindos do catálogo confiável, sem preço Pro inventado;
- Perguntas frequentes sobre leitura offline, limites e disponibilidade.

Os textos devem permanecer em português brasileiro e não podem prometer contratação, pagamento, sincronização remota ou recurso premium ainda indisponível. A landing não consulta bibliotecas privadas nem exibe dados de contas.

## Livro 3D e rolagem

`ScrollBookStory` é uma experiência de rolagem com um único livro tridimensional. A rolagem usa a região real da landing, não presume `window.scrollY`. O progresso controla a pose do livro e as cenas de biblioteca, Reader, estudo e plano.

O caminho cinematográfico utiliza Three.js de forma lazy no Web, com fallback estático para ausência de WebGL, contexto perdido, redução de movimento, `saveData` ou limitações de desempenho. A cena possui orçamento adaptativo de DPR, sombras e pontos de partículas. A animação deve permanecer reversível: rolar para baixo avança, rolar para cima retorna e parar mantém a pose.

Não substituir a cena por uma imagem, GIF ou vídeo. Não criar livros paralelos para representar etapas. Alterações na composição devem manter uma única geometria, proporções físicas, lombada, páginas, profundidade e perspectiva.

## Acessibilidade e comportamento

- Existe link para pular ao conteúdo.
- Navegação de desktop e menu móvel usam âncoras para Recursos, Como funciona, Planos e Perguntas frequentes.
- O menu móvel fecha após navegação; `Escape` fecha o menu e devolve o foco ao resumo.
- `prefers-reduced-motion` desativa animações e revela o conteúdo sem depender de movimento.
- O conteúdo deve continuar navegável por teclado, com áreas de toque adequadas no mobile.
- A landing deve distinguir visitante de usuário autenticado: visitante recebe cadastro/login; usuário autenticado recebe acesso à biblioteca.

## Planos e catálogo

`LandingDocument` aceita `catalog?: CatalogPlan[]` e usa `initialCatalogReference` apenas como referência pública inicial. Limites e recursos exibidos devem vir dos contratos existentes. O Free inclui leitura local, importação e estudo básico; o Pro permanece sem contratação quando não houver gateway e preço definido.

## Validação

Testes de marketing e cinematografia ficam em `scripts/test-marketing*.cjs` e `scripts/test-cinematic-book.cjs`. A validação deve separar:

1. typecheck e export Web;
2. HTML/SEO, navegação e acessibilidade em Chromium;
3. cenas, poses, reversão e fallback WebGL;
4. desempenho com o orçamento adaptativo;
5. preview Vercel, quando solicitado.

Um preview Web ou ensaio Chromium não comprova o comportamento do aplicativo Android. Não declarar validação física sem aparelho e build correspondentes.

## Operação

Alterações da landing devem ser pequenas e isoladas. Antes de editar, verificar `git status`, preservar mudanças locais em `.gitignore`, `PROJECT_CONTEXT.md` e `BUGS_ATUAIS.md`, executar os testes de marketing e revisar o diff. Não aplicar migrations, alterar Auth, ativar pagamentos ou modificar o Reader autenticado para corrigir uma questão exclusivamente da landing.

## Pendências conhecidas

- A landing não comprova disponibilidade comercial do Pro.
- A sincronização e o armazenamento continuam descritos com a condição operacional real de ativação/franquia.
- Testes físicos Android não são parte deste contexto.
- Mudanças de domínio/canonical dependem de `EXPO_PUBLIC_SITE_URL` válido; sem ele, o build pode permanecer sem canonical público definitivo.

## Revisão de fluidez, design e renderização — 22/10/2026

Implementação: `37f0aa3` (`perf(marketing): smooth scroll poses and reduce 3D rendering overhead`).

### Comportamento

- `followBookScroll`, em `bookMotion.ts`, suaviza os saltos discretos de rolagem com resposta exponencial de 48 ms, independente da taxa de atualização, sem ultrapassar o destino. Ao convergir, aplica o progresso exato e encerra os frames de acompanhamento. Não há reprodução automática.
- A rolagem real do contêiner continua sendo a fonte do destino. Navegação explícita por etapas e mudanças de tamanho retomam a posição diretamente. Rolar no sentido contrário reverte a trajetória.
- `ScrollBookStory` agrupa leituras do layout, só muda variáveis do viewport quando necessário e espera o layout resultante antes de medir o palco. Tamanho e DPR repetidos não redimensionam o renderer.
- Pose e variáveis CSS são reutilizadas durante sondas de qualidade na mesma posição. React só recebe mudanças de capítulo/modo, sem estado atualizado por partícula ou frame.
- O observador acompanha a área sticky visível. Importações tardias não montam WebGL fora da área ou com a aba oculta; o retorno retoma a inicialização. Listeners, observers, buffers e contexto são descartados ao encerrar.

### Livro e composição

- Os 14 filetes físicos da borda usam um `InstancedMesh`; geometrias de caixas com dimensões iguais são compartilhadas. Partículas, texturas, curvatura e proporções físicas mantêm seus orçamentos.
- O mapa de sombras é reutilizado em poses repetidas e invalidado por progresso, tamanho ou qualidade. Sem sombras de mapa, o plano transparente de sombras fica oculto; a sombra de contato permanece.
- Redimensionamento de buffer e DPR é atômico e só ocorre quando necessário. O shader de papel dispensa cálculo de ruído quando não há dissolução.
- Partículas recuam nas cenas estáveis de texto, biblioteca e estudo, preservando a formação durante as transições.
- Cabeçalho em papel sólido, sem backdrop blur; fundo escuro do palco em camada de opacidade; máscara de canvas removida, com recorte de proteção do Hero preservado. Títulos, FAQ, cartões e navegação receberam ajustes editoriais; botões do livro mantêm 44 px de área mínima.
- Reveals gerais usam 440 ms e deslocamento de 14 px. Reduced motion continua desativando movimento e permite leitura do conteúdo estático.

### Validação efetiva

- Typecheck e export Web: PASS. Matriz crítica: **83/83** (antes desta revisão: 82). Após o ajuste de DPR, a regressão específica do controller foi executada novamente.
- `scripts/test-book-scroll-controller.cjs` integra `test:critical` e `test:marketing`. Exercita o componente real com DOM/RAF/import/renderer controlados: eventos passivos agrupados, pausa, reversão, assentamento, sondas sem escrita CSS, resize/DPR, etapas, aba oculta, importação tardia, reduced motion e cleanup. Não representa GPU ou aparelho físico.
- Chromium ANGLE/D3D11 Intel HD Graphics 520: **72 combinações viewport/pose** aprovadas (320–1920 px e paisagem), geometria projetada sem sobreposição de texto/CTA, menu, FAQ, teclado, rotas públicas, acesso autenticado sintético, reduced motion/no-JS, perda/falha de WebGL e descarte. Nenhuma sessão real ou escrita de conta.
- A ida por um salto de progresso 0→0,34 assentou em 23 amostras/530 ms; reversão para 0,08 em 22 amostras/367 ms nessa execução com inspeção geométrica. A espera passou a exigir o estado assentado antes de afirmar fechamento exato. Pausa não mantém loop autônomo.
- Capturas e resultado visual: `.expo/cinematic-validation`. Comparação anterior/final, JSONs, logs e capturas: `artifacts/landing-refinement` (ignorados pelo Git). A baseline preserva o export anterior da mesma landing cinematográfica; não é a landing antiga anterior ao livro 3D.

### Desempenho medido e limites

As duas rodadas de comparação usam 240 frames de ida/volta, sem builds nem outras campanhas de teste concorrentes. A segunda rodada inverte a ordem das versões. Canvas ativo em 240/240 frames, sem fallback, nas oito amostras. Viewport mobile é emulação no Windows, não Redmi físico.

| Rodada | Viewport | FPS anterior → revisão | p95 do frame anterior → revisão | TaskDuration anterior → revisão |
| --- | --- | --- | --- | --- |
| A | 1440×1000 | 58,7 → 49,1 | 16,8 → 50,0 ms | 1,30 → 3,47 s |
| A | 390×844 | 55,3 → 53,1 | 33,2 → 17,3 ms | 2,68 → 2,57 s |
| B (ordem invertida) | 1440×1000 | 56,6 → 57,5 | 17,1 → 17,5 ms | 2,65 → 3,01 s |
| B (ordem invertida) | 390×844 | 59,9 → 59,0 | 16,8 → 16,9 ms | 2,18 → 2,01 s |

- Ganho estrutural confirmado durante movimento: draw calls **41→28 desktop**, **31→17 mobile**; geometrias carregadas após percorrer cenas **33→21 desktop**, **33→20 mobile**. As sondas paradas podem ter ainda menos chamadas por reutilização de sombras; não usar esse número parado como custo da rolagem.
- O FPS e o custo de CPU variaram, e a primeira rodada desktop piorou. Não há evidência para prometer aumento universal de FPS ou redução de CPU desktop. A suavização/renderização foi validada; responsividade sob carga e outras GPUs continuam como próximos ensaios de desempenho.
- Entry + chunk 3D somaram **1.130 bytes gzip adicionais** frente à baseline. Nenhuma dependência nova. Heap JS não equivale à memória total da GPU; esta revisão não certifica ausência universal de vazamentos.
- Nenhum APK, implantação Vercel, alteração de produção ou configuração de backend foi executado nesta revisão. O preview Vercel anterior mantém sua versão. O export local está disponível para revisão sem publicar um novo ambiente remoto.

## Viradas sem partículas — 22/10/2026

- Após revisão visual do proprietário, a política anterior de partículas nas transições foi substituída: elas permanecem apenas na introdução com o livro fechado e desaparecem antes da abertura. Da abertura ao fechamento, incluindo as quatro viradas e a rolagem reversa, a opacidade é zero e o objeto `Points` não é desenhado.
- `bookMotion.ts` concentra essa regra; `BookScene.web.ts` aplica a visibilidade e expõe o estado nas métricas de validação. A câmera reserva uma pequena folga proporcional à curvatura da folha para evitar corte da borda inferior durante a virada.
- Regressões: `test-cinematic-book.cjs` verifica ausência de partículas em todo o intervalo de abertura/viradas/fechamento. `test-marketing-web.cjs` verifica a visibilidade real do renderer, as quatro poses intermediárias e **108 combinações viewport/pose** em nove tamanhos de tela, de 320 a 1920 px e paisagem.
- Validação desta correção: `test:marketing`, typecheck, export Web e Chromium ANGLE/D3D11 aprovados, incluindo pausa/reversão, enquadramento, navegação, teclado, reduced motion, ausência/falha de WebGL, rotas públicas e fixtures HTTP controladas. A matriz crítica de 83 suítes é a validação anterior; não foi repetida neste ajuste visual isolado. Nenhuma validação física Android foi realizada.
- Capturas locais: `.expo/cinematic-validation/clean-page-turn.png` e a matriz de viewports na mesma pasta. Preview local atualizado em `http://127.0.0.1:49997/`, mediante recarregamento da página. Sem publicação Vercel ou alteração de produção.
