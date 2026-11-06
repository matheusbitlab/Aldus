# Reader — EPUB, PDF Original e PDF Reflow

> Módulo de referência. Ler antes de mexer em Reader, âncoras, Reflow ou controles.
> Texto preservado do PROJECT_CONTEXT.md original (2192 linhas, escrito pelo Codex), movido sem reescrita em 06/11/2026. Trate como hipótese: confira Git/código antes de confiar. O estado atual e as pendências estão em [PROJECT_CONTEXT.md](../../PROJECT_CONTEXT.md).

## 3. Reader

ReaderScreen abre pelo OpenBookUseCase; DocumentReaderAdapter escolhe EPUB, PDF Original
ou PDF Reflow. EPUB usa EpubPageViewer.web/native e o documento combinado
EpubReaderDocument, em iframe sandboxed na Web e WebView no Native. O HTML é memoizado
pela lista de capítulos; configurações tipográficas chegam por mensagem, sem recriar o viewer.

PDF Original usa o arquivo fonte e página/zoom próprios. Reflow é derivado separado,
criado somente por escolha, com extração por plataforma, builder, assinatura do arquivo,
versão de processador e cache validado. Falha/extração ilegível/OCR insuficiente volta ao
Original. Não confundir página fonte do PDF com paginação dinâmica do Reflow.

Restauração retém intenção persistida até layoutReady e ACK do destino; mensagens
provisórias não salvam posição. O documento vivo passa a conduzir navegação após ACK.
Original/Reflow mantêm posições independentes. Gravação confirmada é direta, sem debounce
que descarte o último avanço ao sair; updates funcionais preservam as configurações atuais.
Barra distingue preview de commit; origem/operação descartam mensagens ultrapassadas.
Página 1 legítima não pode ser bloqueada por filtro global. Largura de coluna é fracionária,
medida por getBoundingClientRect, e totais usam fragmentos reais para evitar coluna fantasma.

Controles são overlays estáveis: visibilidade muda opacidade/interatividade, sem trocar
ancestralidade, key ou viewport documental. Insets de Safe Area são aplicados uma vez;
wrappers absolutos têm limites completos. No Native, controles usam View/opacidade literal
no caminho já validado, conservando a animação Web. Helpers enviados a WebView são código
literal portátil: Function.toString de Hermes não é fonte JavaScript.

AppThemeContext e ReaderSettingsContext são separados. Temas do livro incluem Papel,
sépia/claros/escuros; e-reader é atalho de aparência, não emulação de hardware e-ink.
Brilho Web é luminosidade da página; Native aplica/restaura brilho da sessão e respeita
AppState/cleanup. Tema/fonte/brilho não comandam restauração nem remontam documento.

Preparação Reflow permanece cancelável até confirmar cache e preparar HTML. Plano OCR,
qualidade, builder, conversão de blocos/HTML e serialização SQLite cooperam em fatias de
CPU; Native usa idle com prazo e não setImmediate/microtasks. O cache usa record.id como
bookId no guard de conta, transação exclusiva SQLite e oncomplete IndexedDB, sem sucesso
em memória. Cancelar durante gravação faz rollback antes do commit; cache confirmado
anterior não é apagado. Retorno antigo não publica após Back/troca de modo/livro/unmount.
Leitura geométrica e WebView/base64 da extração são liberados antes da fase final.
Assinatura do cache é SHA-256 do conteúdo, inclusive antes do primeiro upload atribuir
fileHash ao livro. Quando ausente, localFingerprint reutiliza o driver/hash em blocos,
somente leitura, com conta/abort; não grava metadata nem altera fila. Primeira sincronização
não invalida o mesmo derivado. Budget de CPU usa relógio monotônico, não relógio civil.
JSON.parse do cache, clone IndexedDB, flatten final e primeiro layout continuam tendo
custo proporcional ao documento; não prometer suporte ilimitado ou validação Android.

EPUB possui marcadores/notas, grifos/cores/comentários, seleção e export/import por livro.
Âncoras exact/relocated permitem retorno; ambiguous/missing exigem aviso e nunca navegação
silenciosa. Importação de estudo é transacional/idempotente. PDF Original tem marcador
por página; seleção/grifos mapeados entre PDF e Reflow ainda não equivalem ao suporte EPUB.

Motion cues é experimental/manual, desligado por padrão. DeviceMotion Android, preferência
reader.motionCues.enabled, processamento em memória e overlay pointerEvents=none acima do
Reflow. Hidratação/foco/foreground/permissão controlam sessão e cleanup; não simular sensor
indisponível. Amostras não mudam documento/progresso. Eficácia anti-enjoo não foi demonstrada.
