# Investigação do progresso salvo em PDF Reflow no Web

Data: 2026-10-02

## Escopo

Investigar a oscilação de página na sequência fechar → reabrir um PDF em Leitura Livre. Não alterar a implementação. Este problema é separado do reset ao abrir/fechar os controles, registrado em `BUG_CONTEXT_EPUB_CENTER_RESET.md`.

**Proveniência:** a sequência 1↔11 detalhada abaixo foi recuperada de logs runtime já existentes em `.expo/dev/logs/start.log`, gerados na sessão anterior que observou a reabertura; o relatório daquela sessão não havia analisado os eventos. Nesta continuação tentei uma sessão Chrome isolada, mas a preparação do primeiro cache/layout Reflow e a desconexão do browser impediram completar as novas aberturas e a matriz de páginas. Portanto a cadeia abaixo é evidência runtime preservada e examinada agora, não uma nova reprodução controlada nesta continuação.

## Persistência identificada

O repositório de progresso persiste `percentage`, `pageNumber`, `currentChapterId`, `cfiPosition` e `updatedAt` (`ReadingProgress`). Para PDF Reflow, `ReaderScreen.handleEpubPageInfo` calcula `percentage = (page - 1) / (totalPages - 1)` e agenda a gravação do número e percentual; `UpdateReadingProgressUseCase` persiste ambos. No cenário runtime registrado, `OpenBookUseCase` devolveu progresso com percentual `0.058333333333333334`. A gravação havia ocorrido na página 15 de 241 (15ª página => `(15-1)/(241-1)`), portanto o valor corresponde à página 15 naquele total. O log existente não imprimiu o campo `pageNumber` diretamente no momento da leitura; não afirmar que ele foi inspecionado no registro em runtime.

Na reabertura, `ReaderScreen` lê `result.progress.percentage` e usa o percentual como fonte para `initialEpubProgress`. `pageNumber` salvo não participa do cálculo de restauração. O primeiro total recebido do iframe é usado para converter o percentual em página.

## Sequência runtime observada

Os horários abaixo são `performance.timeOrigin + performance.now()` dos logs capturados em Chrome Headless 154/Windows, PDF empacotado Manifesto Comunista (`bundled-pdf-391922b2`), Leitura Livre/Reflow. A abertura anterior deixou a página 15 e percentual 0.058333333333333334; a sequência seguinte é a reabertura que apresentou a oscilação.

| Timestamp | Evento | Estado relevante |
|---:|---|---|
| 1790953096807.6 | `restoreProgress` | `progress=0.058333333333333334`, `epub=false` (PDF Reflow) |
| 1790953096814.2 | Reader pronto | `initialEpubProgress=0.058333333333333334`, `epubPage=1`, total ainda 0 |
| 1790953096867.3 | `EpubPageViewer` mount | um viewer/iframe novo; `srcDoc` gerado; iframe recebe `goToPage(1)` inicial |
| 1790953098216.7 | `iframe.onload` | viewer envia `display`, `goToPage(1)` e tipografia |
| 1790953099687.4 | page info do iframe | `page=1`, `total=165` |
| 1790953099688 | primeiro layout aceito | Reader converte 0.058333… com total 165 para página 11; consome `initialEpubProgress` e grava `epubPage 1→11` |
| 1790953099715.1 | efeito do viewer | envia `goToPage(11)` ao iframe |
| 1790953099732.8 | page info do iframe | chega `page=1`, agora `total=241`; `initialEpubProgress=null` e `epubTotalPages` anterior é 165 |
| 1790953099737.7 | escrita no Reader | `setEpubPage 11→1` por `handleEpubPageInfo`, stack `receiveMessage` |
| 1790953099767.5 | efeito do viewer | envia `goToPage(1)` |
| 1790953099777.2 | page info do iframe | chega `page=11,total=241`; `setEpubPage 1→11` |
| 1790953099814.8 | efeito do viewer | envia novamente `goToPage(11)` |
| 1790953099834.3 | page info do iframe | chega `page=1,total=241`; `setEpubPage 11→1` |
| 1790953099860.3 | efeito do viewer | envia `goToPage(1)`; as mensagens 1/11 seguem alternando |

O restante da captura confirma repetição de `page=1`/`page=11`, com stack de escrita passando por `handleEpubPageInfo`/`receiveMessage`. A rotina `recalculateLayout` não apareceu no trecho de log preservado para este segundo de oscilação. A alteração de total 165→241 é confirmada pelas mensagens de page info; a causa exata da diferença de contagem (qual evento de layout/fonte específico a produziu) não está demonstrada neste recorte.

## Respostas causais

### Causa confirmada

Há uma corrida entre o primeiro page info e a paginação subsequente do iframe. O Reader consome o progresso salvo no primeiro total não zero (165) e o converte para página 11. Antes de o comando de restauração consolidar a posição no iframe, chega outro page info do iframe dizendo página 1, agora com total 241. Como o marcador de restauração já foi consumido, `handleEpubPageInfo` trata esse `1` como estado atual normal e substitui 11 por 1. O comando `goToPage(11)` já havia sido enviado; sua resposta depois repõe 11. Os efeitos pai→iframe e as mensagens iframe→pai então realimentam ambas as posições e os logs mostram a alternância.

### Quem escreve cada página

- **Página 11 inicial:** `ReaderScreen.handleEpubPageInfo`, ao aplicar `initialEpubProgress` ao primeiro page info (`totalPages=165`). É uma restauração proporcional, não uma mensagem do iframe afirmando 11 como posição inicial.
- **Página 1 que derruba a posição restaurada:** `ReaderScreen.handleEpubPageInfo`, chamado pela mensagem `page=1,total=241` recebida em `EpubPageViewer` (`receiveMessage`). A chamada ocorre depois que `initialEpubProgress` foi limpo.
- **Página 11 subsequente:** outra mensagem do iframe (`page=11,total=241`) após o `goToPage(11)` que o Viewer enviou em resposta à renderização do pai.
- **As alternâncias seguintes:** comandos `goToPage(pageNumber)` de `EpubPageViewer` intercalados com page info que já estava em trânsito no iframe. O writer do estado React é sempre `handleEpubPageInfo`/`setEpubPage`; a origem alternante são os comandos parent→iframe e as respostas do iframe.

### Valor salvo versus página restaurada

Percentual salvo: `0.058333333333333334`. Com 241 páginas, esse percentual corresponde à página 15; com o primeiro total 165 recebido na reabertura, o algoritmo atual calcula a página 11. Portanto o primeiro total é provisório para a geometria final observada e produz uma página restaurada intermediária. O estado salvo por percentual está correto para a página 15/241; o total inicial 165 não representa o total posterior 241.

### Fonte de verdade conceitual

Durante a inicialização, o progresso persistido deve permanecer como intenção de restauração até que o Reflow tenha informado uma paginação utilizável e o comando de restauração tenha sido aplicado. Antes dessa confirmação, page info inicial em trânsito não deve substituir a intenção salva. Depois que a posição é aplicada ao iframe e confirmada, a página viva do documento deve conduzir a navegação normal. Essa é uma proposta de contrato; nenhuma alteração foi feita.

## Limitações e cobertura

- A captura preservada com a cadeia causal acima cobre uma reabertura com progresso 0.058333…/página 15 e total mudando de 165 para 241. É evidência runtime concreta de 1↔11, mas veio da sessão anterior, não de uma repetição nova nesta continuação.
- Não foi concluída nesta sessão uma matriz repetida para páginas 5, 15, 18 e próxima do final. O primeiro ensaio em perfil isolado estava ainda preparando o documento/cache Reflow; depois o processo/browser headless perdeu conexão enquanto o viewer produzia renders. Esses resultados não contam como reaberturas adicionais.
- Os logs existentes não registram evento explícito de fechar a rota nem valor `progress.pageNumber` lido; a transição para a nova instância é comprovada por novo mount/render e novo `iframe.onload`, não por timestamp de CLOSE.
- Os logs mostram `initialEpubProgress` e `epubTotalPages`, mas não oferecem todos os campos num único evento estruturado (`savedPage`, total antes/depois e origem). Não foi acrescentada instrumentação porque a sequência já confirmou a escrita causal para este cenário, e a solicitação proíbe corrigir antes da aprovação.
- Os valores de total 165 e 241 foram reportados pelo iframe. A ligação entre 165 e uma fase específica de fontes/layout é hipótese coerente com `recalculateLayout` do documento, mas requer nova captura conjunta desse evento se for necessário provar a subcausa da mudança de total.

## Correção estrutural a avaliar — não implementada

Separar a intenção de restauração do estado de página ao vivo: preservar percentual salvo (ou posição salva) durante a medição inicial, aguardar um sinal explícito de paginação/layout pronto do Reflow e então converter a intenção com o total considerado válido e enviar um único comando de navegação ao iframe. Somente após confirmação desse comando passar a aceitar page info como posição corrente. Evitar usar o primeiro total não zero como “layout definitivo” sem handshake; não ignorar page=1 globalmente, não usar temporizadores/retries e não restaurar artificialmente uma página antiga depois que a posição foi perdida.

Nenhuma alteração de código funcional foi feita para esse problema.

## Implementação da restauração determinística — 2026-10-02

### Arquitetura aplicada

A proposta de handshake documentada acima foi implementada para PDF Leitura Livre/Reflow. Há três fases no Reader:

1. `pending`: o progresso salvo permanece como intenção. Page info sem `layoutReady` não altera página, total, progresso nem cache de restauração.
2. `applying`: recebido o primeiro page info com `layoutReady=true`, o Reader converte o percentual salvo usando o total informado, envia a página destino pelo prop normal `epubPage` e retém o alvo `{page,totalPages}`. Page info diferente do alvo não é aceito como posição viva. Se um total mais recente chegar antes do ACK, o alvo é recalculado para esse total.
3. `inactive`: só após page info do iframe confirmar a página e o total-alvo, a intenção salva é consumida e o Reader volta a aceitar page info normalmente. Um comando `completeInitialRestore` libera o iframe da proteção de inicialização.

O iframe começa com `restorationPending` embutido no HTML do documento Reflow, evitando uma janela entre o mount e `iframe.onload`. Durante essa fase, o Viewer não envia `goToPage(1)` como comando inicial e espera `layoutReady`. O iframe declara prontidão após `document.fonts.ready`, imagens do conteúdo terem concluído load/error e um `requestAnimationFrame` seguido de recálculo. Page info provisório inclui `layoutReady=false`. O ACK da navegação faz a transição para estado normal.

O recálculo agora lê `currentPage` quando o frame de layout é efetivamente aplicado, em vez de capturar uma página possivelmente antiga ao agendar o `requestAnimationFrame`. Durante a restauração pendente, atualização tipográfica aguarda a conclusão das fontes e usa recálculo de layout, sem atraso temporal novo e sem reaplicar uma página capturada antes do destino. O caminho tipográfico normal, depois do ACK e nos demais documentos, foi mantido.

### Compatibilidade de escopo

- O handshake `initialRestorePending` é ativado somente no caminho PDF Reflow. EPUB continua usando seu fluxo anterior de posicionamento; PDF Original não passa pelo `EpubPageViewer`.
- A estrutura estável de `ReaderScreen`/`ReaderControls` não foi modificada nesta implementação. O documento Reflow continua no slot estável usado pela correção do bug dos controles.
- Navegação após ACK, tema e alterações tipográficas continuam usando o mesmo estado de página e as mesmas APIs de navegação.
- Não houve filtro global para `page=1`, timeout, retry ou página fixa.

### Validação

- `npm.cmd run typecheck`: passou na versão final.
- `npm.cmd run export:web`: passou na versão final; export e cópia dos 34 livros concluídos.
- Chrome e Edge headless foram tentados para o ensaio Web, mas encerraram antes de renderizar a aplicação: ambos reportaram falha fatal do processo GPU (`GPU process isn't usable`). Nenhum teste de reabertura após a implementação foi concluído neste ambiente.
- Portanto os casos de página baixa, intermediária e próxima do final e a repetição dos toggles de controles permanecem pendentes. Não declarar a correção confirmada/resolvida até observar no navegador uma reabertura sem oscilação e os controles preservando a posição.
- `git diff --check`: passou após atualização do documento.

Nenhum resultado de runtime pós-implementação foi inventado; a validação funcional continua necessária em um navegador com processo gráfico funcional.

### Tentativa de validação em navegador — 2026-10-02

Esta continuação não confirmou nem refutou a correção. O Expo iniciou em `http://127.0.0.1:8084`; `GET /library` respondeu HTTP 200. Tentei abrir a rota com perfis isolados:

- Chrome não headless: `"C:\Program Files\Google\Chrome\Application\chrome.exe" --no-first-run --no-default-browser-check --disable-background-networking --remote-debugging-address=127.0.0.1 --remote-debugging-port=9350 --user-data-dir=C:\KIndle\.restore-validation-nonheadless http://127.0.0.1:8084/library`. O Chrome anunciou `DevTools listening on ws://127.0.0.1:9350/...`, mas encerrou a sessão logo depois. stderr: `GPU process exited unexpectedly: exit_code=-1073741790`, repetidas falhas ao abrir o cache persistente e `FATAL ... GPU process isn't usable. Goodbye.` O endpoint CDP já não respondia após 10 s. O código de saída do processo principal não foi obtido.
- Chrome não headless com tentativa de renderização por software: `"C:\Program Files\Google\Chrome\Application\chrome.exe" --no-first-run --no-default-browser-check --disable-background-networking --disable-gpu --disable-gpu-compositing --use-gl=angle --use-angle=swiftshader --disable-features=Vulkan,UseSkiaRenderer --remote-debugging-address=127.0.0.1 --remote-debugging-port=9351 --user-data-dir=C:\KIndle\.restore-validation-sw-chrome http://127.0.0.1:8084/library`. Mesmo erro fatal de GPU apesar das opções; CDP indisponível após 8 s. Código de saída do processo principal não obtido.
- Edge headless: `"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --headless=new --disable-gpu --no-first-run --no-default-browser-check --disable-background-networking --remote-debugging-address=127.0.0.1 --remote-debugging-port=9352 --user-data-dir=C:\KIndle\.restore-validation-edge-final http://127.0.0.1:8084/library`. O endpoint CDP chegou a listar um alvo `page` em `/library`, portanto houve navegação inicial para a rota, mas não foi possível inspecionar/renderizar o app nem interagir antes da falha GPU fatal equivalente; CDP parou de responder. Código de saída do processo principal não disponível nesta tentativa.
- Repetição Edge headless: `"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --headless=new --disable-gpu --disable-gpu-compositing --no-first-run --no-default-browser-check --disable-background-networking --remote-debugging-address=127.0.0.1 --remote-debugging-port=9353 --user-data-dir=C:\KIndle\.restore-validation-edge-exit http://127.0.0.1:8084/library`. Processo principal PID 7764 continuava ativo após 15 s (`EXITED=False`), mas CDP expirou. stderr terminou com `FATAL ... GPU process isn't usable. Goodbye.` O subprocesso GPU reportou exit code `-1073741790` (`0xC0000022`, acesso negado); o navegador principal não forneceu código de saída dentro do prazo.

Os stderr também contêm avisos de criptografia/password store indisponível e falha de acesso à chave Google Update. Os perfis foram distintos entre tentativas. Não foi exercitado o Manifesto Comunista, seleção Leitura Livre, reabertura em posições diferentes, controles, navegação/estilo, PDF Original ou EPUB; nenhum resultado funcional deve ser inferido da resposta HTTP ou da existência temporária do alvo CDP. `npm.cmd run typecheck`, `npm.cmd run export:web` e `git diff --check` haviam passado na versão implementada antes desta tentativa; esta atualização é apenas documental.

**Status:** implementação concluída, validação funcional pendente. Repetir a matriz em um ambiente em que Chrome/Edge mantenha o processo gráfico e a sessão DevTools ativos.
