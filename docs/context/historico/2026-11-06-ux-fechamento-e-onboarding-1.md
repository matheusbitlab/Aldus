# Log de 06/11/2026 (movido do PROJECT_CONTEXT.md §8, sem edição)

### 06/11/2026 — Fechamento do código UX/UI pendente
- IMPLEMENTADO (herdado do Codex, revisado): paleta terrosa com `onAccent`, tabs Biblioteca/Estudo/Explorar/Conta com altura/área segura,
  títulos `appUi`, seções planas (Ajustes, Plano, Admin, Community), Estudo com "Mais ferramentas", moldura de celular só no Reader (Web).
- VALIDADO: ver §3 (typecheck, 87/87, export, 8 suítes Chromium). Commits d6ef9c7, ea0b1ec, f970c2d. Revisei o diff completo; sem mudança de Reader engine, banco, Sync ou Auth.
- NÃO TESTADO: Android físico/emulador, tabs em captura, TalkBack, preview/APK novos.

### 06/11/2026 — Onboarding: análise ponta a ponta e reorganização do contexto
- Contexto reescrito (≈250 linhas); texto original dividido, sem reescrita, em `docs/context/*.md` e
  `docs/context/historico/*`. AGENTS.md, README e skills atualizados para a nova organização.
- Divergências achadas: (a) a divisão em `docs/context/` descrita no pedido **não existia** no checkout
  (PROJECT_CONTEXT tinha 2192 linhas e não havia `docs/`); (b) matriz crítica é 87 suítes, não 86 (por `app-design`,
  não commitado); (c) a seção 15 antiga cita versionCode=1/versionName 1.0.0, mas app.json é 1.0.0-beta.2/code 3;
  (d) contagens "57/57…86/86" nas seções antigas são snapshots datados; (e) o registro 27/10 parte de d5f0d86, o HEAD é 60b50c2
  (já contém Library/Sources/AppUi); (f) todos os caminhos de arquivo citados no texto antigo existem, salvo o APK debug
  gerado em `android/app/build/outputs/…` (artefato ignorado); (g) Community remota não existe no código, conforme o texto.
- Validação executada: typecheck PASS; test:critical 86/87 (única falha: `legal`, que exige "Batalha…Supabase" no PROJECT_CONTEXT.md; corrigido no texto e `node scripts/test-legal.cjs` passou isolado; matriz completa não reexecutada). Sem export (não solicitado), sem Android/Supabase.
- Commit só de documentação: não inclui o código modificado herdado (§3).
