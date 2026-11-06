---
name: aldus-study-flashcards
description: "Trabalhar em estudo, decks, Flashcards, SRS ou Battle do Aldus, preservando regras de pontuação, persistência por conta, sessões retomáveis e gabarito privado. Não expande auditorias de Reader/APK."
---

# Estudo e Battle: contratos separados

Use somente quando o pedido incluir esta área. Leia o [contexto](../../../PROJECT_CONTEXT.md) e o módulo
[community-estudo](../../../docs/context/community-estudo.md) (Flashcards/Battle), `src/domain/study/`, repositório/armazenamento
local e o adapter de Battle pertinente. Reader/APK não torna Flashcards parte da tarefa.

## Estudo individual

- Reutilize editor, repositório e SRS existentes. Preserve rascunho em falha, prevenção de
  toque duplicado, confirmação de saída e validação dos limites reais de texto/imagem/desenho.
  Frente não revela gabarito; true/false é explícito, sem valor silencioso para cartão incompleto.
- Pontuação versionada é compartilhada por Study/Battle: confiança alta ±10, baixa ±5,
  conforme acerto/erro; zero inicial e negativos permitidos. Gabarito falso não inverte
  verde=acerto/vermelho=erro. SRS SM-2 é separado do placar e não deve ser substituído.
- Resposta/avanço e snapshot de conteúdo são duráveis/idempotentes antes da revelação.
  Retomar não reinicia sessão. Native SQLite e Web IndexedDB só confirmam gravação durável.
- Preserve conta e chaves legadas `@kindle/flashcards.v1:<UUID>` e bancos existentes.
  Migração copia legado compatível sem apagá-lo ou sobrescrever o formato novo.
- Geração determinística local não é IA. Candidatos precisam de origem e revisão explícita,
  sem gabarito inventado ou envio de livro para serviço externo. Não prometa Anki, origem
  completa no Reader ou Sync de cartões/revisões sem verificar a integração atual.

## Battle quando estiver no escopo

- Servidor mantém snapshot, gabarito e pontuação autoritativos. Não envie resposta/explicação
  antes do aceite nem confie em `isCorrect` calculado pelo cliente.
- Preserve regra atual de dois usuários/decks suficientes/confirmação, N permitido,
  sorteio sem repetição e propriedade original. Cada um avança independentemente;
  desconexão/expiração não produz derrota presumida. Sem bônus/HP/velocidade novos.
- Capture UUID/epoch/JWT por operação e cancele em troca de conta/blur. Polling só na tela
  ativa/foreground segundo o contrato existente; não transforme em polling global.
- O backend do projeto doador Flashcards não é o backend Aldus. Não reutilize seus JWTs,
  regras ou gateway. Não reaplique migration histórica por não reconhecer sua versão remota.
- Para alterações Supabase/remote, use
  [aldus-backend-operations](../aldus-backend-operations/SKILL.md). Estudo local não passa
  automaticamente a enviar dados por Battle ou pelo engine de Library Sync.

Selecione os testes `test-flashcards.cjs`, `test-flashcard-scoring.cjs`,
`test-flashcard-storage.cjs`, `test-flashcard-sessions.cjs`, `test-flashcard-ui.cjs`,
`test-flashcard-battles.cjs` e `test-battle-account.cjs` pertinentes na matriz crítica.
Cubra falha de gravação, reopen, idempotência, conta cruzada e gabarito antes/depois do aceite.
Postgres controlado não comprova partida de duas sessões gerenciadas reais; reporte separado.
