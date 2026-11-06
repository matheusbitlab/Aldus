# Bugs "EPUB CENTER RESET" e "restauração de progresso" — síntese verificada

> Escrito em 06/11/2026. Fontes: dossiês originais `BUG_CONTEXT_EPUB_CENTER_RESET.md` (416 linhas) e
> `BUG_CONTEXT_EPUB_PROGRESS_RESTORE.md` (117 linhas), apagados do checkout em `7f50a90` (15/10) e
> recuperáveis com `git show 7f50a90^:<arquivo>`; código atual de `src/presentation/` e suítes `scripts/test-reader-*.cjs`.
> Separação usada: **RELATO / REPRODUÇÃO / HIPÓTESE / CAUSA CONFIRMADA / CORREÇÃO / VALIDAÇÃO**.

## A. Reset ao abrir/fechar controles (toque central)

| Item | Estado |
| --- | --- |
| STATUS | **RESOLVIDO** — confirmado pelo usuário em 06/11/2026 (chat). Sem pendência. O restante da tabela é histórico da investigação. |
| RELATO | Usuário (ambiente real): num EPUB Web em página intermediária, **um** toque central abre os controles e o livro volta à página 1.  |
| REPRODUÇÃO EPUB | **Não reproduzida**: Chrome Headless 154, EPUB de 26 capítulos, pág. 15 estável em 3 toggles; browser integrado do VS Code, pág. 15/877 estável (02/10). Não refuta o relato. |
| REPRODUÇÃO Reflow | **Reproduzida** (Chrome Headless, Manifesto Comunista, Leitura Livre): clique central → `controlsVisible` false→true → `ReaderScreen` movia o documento de irmão de `ReaderControls` para filho (`flowReflowControls`) → unmount/remount de `DocumentReaderAdapter`/`EpubPageViewer`/iframe → novo iframe com `currentPage=1` → mensagem `page=1` → `setEpubPage 15→1`. |
| CAUSA CONFIRMADA | Só para o **Reflow**: troca de ancestralidade do documento por `controlsVisible` (log runtime + condição em `ReaderScreen`). Para o EPUB original a causa do relato permanece **desconhecida**. |
| CORREÇÃO | `ReaderScreen.tsx` (≈L1043-1052): Reflow sempre `<ReaderControls layoutMode="overlay">{readerDocument}</ReaderControls>`; demais modos usam `readerDocument` + `ReaderControls` irmão estável. `ReaderControls.tsx` mantém slot estável; visibilidade só muda opacidade/interatividade. Sem timeout/debounce/retorno artificial. |
| VALIDAÇÃO | 02/10: 10 toggles no Reflow (pág. 15) e 18 após navegar, sem remount; tema/fonte/espaçamento mantêm página. Hoje: `scripts/test-reader-screen.cjs` (no `test:critical`, 87/87 em 06/11) faz 10 toggles e exige a mesma instância do documento e `epubPage` constante (render com mocks, não browser); `scripts/test-reader-browser.cjs` exige identidade do documento e página após `display()`. Redmi físico (c382f99, 23/10) abriu/fechou controles e reabriu mantendo posição. |
| LIMITE | Resize do viewport externo não foi comprovado; o relato EPUB original não foi reconfirmado no ambiente do usuário. Não declarar "EPUB center reset resolvido" além do que está acima. |

Diagnóstico opt-in (desligado por padrão): `localStorage.epubCenterResetDiagnostics="1"` habilita os logs
`[FORENSIC:*]` (`src/utils/epubOpenMetrics.ts` → `epubDiagnosticConsole`, usado no `ReaderScreen`, `DocumentReaderAdapter`,
`EpubPageViewer.web`, `EpubReaderDocument`); `pdfReflowDiagnostics` em `PdfReflowProcessor.web.tsx`. Hoje há ≈50 ocorrências de
`FORENSIC` em `src/`; são inofensivas (flag), mas não remover sem entender o uso.

Regras que continuam valendo se o relato voltar: achar a **primeira escrita** que muda página >1 para 1 (log com timestamp do
browser real); proibido `setTimeout`/debounce/fila fictícia/voltar à página anterior como paliativo; não remontar por `key`
dependente de página/UI; preservar `transitionend` e a separação `currentPage`/`targetPage`.

## B. Restauração de progresso (oscilação 1↔11 na reabertura) — era PDF Reflow, não EPUB

| Item | Estado |
| --- | --- |
| REPRODUÇÃO | Log runtime preservado (Chrome Headless, Manifesto Comunista, Reflow): progresso salvo 0,0583 (pág. 15/241); ao reabrir, 1º total 165 → pág. 11; depois total 241 chega com `page=1`; `handleEpubPageInfo` já tinha consumido `initialEpubProgress` e gravou 11→1; efeitos pai↔iframe alternam 1/11. |
| CAUSA CONFIRMADA | Corrida entre o 1º `page info` (total provisório) e a repaginação seguinte; a intenção salva era consumida cedo demais. |
| CORREÇÃO | Handshake `reflowRestoreState` `pending → applying → inactive` (`ReaderScreen.tsx` L128, L360, L769-822): intenção retida até `layoutReady`; destino enviado por `epubPage`; só o ACK com página e total-alvo consome a intenção. Estende-se hoje a EPUB e Reflow (`(isEpub || isReflowPdf)`). Documento nasce com `initialRestorePending` e declara `layoutReady` após `document.fonts.ready` + imagens + rAF (`EpubReaderDocument.ts`). Sem filtro global de `page=1`. |
| VALIDAÇÃO | No dossiê (02/10): typecheck/export/diff-check PASS, **sem** teste de reabertura em browser (GPU do Chrome/Edge falhava) — "implementação concluída, validação funcional pendente". Depois: Chromium (`test:reader:{browser,epub:web,reflow:web}`) e `test-reading-anchors`/`test-reader-location` cobrem âncora/ACK; Redmi (c382f99, 23/10): EPUB 15→16→reinício offline→15 restaurou pág. 3/13 e o recorte do corpo. Posição textual EPUB/Reflow vive em `progress.cfiPosition` (envelope versionado, não é CFI real). |
| LIMITE | A reabertura do **Reflow** com total mudando 165→241 não tem teste Chromium dedicado identificado; PDF Original/Leitura Livre físicos seguem pendentes (BUGS_ATUAIS 24/10). |

## C. O que falta para fechar de vez

1. Homologação física (Redmi) de Reflow/PDF Original na build atual (HEAD `f61a0c8` ≠ APK `00b6e4d`).
2. Se o usuário ainda reproduzir o reset no EPUB: coletar timeline com a flag acima antes de qualquer edição.
3. Registrar o resultado em `BUGS_ATUAIS.md` (hoje o arquivo não tem entrada para A/B).
