# Importação de livros e OCR

> Módulo de referência. Ler ao mexer em importação, EPUB/PDF importers, Reflow cache ou OCR Android.
> Texto preservado do PROJECT_CONTEXT.md original (2192 linhas, escrito pelo Codex), movido sem reescrita em 06/11/2026. Trate como hipótese: confira Git/código antes de confiar. O estado atual e as pendências estão em [PROJECT_CONTEXT.md](../../PROJECT_CONTEXT.md).

## 4. Importação

Biblioteca → DocumentPicker → LocalBookImportService → EpubFileImporter/PdfFileImporter →
repositories existentes → Biblioteca/Reader. DownloadManager reutiliza esse pipeline.
Fases: selecting/preparing/copying/reading/validating/reading_metadata/persisting/finalizing →
success, error ou cancelled. Remoto acrescenta downloading e terminais equivalentes.
operationId, geração e AbortSignal impedem callbacks antigos e retry depois de cancelar.

Native copia content:// ou file:// para books/temp e move para books/imported com nome
único. Nunca persiste URI temporária como arquivo definitivo nem apaga a origem do usuário.
Web mantém Blob persistente. Falha/cancel limpa temporário/destino próprio, inclusive escrita
nativa tardia; falha de capítulos compensa livro anterior ou oculta o novo incompleto.
Persistência/finalização são deliberadamente não canceláveis. importComplete só é publicado
depois do conteúdo durável. Importar deliberadamente de novo gera outro UUID, sem merge por título.

EPUB valida ZIP/mimetype/container/OPF; preserva metadata, manifest, spine, CSS, fontes,
imagens/SVG/srcset e links internos, com sanitização do HTML. Cache de CSS e resource→data URI
pertence a um único parse. Capítulos/recursos são processados com concorrência limitada e
yield cooperativo; cancelamento chega ao validador e às leituras ZIP. A API de ZIP corrente
pode terminar seu trabalho interno, mas não inicia etapas posteriores após abort.

O Reader já combina os capítulos em um documento: regras @font-face idênticas são
persistidas apenas na última posição original, preservando ordem e condições CSS.
Não descartar CSS/fontes nem remover recursos para reduzir memória. Fixture de 91 capítulos:
127.262.661 → 1.422.501 bytes de HTML, fontes 182→2 leituras, CSS 91→1, concorrência 182→1.
Amêndoas real e Android continuam pendentes; a fixture não é o arquivo pessoal.
PDF valida assinatura %PDF e usa o fluxo existente; importação não processa Reflow/OCR.
Percentual existe somente com total de bytes conhecido; demais etapas são indeterminadas.
Native EPUB lê Uint8Array pela API assíncrona File.bytes do Expo instalado, sem intermediários
Base64/atob/Uint8Array.from na thread JS. A leitura nativa em curso não é interrompível;
abort impede iniciar parse/publicação de seu retorno tardio. O ZIP e o documento completos
ainda precisam caber em memória; isto não demonstra capacidade ilimitada ou Amêndoas físico.


## 10. OCR

Android: aldus-pdf-ocr, PdfRenderer e ML Kit Text Recognition v2 latino empacotado 16.0.1.
Reconhecimento é local, página a página, com bitmap limitado e geometria no sistema PDF.
PDF híbrido reconhece somente páginas necessárias; usuário escolhe Reconhecer texto ou
continuar no Original. Web declara indisponibilidade; não simula OCR.

Estados: TEXT_VALID, OCR_REQUIRED, OCR_PROCESSING, OCR_VALID, OCR_INSUFFICIENT,
PROCESSING_ERROR. Cache/processador v12 valida proveniência text-extraction/ocr/hybrid,
engine/versão, páginas e qualidade; rejeita cache antigo/parcial/inconsistente.
Abort impede novas páginas/publicação; tarefa ML Kit corrente não expõe cancelamento e
seu retorno é descartado/liberado. Não inventar texto nem promover extração ilegível.
Temporários OCR têm nome único por operação. Escrita Native não interrompível que termina
após unmount/abort remove o próprio arquivo; escrita parcial com erro também tenta limpeza.
Não reutilizar o nome de outra operação nem apagar PDF de origem. Data URI exige staging,
não é um caminho de arquivo local para PdfRenderer.

Sociedade/Manifesto têm extração textual inválida conhecida; Original continua disponível.
Gates controlados/compilação não demonstram OCR visual físico. Conteúdo/reconhecimento não
é enviado para OCR remoto; o SDK pode comunicar métricas técnicas/compatibilidade.
Revisão dos transitivos nativos/Data safety e validação no Android continuam necessárias.
