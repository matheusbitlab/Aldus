# Handoff ChatGPT — histórico consolidado do projeto

> REFERÊNCIA HISTÓRICA (origem: ChatGPT, consolidada em 06/11/2026). Pode estar desatualizada: foi escrita a partir de snapshots de 02/10 a 20/10/2026, anteriores ao PROJECT_CONTEXT.md recente do Codex. Em conflito, vale código > PROJECT_CONTEXT.md > BUGS_ATUAIS.md > este arquivo. Conteúdo original abaixo, sem alterações.

# Aldus Reader — Consolidação do histórico do projeto

> Documento de handoff consolidado a partir do contexto recuperado de conversas, memórias e arquivos da Biblioteca do ChatGPT.  
> **Data da consolidação:** 06/11/2026.  
> **Regra de confiabilidade:** este documento separa fatos documentados, requisitos, propostas e pontos ainda não confirmados. Ele não substitui a leitura do repositório e dos documentos originais.

## 1. Identidade e objetivo

- Nome atual: **Aldus Reader**.
- Nome anterior: **Kindle Reader**.
- Objetivo: aplicativo de leitura EPUB/PDF, com biblioteca, progresso, configurações e recursos complementares de estudo.
- O projeto passou por evolução de identidade visual/nome e expansão de funcionalidades. A existência de uma especificação ou prompt não prova que a funcionalidade correspondente esteja implementada.
- Repositório/local de desenvolvimento mencionado: `C:\KIndle`.
- Identificador Android mencionado: `com.kindle.reader`.

## 2. Linha do tempo resumida

| Período | Registro recuperado |
|---|---|
| 01/10/2026 | Discussões sobre arquitetura de PDF Original e PDF Reflow. O Reflow foi tratado como documento derivado, sob demanda e com cache; o PDF Original deveria permanecer preservado. |
| 02/10/2026 | Criado `BUG_CONTEXT_EPUB_CENTER_RESET.md`. Investigação do reset de página do EPUB, com instrumentação e tentativa de reprodução. |
| 05–06/10/2026 | Documentação de flashcards, integração do módulo de estudo e prompts técnicos. |
| 10/10/2026 | Contexto recuperado identifica a primeira solicitação de uma Skill para outra IA conhecer o projeto durante a etapa de transição Kindle Reader → Aldus Reader. |
| 15/10/2026 | Auditoria integrada somente leitura envolvendo GitHub, Supabase e Vercel. Foram registrados recursos de batalhas e sincronização no backend; testes ponta a ponta ainda pendentes naquele registro. |
| 19/10/2026 | Nome Aldus Reader já renomeado/commitado. Stack mencionada: React Native/Expo, Web, PDF.js/WebView, EPUB, Supabase/Auth, Google Drive e Vercel. App físico usado em Redmi. |
| 20/10/2026 em diante | Investigações de Reflow, cache, autenticação, integração e validação em aparelho físico. Os resultados precisam ser confrontados com o estado atual do código. |
| 06/11/2026 | Consolidação deste documento e do prompt mestre para leitura do projeto por outra IA. |

## 3. Stack e ambiente de desenvolvimento

### Tecnologias mencionadas

- React Native e Expo.
- Expo Router para navegação.
- Caminhos Web e Native.
- EPUB com visualizador Web e `iframe` no caminho Web.
- PDF.js / WebView, com caminhos Original e Reflow separados.
- Persistência local com SQLite e IndexedDB em implementações específicas por plataforma.
- Supabase, incluindo PostgreSQL e Auth.
- Google Drive em contexto de integração/armazenamento.
- Vercel para serviços e infraestrutura Web.
- GitHub para versionamento.
- VS Code com Codex e Copilot como agentes de desenvolvimento.

### Ambiente local mencionado

- Diretório: `C:\KIndle`.
- Android package: `com.kindle.reader`.
- JDK 17.
- Android SDK sob o diretório do usuário, em `Android\Sdk`.
- Comando de execução mencionado: `npx expo run:android --device`.
- Em uma etapa, `adb` não estava disponível no PATH e precisou ser considerado na configuração do ambiente.
- APKs foram gerados/compartilhados para instalação e testes em dispositivos Android.

**Atenção:** versões exatas de Expo, React Native, bibliotecas e dependências devem ser obtidas do `package.json` e lockfile atuais, não inferidas deste histórico.

## 4. Organização arquitetural conhecida

O `PROJECT_CONTEXT.md` recuperado descreve, entre outros, os seguintes caminhos:

- `app/` — rotas Expo Router.
- `app/(tabs)/` — telas relacionadas à biblioteca/downloads.
- `src/domain/repositories/` — interfaces de repositórios.
- `src/data/` — dados, serviços e implementações.
- `src/presentation/` — telas e componentes.
- `appDependencies.openBook.execute(bookId)` — caso de uso mencionado no fluxo de abertura de livro.

A persistência/cache possui implementações SQLite e IndexedDB específicas de plataforma. Antes de modificar persistência, consultar interfaces em `src/domain/repositories/` e implementações reais.

### Fluxo EPUB descrito no contexto

1. A rota do Reader entrega `bookId` a `ReaderScreen`.
2. Um efeito chama `appDependencies.openBook.execute(bookId)`.
3. Para EPUB empacotado sem capítulos persistidos, resolve URI pelo catálogo empacotado, importa com `epubImporter.importFromUri(...)` e consulta novamente livro/capítulos.
4. `ReaderScreen` guarda capítulos, tipo, caminho e progresso inicial.
5. Monta `DocumentReaderAdapter`, que seleciona `EpubPageViewer`.
6. No Web, `createEpubReaderDocument(chapters, settings)` gera HTML entregue ao `iframe` via `srcDoc`.
7. O iframe recebe apresentação, página atual e tipografia; calcula páginas e envia informações por `postMessage`.

O `srcDoc` é memoizado pelos capítulos e o iframe deve permanecer estável enquanto esses capítulos não mudarem. Não introduzir `key` dependente de página ou estado de UI sem evidência e autorização.

## 5. EPUB — navegação, progresso e reset central

### Modelo de navegação documentado

- `epubPage`: página atual mantida pelo Reader.
- `epubNavigationRequest`: solicitação de navegação animada.
- No iframe:
  - `currentPage`: página exibida.
  - `targetPage`: destino durante a animação.
- `navigatePage()` aplica classe de transição.
- `transitionend` no `transform` confirma a navegação por `finishNavigation()`.
- `goToPage()` faz navegação direta e sincroniza transform/estado.
- `resize`, `ResizeObserver`, imagens e alterações de tipografia podem provocar recálculo de layout; isso não deve reaplicar restauração de abertura.

### Bug EPUB CENTER RESET

Estado registrado nos documentos de contexto:

- Bug descrito: usuário estava em uma página intermediária; ao tocar uma vez no centro para exibir controles, o Reader voltava ao início.
- Reprodução real relatada: sim.
- Reprodução em browser integrado/ambiente de investigação: não reproduzida em uma sessão documentada.
- Causa raiz: desconhecida.
- Correção funcional confirmada: nenhuma naquele handoff.
- Em teste de 02/10/2026 no Chrome Headless 154, com EPUB de 26 capítulos, página 15 permaneceu estável durante três alternâncias do botão central. O teste não reproduziu o bug e não refutou o relato original.
- Um HMR durante preparação da instrumentação causou remount e regeneração de `srcDoc`; essa ocorrência foi excluída da evidência válida dos cliques.
- O `ReaderScreen` e `DocumentReaderAdapter` renderizaram, mas não houve mudança relevante nas props EPUB, detach/attach do iframe, novo `iframe.onload`, alteração de `srcDoc`, `resize`, `ResizeObserver`, recálculo ou chamada `goToPage` durante os cliques válidos.

### Restrições de investigação

- Localizar a primeira escrita/mensagem que transforma página maior que 1 em página 1.
- Não usar `setTimeout`, debounce artificial, atraso, fila fictícia, estado compensatório ou retorno à página anterior como correção.
- Não resetar página por controles nem mascarar o problema.
- Não alterar parser sem evidência.
- Não alterar PDF Original/Reflow, cache, download, busca ou processamento para corrigir um bug de controles EPUB.
- Preservar `transitionend` e a separação entre página atual e destino.
- UI de controles deve ser independente da posição de leitura.
- Restauração de progresso ocorre apenas na abertura real/troca do documento, nunca por UI, resize ou tema.
- Investigar remount/iframe/srcDoc com evidência de runtime.
- Comparar `currentPage` do iframe, transform, `epubPage` do pai e progresso.

### Diagnósticos

Chaves mencionadas:

- `localStorage.epubCenterResetDiagnostics`
  - Ativar: `localStorage.setItem("epubCenterResetDiagnostics", "1")`
  - Desativar: definir `"0"` ou remover a chave.
  - Referências: `src/utils/epubOpenMetrics.ts`, `src/presentation/components/EpubReaderDocument.ts`, logs forenses em `ReaderScreen.tsx`, `DocumentReaderAdapter.tsx` e `EpubPageViewer.web.tsx`.
- `localStorage.pdfReflowDiagnostics`
  - Ativar: `localStorage.setItem("pdfReflowDiagnostics", "1")`
  - Desativar: definir `"0"` ou remover a chave.
  - Referência: `src/presentation/components/PdfReflowProcessor.web.tsx`.

Diagnósticos estavam desligados por padrão no contexto recuperado.

## 6. PDF Original e PDF Reflow

### PDF Original

- Usa o arquivo fonte e o componente `PdfPageViewer`.
- Mantém estado próprio de página/layout/zoom/rotação.
- Deve permanecer um caminho independente.
- Não alterar como efeito colateral de trabalho EPUB ou Reflow.

### PDF Reflow

- É um documento derivado do PDF original.
- Processamento sob demanda, não antecipado indiscriminadamente para toda a biblioteca.
- Possui componentes e cache próprios.
- Referências de código mencionadas:
  - `src/data/local/PdfReflowDocumentBuilder.ts`
  - `src/presentation/components/PdfReflowProcessor.web.tsx`
  - tipos `pdfReader`
  - repositórios de cache próprios.
- Preservar a distinção entre páginas reais do PDF e páginas estimadas/derivadas do Reflow.
- O cache foi descrito como funcional em algumas investigações; a primeira conversão pode ser demorada em livros grandes.
- Registro de teste: PDF `revolucao-dos-bichos.pdf`, 164 páginas, com texto/imagens, foi usado em discussão de arquitetura. Não inferir que isso valide todos os PDFs.
- Registro posterior: conversão inicial de um livro de 584 páginas (“Weber”) levou aproximadamente 3m32s em um Redmi. Esse valor é observação pontual, não garantia de desempenho.
- Problemas com PDF.js Reflow foram relatados em “Manifesto” e “Sociedade do Espetáculo”; “O Banquete” e “Sobre o Ócio” foram mencionados como casos que passaram em uma etapa de teste. Não generalizar para todos os arquivos.

### Proteções e correções a preservar/verificar

Os prompts e contextos citam:
- correção de truncagem / `tocMode` do PDF Reflow;
- proteção/fallback para texto corrompido;
- correção de `totalPages` do PDF Original;
- handshake de restauração;
- slot estável do viewer;
- margens verticais do Reflow;
- safe area e ajustes de layout mobile.

Esses itens devem ser verificados no código atual. Não presumir que estejam presentes em toda branch/build.

## 7. Flashcards — terminologia e requisitos funcionais

O documento `CONTEXTO_FLASHCARDS.md` é uma especificação funcional. Ele declara explicitamente que não comprova implementação.

Terminologia desejada na interface: **deck**, **decks**, **flashcard**, **flashcards**. Evitar substituir por “baralho” ou “carta”.

### Criação/edição

Campos esperados:
- Deck ao qual o flashcard pertence.
- Título.
- Pergunta/afirmação.
- Gabarito Verdadeiro/Falso.
- Imagem/desenho opcional.
- Explicação no verso.

Recomendações descritas:
- Pré-visualização de frente e verso.
- Não definir gabarito silenciosamente.
- Preservar campos se ocorrer erro ao salvar.
- Frente não revela gabarito nem explicação.
- Verso revela gabarito, explicação, resposta escolhida e pontos.
- Se não houver imagem, não reservar área vazia.
- Textos longos devem continuar legíveis e controles não podem ficar inacessíveis.

A forma final da ferramenta de desenho (desenho dentro do app ou importação de imagem desenhada) estava em aberto.

### Quatro respostas

| Símbolo | Texto | Julgamento | Confiança |
|---|---|---|---|
| XX | Certeza de que é falso | Falso | Alta |
| X | Talvez seja falso | Falso | Baixa |
| ✓ | Talvez esteja correto | Verdadeiro | Baixa |
| ✓✓ | Certeza de que está correto | Verdadeiro | Alta |

São quatro combinações de julgamento e confiança, não quatro gabaritos.

### Pontuação

Regra confirmada em especificação: confiança alta gera maior recompensa quando acerta e maior penalidade quando erra. A mesma regra deve valer no estudo e na batalha.

Tabela numérica apresentada no documento como **proposta inicial ajustável**, não como decisão definitiva:

| Escolha | Gabarito falso | Gabarito verdadeiro |
|---|---:|---:|
| XX — certeza de que é falso | +10 | −10 |
| X — talvez seja falso | +5 | −5 |
| ✓ — talvez esteja correto | −5 | +5 |
| ✓✓ — certeza de que está correto | −10 | +10 |

Valores e critérios finais precisam ser confirmados no código e com decisões posteriores. Não implementar a proposta como regra aprovada sem validação.

### Estudo individual

Fluxo desejado:
1. Abrir deck e iniciar estudo.
2. Mostrar frente e quatro opções.
3. Registrar julgamento/confiança.
4. Validar e aplicar pontuação.
5. Virar flashcard e revelar gabarito/explicação.
6. Usuário avança quando terminar de ler.
7. Exibir resumo com pontuação, respostas, acertos e erros.

Repetição espaçada foi citada como evolução possível, sem regra final definida nesse documento.

### Batalha entre usuários reais

- Pareamento e troca precisam ser reais; simulação local não atende.
- Quantidades por participante: **3, 5, 10 ou 15**.
- Cada pessoa fornece N flashcards do próprio deck e responde N flashcards recebidos do adversário.
- A troca para a partida não transfere propriedade nem incorpora automaticamente cartões à coleção permanente.
- Não duplicar flashcards silenciosamente se o deck não tiver N itens válidos.
- Conteúdo da partida deve ser snapshot estável; edição posterior do deck não altera a partida.
- Gabarito deve permanecer oculto até validação autorizada.
- Respostas repetidas/retransmitidas não podem pontuar duas vezes.
- Estados de partida propostos: configuração/pareamento, aguardando confirmação, em andamento, aguardando adversário, concluída e interrompida.
- Regras de abandono/expiração/desconexão precisam ser definidas; não declarar derrota automaticamente por oscilação de conexão.
- Propostas de ritmo: cada participante avança no próprio ritmo e aguarda o outro; não impor limite de tempo sem decisão.
- Proposta de resultado: maior pontuação vence; empate em pontuações iguais. Isso é proposta do documento, não necessariamente regra implementada.

## 8. Flashcards gerados a partir de livros

`CONTEXTO_FLASHCARDS_ESTUDO.md` descreve uma proposta de geração de flashcards a partir do conteúdo de livros. Não comprova que esteja implementada.

Fluxo desejado:
1. Usuário escolhe/importa livro.
2. Aciona “Gerar flashcards”.
3. Escolhe capítulos, trechos, grifos, conteúdo lido ou livro completo.
4. Define objetivo, idioma, nível de detalhe e quantidade.
5. App informa o conteúdo que será processado, se haverá serviço online e consumo estimado.
6. Gera prévia por capítulo/assunto.
7. Usuário edita, descarta ou aprova cartões.
8. Cartões aprovados entram em fila de novos cartões.
9. Usuário decide quando introduzi-los na rotina.
10. Durante o estudo, pode abrir o trecho de origem e retornar ao cartão sem perder posição.

Objetivos citados: conceitos principais, vocabulário, revisão para prova e compreensão de argumentos.

**Privacidade:** importar um livro não autoriza automaticamente enviar seu conteúdo a serviço de IA. A ação deve ser explícita e o usuário deve saber o que será processado.

## 9. Supabase, sincronização, autenticação e batalhas

Contexto recuperado de 15/10/2026 registra migrações/recursos de backend associados a batalhas e sincronização. Foram mencionados:
- `flashcard_battle`;
- tabelas privadas;
- `user_library_items`;
- `user_library_operations`;
- RPC `library_apply`;
- bucket privado `aldus-private-library`;
- perfis (`profiles`);
- overrides de recursos (`user_feature_overrides`).

O registro dizia que migrações tinham sido aplicadas/registradas, com dados preservados, mas testes ponta a ponta ainda pendentes naquele momento.

Arquitetura discutida:
- offline-first;
- SQLite/IndexedDB para dados locais;
- Supabase para backend, autenticação, perfis e recursos online;
- sincronização e biblioteca privada;
- batalhas com validação autoritativa no backend.

Pontos que estavam pendentes/inconclusivos em registros anteriores:
- login por username;
- proteção antiabuso;
- verificação de senhas comprometidas;
- Google OAuth;
- configuração de Vercel/logs;
- testes reais Android e testes ponta a ponta;
- confirmação do estado administrativo/permissões do Supabase.

**Não reaplicar migrações sem consultar o estado remoto e histórico do repositório.** O contexto anterior orientava explicitamente não reaplicar migrações já executadas.

## 10. Vercel, GitHub, Google Drive e serviços externos

- GitHub: versionamento e integração com o fluxo de desenvolvimento.
- Vercel: hosting/serviços e logs; auditorias foram solicitadas.
- Google Drive: integração mencionada em contexto de armazenamento/sincronização.
- Supabase: dados, autenticação e recursos online.
- Não presumir que OAuth, Drive ou integrações estejam funcionando só porque há configuração ou documentação. Verificar callback, redirect URI, secrets, permissões, logs e testes reais.
- Nunca expor secrets, tokens, chaves privadas ou dados pessoais em logs, prompts ou documentação.

## 11. Modo Viagem e configurações do Reader

- Modo Viagem foi mencionado como recurso/configuração do Reader.
- Há referência a ajustes em settings e comportamento de brilho.
- Também foi citado Expo SDK 57 em contexto de configuração de brilho.
- O estado atual e o comportamento exato devem ser confirmados no código e em aparelho físico.
- Não assumir que brilho de tela se comporta igual em Web e Android.
- Configurações e overlays não devem desmontar o documento nem reiniciar sessão/progresso.

## 12. Biblioteca, fontes de livros e recursos sociais

Foram recuperados nomes de documentos sobre fontes externas e pesquisa de aplicativos:
- `Pesquisa_Apps_Leitura_2026-10-05.md`
- `PROMPT_COPILOT_FONTES_DE_LIVROS.md`
- `PROPOSTA_FONTES_DE_LIVROS.md`

O conteúdo integral desses documentos não foi recuperado nesta consolidação; portanto, não atribuir fornecedores, sites ou decisões específicas sem reabri-los.

Recursos sociais/estilo Skoob foram discutidos como expansão futura. Não confundir planejamento com implementação. Comunidade, rankings, compartilhamento público, batalhas e recursos sociais devem ser classificados conforme evidência atual do código/backend.

## 13. Build, testes e dispositivos

Comandos de validação citados em contextos:
- `npm.cmd run typecheck`
- `npm.cmd run export:web`
- `git diff --check`

Um `PROJECT_CONTEXT.md` recuperado registra esses três gates como PASS em 02/10/2026. Isso comprova sanidade de tipos/export/diff naquele snapshot, não validação funcional completa.

Testes pendentes/necessários em contextos:
- teste manual EPUB no navegador, com página intermediária e abrir/fechar controles;
- reprodução no ambiente original do reset;
- validação Android físico;
- teste de PDF Original e PDF Reflow;
- persistência e restauração;
- navegação e safe area;
- autenticação, sincronização e batalhas ponta a ponta.

Aparelho físico citado: Redmi. Não assumir que é o único aparelho ou que o estado de instalação atual é o mesmo do histórico.

## 14. Git e proteção de dados

Diretrizes repetidas nos prompts:
- verificar `git status --short`, branch e `git log` antes de trabalhar;
- preservar alterações locais;
- não executar `git reset --hard`;
- não executar `git clean` destrutivo;
- não fazer force push;
- verificar `origin/main` antes de sincronizar;
- separar commits por escopo;
- não publicar nova versão Beta sem autorização;
- não apagar biblioteca, dados locais, contas ou fontes;
- não executar migrações sem verificar o estado remoto.

Em uma instrução de teste de dispositivo, havia exigência de preservar a instalação pessoal no Redmi: não desinstalar, não limpar dados, não substituir assinatura incompatível, não fazer downgrade de `versionCode` e não apagar livros/fontes/contas. Essa restrição deve ser confirmada antes de qualquer teste que possa afetar dados reais.

## 15. Documentos de contexto recuperados

Foram localizados na Biblioteca do ChatGPT os seguintes itens relevantes:

1. `PROJECT_CONTEXT.md` — snapshot de arquitetura, fluxo EPUB/PDF, bug reset, diagnósticos, gates e handoff.
2. `BUG_CONTEXT_EPUB_CENTER_RESET.md` — dossiê extenso da investigação do reset central.
3. `CONTEXTO_FLASHCARDS.md` — especificação funcional de decks, flashcards, estudo e batalha.
4. `CONTEXTO_FLASHCARDS_ESTUDO.md` — proposta de flashcards gerados a partir de livros.
5. `PROMPT_INTEGRACAO_FLASHCARDS_KINDLE_READER.md` — prompt de integração do módulo de flashcards.
6. `Texto colado(1).txt` — prompt de contexto para nova máquina/sessão, com regras de leitura obrigatória, comparação do workspace e proteção de mudanças.
7. `Texto colado.txt` — arquivo grande de contexto/código associado à investigação do leitor; precisa ser identificado e consultado com cuidado antes de usar.

Outros documentos mencionados pelo usuário e que devem ser procurados/consultados quando disponíveis:
- `BUG_CONTEXT_EPUB_PROGRESS_RESTORE.md`
- `Pesquisa_Apps_Leitura_2026-10-05.md`
- `Prompt_Codex_App_Leitura_Completo.md`
- `Prompt_Codex_Modo_Viagem.md`
- `PROMPT_COPILOT_FONTES_DE_LIVROS.md`
- `PROMPTS_REVISAO_KINDLE_READER.md`
- `PROPOSTA_FONTES_DE_LIVROS.md`

A presença de nomes na lista não significa que o conteúdo integral tenha sido lido nesta consolidação. Em especial, `PROJECT_CONTEXT.md` tem mais de uma cópia/snapshot na Biblioteca; usar a versão mais recente e conferir sua data/estado.

## 16. Decisões e distinções importantes

| Tema | Registro confiável | Não presumir |
|---|---|---|
| Nome | Aldus Reader substituiu Kindle Reader. | Que todos os identificadores internos foram renomeados. |
| EPUB | `currentPage` e `targetPage` separados; `transitionend` confirma navegação. | Que bug do reset está corrigido. |
| PDF | Original e Reflow são caminhos distintos; Reflow é derivado. | Que todos os PDFs funcionam no Reflow. |
| Flashcards | Requisitos detalhados documentados. | Que especificação equivale a implementação. |
| Batalha | Requisito de usuários reais e opções 3/5/10/15. | Que fluxo ponta a ponta está validado. |
| Pontuação | Regra de confiança maior/risco maior; números são proposta. | Que +10/+5/−5/−10 estão aprovados. |
| Geração por IA | Proposta de gerar cartões a partir de livros com consentimento explícito. | Que existe pipeline pronto. |
| Backend | Migrações e recursos Supabase registrados em outubro. | Que estado remoto atual é igual ao histórico. |
| Social | Ideias estilo Skoob discutidas. | Que comunidade/ranking já foi implementado. |

## 17. Pendências prioritárias para nova IA

1. Ler a documentação atual diretamente no repositório e confrontá-la com o código.
2. Identificar branch, commit, alterações locais e estado remoto.
3. Confirmar quais documentos de contexto estão presentes e quais faltam.
4. Atualizar o inventário EPUB/PDF com estado por plataforma.
5. Não declarar resolvido o reset central sem reprodução e validação no ambiente onde ocorre.
6. Conferir correções de PDF Reflow e Original sem reintroduzir regressões.
7. Auditar flashcards: implementação real versus especificação.
8. Auditar batalhas/sincronização no Supabase, sem reaplicar migrações.
9. Verificar Modo Viagem/brilho em dispositivo físico.
10. Verificar login/OAuth/Drive/Vercel e testes ponta a ponta.
11. Recuperar e ler os documentos de fontes de livros e pesquisa de apps antes de propor fornecedores.
12. Atualizar `PROJECT_CONTEXT.md` e documentação existente após alterações autorizadas, sem criar documentação duplicada desnecessária.

## 18. Instrução final de confiabilidade

Ao usar este arquivo:
- marcar cada item como **implementado e verificado**, **implementado sem validação**, **parcial**, **planejado**, **proposta**, **descartado** ou **desconhecido**;
- incluir evidência: arquivo, função, migration, teste, log, commit ou execução;
- preservar conflitos históricos;
- nunca transformar hipótese em causa confirmada;
- nunca transformar requisito em funcionalidade concluída;
- usar o repositório e os documentos originais como fonte principal para o estado atual.
