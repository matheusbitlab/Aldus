---
name: aldus-community
description: "Trabalhar na Community literária do Aldus, preservando privacidade, métricas verificáveis, dados por conta e a distinção entre recursos locais e publicação social real."
---

# Community: privacidade e dados com origem

Leia o [contexto](../../../PROJECT_CONTEXT.md) e o módulo
[community-estudo](../../../docs/context/community-estudo.md) (Community e comunidade futura). Inspecione `src/community/`, o provider, adapter
de leitura e repositório usados atualmente; não suponha backend remoto só porque há migration.

- Preserve domínio/application independentes de Supabase e Auth na borda. Use os contratos
  existentes, sem acoplar a Library ao modelo social ou criar outra biblioteca.
- `LocalCommunityRepository` é por conta, com revisão e serialização existentes. Escrita
  entre abas Web depende do contrato Web Locks; erro/corrupção preserva dados, sem reset automático.
  Provider não pode exibir resultado de identidade anterior, inclusive A→B→A.
- Legacy reading source é somente leitura/DEVICE e inclusão opt-in desligada por padrão.
  Library por conta não transforma legado em histórico medido ou evento dessa identidade.
- NÃO INVENTAR DADOS: ausência é `null`. Última página não mede páginas lidas; última
  abertura não mede sessão; interrompido não significa abandonado. Não deduza gênero,
  tempo, streak, data de conclusão ou totais anuais sem fonte confiável.
- Eventos de progressão usam chaves semânticas idempotentes. Refresh/toggle não concede
  pontos outra vez; releitura exige identidade de evento, não UUID criado pela UI.
- Perfil privado por padrão. FOLLOWERS falha fechado sem relação verificada. PUBLIC local
  é prévia, não rede publicada. Respeite spoilers e revelação voluntária no contrato existente.
- Empty states não são usuários/posts/clubes reais. Não fabrique conteúdo ou abra a próxima
  etapa social por ela estar no roadmap. Estatísticas novas exigem instrumentação explícita.
- Social graph, autoria/moderação e XP remoto exigem autoridade no servidor; XP local
  não é dado confiável para publicação. Não envie livros ou atividade privada por padrão.

Se a tarefa exigir contrato remoto, use
[aldus-backend-operations](../aldus-backend-operations/SKILL.md) e confirme inventário e
autorização antes de mutação. Migration criada/testada localmente não autoriza sua aplicação.

Valide as suítes `test-community-domain.cjs`, `test-community-data.cjs`,
`test-community-provider.cjs`, `test-community-ui.cjs` e `test-community-schema.cjs`
pertinentes, incluídas na matriz crítica. Acrescente cenário observável de conta A/B,
ausência de métricas e privacidade para o comportamento alterado. Diferencie persistência
local, UI controlada e publicação/autorização gerenciada nas evidências.
