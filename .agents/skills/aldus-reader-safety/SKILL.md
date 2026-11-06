---
name: aldus-reader-safety
description: "Corrigir ou evoluir o Reader Aldus em EPUB, PDF Original/Reflow, progresso, âncoras, seleção, marcações, tipografia e controles sem perder posição ou persistência."
---

# Reader: posição e documento estáveis

Leia [PROJECT_CONTEXT.md](../../../PROJECT_CONTEXT.md) e o módulo
[reader](../../../docs/context/reader.md) e, para reset de controles/restauração de posição, a
[síntese dos bugs](../../../docs/context/referencias/bugs-epub-center-reset-e-restore.md) (histórico de concentração/continuidade/marcações em
`docs/context/historico/`), além do bug pertinente. Comece por
`ReaderScreen`, `DocumentReaderAdapter`, viewer `.web`/`.native`, documento gerado,
`UpdateReadingProgressUseCase` e contratos de âncora; não deduza o fluxo só pela UI.

## Investigar antes de alterar

Reproduza em página intermediária. Capture origem/operação/geração de mensagens,
layoutReady, ACK, primeira gravação de progresso e eventual remount. Diagnóstico deve
ser opt-in e permitir apenas dados não sensíveis, sem texto do livro ou URLs privadas.
Identifique a primeira divergência entre intenção, layout, mensagem e persistência.

## Preservar os contratos

- Mudar controles/settings/tema/fonte não troca key, ancestralidade ou viewport documental.
  Overlays mantêm geometria; visibilidade controla opacidade/interatividade. Safe Area uma vez.
- Restauração espera layout pronto e ACK do destino. Posição transitória não substitui
  intenção persistida. Página 1 legítima não pode ser bloqueada por filtro global.
- EPUB e Reflow usam intenção textual validada no carrier existente `cfiPosition`, que
  não deve ser interpretado como EPUB CFI. Não crie segundo progresso ou migração por conveniência.
- Âncoras `exact`/`relocated` podem navegar; `missing`/`ambiguous` exigem aviso. Nunca
  escolha o primeiro trecho parecido silenciosamente. Refaça modelo apenas no capítulo necessário.
- PDF Original mantém arquivo/página/zoom próprios; Reflow é derivado versionado por
  hash do conteúdo e processador. Preserve as posições dos dois modos ao alternar.
- Cache só é sucesso após commit durável: rollback no cancelamento antes do commit,
  `oncomplete` IndexedDB e transação SQLite. Cache confirmado anterior não é apagado.
- Preparação Reflow/OCR continua cooperativa e cancelável até confirmar cache/HTML.
  Abort/epoch impedem retorno antigo após Back, troca de modo/livro/conta ou unmount.
  Não substitua yield de tarefa por cadeia infinita de microtasks nem aumente timeout como cura.
- Código enviado ao WebView deve ser JavaScript fonte portátil; `Function.toString()`
  de Hermes não fornece fonte confiável. Leia a regressão de bytecode quando tocar nesse caminho.
- Grifos exigem seleção explícita válida; captura de marcador não abre compositor de
  grifos. Ignore resposta antiga e limpe seleção consumida. Erro de gravação preserva rascunho.
  Preserve IDs, importação transacional/idempotente e confirmação de exclusão.
- Não prometa seleção/grifos equivalentes em PDF Original, Reflow e EPUB. Confirme o
  suporte concreto. Não reintroduza JSON no fluxo principal de marcações.

## Validar a mudança

Use [aldus-validation](../aldus-validation/SKILL.md). Além dos gates, escolha suítes
Screen/Native/location/anchors/reflow e browser correspondentes. Exercite avanço/retorno,
dez toggles, tipografia ida/volta, Back/reopen e reinício offline quando aplicável.
Confira texto/posição restaurados, não apenas número de página antes de totais estabilizarem.

Android físico, brilho, gestos, handles de seleção e encerramento real de processo exigem
evidência no artefato instalado. Não encerre esses itens com PASS Web ou build. Consulte
o estado atual do aparelho nos dois documentos oficiais, sem supor que a disponibilidade mudou.
