# Log de 06/11/2026 (movido do PROJECT_CONTEXT.md §10, sem edição)

### 06/11/2026 — Onboarding 2: auditoria somente leitura + reescrita do contexto (Claude)
- IMPLEMENTADO (só docs): `PROJECT_CONTEXT.md` reescrito (matriz de recursos §5 com evidência; mapa §6 conferido no disco; regras §9);
  novos `docs/context/referencias/` com os dois handoffs do ChatGPT (copiados do `aldus-context.zip` untracked), a síntese verificada
  `bugs-epub-center-reset-e-restore.md` e `requisitos-flashcards-batalha-geracao.md` (requisito/proposta × código); log anterior de 06/11 movido
  para `historico/2026-11-06-ux-fechamento-e-onboarding-1.md`; AGENTS.md/README/skills alinhados à numeração `§`.
- VALIDADO: `typecheck` PASS; `test:critical` 87/87 PASS; `node scripts/validate-ai-instructions.cjs` e `git diff --check` (ver comandos na resposta).
  NÃO executado: export, Chromium, Android, Supabase.
- Achados: (a) `BUG_CONTEXT_EPUB_*`, `CONTEXTO_FLASHCARDS*`, `PROMPTS_REVISAO*`, `Prompt_Codex_App_Leitura_Completo`,
  `PROMPT_INTEGRACAO_FLASHCARDS*` foram apagados em `7f50a90` (recuperáveis em `7f50a90^`); (b) ausentes em qualquer lugar: `Pesquisa_Apps_Leitura_2026-10-05.md`,
  `Prompt_Codex_Modo_Viagem.md`, `PROPOSTA_FONTES_DE_LIVROS.md`; (c) "progress restore" original era PDF Reflow; (d) o reset do toque central só foi
  reproduzido/corrigido no Reflow; (e) geração local de flashcards usa pergunta fixa; (f) "Modo Viagem" não existe no código.
- Pós-registro: usuário confirmou que o reset do toque central já está resolvido (BUGS_ATUAIS.md e referencias atualizados). Aguardar pedido do usuário (§8).
