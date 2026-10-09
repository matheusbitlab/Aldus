# ESTADO ATUAL PÓS-INTERRUPÇÕES

> CHECKPOINT INICIAL DA AUDITORIA — 08/10/2026. Este arquivo registra somente o estado observado até a coleta inicial; a auditoria continua abaixo e será atualizada progressivamente.

## 1. Git / Workspace — checkpoint

- Branch: `master`
- HEAD: `77c490c build: add native Android project and local release APK command`
- Commits anteriores imediatos: `de56b95 feat: consolidate reader, library, study and authentication features`; `f454d43 Initial commit`.
- Alterações rastreadas já existentes: `PROJECT_CONTEXT.md`, `ROADMAP_FUNCIONALIDADES.md`, `app/(tabs)/study.tsx`, `app/_layout.tsx`, `app/auth/login.tsx`, `app/auth/signup.tsx`, `app/study/[deckId].tsx`, `scripts/test-auth.cjs`, `src/data/local/FlashcardRepository.ts`, `src/data/remote/authService.ts`, `src/domain/types/flashcards.ts`, `src/presentation/components/AuthGuard.tsx`, `src/presentation/components/StudyHighlightsPanel.tsx`, `src/presentation/contexts/AuthContext.tsx`.
- Arquivos não rastreados observados: `CONTEXTO_FLASHCARDS.md`, `DIAGNOSTICO_BUGS_APK.md`, `scripts/test-auth-flows.cjs`, `scripts/test-flashcard-scoring.cjs`, `src/data/remote/authErrors.ts`, `src/domain/study/flashcardScoring.ts`, `src/presentation/components/flashcards/`, `src/utils/authDiagnostics.ts`.
- Estatística do diff no início: 14 arquivos rastreados, `+1284/-87`; não havia arquivo staged reportado.
- Nenhum `reset`, `clean`, `checkout`, `restore` ou `stash` foi executado.

## 2. Estado Auth observado — checkpoint

O diff atual mostra trabalho específico nos BUGS 5 e 6: login por email passou a separar a operação de autenticação da navegação; cadastro passou a preservar categorias de erro; foram adicionados `operationId`, diagnósticos e tratamento de erros sanitizado. `AuthContext` e `AuthGuard` também receberam instrumentação e resolução/cache de perfil. Isso comprova alteração de código, mas não comprova fluxo funcional no APK.

- BUG 5: `IMPLEMENTADO / NÃO TESTADO` quanto ao fluxo real; a causa do relato original permanece `INCONCLUSIVA` sem evidência física de timeline.
- BUG 6: `IMPLEMENTADO / NÃO TESTADO` quanto ao backend/policy efetivos; o cliente valida senha mínima de 8 caracteres e confirmação, mas a rejeição remota real permanece `INCONCLUSIVA`.
- A auditoria não corrigirá, completará ou removerá esse trabalho.

## 2. Resumo executivo

| Área | Estado atual | Confiança | Evidência |
|---|---|---|---|
| Auth BUG 5 | IMPLEMENTADO / NÃO TESTADO em conta real e APK | Alta | Diff de login, testes controlados, sem device |
| Auth BUG 6 | IMPLEMENTADO / NÃO TESTADO no backend real | Alta | Diff de signup, categorias preservadas, policy remota não acessível |
| Bugs 1–4, 7–9 | NÃO ALTERADO nesta interrupção; estados funcionais seguem conforme baseline | Alta | Diff não toca os fluxos correspondentes; diagnóstico baseline |
| BUG 10 anti-enjoo | IMPLEMENTADO / NÃO TESTADO fisicamente | Alta | `DeviceMotion`, testes sintéticos; sem APK/device |
| Migrations Auth | IMPLEMENTADAS localmente / NÃO APLICADAS | Alta | Dois arquivos SQL locais; documentação afirma ausência de aplicação remota |
| Flashcards | FORA DO ESCOPO | Alta | Instrução explícita desta auditoria |

## 3. Trabalho Auth encontrado

### BUG 5 — login email mostra erro e permite entrada

- O que existe: `login.tsx` cria `operationId`, chama `loginWithIdentifier`, registra resultado sanitizado e trata `router.replace` separadamente após o sucesso Auth.
- O que foi alterado: `authService.ts`, `AuthContext.tsx`, `AuthGuard.tsx`, `authErrors.ts`, `authDiagnostics.ts`, teste controlado e documentação.
- Completo: separação lógica entre erro de credencial e erro de navegação; sessão/perfil continuam necessários para liberar rota; diagnósticos opt-in.
- Parcial: a sequência do APK relatada pelo usuário não foi capturada; não há conta real/aparelho nem timeline Auth/Postgres.
- Instrumentação: `operationId`, `AUTH_EVENT`, `SIGN_IN_RESULT`, `PROFILE_RESOLUTION`, `AUTH_GUARD_DECISION`, `LOGIN_UI_RESULT`; desligada por padrão e com serialização sanitizada.
- Testes: `node scripts/test-auth-flows.cjs` PASS; `node scripts/test-auth.cjs --auth-only` PASS; typecheck PASS.
- Validação real: tentativa remota inválida sem sessão, conforme documentação; login válido e APK NÃO TESTADOS.
- Estado final: **IMPLEMENTADO / NÃO TESTADO**; causa do incidente original **INCONCLUSIVA**.

### BUG 6 — cadastro rejeita senhas

- O que existe: validação local de username/email/senha mínima de 8 caracteres/confirmação; `registerAccount` preserva code/status e categoriza erro sem expor detalhe privado.
- O que foi alterado: `signup.tsx`, `authService.ts`, `authErrors.ts`, diagnósticos e testes controlados.
- Completo: erros locais e respostas controladas chegam a mensagens distintas; dados válidos alcançam confirmação sem liberar acesso.
- Parcial: policy, trigger, constraint, grants e entrega de email efetivos não foram verificados remotamente.
- Instrumentação: `SIGNUP_STARTED`, `SUPABASE_SIGNUP_RESULT`, `SIGNUP_UI_RESULT`, com comprimento de senha e flags, sem senha/detalhe bruto.
- Testes: `node scripts/test-auth-flows.cjs` PASS; typecheck PASS.
- Validação real: cadastro com conta real, email entregue e rejeição no APK NÃO TESTADOS.
- Estado final: **IMPLEMENTADO / NÃO TESTADO**; causa da rejeição **INCONCLUSIVA**.

## 4. Outros bugs do diagnóstico

| Bug | Estado no diagnóstico | Estado atual | Mudou? | Evidência |
|---|---|---|---|---|
| 1 Reflow/texto corrompido | CONFIRMADA | NÃO ALTERADO | Não | Diff atual não toca extração/Reflow |
| 2 Safe Area | CONFIRMADA | IMPLEMENTADO / NÃO TESTADO fisicamente | Não nesta auditoria | Baseline e docs; sem device |
| 3 Header sem interação | INCONCLUSIVO | INCONCLUSIVO | Não | Nenhuma alteração correspondente |
| 4 Google Login | FORTE EVIDÊNCIA | INCONCLUSIVO | Não | Provider/configuração externa não alterados |
| 5 Login email | INCONCLUSIVO | IMPLEMENTADO / NÃO TESTADO | Sim | Seção Auth acima |
| 6 Signup/senha | INCONCLUSIVO | IMPLEMENTADO / NÃO TESTADO | Sim | Seção Auth acima |
| 7 Recuperação | INCONCLUSIVO | INCONCLUSIVO | Não | Recovery não alterado |
| 8 Reflow 98–100% | INCONCLUSIVO | INCONCLUSIVO | Não | Sem correção nesta interrupção |
| 9 Sources/indexação | INCONCLUSIVO | INCONCLUSIVO | Não | Sem alteração de Sources |

## 5. BUG 10 — Anti-enjoo

- Implementação atual: controle manual, preferência persistente e overlay de pontos nas bordas isolado da árvore documental.
- Sensor: `DeviceMotion` de `expo-sensors` (`expo-sensors@~57.0.3`), com processamento de aceleração linear, orientação, suavização, limites e watchdog.
- Arquivos: `src/presentation/motion/{processing,sensor,session,useMotionCues}.ts`, `MotionCuesControl.tsx`, `MotionCuesOverlay.tsx`, integração em `ReaderScreen` e dependências/configuração já existentes.
- Alterações recentes: a implementação está documentada como anterior; não foi modificada pela alteração Auth atual.
- Testes: `node scripts/test-motion-cues.cjs` PASS (sinais sintéticos, eixos, smoothing, cancelamento, cleanup, watchdog e isolamento).
- Validação física: inexistente; ADB/device não disponível na evidência consultada. Redmi Note 13 Pro não foi validado.
- Estado: **IMPLEMENTADO / NÃO TESTADO** fisicamente; conforto e aquisição real permanecem **INCONCLUSIVOS**.

## 6. Código possivelmente interrompido

- Arquivo: `src/utils/authDiagnostics.ts`; funções de correlação/diagnóstico. Motivo: instrumentação criada para captura posterior em aparelho. Estado: **IMPLEMENTADO / NÃO TESTADO**; risco: baixo quando desligada, mas deve ser reavaliada após captura.
- Arquivos: `app/auth/login.tsx`, `app/auth/signup.tsx`, `src/data/remote/authService.ts`. Motivo: fase Auth documentada como correção controlada, com validação física pendente. Estado: **IMPLEMENTADO / NÃO TESTADO**; risco: comportamento remoto e timing real não cobertos.
- Arquivos: `supabase/migrations/202610060000_lock_legacy_public_tables.sql` e `202610060001_profiles_and_features.sql`. Motivo: SQL preparado sem evidência de aplicação. Estado: **IMPLEMENTADO localmente / PENDENTE remoto**; risco: o app não pode ser considerado integrado ao schema.
- Arquivos: `src/presentation/motion/*`. Motivo: implementação experimental depende de device e sensores. Estado: **IMPLEMENTADO / NÃO TESTADO**; risco: disponibilidade e sinais variam por hardware.
- Arquivos não rastreados de Flashcards e alterações de Study. Motivo: trabalho paralelo presente no workspace. Estado: **FORA DO ESCOPO**; não avaliado.

## 7. Instrumentação temporária encontrada

Existe instrumentação Auth opt-in baseada em `EXPO_PUBLIC_AUTH_DIAGNOSTICS`; os testes confirmam que permanece silenciosa por padrão e não serializa senha, token, email, mensagem privada ou sessão bruta. Há referências históricas a logs forenses do Reader em `PROJECT_CONTEXT.md`, documentadas como removidas ou protegidas por flags. Não removi nada.

## 8. Migrations e banco

Existem duas migrations locais relacionadas a Auth/perfis/RLS: lockdown das seis tabelas legadas e criação de `profiles`/`user_feature_overrides`. Também há scripts de auditoria/admin/teste em `supabase/`. A migration de perfis referencia `auth.users`, cria trigger `SECURITY DEFINER`, default `role='user'`, RLS e grants restritos. Não há evidência de aplicação remota; a documentação registra que o Security Advisor e o schema remoto ainda exigem ação administrativa. Nenhuma migration foi aplicada nesta auditoria.

## 9. Testes atuais

- `npm.cmd run typecheck`: **PASS**.
- `node scripts/test-auth-flows.cjs`: **PASS**; avisos de depreciação do `react-test-renderer` não causaram falha.
- `node scripts/test-auth.cjs --auth-only`: **PASS**.
- `node scripts/test-motion-cues.cjs`: **PASS**.
- `npm.cmd run export:web`: **PASS**, bundle Web com 2326 módulos e cópia dos livros. É gate de implementação, não prova funcional de Auth, APK ou Reader.
- `git diff --check`: **FAIL** por uma linha em branco extra no EOF de `src/domain/types/flashcards.ts`; também houve avisos normais de conversão LF→CRLF. Não corrigi, pois a instrução desta tarefa proíbe alterações fora deste relatório.

## 10. PROJECT_CONTEXT.md versus código

- Correto: o documento registra a fase Auth, os arquivos/fluxos alterados, testes controlados PASS, ausência de conta real/device, migrations não aplicadas e anti-enjoo físico pendente.
- Desatualizado: o texto contém checkpoints anteriores que dizem que Auth ainda seria a próxima implementação, embora seções posteriores já registrem a fase 1 concluída em código controlado.
- Desatualizado: há inventários históricos com quantidades de arquivos/módulos e estados anteriores ao diff atual; devem ser lidos como histórico, não como snapshot atual.
- Inconclusivo: referências de validação Web/Native e artefatos históricos não permitem afirmar estado runtime atual após as alterações presentes.

## 11. ROADMAP_FUNCIONALIDADES.md versus código

- Correto: BUGS 5/6 continuam parciais/inconclusivos no sentido funcional; migrations, conta real, RLS e device permanecem pendentes; anti-enjoo aguarda device.
- Desatualizado: o roadmap chama a fase Auth de “VALIDADO controlado” em pontos que podem ser lidos como conclusão do bug; o código/documentação mais precisa exige **IMPLEMENTADO / NÃO TESTADO** em conta real/APK.
- Desatualizado: contagens e referências a gates de retomadas anteriores não são um snapshot dos testes executados nesta auditoria.
- Inconclusivo: estados de features paralelas de Flashcards estão fora do escopo e não foram reconciliados.

## 12. O QUE PODE SER CONSIDERADO CONCLUÍDO

Somente a separação de erro de navegação no fluxo Auth, a preservação sanitizada de erros de signup, os contratos locais de Auth e os testes automatizados/controlados acima podem ser considerados concluídos como implementação/teste controlado. O teste sintético do anti-enjoo também passou.

## 13. O QUE NÃO PODE SER CONSIDERADO CONCLUÍDO

Login/cadastro reais no APK, policy/trigger/RLS remotos, Google, recovery, validação física do anti-enjoo, os bugs funcionais do diagnóstico, e qualquer migration aplicada remotamente. Build/export/typecheck não substituem essas provas.

## 14. TRABALHO PARCIAL QUE PRECISA SER DECIDIDO

Decidir se a próxima etapa será a captura controlada no aparelho para BUGS 5/6, a verificação administrativa das migrations/RLS, ou a validação física do BUG 10. O diagnóstico recomenda não fazer nova correção antes de obter a primeira evidência divergente.

## 15. PRÓXIMA AÇÃO RECOMENDADA

Gerar/instalar um APK atualizado em ambiente com Java/ADB e capturar, com uma conta Auth de teste, a timeline opt-in dos BUGS 5/6; em paralelo, verificar no painel Supabase a aplicação real das migrations sem assumir que os arquivos locais foram executados.

## Escopo explicitamente excluído

FLASHCARDS — AGUARDANDO PROJETO DE IMPLEMENTAÇÃO ESPECÍFICO.
