# Integração Flashcards ↔ Kindle Reader — auditoria e etapas

Atualizado em 2026-10-06. O Kindle Reader permanece o aplicativo principal. Esta integração começou pela camada local; o serviço online doador continua separado até que seus contratos sejam corrigidos e um ambiente real seja disponibilizado.

## Inventário dos dois projetos

| Área | Flashcards (`C:\Flashcards`) | Kindle Reader (`C:\KIndle`) | Decisão |
|---|---|---|---|
| Runtime | Expo `^57.0.21`, React Native `0.86.3`, React `19.2.3`, Router `~57.0.20`, Zustand 4, NativeWind 2 | Expo `~57.0.25`, React Native `0.86.3`, React `19.2.3`, Router `~57.0.23`, Zustand 5, NativeWind 4 | Não substituir manifests nem estilos do Reader |
| Mobile | Rotas independentes, dados de demonstração em decks/estudo/batalha, Socket.IO cliente não presente nas telas | Tabs Biblioteca/Buscar/Ajustes, Reader EPUB/PDF e persistência local Web/SQLite/AsyncStorage | Integrar novas rotas no Router do Reader |
| SRS | SM-2 em `useStudyStore` e `StudyService`, ratings 1–4 na UI / 0–5 no cálculo | Não existia núcleo de cartões | Núcleo puro local com adaptação explícita 1–4 → qualidade SM-2 |
| Backend | NestJS 10, Prisma 5/PostgreSQL, JWT, Socket.IO, Gemini opcional | Sem backend online | Manter separado; cliente não importa Prisma/segredos |
| Dados | Deck/Card/StudySession/CardReview/Battle no Prisma | Livros/capítulos, progresso, marcadores/grifos e AsyncStorage | Cartões locais usam AsyncStorage V1 até schema online ser definido |
| IA | Gemini com fallback sintético, salva automaticamente e publica deck | Nenhum gerador | Primeira etapa usa geração local baseada em capítulos, com prévia/aprovação; não chama IA |

## Auditoria do código doador

- `apps/mobile/app/(tabs)/decks.tsx` começa com três decks estáticos e o botão “Gerar com IA” usa `setTimeout`; não é fluxo real de API.
- `apps/mobile/app/study/[deckId].tsx` estuda `SAMPLE_STUDY_CARDS`; não carrega o deck pelo ID nem persiste avaliações no servidor.
- `apps/mobile/app/battle/arena/[battleId].tsx` usa cartas/jogadores locais e regras simuladas; não é batalha real.
- `apps/server/src/ai-deck/ai-deck.service.ts` chama Gemini somente se há chave, mas cria o deck diretamente; sem prévia, cancelamento, fila, retomada, validação semântica, referências ao livro ou deduplicação por geração.
- `apps/server/src/battle/battle.gateway.ts` recebe `isCorrect` do cliente. Isso não pode validar ranking: o servidor não calcula gabarito da rodada, não autentica o socket, não implementa recuperação de estado e apenas remove fila no disconnect.
- `apps/server/prisma/schema.prisma` tem modelos básicos, mas não há `prisma/migrations` no projeto. PostgreSQL/Redis são definidos no Docker, sem prova de execução, dados existentes ou worker Redis.
- Auth usa fallback de segredo literal (`super-secret-flashcards-jwt-key`) quando `JWT_SECRET` falta; isso é bloqueio de implantação, não contrato seguro.
- Testes do doador: `npm run build:server` PASS; `npm run test:server -- --runInBand` e `npm run test:mobile -- --runInBand` iniciaram Jest mas permaneceram sem conclusão e foram interrompidos. O comando `npm test` raiz não existe. Isso não é aprovação dos testes do doador.

## Entrega local concluída nesta etapa

Produção adicionada ao Reader:

- `src/domain/types/flashcards.ts`: contratos V1 para deck, cartão, fonte do livro, status de aprovação e eventos de revisão.
- `src/domain/study/flashcardSrs.ts`: SM-2 puro e testável, ratings da UI `Errei/Difícil/Bom/Fácil`, cartões vencidos e dificuldades.
- `src/domain/study/flashcardGeneration.ts`: geração local determinística por texto real de capítulos, sempre como candidatos editáveis; não representa IA.
- `src/domain/repositories/FlashcardRepository.ts` e `src/data/local/FlashcardRepository.ts`: persistência AsyncStorage `@kindle/flashcards.v1`, fila serializada, IDs estáveis, revisão idempotente por evento e preservação de dados ao alterar o livro.
- `app/(tabs)/study.tsx`: aba Estudo no shell principal; criação de deck, seleção de livro, geração de prévia, descarte e aprovação.
- `app/study/[deckId].tsx`: sessão local com revelar resposta e ratings SRS; funciona sem login/rede.
- `src/presentation/components/StudyHighlightsPanel.tsx`: ação “Criar flashcard” para grifo EPUB recuperável, mantendo capítulo/quote/contexto como origem.
- `app/(tabs)/_layout.tsx`: rota Estudo adicionada sem trocar a navegação da Biblioteca ou Reader.
- `scripts/test-flashcards.cjs`: testa SM-2, reset após erro, geração por capítulo e referência de origem.

## Validação desta etapa

- `node scripts/test-flashcards.cjs`: PASS (SM-2, geração por capítulo, origem, AsyncStorage mock e evento de revisão idempotente).
- Smoke Web em contexto Chrome isolado: aba Estudo, criação de baralho local, persistência e abertura da prévia de geração: PASS (`.expo/flashcards-local-smoke-20261006.json`).
- `npm.cmd run typecheck`: PASS.
- `npm.cmd run export:web`: PASS, bundle com 2260 módulos.
- `git diff --check`: PASS antes desta integração; executar novamente no fechamento.
- Regressoes anteriores do Reader/EPUB/PDF/organização permanecem documentadas nos artefatos e contextos de 2026-10-06; não foram refatoradas.

## Limitações e próximos blocos

- A geração local não é IA, não processa PDF Reflow/Original como fonte textual específica e não envia conteúdo para rede.
- “Abrir origem” exato a partir do cartão ainda precisa chamar a navegação de âncora do Reader; o cartão preserva `bookId/chapterId/quote/prefix/suffix` para essa próxima etapa.
- Edição/exclusão de cartões e exportação Anki ainda precisam de UI local dedicada; o repositório suporta atualização/remoção.
- Sincronização de cartões/revisões ainda não integrada. O backend doador exige auditoria de JWT, migrations, propriedade, idempotência e contrato de API antes de ser usado.
- Batalhas reais ainda não integradas. O gateway atual não é aceitável para ranking porque o cliente informa `isCorrect`; é necessário formato objetivo com gabarito no servidor, autenticação do socket, idempotency key, timeout oficial, reconexão/estado e persistência única.
- Flashcards gerados de livros ficam privados localmente por padrão. Nenhum livro é publicado ou enviado automaticamente.
- Android físico não está conectado (`adb devices` sem device). Esta etapa usa apenas TypeScript/JavaScript, AsyncStorage e componentes já instalados: não exige recompilar/reinstalar APK.

## Bloqueios específicos

1. Ambiente PostgreSQL/Redis/worker e migrations do doador não comprovados.
2. Credenciais Gemini, API pública e política de custos ausentes.
3. Contrato Socket.IO atual permite resultado de batalha controlado pelo cliente.
4. Não há identidade online no Kindle Reader; login e troca de conta precisam ser desenhados sem misturar dados locais.
5. Android físico ausente para validar Native, safe area, origem no Reader e Socket.IO no telefone.

## Cliente remoto Supabase preparado — 2026-10-06

- `@supabase/supabase-js` já estava instalado em `2.117.2` no `package.json`/lockfile; não foi executado um `npm install` redundante.
- `.env.local` foi criado com a URL e a chave publishable fornecidas e passou a ser ignorado por `.gitignore` (`.env*.local`). A chave não é copiada para código-fonte.
- `src/data/remote/supabase.ts` fornece o cliente com `AsyncStorage`, `persistSession`, `autoRefreshToken` e `detectSessionInUrl: false`. O cliente é opcional (`isSupabaseConfigured`/`requireSupabase`) para preservar o funcionamento offline quando um ambiente não fornecer variáveis.
- O exemplo de `App.tsx` com tabela `todos` não foi aplicado: o Kindle usa Expo Router e o Reader continua o aplicativo principal. Nenhuma tabela, autenticação, sincronização ou batalha foi declarada como concluída sem contrato de dados.
- Validação após a configuração: `npm.cmd ls @supabase/supabase-js --depth=0`, `npm.cmd run typecheck` e `npm.cmd run export:web` PASS. O export confirmou carregamento de `.env.local` e bundle Web com 2260 módulos.
- A configuração é somente JavaScript/TypeScript e usa dependências Native já presentes; não exige recompilar/reinstalar Android. Qualquer dependência Native futura será anunciada antes.
