# Histórico — Pesquisa de usuários, Ciclo 0 e início do Ciclo 1 (21/10)

> Registro cronológico.
> Texto preservado do PROJECT_CONTEXT.md original (2192 linhas, escrito pelo Codex), movido sem reescrita em 06/11/2026. Trate como hipótese: confira Git/código antes de confiar. O estado atual e as pendências estão em [PROJECT_CONTEXT.md](../../../PROJECT_CONTEXT.md).

## Pesquisa de usuários — Ciclo 0 e primeiro incremento do Ciclo 1 (21/10/2026)

Base: pesquisa fornecida pelo proprietário, 54 participantes; 47/54 deram interesse 4–5 (87,0% desta amostra, sem extrapolação ao mercado). Seleção múltipla: conforto 42/54, metas/progresso 36/54, comunidade 28/54, flashcards 26/54, geração automática 24/54 e batalhas 13/54. Distração: 55,6%; desconforto: 25,9%. Somente agregados foram utilizados; nenhum contato da pesquisa foi acessado, importado ou convidado.

Princípio: leitura individual no centro; estudo complementar; participação social, metas e competição opcionais. A hipótese de melhorar concentração ainda precisa de observação com usuários; não há resultado medido de retenção.

### Matriz do Ciclo 0 — inspeção do código, não homologação física integral

Esforço relativo: P pequeno, M médio, G grande; prioridades indicam ordem de trabalho, não prazo prometido.

| Necessidade | Evidência da pesquisa | Estado/evidência no código | Mudança necessária | Prioridade/esforço | Risco | Validação |
| --- | --- | --- | --- | --- | --- | --- |
| Conforto visual | 42/54; desconforto 25,9% | Implementado: ReaderSettingsPanel/Context, temas Claro/Papel/Sépia/Escuro/Preto, fonte, brilho, entrelinha, parágrafos, margens; PDF tem ajustes próprios | Melhorar descoberta por necessidade; reorganização completa ainda pendente | 1/M | Repaginação e âncoras | Reader settings, navegação, layout, Chromium e Redmi pendente |
| Ler sem distrações | Distrações 55,6%; relatos sem pressão | Parcial: readerStore inicia controles ocultos; ReadingTouchZones alterna controles e teclado Web; faltava preferência para ocultar contagens | Primeiro incremento entregue: Concentração, Ler em foco e ocultação persistente de contagens | 1/P | Mudar geometria/posição | Provider real, Footer real, ReaderScreen controlado, 16 pares Chromium |
| Acessibilidade/anti-enjoo | Conforto/luminosidade e diversidade de leitores | Implementado: fonte disléxica, escala, safe area, MotionCuesControl com permissão/sensor; não equivale a sensor validado agora | Ensaiar toque, fonte ampliada e movimento no Redmi | 1/M | Hardware e controles | Yoga/regressões locais; físico pendente |
| Categorias próprias | Respostas abertas | Implementado: BookOrganization collections[]/tags[]/favorite; BookOrganizationModal; edição por livro com listas separadas por vírgula | Melhorar seleção/renomeação coletiva sem modelo paralelo; ainda não entregue | 2/M | Renomear parcialmente e conflitos | library-organization/account/sync; futuros ensaios com vários livros |
| Busca e organização do acervo | Organização e continuidade | Implementado: library.tsx pesquisa normalizada, coleções, favoritos, estado e ordenação; SourceLibraryScreen pesquisa assíncrona e ordenação | Avaliar descoberta e filtros por formato no fluxo cotidiano; não reimplementar biblioteca | 2/M | Acervos grandes, isolamento | Suites library/source-performance; acervo real grande pendente |
| Importar dispositivo/Drive | Respostas abertas | Implementado: importadores EPUB/PDF e SourceManagerModal guiado, configuração avançada e cancelamento; Drive real mantém pendências históricas | Retomar prova com pasta autorizada; não baixar todo acervo | 2/M | Consentimento, rede e índice antigo | Drive/Sources controlados; pasta real no Redmi não validada nesta tarefa |
| Continuidade entre dispositivos | Respostas abertas | Implementado: AccountOrganizationRepository, LibrarySync/outbox e reading-sync; organização isolada pelos livros da conta | Ampliar prova autenticada; não prometer sincronização das preferências globais do Reader | 2/G | RLS, troca de conta, conflito | Regressões locais de Sync; nenhuma escrita remota nesta missão |
| Progresso sem pressão | 36/54 e respostas sem competição | Parcial: CommunityProfile/ReadingSnapshot, meta anual opcional/null e privacidade PRIVATE na criação; métricas desconhecidas continuam null | Painel pessoal separado do social; metas mensais/tempo e medição de sessões ainda por projetar | 3/G | Inventar tempo/datas, exposição social | community-domain/data/provider; nova instrumentação exige contrato claro |
| Notas e grifos | Respostas abertas | Implementado: StudyHighlightsPanel, 5 cores, nota, busca/filtro, exportação, marcadores e âncoras duráveis; limitações EPUB/PDF distintas | Ensaiar recuperação após tipografia/fechar/reabrir e usabilidade de seleção | 3/M | Trecho incorreto, âncora ambígua | reading-anchors/study-storage/Reader; físico pendente |
| Trecho para flashcard/deck/revisão | 26/54 | Parcial: StudyHighlightsPanel cria no deck Grifos do livro e aprova diretamente; repository/SRS/revisão existentes | Escolha de deck e revisão explícita antes de aprovar; não criar sistema paralelo | 4/M | Cartões pouco úteis ou duplicados | flashcard storage/UI/sessions; novo fluxo ainda não implementado |
| Geração automática | 24/54 | Parcial: flashcardGeneration.ts tem gerador determinístico local; busca não encontrou consumidor em src; não é IA | Integrar candidatos revisáveis quando chegar este ciclo; nenhuma API paga ou envio de livro | 4/G | Confundir heurística com IA | Unitários existentes; integração de ponta a ponta pendente |
| Comunidade opcional/por obra/spoilers | 28/54 e respostas abertas | Parcial: tópicos/posts possuem containsSpoilers/spoilerScope; telas/perfis/repos e segurança existentes; acesso por Ajustes, fora do Reader | Validar ocultação/revelação voluntária e organização por obra; novos contratos remotos dependem de aprovação | 4/G | Spoilers, moderação e autoria | community-schema/domain/UI; sem migration/deploy remoto |
| Voz, compartilhar trechos, recomendações e formatos | Sugestões sem consenso universal | Não iniciados neste ciclo; não certificados ausentes em toda a aplicação | Investigar demanda e dependências após estabilização; preservar batalhas existentes | 5/G | Custos, direitos, privacidade e complexidade | Protótipo futuro isolado e consentido |

### Incremento implementado e limites

- ReaderSettingsPanel oferece seção Concentração, ação Ler em foco e explicação do toque para recuperar controles. Reutiliza controlsVisible; não altera documentos, âncoras, eventos sociais ou geometria do Reader.
- hideReadingCounts é booleano no ReaderSettingsContext e na mesma chave v1 existente. Padrão false para compatibilidade; campos antigos de aparência são preservados. Preferência de apresentação local deste dispositivo, comum às contas, sem dados de conta/permissão e sem promessa de Sync.
- ReaderScreen transmite a opção pelos dois caminhos de ReaderControls ao BottomFooter. Contagens ficam invisíveis e fora da acessibilidade, mantendo a altura; slider e botões continuam disponíveis. Nenhuma gravação de posição é disparada pela mudança.
- Não há reorganização completa dos ajustes em cinco grupos, novo painel de metas, migração de coleções, revisão de criação de cartões ou novo serviço social neste incremento. São os próximos blocos, com risco/validação definidos acima.
- Sem dependência Native nova: recompilação não é exigida por um módulo novo. Para usar o JavaScript alterado no APK independente do Metro será necessária uma futura atualização de build, solicitada separadamente. Nenhum APK foi gerado/instalado agora.

### Evidências e ponto de retomada

- Base Git conferida/fetch: main em 4a205224f0ceec01a0497bf7596e885de22e13ac, alinhada ao origin/main antes das alterações. Três alterações locais preexistentes (.gitignore e ambos os contextos) preservadas por comparação SHA-256 dos bytes anteriores; só os acréscimos desta missão entram no commit documental.
- Matriz original contada: 81 suítes. Nova reader-concentration integrada: 82/82 aprovadas. Regressão ReaderScreen verifica entrada em foco, retorno dos controles e preferência sem remontar documento nem mudar página 51 ou gravar nova posição. Typecheck e export Web aprovados.
- scripts/test-reader-concentration.cjs usa provider/rodapé reais com fronteiras controladas: migração de configuração antiga, validação booleana, persistência offline/reabertura, aparência preservada e navegação acessível.
- npm run test:reader:concentration:web usa Chromium isolado e rodapé real via React Native Web SSR; slider/ícones/safe area controlados. 16 pares visível/oculto: 320×568, 390×844, 844×390, 1440×900; claro/escuro e texto 160%. Geometria da barra não muda. Capturas antes.png/depois.png e web-results.json em .expo/research-cycle1 (fora do Git). São evidências do componente, não da aplicação inteira nem de toque Android.
- adb devices não encontrou aparelho. Redmi, sensor, foco/reabrir em PDF Original/Leitura Livre físicos e Drive com centenas de livros: PENDENTES. Não houve acesso a biblioteca pessoal nem alteração de instalação/dados.
- Sem mudanças Supabase, Auth, OWNER/ADMIN, catálogo comercial, pagamentos, deploy ou produção. Pendências beta anteriores permanecem; estes testes não as encerram.
- Retomar pelo Ciclo 1: ensaio físico dos três modos, preferências/posição e avaliação do agrupamento progressivo dos ajustes; depois Ciclo 2: seleção/renomeação de coleções sobre o modelo existente. Não iniciar IA/voz/novos serviços sociais antes desses critérios.
