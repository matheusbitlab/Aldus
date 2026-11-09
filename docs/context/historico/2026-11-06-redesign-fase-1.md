# Log de 06/11/2026 (movido do PROJECT_CONTEXT.md §10, sem edição)

### 06/11/2026 — Redesign Fase 1: fundação do design system (Claude)
- Decisões do usuário: redesign do zero (bundle de 23/10 só como inspiração), editorial calmo, fontes em aba Descobrir + "+" na Biblioteca,
  acervo em sessão separada (3 etapas sem perda; nuvem privada aprovada). Registradas em `docs/context/design-system.md`.
- IMPLEMENTADO: `src/ui/` (tokens de espaço/raio/tipografia com 9 papéis, primitivos `AppText`, `Button`, `IconButton`, `Chip`, `ListGroup`/`ListRow`,
  `Screen`/`ScreenHeader`/`Section`, `EmptyState`, `ActionMenu`, `SearchField`); paleta com `accentSoft`, `danger`, `onDanger`, `success`, `focus`.
  Nenhuma tela migrada ainda (comportamento do app inalterado).
- VALIDADO: `typecheck` PASS; `test:critical` 88/88 (nova `ui-primitives`; `app-design` ampliada); `export:web` PASS; `git diff --check` PASS.
  NÃO TESTADO: Chromium, Android, captura visual (primitivos ainda sem uso em telas).
- Próximo passo: Fase 2 (navegação + aba Descobrir).
