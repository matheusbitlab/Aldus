---
name: aldus-project-continuity
description: "Iniciar, retomar ou encerrar trabalho no Aldus Reader, recuperando contexto e preservando alterações locais. Use também após interrupção ou compactação e em pedidos de continuidade."
---

# Continuidade do Aldus Reader

## Recuperar o ponto de trabalho

1. Localize a raiz real do checkout e leia seu [AGENTS.md](../../../AGENTS.md).
   Não clone por cima nem troque de branch para coincidir com um registro antigo.
2. Execute `node scripts/ai-project-preflight.cjs`, a partir da raiz. A opção `--json`
   facilita inspeção estruturada. Fora da raiz, use o caminho absoluto do script.
3. Leia [PROJECT_CONTEXT.md](../../../PROJECT_CONTEXT.md) inteiro (protocolo, estado, matriz de recursos §5, mapa §6,
   pendências, regras, log). Abra só os módulos de `docs/context/` que o mapa indicar, por seção
   (`rg -n '^#{1,3} ' docs/context/*.md`). Bugs exigem também a entrada em
   [BUGS_ATUAIS.md](../../../BUGS_ATUAIS.md). Não carregue o histórico alheio à tarefa. `docs/context/referencias/` guarda handoffs de outras
   IAs e requisitos: são hipótese/requisito, nunca prova de implementação.
4. Confronte isso com pedido atual, `git log -5 --oneline`, `git diff --stat` e diferenças
   dos arquivos pertinentes, inclusive staged. Arquivos não versionados podem ser trabalho
   válido. Um registro antigo pode dizer pendente mesmo após uma seção posterior encerrar o item.
5. Estabeleça objetivo, aceite observável, revisão/plataforma a verificar e limites do
   pedido. Se o usuário disser apenas “continue”, retome o último passo autorizado ainda
   pendente. Não escolha uma feature do roadmap nem reaplique operações concluídas.

## Executar e registrar

- Use o [mapa de navegação](references/project-map.md) para achar módulos; confirme os
  nomes no checkout. Carregue apenas as skills necessárias, usando o catálogo do AGENTS.
- Se dependências já existem, não execute `npm ci` por hábito: ele reconstrói node_modules.
  Em checkout novo, siga o README/lockfile; não copie `.expo` ou credenciais de outro usuário.
- Reproduza bugs e localize a primeira divergência antes de corrigir. Distinga erro do
  harness, ambiente e aplicativo. Altere o menor caminho que resolve a causa e preserve
  as invariantes do domínio. Valide conforme [aldus-validation](../aldus-validation/SKILL.md).
- Mantenha o usuário informado sobre achados e próximos passos; não interrompa trabalho
  autorizado com pedidos repetidos de confirmação. Se faltar acesso, prepare a parte
  local/revisável e registre precisamente a dependência externa.
- Se código mudar durante a validação, identifique a nova revisão/diff antes de atribuir
  um resultado. Não incorpore alterações simultâneas de outra sessão por acidente.

## Passar o trabalho adiante

Use o [modelo de registro](references/session-record.md) nos dois documentos oficiais,
conforme a natureza da mudança. Atualize somente fatos atingidos pela tarefa e preserve
o texto preexistente. Não gere um terceiro documento de status.

Antes de concluir, confira `git status --short`, `git diff --check` e a diferença dos
seus arquivos. Registre testes com escopo e limitação, caminhos regeneráveis das evidências,
próximo passo executável e autorizações ainda necessárias. Para publicação solicitada,
revise os caminhos/hunks staged antes de commit/push; não inclua trabalho alheio.

Se a sessão acabar no meio, deixe explícitos operação em andamento, comando/processo,
último resultado confirmado e primeiro passo seguro. Não registre segredo ou processo
como concluído somente porque ele foi iniciado.
