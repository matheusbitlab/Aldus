# Contexto da Landing Page do Aldus Reader

Este documento descreve somente a landing page pública do Aldus Reader. Ele não substitui `PROJECT_CONTEXT.md` e não documenta Reader autenticado, Supabase, SaaS, Admin, Android ou operações de usuários.

## Estado atual

- Branch de desenvolvimento: `main`.
- HEAD registrado durante esta atualização: `1019cb72ec8520fef3cec4322202e86c6ea82b58`.
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
