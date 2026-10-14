# Diagnóstico de Pendências Android — 2026-10-12

Produto desta etapa: evidências, classificação de causas e contexto para uma futura correção. **NENHUMA CORREÇÃO FUNCIONAL FOI APLICADA NESTA ETAPA.** Não foram alterados código, testes, configuração, OAuth, crawler, parser, UI, migrations, RLS, Storage ou outbox. Nenhum commit, push ou APK novo; esta documentação é a única alteração não ignorada. Os scripts diagnósticos são externos ao app e estão em diretório ignorado.

Este documento contém os resultados completos, sem depender de relatórios históricos para entender a investigação. Os JSONs/profiles citados conservam detalhes adicionais. Sintomas físicos são relatos do usuário; reproduções Node/públicas/estáticas estão identificadas separadamente. PASS controlado não comprova correção ou execução física.

## Estado do Git

- Branch auditada: `main`.
- HEAD integral: `13fce8851c5e5bf9a21a0b26b87f48ded02437a9`; mensagem `feat: add navigable Drive folders and local source search`.
- Antes de investigar: `git status --short`, `git diff --stat` e `git diff --name-only` vazios. `git branch --show-current`, `rev-parse HEAD`, `log --oneline -30` executados. `git cat-file -t 5cfb961` e `13fce88`: ambos `commit`.
- Commits relevantes presentes/ancestrais: `de56b95` (Library/organização/Reader), `a974e49` (ciclo de importação), `9be9339` (progresso de importação), `3441fb9` (Drive), `712c5ba` (Drive→import), `ba2be45` (catálogo persistido), `35f3902` (Source Library), `73f6dfe` (ações da fonte), `3be78c6` (escopo por conta), `d77f6e8` (modelo remoto/migration001), `94b6ecb` (engine), `1e5cae9` (arquivos/migration002), `2f21182` (leitura), `4313397` (UI Sync/Opções), `0b6b20b` (testes), `eab97ee` (checkpoint Sync), `5cfb961` (callbacks/autorização Android), `13fce88` (árvore Drive).
- Refs disponíveis: `main`, `origin/main`, `origin/HEAD`; `origin/main` em `566e8a6`. Worktree adicional `C:/a1`, detached em `d77f6e8`, anterior ao HEAD; inspecionado somente por leitura. Não houve fetch/checkout/limpeza desse worktree.
- Relatórios antigos não identificam o aplicativo instalado nem o estado remoto atual. O usuário agora informa Google Auth funcionando fisicamente; não reutilizamos o antigo diagnóstico de callback como causa desta tentativa Drive.

## APK investigado

**APK INSTALADO — IDENTIDADE INCONCLUSIVA.** `C:/Android/sdk/platform-tools/adb.exe devices -l` retornou apenas o cabeçalho, sem dispositivos. Não foi possível obter package instalado, versão/código físicos, certificado, firstInstallTime/lastUpdateTime, base APK, logcat, sessão, banco ou outbox do telefone. Nenhuma instalação/reinstalação/limpeza de dados foi executada.

O **APK arquivado**, que é diferente dessa identidade física desconhecida, foi identificado:

| Campo | Evidência local |
|---|---|
| Arquivo | `C:/KIndle/artifacts/apk/Aldus-13fce88.apk` |
| Commit | `13fce8851c5e5bf9a21a0b26b87f48ded02437a9` |
| Bytes | 251.622.870 |
| SHA256 novamente medido | `05a4bc5ea2e8277fbc9a9d9673be48ac47f5fb8620f3d6e233abc0270c8019d6` |
| Manifest | `com.aldus.reader`, versionName `1.0.0`, versionCode `1`, release local, debuggable=false |
| Certificado SHA1 | `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25` |
| Callback | scheme `aldus`, MainActivity singleTask, exported/VIEW/BROWSABLE |
| Assinatura/ledger | apksigner verify exit0 registrado; build oficial PASS e hash/path/bytes vinculados ao commit em `artifacts/apk/checkpoint.jsonl` |
| Bundle | 7.112.780 bytes; SHA256 `582a9ce52d044afc22a11f148206eb6ab64eaa1ba4293902300c5369ef973b63`; igual ao release gerado |
| Fonte compilada | Source maps do Drive e da Library conferem com HEAD; strings residuais presentes no bundle Hermes |

APKs locais recentes: `13fce88` 251.622.870 bytes; `5cfb961` 251.604.238; `eab97ee` 251.587.130; `0b6b20b` 251.591.062. O nome externo do arquivo/ledger identifica o artefato arquivado, não a instalação Android.

`app.json:5–9`, `android/app/build.gradle:95–96` e `src/legal/appMetadata.ts:3–8` conservam versão genérica `1.0.0`/code1. A tela Sobre mostra versão/build, sem hash de commit. Esses valores não permitem distinguir os checkpoints. Quando houver aparelho, coletar somente identidade por `pm path com.aldus.reader`, `dumpsys package` com campos selecionados, pull do base APK para diretório ignorado, hash e apksigner; comparar com o ledger. Não usar reset/reinstall como método de diagnóstico.


## Problema A — EPUB Amêndoas


Auditoria de 12/10/2026. Somente leitura do código e execução de um harness externo em diretório ignorado. Nenhuma alteração no parser, importador, UI, algoritmo, flags de produção, cancelamento, recursos, Reader ou persistência. Não houve commit.

### A. Sintoma e limite da reprodução

Relato físico: Biblioteca → Importar → `Amêndoas - Won-pyung Sohn.epub` (~1,3 MB) deixa o modal em “Lendo arquivo...” e congela o aplicativo; Cancelar não responde e o livro não aparece. Outro EPUB funciona no mesmo aparelho.

**Amêndoas não está disponível nesta máquina nos locais pesquisados.** Foram enumerados somente nomes/metadados de EPUBs, com normalização NFKD dos nomes e busca de `Amêndoas`, `Amendoas`, `Sohn`, `Won-pyung` e `almond`, em `C:\KIndle` (inclusive arquivos ignorados/artefatos/testes), `C:\Users\mrtep\Downloads`, `Desktop`, `Documents`, `OneDrive` e `.codex\attachments`. Em Desktop\Livros/assets\Livros foi encontrado apenas o EPUB Freud de 778.941 bytes, além de suas cópias de build. Busca textual em docs/scripts/fontes/artefatos não encontrou o diagnóstico histórico nem um caminho real para Amêndoas. Não foi feita varredura de conteúdo do perfil ou de sessões pessoais. Nenhum EPUB pessoal foi copiado para o Git.

Logo, **91 XHTML/88 capítulos/CSS/fontes do EPUB Amêndoas continuam evidência histórica relatada, não contagem revalidada do arquivo real**. ADB sem dispositivos nesta auditoria; APK instalado com identidade inconclusiva. O freeze específico no Android não foi reproduzido. Foi reproduzido um mecanismo compatível no parser atual com fixture sintética declarada abaixo.

### B. Pipeline exato e estados

1. `src/presentation/hooks/useBookImport.ts:30` chama `DocumentPicker.getDocumentAsync`, com `copyToCacheDirectory: true` (:32). Cria `BookImportLifecycle` e passa URI/nome/MIME/tamanho/Blob para `localBookImporter.import` (:39), signal e onPhase (:49). Cada callback aceito publica `setState` (:16).
2. `src/presentation/services/dependencies.ts:61` instancia `ImportEpubUseCase(new EpubParserService(), bookRepository, chapterRepository)`. `EpubFileImporter` em :71 e `LocalBookImportService` em :74 são as instâncias utilizadas pela Library.
3. `src/data/imports/LocalBookImportService.ts:41` publica preparing, detecta EPUB por MIME/extensão/assinatura (:117), cria diretórios `books/temp/` e `books/imported/` (:63), publica copying (:76), copia a URI DocumentPicker → temp e move temp → imported (:77/:85). Depois chama `epubImporter.importFromUri` (:100). Copiar/mover são envolvidos por withAbort; operações nativas não necessariamente são interrompidas, mas arquivos tardios são limpos nas branches de cancelamento (:81/:89).
4. `src/data/epub/EpubFileImporter.ts:33` publica **reading**, cancellable=true. Esta fase engloba `FileSystem.getInfoAsync` (:34) e `readBytes` (:39). Android: leitura do arquivo inteiro como Base64 via `FileSystem.readAsStringAsync` (:99), depois `atob` e `Uint8Array.from` síncronos (:101). Web: Blob.arrayBuffer ou fetch/arrayBuffer. A conversão nativa de bytes roda na thread JS. Após bytes e verificação de conta, chama `ImportEpubUseCase.execute` (:55).
5. `src/domain/usecases/ImportEpubUseCase.ts:23` publica **validating antes de chamar o parser** (:28). `withAbort` recebe a Promise de parse, mas o parser não recebe signal. A fase validating cobre ZIP, mimetype, container, OPF, metadata, manifest, spine, leitura dos capítulos e todos os recursos/CSS/Base64/rewrite.
6. `src/data/epub/EpubValidatorService.ts:11` abre ZIP via JSZip.loadAsync, valida mimetype (:13), presença/formato container (:15/:17), e OPF apontado (:18/:19). A produção não habilita `checkCRC32`; o harness estrutural habilitou para a fixture e Freud. Não confundir validação estrutural do harness com validação extra de produção.
7. `src/data/epub/EpubParserService.ts:11` aguarda validator. Lê container e OPF (:13/:16), extrai título/autor (:18/:19), cria manifest Map (:22), percorre spine sequencialmente (:25), lê XHTML/normaliza/extrai texto (:31/:32) e descarta capítulos sem texto (:33). Só depois inicia resolução paralela dos recursos (:47).
8. Apenas depois de TODO parse terminar o use case publica **reading_metadata** (:33). Neste estado metadata/chapter extraction já terminaram: a fase cobre buscar o livro anterior, construir `LibraryBook` e `StoredChapter[]` (:35–:39). Publica **persisting**, cancellable=false, em :41; `books.save` (:46) → `chapters.replaceForBook` (:47), rollback em falha (:49), save final `importComplete=true` (:62/:63). SQLite grava o HTML completo de cada capítulo numa transação, `src/data/repositories/SqliteChapterRepository.ts:7`; Web usa `webReplaceChaptersPersistent`, `src/data/repositories/IndexedDbRepositories.ts:31`.
9. Hook publica finalizing depois do retorno (:54), success (:56), e reload Library sem aguardar (:59). Reader/srcDoc não é chamado durante a importação. Ao abrir um livro depois, `src/presentation/components/EpubReaderDocument.ts:19` mapeia capítulos, extrai body/styles (:20/:21) e concatena todos (:33); isso pode criar outra representação grande, mas não foi medido neste diagnóstico de importação.

**Texto exato:** `src/domain/types/bookImport.ts:73`: reading → `Lendo arquivo…`; validating → `Validando arquivo…` (:74). `src/presentation/components/BookImportModal.tsx:30` renderiza bookImportPhaseLabel. O label observado fisicamente não prova qual chamada está parada: callback/setState de validating ocorre antes do parser, porém não garante que React/Android já pintou o próximo frame. Microtasks e trechos síncronos longos podem conservar “Lendo arquivo...” na tela. A observação, isoladamente, não descarta parser nem prova APK antigo.

### Cancelar e event loop

`BookImportModal.tsx:41` efetivamente renderiza Cancelar quando `state.cancellable=true`, chamando `useBookImport.cancel` (:75) → `BookImportLifecycle.cancel` (:72). O lifecycle chama controller.abort (:74) e publica cancelled (:75). `src/core/utils/cancellation.ts:6` rejeita o caller quando recebe abort; **não encerra o parse subjacente**. `EpubParserService.parse(bytes)` não tem signal, checkpoint de cancelamento ou operação de Worker; `Promise.all` não move processamento para outra thread. Await de Promise resolvida/microtask não garante frame/macrotask para eventos de toque.

Portanto há dois limites distintos: (a) JS bloqueado atrasa o handler de Cancelar e qualquer render/navegação; (b) se o handler puder rodar, withAbort pode liberar o caller, mas o parser iniciado continua consumindo CPU/memória até terminar/falhar. Não foi simulada a interação de toque Android neste harness.

`node scripts/test-book-import.cjs` passou: guards de terminal/stale, cancelamento começo/meio e limpeza, formatos/URI/extensão/erro/rollback. Este teste usa importadores/repositórios controlados; não exercita o parser pesado ou o aparelho físico, portanto não resolve nem descarta o freeze relatado.

### C. Parser atual: respostas objetivas

| Pergunta | Resposta no código atual |
|---|---|
| Quantos capítulos simultâneos? | Todos os capítulos legíveis do spine são iniciados via `Promise.all(chapters.map(async ...))`, `EpubParserService.ts:47`. Não há limite de concorrência. A leitura inicial de XHTML em :25 é sequencial. Na fixture, 91 tarefas de capítulo; 88 operações Base64 de recurso simultaneamente em andamento. Não são 91 threads. |
| Stylesheet repetido? | Sim. Cada capítulo cria novo manifestByPath (:105) e lê/processa seu `<link rel=stylesheet>` (:116/:123). Nenhum cache de stylesheet por livro/path. |
| Fonte repetida? | Sim. Cada `url(...)` interno do CSS chama getResourceDataUri (:190/:194), que faz `file.async("base64")` (:222) em cada referência. Fixture: 2 fontes × 88 referências CSS = 176 chamadas. |
| Cache resource → data URI? | Não existe no parser. `visited` (:170/:206) protege recursão de CSS/SVG; não é cache de conteúdo e não é compartilhado entre capítulos. JSZip instalado também cria novo stream/decompress worker para cada async: `node_modules/jszip/lib/zipObject.js:74/:114`, `compressedObject.js:30`. |
| CSS duplicado por capítulo? | Sim. Cada `<link>` vira `<style>${styles}</style>` com recursos Base64 embutidos, :124. Depois o loop de `<style>` (:157) reanalisa inclusive os styles acabados de inserir; data: é reconhecido como externo por isExternalResource (:286) e não reconvertido, mas o texto grande é varrido/replace novamente. |
| Expansão N × recursos? | Sim, confirmada por código e fixture. CSS/URI de font não é uma referência compartilhada persistida: o HTML final de cada capítulo contém o mesmo Base64 integral. Um cache de conversão isolado pode reduzir CPU, mas não elimina por si só a duplicação no HTML persistido. |

Há outros `Promise.all` em srcset (:140), mas a fixture não usa srcset/SVG/@import e não depende dessas branches para a expansão observada. `replaceAt` (:290), strings/styles, regex sobre documento expandido e rewriteChapterLinks (:294) executam JS síncrono. CSS @import/SVG usam sets para interromper ciclos; não foi encontrado loop infinito inevitável por simplesmente compartilhar o mesmo CSS.

### D. Reprodução externa e medidas

Harness ignorado: `artifacts/diagnostico-2026-10-12/epub-parser-diagnostic.cjs`. Carrega os TS atuais por transpileModule, sem substituir/editar algoritmos de produção; envolve somente o validator/`zipEntry.async` para contadores agregados e amostra memória/event loop a cada 10 ms. Não loga metadata/texto/recurso/EPUB pessoal. Fonts/imagem sintéticas são bytes pseudoaleatórios, suficientes para exercitar inlining; não são fontes renderizáveis e não testam Reader.

Comandos, cada caso em processo separado:

```text
node --expose-gc artifacts/diagnostico-2026-10-12/epub-parser-diagnostic.cjs synthetic1
node --expose-gc artifacts/diagnostico-2026-10-12/epub-parser-diagnostic.cjs synthetic88
node --expose-gc artifacts/diagnostico-2026-10-12/epub-parser-diagnostic.cjs bundled
node --expose-gc --cpu-prof --cpu-prof-dir=artifacts/diagnostico-2026-10-12 --cpu-prof-name=synthetic-epub88.cpuprofile artifacts/diagnostico-2026-10-12/epub-parser-diagnostic.cjs syntheticprofile
```

Valores basais não perfilados abaixo. **A coluna sintética 88 não descreve Amêndoas.**

| Medida | Controle sintético 1 CSS chapter | Sintético 91 XHTML/88 CSS chapters | Freud existente, controle distinto |
|---|---:|---:|---:|
| EPUB bytes | 1.313.134 | 1.334.395 | 778.941 |
| ZIP uncompressed bytes | 1.311.630 | 1.333.221 | 1.506.947 |
| ZIP CRC/mimetype/container/OPF/spine/manifest arquivos válidos | Sim | Sim | Sim |
| Manifest / spine | 5 / 1 | 95 / 91 | 31 / 26 |
| XHTML quantidade / bytes | 1 / 147 | 91 / 13.215 | 26 / 876.806 |
| CSS quantidade / bytes originais | 1 / 139 | 1 / 139 | 2 / 140.506 |
| Font quantidade / bytes originais | 2 / 1.048.576 | 2 / 1.048.576 | 0 / 0 |
| Image quantidade / bytes originais | 1 / 262.144 | 1 / 262.144 | 2 / 477.088 |
| Referências stylesheet / maior repetição de um CSS | 1 / 1 | 88 / 88 | 48 / 24 |
| CSS lido pelo parser | 1 | 88 | 48 |
| Fonts Base64 calls / images Base64 calls | 2 / 0 | 176 / 0 | 0 / 2 |
| Maior nº resource calls em andamento | 1 | 88 | 2 |
| Capítulos produzidos | 1 | 91 | 26 |
| Chapter HTML UTF-8 bytes | 1.398.357 | **123.055.695** | 4.880.044 |
| CSS inline UTF-8 total | 1.398.249 | **123.045.912** | 3.373.043 |
| Data URI UTF-8 total / count | 1.398.146 / 2 | **123.036.848 / 176** | 636.165 / 2 |
| JSON de ParsedEpub UTF-8 total | 1.398.587 | 123.067.415 | 5.225.176 |
| HTML / EPUB | 1,06× | **92,22×** | 6,26× |
| Parse total | 79,93 ms | **4.777,51 ms** | 160,89 ms |
| Maior intervalo heartbeat 10 ms | 37,06 ms | **2.528,79 ms** | 31,01 ms |
| Heap usado antes / depois do parse | 27.410.920 / 58.576.400 | **27.613.008 / 705.628.040** | 27.191.824 / 62.657.040 |
| RSS antes / depois do parse | 80.904.192 / 114.470.912 | **84.398.080 / 902.524.928** | 81.948.672 / 121.577.472 |

Tamanho de imagem sintética é contado na estrutura, mas ela não é referenciada no XHTML: não é convertida. O controle 1 e o sintético 88 compartilham o tamanho das fontes; a diferença é o número de capítulos referenciando o CSS. Não foi persistido nenhum livro nem criado registro/outbox nesta reprodução.

Timings sintético 88:

- load bytes: fixture gerada em memória antes do intervalo de parse; não mede leitura Android. Freud readFile desktop: 0,75 ms.
- open ZIP + validação: 20,10 ms.
- container/OPF/metadata/manifest + leitura/normalização dos 91 chapter drafts até a primeira leitura de CSS: 25,20 ms. Metadata e criação do manifest não foram temporizadas separadamente; não há medição física dessas fases.
- última leitura de XHTML concluída: 45,53 ms desde início de parse.
- recursos/CSS/chapters/rewrite desde primeira leitura CSS até return: **4.730,88 ms**.
- último recurso Base64 terminou a 4.765,14 ms; parse retornou a 4.777,51 ms.
- persistência: não executada. Sem timing nativo/SQLite/bridge para Amêndoas.

Todos os estágios da fixture **terminaram**; não se reproduziu um parse que nunca resolve. A primeira divergência mensurável é a resolução do mesmo CSS/fontes por capítulo e crescimento de HTML nessa etapa, acompanhados por períodos longos sem executar timers. Não é uma falha comprovada do ZIP ou da persistência.

O CPU profile da segunda reprodução tem duração global do harness de 5.993,591 ms. Self-time amostrado agregado: JSZip `exports.encode` Base64 ~1.733 ms; `stringifyByChunk` ~553 ms; regex `url(...)` ~525 ms; GC ~582 ms. Isto mostra trabalho real de codificação/string/regex/GC no desktop, compatível com a suspensão do heartbeat. **O profile inclui também criar fixture, inspeção CRC/ZIP e sizing/JSON após parse; não usar percentuais como profile exclusivo do parser.** Na reprodução com CPU profile o parse levou 4.666,81 ms, heartbeat gap 2.458,81 ms, mesmo tamanho final 123.055.695 bytes, heap após parse 388.897.296 e RSS 614.879.232 bytes. Diferença de GC entre processos afeta fortemente a memória; não tratar 705 MB como pico obrigatório em todo ambiente.

`memory.sampledPeak` amostra a cada 10 ms e inclui amostragem logo após parse; pode perder picos enquanto o JS bloqueia. `after` é memória instantânea ao retornar, antes de medir JSON/output. `processPeakRssBytes` é máximo do processo inteiro incluindo construção, inspeção e JSON pós-parse, **não pico exclusivo do parser**. V8/Windows/Node não determina limite de heap, duração, ANR ou OOM de Hermes/Android. Não foi observado stack crash/OOM/logcat real.

Artefatos agregados:

- `epub-synthetic1-measurements.json`
- `epub-synthetic88-measurements.json` (baseline principal)
- `epub-bundled-measurements.json`
- `epub-syntheticprofile-measurements.json`
- `epub-synthetic-cpu-summary.json`
- `synthetic-epub88.cpuprofile`

### E. Primeira divergência e F. classificação da causa

**CONFIRMADA, confiança alta — mecanismo no HEAD:** a partir de `EpubParserService.ts:47/:123/:222`, todos os capítulos iniciam recursos simultaneamente, cada um relê o CSS compartilhado e reconverte fontes; sem cache, incorpora as mesmas URIs Base64 em cada chapter.html. A fixture estruturalmente válida de 1,33 MB gera 123 MB de HTML, centenas de MB de heap e bloqueia timers por >2 s. Este mecanismo não depende de OAuth/Drive/Library Sync e foi exercitado no parser atual.

**PROVÁVEL, confiança média — hipótese do freeze Amêndoas:** se o arquivo físico realmente tiver a estrutura histórica relatada, a amplificação de recursos/fontes e concorrência é compatível com o freeze e Cancelar sem evento. Porém nenhum byte desse arquivo, nem leitura nativa, logcat, memória Hermes, execução física ou fase real do APK instalado foi obtido. Não declarar causa do arquivo físico CONFIRMADA. A primeira divergência física permanece **inconclusiva**; o estado visual não fornece um trace de operações.

### G. Hipóteses descartadas e pendentes

Descartadas para o código/mecanismo testado:

- “O parser já usa cache de fontes/CSS”: não; contadores 88/176 e código provam repetição.
- “Promise.all executa em Workers/outro thread e preserva eventos por si só”: não; timers ficam bloqueados na fixture.
- “Não existe handler de Cancelar”: existe e passa guards controlados; o comportamento físico ainda depende da thread JS responder.
- “Todo EPUB necessariamente trava”: Freud termina em 160,89 ms no desktop, além do relato de outro EPUB funcionando no aparelho.
- “Somente ZIP inválido explicaria esse mecanismo”: fixture com CRC/container/manifest/spine corretos reproduz expansão e bloqueio. Isto **não** certifica o arquivo Amêndoas ausente.
- “reading_metadata é onde o parser começa”: neste HEAD ela só é publicada após parse completo.

Ainda inconclusivos: validade/dimensões reais de Amêndoas; leitura/cópia Base64 Android; tempo de conversão atob/Uint8Array no aparelho; falha/indisponibilidade de FileSystem; erro ou Promise pendente nativa; diferença de APK instalado; GC/heap/OOM/ANR Android; persistência de HTML expandido via SQLite/bridge; concorrência com tarefas de fundo. Não inventar stack/timeout ou promover a hipótese histórica a medição real.

### H. Próxima correção recomendada — somente descrição, não aplicada

Prioridade crítica: obter o mesmo arquivo Amêndoas em local ignorado/externo e coletar os eventos existentes de importação e logcat físico para separar `reading` real de validating não pintado. Já existe `EXPO_PUBLIC_IMPORT_DIAGNOSTICS=1`, `src/utils/importDiagnostics.ts:3`: phase/operationId/duration/size/uriType sem conteúdo/token. Esta flag não foi alterada nem ativada em um APK novo. `epubOpenMetrics` é opt-in Web/Reader e não fornece atualmente spans internos de parser no Android; bytes/parse/persistence spans não substituem profiling físico.

Arquivos provavelmente envolvidos na próxima implementação: `EpubParserService.ts`, `EpubFileImporter.ts`, `ImportEpubUseCase.ts`, `cancellation.ts`, e representação de recursos/persistência/Reader se necessário. Avaliar cache por parse de resource→Promise/dataURI e CSS processado, limite de concorrência, cancellation checkpoints e cooperação real com event loop. **Só cache computacional não corrige a multiplicação do HTML persistido**; definir como manter recursos/stylesheet compartilhados sem duplicar Base64 em cada capítulo, preservando CSS/URLs relativos/offline. Escolher arquitetura somente após medir o arquivo real e a compatibilidade do Reader.

Risco: alto ao mudar representação de recursos e Reader; médio ao limitar processamento/cancelar corretamente. Preservar fontes incorporadas e CSS original, imagens/SVG/aninhamentos/@import/srcset, links entre capítulos, sanitizer, spine/ordem/títulos/texto, funcionamento offline e roundtrip SQLite/IndexedDB, segurança de conta/rollback/importComplete, cancelamento sem registros/arquivos tardios, EPUBs válidos existentes. Não simplesmente remover fontes/CSS ou mascarar o label.

Testes necessários na próxima etapa: Amêndoas real no aparelho de teste; baseline Freud e outros EPUBs existentes; sintético repetido 1/88 com métricas de HTML/recursos/heap/event loop; cancelamento antes/durante bytes, resources e antes de persistir; falhas de recurso/ZIP/SQLite com limpeza/rollback; reabrir em Reader com fontes e imagens corretas; validação offline e do persistido após reinício; measurements antes/depois sem log em loops. PASS desktop não prova correção física.

### I. Regressões e resultado desta subauditoria

Somente artefatos ignorados e diagnóstico documental. **NENHUMA CORREÇÃO FUNCIONAL FOI APLICADA NESTA ETAPA.** Nenhuma necessidade demonstrada de instrumentação nova no código de produção; usar os mecanismos existentes e harness externo até que o arquivo/aparelho esteja disponível.

## Problema B — Google Drive

### A. Sintoma físico

O usuário informa que Google Auth passou a funcionar após configurar API, usuário de teste, scope drive.readonly, OAuth Web/Android, package/certificado e AuthorizationClient. Fonte Teste inicialmente mostrou 0 livros; nova tentativa aparenta parar em “Conectando / indexando...”. Raiz real `https://drive.google.com/drive/folders/1PwrGP2UiCNGhyhvhDUpszZZwFjfkjaw4`.

Não reproduzido fisicamente nesta auditoria. Não há ADB, sessão/grant Drive disponível no processo local ou trace daquela operação. O relato de autenticação funcionando não equivale a um log do callback/grant da última tentativa. Não foi reaberto diagnóstico genérico de Supabase Google Login nem alterado OAuth.

### B. Código atual e fluxo exato

1. `SourceManagerModal.tsx:35` mantém `busyId`; `probe` o define em :59. O botão principal em :265 exibe “Conectando / indexando…” sempre que qualquer busyId existe; linha da fonte exibe “Conectando…” (:274/:287). Esse texto não distingue autorização, probe, AsyncStorage, crawl ou SQLite.
2. `probe` (:63) chama `googleDrive.connect` somente sem grant conectado; Android `drivePlatformAuth.authorize` (:38–101) chama módulo `AldusDriveAuth.authorize(operationId)`. `AldusDriveAuthModule.kt:24–43` usa AuthorizationClient no main queue, resolução por PendingIntent e OnActivityResult (:44). `complete` (:63–73) verifica token/scope e retorna grant com expiração local conservadora de 45 minutos. JS já possui deadline de autorização120s e clearToken10s; nenhum foi acrescentado.
3. `DriveAuthorization.connect` (:17–31) guarda grant somente em memória, validando geração/expiração. `token` (:33–37) rejeita grant ausente ou próximo da expiração. Fechar app perde esse grant, mas catálogo persistido permanece disponível.
4. `probe` (:64) chama `GoogleDriveService.validateRoot` (:44): parsing do folderId e **files.get metadata da raiz**, não files.list. `parseDriveFolder` aceita o link fornecido e retorna exatamente o ID; demonstrado no harness atual. MIME real precisa ser folder.
5. `SourceManagerModal.save` (:124–142) grava a fonte verificada como active/enabled quando o probe tem sucesso. Nova fonte: `sourceStore.add` (:29–31) aguarda AsyncStorage.save, load, SourceCatalog.load e **refresh inteiro**. Fonte editada/refresh/toggle: update+refresh (:137–138/:165–175/:186–196).
6. `sourceCatalogAdapter.catalog` (`sourceCatalogDependencies.ts:12`) chama `listCatalog(..., true)`. `SourceCatalogService.refresh` cria seu **próprio AbortController** (:52), publica loading/refreshing (:55), aguarda adapter (:58), valida árvore+itens (:59–63), entra na fila de escrita (:64), reconsulta fonte (:66), salva o JSON único (:68), publica ready/empty (:69). Repository Android: `SqliteSourceCatalogRepository.ts:10–11`; getDatabase pode aguardar inicialização local, mas nenhuma migration foi executada nesta auditoria.
7. `GoogleDriveService.listCatalog` (:59–131) faz BFS **serial**: files.get por pasta (:79), files.list para filhos (:83–89), todas as páginas, depois próxima pasta. Nenhum livro baixado para indexar. São aproximadamente `1 probe + F metadata GETs + P files.list`, onde F inclui raiz e cada target alcançado e P todas as páginas. Não há callback de progresso de crawl; a persistência/ready espera a árvore completa. Tem limites de nós/páginas e deadline já existente de20s **por request** (:158), não prazo global de árvore.
8. IDs `scheduledFolderIds`/`visitedFolderIds` (:71/:103) previnem repetir o conteúdo de destinos/ciclos. shortcut→folder usa targetId/targetMimeType e targetResourceKey (:94–108), preservando a entrada do atalho. shortcut→PDF/EPUB é **ignorado** pelo filtro `application/vnd.google-apps.*` (:112); não há resolução de file shortcut no HEAD. Não se sabe a composição real da raiz/subpastas por resposta API dessa tentativa.
9. Erro de qualquer ramo interrompe o resultado inteiro; não há snapshot parcial. DriveError HTTP404/403/rate limit chega ao catch de SourceCatalogService (:71–77), que preserva snapshot anterior e publica estado apropriado. A Promise de refresh **resolve após capturar o erro**. Isso não atualiza `source.status/lastError` no sourceStore; SourceManager pode conservar “Conectado” baseado no probe/grant (:274/:284), embora catálogo esteja em error/stale.
10. `finishOperation` (:85–86) limpa busyId no finally de save/refresh/toggle (:142/:175/:196). Exceptions que escapem geram formError/reportFailure nos onPress. Cleanup ao fechar modal (:46) aborta só o controller externo. Esse signal não entra no `sourceCatalogs.refresh` nem no `sourceStore.add` que já começou; o crawl pode continuar em segundo plano. `SourceLibraryScreen`/`useSourceCatalog` assinam estado separado do catálogo e podem mostrar seu erro; o modal gerenciador não exibe todos esses detalhes.

### C/D. Reprodução e evidências

**Pasta pública real, read-only, sem grant:** HTTP200 em 12/10/2026 15:46:10 UTC, título `livros geral - Google Drive`; `drive-public-root.json`. Sem clique, alteração ou download de livro. A evidência pública anterior do mesmo dia (`artifacts/drive-tree/real-folder-public-probe.json`) mostra nomes de pastas e atalhos. HTML público não é files.list autenticado; não fornece os counts/erros da operação física.

**Harness atual:** `artifacts/diagnostico-2026-10-12/diagnose-drive-state.cjs` transpila sem editar DriveAuthorization, GoogleDriveService, SourceCatalogService e sourceStore do HEAD; auth/HTTP/repositories são fixtures declaradas. JSON `drive-state-probe.json`. Nenhuma solicitação real à Google API, gravação de fonte pessoal, sync, migration ou download.

| Cenário controlado | Resultado factual |
|---|---|
| 100 pastas + 100 EPUBs; 5ms de atraso artificial por request | 203 requests; ~3.178ms nesta execução Windows (timers não têm precisão garantida); caller pendente/catalog loading e zero gravações antes do final; uma gravação/ready com100 livros depois da request203. Esse tempo não é latência Google nem benchmark Android. |
| Root probe200; primeiro metadata GET de subpasta404 | Request4 falha; snapshot não salvo; catalog=error; source continua active/enabled; add resolve normalmente. Explica como “Conectado” e catálogo ausente/0 podem coexistir no código, não prova que essa foi a falha física. |
| Raiz contendo somente shortcut→PDF | Snapshot válido com0 livros, status empty, sem follow do target. Confirma a exclusão desse tipo no código; não certifica que a pasta real contenha apenas file shortcuts. |
| Controller externo abortado após início do crawl | Crawl termina, grava3 livros e publica ready, apesar de outerController.aborted=true. Confirma ausência de propagação do signal externo. Modela fechamento/cancelamento, sem executar toque/modal Android. |
| findSource retorna undefined antes da gravação | Todas5 requests terminam; caller resolve; zero gravações; view permanece **loading** sem erro. Reproduz um caminho sem estado terminal em `SourceCatalogService.ts:67`: return silencioso dentro da fila seguido de finally sem publicação. Não prova que AsyncStorage retornou esse estado no aparelho. |

As latências são injetadas somente no HTTP fictício para examinar a espera; não se alterou o timing do app. Operações emitidas pelo wrapper registram request number, phase, folderId fictício/público, HTTP status, pageToken presente/não e contagens agregadas. Queue/visited internos reais não são observados por esse wrapper; não inventar seus valores como log físico.

### 17 respostas da tentativa física real

| Pergunta | Estado da prova nesta auditoria |
|---|---|
| 1 AuthorizationClient sucesso? | Usuário relata Google funcionando; callback específico da última tentativa não capturado. |
| 2 Credential válida? | Não inspecionada; nenhum token coletado/logado. |
| 3 folderId exato? | **Parsing do link no HEAD confirmado** para `1PwrGP2UiCNGhyhvhDUpszZZwFjfkjaw4`; valor em memória do APK desconhecido. |
| 4 Primeira files.list emitida? | Não observado fisicamente. Código emite files.get antes da primeira list. |
| 5 HTTP status? | Não observado na operação física; HTTP200 de HTML público é outra solicitação. |
| 6 Body válido? | Não observado na operação física. |
| 7 Children na ROOT? | Contagem API física inconclusiva. |
| 8 MIME types? | Não obtidos da API física. |
| 9 Quantas pastas? | Não obtido da API física. |
| 10 Quantos atalhos? | Não obtido da API física; imagem pública não substitui resposta API. |
| 11 Queue cresce? | Inconclusivo fisicamente; cresce/termina nas fixtures de filhos. |
| 12 nextPageToken? | Inconclusivo fisicamente; lógica presente no HEAD, sem trace dessa raiz. |
| 13 Alguma pasta com erro? | Nenhum erro físico de ramo capturado. Cenário404 reproduzido apenas controladamente. |
| 14 Promise pendente? | Await físico não identificado; classe de espera serial e guard sem terminal documentados. |
| 15 Snapshot construído? | Inconclusivo fisicamente. |
| 16 Snapshot chega ao repository? | Inconclusivo fisicamente. |
| 17 UI recebe ready? | Não capturado; usuário observa busy/0. |

### E/F. Primeira divergência e causas

**Tentativa física: INCONCLUSIVA, confiança baixa para a causa exata.** Não é possível afirmar a última etapa concluída ou primeira falha dessa operação sem identificar APK e obter trace. O sucesso de Google é o último avanço relatado, não um span medido do crawler.

**Confirmados no HEAD, confiança alta:** serialização/ausência de progresso do crawl; Source active separado de falha do catálogo; erro de ramo aborta snapshot completo; file shortcuts ignorados; cancelamento externo não chega ao crawl; guarda `findSource` pode concluir a Promise deixando loading sem erro. São resultados de código e reprodução externa, não causa física escolhida por tentativa e erro.

O caminho normal não possui loop infinito de atalhos demonstrado; termina nos fixtures. Timers já existem no authorization/request. Um grande número de pastas/páginas pode demorar sem haver Promise eternamente pendente. AsyncStorage/findSource/SQLite ainda são awaits candidatos fora dos prazos da requisição. CPU/GC de um EPUB simultâneo também pode atrasar eventos/timers, mas não há prova de simultaneidade física entre problemas A/B/C.

### G. Hipóteses descartadas ou não sustentadas

- HEAD ainda listar só a raiz/achatar todas as pastas: descartado pelo código e artefato13fce88; execução desse artefato no telefone não comprovada.
- Link fornecido não ser aceito pelo parser atual: descartado.
- Arquivo baixar durante indexação por usar URL alt=media em metadata: não; URL é armazenada, fetch de media não é chamado pelo crawler.
- Todo atalho ser ignorado: não; folder shortcuts são percorridos; file shortcuts são ignorados.
- “Conectando / indexando...” provar que autorização está pendente: descartado; label abrange vários awaits.
- Timer de request limitar a duração total da árvore: descartado.
- Fonte “Conectado” comprovar snapshot pronto: descartado.
- Fechar modal parar toda indexação: descartado no cenário controlado.
- Causa genérica de Supabase Google Login: não reaberta; usuário informa sucesso e não há evidência nova nesse sentido.

### H. Próxima correção recomendada — não aplicada

Primeiro obter identidade do APK e trace agregado de uma atualização real, separando `authorize`, `root metadata`, `files.list`, `target metadata`, paginação, index construction, findSource, repository.save e publish. Diagnostics atuais (`src/utils/driveDiagnostics.ts:9–27`) cobrem só authorization/callback/category, opt-in `EXPO_PUBLIC_DRIVE_DIAGNOSTICS` ou `EXPO_PUBLIC_AUTH_DIAGNOSTICS`; não registram folderId/request/queue/visited/elapsed do crawl. Nenhuma flag foi ativada/compilada e nenhum hook foi acrescentado nesta fase.

Se for necessário instrumentar na próxima execução, usar uma flag explícita e allowlist de counts/phases/status/elapsed; nunca token/header/code/secret, conta ou conteúdo de livros; preferir counters por página/etapa sem logging massivo. Não acrescentar timeout/retry/debounce para encobrir a localização da falha. Só depois do trace escolher a correção pertinente. Os defeitos controlados de estado/cancelamento podem ser abordados sem reabrir OAuth, mas preservando semântica de abort/generation e publicação atômica.

Arquivos prováveis: `SourceManagerModal.tsx`, `sourceStore.ts`, `SourceCatalogService.ts`, `GoogleDriveService.ts`, diagnostics/repository conforme a fase medida. Riscos: publicar parcial como catálogo completo, perder snapshot offline, dupla operação/crawl, revogar grant de outra operação, seguir áreas externas não alcançadas legitimamente, aumentar requisições/rate limit ou esconder falha de permissão. Shortcuts de arquivo exigiriam decisão explícita de escopo, não mudança especulativa nesta fase.

### I. Regressões a preservar

ROOT como limite, IDs reais/homônimos, folder aliases/visited/ciclos/resource keys/Shared Drive/páginas completas; zero media na indexação; busca source-wide/fuzzy local sem API por tecla; snapshot antigo offline em falha; publish atômico e identidade da fonte; ações/importação/download existentes; cancelamento/stale/network/generation/credential cleanup; token somente em memória; links importados estáveis. Testes futuros: primeiro/último ramo200/403/404/429/network, árvore grande com latência, paginação, source desaparecendo/renomeada/trocada, fechar modal/reabrir/restart, persistência lenta/falha, arquivo real da raiz e Android físico. Os testes antigos PASS não substituem esse trace.


## Problema C — Library Sync


Auditado o código no HEAD `13fce88` (`main`). Nenhuma migration, policy, bucket, dado de conta, outbox ou código de produção foi alterado. Google Auth não foi reaberto nesta investigação. O usuário informa que ele funciona fisicamente; isso não demonstra que o contrato específico de Library Sync foi implantado.

### A. Sintoma físico informado

Em Ajustes aparecem `37 operações pendentes`, `Última sincronização: —` e `A sincronização da biblioteca ainda não está disponível no servidor.`. Este é o relato do aparelho; ADB não apresenta dispositivo nesta auditoria. O banco/outbox do aparelho não foi acessado.

### B. Estado do código e condição exata da mensagem

- `src/data/library/SupabaseLibraryAdapter.ts:6–10`, função `headers(owner)`: exige cliente Supabase configurado e sessão normal cujo `session.user.id` corresponde ao owner. Configuração ausente gera `Sincronização não configurada.`; sessão ausente/owner divergente gera `Sessão indisponível para sincronização.` antes de qualquer HTTP.
- `src/data/library/SupabaseLibraryAdapter.ts:12–19`, função `request`: qualquer resposta HTTP **404** lança **exatamente** a mensagem observada, na linha **17**. O corpo remoto/código PostgREST não é lido no ramo de erro. HTTP 401 vira `Entre novamente para sincronizar.`; outros não-2xx, inclusive 403, viram erro genérico.
- `src/data/library/SupabaseLibraryAdapter.ts:21–29`, `pull`: GET `rest/v1/user_library_items?user_id=eq.<owner>&revision=gt.<cursor>&order=revision.asc&limit=500`; valida formato, ownership e revisões, com até 100 páginas. Primeiro cursor = 0.
- `src/data/library/SupabaseLibraryAdapter.ts:31–35`, `apply`: POST `rest/v1/rpc/library_apply`, com argumentos `p_operation_id`, `p_book_id`, `p_kind`, `p_entity_id`, `p_expected_revision`, `p_payload`, `p_deleted`. Não foi invocado no servidor nesta auditoria.
- `src/data/library/LibrarySyncService.ts:101–126`, `run`: recupera alterações locais `dirty && !ready` (106–107), faz **pull inicial antes de todos os pushes** (110), aplica recebidos, só então percorre `dirty && ready` e chama RPC (112–117), faz novo pull e grava `lastSync` somente depois do sucesso (119–121). Captura mensagem em `engine.status.error` e propaga erro (122–124); desliga `running` e recalcula contagens (125–126).
- `src/data/library/LibrarySyncCoordinator.ts:49–74`, `run`: `replica.seed` → `engine.sync` na linha 53 → upload de arquivos apenas depois, nas linhas 54–59 → segundo `engine.sync` na 62 → limpeza remota somente após tombstone confirmado (63–68). Erro do pull inicial impede RPC, upload e limpeza da rodada. Status preserva a mensagem na 73.
- `src/presentation/components/LibrarySyncControls.tsx:21–27`: a tela soma **`engine.status.pending + coordinator.status.pendingFiles`**, apresenta último sync como `—` se `lastSync` for null e renderiza erro local/coordinator/engine/journal em ordem de prioridade. Logo, **37 operações pendentes não prova 37 entradas de outbox**: pode incluir livros/arquivos pendentes além das entidades.
- `src/data/library/LibrarySyncService.ts:21–26`: `pending` é o número de entidades persistidas com `dirty=true`, não um histórico de todas as alterações ou tentativas.
- `src/data/library/LibrarySyncCoordinator.ts:36–37`: `pendingFiles` conta arquivos importados completos ainda sem `remotePath` e arquivos de livros removidos com limpeza remota pendente.
- `src/data/library/LibrarySyncPersistence.ts:5–23`: persistência Android no SQLite, tabela local `library_sync_state(user_id,state_json)`, uma linha JSON por conta; Web no object store IndexedDB homônimo. **Essa tabela local não é a tabela remota `user_library_items`.**
- `src/domain/types/librarySync.ts:7–15`: entries têm `kind`, `dirty`, `ready`, `deleted`, `baseRevision`, `operationId`, `shadow`, `conflict`, mas **não têm contador de retries ou erro individual persistido**. O erro da rodada fica no status do engine/coordinator.
- `src/data/library/SupabaseBookFileDriver.ts:17–29,162–165`: bucket esperado é `aldus-private-library`; falta de Storage HTTP 404 tem mensagem diferente: `O armazenamento privado ainda não está disponível no servidor.`. Assim, o texto físico citado pertence ao adapter REST de metadados, não identifica por si só erro de bucket.

### C. Reproduções e limites

1. **Remoto público read-only:** credenciais públicas já existentes em `.env.local`, aceitas somente se a chave for JWT role `anon` ou `sb_publishable_`; sem sessão de usuário, login, service_role, SQL, alteração de permissões ou solicitação mutante. GETs com `limit=0` para tabelas evitam ler linhas de usuários. GET de bucket só pede metadados do nome esperado, sem objeto/conteúdo. Não foi executado GET/POST de RPC, por conter possibilidade de mutação.
2. **Cliente atual isolado:** `artifacts/diagnostico-2026-10-12/sync-client-reproduction.cjs` carrega os **arquivos TypeScript atuais** por transpilation com o loader já existente do projeto; usa sessão fictícia explícita, fetch controlado com HTTP 404/PGRST205 obtido na prova pública e estado de fixture com **3** entidades dirty/ready. Não usa sessão real, não acessa banco do aparelho, não prova sua composição de 37. O engine produz a mensagem exata, termina `running=false`, conserva as 3 entradas sem alteração, `lastSync=null`, apenas um GET inicial, zero RPC/Storage. Também confirma distinção 401/403/sessão ausente. É script de investigação fora do código versionado, sem instrumentação no app.
3. **Android físico:** não reproduzido nesta sessão por ausência de aparelho ADB. O erro real do aparelho e o commit instalado continuam dependentes da identificação feita pela auditoria principal.

### D. Evidência HTTP atual

Artefato: `artifacts/diagnostico-2026-10-12/sync-public-probe.json`. Horários do cliente UTC em **12/10/2026, 15:42:06–10**; headers Date também gravados no JSON. Somente GET; `mutatingRequests: 0`, `rpcInvoked: false`, `authenticatedSession: false`, `keyRole: anon`.

| Consulta | HTTP | Código | Interpretação factual |
|---|---:|---|---|
| `profiles?select=id&limit=0` (controle conhecido) | 401 | `42501` | Tabela reconhecida; acesso público sem privilégios. |
| `user_library_items?select=user_id,kind,id,book_id,payload,revision,updated_at,deleted_at&limit=0` | 404 | `PGRST205` | `public.user_library_items` não encontrada no schema cache desta API. |
| `user_library_operations?select=user_id,operation_id,request,response,created_at&limit=0` | 404 | `PGRST205` | `public.user_library_operations` não encontrada no schema cache desta API. |
| Tabela de controle deliberadamente inexistente | 404 | `PGRST205` | Mesmo tipo de erro de recurso/tabela desconhecida. |
| OpenAPI `GET /rest/v1/` | 401 | não apresentado | Não foi possível inventariar RPCs; `libraryPaths: []` **não prova ausência de RPC** porque resposta não foi OpenAPI válido. |
| `GET /storage/v1/bucket/aldus-private-library` | 400 | `NoSuchBucket` | Bucket esperado não visível à chamada pública. |
| GET de bucket de controle deliberadamente inexistente | 400 | `NoSuchBucket` | Mesmo resultado. Existência física do bucket privado permanece inconclusiva sem SELECT apropriado em `storage.buckets`. |

Mensagens remotas relevantes (apenas schema público esperado, sem dados de livros/contas): `Could not find the table 'public.user_library_items' in the schema cache` e equivalente para `user_library_operations`. A chave/API host/tokens não foram impressos, e não foram coletados corpos de registros privados.

Documentação primária: [PostgREST — errors](https://docs.postgrest.org/en/v16/references/errors.html) distingue 404 `PGRST205` (tabela do URI ausente) de `42501` (401 sem autenticação, 403 autenticado). O erro de schema cache não prova, isoladamente, ausência física em PostgreSQL: implantação ausente, schema não exposto ou cache desatualizado devem ser discriminados. [Supabase — getBucket](https://supabase.com/docs/reference/javascript/storage-getbucket) exige SELECT sobre `storage.buckets`; por isso a falta de visibilidade anônima não prova que o bucket inexiste. Essa exigência também está no SDK local `node_modules/@supabase/storage-js/src/packages/StorageBucketApi.ts:131–148`.

Artefato de reprodução cliente: `artifacts/diagnostico-2026-10-12/sync-client-reproduction.json`. Resultado: mensagem exata, 3 fixtureDirtyEntries preservadas, RPC=0, Storage=0, lastSync=null; no-sessionRequests=0. O fixture não contém livros pessoais nem reproduz a composição da contagem física.

### E. Primeira divergência

**Na API atualmente configurada, o recurso REST esperado `public.user_library_items` não está disponível no schema cache e responde HTTP 404/PGRST205, em vez de entregar metadados ao pull.** No fluxo atual do engine esse pull acontece antes do push da outbox e antes do upload; a reprodução isolada confirma que esse HTTP é suficiente para produzir exatamente o texto observado e bloquear toda a rodada.

No aparelho específico não temos request/logcat correlacionado: como o mesmo adapter também pode mostrar a frase para HTTP 404 do RPC, ainda não podemos afirmar como observação física que aquele erro veio do primeiro GET. A indisponibilidade pública atual do primeiro contrato, o histórico de não implantação e a ordem do código fornecem uma explicação forte e independente de uma entidade venenosa.

### F. Classificação de causa

- **CONFIRMADA, confiança alta:** API pública atual não expõe `user_library_items`/`user_library_operations` em seu cache (`404/PGRST205`) e o código atual transforma qualquer 404 de metadados na frase relatada.
- **PROVÁVEL, confiança alta:** **BACKEND NÃO DEPLOYADO** para Library Sync. `LIBRARY_SYNC_FINAL_REPORT.md:3,25` e `LIBRARY_SYNC_IMPLEMENTATION.md:59,88` dizem que as duas migrations foram criadas/testadas controladamente, **não aplicadas remotamente**. As consultas atuais confirmam que os dois contratos de tabela ainda estão indisponíveis. Isso reforça o histórico, sem promovê-lo a inventário de pg_catalog ou prova de migration ledger remoto.
- **INCONCLUSIVA:** distinção final entre ausência física da migration, tabela em schema/projeto diferente ou cache/exposição desatualizados. Não houve inventário SQL/admin nem sessão autenticada real de Library Sync nesta auditoria.
- **Não evidenciado como explicação principal:** backend implantado com mero RLS negando linhas; o erro capturado é recurso ausente do schema cache, diferente do controle de privilégio. RLS/ACL remotamente instalado continua sem auditoria completa, portanto não se declara configuração correta.
- **BUCKET AUSENTE: INCONCLUSIVO.** GET público retorna NoSuchBucket, mas depende de visibilidade; além disso a mensagem física citada é de metadados, e a falha de pull antecede Storage.
- **CLIENTE USANDO CONTRATO ERRADO:** nomes, campos e argumentos atuais correspondem às migrations locais. Contrato local inconsistente não foi encontrado. Remoto pode usar outro schema/projeto/versão; isso continua sem inventário.
- **SESSÃO AUSENTE:** não produz essa frase no código atual; o header guard gera outra mensagem antes do fetch, e HTTP 401 também gera outra mensagem. A sessão física específica não foi lida nesta auditoria, e login Google funcionando não prova o estado remoto de Library Sync.

### Inventário local das migrations — NÃO EXECUTADAS

#### `supabase/migrations/202610110001_private_account_library.sql`

Identificador/timestamp literal: **202610110001** (12 dígitos do nome; não inferir horário remoto de aplicação). Introduzida em `d77f6e8`, `2026-10-11T18:52:34-03:00`, `feat: add private account library storage model`. Código atual:

- `public.user_library_revision_seq` (linha 3): revisão do servidor.
- `public.user_library_items` (4–17): ownership FK `auth.users`; PK `(user_id,kind,id)`; kinds `book`, `progress`, `bookmark`, `highlight`, `organization`, `pdf_position`; `book_id`, payload JSONB objeto com limite 262144 bytes, revision, updated_at, deleted_at; book exige id=book_id; índices por book e revision.
- `public.user_library_operations` (18–25): recibos idempotentes por `(user_id,operation_id)` UUID, request/response JSONB, created_at.
- RLS habilitado nas duas tabelas (26–27); revoga escrita/leitura geral e acesso à sequence (28–29); concede somente SELECT de items a authenticated (30); policy `library_own_select` SELECT por auth.uid (31). Operations não possui policy de acesso direto do cliente.
- RPC `public.library_apply(uuid,text,text,text,bigint,jsonb,boolean)` (33–80): SECURITY DEFINER, search_path vazio; requer auth.uid, CAS de revisão, bloqueio por livro, recibo idempotente, validações e tombstone permanente. Somente authenticated recebe EXECUTE. Campos/argumentos conferem com `SupabaseLibraryAdapter.apply`.
- Bucket **`aldus-private-library`** (82–90): privado, max **536870912 bytes / 512 MiB**, MIME **`application/epub+zip`, `application/pdf`**; recusa reutilizar bucket homônimo público; não converte public→private silenciosamente.
- `public.library_object_allowed(text,boolean)` (91–98): função SQL stable SECURITY DEFINER/search_path vazio, ownership/path e pai; EXECUTE anon/authenticated para composição de policies, sem tornar objeto público.
- Policies `storage.objects` (99–128): `aldus_library_read`, `aldus_library_insert`, `aldus_library_delete`; restrictive fences `aldus_library_read_fence`, `aldus_library_insert_fence`, `aldus_library_update_fence`, `aldus_library_delete_fence`. UPDATE de objeto privado bloqueado; insert só conteúdo endereçado por hash de livro próprio ativo.

#### `supabase/migrations/202610110002_private_library_file_recovery.sql`

Identificador/timestamp literal **202610110002**. Introduzida em `1e5cae9`, `2026-10-11T19:41:24-03:00`, `feat: sync private book files across devices`. **Depende da 001.**

- Substitui `library_object_allowed(text,boolean)` (5–11): SELECT do proprietário aceita objetos com caminho/hash válido de livro próprio, inclusive arquivo não publicado/tombstoned para recuperar resposta perdida e DELETE seguro; upload ainda exige livro ativo.
- Substitui policy `aldus_library_read` (12–15) para usar essa função.
- Não cria nova tabela, bucket ou RPC; mantém isolamento por conta e fences da migration 001.

Commit do engine: `94b6ecb`, `2026-10-11T19:01:33-03:00`, `feat: add offline-first library sync engine`.

`supabase/audit/02_library_sync_inventory.sql:1–13` já descreve inventário **read-only** de relações/ACL/RLS, colunas, policies, function definition/ACL, bucket e índices; última linha recomenda também ledger `supabase_migrations.schema_migrations`. **Nenhum desses SQLs foi executado remotamente nesta fase.**

### Outbox: o que sabemos e o que não sabemos

- Quantidade física: **37 é a contagem agregada relatada pelo usuário**, não obtida por inspeção desta auditoria.
- Distribuição por tipo (`book`, progress, bookmark, highlight, organization, pdf_position): **INCONCLUSIVA**; idem por dirty/ready/deleted/conflict.
- Retries/erro agregado físico: **INCONCLUSIVO**. Não existe campo de retries individual no formato atual; erro de engine/coordinator é agregado. Uma inspeção futura deve contar somente flags/kinds, não exportar payload/títulos/anotações ou tokens.
- Operação venenosa física: **não demonstrada nem descartada após restaurar o contrato remoto**. Porém o pull inicial que retorna 404 é um bloqueio anterior e independente do conteúdo das operações `dirty && ready`; a reprodução de 3 fixtures heterogêneas conserva todas sem nenhum push. Alterações inacabadas podem ser recuperadas localmente antes do pull (106–107), o que exige cuidado para chamar uma sync real de “read-only”. **Esta auditoria não chamou sync real** nem limpou/mark-done qualquer entry.
- `lastSync=—`: coerente com null inicial e gravação apenas na linha 121 depois de ambos pulls e dos pushes bem-sucedidos; não é diagnóstico específico de bucket ou retries.

### G. Hipóteses descartadas/reduzidas pelo diagnóstico

1. Frase citada ser uma mensagem do Storage: descartada para o código atual; Storage usa outro texto.
2. Frase por configuração pública ausente/sessão inexistente sem fetch ou mero HTTP 401/403: descartada como ramo produtor desta frase no código atual.
3. Ser necessário investigar cada entidade da outbox antes do contrato: reduzida; pull prévio está indisponível e bloqueia a rodada, sem leitura de seu conteúdo.
4. Tabelas locais e remotas terem os mesmos nomes: descartada; SQLite library_sync_state e REST user_library_items são contratos distintos.
5. Código atual esperar nomes/argumentos incompatíveis com as migrations locais: não encontrado; nomes e assinatura correspondem.

### H. Próxima correção recomendada — DESCRITA, NÃO APLICADA

1. Na próxima fase, começar por inventário remoto read-only apropriado de `public.user_library_items`, `user_library_operations`, `library_apply`/assinatura, sequence, grants, RLS, bucket e ledger. Diferenciar migration ausente de projeto/schema errado ou cache desatualizado. Não conceder acesso anônimo ou desativar RLS para fazer o teste passar.
2. Se for confirmado não deployment, planejar aplicação **ordenada 001→002** após conferência do estado/bucket/grants reais, seguindo `LIBRARY_SYNC_DEPLOYMENT.md`. Esta auditoria não aplicou nada e não autorizou uma execução automática fora da próxima tarefa.
3. Se houver contrato remoto diferente, reconciliar explícita e incrementalmente com `src/data/library/SupabaseLibraryAdapter.ts`, `SupabaseBookFileDriver.ts` e migrations; não mascarar o 404 nem marcar a fila como concluída.
4. Após o contrato funcionar, inspecionar somente agregados da outbox real e executar sincronização em ambiente de teste autorizado, preservando o estado original. Reproduzir 2 contas/2 dispositivos, upload recovery/tombstone, retorno offline→online, progresso e conflitos. Uma operation venenosa só passa a ser hipótese avaliada por erro específico de push após pull válido.
5. Melhoria diagnóstica futura possível: preservar **código/status/fase remota sanitizados** na UI/telemetria opt-in, pois hoje todos os 404 viram a mesma frase. Apenas recomendação; nenhum erro foi remapeado/instrumentado nesta fase.

Risco de deployment: vazamento entre contas por ACL/RLS/fences ou bucket público, perda de intenção local por limpeza da outbox, duplicação por quebra da idempotência, exclusão prematura de arquivo/tombstone, projeto remoto incorreto. Arquivos provavelmente envolvidos na correção: migrations acima/`supabase/audit/02_library_sync_inventory.sql`, `SupabaseLibraryAdapter.ts`, `SupabaseBookFileDriver.ts` e roteiro de implantação; o cliente não deve ser alterado antes de confirmar divergência do contrato.

### I. Regressões a preservar

Leitura/importação offline independente de backend; ownership/isolamento conta A/B e revogação síncrona; outbox durável write-ahead e replay local; CAS por revisão e recibos por UUID; conflitos e intenção offline preservados; pai book publicado antes de upload; arquivo validado/hash e remotePath publicado depois do upload; metadata sync não baixa bytes automaticamente; tombstone confirmado antes de cleanup; objetos imutáveis; download ao abrir; distinção remover do dispositivo/remover da conta; nenhuma chave administrativa no app.

Testes existentes relevantes para a próxima correção, **não executados remotamente nesta fase**: `scripts/test-library-sync.cjs`, `test-library-reading-sync.cjs`, `test-library-coordinator.cjs`, `test-library-files.cjs`, `test-library-restart.cjs`, `test-library-rls.cjs` (PostgreSQL/PGlite isolado), `test-library-web.cjs` (backend fixture). PASS desses testes não comprova deployment nem aparelho físico.

**Nenhuma correção funcional ou instrumentação de produção foi aplicada.** Só notas e scripts/JSON de reprodução isolada em `artifacts/diagnostico-2026-10-12/`.

## Problema D — Library UI residual

### A. Sintoma e C. Reprodução

O usuário relata Backup da organização e botões grandes Opções de <livro> no APK. Presença no JSX/histórico/bundle foi reproduzida por leitura estática. A disposição física e a identidade instalada não foram reproduzidas sem ADB. Abaixo estão todas as cadeias/actions, sua classificação e recomendações sem alteração.


Data: 2026-10-12. Baseline: `main`, HEAD `13fce8851c5e5bf9a21a0b26b87f48ded02437a9` (`feat: add navigable Drive folders and local source search`). Nenhum arquivo de implementação, teste ou configuração foi alterado nesta auditoria. Nenhum botão foi removido e nenhuma ação de exclusão, importação, restauração ou sincronização foi executada.

### E/F. Primeira divergência e causa

**Causa confirmada no código atual e no APK arquivado:** a Library continua renderizando ambos os controles deliberadamente. O código não implementa a remoção que o usuário esperava. A primeira divergência entre a expectativa de ausência e o comportamento é a árvore JSX de `app/(tabs)/library.tsx:294` (Backup) e `app/(tabs)/library.tsx:348` (BookCloudControls). Não é necessário recorrer à hipótese de APK antigo para explicar os elementos observados: o APK local correspondente ao próprio HEAD contém os componentes e os textos.

**APK INSTALADO — IDENTIDADE INCONCLUSIVA.** O agente principal confirmou zero dispositivos ADB disponíveis. A inspeção do APK arquivado não prova qual APK está instalado, tampouco execução/renderização no aparelho. O relato físico é compatível com o HEAD; não identifica o commit do aparelho.

### B. Estado do código — rota atual e implementações

- `app/(tabs)/_layout.tsx:26`: tab `library`, título Biblioteca.
- `app/index.tsx:14`: redireciona para `/library`.
- `app/(tabs)/library.tsx:58`: única implementação da rota Library pessoal encontrada no HEAD.
- `src/presentation/hooks/useLibrary.ts:4` → `src/presentation/stores/libraryStore.ts:7` → `src/presentation/services/dependencies.ts:80` → `GetLibraryUseCase.execute`, `src/domain/usecases/GetLibraryUseCase.ts:6`.
- O use case lê livros ativos e aplica o overlay de organização (`GetLibraryUseCase.ts:7-9`). Portanto os controles recebem dados da Library atual; não uma estante paralela antiga.
- `src/presentation/components/SourceLibraryScreen.tsx` é a biblioteca de uma fonte, ligada à navegação de catálogo/pastas. Não é outra implementação de `/library` e não é a origem dos textos residuais.
- O código atual renderiza componentes historicamente antigos, mas eles continuam importados e ligados a handlers atuais. Não foram encontrados dois componentes concorrentes implementando a mesma rota pessoal.

### B. Estado do código — Backup da organização

`Library` → botão `app/(tabs)/library.tsx:294` → `setBackupVisible(true)` → montagem condicional `app/(tabs)/library.tsx:373` → `OrganizationBackupModal` (`src/presentation/components/OrganizationBackupModal.tsx:8`).

O botão principal fica na barra horizontal de coleções e é renderizado sem condição de quantidade de livros, autenticação, estado de sync ou existência de organização. Só o modal depende de `backupVisible`. Por isso o botão pode aparecer mesmo antes da estante terminar de carregar.

| Ação no modal | Handler e dependência | Efeito efetivo |
| --- | --- | --- |
| Exportar organização | `OrganizationBackupModal.tsx:13-23`; `libraryOrganization.list()`; `exportOrganizationBackup`, `src/domain/types/libraryOrganization.ts:75-76` | JSON versionado de organização dos livros visíveis na conta. Web cria download `aldus-organizacao.json`; Android usa `Share.share`. Não exporta arquivos EPUB/PDF, progresso ou anotações. |
| Editar/colar JSON | `OrganizationBackupModal.tsx:40` | Atualiza estado de texto e invalida a prévia. Não escreve no repository. |
| Conferir backup | `OrganizationBackupModal.tsx:25-28`; `parseOrganizationBackup`, `libraryOrganization.ts:62-73` | Valida formato, versão, limite de 20 MB, até 10.000 registros, campos e IDs duplicados; cria prévia local. |
| Restaurar mantendo dados locais | `OrganizationBackupModal.tsx:29-34,42`; `libraryOrganization.merge(preview, 'keep-local')` | Faz merge com política local e recarrega organização/Library pelo `onSaved`. Pode gerar operações de organização na outbox. |
| Restaurar usando dados importados | Mesmos pontos, política `'use-imported'` | Substitui valores de organização nos conflitos autorizados e recarrega. Pode gerar operações de organização na outbox. |
| Fechar / voltar do Android | `OrganizationBackupModal.tsx:36,44` | Fecha o modal quando não está ocupado. Nenhuma alteração persistente. |

Repository concreto em `src/presentation/services/dependencies.ts:79`:

`AccountOrganizationRepository(journalOrganization(rawOrganization, librarySyncEngine), bookRepository)`.

- `AccountOrganizationRepository.list`, `src/data/library/AccountOrganizationRepository.ts:5-9`: filtra pelos IDs ativos da conta atual.
- `.save`, linhas 11-14: exige livro disponível nesta conta.
- `.merge`, linhas 16-19: exige que **todos** os IDs importados correspondam a livros disponíveis na conta atual antes de escrever.
- `journalOrganization.save/merge`, `src/data/library/JournaledReadingData.ts:28-40`: journal de entidade `organization`; não é um armazenamento independente do sync.
- `LibraryOrganizationStore`, `src/data/local/LibraryOrganizationStore.ts:4,8`: AsyncStorage, chave `@kindle/library-organization.v1`; gravação serializada, validação e controle de revisão (`:28-58`).

Uma divergência secundária preexistente do texto do modal é relevante para os riscos futuros: `OrganizationBackupModal.tsx:38` afirma preservar registros sem livro para recuperação posterior; a implementação account-scoped atual em `AccountOrganizationRepository.ts:18` rejeita o merge se algum livro não estiver disponível na conta. Isto não causa os botões residuais e não foi corrigido.

### B. Estado do código — Opções de livro

`app/(tabs)/library.tsx:348` monta `<BookCloudControls book={item}/>` em **cada card visível**, imediatamente antes do botão Organizar. Não há condição que limite esse componente a livros antigos, livros cloud-only ou conta com sync funcionando.

`src/presentation/components/LibrarySyncControls.tsx:36-40`:

- Recebe `book: LibraryBook`.
- Renderiza disponibilidade da cópia (`availabilityLabels[state]`).
- Texto e accessibilityLabel: ``Opções de ${book.title}``.
- onPress: `setVisible(true)`.
- Abre `Dialog` definido no mesmo arquivo, linha 15.
- O `Action` compartilhado, linha 14, tem borda, `paddingVertical:12`, `paddingHorizontal:10` e texto **sem** `numberOfLines`/ellipsis. Isto explica por código o aspecto de botão grande e a quebra de títulos longos. Não é uma regra de layout exclusiva do Android.
- `useEffect`, linha 39, fecha/limpa o modal ao mudar `book.ownerUserId`.

Todas as ações dependentes do botão:

| Ação | Condição / handler | Dependência e efeito |
| --- | --- | --- |
| Remover deste dispositivo | Desabilitado se busy, upload/download em curso, sem filePath, sem remotePath, ou bundledAssetId; seleção `setConfirm('device')` (`LibrarySyncControls.tsx:40`) | A confirmação chama `sync.removeDeviceCopy(book.id)`. Mantém o livro na conta e remove a cópia local depois de confirmar/validar a cópia privada remota. |
| Remover da minha biblioteca | Desabilitado se busy ou transferência em curso; seleção `setConfirm('library')` (mesma linha) | A confirmação chama `appDependencies.bookRepository.softDelete(book.id)`, `useLibraryStore.getState().refresh()` e `sync.schedule(0)`. Produz tombstone local/outbox; a exclusão remota fica dependente de sync confirmado. |
| Confirmar remoção | Só aparece após escolher device/library; desabilitado se busy | Executa o ramo escolhido, mostra erro em caso de falha, fecha modal em sucesso e libera busy no finally. |
| Fechar / voltar do Android | `Dialog` adiciona Fechar; `onClose` do BookCloudControls só fecha quando !busy | Cancela a confirmação pendente e fecha. Não remove o livro. |

Não existem neste modal ações de alterar título, favorito, tags, séries, capa, exportar backup ou importar arquivo.

Detalhes que não devem ser perdidos ao alterar a apresentação depois:

- `LibrarySyncCoordinator.removeDeviceCopy`, `src/data/library/LibrarySyncCoordinator.ts:76-80`: exige shadow remoto vivo, sem dirty/conflito e remotePath correspondente antes de evicção.
- `PrivateBookFileService.removeDeviceCopy/evictDeviceCopy`, `src/data/library/PrivateBookFileService.ts:119-145`: bloqueia corrida com transferências; exige conta; faz download de verificação e confere hash/tamanho antes de limpar ponteiro/cópia local; guarda `localEvictionPath` para conclusão recuperável.
- `AccountBookRepository.softDelete`, `src/data/library/AccountBookRepository.ts:41-47`: guarda escopo/ownership e journal da entidade book.
- `LibrarySyncCoordinator.ts:65-67`: cleanup privado só ocorre depois do tombstone remoto confirmado.
- A busca global de `.softDelete(` e `.removeDeviceCopy(` encontrou essa única entrada explícita de UI para exclusão de livro. Calls internos de rollback dos importadores e métodos de repository não substituem o menu acessível ao usuário.

### Comparação com Organizar e demais menus

`app/(tabs)/library.tsx:349` abre `BookOrganizationModal` (`:372`) com título/autor exibidos no card. `src/presentation/components/BookOrganizationModal.tsx:14-22,45-52` permite editar título, autor, favorito, coleções, tags, série, volume, capa e estado de leitura. Salvar (`:29-38`) chama `libraryOrganization.save`, depois recarrega e fecha. Não chama exclusão de livro ou remoção de cópia.

Observação sobre títulos: o card e Organizar podem usar fallback de `MOCK_BOOKS` por `toCardBook` (`app/(tabs)/library.tsx:422-435`) quando não há registro de organização. Opções usa `book.title` diretamente. Assim, títulos crus como nomes de arquivos podem aparecer em Opções mesmo quando o card tem título amigável. O use case já aplica overrides de organização antes disso. Esta diferença não prova APK antigo.

Os menus Filtrar/Ordenar (`app/(tabs)/library.tsx:210-290`) apenas mudam quais livros aparecem e a ordem. As coleções (`:293-296`) filtram. Ajustes monta `LibrarySyncControls` (`app/(tabs)/settings.tsx:12,37`) para sincronizar agora, vincular livros legados e revisar conflitos (`LibrarySyncControls.tsx:28-32`); não contém ações equivalentes de exclusão de um livro. Backups de marcadores/grifos no Reader são outros tipos de dados, não backup de organização.

Classificação contextual:

| Item/ação | Classificação | Justificativa |
| --- | --- | --- |
| Remover deste dispositivo | **ÚNICA** | Única entrada de UI localizada para evicção da cópia local; Organizar não oferece essa ação. |
| Remover da minha biblioteca | **ÚNICA** | Única entrada explícita de UI para tombstone de livro; não equivale a mudar status/coleção. |
| Exportar JSON de organização | **ÚNICA** | Único fluxo de arquivo/Share JSON deste conjunto de metadados; Library Sync não oferece exportação manual equivalente. |
| Conferir/restaurar JSON com políticas de conflito | **ÚNICA** | Operação em lote por backup; Organizar edita um livro e não restaura JSON. |
| Metadados editáveis por Organizar | **ÚNICA no menu Organizar** | São os mesmos dados que podem chegar de uma restauração ou sync, mas a interação manual por livro tem propósito distinto. Não constitui duplicação do menu de exclusão. |
| Fechar/Cancelar | **DUPLICADA como controle genérico** | Repetido entre modais por propósito normal de fechar; não é redundância funcional de gestão de livro. |
| Nome/chave `kindle-library-organization` / `@kindle/library-organization.v1` | **LEGACY, ainda utilizada** | Formato/chave herdados da marca anterior; consumidores atuais continuam lendo esses valores. Legado não significa código morto. |
| Backup como interface criada em de56b95 | **LEGACY quanto à origem, ainda ativa** | UX histórica permaneceu ligada ao repository adaptado à conta. Não há remoção documentada nos diffs encontrados. |
| Código dos dois controles | **Nenhum INUTILIZADA identificado** | Imports, montagem, estados, handlers e repositories estão conectados no HEAD e no bundle. |

Não há duplicação funcional entre as duas ações de remoção e Organizar. Remover somente o botão Opções sem realocar as ações retira capacidades atuais do usuário.

### D. Evidência — histórico, branches e worktree

Comandos apenas de leitura: `git log --all -- ...`, `git log --all -S 'Backup da organização'`, `git log --all -S 'Opções de'`, `git log --all -G 'OrganizationBackupModal|BookCloudControls'`, `git diff <commit> HEAD -- <arquivo>`, `git branch -a`, `git worktree list --porcelain`, `git show <ref>:<arquivo>`, `git reflog --all -30`.

- `de56b95b0181e9e88a4c63671c4a59306bf8a7bd` (2026-10-07), `feat: consolidate reader, library, study and authentication features`: introduziu Backup e Organizar. O único diff do BackupModal desse commit até HEAD é a troca do nome de download `kindle-organizacao.json` → `aldus-organizacao.json` no rename `52daae1`. O BookOrganizationModal permanece igual.
- `43133977235cfa48d2954f771e1040dabd5c5a45` (2026-10-11), `feat: add account library sync controls`: adicionou import e montagem de `BookCloudControls` à Library; criou o arquivo com Opções. `git diff 4313397 HEAD -- src/presentation/components/LibrarySyncControls.tsx` vazio: a implementação permanece idêntica.
- `a974e49` mudou o ciclo de importação da Library, preservando a organização.
- `5cfb961` e `13fce88` estão no histórico atual e não removeram esses controles.
- Refs locais: `main`, `origin/main`, `origin/HEAD`. `origin/main` está em `566e8a6da8efe6ae4da265dea097cf778e348d92`; sua Library já possui Backup e Organizar, sem a adição posterior de BookCloudControls.
- Existe outro worktree local `C:/a1`, detached em `d77f6e85d723d24509f858a68ab187d2fec6cfa5`, `feat: add private account library storage model`. Esse commit é ancestral do HEAD atual. Sua Library também tem Backup e Organizar; ainda não tem BookCloudControls, introduzido depois. Não é evidência de uma branch que removeu os botões. Não foi feito checkout, build, limpeza ou alteração nesse worktree.
- **Nenhum commit de remoção dos dois controles encontrado nos refs locais/histórico inspecionado.** Não foi feito fetch e não se afirma conhecer commits exclusivamente remotos, inacessíveis ou fora dos refs disponíveis.

### C/D. Reprodução e evidência — APK arquivado

Reprodução da inspeção está em `artifacts/diagnostico-2026-10-12/library-ui-probe.cjs`; resultado sanitizado em `LIBRARY_UI_COMPILED_EVIDENCE.json` no mesmo diretório. O helper só lê Git, APK, bundle e source map e escreve este artefato de diagnóstico; não executa o app ou acessa rede.

| Campo | Resultado |
| --- | --- |
| APK local | `C:/KIndle/artifacts/apk/Aldus-13fce88.apk` |
| Bytes | 251622870 |
| SHA-256 medido novamente | `05a4bc5ea2e8277fbc9a9d9673be48ac47f5fb8620f3d6e233abc0270c8019d6` |
| Bundle bytes/hash | 7112780 / `582a9ce52d044afc22a11f148206eb6ab64eaa1ba4293902300c5369ef973b63` |
| Bundle do APK versus release gerado | Igual byte a byte |
| Source map versus HEAD | Library, LibrarySyncControls, OrganizationBackupModal, BookOrganizationModal e dependencies: presentes e conteúdo igual ao commit, normalizando CRLF/LF |
| Backup e Opções no bundle Hermes | Encontrados em UTF-16LE; busca somente UTF-8 seria insuficiente |
| Organizar e ações de remoção | Encontradas no bundle |
| Execução física | Não realizada; aparelho ADB indisponível |
| Identidade do APK instalado | **INCONCLUSIVA** |

Presença de texto isolado poderia ser código morto; aqui ela foi combinada com fonte compilada idêntica ao HEAD e imports/montagem ativos na rota. Isto prova que o build arquivado conserva a implementação residual, embora não substitua uma observação da tela em execução física.

### G. Hipóteses descartadas e inconclusivas

- Descartada para o HEAD/artefato13fce88: “o código atual já removeu os botões”. Ambos estão no JSX atual e nos componentes compilados.
- Descartada no histórico local encontrado: “a remoção foi feita numa branch local alternativa”. O outro worktree é anterior e conserva Backup; não há commit de remoção localizado.
- Descartada para a rota pessoal atual: “mais de uma Library compete pela mesma rota”. Só uma implementação foi encontrada; SourceLibraryScreen tem função/rota diferentes.
- Não sustentada: “Backup/Opções são componentes inutilizados”. São referenciados/renderizados e têm ações ligadas.
- Inconclusiva: qual artefato/commit está instalado no telefone. ADB indisponível e markers de versão genéricos não identificam commit.
- Não foi reproduzida a disposição visual física dos exemplos pessoais; não foram extraídos livros, contas ou banco de dados do usuário.

### H/I. Correção recomendada e regressões a preservar

Implementar em etapa futura a decisão de UX do usuário: retirar o Backup da tela principal e trocar a apresentação extensa de Opções por um menu compatível com o design desejado, mantendo/remapeando explicitamente as duas ações únicas de remoção, a confirmação e os guardas de transferência/conta. Se a intenção for aposentar exportação/restauração manual por completo, registrar conscientemente a perda dessa capacidade; não tratar como recurso idêntico ao sync.

Não apagar `libraryOrganization`, repositories, key/format legado ou journal só porque o botão Backup sair: Organizar, filtros, favoritos, séries, Library, Reader e sync dependem da mesma organização. Não apagar `LibrarySyncControls.tsx` inteiro: também contém os controles de Ajustes, conflitos e vínculo de livros locais. Seus helpers Action/Dialog são compartilhados.

Na etapa futura, preservar e validar: organização e overlay após restart; filtro/favoritos/coleções; remoção local com remota confirmada; reabrir e baixar novamente; exclusão da biblioteca com tombstone offline e limpeza só após confirmação; livro bundled protegido de evicção; transferências em curso; conta trocada durante ação; erro de backend mantendo estado/outbox; acessibilidade e títulos longos; garantia de que Opções/Backup não reaparecem por outra entrada. `scripts/test-library-web.cjs:51,54` atualmente usa `Opções de <título>` para acessar as duas remoções: eventual mudança de interface exige preservar o cenário de teste em vez de eliminar sua cobertura. `scripts/test-library-organization.cjs` cobre parser/backup/revisões com armazenamento injetado; sua existência não prova comportamento físico.

Nenhuma das recomendações foi implementada nesta etapa. Parada após diagnóstico.

## Evidências

Todos os novos artefatos técnicos estão em `C:/KIndle/artifacts/diagnostico-2026-10-12/`, ignorados pelo Git. Não contêm EPUB real Amêndoas, payload de outbox física, dados de contas, access/refresh tokens, code ou Client Secret. Fixtures não são dados do aparelho.

| Evidência | Alcance |
|---|---|
| `EPUB_DIAG.md`; `epub-parser-diagnostic.cjs`; `epub-synthetic1/88/profile-measurements.json`; `epub-bundled-measurements.json`; CPU summary/profile | Parser atual, fixture sintética e Freud existente; V8 desktop, sem persistência física. Nomes efetivos: `epub-synthetic1-measurements.json`, `epub-synthetic88-measurements.json`, `epub-syntheticprofile-measurements.json`, `epub-synthetic-cpu-summary.json`, `synthetic-epub88.cpuprofile`. |
| `DRIVE_DIAG.md`; `diagnose-drive-state.cjs`; `drive-state-probe.json`; `drive-public-root.json` | Código/HTTP/auth/storage controlados e GET da página pública; nenhum grant/API real autenticado. |
| `SYNC_DIAG.md`; `sync-public-probe.json`; `sync-client-reproduction.cjs/json` | Probes GET públicos; adapter/engine atuais isolados, sessão/3 entries fictícias; nenhuma sync real. |
| `LIBRARY_UI_DIAG.md`; `library-ui-probe.cjs`; `LIBRARY_UI_COMPILED_EVIDENCE.json` | Git/JSX/source map/ZIP bundle lidos; sem execução física ou dados de livros. |
| `artifacts/drive-tree/APK_FINAL_EVIDENCE.json` e ledger APK | Build13fce88 arquivado; hash reconferido nesta fase. Não identifica APK instalado. |

Reprodução mínima dos novos achados, somente fixtures/arquivos locais ou GET público:

```text
node --expose-gc artifacts/diagnostico-2026-10-12/epub-parser-diagnostic.cjs synthetic88
node artifacts/diagnostico-2026-10-12/diagnose-drive-state.cjs
node artifacts/diagnostico-2026-10-12/sync-client-reproduction.cjs
node artifacts/diagnostico-2026-10-12/library-ui-probe.cjs
```

O teste existente `node scripts/test-book-import.cjs` foi usado como controle do lifecycle/cancelamento/rollback e passou; não exercita o EPUB pesado. Não foram rodadas baterias amplas que só confirmariam o código sem oferecer nova evidência. Não se aplicaram migrations nem se sincronizou a biblioteca real.

## Causas confirmadas

1. **EPUB, mecanismo:** parser atual relê/reconverte CSS/fontes por capítulo, persiste Base64 duplicado e bloqueia event loop na fixture. Não equivale a confirmar o caso Amêndoas ausente.
2. **Drive, estados controlados:** crawl serial inteiro bloqueia conclusão de add; status da fonte pode continuar active após catálogo falhar; controller externo não cancela refresh; guard de source ausente pode deixar loading após Promise resolvida; file shortcuts não são percorridos. Não sabemos qual caso ocorreu fisicamente.
3. **Sync, contrato:** mensagem produzida por HTTP404; endpoints de Library retornam404/PGRST205 no schema cache remoto; pull inicial bloqueia pushes/upload. Composição de37 pendências física não acessada.
4. **Library UI:** Backup e Opções continuam montados no HEAD e APK arquivado; nenhum commit de remoção encontrado nos refs locais. As ações de remoção de livro são únicas na UI atual.

## Hipóteses descartadas

As exclusões específicas de cada problema estão nas seções G. Não descartamos corrupção/erro de leitura do EPUB real, ausência/expiração de grant da última tentativa Drive, APK antigo instalado, bucket privado existente ou operação problemática posterior ao pull; faltam dados para isso. Descartar uma hipótese no código/fixture não certifica o telefone.

## Pontos inconclusivos

- APK instalado: identidade/assinatura/data/commit; sem aparelho.
- EPUB Amêndoas real: bytes/estrutura/timing/perfil/native IO/heap/OOM/ANR/persistência; sem arquivo/aparelho. A fase visível pode estar desatualizada por falta de repaint.
- Drive físico: nenhuma das requests/callbacks dessa tentativa foi capturada; última etapa concluída/primeira falha/queue/visited/pageToken/ready não localizados. Probes públicos não substituem autorização/API.
- Backend: diferença entre migrations fisicamente ausentes, projeto/schema/exposição incorretos ou cache desatualizado; RPC/bucket/RLS efetivos não inventariados administrativamente. Bucket anônimo “NoSuchBucket” não basta para declarar ausência.
- Outbox37: tipos/flags/conflitos/retries agregados/entry venenosa desconhecidos; contador mistura dirty entries e arquivos. Não exportar payload para descobrir isso.
- Refs exclusivamente remotos ou commits fora do histórico disponível não investigados; nenhum fetch executado.

## Próxima correção recomendada

As propostas nos itens H são planos para outra etapa, não autorização/execução nesta auditoria. Preservar cópias/filas originais antes de reproduzir fisicamente; nunca limpar dados/outbox como forma de “resolver” diagnóstico. Obter arquivo e trace do mesmo APK antes de escolher mudanças especulativas do EPUB/Drive. UI pode ser corrigida após uma decisão sobre onde preservar suas ações exclusivas. Sync exige inventário do contrato antes de um deployment.

# Ordem recomendada para a próxima etapa

0. **Pré-requisito comum:** identificar o APK instalado por hash/assinatura e obter Amêndoas real + log da operação Drive; conservar dados e fila. A ausência desses insumos limita a confirmação física, não é justificativa para alterar algoritmos às cegas.
1. **CRÍTICO — EPUB freeze:** mecanismo de expansão/event loop confirmado e relato de bloqueio total; validar arquivo/Android e reduzir trabalho/memória sem perder recursos/cancelamento/persistência. Pode afetar responsividade de outros fluxos se executado simultaneamente, mas essa relação ainda não foi comprovada.
2. **ALTO — Library Sync/contrato remoto:** 404 atual foi reproduzido e bloqueia pull antes de todas as operações. Inventariar projeto/schema/migration ledger/bucket/ACL/RLS; somente na próxima tarefa decidir implantação001→002 ou reconciliação. Depois inspecionar37 pendências agregadas e operação individual se necessário.
3. **ALTO — Drive indexing:** capturar fase real durante o pré-requisito e, a partir dela, corrigir a espera/erro/cancelamento/estado identificado. Os achados controlados são úteis, mas não substituem a falha real. Não reabrir OAuth genericamente nem mudar crawler por hipótese.
4. **MÉDIO — Library UI/Backup:** retirar ou reposicionar os controles conforme UX pedida, conservando/remapeando remoção local/conta, confirmação/guardas e organização/sync. Menor dependência técnica, pode ser planejada em paralelo, mas não remove o freeze nem o404.

## Tabela final

| Problema | Reproduzido | Primeira divergência | Causa | Confiança | Próxima ação |
|---|---|---|---|---|---|
| EPUB Amêndoas | Não no arquivo/aparelho; mecanismo sim em sintético | Física inconclusiva; fixture CSS/resources por capítulo | PROVÁVEL no arquivo; amplificação confirmada no HEAD | Média física / alta mecanismo | Obter mesmo EPUB+APK/log; medir e corrigir representação/CPU/cancelamento |
| Google Drive | Não físico; cinco estados controlados sim | Física não localizada; waits/catálogo/guard documentados | INCONCLUSIVA física; estados auxiliares confirmados | Baixa física / alta código | Capturar trace por fase e só então escolher mudança |
| Library Sync | GET público + adapter/engine controlados; não físico | GET user_library_items404/PGRST205 antes de push | Contrato indisponível CONFIRMADO; backend não deployado PROVÁVEL | Alta no contrato / não conclusiva para ausência física | Inventário remoto e decisão de deployment/contrato; preservar fila |
| Backup da organização | Presença em JSX e compilado; sem execução física | Library.tsx:294 | CONFIRMADA: montagem ativa, remoção não encontrada | Alta no HEAD/artefato | Retirar/relocalizar UX após preservar dados/ações |
| Opções de livro | Presença em JSX e compilado; sem execução física | Library.tsx:348→LibrarySyncControls.tsx:40 | CONFIRMADA: BookCloudControls ativo | Alta no HEAD/artefato | Substituir apresentação preservando duas ações únicas |

## Encerramento e integridade

Instrumentação acrescentada ao aplicativo: **NÃO**. Somente wrappers/contadores/profiling de scripts isolados ignorados; nenhuma flag de produção ativada/compilada. Nenhum commit artificial e nenhum build solicitado/necessário nesta etapa documental. HEAD preservado; fontes/testes/configuração permanecem sem diff. Este arquivo foi criado no início e atualizado durante a coleta.

**NENHUMA CORREÇÃO FUNCIONAL FOI APLICADA NESTA ETAPA.** A investigação termina aqui; a próxima execução deve tratar as recomendações como trabalho futuro e validar suas hipóteses restantes.
