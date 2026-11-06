# Requisitos (ChatGPT/Codex) × código atual — Flashcards, Batalha e geração por livro

> Escrito em 06/11/2026. Fontes: `CONTEXTO_FLASHCARDS.md` e `CONTEXTO_FLASHCARDS_ESTUDO.md` (recuperáveis com
> `git show 7f50a90^:<arquivo>` e em `~/Downloads`), handoffs em esta pasta, e o código. **Especificação ≠ funcionalidade
> concluída**: cada linha traz o rótulo REQUISITO / PROPOSTA e o estado real confirmado no código. Contrato técnico já
> consolidado: [community-estudo.md](../community-estudo.md) §12.

## 1. Flashcards e estudo individual

| Requisito/Proposta | Estado no código (06/11/2026) | Evidência |
| --- | --- | --- |
| REQUISITO: termos "deck/decks/flashcard/flashcards" na UI | IMPLEMENTADO | `app/decks/[deckId].tsx`, `app/(tabs)/study.tsx` |
| REQUISITO: editor (deck, título, afirmação, V/F explícito, explicação, imagem/desenho opcionais), frente sem gabarito, rascunho preservado em falha | IMPLEMENTADO | `components/flashcards/FlashcardCreateModal.tsx`, `FlashcardCardView.tsx`, `FlashcardFlip.tsx`; `test-flashcard-ui.cjs` |
| REQUISITO: 4 respostas XX / X / ✓ / ✓✓ (julgamento × confiança), mesma regra em estudo e batalha | IMPLEMENTADO | `src/domain/study/flashcardScoring.ts`, `FlashcardConfidenceControls.tsx`; `test-flashcard-scoring.cjs` |
| PROPOSTA (valores ajustáveis): +10/+5/−5/−10 | **Adotada no código** (`correctHigh 10, correctLow 5, penaltyHigh −10, penaltyLow −5`); o texto do usuário a chamava de "proposta inicial". Mudar exige decisão do usuário e versionar a regra. | `flashcardScoring.ts` L17-20 |
| REQUISITO: sessão com resumo (pontos/acertos/erros/explicações), retomada sem reiniciar | IMPLEMENTADO | `FlashcardSessionView.tsx`, `flashcardStorage.*`; `test-flashcard-sessions.cjs`, `test-flashcard-storage.cjs` |
| EVOLUÇÃO citada: repetição espaçada | SM-2 simples existe e é separado do placar | `src/domain/study/flashcardSrs.ts` |
| EM ABERTO (spec): forma da ferramenta de desenho; Anki; sync de cartões/revisões | desenho local básico existe; Anki e sync de cartões **não** existem | community-estudo.md §12 |

Todas essas suítes estão no `test:critical` (87/87 em 06/11). Nenhuma foi exercitada em aparelho físico.

## 2. Batalha entre usuários reais

| Requisito | Estado | Evidência |
| --- | --- | --- |
| REQUISITO: usuários reais, validação autoritativa no backend, gabarito oculto até resposta aceita, snapshot estável, sem transferir propriedade, resposta repetida não pontua 2×, N = 3/5/10/15 | IMPLEMENTADO no código e em PostgreSQL/PGlite local; **sem** duas sessões Supabase reais | `supabase/migrations/202610090001_flashcard_battles.sql` (schema `flashcard_private`: decks, scoring_rules, matches, members, queue, items; RPC `public.flashcard_battle(action,payload)`), `src/data/remote/FlashcardBattleRepository.ts`, `src/domain/study/flashcardBattle.ts` (`BATTLE_COUNTS`), `app/battle.tsx`; `test-flashcard-battles.cjs`, `test-battle-account.cjs` |
| PROPOSTA: maior pontuação vence, empate por igualdade; ritmo individual; sem derrota por desconexão | Adotada conforme community-estudo.md §12 | idem |
| EM ABERTO (spec): abandono/expiração/desconexão | Decisão registrada: **sem** derrota automática | community-estudo.md §12 |
| Deploy remoto | Usuário informou `20261015144958=flashcard_battles`; **não verificável pelo código** | `docs/context/historico/` |

## 3. Geração de flashcards a partir de livros (`CONTEXTO_FLASHCARDS_ESTUDO.md`)

PROPOSTA (não aprovada como roadmap fechado; preços/cotas não definidos). Estado real: **PARCIAL**.

- Existe **apenas** geração local determinística: `src/domain/study/flashcardGeneration.ts` (`generateLocalFlashcardCandidates`,
  usada em `app/(tabs)/study.tsx`) pega frases ≥60 caracteres e cria candidatos com pergunta **fixa** ("Qual é a ideia principal
  deste trecho de …?") e resposta = trecho, com origem `book-chapter`. Não é IA e não promete ser.
- ATENÇÃO: o requisito diz "Não apresente perguntas fixas ou dados fictícios como geração funcional". Mantenha a UI honesta
  (rascunho editável, sem rótulo de IA) e não a venda como o recurso do handoff.
- NÃO existe: serviço de IA, escolha de abrangência (capítulos/grifos/lido/livro inteiro), estimativa de consumo/franquia,
  fila de novos cartões com controle por sessão, volta ao trecho de origem no Reader, exportação Anki, sync.

Regras de privacidade a preservar em qualquer implementação futura (REQUISITO do usuário, também em AGENTS.md):
1. Importar o livro **não** autoriza enviar conteúdo a serviço de IA; exigir ação explícita, antes do envio.
2. Informar o que será processado, se é serviço online e o consumo estimado; permitir cancelar.
3. Prévia editável (editar/descartar/aprovar); cada cartão com origem verificável (PDF: página original; EPUB: capítulo +
   trecho/contexto; Reflow: página do PDF original, não a dinâmica). Não inventar página/citação.
4. PDF escaneado → exige OCR (não presumir); texto corrompido → interromper aquela parte.
5. Credenciais de provedor só no servidor (Edge Function), nunca no app/bundle Web; cobrança só com benefício real
   (`src/domain/saas`, `supabase/migrations/20261015190705_saas_plans_entitlements.sql`).
6. Reaproveitar `AccountBookRepository`/escopo de conta e a persistência de flashcards por conta; não criar Sync paralelo.

## 4. Itens dos handoffs sem contrapartida

- **Modo Viagem**: nenhum símbolo `travel/viagem` no código e `Prompt_Codex_Modo_Viagem.md` não foi encontrado (repo, Git, home).
  Relacionados existentes: brilho (Web: luminosidade; Native: `expo-brightness`, `ReaderScreen.tsx` L582/L640+) e `motionCues`
  (experimental, manual, desligado por padrão; `useMotionCues.ts`, `MotionCuesOverlay.tsx`; eficácia anti-enjoo não demonstrada).
  Classificação: **DESCONHECIDO** para "Modo Viagem" como feature nomeada.
- **Fontes de livros** (`PROPOSTA_FONTES_DE_LIVROS.md`, `Pesquisa_Apps_Leitura_2026-10-05.md`): ausentes. `PROMPT_COPILOT_FONTES_DE_LIVROS.md`
  existe só em `~/Downloads`. O que está implementado vive em [sources-drive.md](../sources-drive.md) e `src/data/sources/`.
- **Social estilo Skoob**: ideia; ver community-estudo.md §13 (Community remoto não existe).
