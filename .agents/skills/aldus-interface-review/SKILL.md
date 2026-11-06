---
name: aldus-interface-review
description: "Evoluir e revisar a interface Aldus em pt-BR, temas, responsividade e acessibilidade, preservando a geometria do Reader e a arquitetura existente."
---

# Interface literária e consistente

Leia o [contexto](../../../PROJECT_CONTEXT.md) (estado da reformulação UX/UI e árvore suja), a tela real
e o tema em uso. Identifique alterações locais ainda não concluídas antes de reutilizar
componentes. A existência de um arquivo não comprova que ele está integrado ou validado.

- Use a paleta/tokens/componentes existentes. Não introduza fonte nativa, NativeWind novo,
  biblioteca de UI ou refatoração ampla para reproduzir uma referência visual.
- DesignIdeas é inspiração local: observe conceitos e implemente na arquitetura oficial.
  Não faça merge/cherry-pick em massa do bundle nem exija seus arquivos para compilar.
- Preserve visual sóbrio, editorial e legível. pt-BR deve ter acentuação, ação concreta e
  termos que o usuário entende. Detalhes técnicos/JSON ficam em ferramentas avançadas.
- Auth, perfil ativo, permissões e dados reais continuam decididos pelos contratos existentes.
  Interface não fabrica plano/métrica/atividade para preencher espaços vazios.
- Controles de toque têm área mínima existente de 44px, rótulos e estado acessíveis.
  Confira teclado/Enter/foco na Web, leitor de tela quando disponível e contraste nos temas.
- Teste reflow da UI em larguras 320/390/768/1440, claro/escuro e texto aumentado quando
  a mudança afetar layout. Conteúdo/ações de saída não podem ficar inacessíveis ou sobrepostos.
- Tabs Web e telas gerais podem responder à largura; o Reader preserva viewport/ancestralidade
  e geometria próprias. Não amplie sua área junto de um redesenho do shell sem escopo específico.
- Estado de gravação, erro e retry devem preservar rascunho/seleção quando apropriado.
  Excluir mantém confirmação; saída e ações principais permanecem alcançáveis.

Ao editar vários TSX, revise hooks/cleanup, dependências de efeitos, closures obsoletas,
cancelamento/epoch, keys estáveis, estados vazios/erro/loading e ausência de efeitos de
persistência disparados só por render. Se a skill React oficial estiver disponível,
aplique sua revisão pertinente sem torná-la dependência de outra máquina.

Escolha testes de componente e browser pela tela usando
[aldus-validation](../aldus-validation/SKILL.md). Inspecione as capturas geradas. Registre
se o resultado é componente controlado, aplicativo exportado ou preview autenticado.
Escala CSS e clique DOM não comprovam fonte do sistema, TalkBack ou toque Android.
