Você está trabalhando no repositório do meu aplicativo de leitura de EPUB e PDF. Quero que implemente as funcionalidades abaixo para tornar o app completo para leitura, estudo e organização de livros, preservando a arquitetura atual e o funcionamento no Web e no Android.

Execute o trabalho por etapas verificáveis. Não encerre apenas com uma análise ou um plano. Confira o que já existe, implemente o que falta, valide cada entrega e continue pelas próximas etapas enquanto houver trabalho executável. Uma funcionalidade só está concluída quando funciona com dados reais, persiste corretamente e tem comportamento validado.

## 1. Leia o projeto e organize a execução

- Leia AGENTS.md, PROJECT_CONTEXT.md, os dossiês BUG_CONTEXT_EPUB_CENTER_RESET.md e BUG_CONTEXT_EPUB_PROGRESS_RESTORE.md, quando existirem, e o package.json.
- Leia também Pesquisa_Apps_Leitura_2026-10-05.md, caso esteja disponível.
- Confira o código e a instalação atuais. “Não documentado” não significa que a função não existe: reutilize as implementações válidas e complete suas lacunas.
- Preserve alterações preexistentes e dados da biblioteca.
- Respeite a separação entre domínio, dados, apresentação e implementações específicas de plataforma.
- Verifique as versões realmente instaladas antes de escolher dependências. Consulte documentação oficial para decisões de API, compatibilidade e configuração.
- Este pedido autoriza as alterações necessárias nos componentes envolvidos nas funcionalidades descritas. As restrições do handoff de uma sessão de diagnóstico não impedem este novo escopo; continue preservando os comportamentos existentes e evitando refatorações sem necessidade.
- Crie ou atualize ROADMAP_FUNCIONALIDADES.md com etapas, dependências, estado real, validações, bloqueios e próxima ação. Mantenha PROJECT_CONTEXT.md atualizado para continuidade.

## 2. Aviso obrigatório sobre recompilação e reinstalação

Ao iniciar cada etapa, determine se a alteração funciona na instalação atual ou exige uma nova build.

Sempre que uma dependência nativa, configuração ou outra alteração exigir recompilação, avise claramente:

“Esta alteração exige recompilar e reinstalar o aplicativo no Android. Atualizar pelo Metro/Fast Refresh não será suficiente.”

Explique o motivo e forneça os comandos reais para este projeto. Não recomende reinstalação automaticamente para qualquer mudança de JavaScript, TypeScript ou estilos.

Ao concluir, informe quais alterações exigem nova build, se ela foi executada e se o aplicativo instalado foi realmente validado. Não confunda exportação Web com validação do Android.

## 3. Estabilize a leitura antes de ampliar o leitor

Confirme se os problemas registrados ainda existem e resolva os que forem reproduzidos:

- EPUB retornando ao início ao abrir os controles.
- Oscilação ou perda da posição ao reabrir o PDF Reflow.
- Reflow apresentado como pronto com conteúdo ilegível, truncado ou incompleto.
- Divergência do painel de aparência e problemas de safe area no Android real.

Capture a primeira operação que introduz o estado incorreto antes de propor uma correção. Se um problema não ocorrer no ambiente disponível, registre esse limite e mantenha a investigação aberta.

Preserve a estabilidade do documento ao abrir menus. Não recrie o iframe ou o leitor por alterações exclusivamente visuais. Preserve a confirmação de navegação e os mecanismos válidos de restauração.

Mantenha PDF Original e Reflow como caminhos distintos. Preserve o arquivo fonte e o retorno ao Original. Não generalize resultados de um único livro nem amplie heurísticas de corrupção sem avaliar falsos positivos.

## 4. Crie a base de posições, grifos e anotações

Implemente uma identificação durável do trecho, adequada ao motor de cada formato, para que posição e anotações sobrevivam a mudanças de fonte, margem, orientação e paginação.

- EPUB: localização estrutural, acompanhada de texto e contexto suficientes para reencontrar o trecho.
- PDF Original: página fonte e localização do texto ou região.
- Reflow: vínculo entre blocos derivados e seus trechos/páginas do PDF original.
- Diferencie localização de leitura, navegação temporária e histórico de consultas.
- Não use somente o número da página recalculada ou um percentual como identificação exata.
- Quando uma correspondência for ambígua, mantenha a nota recuperável e indique a limitação; não a coloque silenciosamente em outro trecho.

Implemente grifos com cores, notas editáveis, marcadores nomeados, busca e filtros nas anotações. Persista tudo e preserve os dados ao fechar, reabrir e atualizar o documento.

Ofereça exportação em Markdown, texto e formato estruturado para backup/importação, com livro, autor, trecho, comentário, capítulo, referência fonte quando disponível e link de retorno quando suportado. Não invente páginas de referência.

## 5. Personalização e navegação

- Configurações globais com substituições por livro: fonte, tamanho, tema, margens, largura, espaçamento e modo de leitura.
- Perfis reutilizáveis de aparência, sem sobrescrever ajustes individuais inadvertidamente.
- Retorno rápido após consultar sumário, resultado de busca, mapa, imagem ou nota, com histórico de navegação.
- Notas de rodapé em popup quando a estrutura permitir, preservando a posição.
- Seleção de texto estável, sem virar páginas acidentalmente.
- Gestos e atalhos compatíveis com a plataforma, com opções compreensíveis.
- Painéis responsivos, safe area correta e controles acessíveis.

Preserve a identidade visual atual. Use português brasileiro na interface. Estados de carregamento, indisponibilidade e erro devem explicar a ação possível sem expor detalhes internos desnecessários.

## 6. Biblioteca, leitura offline e backup

Implemente ou complete:

- Coleções, tags, favoritos, séries e ordem dos volumes.
- Estados de leitura: não iniciado, lendo, concluído e interrompido.
- Edição de título, autor, série e capa, quando suportada.
- Busca e filtros por metadados; busca no conteúdo dos livros já indexados quando viável.
- Detecção de duplicatas e tratamento de edições diferentes sem perder notas.
- Indicação confiável de livros disponíveis offline, downloads em andamento e falhas.
- Downloads solicitados pelo usuário, com cancelamento e recuperação de falhas.
- Gestão de armazenamento distinguindo arquivos, caches e dados de leitura.
- Backup e restauração de livros, configurações, progresso e anotações, com validação e tratamento de conflitos.

Mantenha a abertura sob demanda. A listagem da biblioteca não deve baixar ou processar todos os livros. Limpar cache não pode apagar silenciosamente notas e progresso.

Valide a leitura offline separadamente no Web e no Android; não declare funcionamento offline apenas porque há persistência local.

## 7. Sincronização entre aparelhos

Implemente sincronização opcional de livros, posição, marcadores, grifos, notas, configurações por livro e dados de leitura.

- Reutilize a infraestrutura existente, quando adequada.
- Mantenha o uso local independente de conta e conexão.
- Use fila persistente para alterações offline, operações idempotentes, identificadores estáveis, versões e propagação de exclusões.
- Trate conflitos sem apagar dados silenciosamente.
- Não escolha sempre a maior página ou percentual: consultas, releituras e mudanças de layout não equivalem a avanço definitivo.
- Mostre o estado real da sincronização e permita recuperação de falhas.
- Preserve segredos fora do código e do bundle cliente.

Se faltar infraestrutura ou credencial externa, execute as partes independentes, prepare a configuração necessária e registre exatamente o bloqueio. Não simule sincronização com dados locais nem marque a função como concluída sem uma troca real entre duas instâncias.

## 8. Dicionário, tradução e leitura em voz alta

Implemente:

- Consulta de palavras e expressões dentro do leitor.
- Dicionário offline quando houver fonte compatível disponível.
- Tradução opcional com estados reais de conexão e configuração.
- Vocabulário salvo, com trecho de origem e exportação.
- TTS para EPUB e PDFs com texto utilizável.
- Seleção de voz/idioma, velocidade, pausa, retomada, temporizador e navegação por trechos.
- Acompanhamento visual e continuidade entre ouvir e ler, conforme a capacidade real do motor.

Priorize recursos locais e vozes disponíveis no aparelho. Serviços pagos devem ser opcionais e configurados explicitamente.

Trate áudio, interrupções e execução em segundo plano conforme as APIs e permissões da plataforma. Não prometa no navegador comportamentos que ele não consegue garantir. Informe qualquer necessidade de nova build Android.

## 9. Evolua o PDF híbrido e adicione OCR

Implemente progressivamente:

- Alternância entre Original e Leitura Livre preservando o trecho por correspondência de conteúdo.
- O mesmo conjunto de anotações nos dois modos, quando o mapeamento for confiável.
- Recorte de margens, ajuste de contraste e divisão de documentos com duas páginas do livro em uma página do PDF.
- Tratamento adequado de colunas, imagens, tabelas, fórmulas e cabeçalhos, preservando acesso à representação original quando não houver conversão confiável.
- OCR sob demanda para páginas selecionadas e processamento ampliado quando solicitado.
- Cancelamento, progresso real, cache versionado e proteção contra travamento da interface.
- Preservação do original; texto reconhecido deve manter sua origem identificável.

Não use OCR automaticamente em toda a biblioteca. Não substitua texto ilegível por conteúdo inventado. Confira compatibilidade, manutenção e licença das dependências escolhidas.

Crie uma indicação de qualidade do Reflow com páginas problemáticas e acesso direto ao original. Diferencie sinais automáticos de falha de verificação efetiva. Contagens de caracteres, por si só, não demonstram integridade nem justificam anunciar “100% correto”.

## 10. Estatísticas e metas opcionais

Implemente tempo de leitura, atividade por período, livros concluídos, ritmo e estimativas quando houver dados suficientes.

- Diferencie leitura visual e escuta.
- Evite contabilizar inatividade, tela em segundo plano ou simples saltos de páginas como leitura.
- Permita metas opcionais e ajustáveis.
- Não imponha sequências diárias nem mensagens de cobrança.
- Explique quando um valor é estimado e permita desativar o acompanhamento.

## 11. Funcionalidades para diferenciar o app

Implemente versões funcionais destas ideias sobre as bases anteriores:

A. Integridade do Reflow por página:
identificação de problemas conhecidos, consulta do trecho fonte e recuperação localizada, sem falsa garantia de completude.

B. Perfis de reparo de PDFs:
configurações declarativas por documento/edição para margens, colunas, cabeçalhos e correções justificadas. Inclua prévia, reversão, exportação e importação. Valide os perfis; não execute código recebido de terceiros. Adicione compartilhamento comunitário quando houver infraestrutura configurada, mantendo seu estado real documentado.

C. Releituras com camadas de anotações:
separe rodadas de leitura, preserve notas anteriores, permita ocultá-las e compare interpretações vinculadas ao mesmo trecho.

D. Leitura paralela:
abra duas obras, traduções ou representações lado a lado em telas adequadas. Cada painel deve preservar sua posição e anotações. Sincronize a navegação apenas quando existir correspondência confiável ou controle explícito do usuário.

## 12. Retomada e contexto do livro

Implemente resumo de retomada e consulta de personagens, lugares ou conceitos com referência aos trechos utilizados.

- Limite o contexto ao material autorizado pelo progresso de leitura.
- Considere consultas temporárias e capítulos não lidos.
- Prefira uma primeira versão local verificável quando possível.
- Recursos de IA generativa devem ser opcionais, com configuração explícita e comportamento claro quando indisponíveis.
- Não envie automaticamente livros inteiros a serviços externos.
- Não prometa ausência absoluta de spoilers ou erros de geração; forneça fontes e permita conferir o texto.
- Não apresente respostas fixas ou demonstrativas como análise real do livro.

## 13. Validação e critérios de conclusão

Execute os scripts existentes no package.json e verificações aplicáveis. No ambiente Windows, os comandos registrados incluem npm.cmd run typecheck, npm.cmd run export:web e git diff --check. Não invente scripts de lint/build que não existem.

Adicione testes relevantes para localização, persistência, importação/restauração, conflitos de sincronização e correspondência Original/Reflow.

Faça verificações funcionais com livros reais:

- EPUB em posição intermediária: abrir controles, pesquisar, consultar e retornar.
- Fechar/reabrir em posições baixas, intermediárias e próximas do fim.
- Alterar fonte, tema, margens e orientação sem perder o trecho.
- Criar, editar, excluir e recuperar notas; exportar/importar e restaurar backup.
- Ler offline e depois sincronizar entre duas instâncias.
- Alternar PDF Original/Reflow e conferir os trechos correspondentes.
- Exercitar PDF legível, texto extraído corrompido, scan, colunas e página dupla.
- Validar TTS, OCR, cancelamento e Android físico quando disponível.

Use os livros de controle documentados, quando estiverem presentes, incluindo O Banquete, Sobre o Ócio, Manifesto Comunista e Sociedade do Espetáculo. Diferencie os resultados por livro e plataforma.

Build aprovada não prova comportamento funcional. Se não houver acesso ao aparelho ou serviço, informe “validação pendente”, com procedimento reproduzível; não declare sucesso.

## 14. Entrega e continuidade

Ao finalizar cada etapa, registre:

1. O que foi implementado e o resultado para o usuário.
2. Arquivos alterados e migrações necessárias.
3. Validações realizadas, resultados e limitações.
4. Pendências e dependências externas reais.
5. Necessidade de recompilar/reinstalar e comandos correspondentes.

Não deixe botões de produção sem ação real nem marque uma função como concluída apenas porque sua interface foi criada.

Se a execução precisar continuar em outra sessão, deixe ROADMAP_FUNCIONALIDADES.md e PROJECT_CONTEXT.md com estado suficiente para retomar sem repetir trabalho. Prossiga autonomamente no que já está autorizado e executável; solicite somente informações indispensáveis que não possam ser obtidas do repositório.

Comece agora pela auditoria do código, verificação dos problemas atuais e organização das dependências; em seguida, avance pela implementação das etapas.

