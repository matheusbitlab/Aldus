# Roadmap funcional — atualizado em 2026-10-06

Estados: **implementado** = caminho conectado no código; **aprovado** = teste indicado passou; **pendente** = validação ou implementação ainda necessária; **bloqueado** = dependência externa identificada. Export Web não valida Android.

## Inventário e sequência

| Etapa | Estado atual | Dependência / próxima ação |
|---|---|---|
| 1. Auditoria e continuidade | ✅ Contextos/diffs auditados; trabalho anterior preservado; checkpoints registrados | Manter contexto e evidências atualizados |
| 2. Estabilidade EPUB/PDF | 🟡 Reset EPUB aberto; drift de reabertura EPUB observado; Reflow Web reabriu 5/27/52 de 54 corretamente; safe area Android pendente | Capturar primeira escrita incorreta no cenário real; não corrigir por hipótese |
| 3. Posições duráveis e estudo | ✅ EPUB Web: marcadores, notas, seleção, cores, comentários, CRUD, reaplicação e export/import transacional. 🧪 Native. 🟡 Etapa geral | Validar Native; investigar progresso EPUB; estudo Reflow/mapeamento PDF ainda ausentes |
| 4. Aparência e navegação | 🟡 Global/Papel existentes; fonte CSS Sem serifa corrigida e validada Web; brilho Native com lacunas de lifecycle | AppState/races do brilho, overrides EPUB, perfis, histórico e notas de rodapé |
| 5. Biblioteca e backup | ✅ Organização Web, metadados, favoritos, coleções/tags, série/volume, Interrompido e restore idempotente. 🟡 Backup | Backup completo de arquivos/progresso/estudo/configurações e offline real ainda pendentes |
| 6. Sincronização | ⬜ Ausente; ⚠️ servidor/credenciais não configurados | Preparar fila/versionamento e protocolo; troca externa depende de infraestrutura |
| 7. Vocabulário e TTS | ⬜ Não iniciado | Âncoras/seleção; fonte licenciada de dicionário; motor TTS por plataforma |
| 8. PDF híbrido e OCR | 🟡 Original/Reflow/cache/qualidade existentes; correspondência fina e OCR ausentes | Mapeamento de blocos; testes por livro; dependência OCR compatível/licenciada |
| 9. Estatísticas/metas | ⬜ Não iniciado | Sessões reais, foreground/inatividade e distinção escuta/leitura |
| 10. Reparos/camadas/paralelo | ⬜ Não iniciado | Âncoras e mapeamento; perfis declarativos validados |
| 11. Retomada local | ⬜ Não iniciado | Progresso durável, trechos reais e limites de consulta |

## Evidências recebidas, preservadas

- Typecheck, export Web, catálogos e motion cues aprovados na continuação anterior: detalhes em PROJECT_CONTEXT.md e COPILOT_CONTINUATION_AUDIT.md.
- Chrome isolado: 34 livros iniciais; importação EPUB real, catálogo JSON CRUD/persistência, temas e luminosidade aprovados. Gutendex UI externa inconclusiva por timeout; aquisição Gutenberg Web sem CORS aprovado.
- Livro recebido Sobre o Ócio: completude melhorada anteriormente; isso não comprova qualidade de todos os PDFs. Manifesto/Sociedade têm limitações próprias documentadas.
- Android físico/emulador não validado. Não declarar problemas de restauração/safe area/brilho/sensores resolvidos.

## Build Android

Mudanças somente TS/JS/estilos: Metro/Fast Refresh, sem novo módulo nativo. Dependências recebidas expo-sensors e expo-brightness exigem APK novo se não estão na instalação atual. Nenhuma build nesta entrega até registro explícito.

Comando existente: `npm.cmd run build:apk` (EAS, perfil preview). Instalação preservando dados: `adb install -r caminho\app.apk`. Não desinstalar para atualizar. Conta EAS/artefato e aparelho acessível são necessários para validar instalação. Qualquer nova alteração nativa será anunciada antes de sua execução.

## Checkpoint de retomada — 2026-10-06

Estados desta retomada: ✅ IMPLEMENTADO E VALIDADO; 🧪 IMPLEMENTADO — AGUARDANDO VALIDAÇÃO; 🟡 PARCIAL; ⬜ NÃO INICIADO; ⚠️ BLOQUEADO.

- 🧪 Organização: UI/persistência e backup V1 já recebidos; testes de domínio PASS nesta retomada, confirmação Web real ainda em andamento.
- 🟡 Estudo (prioridade): marcadores, âncoras, grifos EPUB/comentários e IndexedDB estrito já conectados; import por item precisa proteção contra falha parcial; validação funcional em andamento. Reflow não expõe estudo e PDF Original oferece marcador por página, sem grifo textual.
- 🟡 Backup: organização e exports separados de marcadores/grifos V1. Backup completo de arquivos/progresso/configurações ainda ausente.
- 🧪 Aparência/brilho/sensores recebidos; sem device ADB. Android físico pendente, sem nova dependência nesta retomada.
- ⬜ Etapas 6–11 permanecem não iniciadas conforme inventário. Não avançar antes de CRUD/persistência/reabertura/export/import de estudo consistentes.
- EPUB reset continua ABERTO; resultados negativos em outro browser não comprovam correção. Não alterar navegação por hipótese.

Checkpoint 2: 🧪 importação de marcadores/grifos agora transacional em IndexedDB/SQLite, sem mudar schema; rollback/duplicatas/falhas aprovados em teste SQL e storage indisponível. 🧪 seleção bloqueia também rodapé/progresso, com erro visível e cancelamento de captura pendente. Baseline Web real de captura/marcador/arraste PASS; matriz final de persistência/reaplicação/export/import em andamento. Sem dependência Native nova.

Checkpoint 3: ✅ EPUB Web: CRUD de marcadores/grifos/comentários, seleção por arraste sem navegação, duas cores, reabertura/reaplicação visual, export/import/idempotência, fonte/tamanho/margens/largura e recusa explícita de âncora ambígua/ausente. ✅ IndexedDB real: commit confirmado/abort/rollback de quota e colisões. 🧪 Native: implementação SQLite testada com SQL real, ponte Expo/device não validada. 🟡 Etapa 3 completa ainda exige progresso durável e mapeamento/estudo Reflow/PDF; estes não foram anunciados como suporte pleno. EPUB restaura percentual com diferença 700→680 observada; investigação pendente, sem alteração de navegação.

## Bloqueios reais e validações pendentes

- Sincronização externa e compartilhamento comunitário: serviço/credenciais não configurados no repositório.
- Validação Android físico: depende de dispositivo conectado e APK compatível; conferir disponibilidade no início da validação.
- Biblioteca offline precisa de teste com rede desligada por plataforma; persistência local não é prova de offline.
- Nenhuma entrega de UI isolada será marcada como funcional sem persistência e teste correspondente.

## Auditoria dos chats anteriores — estado antes de novas features

- ✅ Estudo EPUB Web, organização Web, fontes JSON, busca concorrente e Reader visual Web validados funcionalmente.
- 🧪 Anti-enjoo, SQLite Native e brilho Native aguardam Android físico. O lifecycle do brilho foi corrigido nesta auditoria, mas apenas device confirma intensidade/restauração real.
- 🟡 Gutendex tem adapter/caso de uso e rede HTTP histórica; UI externa inconclusiva por timeout. OPDS/HTML continuam parciais.
- 📋 Flashcards, repetição espaçada, Anki, sincronização, nuvem, assinatura, billing, backend, autenticação, OCR em lote e backup completo continuam proposta/roadmap.
- EPUB reset segue ABERTO; não avançar novas features antes de capturar a primeira transição incorreta no cenário real.

## Integração Flashcards — 2026-10-06

- ✅ Núcleo local: contratos deck/cartão/origem, SM-2 adaptado, persistência AsyncStorage, revisão offline e aba Estudo integrada ao Kindle Reader.
- ✅ Geração local baseada em capítulos reais com prévia e aprovação explícita; grifo EPUB recuperável pode criar cartão vinculado ao livro/capítulo/trecho.
- 🟡 CRUD de cartões ainda precisa UI completa de edição/exclusão e exportação Anki; “Abrir origem” exato por âncora ainda pendente.
- 🧪 IA, sincronização, autenticação e perfil aguardam contrato API/credenciais/ambiente; não importar Prisma ou segredos para o cliente.
- ⚠️ Batalha do doador não pode ser integrada como ranking real enquanto o gateway aceitar `isCorrect` do cliente; exige gabarito objetivo validado pelo servidor, idempotência e recuperação de estado.
- 📋 Flashcards por livro completo em worker, OCR, cloud, assinatura, billing e limites comerciais permanecem roadmap.

## Fechamento desta retomada — 2026-10-06

Este fechamento prevalece sobre os checkpoints intermediários acima, preservados como histórico.

- ✅ Organização Web e restore real aprovados; políticas manter-local/usar-importado e repetição sem duplicata. Capa editada está no schema; sua edição visual não foi retestada nesta retomada.
- ✅ Estudo EPUB Web concluído nesta etapa. Exclusão de marcador/grifo persistiu após reabertura. Fonte real Georgia→system-ui, tamanho 16→24, margens 46→18 e largura 600→1200 aprovados; âncoras reencontraram texto visível. Dez toggles mantiveram iframe/srcDoc/página. Ambiguidade/ausência recusadas explicitamente.
- ✅ Importação de estudo confirma commit IndexedDB; falha de quota/colisão/abort desfaz lote inteiro. SQLite SQL/rollback aprovados com adapter Node; 🧪 ponte Expo/device pendente. Sem mudança de schema/migração.
- ✅ PDF Web: Sobre o Ócio Reflow texto/final, toggles e reabertura real nas páginas 5, 27 e 52/54. Original com canvas não branco e marcador por página fonte. Manifesto/Sociedade mantiveram fallback e renderizaram Original; explicação antes ausente no JSX foi recuperada.
- 🟡 Backup da organização V1 inclui metadados editados/favoritos/coleções/tags/série/volume/status. NÃO inclui arquivos/progresso/estudo/configurações. Marcadores+notas e grifos+comentários têm JSON separado por livro, além de Markdown/texto; não há pacote completo.
- 🟡 Brilho Native: código recebido sem AppState e com risco de apply assíncrono após cleanup; pendente correção de lifecycle e teste físico. Anti-enjoo/safe area Native também aguardam device. Nenhuma dependência/configuração Native modificada nesta retomada.
- EPUB reset: ABERTO / NÃO ALTERADO. Teste em Freud a partir de 700/1109 não reproduziu nesse cenário; restauração EPUB 700→680 foi observada e permanece aberta. Nenhum timeout/retry/compensação de page=1 acrescentado.
- Gates finais: typecheck, export:web, scripts de estudo/âncoras/organização/motion/catálogos PASS. Diff check final registrado em PROJECT_CONTEXT. Android físico: PENDENTE; ADB sem device. Delta TS/JS não exige APK novo com módulos existentes.
- Próxima prioridade: completar estabilidade/posições duráveis das etapas 2–3, começando pela primeira escrita incorreta na restauração EPUB; depois validar estudo Native e projetar suporte Reflow. Etapas posteriores não iniciadas por preferência de implementação.

## Ambiente remoto Supabase — 2026-10-06

- ✅ SDK já presente e cliente remoto preparado em `src/data/remote/supabase.ts`, com sessão persistente no `AsyncStorage`.
- ✅ `.env.local` configurado com as variáveis fornecidas e protegido pelo `.gitignore`; export Web confirmou o carregamento.
- 🟡 Supabase ainda não é sincronização: faltam schema/RLS, autenticação/troca de conta, mapeamento dos contratos de flashcards, idempotência/reconciliação e testes de duas sessões.
- ⚠️ Não copiar o exemplo Todo para o Expo Router. O Reader permanece o aplicativo principal e o armazenamento local continua a fonte offline até os contratos remotos serem aprovados.
- Android: nenhuma recompilação/reinstalação foi necessária nesta etapa; uma mudança futura de dependência Native será anunciada antes da execução.

## Autenticação, perfis e permissões — 2026-10-06

| Recurso | Estado | Evidência / falta |
|---|---|---|
| Login email, cadastro, recuperação e redefinição | 🧪 IMPLEMENTADO — AGUARDANDO CONFIG | Telas e APIs Supabase conectadas; migrations e email real pendentes |
| Login username | 🧪 IMPLEMENTADO — AGUARDANDO CONFIG | Edge Function preparada; implantação e teste real pendentes |
| Login Google Web/Android | 🧪 IMPLEMENTADO — AGUARDANDO CONFIG/DEVICE | OAuth PKCE/callback, scheme já existente; provider, secret rotacionado e device pendentes |
| Sessão, logout, AuthGuard e perfil | 🧪 IMPLEMENTADO — AGUARDANDO CONFIG | Provider/rotas/conta no código; perfil remoto ainda ausente |
| Roles, MASTER e TEST | 🧪 IMPLEMENTADO — AGUARDANDO CONFIG | Regra central e script admin; contas/UUIDs reais não provisionados |
| Controle de Flashcards | 🧪 IMPLEMENTADO — AGUARDANDO CONFIG | UI/rota/ações bloqueadas por override; teste local passou, MASTER/TEST reais pendentes |
| Profiles e override com RLS | 🟡 PARCIAL | Migrations preparadas, não aplicadas no remoto |
| RLS das seis tabelas legadas | ⚠️ BLOQUEADO | Security Advisor CRITICAL remoto; migration deny all preparada; requer SQL Editor/admin |
| Teste A/B e Security Advisor | ⚠️ BLOQUEADO | Precisa migrations, contas reais e acesso ao painel remoto |
| Android deep link e Play Store | 🧪 IMPLEMENTADO — AGUARDANDO DEVICE | `kindlereader`, `com.kindle.reader` já no app/Manifest; SHA-1 da keystore real e Play Signing pendentes |

Auditoria, matriz, migrations, limites e passos externos: `AUTH_IMPLEMENTATION.md`. Nenhum valor de secret foi registrado. O reset EPUB permanece ABERTO. Sem alteração Native nova; não houve APK/reinstalação nesta etapa.
