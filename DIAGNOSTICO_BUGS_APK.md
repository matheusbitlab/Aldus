# DIAGNÓSTICO DE BUGS DO APK

## Adendo — OCR local de PDF, 11/10/2026

O diagnóstico específico do item 4 confirmou ausência total de motor OCR no baseline (**E**, com fallback **A**): as mensagens “requer OCR” apenas explicavam a rejeição conservadora da extração PDF.js. A causa de Sociedade/Manifesto já estava comprovada antes do builder: mapas de caracteres entregavam muitos controles. A solução atual não tenta reparar encoding nem inventar caracteres; renderiza localmente somente páginas marcadas, usa ML Kit latino empacotado no Android, valida o texto reconhecido e só então monta Reflow. Resultado ausente/ruim retorna ao PDF Original. Web não simula suporte.

Risco residual: OCR é probabilístico, a tarefa ML Kit corrente não expõe cancelamento e a validação física não ocorreu. O lifecycle descarta retorno tardio e não inicia nova página após cancelamento. Compilação Kotlin/APK está bloqueada neste ambiente pela ausência/licença de Android Platform 36 e Build Tools 35, não por erro já observado no módulo. Consulte o checkpoint `OCR — AUDITORIA` em `CORRECOES_BUGS_APK_PROGRESSO.md` para matriz e limites atuais.

Data: 07/10/2026 — America/Sao_Paulo.

Escopo: nove problemas relatados no APK do Kindle Reader. Auditoria de código, artefato, extração PDF e consultas de rede; nenhuma correção, refatoração, migration, mudança de configuração externa ou instrumentação da aplicação foi executada.

FLASHCARDS: FORA DO ESCOPO DESTA AUDITORIA. Não foram investigados sistema, redesign, batalha, geração, múltipla escolha ou nomenclatura. Referências históricas a essa área nos documentos de contexto não constituem investigação dela.

## Resumo executivo

| ID | Problema | Gravidade | Causa | Confiança |
|---|---|---|---|---|
| 1 | Reflow/texto corrompido | ALTA | O Native aceita extração textual corrompida sem a avaliação de qualidade existente no Web; Builder e Reader a consideram texto suficiente | CONFIRMADA |
| 2 | Documento sob a barra do sistema | ALTA | O Header consome o inset; o contêiner documental Native não o recebe, apesar do layout edge-to-edge | CONFIRMADA |
| 3 | Header visível sem interação | ALTA | Alvo real do toque não identificado; há wrappers sem altura no Reflow e um banner de feedback acima do Header | INCONCLUSIVO |
| 4 | Google retorna erro depois do consentimento | ALTA | A mensagem específica aponta para falha da troca do código externo entre Supabase e Google, anterior à troca PKCE pelo app | FORTE EVIDÊNCIA |
| 5 | Login email mostra erro e permite entrada | CRÍTICA | Não foi comprovado ingresso sem sessão válida; sessão anterior, auth concluído seguido de erro de UI e corrida de estado precisam ser distinguidos | INCONCLUSIVO |
| 6 | Cadastro não aceita senhas | ALTA | Cliente exige oito caracteres e confirmação exata; motivo efetivo do backend é ocultado e sua policy não está acessível | INCONCLUSIVO |
| 7 | Recuperação retorna para localhost | ALTA | Native envia deep link com `next=reset-password`; allowlist/Site URL/template efetivos não foram disponibilizados | INCONCLUSIVO |
| 8 | Reflow trava em 98–100%; cancelar/voltar não funcionam | CRÍTICA | Há lacunas de terminação/erro/cancelamento no Native, mas não foi localizada a origem de `bytecode is not defined` nem reproduzido o bloqueio físico | INCONCLUSIVO |
| 9 | Busca fica em “Consultando fontes” | ALTA | Gutendex expirou no teste atual; pipeline agrega todas as fontes e aguarda histórico, mas a Promise presa no Android não foi identificada | INCONCLUSIVO |

Contagem de classificações principais: **2 CONFIRMADAS, 1 FORTE EVIDÊNCIA, 0 HIPÓTESES, 6 INCONCLUSIVOS**. Hipóteses internas estão identificadas como possibilidades e não aumentam a contagem de causas confirmadas. A gravidade considera o impacto relatado, mesmo quando a causa não foi reproduzida.

## Base examinada, cadeia de evidência e limites

- Workspace: `C:\KIndle`, branch `master`, HEAD `77c490c` — `build: add native Android project and local release APK command`; anterior `de56b95` — funcionalidades consolidadas.
- No início, `git status --short`, `git diff --stat` e `git diff --name-only` estavam vazios. Não foram executados reset, clean, checkout/restore, stash ou commit nesta auditoria.
- Artefato local: `android/app/build/outputs/apk/release/app-release.apk`, gerado em 07/10/2026 às 08:31:37, 207.511.858 bytes, package `com.kindle.reader`, versão `1.0.0`, versionCode `1`, variant `release`.
- SHA-256 do APK: `f4f2024c138d65a5836bb0c793671a817f72cf6263e96ca6510c1f6334c56cb0`.
- O sourcemap Android local contém `PdfReflowProcessor.native.tsx` e não contém `PdfReflowProcessor.web.tsx`. Seus conteúdos de `ReaderScreen`, `ReaderControls`, `authService`, `supabase` e processador Native coincidem com os arquivos atuais, normalizando apenas CRLF/LF. É evidência do build local; não é uma leitura do APK instalado no aparelho do usuário.
- `adb devices -l` não encontrou aparelhos ou emuladores. Não houve logcat, leitura do SQLite/AsyncStorage do aparelho, hierarquia de Views, captura de toques nem login real controlado. Não foi instalado/recompilado APK nesta auditoria.
- O anexo contém o relato textual. Não há imagem anexada da tela com `bytecode is not defined`, URL completa do callback, mensagem original de senha nem log da autenticação. A referência à imagem é tratada como relato, não como screenshot examinada.
- Foram consultados os contextos EPUB/progresso, seções relevantes de PDF/safe-area/Auth/fontes/handoffs em `PROJECT_CONTEXT.md`, `ROADMAP_FUNCIONALIDADES.md`, `AUTH_IMPLEMENTATION.md`, `COPILOT_CONTINUATION_AUDIT.md` e README. Não foram revisitados detalhes funcionais de Flashcards.
- Documentação histórica descreve ensaios de versões anteriores e contém afirmações de “safe area implementada” mais amplas que o caminho Native observado. Código e consultas atuais prevalecem. Por exemplo, a sonda atual de `profiles` responde permissão negada, diferente do relato histórico de tabela ausente; não se inferiu o schema ou estado de migrations dessa diferença.
- Os ensaios adicionais executaram leitores de arquivos e bibliotecas em memória/stdin. Não criaram scripts/fixtures/logs novos nem alteraram a aplicação. A única entrega criada é este Markdown.

## BUG 1 — Reflow/texto corrompido

### Sintoma observado

“Sociedade do espetáculo” chega a “Leitura livre pronta”, porém mostra números, símbolos, letras isoladas e espaços inadequados. O sintoma é de PDF em modo **Reflow**, não de EPUB nem do visualizador de páginas Original.

### Caminho de código

`BundledPdfCatalog.importAll/resolveUri` → `ReaderScreen` resolve `bundled-pdf://...` para asset local → escolha `mode=reflow` → `PdfReflowProcessor.native` lê Base64 → WebView com PDF.js 3.11.174 → `getTextContent()`/`getOperatorList()` → mensagens `page` → `buildPdfReflowDocument` → `handleReflowComplete` → cache SQLite → `toStoredReflowChapters` → `EpubPageViewer.native`.

### Evidências

1. `src/data/local/BundledPdfCatalog.ts:15` usa `require.context("../../../Livros", false, /\.pdf$/i)`. O candidato empacotado é `Livros/sociedade do espetaculo.pdf`, 576.931 bytes. A cópia em `assets/Livros` é byte a byte idêntica.
2. SHA-256 do PDF: `3e8eea33eb3e30544b9dc6856df1223e114dbfd8587398d627d7fab43b00dd48`. A entrada **`res/lF.pdf` do APK local** tem o mesmo tamanho e hash, comprovando a presença desse arquivo no artefato.
3. Foi feita extração integral das 169 páginas com PDF.js **6.3.289 instalado** e **3.11.174 do mesmo CDN usado no Native**. Ambos produziram exatamente:

| Métrica antes do Builder | Resultado |
|---|---:|
| Caracteres extraídos | 194.073 |
| Letras Unicode | 4.177 |
| Caracteres de controle, exceto TAB/LF/CR | 120.122 |
| Proporção de controles | 61,8953% |
| Proporção de letras | 2,1523% |

4. A página 2 retorna itens como `"2"`, strings vazias e `"\u0001\u0001"`. A corrupção existe em `items[].str` antes da construção de parágrafos, HTML ou renderização.
5. Os itens reais foram submetidos ao **Builder existente**, em memória, com imagens vazias para isolar texto: resultado `classification="text-based"`, `characterCount=198085`, um capítulo. O primeiro bloco preserva códigos de controle. O texto “PROJETO PERIFERIA” em um trecho não torna o restante legível.
6. O Web avalia qualidade em `PdfReflowProcessor.web.tsx:57` e rejeita o total em `:83`. Seus critérios incluem pelo menos 100 controles, proporção de controles ≥ 20% e baixa proporção de letras. As métricas deste arquivo satisfazem a rejeição.
7. O Native, em `PdfReflowProcessor.native.tsx:132` e `:197`, copia `item.str` e não chama essa avaliação. Em `:68`, passa páginas diretamente ao Builder.

### Causa encontrada

**Falha do sistema comprovada:** a barreira de qualidade foi implementada somente no Web. No APK, caracteres extraídos sem qualidade mínima recebem classificação textual por quantidade. O Reader valida classificação/contagem/capítulos, e não legibilidade; por isso aceita, persiste e exibe o derivado.

Não foi isolado o defeito interno do mapeamento de fontes/encoding do PDF. Dizer apenas “PDF corrompido” seria insuficiente: o arquivo Original continua sendo um documento visualizável, e o sistema tem capacidade de reconhecer a extração inválida, mas não a aplica ao caminho Native.

O Builder não inventa os códigos de controle. Ele altera ordem, espaços, agrupamento, remoção de cabeçalhos e quebras. A passagem de 194.073 caracteres brutos para 198.085 caracteres de blocos demonstra transformação adicional, não recuperação textual. Não foi medida visualmente a contribuição de cada heurística aos “espaços enormes” no WebView físico.

### Confiança

**CONFIRMADA**, para a corrupção pré-Builder e a ausência da proteção no Native que permite sua publicação. O URI da instância efetivamente aberta no aparelho e o estado do cache dele não foram lidos.

### Arquivos/funções envolvidos

- `src/data/local/BundledPdfCatalog.ts:15`, `:33` — catálogo e resolução de URI.
- `src/presentation/components/PdfReflowProcessor.native.tsx:48`, `:132`, `:191` — bridge, conversão dos itens e extração.
- `src/presentation/components/PdfReflowProcessor.web.tsx:57`, `:83`, `:160` — proteção ausente no Native.
- `src/data/local/PdfReflowDocumentBuilder.ts:205`, `:236`, `:159`, `:416` — reconstrução, classificação e HTML.
- `src/presentation/screens/ReaderScreen.tsx:448`, `:472` — aceitar documento e fallback.
- `src/domain/types/pdfReader.ts:94` — versão do processador.

### Por que proteções existentes falharam

O Builder usa `minimumText = max(500, pageCount * 20)`. Para 169 páginas, basta superar 3.380 caracteres; caracteres inválidos também entram na contagem. `handleReflowComplete` rejeita apenas `image-based`, zero caracteres ou ausência de capítulos. Não há checagem compartilhada de qualidade antes do cache nem da tela.

### Web x Native

Web: PDF.js 6.3.289 do pacote, worker próprio, métricas de qualidade, `page.cleanup()` e `task.destroy()` no cleanup. Native: PDF.js **3.11.174 remoto** em WebView invisível, bridge JSON/Base64, sem validação de qualidade, sem `page.cleanup()` no loop e sem protocolo de cancelamento. Builder/Reader são compartilhados; extração e proteções não são.

O Web ainda referencia CMaps 3.11.174 apesar da biblioteca instalada 6.3.289. É uma diferença real de configuração, mas os dois scans reproduziram as mesmas métricas; não se atribui este caso à diferença de versões de CMap.

### Cache

`PDF_REFLOW_PROCESSOR_VERSION` é **10**. A versão é respeitada no Reader compartilhado, inclusive Native: conferida junto da assinatura na abertura (`ReaderScreen:298`) e mudança de modo (`:424`), gravada em `:459`.

Native usa `SqlitePdfReflowCacheRepository`; Web usa IndexedDB. O SQLite faz `JSON.parse(document_json)` sem validar qualidade. Um documento ruim produzido **pela própria V10 Native** passa na checagem V10 e pode ser reutilizado. “Versão correta” não significa “conteúdo validado”. O cache não registra versão do PDF.js, plataforma ou resultado de qualidade.

A assinatura é `fileHash ?? fileName|fileSize|mimeType` (`ReaderScreen:1054`). Não equivale sempre a um hash de conteúdo. Não se comprovou que o cache do aparelho contenha versão antiga; a nova extração já explica o problema sem essa hipótese. Na abertura, existe ainda um ramo de `image-based` fora da validação completa de assinatura/versão (`:305`), relevante para consistência futura, mas não causa deste texto ilegível.

### Fallback

Deveria ser acionado por extração inválida, como o Web já faz. `handleReflowError` muda para Original e limpa preparação/restauração/documento. No Native, a extração corrupta **não lança erro** e produz `text-based`; portanto chega ao ramo de sucesso e o fallback não é chamado. O arquivo fonte não é substituído pelo derivado.

### Cancelamento

Não foi necessário cancelar os scans de 169 páginas. As diferenças de cancelamento do aplicativo são analisadas no BUG 8; nenhum cancelamento no aparelho foi validado.

### Erro observado

Neste caso houve **sucesso indevido**, não exception: 120.122 controles aceitos, documento textual montado e mensagem de conclusão. Essa distinção explica por que o tratamento de exceptions não protege o usuário.

### Correção conceitual recomendada

Definir uma validação única e conservadora de extração/derivado, usada antes do Builder/publicação/cache em ambas as plataformas. Rejeitar o caso comprovado e retornar ao Original com explicação. Marcar validade/proveniência do cache e impedir reutilização de derivados que não passaram pelo novo contrato, com estratégia explícita de invalidação. Não tentar substituir controles por letras nem apresentar OCR inexistente como solução.

### Risco da correção

Falsos positivos em PDFs técnicos, numéricos ou com fontes legítimas. Exige matriz com este PDF, Manifesto, documentos legíveis, mistos e sem texto. Unificar/incrementar versão do contrato deve preservar Original, progresso e dados existentes; não apagar a biblioteca.

### Requer nova build Android?

**SIM**, para instalar no APK standalone qualquer alteração do processador/validação/cache embutidos. Não há atualização OTA configurada no artefato examinado.

## BUG 2 — Safe area do documento

### Sintoma observado

O documento começa sob hora/bateria/sinal com controles ocultos; ao abrir o Header, seus botões aparecem abaixo da barra do sistema.

### Caminho de código

`RootLayout/SafeAreaProvider` → `AppShell` → Stack sem header nativo → `ReaderScreen.styles.screen/reader` → `documentSurface` → adapter → viewer Native. O Header segue um caminho paralelo com padding próprio.

### Evidências

- `app/_layout.tsx:19` instala `SafeAreaProvider`. `AppShell:32` lê os insets, mas `paddingTop/paddingBottom` em `:48` só são aplicados quando **Web e largura > 480**. O Native cai no ramo de fundo sem padding (`:50`). Provider disponibiliza medidas; não aplica padding automaticamente.
- `ReaderScreen:64` lê insets. No estado loading/error eles são aplicados (`:855`, `:875`); na tela pronta (`:949`) `styles.screen` e `styles.reader` ocupam 100% sem padding/insets.
- `DocumentReaderAdapter:201` e `EpubPageViewer.native:172` usam contêineres integrais. Nenhum recebe inset superior/inferior como geometria documental.
- `TopHeader:32–40` aplica `paddingTop = max(insets.top, 16)` no Native. Portanto a diferença entre Header e documento tem causa explícita.
- `EpubReaderDocument:103` tem padding tipográfico fixo **24px em cima e 32px embaixo**, não o inset do Android. `marginSize` afeta margens tipográficas, não mede barra do sistema.
- `android/gradle.properties:47` habilita edge-to-edge; o projeto mira SDK 36. Definir cor da StatusBar não cria área útil documental. A [documentação React Native de StatusBar](https://reactnative.dev/docs/statusbar) também distingue comportamento da barra no Android com edge-to-edge.

### Causa encontrada

A área útil do documento não é limitada pelos insets Native. O Header aplica sua própria compensação, e os estados de abertura/erro também, mas o caminho de leitura pronta não. Ao alternar controles o documento permanece no mesmo viewport; o Header cobre a parte superior com uma superfície que respeita o inset. Isso pode dar impressão de que o documento foi corrigido quando o menu aparece, sem realmente mudar sua geometria.

### Confiança

**CONFIRMADA**, para a assimetria de aplicação de insets no código Native. Não foi medida a altura exata da status bar/cutout do aparelho.

### Arquivos/funções envolvidos

`app/_layout.tsx:30` (`AppShell`); `ReaderScreen.tsx:949`, `:1058` (tela pronta/styles); `DocumentReaderAdapter.tsx:144`, `:201`; `EpubPageViewer.native.tsx:172`; `PdfPageViewer.native.tsx` (stage integral); `TopHeader.tsx:32`; `EpubReaderDocument.ts:103`.

### Por que proteções existentes falharam

Foram aplicadas ao Header, modais, feedback e estados de loading/error, não à geometria do documento pronto. `statusInsetTop` posiciona o banner em `ReaderScreen:1012`, não o livro. Fullscreen em `handleToggleFullscreen:490` é exclusivo do Web e não explica o Native. Não há leitura de `controlsVisible` que reserve área de status bar para o documento.

### Correção conceitual recomendada

Definir um único proprietário dos insets para a superfície documental Native. Aplicar a geometria útil sem trocar ancestralidade/key do viewer ao alternar controles; separar padding do sistema de margem tipográfica. Rever o Header/footer para evitar dupla compensação. Preservar o contrato de restauração/repaginação.

### Risco da correção

Mudar altura útil repagina EPUB/Reflow e pode deslocar posições; aplicar padding em dois níveis duplica a margem. Validar cutout, navegação por gestos, Original/Reflow/EPUB e controles visíveis/ocultos.

### Requer nova build Android?

**SIM**, para entregar a mudança de layout no APK standalone. Não se identificou necessidade obrigatória de adicionar biblioteca nativa.

## BUG 3 — Menu superior visível, mas sem toques

### Sintoma observado

Após toque central, o Header aparece; voltar/busca/sumário/Aa não respondem. O relato não identifica o modo do documento no momento de cada ocorrência.

### Caminho de código

No Reflow: `ReaderScreen` → `ReaderControls` → slot documental absoluto → wrapper `Animated.View reflowHeader` → `TopHeader` absoluto. EPUB/Original: adapter e `ReaderControls.controls` são irmãos; controls ocupa a tela inteira.

Árvore relevante do Reflow:

```text
reader
├─ ReaderControls.reflowOverlay                     zIndex 20, box-none
│  ├─ reflowDocumentOverlay → adapter/viewer         absolute fill
│  │  └─ ReadingTouchZones                          zIndex 5, top/bottom 20%
│  ├─ Animated.View.reflowHeader                    zIndex 20, box-none/none
│  │  └─ TopHeader                                 absolute, zIndex 20, elevation 4
│  └─ Animated.View.reflowFooter                    zIndex 20, box-none/none
├─ MotionCuesOverlay                               pointerEvents none
├─ PdfReflowProcessor, quando preparando            zIndex 30
└─ reflowFeedback, quando preenchido                zIndex 40
```

### Evidências

- Os handlers existem: `readerControlProps` (`ReaderScreen:940`) chama biblioteca/setReaderPanel; `TopHeader:43–91` os liga a Pressables com hitSlop. Não se encontrou handler vazio para voltar/Aa.
- `ReaderControls:59` usa `box-none` quando visível e `none` quando oculto. `box-none` permite interação dos filhos, não a bloqueia por definição.
- No caminho com documento, `reflowHeader/reflowFooter` (`:161`) têm somente zIndex, sem altura/padding. Seus filhos Header/footer são absolutos: podem desenhar fora da caixa calculada do wrapper. É um candidato de discrepância visual versus hit testing.
- Não é correto declarar que toda View com altura zero necessariamente bloqueia filhos nesta versão. `TouchTargetHelper.kt:188–208`, do React Native instalado, também examina **overflowInset e clipChildren** antes de descer aos filhos. A [documentação de View](https://reactnative.dev/docs/View) descreve limites de hitSlop e prioridade de z-order. A geometria/overflow nativa efetiva precisa ser capturada.
- `reflowFeedback` (`ReaderScreen:1004`, `:1088`) ocupa de `left=16` a `right=16`, começa em `statusInsetTop+12` e tem **zIndex 40**, acima do Header. “Leitura livre pronta” permanece até `Fechar` ou mudança de estado; texto e botão podem interceptar parte da área do Header. Não foi fornecido screenshot mostrando se estava presente.
- `ReadingTouchZones:68` cobre só os 60% centrais da altura, com top/bottom 20%, não é um absolute fill sobre toda a tela. Em viewport usual seu retângulo não cobre o Header; só pode ser avaliado com medidas reais.
- O overlay de movimento se chama **`MotionCuesOverlay`**, não `MotionSicknessOverlay`, e usa `pointerEvents="none"`. Brilho Native chama APIs de luminosidade; não acrescenta uma View de toque sobre o Header.
- O WebView do processador é absolute fill/opacidade zero, mas só existe enquanto `reflowPreparing`; o painel vem depois dele. Opacidade zero não equivale a `pointerEvents=none`, mas sua presença não foi comprovada no incidente do Header pronto.

### Causa encontrada

**O elemento que efetivamente recebe o toque não foi identificado.** Há dois candidatos concretos: geometria/overflow dos wrappers Reflow e sobreposição do banner zIndex 40. Não há evidência para atribuir o problema ao anti-enjoo ou afirmar que as zonas centrais cobrem o Header. Se o bug também ocorre em EPUB/Original, a hipótese exclusiva dos wrappers Reflow perde abrangência.

### Confiança

**INCONCLUSIVO.** Evidência insuficiente para confirmar causa.

### Arquivos/funções envolvidos

`ReaderScreen.tsx:926`, `:960`, `:1004`, `:1088`; `ReaderControls.tsx:46`, `:131`; `TopHeader.tsx:32`, `:96`; `ReadingTouchZones.tsx:40`, `:68`; `MotionCuesOverlay.tsx:10`; `PdfReflowProcessor.native.tsx:83`.

### Por que proteções existentes falharam

zIndex/elevation controlam desenho, mas não provam alcançabilidade dos filhos. `box-none` não corrige caixas/overflow inadequados nem remove irmãos acima. Os logs `FORENSIC` registram toggle central e estado documental, não o target do toque do Android. Nenhum log foi acrescentado.

### Correção conceitual recomendada

Antes de escolher mudança, capturar modo, `controlsVisible`, `reflowPreparing`, `reflowFeedback` e retângulos do wrapper/Header/banner/viewer/zones no mesmo frame. Registrar receiver/target nativo e chegada a `onPress`. Se comprovado wrapper sem área acessível, ajustar caixa mantendo o slot documental; se comprovado banner, rever sua área/ordem/interação. Não aumentar zIndex globalmente sem localizar o alvo.

### Risco da correção

Regressões em seleção/virada de página, overlay/modal, remount e reset de progresso se a árvore for reorganizada. Prioridade para preservar identidade do viewer.

### Requer nova build Android?

**DEPENDE** do diagnóstico. Ajustes no código embutido exigiriam **SIM** no APK standalone; uma coleta de logs do APK atual não exige rebuild se as informações já existirem.

## BUG 4 — Google Login retorna erro

### Sintoma observado

Consentimento Google aparentemente conclui; app mostra “Não foi possível concluir” e a mensagem sobre código expirado/credenciais OAuth incorretas.

### Caminho de código

`loginWithGoogle` → `signInWithOAuth(provider=google, redirectTo=kindlereader://auth/callback, skipBrowserRedirect=true)` → `Linking.openURL(data.url)` → browser externo → Google → `/auth/v1/callback` do Supabase → deep link → `app/auth/callback` → **somente se houver code e não erro** `exchangeCallbackCode` → `exchangeCodeForSession` → evento Auth → `AuthProvider.resolve` → perfil/guard.

### Evidências

- `authService.ts:46–53` usa browser do sistema via Linking. **Não há WebBrowser/openAuthSessionAsync no caminho atual**; não se deve descrever uma API que não está implementada.
- `supabase.ts:16` configura AsyncStorage, persistSession, flowType PKCE e `detectSessionInUrl=false`.
- A frase relatada é produzida especificamente em `app/auth/callback.tsx:40–41`, quando a descrição contém **`Unable to exchange external code`**. Esse ramo termina antes de chamar `exchangeCallbackCode`.
- O servidor atual respondeu `/auth/v1/health` HTTP 200, GoTrue **v2.197.0**. `/auth/v1/settings` respondeu 200 com Google/email habilitados. Habilitado não comprova Client Secret correto ou callback válido.
- Na [implementação oficial GoTrue v2.197.0](https://raw.githubusercontent.com/supabase/auth/v2.197.0/internal/api/external_oauth.go), `oAuthCallback` gera essa mensagem depois que `oauthProvider.GetOAuthToken` falha. É a troca **Supabase ↔ provedor**, distinta do endpoint PKCE usado pelo app.
- O incidente Web histórico em `PROJECT_CONTEXT.md:939` registrou esse erro antes da sessão. É evidência anterior, não captura do aparelho atual.
- Callback usa `exchangedCode.current` (`callback:53`) para deduplicar dentro da instância. Isso não é proteção global contra remount/reabertura do mesmo deep link. Não foram observadas duas chamadas runtime.

### Causa encontrada

A mensagem específica tem **forte evidência de falha na troca do código Google pelo Supabase**. Não é evidência de que o app consumiu duas vezes o código PKCE ou perdeu seu verifier: o ramo dessa mensagem não faz a troca pelo app.

O motivo exato do erro externo permanece desconhecido sem log de `GetOAuthToken`: `invalid_client`, `invalid_grant`, redirect URI divergente, expiração/reuso no provedor ou outra falha não foram distinguidos. A mensagem amigável lista possibilidades; não é comprovação de credencial incorreta.

Para um retorno contendo `code` válido, há riscos independentes a verificar: outra tentativa pode sobrescrever o verifier, uma reinstalação/remove storage pode apagá-lo e um remount pode processar o mesmo code. O [contrato PKCE do Supabase](https://supabase.com/docs/guides/auth/sessions/pkce-flow) exige verifier correspondente e código de uso único. Nenhum desses riscos foi reproduzido aqui.

### Confiança

**FORTE EVIDÊNCIA**, para a etapa servidor/provedor indicada pela frase. Configuração ou erro concreto do Google ainda inconclusivo.

### Arquivos/funções envolvidos

`authService.ts:6`, `:46`, `:61`; `supabase.ts:14`; `app/auth/callback.tsx:33`; `AuthContext.tsx:31`, `:72`; `app.json` (scheme); Manifest Native (intent-filter); código oficial GoTrue `oAuthCallback`.

### Por que proteções existentes falharam

O app trata e exibe o erro, mas não consegue corrigir credencial ou troca externa. A tradução não preserva um diagnóstico específico do provedor. `useRef` protege só uma montagem. Leitura de hash é explícita apenas no Web; comportamento de fragmentos no deep link Android não foi capturado. Não existe evidência de troca automática duplicada pelo SDK, pois `detectSessionInUrl=false`.

### Configuração externa envolvida

- **Google Cloud — AÇÃO MANUAL posterior:** conferir Web Client usado pelo Supabase, secret correspondente e Authorized Redirect URI do servidor; verificar a resposta original do token endpoint. O retorno Google para Supabase é `https://<projeto>.supabase.co/auth/v1/callback`, não o deep link do app. Não assumir que adicionar SHA-1/Android Client resolve esse fluxo hospedado com Web Client.
- **Supabase — AÇÃO MANUAL posterior:** inspecionar Auth Logs e configuração do Google Provider/URL Configuration sem expor secrets. Google habilitado foi verificado; Client ID/secret/allowlist não foram lidos.
- **Código — CORREÇÃO DE CÓDIGO somente após revisão:** avaliar tratamento do callback, deduplicação por operação e observabilidade por etapa. Não introduzir WebBrowser como suposta correção antes de identificar a falha.

### Correção conceitual recomendada

Resolver primeiro a troca externa usando o erro original do servidor. Depois testar separadamente consentimento, callback externo, deep link, troca PKCE e perfil. Identificar operação por um correlator seguro; registrar presença/resultado de verifier e troca, **nunca os valores de code, verifier, senha ou tokens**.

### Risco da correção

Misturar os dois códigos OAuth pode levar a mudanças inúteis no app. Alterar callback/storage pode quebrar cadastro e recuperação. Rotacionar credencial requer atualização coordenada no provedor/servidor, fora desta tarefa.

### Requer nova build Android?

**DEPENDE**. Ajuste somente Google/Supabase: **NÃO**. Alteração de callback, storage, módulo browser ou intent-filter: **SIM** para o standalone. O scheme já existe.

## BUG 5 — Login email mostra erro, mas entra no app

### Sintoma observado

Erro de login aparece, porém o usuário consegue acessar a aplicação. O relato não distingue erro de credenciais, perfil, navegação ou erro atrasado de outra operação.

### Caminho de código

`Login.run` → `loginWithIdentifier` → `signInWithPassword` → SDK grava sessão/emite `SIGNED_IN` → `AuthProvider` resolve sessão e perfil → `AppShell.appReady`/`AuthGuard`. A Promise da UI e o listener Auth são caminhos independentes.

### Evidências

- `authService:18–20` checa `error` e lança; não chama navegação nesse ramo.
- `app/auth/login.tsx:19–21` navega somente após `await operation()`; o `catch` mostra erro. `router.replace` está no mesmo try: um erro depois de autenticar também pode ser exibido como falha da operação.
- `Login:16` redireciona quando `session && profile`, independentemente do erro local da tela.
- `AppShell:36` exige `!loading && session && profile.username && account_status=active`. `AuthGuard:11` também exige sessão/perfil ativo. Perfil sozinho não basta. Não foi encontrado mock/local auth que fabrique uma sessão para esses guards.
- `AuthContext:79` recupera sessão persistida; `resolve:33` publica sessão antes de completar perfil. Em falha de consulta, pode usar cache **por UUID da mesma sessão** (`:56–63`). Cache de perfil não cria identidade por si só, mas não tem TTL/validação remota de status nesse fallback.
- O SDK instalado (`@supabase/auth-js/src/GoTrueClient.ts:1270`) retorna erro para credenciais inválidas; esse ramo não remove sessão anterior. Sucesso grava sessão e notifica listeners antes de devolver o resultado (`:1277`). Essa semântica permite coexistência de erro de tentativa e sessão anterior, mas não demonstra a sequência do aparelho.
- A sonda sem sessão em `profiles?select=id,username,account_status&limit=0` retornou HTTP 401, `42501`, **permission denied for table profiles**. Isso não testa permissões de um usuário autenticado nem confirma disponibilidade de seu perfil.

### Causa encontrada

Não foi provada autenticação com credenciais rejeitadas. É necessário diferenciar:

| Alternativa pedida | Resultado da inspeção |
|---|---|
| A — sessão antiga persistida | Possível; armazenamento e recuperação existem. Sessão do aparelho não foi lida |
| B — erro visual com auth válido | Possível; listener e UI são independentes; falta timeline |
| C — navegação direta depois de `error != null` | Não encontrada no ramo email; há throw antes do retorno |
| D — perfil utilizado sozinho como auth | Não encontrado nos guards; perfil exige sessão |
| E — fallback/mock/local auth deixa entrar sem sessão | Não encontrado no caminho atual |
| F — corrida/erro após autenticação | Possível; SDK publica sessão antes do retorno e navegação está dentro do try |

O cache que aceita perfil indisponível e o `getSession` local merecem revisão do contrato de autorização/offline, mas não provam bypass de senha. Não se deve “corrigir” automaticamente apagando todas as sessões em qualquer falha de rede.

### Confiança

**INCONCLUSIVO.** Evidência insuficiente para confirmar causa. Gravidade CRÍTICA por potencial divergência entre decisão de acesso e erro mostrado.

### Arquivos/funções envolvidos

`authService.ts:13`; `app/auth/login.tsx:9`; `AuthContext.tsx:31`, `:55`, `:72`; `AuthGuard.tsx:7`; `app/_layout.tsx:30`; SDK `GoTrueClient.signInWithPassword`.

### Por que proteções existentes falharam

Não há registro correlacionado de tentativa, resultado de credenciais, evento Auth, perfil/cache e decisão do guard. O erro de login é local; sessão é global. A existência dos guards não valida seu comportamento runtime nem o estado anterior do dispositivo.

### Configuração externa envolvida

- **Google Cloud:** não participa do login email.
- **Supabase — AÇÃO MANUAL posterior:** consultar logs da tentativa email e de refresh/perfil com o UUID já autorizado; verificar condição do usuário e RLS de perfil. Nenhuma senha/conta foi testada nesta auditoria.
- **Código — CORREÇÃO DE CÓDIGO posterior:** definir quais erros são de credencial, perfil ou navegação, e quando a sessão atual pode manter acesso. Rever cache/status conforme política offline, sem tratar cache como autoridade remota.

### Correção conceitual recomendada

Primeiro reconstruir timeline: sessão presente antes da tentativa, UUID de cada evento, resultado de `signInWithPassword`, origem/idade do perfil, `loading/appReady` e decisão de rota. Comparar sessão limpa e sessão preexistente, sem apagar dados do usuário. Somente então mudar a decisão/UX causalmente responsável.

### Risco da correção

Logout indevido em falha temporária, perda de leitura offline, corrida entre refresh e signOut, ou guard aberto por cache desatualizado. A correção precisa cobrir contas desativadas e troca de usuário, não somente ocultar a mensagem.

### Requer nova build Android?

**DEPENDE**. Código/session/guard: **SIM** no standalone. Ajustes remotos de perfil/policy, se forem a causa: **NÃO** por si só.

## BUG 6 — Criação de conta não aceita senha

### Sintoma observado

Usuário relata rejeição de todas as senhas. Não há exemplos de entradas, mensagem específica nem resposta HTTP de signup no anexo.

### Caminho de código

`Signup.submit` → valida nome/confirmação → `registerAccount` valida username/email/tamanho → `supabase.auth.signUp` → retorno de sessão ou confirmação de email.

### Evidências

- `Signup:17`: nome vazio rejeita antes da senha; `:18`: igualdade exata `password !== confirmation`, inclusive espaços, rejeita.
- `authService:35`: username normalizado deve seguir `^[a-z][a-z0-9_]{2,23}$`; `:36`: email deve satisfazer `^\S+@\S+\.\S+$`; **só em `:37`** a senha é validada: `password.length < 8`.
- Não existe regex de força, requisito de maiúscula, número ou símbolo no cliente. `length` é comprimento da string JavaScript; não se faz trim da senha.
- `AuthForm.tsx:20` usa `TextInput` controlado e secureTextEntry. Não há regra extra escondida no input nem maxLength/minLength ali.
- Qualquer erro de `signUp` é convertido em **“Não foi possível criar a conta. Verifique os dados ou tente outro usuário.”** (`authService:42`). Essa mensagem pode esconder password policy, username duplicado/trigger, email, rate limit, captcha ou erro do servidor.
- Consulta atual `/auth/v1/settings`: `disable_signup=false`, email habilitado, `mailer_autoconfirm=false`. Campos de comprimento/complexidade de senha **não foram expostos nessa resposta**. Esses resultados não confirmam a policy remota.
- Migration local `auth_create_profile` e índice único de username poderiam rejeitar criação por conflito de username se estiverem ativos. Sua aplicação/resultado no servidor não foram comprovados. Não é correto classificar esse cenário como senha inválida sem o erro original.

### Causa encontrada

A regra atual do cliente é conhecida, mas nenhuma condição comprovadamente rejeita **toda** senha de oito ou mais caracteres com confirmação igual e dados restantes válidos. A condição exata da tentativa real não pode ser determinada sem entradas sanitizadas e resposta do Supabase. A ocultação do erro backend é um defeito de diagnóstico confirmado, não a causa comprovada de todas as rejeições.

### Confiança

**INCONCLUSIVO.** Evidência insuficiente para confirmar causa.

### Arquivos/funções envolvidos

`app/auth/signup.tsx:16`; `authService.ts:33`; `AuthForm.tsx:20`; `authRules.ts:20`; migration de profiles/`auth_create_profile`, sem aplicação nesta auditoria.

### Por que proteções existentes falharam

Frontend aplica poucas regras e não informa política remota. A conversão genérica perde `error.code/status/message`, impedindo separar senha de username/infraestrutura. O usuário pode estar vendo uma rejeição de conta e atribuindo-a à senha.

### Configuração externa envolvida

- **Google Cloud:** não participa do cadastro email.
- **Supabase — AÇÃO MANUAL posterior:** ler, sem modificar, mínimo/complexidade/leaked-password protection, confirmação/captcha/rate limits e Auth Logs. A [documentação oficial de password security](https://supabase.com/docs/guides/auth/password-security) permite diferentes regras de comprimento, caracteres e senhas vazadas; a configuração real deste projeto não foi obtida.
- **Código — CORREÇÃO DE CÓDIGO posterior:** distinguir erros de campos e backend de forma segura; alinhar informação de policy com a configuração efetiva. Não reduzir exigências sem diagnóstico.

### Correção conceitual recomendada

Obter comprimento da senha, igualdade da confirmação e etapa que retornou erro, **sem registrar a senha**. Preservar código/status técnico do signup para diagnóstico, com mensagem de usuário que não exponha contas. Verificar conflitos de username/trigger antes de alterar regra de senha.

### Risco da correção

Enfraquecer policy ao tentar contornar falha não relacionada; expor existência de contas; alterar indevidamente trigger/constraints.

### Requer nova build Android?

**DEPENDE**. Mensagens/validação cliente: **SIM** no standalone. Policy/configuração remota: **NÃO**, se for o único ajuste necessário.

## BUG 7 — Recuperação de senha retorna para localhost

### Sintoma observado

Email chega, link abre `http://localhost:8081` no celular e não permite redefinição.

### Caminho de código

`ForgotPassword.submit` → `sendRecoveryEmail` → `resetPasswordForEmail(email, {redirectTo})` → verificação do link no Supabase/template → redirect → `auth/callback` → troca PKCE → `next=reset-password` → `auth/reset-password`.

### Evidências

- **Valor que o código Native passa ao SDK:** `kindlereader://auth/callback?next=reset-password` (`authService:6–10`, `:58`). Ele não escolhe localhost no ramo Native.
- Web usa `${window.location.origin}/auth/callback?next=reset-password`; na ausência de window usa `http://localhost:8081`. O sourcemap Android confirma esse serviço no build local.
- O SDK instalado (`GoTrueClient.resetPasswordForEmail:4468`) envia a opção de redirect na requisição de recuperação. Não foi capturada a requisição real do aparelho; valor de código não equivale a sniffing runtime.
- `app.json` e o Manifest já registram scheme `kindlereader`; callback reconhece `next` e navega para reset. A tela reset exige sessão e chama `updateUser({password})`.
- A documentação de implantação existente recomenda `kindlereader://auth/callback` na allowlist, mas não explicita a variante **com query `?next=reset-password`**. Isso é uma lacuna das instruções, não prova da allowlist efetivamente configurada.
- No [GoTrue v2.197.0, utilities/request.go](https://raw.githubusercontent.com/supabase/auth/v2.197.0/internal/utilities/request.go), `GetReferrer` prefere `redirect_to` válido; depois Referer válido; depois `config.SiteURL`. A allowlist remove fragmento, mas mantém a query no texto comparado. Assim, somente autorizar o callback literal sem query não garante que a variante de recovery seja aceita.
- Segundo a [documentação oficial de Redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls), destino deve ser permitido; templates que usam SiteURL em vez do destino solicitado também precisam ser conferidos. Site URL/allowlist/template deste servidor não são acessíveis com a chave pública disponível.
- `sendRecoveryEmail` ignora o `error` retornado pelo SDK; a UI também mostra resposta genérica em vários erros. Isso não explica o localhost, mas impede usar “email solicitado” como confirmação de redirect aceito.

### Causa encontrada

O endereço localhost **não é selecionado pelo código Native atual**. Há um mecanismo externo concreto para o resultado: redirect não aceito → Site URL, ou template apontando diretamente para SiteURL. A query do recovery é um candidato verificável. Também falta confirmar se o email foi solicitado no Web de desenvolvimento ou no APK examinado. Não se escolheu uma dessas possibilidades como causa raiz sem URL do email/configuração real.

### Confiança

**INCONCLUSIVO.** Evidência insuficiente para confirmar causa do redirecionamento efetivo.

### Arquivos/funções envolvidos

`authService.ts:6`, `:56`; `app/auth/forgot-password.tsx:8`; `app/auth/callback.tsx:57`; `app/auth/reset-password.tsx:11`; Manifest/app.json; SDK `resetPasswordForEmail`; GoTrue `GetReferrer/IsRedirectURLValid`.

### Por que proteções existentes falharam

Scheme registrado não configura Supabase nem o email. A verificação da URL solicitada e do template é externa. Se a URL retorna ao browser em vez do app, o verifier persistido no AsyncStorage Native não está automaticamente disponível no armazenamento Web daquele browser.

### Configuração externa envolvida

- **Google Cloud:** não participa da recuperação email.
- **Supabase — AÇÃO MANUAL posterior:** conferir Site URL, allowlist com o callback de recovery efetivamente usado e template; obter a cadeia de redirects do email, removendo token/code antes de compartilhar.
- **Código — CORREÇÃO DE CÓDIGO posterior:** manter rotas Web/Native e contexto recovery coerentes; observar resultado SDK sem alterar a política anti-enumeração. Não adicionar fallback local para localhost.

### Correção conceitual recomendada

Autorizar conceitualmente os destinos exatos necessários, inclusive query de recovery, e usar destino publicado/deep link no contexto adequado. Verificar que o template respeita o destino e que o callback troca a sessão no mesmo contexto de storage que iniciou PKCE. Não abrir wildcard amplo sem necessidade.

### Risco da correção

Open redirect por allowlist ampla, perda de contexto PKCE, redefinição fora da sessão correta ou regressão de confirmação/Google.

### Requer nova build Android?

**DEPENDE**. URL configuration/template: **NÃO**. Alteração do código, route/scheme ou processamento de recovery no APK: **SIM**.

## BUG 8 — Reflow trava em 98–100%

### Sintoma observado

“Analisando página 968 de 969 (100%)” permanece; Cancelar e Android Back não encerram o Reader. O usuário relata também `Uncaught ReferenceError: bytecode is not defined`.

### Caminho de código

`reflowPreparing=true` → WebView invisível carregando PDF.js/worker remotos → loop sequencial `getPage/getTextContent/getOperatorList/extractImages` → mensagens page/progress → mensagem complete → Builder síncrono no thread JS React Native → callback do Reader → preparação finalizada/cache/documento.

### Evidências

1. O progresso é `Math.round(currentPage/totalPages*100)` (`Native:79`). **968/969 = 99,8968%, arredondado para 100%**. A etiqueta não prova que a última página terminou. O indicador mede páginas extraídas, não conclusão do Builder/cache/renderização.
2. Inventário somente leitura encontrou `Livros/odisseia.pdf` com **969 páginas**; é um candidato ao exemplo. `o-capital-livro-1.pdf` tem 1.493 e “Os Demonios” 942. O livro real do travamento não foi informado.
3. `odisseia.pdf` também está no APK local (`res/nx.pdf`, 3.496.152 bytes, SHA-256 `1df7a421811a50d74977eeee778b953e129b8b9e7e31ca805d6f81798b0672e6`). Com PDF.js 3.11.174 em Node, páginas 965–969 concluíram `getTextContent` e `getOperatorList`:

| Página | Itens de texto | Operadores |
|---|---:|---:|
| 965 | 128 | 273 |
| 966 | 132 | 219 |
| 967 | 24 | 89 |
| 968 | 23 | 494 |
| 969 | 0 | 238 |

Esse ensaio não executou imagens/canvas/bridge/WebView Android nem acumulou todas as páginas como o app. Não refuta uma falha física de memória/processamento. A última página sem texto ainda requer operadores/imagens; não é automaticamente falha.
4. O Native publica `complete` somente depois do loop (`:202`). `reflowPreparing` só termina por complete/error/cancel no Reader; não há tratamento de morte do renderer para encerrar o estado.
5. `getDocument(...).promise.then(async ...).catch(...)` (`Native:195–204`) trata rejeições que passam pela cadeia. Não conecta `window.onerror`, `unhandledrejection`, erro de carregamento HTTP da WebView ou `onRenderProcessGone` ao Reader. **Se a Promise rejeitasse normalmente, o error recebido acionaria `handleReflowError` e liberaria preparação.** Logo, uma exception comum capturada não explica sozinha o estado permanentemente preso.
6. Native não chama `page.cleanup()` no loop nem `pdf/loadingTask.destroy()` explicitamente; conserva páginas extraídas, imagens Base64, JSON de bridge e dados da engine durante todo o processamento. Canvas cria buffers em resolução de origem antes de reduzir a imagem. São pressões reais de memória/CPU; não foram medidos OOM ou bloqueio do aparelho.
7. Ao receber complete, `buildPdfReflowDocument` é síncrono em `handleMessage:69`. Em livro grande, pode bloquear o thread JS onde Cancelar e navegação também são processados. Não foi medida sua duração no Android.

### Causa encontrada

O percentual 100% prematuro é comprovado. Há lacunas comprovadas de terminação e cancelamento, porém **a primeira operação que deixa a instância real pendente não foi localizada**. Não se pode escolher, sem log, entre Promise de worker pendente, renderer morto, trabalho síncrono, memória, image extraction ou falha externa à cadeia tratada.

### Confiança

**INCONCLUSIVO.** Evidência insuficiente para confirmar a causa do travamento conjunto e da falta de resposta de Cancelar/Back.

### Arquivos/funções envolvidos

`PdfReflowProcessor.native.tsx:16`, `:48`, `:79`, `:125`, `:149`, `:158`, `:191`; `PdfReflowProcessor.web.tsx:21`; `PdfReflowDocumentBuilder.ts:32`; `ReaderScreen.tsx:444–488`, `:994`; `android/.../MainActivity.kt` (Back padrão); router/rota Reader.

### Por que proteções existentes falharam

O contrato de conclusão depende de mensagem atravessar a WebView. Erros externos à Promise e morte do renderer não têm transição de estado conectada. Não existe operação identificada/ACK de cancelamento. O onError do Reader funciona quando chamado; não se demonstrou que ele tenha recebido o erro relatado.

### Web x Native

Web associa cleanup a `active=false` e `task.destroy()`, além de limpeza de cada página. Native limita `active` ao carregamento Base64: o cleanup só marca esse boolean, sem enviar cancelamento para `window.processPdf`. A Promise PDF e o loop ficam no contexto da WebView, diferente do thread React Native que recebe page/complete e executa Builder.

### Cache

Salvar cache acontece depois de `handleReflowComplete` desligar preparação. Portanto uma gravação de cache que travasse **nesse caminho** não explica a permanência do overlay “Preparando”. Cache válido evita extração, mas não foi inspecionado no aparelho. Reler o mesmo arquivo sem cache pode reexpor o problema; não foi apagado cache.

### Fallback

`handleReflowError` retorna ao Original. Precisa que error chegue; engine pendente/renderer morto sem mensagem não ativa fallback. Não existe prova de que o fallback falhou depois de receber um error: falta esse evento.

### Cancelamento

O botão chama `handleCancelReflow` (`ReaderScreen:482`), que desliga `reflowPreparing` e seleciona Original. **Se o onPress for executado, o overlay deve desmontar no próximo render.** Não há código nessa função esperando terminar 969 páginas.

Entretanto, não há AbortController no fetch Native, token de cancelamento na extração, `loadingTask.destroy`, verificação no loop ou ACK. Desmontar WebView e abortar uma tarefa são contratos distintos. Se JS/UI estiver bloqueado, o onPress nem chega; se chegou e overlay persiste, precisa capturar transição de estado/remontagem. Sem isso não se atribui o sintoma exclusivamente à ausência de abort.

Android Back: o processador é uma **View**, não Modal; não instala BackHandler nem consome Back explicitamente. `PdfModeChooser` e `ReaderSettingsPanel` são Modals com `onRequestClose`, mas visibilidade real no incidente não foi capturada. `MainActivity.invokeDefaultOnBackPressed` segue o comportamento padrão/background nas versões correspondentes. Não se encontrou um handler Reader que intencionalmente impeça saída. JS bloqueado, Modal ativo ou estado de navegação são possibilidades, não fatos comprovados.

### Erro observado

`bytecode is not defined` foi relatado, mas **origem não determinada**:

- Busca em `src`, `app` e scripts não encontrou identificador `bytecode` relacionado ao processo.
- Os arquivos `pdf.min.js` e `pdf.worker.min.js` 3.11.174 carregados em memória do CDN, 319.989 e 1.087.181 caracteres, não contêm a palavra `bytecode`.
- O sourcemap Android examinado tem 2.871 fontes e três ocorrências de `bytecode`, **todas em comentários** de `parseHermesStack.js` e utilitário de URL do Expo Router, não referências executáveis a variável.
- Ferramentas Metro usam a palavra para opções de compilação Hermes; isso não prova que o compilador emita uma variável indefinida no app.
- O APK usa Hermes, mas uma exceção em WebView é executada pela engine de WebView, não necessariamente Hermes. É indispensável obter stack/URL/processo/origem. Não atribuir a PDF.js, Hermes ou Reanimated por associação de nome.

### Correção conceitual recomendada

Após localizar o erro, definir lifecycle de operação com terminação explícita em sucesso/erro/cancelamento/morte do renderer e resultados antigos rejeitados. Separar extração, montagem e cache no progresso; limitar retenção e liberar recursos de forma determinística; manter cancelamento/navegação responsivos. **Não usar timeout/retry como substituto de causa raiz.**

### Risco da correção

Cancelar pode competir com mensagens tardias e gravar documento parcial; liberar recursos cedo pode quebrar imagens; mudar worker/engine envolve compatibilidade Native. Não publicar cache incompleto nem reaplicar modo após cancelamento.

### Requer nova build Android?

**SIM**, para mudanças no processador/bridge/lifecycle/worker embutidos. Adicionar ou atualizar módulos nativos exige rebuild nativo; esse requisito não foi imposto para a coleta ausente.

## BUG 9 — Busca/indexação de fontes

### Sintoma observado

“Descobrir livros” permanece em “Consultando fontes…” sem resultados. A seleção visual Gutendex não comprova execução exclusiva dessa fonte.

### Caminho de código

`app/(tabs)/search.submitSearch` → `useSearchStore.search` → AsyncStorage/UserSourceRepository → Gutendex + fontes enabled/active → `SearchBooksUseCase.executeDetailed` → robots quando aplicável → throttle → NetworkFetcher/body → adapter/filter → agregação → salvar histórico SQLite → status/resultados.

`SearchCatalogsUseCase` existe, mas não é o caminho consumido pela UI. Seu factory não é executado no método presente; não foi atribuído a ele o travamento da tela ativa.

### Evidências

- `searchStore:53` liga loading antes de `sourceRepository.list`. `:55–59` sempre cria Gutendex mais todas as fontes pessoais enabled/active. Não recebe o filtro selecionado da tela.
- `app/(tabs)/search.tsx:46–48` aplica `sourceFilter` **depois**, sobre resultados. Portanto clicar “Gutendex” muda apresentação, não isola requisições. Esse comportamento é comprovado no código.
- Gutenberg/BNDigital são labels “Em breve” (`search.tsx:12`, `:140`) e não são adicionados aos plugins desse caminho. Não há placeholder “Em breve” aguardado por `Promise.all`.
- `SearchBooksUseCase:24` usa `Promise.all`, com catch **dentro de cada fonte**. Rejeição tratada de uma fonte retorna status error e não rejeita as outras; uma fonte **pendente** retarda a publicação agregada.
- Gutendex não passa por robots nem HEAD validation: `requiresRobotsPolicy` ausente e `skipLinkValidation=true`. JSON/OPDS também não exigem robots; HTML pode acrescentar a consulta de robots.
- `NetworkFetcher:16` tem timer de abort; `:27` mantém o timer durante `response.text()`, com finally para limpeza. Busca define 12.000 ms/retries zero. O timeout não cobre leitura inicial AsyncStorage, espera do throttle, parse síncrono ou gravação do histórico.
- `SearchBooksUseCase:65` aguarda `history.save(...).catch(...)` **antes de devolver resultados**. Catch trata rejeição, não Promise que nunca settle. No Android, esse histórico é SQLite; no Web, IndexedDB.
- `node scripts/test-catalogs.cjs --live`: testes sintéticos existentes de catálogo/schema/CRUD/cancelamento/timeout/body/stale/status passaram. A etapa live **falhou**: Gutendex retornou status interno error e o teste exigia resultados. Não houve PASS da rede atual.
- Sondas reais de `https://gutendex.com/books/?search=dickens` e `...?search=machado` neste computador expiraram em **15.044 ms e 15.007 ms**, sem resposta HTTP. Foi enviada tentativa real no host; requisição do aparelho não foi capturada.

### Causa encontrada

Há falha de acesso real ao Gutendex no ambiente de auditoria e há dependências capazes de manter a execução pendente. Não foi identificado qual await fica preso no APK. O teste live demonstrou **erro finalizado**, não loading permanente; por isso não se declara que o timeout de rede explica integralmente o incidente.

O filtro visual não isola fonte e a publicação só ocorre depois da agregação/histórico. Esses achados explicam por que “Gutendex sozinho também trava” não pode ser inferido selecionando o chip. Não foi comprovada falha global do contrato/indexação de todas as fontes.

### Confiança

**INCONCLUSIVO**, para o loading permanente Android. Timeout atual no host e ausência de isolamento do filtro são subachados confirmados.

### Arquivos/funções envolvidos

`app/(tabs)/search.tsx:38`, `:46`, `:55`, `:148`; `searchStore.ts:44`, `:76`; `UserSourceRepository.ts:5`; `SearchBooksUseCase.ts:15`; `GutendexSearchPlugin.ts:21`; `UserSourceSearchPlugin.ts:25`; `NetworkFetcherService.ts:10`; `ThrottleQueue.ts:5`; `RobotsCacheService.ts:5`; `SqliteSearchHistoryRepository.save`; `dependencies.ts:33`.

### Por que proteções existentes falharam

Loading encerra quando a cadeia resolve/rejeita; a proteção de requestVersion só evita respostas obsoletas. Abort de fetch não cancela awaits anteriores/posteriores nem parse bloqueante. `setQuery` invalida versão, aborta e põe idle; ausência de finally universal não significa bug por si só, pois sucesso/catch já setam estado. É preciso localizar a Promise ou bloqueio que impede esses ramos.

### Request

Endpoint Gutendex: `GET https://gutendex.com/books/?search=<consulta codificada>`, Accept incluindo JSON. O store envia query normalizada e AbortSignal. Fontes pessoais são consultadas mesmo com chip Gutendex selecionado. Somente fontes enabled **e** status active participam; registros antigos sem status são desativados pelo repositório.

### Response

Não houve HTTP/body disponível nas duas sondas atuais; logo não há status HTTP, ACAO ou JSON atual para validar. A documentação histórica registra HTTP 200 e resultados em outra data; esse resultado não foi repetido agora. No teste live atual o fetcher converteu falha em mensagem genérica.

### Adapter

Gutendex parseia `results`, escolhe formatos EPUB, mapeia metadados e `next`; rejeita JSON/resposta inválidos. Fontes JSON usam validação e filtro local; OPDS pode retornar vazio em catch em vez de erro explícito, o que é lacuna de diagnóstico, mas não prova Promise pendente. Não há adapter de placeholder nesse pipeline.

### Loading lifecycle

`loading` → leitura sources → fan-out → settle de todas → deduplicação → await histórico → `success/partial/empty/error`. Por fonte, timeout de rede é 12 s; throttle serializa domínio com intervalo 2 s e não recebe AbortSignal. Uma fila longa pode postergar requisição, não comprova espera infinita. Histórico/AsyncStorage pendente e parse que monopoliza JS precisam ser separados de fetch.

Para responder às perguntas do pedido: request do host enviada **SIM**; do Android **NÃO VERIFICADO**; resposta atual **NÃO OBTIDA**; erro capturado no teste live **SIM**; loading físico finalizado **NÃO VERIFICADO**; adapter que nunca resolve **NÃO IDENTIFICADO**; “Todos” aguarda placeholder **NÃO**; Gutendex isolado trava **NÃO TESTADO NO APARELHO**; rejeição de fonte bloqueia demais **NÃO**, mas pendência adia agregação; diferenças de plataforma **SIM**, em storage/fetch/CORS.

### Android x Web

React Native fetch não tem o bloqueio CORS do navegador. Native precisa avaliar conectividade/TLS/abort e SQLite; Web, CORS/IndexedDB. A mensagem genérica menciona CORS só para Web, mas sua presença não identifica causa. Download de EPUB Gutenberg é outra requisição e não explica ausência inicial de resultados da API Gutendex.

### Correção conceitual recomendada

Antes de mudar, capturar entrada/saída de sources, throttle, fetch/headers/body, parse, agregado, histórico e setStatus com ID de operação. Testar Gutendex realmente isolado e conjunto de fontes ativas; preservar estados parciais/erros por fonte. Depois avaliar separar histórico da publicação, isolamento real de fonte e progresso por fonte, se confirmados como causas. Não adicionar proxy/no-cors ou declarar fontes “Em breve” funcionais.

### Risco da correção

Duplicação/stale de resultados, perda de cancelamento, fila por domínio excessiva, dependência oculta do storage e mudança indevida no contrato de aquisição. Rede do host não é prova de comportamento da rede móvel.

### Requer nova build Android?

**DEPENDE**. Mudança no store/caso de uso/adapter/storage embutido: **SIM**. Disponibilidade do endpoint/conectividade/configuração de fontes existente: **NÃO** necessariamente.

## Relações entre bugs

| Conjunto | Relação sustentada | Limite |
|---|---|---|
| 2 + 3 — Reader UI | Mesma árvore de documento/controles/feedback; Header e documento têm caixas e insets diferentes | Falta de inset não demonstra receiver do toque. Banner/wrappers são candidatos próprios |
| 1 + 8 — Reflow | Mesmo processador Native com bridge/WebView e divergência do Web; qualidade ausente e lifecycle incompleto coexistem | Corrupção textual não prova origem de ReferenceError nem bloqueio de Back |
| 4 + 5 + 6 + 7 — Auth | Mesmo client PKCE, AsyncStorage, callback e provider; mensagens genéricas reduzem diagnóstico | Erro de troca externa Google, password policy, estado de sessão e redirect são etapas distintas |
| 8 + 9 — Responsividade | JS bloqueado poderia atrasar timers, toque e publicação de estado | Não há timeline que demonstre bloqueio compartilhado; não se unifica causa |

Não há causa única comprovada para todos os sintomas. O reset/restauração EPUB documentado anteriormente é contexto de regressão, não um décimo bug investigado nesta entrega.

# ORDEM RECOMENDADA DE CORREÇÃO

1. **BUG 5 — estabelecer primeiro o contrato de autenticação e evidência de acesso.** Prioridade de segurança; separar sessão válida preexistente de ingresso indevido. Rever BUG 6 junto somente quando seus erros backend forem conhecidos.
2. **BUG 8 — localizar a falha de terminação/erro e desbloquear cancelamento/navegação.** É o incidente que exige encerrar o app; requer stack real de `bytecode` e identificação da etapa.
3. **BUG 1 — aplicar o contrato de qualidade ao Native/cache após revisão.** Causa comprovada, fallback Original existente; coordenar com lifecycle do BUG 8 sem esperar uma reescrita geral de PDF.
4. **BUGS 4 e 7 — conferir manualmente provedor e redirects.** Essas verificações podem ocorrer em paralelo ao trabalho de código; separar troca externa de PKCE. Depois endereçar código somente conforme resultado.
5. **BUG 6 — mensagem/validação alinhadas ao erro real.** Não reduzir policy para contornar erro de cadastro/trigger.
6. **BUG 3 — localizar o alvo de toque, depois ajustar camadas/caixas.** Coletar no APK atual antes de mudar árvore; controles de saída têm alto impacto.
7. **BUG 2 — definir geometria documental com insets e validar repaginação.** Causa conhecida; coordenar com BUG 3, preservando identidade do viewer.
8. **BUG 9 — localizar await/fonte/rede/storage e corrigir a etapa responsável.** Rede atual falhou; chip de fonte não é ensaio isolado.

Esta ordem recomenda investigação restante antes de implementar causas inconclusivas. Nenhuma correção foi aplicada.

# AGRUPAMENTO RECOMENDADO

- **GRUPO A — Auth:** BUGS 4, 5, 6 e 7. Separar plano externo Google/Supabase de mudanças de client/callback/guard.
- **GRUPO B — Reader UI:** BUGS 2 e 3. Insets, retângulos, hit testing e sobreposição, sem remount documental.
- **GRUPO C — Reflow:** BUGS 1 e 8. Qualidade compartilhada/cache e lifecycle/bridge; preservar Original e progresso.
- **GRUPO D — Sources:** BUG 9. Fonte efetiva, rede/body, agregação, storage e estado.

FLASHCARDS: FORA DO ESCOPO DESTA AUDITORIA.

# ALTERAÇÕES QUE EXIGIRIAM REBUILD ANDROID

O artefato é standalone release com bundle embutido; Manifest define Expo Updates desabilitado. **Alterações só TypeScript/JavaScript também exigem gerar e instalar um novo APK para chegar a este usuário**, na ausência de OTA. Não confundir Fast Refresh em development build com atualização deste APK.

| Alteração eventual, não realizada | Rebuild para este APK |
|---|---|
| Validação/Builder/bridge/cache Reflow; cancelamento/erro/processamento | SIM |
| Insets do documento, caixas/ordem de controles, interação do feedback | SIM |
| AuthProvider/guard/callback/validação e mensagens do cliente | SIM |
| Search store/caso de uso/adapters/integração de histórico | SIM |
| Novo módulo Native, mudança Hermes/RN/WebView, intent-filter ou scheme | SIM, incluindo compilação Native |
| Apenas Google Client/secret/redirect URI no servidor | NÃO |
| Apenas Supabase Site URL/allowlist/template/password policy/permissões | NÃO, salvo se exigir mudança correspondente no cliente |
| Apenas coletar logs já existentes, conferir rede ou ler configurações | NÃO |

Nenhuma nova biblioteca nativa foi determinada como necessária pela auditoria. Não se recomenda upgrade de engine como correção sem localizar o erro.

# PONTOS INCONCLUSIVOS

**Evidência insuficiente para confirmar causa**, nos pontos abaixo. As localizações indicam onde uma instrumentação futura poderia ser discutida; ela **não foi criada** nesta tarefa.

| Ponto | Evidência necessária | Onde observar, se autorizado posteriormente | Valores seguros necessários |
|---|---|---|---|
| Identidade da instalação física | Version/package/hash do APK instalado e URI do livro aberto | ADB/package info; abertura Reader | Versão, hash, bookId, URI sem credenciais, modo |
| BUG 1 — cache do aparelho | Registro SQLite existente e proveniência | `SqlitePdfReflowCacheRepository.findByBookId`; leitura autorizada de DB | Signature, versão, updatedAt, classificação e métricas; sem apagar dados |
| BUG 1 — fonte interna/espaçamento | Fonte/ToUnicode e comparação geométrica de itens/linhas | PDF e resultado de `getTextContent`, Builder existente | FontName, posições/gaps, contagens, amostra mínima |
| BUG 3 — receiver do toque | Hierarquia/layout/hit target no momento do toque | wrappers controls/Header/banner/adapter; native touch dispatch | Bounds/overflowInset, pointerEvents, zIndex/elevation, modo, visibility e onPress |
| BUG 4 — erro externo original | Auth Log do callback e resposta da troca Google | GoTrue `GetOAuthToken`; Dashboard em leitura | Request ID, etapa, código/status de erro; nunca auth code/secret/token |
| BUG 4 — PKCE duplicado/perdido | Timeline de callbacks e verifier presente | callback/client/storage | ID seguro da operação, número de trocas, presença do verifier, resultado, remount |
| BUG 5 — erro versus ingresso | Timeline antes/depois de tentativa e decisão do guard | Login.run, SDK, AuthProvider.resolve, guard | Tipo do erro, UUID correlacionado, sessão presente, cache/idade/status, loading/appReady |
| BUG 6 — regra rejeitadora | Mensagem e código originales do signup e policy efetiva | submit/registerAccount/Auth Logs/configuração em leitura | Comprimento, confirmação igual/não, campo/etapa, error.code/status; nunca senha |
| BUG 7 — redirect efetivo | Requisição recovery, URL de email e cadeia de redirects sanitizada, template/allowlist | SDK recovery e configuração Supabase em leitura | redirect_to sem token, destino, padrão permitido, origem Web/Native |
| BUG 8 — bytecode | Stack/URL/processo/engine real e logcat | console WebView/Hermes/renderer | Stack completa sanitizada, arquivo/linha, estágio/página, renderer alive |
| BUG 8 — cancel/back | Eventos físicos e transições de estado | onPress Cancelar, native Back/router, reflowPreparing | onPress ocorreu?, operação atual, fase, mount/unmount, Modal ativo |
| BUG 8 — processamento/memória | Livro exato e duração/recurso por etapa | getPage/text/operators/images/bridge/Builder | Página/total, tempo, bytes de imagens, memória, último evento terminal |
| BUG 9 — await preso | Sequência completa e fonte efetivamente consultada no Android | listSources/throttle/fetch/body/parse/history/setStatus | Request ID, fonte, URL pública, status, durações, abort, antes/depois de storage |
| Configuração externa Auth | Acesso de leitura ao Dashboard/logs | Supabase/Google Cloud | Valores de configuração não secretos e códigos de erro |

## Preservação da entrega

O código funcional, `PROJECT_CONTEXT.md` e `ROADMAP_FUNCIONALIDADES.md` não foram alterados. Hashes de referência dos documentos protegidos:

- `PROJECT_CONTEXT.md`: `ed520d0fe5fb38227d72f77dd76fe7344f97c9939779ec63abb58a5db5e3d794`.
- `ROADMAP_FUNCIONALIDADES.md`: `6e79e455d5198875a322e2d734c02209cc9aa0bcc671de024ad07c064fe80afc`.

Próximo passo: enviar este diagnóstico para revisão antes de qualquer correção.
