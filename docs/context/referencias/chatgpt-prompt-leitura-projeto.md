# Handoff ChatGPT — prompt mestre de leitura/auditoria

> REFERÊNCIA HISTÓRICA (origem: ChatGPT, consolidada em 06/11/2026). Pode estar desatualizada: foi escrita a partir de snapshots de 02/10 a 20/10/2026, anteriores ao PROJECT_CONTEXT.md recente do Codex. Em conflito, vale código > PROJECT_CONTEXT.md > BUGS_ATUAIS.md > este arquivo. Conteúdo original abaixo, sem alterações.

# PROMPT_LEITURA_PROJETO.md — Handoff mestre para outra IA

Você é a IA responsável por conhecer, auditar e dar continuidade ao **Aldus Reader**, anteriormente chamado **Kindle Reader**.

Seu primeiro objetivo NÃO é implementar funcionalidades. Seu primeiro objetivo é reconstruir o estado real do projeto, ler a documentação, inspecionar o repositório e produzir um relatório confiável. Não presuma que a memória de outra sessão, um resumo ou este prompt representam o código atual.

## 1. Identidade e contexto inicial

- Projeto: Aldus Reader (antigo Kindle Reader).
- Diretório local mencionado historicamente: `C:\KIndle`.
- Package Android mencionado: `com.kindle.reader`.
- Stack historicamente citada: React Native, Expo, Expo Router, Web, EPUB, PDF.js/WebView, SQLite, IndexedDB, Supabase/Auth, Google Drive, Vercel e GitHub.
- Ambiente histórico: VS Code, Codex/Copilot, JDK 17, Android SDK e execução com `npx expo run:android --device`.
- Esses dados são pistas. Confirme tudo no workspace atual.

## 2. Regra absoluta: fase inicial somente leitura

Antes de qualquer edição, instalação, migração, build, limpeza ou alteração de configuração:

1. Identifique o diretório de trabalho e o repositório.
2. Execute e registre:
   - `git status --short`
   - `git branch --show-current`
   - `git log --oneline -10`
   - `git remote -v`
3. Leia as instruções do repositório (`AGENTS.md`, instruções locais e equivalentes).
4. Localize e leia integralmente, quando existentes:
   - `PROJECT_CONTEXT.md`
   - `BUG_CONTEXT_EPUB_CENTER_RESET.md`
   - `BUG_CONTEXT_EPUB_PROGRESS_RESTORE.md`
   - `CONTEXTO_FLASHCARDS.md`
   - `CONTEXTO_FLASHCARDS_ESTUDO.md`
5. Procure também:
   - `Pesquisa_Apps_Leitura_2026-10-05.md`
   - `Prompt_Codex_App_Leitura_Completo.md`
   - `Prompt_Codex_Modo_Viagem.md`
   - `PROMPT_COPILOT_FONTES_DE_LIVROS.md`
   - `PROMPT_INTEGRACAO_FLASHCARDS_KINDLE_READER.md`
   - `PROMPTS_REVISAO_KINDLE_READER.md`
   - `PROPOSTA_FONTES_DE_LIVROS.md`
6. Se algum documento não existir, informe o nome exato e os locais pesquisados. Não invente seu conteúdo e não trate a ausência como autorização para reconstruir decisões antigas por suposição.
7. Faça inventário de `package.json`, lockfile, `app/`, `src/`, migrations, testes, configurações nativas e documentação.

**Não altere nenhum arquivo nesta fase. Não instale dependências. Não execute migrações. Não faça deploy. Não gere APK.**

## 3. Relatório obrigatório antes de qualquer mudança

Entregue um relatório com:

1. Diretório/repositório confirmado.
2. Branch, commit e estado do Git.
3. Documentos encontrados, lidos integralmente e ausentes.
4. Stack e versões reais obtidas dos manifests/lockfiles.
5. Arquitetura real e divisão Web/Native.
6. Fluxo de abertura, navegação e persistência de EPUB.
7. Fluxos PDF Original e PDF Reflow.
8. Estado do bug EPUB CENTER RESET, separando reprodução, hipótese e causa confirmada.
9. Estado de flashcards, estudo, batalha e geração de cartões por livro.
10. Estado de Supabase, Auth, migrations, sincronização e bucket privado.
11. Estado de Vercel, GitHub e Google Drive.
12. Estado do Modo Viagem e brilho.
13. Testes existentes e resultados efetivamente executados anteriormente.
14. Riscos de dados, instalação física e deploy.
15. Divergências entre documentação e código atual.
16. Próximas etapas recomendadas, ordenadas por risco e prioridade.

Para cada recurso, use uma classificação explícita:
- IMPLEMENTADO E VERIFICADO
- IMPLEMENTADO, MAS SEM VALIDAÇÃO SUFICIENTE
- PARCIAL
- PLANEJADO / ESPECIFICAÇÃO
- PROPOSTA NÃO APROVADA
- DESCONHECIDO
- DESCARTADO

Anexe evidência concreta: caminho, símbolo, migration, teste, log ou commit. Não classifique como implementado apenas porque existe um documento ou prompt descrevendo a função.

Depois do relatório, **pare e aguarde autorização explícita** para começar a implementar.

## 4. Proteção do Git e do workspace

- Preserve todas as alterações locais, inclusive arquivos untracked.
- Não execute `git reset --hard`.
- Não execute `git clean` destrutivo.
- Não sobrescreva arquivos do usuário.
- Não faça force push.
- Não troque branch ou faça merge/rebase sem autorização.
- Antes de qualquer mudança futura, registre o estado inicial e confira o diff.
- Faça mudanças pequenas e focadas; não recomece a arquitetura.
- Não remova instrumentações ou artefatos de investigação sem entender sua finalidade.
- Não crie documentação paralela se o projeto já tiver um documento vivo apropriado.

## 5. Reader EPUB — invariantes

O contexto histórico descreve:
- `ReaderScreen` recebe `bookId` e chama `appDependencies.openBook.execute(bookId)`.
- EPUB empacotado sem capítulos persistidos pode ser importado sob demanda com `epubImporter.importFromUri(...)`.
- `DocumentReaderAdapter` seleciona `EpubPageViewer`.
- Web gera HTML por `createEpubReaderDocument(chapters, settings)` e usa `iframe` com `srcDoc`.
- Estado do Reader inclui `epubPage` e `epubNavigationRequest`.
- No documento/iframe, `currentPage` e `targetPage` são distintos.
- `navigatePage()` anima e `transitionend` confirma por `finishNavigation()`.
- `goToPage()` faz navegação direta.
- Recálculo por resize/ResizeObserver/imagens/tipografia não deve reaplicar restauração de abertura.

Verifique tudo no código atual antes de confiar nesses detalhes.

### Bug EPUB CENTER RESET

Histórico documentado:
- Relato: abrir controles com um toque central enquanto está em página intermediária faz o EPUB voltar ao início.
- Causa raiz não confirmada no último dossiê recuperado.
- Teste Chrome Headless em 02/10/2026 não reproduziu o problema; isso não refuta o relato no ambiente original.
- Diagnósticos históricos: `epubCenterResetDiagnostics` e `pdfReflowDiagnostics`.

Regras:
- Não declarar resolvido sem reproduzir e validar no ambiente em que ocorre.
- Encontrar a primeira escrita/mensagem que muda página maior que 1 para 1.
- Não usar `setTimeout`, debounce artificial, atraso, fila fictícia, estado compensatório ou voltar à página anterior como paliativo.
- Não alterar parser, PDF, cache, download, busca ou processamento sem evidência e necessidade.
- Preservar `transitionend`, `currentPage`/`targetPage` e a estabilidade do iframe.
- Não reintroduzir remount por `key` dependente de página/UI.
- Diferenciar estado lógico de problema visual de transform/CSS.

## 6. PDF Original e PDF Reflow — invariantes

- PDF Original e PDF Reflow são caminhos separados.
- Original usa o arquivo fonte e `PdfPageViewer`, com estado próprio de página/layout/zoom/rotação.
- Reflow é documento derivado, processado sob demanda e com cache próprio.
- Preservar distinção entre página física do PDF e página estimada/derivada do Reflow.
- Referências históricas:
  - `src/data/local/PdfReflowDocumentBuilder.ts`
  - `src/presentation/components/PdfReflowProcessor.web.tsx`
  - `src/presentation/screens/ReaderScreen.tsx`
  - `src/presentation/components/ReaderControls.tsx`
  - `src/presentation/components/ReaderSettingsPanel.tsx`
  - `src/presentation/components/EpubPageViewer.web.tsx`
  - `src/presentation/components/EpubReaderDocument.ts`
  - `src/presentation/components/reader/DocumentReaderAdapter.tsx`
  - `src/presentation/components/reader/ReadingTouchZones.tsx`
  - `src/utils/epubOpenMetrics.ts`

Verifique se os caminhos ainda existem e encontre equivalentes se foram movidos.

Contextos anteriores citam correções para truncagem/`tocMode`, fallback de texto corrompido, `totalPages` do PDF Original, handshake de restauração, slot estável do viewer e margens verticais. Confirme no código e nos testes; não presuma que estão presentes ou corretas.

Não processar Reflow para toda a biblioteca antecipadamente sem requisito e análise de custo.

## 7. Flashcards, estudo e batalhas

`CONTEXTO_FLASHCARDS.md` é especificação funcional; não prova implementação.

Terminologia solicitada na interface: `deck`, `decks`, `flashcard`, `flashcards`.

Requisitos descritos:
- Criação/edição de deck e flashcard.
- Campos: título, afirmação, gabarito Verdadeiro/Falso, imagem/desenho opcional e explicação.
- Frente sem gabarito; verso revela explicação após resposta.
- Quatro opções:
  - `XX`: certeza de que é falso.
  - `X`: talvez seja falso.
  - `✓`: talvez esteja correto.
  - `✓✓`: certeza de que está correto.
- A confiança deve aumentar tanto recompensa quanto penalidade.
- A mesma regra deve ser compartilhada entre estudo e batalha.
- Quantidades de batalha: 3, 5, 10 ou 15 flashcards por participante.
- Batalha deve ocorrer entre usuários reais, com validação autoritativa no backend.
- Respostas repetidas não podem pontuar duas vezes.
- Conteúdo usado na partida deve ser snapshot estável.
- Não transferir propriedade dos flashcards ao adversário.

A tabela numérica +10/+5/−5/−10 aparece como proposta ajustável, não como valor definitivamente aprovado. Critérios de seleção, abandono, desconexão e expiração também precisam ser confirmados.

`CONTEXTO_FLASHCARDS_ESTUDO.md` descreve proposta para gerar flashcards a partir de livros. Importar um livro não significa consentimento para enviar seu conteúdo a um serviço de IA. Deve haver escolha explícita, prévia, possibilidade de editar/descartar/aprovar e vínculo ao trecho de origem.

## 8. Supabase, sincronização e serviços

Registros históricos mencionam:
- `profiles`
- `user_feature_overrides`
- `flashcard_battle`
- `user_library_items`
- `user_library_operations`
- RPC `library_apply`
- bucket privado `aldus-private-library`

Também foi descrita arquitetura offline-first, com SQLite/IndexedDB local e recursos online no Supabase.

**Antes de tocar no backend:**
1. Inspecione migrations e histórico.
2. Consulte o estado remoto apenas se autorizado e com ferramentas/credenciais já configuradas.
3. Não reaplique migrations já executadas.
4. Não apague dados nem altere RLS/Auth/buckets sem autorização.
5. Não exponha tokens, chaves, dados pessoais ou conteúdo privado.
6. Diferencie migration no repositório de migration aplicada no projeto remoto.

Pontos anteriormente pendentes/inconclusivos: login por username, proteção antiabuso, senhas comprometidas, Google OAuth, configurações Vercel/logs e testes ponta a ponta. Confirme o estado atual.

## 9. Modo Viagem, brilho e Android

Modo Viagem e controle de brilho foram mencionados em settings; Expo SDK 57 apareceu no contexto. Verifique implementação real e diferença entre Web/Android.

Há histórico de teste em Redmi e de APK instalado fisicamente. Antes de instalar, desinstalar, limpar dados ou trocar assinatura, verifique se o aparelho contém biblioteca/conta que precisa ser preservada.

Regras de segurança para aparelho pessoal:
- Não desinstalar app pessoal sem autorização.
- Não limpar dados.
- Não instalar APK de assinatura incompatível por cima.
- Não fazer downgrade de `versionCode`.
- Não apagar fontes, contas ou biblioteca.
- Não publicar nova Beta sem autorização.
- Confirmar assinatura, versão e build antes de qualquer substituição.

## 10. Testes e validação

Comandos citados em snapshots:
- `npm.cmd run typecheck`
- `npm.cmd run export:web`
- `git diff --check`

Um snapshot de 02/10/2026 registrou PASS nesses gates. Isso não prova funcionamento de EPUB/PDF, Android, Auth ou sincronização.

Escolha testes com base na tarefa e registre:
- comando exato;
- ambiente e versão;
- resultado;
- falhas e limitações;
- evidência manual;
- dispositivo/browser;
- se exige rebuild ou nova instalação.

Não declarar testes aprovados se não foram executados. Build/export bem-sucedido não é correção funcional.

## 11. Processo para futuras implementações (somente após autorização)

Quando o usuário autorizar uma tarefa:

1. Releia o contexto diretamente relacionado.
2. Inspecione o código e os testes reais.
3. Apresente um plano curto e os arquivos que pretende alterar.
4. Preserve o escopo solicitado.
5. Implemente em etapas pequenas.
6. Execute testes relevantes.
7. Revise `git diff` e `git status`.
8. Atualize `PROJECT_CONTEXT.md` e documentação existente quando a mudança alterar comportamento, arquitetura, testes ou estado conhecido.
9. Não faça commit, push, deploy, migration ou release sem autorização específica.
10. Informe exatamente o que foi alterado, testado, não testado e o que permanece pendente.

## 12. Formato do relatório inicial

Use este formato:

### Estado do repositório
- Diretório:
- Branch:
- Commit:
- Git status:
- Remoto:

### Documentação
- Arquivos lidos:
- Arquivos ausentes:
- Conflitos entre documentos:

### Arquitetura real
- Stack e versões:
- Web/Native:
- Navegação:
- Persistência:
- EPUB:
- PDF Original:
- PDF Reflow:

### Módulos
- Flashcards:
- Estudo:
- Batalhas:
- Geração de flashcards por livro:
- Modo Viagem:
- Auth/Supabase:
- Sincronização:
- Google Drive:
- Vercel:

### Validação
- Testes existentes:
- Testes executados:
- Resultado:
- Testes pendentes:

### Riscos e divergências
- Dados:
- Android físico:
- Backend:
- Documentação versus código:

### Próximas etapas
Liste prioridades com justificativa e aguarde autorização.

## 13. Regra final

Este prompt e o arquivo `chats.md` são um mapa de contexto, não a verdade final do código. A fonte principal para qualquer decisão técnica é a combinação de:
1. código e configuração atuais;
2. documentação atual do repositório;
3. migrations e estado do backend, quando autorizados;
4. testes reproduzíveis;
5. histórico, usado para entender intenção e evitar regressões.

Não invente, não assuma, não apague e não implemente antes da auditoria inicial e da autorização do usuário.
