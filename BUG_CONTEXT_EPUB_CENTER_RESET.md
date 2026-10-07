# BUG CONTEXT — EPUB Web volta ao início ao alternar controles

> Dossiê técnico para investigação independente. Atualizado em 2026-10-02. Nesta etapa foi criada documentação; nenhuma alteração funcional foi feita.

## 1. Resumo executivo

**Reprodução funcional confirmada pelo usuário no ambiente real:** com EPUB Web numa página intermediária, **um único clique central** abre os controles e o livro volta à página 1. Não existe segundo clique. O usuário informou que o comportamento persistiu após uma correção anterior de navegação. A reprodução é considerada real mesmo que os browsers de investigação disponíveis não a tenham reproduzido.

**Esperado:** visibilidade das barras é estado de UI. Ela não deve alterar posição, progresso inicial, paginação ou documento. Se ocorrer repaginação real, preservar a posição lógica equivalente.

**Conclusão atual:** a inspeção estática não localizou setEpubPage(1) condicionado a controlsVisible, remount/key ligado aos controles, ou restauração ligada ao toggle. O script contém uma rota pela qual uma medição de total igual a 1 limita a página a 1 durante recalculateLayout/goToPage/sendPageState. **Ainda não foi possível observar o reset no browser integrado nem o runtime do ambiente real do usuário.** Não há evidência de qual caminho produz o primeiro `1`; a causa raiz permanece indeterminada.

A tentativa estrutural mais recente removeu controlsVisible inutilizada das props do adapter, estabilizou o callback de página e aplicou memo ao viewer Web. Os builds passaram; o cenário manual não foi testado. Não declarar o bug resolvido.

## 2. Qualidade e limites das evidências

- **FATO DE CÓDIGO:** diretamente observado nos arquivos atuais.
- **RELATO:** comportamento descrito pelo usuário; não é reprodução independente.
- **TENTATIVA:** alteração com intenção de impedir o reset.
- **HIPÓTESE:** mecanismo possível, sem confirmação de runtime.
- **RESULTADO:** somente validação explicitamente executada.

### Limite do histórico Git

git log nos arquivos relacionados contém apenas f454d43 Initial commit. Diversos arquivos relevantes (incluindo EpubReaderDocument.ts, EpubPageViewer.web.tsx e DocumentReaderAdapter.tsx) estão untracked; ReaderScreen.tsx está modificado em relação ao commit inicial. O diff atual agrega mudanças extensas não relacionadas. Não é possível atribuir datas/autoria/diffs exatos às tentativas antigas. A cronologia combina o que foi relatado nesta conversa com o código atual; datas antigas não foram inventadas.

## 3. Cronologia reconstruída

| Ordem | Evento | Evidência e resultado |
|---|---|---|
| 1 | Trabalho anterior corrigiu navegação EPUB e separação da página atual/destino. | O código atual tem currentPage, targetPage, animação e listener transitionend. O histórico Git não permite recuperar o patch original. |
| 2 | Usuário relatou: estar numa página intermediária, clicar no centro, barras aparecem e o livro retorna à página 1 (exemplo página 10). | Relato explícito. Reprodução independente: **NÃO TESTADO**. |
| 3 | Usuário pediu auditoria do caminho de clique, efeitos, resize, restauração, remount e iframe antes da correção. | Pedido registrado na conversa. |
| 4 | Foi feita tentativa anterior envolvendo conclusão da navegação por transitionend e preservação da página em recálculo. | Código atual e histórico conversacional; patch/datas exatos não recuperáveis no Git. |
| 5 | Usuário afirmou que o bug CONTINUAVA depois da tentativa. | Resultado funcional relatado: não resolveu o reset ao abrir controles. |
| 6 | Auditoria estática examinou controlsVisible, efeitos, props, key/srcDoc, resize e restauração. | Não encontrou reset/restauração explicitamente condicionado às barras; não executou browser trace. |
| 7 | Tentativa mais recente removeu a prop de controles inutilizada do adapter, estabilizou handleEpubPageInfo e memoizou EpubPageViewer. | typecheck, export:web e git diff --check passaram. Manual: **NÃO TESTADO**. Ainda não há relato do usuário sobre o comportamento posterior. |
| 8 | Usuário solicitou dossiê para Opus/Antigravity, proibindo nova correção funcional. | Este documento atende ao pedido; nenhum código funcional foi editado nesta etapa. |

### Navegação anterior / transitionend

O mecanismo atual mantém currentPage (confirmada) separada de targetPage (destino durante animação), usa isAnimating, conclui com transitionend de transform, e trata navegação/recalc pendentes após a transição. recalculateLayout captura a página atual e tenta voltar a ela depois de medir novamente o total. A presença da lógica é fato no código; que essa correção resolva o reset por controles é contrariado pelo relato do usuário. Não modificar essa lógica nesta etapa.

## 4. Arquitetura atual do caminho

    ReadingTouchZones.centerZone (Pressable)
      → onToggleControls
      → readerStore.toggleControls (altera controlsVisible)
      → ReaderScreen rerenderiza (assina o store inteiro)
      → ReaderControls atualiza visible/opacidade/pointerEvents
      → DocumentReaderAdapter rerenderiza
      → EpubPageViewer memoizado (se props shallow-equal)
      → iframe com srcDoc memoizado

    Iframe / EpubReaderDocument:
      layout events → recalculateLayout → goToPage → sendPageState(postMessage)
      → EpubPageViewer recebe page → callback.current
      → ReaderScreen.handleEpubPageInfo → epubPage / total / progress / chapter

O segundo bloco é um caminho possível do documento, não prova de que o toggle o iniciou.

### Clique e store

- ReadingTouchZones.tsx:48-54: zona central chama onToggleControls. Escape também chama toggle; setas chamam anterior/próxima.
- readerStore.ts:4-18: toggleControls escreve somente controlsVisible. O default é false.
- ReaderScreen.tsx:53 consome o hook Zustand sem selector; a mudança provoca rerender.

### ReaderScreen, progresso e restauração

- epubPage inicia em 1; epubTotalPages em 0; epubChapterIndex em 0; initialEpubProgress é ref number|null.
- ReaderScreen.tsx:86-106: efeito de troca de bookId reseta estados e chama setControlsVisible(false). Não depende de controlsVisible.
- ReaderScreen.tsx:108-258: efeito de abertura carrega livro/capítulos, progresso e define initialEpubProgress; zera página/total antes de mostrar o livro. Dependências: bookId e setProgress.
- handleEpubPageInfo (ReaderScreen.tsx:518+): usa progresso inicial só quando epubTotalPages===0 e ref não nulo, depois limpa ref; então grava página, total, capítulo/localizações e progress.
- handleProgress pode derivar epubPage do progresso/slider; clique central não o chama diretamente.
- Não foi encontrado estado chamado initialPage; initialEpubProgress é o equivalente de restauração.

### Adapter e controles

- DocumentReaderAdapter.tsx escolhe EPUB/PDF/Reflow/texto e inclui ReadingTouchZones.
- controlsVisible existia no contrato e era encaminhada sem ser lida; foi removida na tentativa recente.
- ReaderScreen e adapter ainda podem rerenderizar; callbacks inline anterior/próxima mudam identidade. Isso não prova remount.
- Para EPUB, flowReflowControls = isReflowPdf && controlsVisible é falso; controles overlay e documento permanecem no mesmo ramo.
- ReaderControls usa Animated.View, pointerEvents e opacidade; header/footer e controles overlay usam posicionamento absoluto. Geometria de browser não foi observada.

### Viewer Web e iframe

- EpubPageViewer.web.tsx cria HTML em useMemo(...,[chapters]); settings não são dependência; alterações tipográficas seguem via postMessage.
- iframe usa srcDoc={html}, sem key. onLoad envia display, goToPage(pageNumber) e updateTypography.
- Listener message valida event.source contra contentWindow atual; mensagem page chama callback.current(info).
- Efeitos enviam goToPage quando pageNumber muda; navigatePage quando navigationRequest muda; search/typography quando suas dependências mudam. Nenhum depende de controlsVisible.
- Tentativa atual aplica memo e useCallback no handler pai. Se todas as props forem superficialmente iguais, memo impede render do viewer; não há profiler/runtime trace que confirme isso durante o bug.
- onLoad pode receber handler de identidade nova após render; isso não significa novo srcDoc. Reload/remount real não foi observado.

### Documento e paginação

- EpubReaderDocument.ts gera HTML/JS do iframe. O script inicia currentPage=1, targetPage=1, totalPages=1 e currentChapterIndex=0.
- calculateTotalPages usa ceil(content.scrollWidth / getPageWidth()), mínimo 1.
- sendPageState recalcula total, clampa currentPage em [1,totalPages], determina capítulos e envia type=page ao pai.
- goToPage recalcula total, limita o pedido, escreve currentPage e targetPage, aplica transform e reporta.
- recalculateLayout guarda currentPage; em requestAnimationFrame mede total e chama goToPage com página limitada ao novo total. Se a medição for 1, esse caminho pode produzir goToPage(1). É risco estático, **não causa do clique confirmada**.
- resize e ResizeObserver do viewport sincronizam altura e chamam recalculateLayout. Load de imagem também chama recalc. updateTypography altera CSS e agenda recalc. DOM/fontes usam timers de inicialização existentes; não foram adicionados nesta etapa e não provam evento no toggle.
- navigatePage define destino limitado, aplica transform e espera transitionend; finishNavigation promove target a current e envia estado.

## 5. ESTADO E FONTES DE VERDADE

| Estado/valor real | Onde vive / quem escreve | Leitura e sincronização | Risco/equivalência |
|---|---|---|---|
| currentPage | Variável no script iframe; goToPage, clamp em sendPageState e confirmação do alvo. | Transform, capítulo e mensagem ao pai. | Página interna; pode divergir transitoriamente de React. |
| targetPage | Script iframe; navigatePage, goToPage e finishNavigation. | Transform durante animação. | Destino, não página confirmada. |
| epubPage | React state ReaderScreen; abertura, handleEpubPageInfo ou handleProgress. | Prop pageNumber, UI e controles. | Segunda representação; sincronizada via mensagem. |
| totalPages / epubTotalPages | Script mede; Reader grava total recebido. | Limite, navegação, progresso/slider. | Total iframe e cópia pai; depende do layout. |
| progress | Zustand; setProgress limita 0..1. | UI/persistência e cálculo de página; derivado da mensagem. | Representação normalizada adicional. |
| initialEpubProgress | Ref em ReaderScreen, preenchida ao abrir/restaurar; consumida na primeira page info ou limpa ao mudar modo. | Handler de page info apenas se total pai 0. | Não há initialPage nominal. |
| currentChapterIndex / epubChapterIndex | Script começa 0 e detecta; pai inicia 0 e recebe page info. | Sumário, progresso e títulos. | Índice 0 não prova reset de página. |
| controlsVisible | Zustand; toggle alterna somente boolean. | ReaderControls e modo flow apenas no Reflow. | Estado UI; ReaderScreen rerenderiza por assinatura ampla. |
| iframe | DOM/ref no EpubPageViewer. | postMessage/onLoad. | Sem estado mount dedicado; remount exige runtime. |
| srcDoc/html | useMemo por chapters; valor vai ao atributo do iframe. | iframe. | Sem dependência explícita de UI; mudança real não medida. |
| dimensões/layout | iframe lê clientWidth/Height e fallbacks; Reader tem useWindowDimensions para estimativa. | Paginação usa dimensões iframe; Reader usa dimensões gerais. | Efeito do overlay na dimensão do iframe não confirmado. |
| fonte/tema/margens/espaçamentos | ReaderSettingsContext/tokens; PDF Reflow tem settings próprios. | Viewer envia updateTypography quando valores mudam. | Pode recalcular quando settings mudam; toggle não os escreve no código. |
| navigationRequest | Reader cria ID/direção. | Viewer envia navigatePage. | Canal animado distinto do pageNumber/goToPage. |

Existem representações distintas de página (iframe, epubPage e progress) e de total. Multiplicidade é fato arquitetural; não está estabelecido qual iniciou o incidente. lastReportedKey reduz mensagens iguais; loop infinito não foi observado.

## 6. Caminhos localizados que podem alterar a página

Busca estática em src/app por setters/página, goToPage, targetPage, restore/progress/chapter, recalc, resize/observer, iframe/srcDoc/key/effects/navigation/transition. Não encontrados setPage(0), setCurrentPage, pageIndex ou restorePage pelo nome nesses caminhos.

| Caminho | Escrita/resultado possível | Relação com toggle |
|---|---|---|
| Troca bookId | setEpubPage(1), total 0 e ref inicial limpo. Reset deliberado de abertura. | Efeito não depende dos controles. |
| Abertura | Inicializa em 1 e aplica progresso restaurado na primeira paginação. | Sem ligação estática ao toggle. |
| Primeira page info | Mapeia progresso inicial; página 1/progress 0 são possíveis se progresso zero/info 1. | Ref não é rearmado pelo toggle no código. |
| handleProgress/slider | Deriva página do percentual; progress zero pode dar 1. | Centro não chama diretamente. |
| goToPage | Clamp a [1,total], atribui current/target, transform. | Chamada no incidente não observada. |
| sendPageState | Recalcula total e limita current. | Pode reportar 1 se total medido 1; execução não observada. |
| recalculateLayout | Preserva índice numérico, mas limita ao total recém-medido. | Resize causado pelo toggle não confirmado. |
| updateTypography | CSS e timeout existente, recalc e goToPage limitado. | Toggle não muda settings no código. |
| display/onLoad | display chama goToPage(current); onLoad envia pageNumber do pai. | Novo load/remount ao clicar não confirmado. |
| navigatePage/transitionend | Destino adjacente; finalização promove target. | Centro não chama next/prev no código; propagação real não testada. |
| Sumário/busca | Pode enviar destino a goToPage. | Sem relação direta comprovada. |
| Capítulo | Índice começa em 0 e é recalculado; não é página. | Nenhuma causa comprovada. |

Os setEpubPage(1) encontrados pertencem à abertura/troca bookId e troca para modo PDF Reflow, não a controlsVisible. progress=0 pode resultar de página 1 ou slider; não foi provado no incidente.

## 7. CENTRO / controlsVisible: evidências

| Pergunta | Conclusão |
|---|---|
| toggle escreve página? | Não; action do store escreve somente controlsVisible. |
| causa rerender? | Sim, ReaderScreen assina o store inteiro. |
| componente desmonta? | A árvore JSX EPUB não muda de ramo por controlsVisible; remount em runtime não confirmado. |
| props/callbacks mudam? | Adapter pode rerenderizar e callbacks inline anterior/próxima mudam. controlsVisible foi removida de suas props. onPageInfo usa useCallback. |
| effect do viewer depende do toggle? | Nenhum effect tem controlsVisible como dependência. |
| memo é invalidado? | memo shallow deve barrar se props forem iguais; igualdade real não confirmada por profiler. |
| iframe/srcDoc/key mudam? | Sem key; srcDoc memoizado por chapters; nenhuma alteração explícita ligada às barras. DOM real não observado. |
| resize/observer disparam? | Listener/observer existem; overlays absolutos sugerem geometria independente. Evento no clique não confirmado. |
| page state reenviado? | onLoad/display/recalc/page effect podem enviar; associação ao clique não observada. |
| restauração reexecuta? | Efeitos não dependem de controlsVisible; execução em runtime não gravada. |

Memo não prova que o pai não renderiza, nem que navegador não dispara resize; também não prova correção.

## 8. transitionend — não alterar

- Listener filtra target content e propertyName transform.
- navigatePage ignora nova transição se isAnimating ou direção inválida, calcula target limitado, aplica classe e transform.
- finishNavigation promove target para current, limpa flags, envia estado e depois trata deferredPage ou recálculo pendente.
- goToPage é navegação direta e define current/target juntos.
- recalculateLayout adia durante transição.
- A conversa relata que a correção anterior não impediu o reset das barras. A lógica existe atualmente; diff original não recuperável.
- Nenhuma linha desta lógica foi alterada nesta etapa documental.

## 9. Tentativas de correção relacionadas

| Tentativa | Arquivos | Mudança | Hipótese | Resultado | Status |
|---|---|---|---|---|---|
| Separar atual/destino e transitionend | EpubReaderDocument.ts; histórico não isolável | Estados e confirmação por evento. | Navegação antecipada/inconsistente. | Código presente; reset de controles persistiu segundo usuário. | Preservar; não é solução confirmada do bug. |
| Preservar página no recalc | EpubReaderDocument.ts | Captura página e chama goToPage limitado pelo total. | Resize/layout reiniciava posição. | Usuário informou persistência; execução específica não testada. | Tentativa insuficiente; clamp é hipótese técnica. |
| Auditoria estática | ReaderScreen/adapter/viewer/script | Inspeção de efeitos, estado, props, key/srcDoc, resize e restore. | Causa direta UI/remount/restore. | Não achou vínculo explícito; runtime em aberto. | Incompleta sem trace. |
| Remover prop controlsVisible inutilizada | ReaderScreen, DocumentReaderAdapter | Tirou prop/interface/destructuring. | Eliminar acoplamento visual com adapter. | Builds passaram, manual não testado. | Aplicada, eficácia desconhecida. |
| Estabilizar callback de página | ReaderScreen | handleEpubPageInfo em useCallback. | Callback instável invalida memo. | Typecheck/export passam; sem profiler/manual. | Aplicada; causa não provada. |
| Memoizar viewer | EpubPageViewer.web.tsx | memo(EpubPageViewerComponent). | Impedir rerender viewer/iframe com props iguais. | Build passa; sem funcional. | Aplicada; eficácia desconhecida. |
| Instrumentação de abertura | epubOpenMetrics.ts, ReaderScreen/viewer | Trace opt-in de abertura e primeira page info. | Medir latência de abertura. | Não captura reset do toggle. | Existe, insuficiente para incidente. |

Mudanças amplas de Reader/header/settings/PDF existem na working tree; sem diff histórico isolado não classificá-las como tentativas deste bug.

## 10. O que já foi testado

### TESTES AUTOMATIZADOS

| Teste | Executado? | Resultado | Limite |
|---|---|---|---|
| npm.cmd run typecheck após memo/callback | SIM | PASSOU. | Não exercita UI. |
| npm.cmd run export:web após tentativa | SIM | PASSOU; cache Metro ilegível foi descartado, full crawl/bundle/cópia de assets concluíram. | Não comprova navegação. |
| git diff --check após tentativa | SIM | PASSOU. | Só whitespace. |
| Teste automatizado específico do reset | NÃO TESTADO/não executado | Sem resultado. | Não inferir cobertura. |

### TESTES MANUAIS

- Abrir EPUB e navegar a página intermediária após última tentativa: **NÃO TESTADO**.
- Clicar no centro e observar reset após última tentativa: **NÃO TESTADO**; retorno é relato anterior do usuário.
- Repetir abrir/fechar controles mantendo página 10: **NÃO TESTADO**.
- Continuação 2026-10-02: uma interação única foi capturada no browser integrado, em página 15/877, mas não reproduziu o reset; detalhes na seção 22. Isso não altera a confirmação da reprodução funcional pelo usuário no ambiente real.
- Browser/versão/OS do relato: não informado.
- React Profiler, DOM mount/unmount, console/postMessage, dimensões/resize: **NÃO TESTADO**.

## 11. INCERTEZAS ATUAIS

- Se currentPage>1 imediatamente antes do clique dentro do iframe.
- Se página muda antes ou depois do toggleControls.
- Se clique aciona apenas handler esperado.
- Se resize/ResizeObserver dispara e quais dimensões mudam.
- Se recalculateLayout roda e qual total mede.
- Se primeira escrita 1 ocorre no iframe, estado React, progress ou só transform.
- Se iframe envia pageNumber 1, quando e por qual call stack.
- Se handleEpubPageInfo recebe página 1 no incidente.
- Se initialEpubProgress ainda é não nulo/condição inicial volta a ser verdadeira.
- Se viewer/iframe remonta ou onload dispara de novo.
- Se srcDoc muda efetivamente.
- Se memo recebe props iguais durante o toggle.
- Se imagem/fonte/layout causa notificação coincidente.
- Se viewport do browser participa.
- Se última tentativa alterou comportamento: teste pendente.
- Quais commits/diffs antigos compuseram cada tentativa: indisponível; há apenas commit inicial e arquivos untracked.

## 12. Instrumentação existente ou planejada

### Existente

src/utils/epubOpenMetrics.ts habilita trace por ?epubMetrics=1 ou sessionStorage.epubOpenMetrics=1, usa performance.now(), armazena eventos desde clique e imprime resumo/tabela em first_page_state_received. Chamadas atuais incluem eventos de clique, resolução/leitura/importação (quando instrumentados), srcDoc, attach/load do iframe, paginação disponível e primeira page info.

first_page_state_received significa que o pai recebeu estado, não que pixels foram pintados; o código declara visiblePixelsMeasured:false. A trace finaliza na primeira informação e não registra toggle, página antes/depois, cada goToPage, dimensões, resize/observer, writes current/target, remount, mudança srcDoc nem stack da primeira página 1.

### Instrumentação temporária implementada para a sessão

Na sessão 2026-10-02, logs temporários foram adicionados nos cinco arquivos listados na seção 19 e usados no Chrome Headless. Eles não capturaram pixel paint exato, mas registraram a cadeia até página/transform e nenhuma operação do iframe associada aos três toggles. Consulte os eventos e limites na seção 19.

## 13. Arquivos envolvidos

| Caminho | Responsabilidade/relação e mudança ligada ao bug | Relevância |
|---|---|---|
| src/presentation/components/reader/ReadingTouchZones.tsx | Pressable central/teclado; origem do toggle. | ALTO |
| src/presentation/stores/readerStore.ts | controlsVisible, progress, toggle. | ALTO |
| src/presentation/screens/ReaderScreen.tsx | Restauração, epubPage/progress, callbacks e árvore; callback estabilizado na tentativa recente; outras mudanças amplas na working tree. | ALTO |
| src/presentation/components/reader/DocumentReaderAdapter.tsx | Despacho EPUB/PDF e touch zones; prop controlsVisible removida. | ALTO |
| src/presentation/components/EpubPageViewer.web.tsx | srcDoc, iframe, efeitos/mensagens/memo; tentativa recente e métricas. | ALTO |
| src/presentation/components/EpubReaderDocument.ts | Paginação/layout/transitionend/resize; recalc limita página; histórico antigo indisponível. | ALTO |
| src/presentation/components/EpubPageViewerProps.ts | Contratos de página/navegação. | MÉDIO |
| src/presentation/components/EpubPageViewer.tsx | Resolve componente por plataforma. | MÉDIO |
| src/presentation/components/EpubPageViewer.native.tsx | Caminho nativo; relato é Web. | BAIXO |
| src/presentation/components/ReaderControls.tsx | Overlay/opacidade/pointerEvents. | ALTO |
| src/presentation/components/TopHeader.tsx | Header; overlay absolute no modo padrão. | MÉDIO |
| src/presentation/components/BottomFooter.tsx | Footer, slider e navegação. | MÉDIO |
| src/presentation/contexts/ReaderSettingsContext.tsx | Tema/fonte/medidas; mudanças UX na working tree sem relação causal demonstrada. | MÉDIO |
| src/presentation/components/ReaderSettingsPanel.tsx | Aparência/sumário/busca; não é toggle central. | BAIXO/MÉDIO |
| src/utils/epubOpenMetrics.ts | Métricas opt-in de abertura, não do reset. | MÉDIO |
| PROJECT_CONTEXT.md | Contexto vivo; estado do bug. | MÉDIO |
| BUG_CONTEXT_EPUB_CENTER_RESET.md | Este dossiê. | ALTO |
| app/reader/* e layouts/providers | Ancestrais/rota podem afetar mount; remount externo não confirmado. | MÉDIO |
| src/presentation/components/ReaderContent.tsx | Fallback de texto, não renderer EPUB normal. | BAIXO |
| PdfPageViewer*, PdfReflowProcessor* | Caminhos PDF separados; não alterar. | BAIXO |

## 14. Restrições para o próximo agente

- Reproduzir e identificar a primeira operação que muda página >1 para 1 antes de corrigir.
- Não usar setTimeout, debounce artificial, atraso, fila fictícia, estado compensatório ou voltar à página anterior como solução.
- Não resetar página por controles nem mascarar o problema.
- Não alterar parser sem evidência; não alterar PDF Original/Reflow, cache, download, busca ou processamento.
- Preservar transitionend e separação página atual/destino.
- UI de controles independente da posição de leitura.
- Restauração somente na abertura real/troca do documento, nunca por UI, resize ou tema.
- Evitar remount/iframe/srcDoc recriados; comprovar via runtime.
- Comparar currentPage do iframe, transform, epubPage do pai e progress.
- Build não significa correção. Registrar browser, versão, EPUB, passos e resultado manual.
- Instrumentação deve ser temporária/ordenada e vinculada ao clique, sem alterar ordem do processamento.

## 15. Hipóteses levantadas

| Hipótese | Evidência | Confirmada? | Refutada? | Ainda possível? |
|---|---|---:|---:|---:|
| controlsVisible escreve página diretamente | Store escreve só boolean. | Não | Direto, no código atual | Indireta sim |
| Rerender ReaderScreen reseta | Rerender é comprovado; efeito desconhecido. | Não | Não | Sim |
| Rerender adapter reseta | Adapter pode rerenderizar, ramo EPUB estável. | Não | Não | Sim, com evidência runtime |
| Callback instável | onPageInfo agora useCallback; anterior/próxima inline. | Não | Não | Sim |
| Memo resolve | Implementado sem profiler/manual. | Não | Não | Sim |
| Abrir controles provoca resize | Overlays absolutos. | Não | Não | Sim |
| ResizeObserver chama recalc | Observer existe; disparo no bug desconhecido. | Caminho sim; causa não | Não | Sim |
| Recalc clampa para 1 | Clamp existe se total medido for 1. | Mecanismo estático, causalidade não | Não | Sim |
| Remount/onload reinicia | Script inicia em 1; onLoad manda pageNumber do pai. | Não observado | Não | Sim |
| srcDoc/key mudam no toggle | Sem key; srcDoc memoizado por capítulos. | Sem gatilho explícito | Não | Runtime/ancestral não observado |
| Restauração reaplica | Efeito depende de bookId/actions, ref consumido. | Não como consequência estática do toggle | Não | Runtime não observado |
| Page info 1 sobrescreve Reader | Handler grava informação recebida. | Caminho sim; incidente não | Não | Sim |
| Múltiplas fontes conflitam | currentPage, targetPage, epubPage e progress coexistem. | Multiplicidade sim; causa não | Não | Sim |
| Tema/tipografia coincidem | Settings provocam recalc; toggle não os altera no código. | Não | Não | Sim |

## 16. Orientação ao próximo agente — sem solução proposta

Reproduzir no mesmo browser/tela/EPUB. Em página intermediária, coletar timeline única desde o clique central. Prioridade: localizar a primeira escrita ou mensagem que altera >1 para 1.

    clique → toggle → primeira mudança de estado → render/effects
    → mounts/props → dimensões/resize/ResizeObserver
    → iframe load/message → recalculateLayout/goToPage
    → escrita currentPage/targetPage
    → sendPageState(pageNumber=1)
    → handleEpubPageInfo / epubPage / progress
    → transform e conteúdo visível

Registrar stack e timestamp. Se currentPage continuar >1 e só visualmente retornar, investigar transform/CSS/viewport. Se pai mudar primeiro, rastrear callback/estado. Se houver reload/remount, localizar ancestral/condição/key/srcDoc. Não começar com outra correção hipotética.

## 17. Instrumentação: alcance exato

O resumo de epubOpenMetrics termina no estado inicial recebido. Ele declara que pixels não são medidos e não responde qual operação reseta página. A instrumentação de toggle descrita na seção 12 foi implementada temporariamente e exercitada; a sessão não reproduziu o defeito. Os logs detalhados permanecem no app para nova coleta.

## 18. HISTÓRICO DESTA DOCUMENTAÇÃO

### 2026-10-02 — criação

- Criado BUG_CONTEXT_EPUB_CENTER_RESET.md para entrega ao Opus no Antigravity.
- Reconstruídos relatos/tentativas da conversa e confrontados com código, busca estática, diff e Git disponível.
- Registrada limitação histórica: somente commit inicial e arquivos EPUB relevantes untracked.
- Documentados arquitetura, estado, caminhos de página, transitionend, tentativas, testes, instrumentação, incertezas e roteiro de investigação.
- Nenhuma correção funcional ou refatoração foi feita nesta etapa.

## 19. Runtime no navegador — 2026-10-02

- Foram adicionados logs forenses temporários aos caminhos existentes em `ReaderScreen.tsx`, `ReadingTouchZones.tsx`, `DocumentReaderAdapter.tsx`, `EpubPageViewer.web.tsx` e `EpubReaderDocument.ts`. A instrumentação observa estado, props, mounts, `srcDoc`, iframe, mensagens, dimensões, resize/ResizeObserver, recálculo, navegação e transform; não foi intencionalmente alterada a ordem funcional.
- O servidor Web que já ocupava a porta 8081 não pôde ser inspecionado no ambiente restrito; a aplicação foi iniciada em 8082. Chrome Headless 154 no Windows abriu a biblioteca real. Livro: EPUB empacotado `bundled-epub-1e9e1db1`, “Sigmund Freud Na Sua Época E Em Nosso Tempo”, com 26 capítulos.
- Durante a abertura inicial, o total informado mudou de 1166 para 1191 páginas quando as fontes ficaram prontas, ainda na página 1. Isso não foi associado ao clique central.
- A página foi posicionada em 15 usando o `goToPage(15)` do iframe (não por 14 cliques). Rótulo do Reader, mensagem de estado e transform confirmaram página 15 (`translateX(-5992px)`). O botão central real foi acionado três vezes.
- **O bug não se reproduziu nessa sessão.** A página permaneceu 15, o progresso permaneceu `0.011764705882352941`, o transform não mudou e o iframe continuou montado. `ReaderScreen` e `DocumentReaderAdapter` renderizaram, mas as props EPUB comparadas permaneceram iguais. Não houve render de `EpubPageViewer`, ref detach/attach, novo `iframe.onload`, mudança de `srcDoc`, mensagem `page`, `resize`, `ResizeObserver`, `recalculateLayout`, `goToPage` ou restauração na janela dos cliques.
- HMR durante a preparação dos logs provocou uma desmontagem/remontagem e regeneração de `srcDoc`; ela foi excluída da evidência dos cliques. Um erro de sintaxe numa expressão regular da instrumentação gerada foi corrigido antes do ensaio válido; não era erro do fluxo EPUB nem evidência do incidente.
- Este resultado mostra que, neste build/navegador/livro e sequência, o rerender da tela/adaptador sozinho não mudou a página. **Não refuta o relato do usuário e não revela a causa raiz.** O teste usou Chrome Headless com viewport 764×429 e não cobre necessariamente o navegador, viewport, escala, EPUB ou estado em que o usuário vê o defeito.
- Próxima evidência necessária: repetir com o navegador/viewport/EPUB onde o reset ocorre, partindo da página intermediária e copiando todos os logs `FORENSIC`. Identificar a primeira alteração entre `currentPage`, `targetPage`, transform, `epubPage` e progresso. Não inferir correção funcional deste resultado.
- O driver `.forensic-cdp.cjs` é ferramenta temporária e não deve permanecer no projeto.


## 20. Runtime em Leitura Livre/Reflow — 2026-10-02

### Cenário e confirmação do modo

- Livro: PDF empacotado “Manifesto Comunista”, `bookId=bundled-pdf-391922b2`.
- A biblioteca abriu o seletor “Como deseja ler?”; a opção “Leitura Livre” foi clicada explicitamente. Após o processamento e montagem do documento, a interface exibiu “Leitura livre pronta.” O modo ativo também foi confirmado pelo ramo do adapter (`mime=application/pdf`, `isPdf=true`) e pelo viewer de capítulos Reflow (`chapters=1`). Este ensaio exercita PDF Reflow, não EPUB; EPUB não tem o `pdfReadingMode` no código atual.
- Chrome Headless 154/Windows, página iframe inicial 428×384. O tamanho externo `window.innerWidth × innerHeight` não foi consultado durante este ensaio; não afirmar uma medida exata do viewport externo. Com os controles em fluxo, o iframe reportou 428×228.
- Após o processamento, a paginação estabilizou momentaneamente em 223 páginas. A página foi definida via `iframe.contentWindow.goToPage(15)`; o log do iframe e do Reader confirmou página 15, progresso `0.06306306306306306`, transform `translateX(-5992px)`, largura 428 e altura 384.

### Primeiro clique e sequência observada

No primeiro clique central efetivo, com `controlsVisible=false` e página 15:

1. `[FORENSIC:center-click]` registrou o `onPress` central.
2. `[FORENSIC:toggleControls]` registrou `before=false`, `after=true`, `epubPage=15`; `ReaderScreen` renderizou com página 15.
3. O ramo `flowReflowControls = isReflowPdf && controlsVisible` tornou-se verdadeiro. A árvore muda de `{readerDocument; ReaderControls overlay}` para `<ReaderControls layoutMode="flow">{readerDocument}</ReaderControls>`.
4. No runtime, isso desmontou `DocumentReaderAdapter` e `EpubPageViewer`, destacou o iframe e montou novamente viewer/adapter/iframe. O novo iframe recebeu `srcDoc` (96477 caracteres); o log de identidade é por instância e não prova que o conteúdo serializado mudou em relação à instância anterior.
5. O novo script do iframe iniciou com `currentPage=1`, `targetPage=1`, `totalPages=1`. A altura reportada mudou para 228. O `ResizeObserver` disparou `recalculateLayout`; após fontes/layout, a paginação mudou de 223 para 413 páginas.
6. O novo iframe enviou estado `page=1`. `[FORENSIC:handleEpubPageInfo]` recebeu página 1 com `initialEpubProgress=null` e `isInitialLayout=false` (sem restauração); `[FORENSIC:setEpubPage]` registrou a escrita **15 → 1**, com stack passando por `receiveMessage`. O Reflow não tem variável independente `reflowPage`: sua página lógica é o estado compartilhado `epubPage`/`epubTotalPages`; `pdfPage` pertence ao PDF Original.
7. Também foram observadas mensagens de página 1 e 15 alternando: o iframe informa a página inicial, o pai ecoa seu `pageNumber` via `goToPage`, e as novas mensagens atualizam novamente o estado. Isso gerou milhares de renders/logs. A instância foi encerrada para interromper o ciclo.

### Conclusão sustentada pelo ensaio

Neste cenário, o reset não veio de uma chamada de restauração de progresso. A primeira operação que destrói a posição é o **unmount/remount do documento/iframe ao mudar `controlsVisible` no modo Reflow**; a nova instância inicializa em 1 e publica essa página, que sobrescreve `epubPage` no Reader. O recálculo causado pela nova geometria também altera o total (223→413), mas ocorreu depois do remount e não é a primeira escrita que perdeu a posição. Há ainda um ciclo de sincronização page=1/page=15 após a reconstrução.

O vínculo está sustentado por log runtime e pela condição estrutural em `ReaderScreen.tsx`. O teste não incluiu múltiplos toggles limpos, navegação por botões após o remount, nem resize manual, porque a sequência entrou no ciclo de mensagens. A visualização Original/EPUB do teste anterior preservou a página, mas não serve como comparação direta entre EPUB Original e Reflow: são tipos de documento diferentes. Não foi feita correção nem alteração funcional nesta etapa.


## 21. Correção estrutural e validação em Leitura Livre — 2026-10-02

### Causa confirmada

O clique central alterava `controlsVisible`. No ramo PDF Reflow, `ReaderScreen` também usava essa flag para trocar a posição do `readerDocument`: fechado, ele era irmão de `ReaderControls`; aberto, passava a ser filho de `ReaderControls` no layout `flow`. Essa mudança de ancestralidade desmontava `DocumentReaderAdapter`, `EpubPageViewer` e o iframe. A instância nova começava em `currentPage=1` e reportava essa página ao pai. O resize e repaginação acompanhavam a remontagem; a mensagem `page=1` era o evento que gravava `epubPage 15→1`. Não era uma restauração de progresso.

### Correção

- `ReaderScreen.tsx` mantém o documento Reflow sempre como filho do mesmo `ReaderControls`, selecionando o modo overlay/flow sem mover o documento entre ramos.
- `ReaderControls.tsx` mantém um slot estável para o documento e anima apenas os wrappers dos controles. No layout flow, header/document/footer são organizados verticalmente; no overlay, os controles sobrepõem o documento.
- Os ramos sem documento filho permanecem como antes, preservando a apresentação de EPUB e PDF Original. Parser, cache, navegação e `PdfReflowProcessor` não foram alterados.

### Ensaio após a correção

- Chrome Headless 154/Windows, PDF empacotado “Manifesto Comunista”, modo “Leitura Livre” confirmado, viewport CSS 764×429. A instância Reflow já estava em cache.
- Na página 15, foram feitos 10 cliques centrais para abrir/fechar controles. Página e transform permaneceram na página 15; não houve unmount/remount do adapter/viewer/iframe, detach/attach do iframe nem mudança de `srcDoc` atribuída aos toggles.
- A mudança flow/overlay altera a altura útil do iframe de 384 para 228 pixels. `ResizeObserver`/resize e `recalculateLayout` ocorreram como esperado e o total oscilou entre 223 e 413 páginas, enquanto a página lógica permaneceu 15. Isso é uma mudança de paginação por geometria, não reset para o início.
- Navegação pelas ações reais do footer avançou até página 18; abrir/fechar controles manteve 18. Alterações de tema, fonte e espaçamento também mantiveram a página 18.
- Foi exercitado resize na área do iframe e o recálculo preservou a posição. A alteração efetiva do viewport externo não ficou comprovada (as métricas CSS externas não mudaram); não declarar esse caso como validado.
- Reabertura: a restauração leu progresso salvo e mapeou para aproximadamente página 11, mas mensagens de página 1/11 oscilaram durante a inicialização em uma execução. Isso é uma questão separada do toggle e impede declarar o caso de fechar e reabrir totalmente aprovado. Não foi mascarado nem corrigido nesta mudança.
- EPUB e PDF Original não receberam smoke test de navegador pós-correção. Seus ramos de renderização não mudaram; ainda assim, registrar teste manual desses modos como pendente.

### Resultado

A cadeia anteriormente observada clique → troca de ancestralidade → unmount/remount → iframe inicial em 1 → mensagem `page=1` → `epubPage 15→1` foi removida estruturalmente. O ensaio confirmou estabilidade durante toggles e mudanças de preferências no PDF Reflow. Isso não resolve a oscilação separada de reabertura/restauração nem substitui os testes pendentes em navegador real nos outros modos.

## 22. Tentativa posterior no browser integrado — 2026-10-02

### Ambiente e baseline

- Servidor Expo Web iniciado em `http://127.0.0.1:8086/library`; browser integrado do VS Code, distinto do browser/dispositivo real onde o usuário reproduz o bug.
- EPUB: “Sigmund Freud Na Sua Época E Em Nosso Tempo”, `bundled-epub-1e9e1db1`. A página foi posicionada com a API exposta pelo iframe em `goToPage(15)`, sem clicar 14 vezes.
- Antes do clique, a UI mostrava 15/877 e progresso `0.01598173515981735`. O iframe media 428×516; `#reader-content` tinha `scrollWidth=375356`, page width 428 e transform `translateX(-5992px)`. Havia um iframe, `srcDoc.length=4870676`.

### Um clique central

- A captura de console começou antes do reload de preparação; os eventos anteriores ao clique foram descartados para isolar uma interação. Em `t=1790972257305.0999`, `[FORENSIC:center-click]` registrou o `onPress` central.
- Em seguida, `[FORENSIC:toggleControls]` registrou `before=false`, `epubPage=15`, depois `after=true`; `ReaderScreen` renderizou em `t=1790972257307.5` mantendo página 15, total 877 e progresso `0.01598173515981735`.
- `DocumentReaderAdapter` renderizou em `t=1790972257312` com `epubPage=15` e `changedEpubProps` vazio. `[FORENSIC:controlsVisible]` registrou `false→true` em `t=1790972257335`.
- Após 1,2 s, a UI ainda mostrava página 15/877; transform, `scrollWidth`, largura e altura eram iguais ao baseline. `srcDoc.length` continuava 4.870.676 e o número de iframes continuava 1.
- Não foi observado `EpubPageViewer` render/mount/unmount, nova carga de iframe ou mensagem page no recorte de console capturado. O primeiro `1` não ocorreu neste ensaio. O estado interno lexical `targetPage` não é exposto à página pai e não foi lido diretamente.

### Conclusão e limite

- **Não reproduzido neste browser integrado; não refuta o ambiente real do usuário.** A mudança `controlsVisible=false→true` e rerender do Reader/Adapter, sozinhos e com props EPUB iguais, não alteraram a página nesse cenário.
- Não foi feita correção EPUB; não foram feitos 10 toggles porque esta sessão não produziu o reset e ainda não há correção a validar. Não alterar `transitionend`, clamp, navegação ou árvore com base neste resultado negativo.
- Próxima evidência necessária continua sendo a timeline do browser real: se o primeiro `1` surgir, capturar quem muda primeiro entre estado Reader, página corrente/destino do iframe, total transitório, mensagem atrasada ou transform. A reprodução real confirmada pelo usuário continua sendo a prioridade funcional.

## 23. Flag da instrumentação — 2026-10-02

- Os logs `FORENSIC` nos módulos React e no script gerado para o iframe agora usam `localStorage.epubCenterResetDiagnostics === "1"`; com a chave ausente ou storage indisponível, não escrevem no console.
- Para coletar no browser onde o usuário reproduz: abrir DevTools, executar `localStorage.setItem("epubCenterResetDiagnostics", "1")`, recarregar o Reader, ir a uma página intermediária, limpar o console e fazer exatamente um clique central. Copiar a sequência `[FORENSIC:*]` com timestamps. Depois da coleta, desligar com `localStorage.removeItem("epubCenterResetDiagnostics")` e recarregar.
- A flag só controla logs; não modifica navegação, estado, mensagens ou layout. O ensaio da seção 22 foi feito antes da flag, com logs ativos. A alteração posterior passou no typecheck; não houve nova interação EPUB para evitar repetir o cenário sem necessidade.
