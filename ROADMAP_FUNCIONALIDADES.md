# Roadmap funcional — atualizado em 2026-10-11

## Google Drive / Fontes — terceira etapa em andamento

AUTH/CONEXÃO e LISTAGEM IMPLEMENTADOS, Drive mocks/pipeline/parsing/erros/cancel/source-specific PASS. Configuração externa PENDENTE; NÃO TESTADO COM CONTA REAL. Android AuthorizationClient/Web GIS sem segredo, drive.readonly. Download/import no próximo checkpoint desta etapa; roteiro GOOGLE_DRIVE_IMPLEMENTATION.md.

DRIVE — AUDITORIA concluída; BUSCA TOLERANTE compartilhada consolidada com extensões, Unicode e casos solicitados. Auth Drive/listagem/download em implementação; Google real NÃO TESTADO. Próxima etapa: BIBLIOTECA PERMANENTE POR FONTE, fora do escopo atual.


## OCR local de PDF — item 4

Estado: **🟡 IMPLEMENTADO NO CÓDIGO / ✅ GATES CONTROLADOS / 🧪 ANDROID REAL PENDENTE**.

- ✅ Auditoria global: baseline E/A, sem OCR oculto ou provider parcial.
- ✅ Android: `PdfRenderer` + ML Kit latino empacotado `16.0.1`; português; processamento página a página e local.
- ✅ Consentimento inequívoco antes da tarefa pesada; Original permanece disponível; Web informa indisponibilidade do OCR local.
- ✅ PDF misto preserva texto válido e reconhece apenas páginas necessárias; OCR insuficiente não vira Reflow.
- ✅ Estados semânticos, progresso por página, cancelamento por geração, descarte de callbacks tardios e cleanup.
- ✅ Cache v12 diferencia extração/OCR/híbrido, motor, versão, páginas e validação; não salva parcial.
- ✅ Banner Android estreito preserva o botão **Fechar**.
- ✅ Política/Resumo de Privacidade 0.2 e notas legais atualizados para conteúdo local e métricas técnicas possíveis do SDK.
- ✅ Testes controlados e cinco PDFs reais aprovados na classificação; Sociedade/Manifesto exigem OCR, os três PDFs textuais continuam sem OCR.
- 🧪 Pendente: compilar APK quando SDK 36/Build Tools 35 estiverem disponíveis/licenciados; validar OCR visual em Android real, offline, cancelamento durante tarefa, pouca memória, rotação e cache após relançamento.

## IMPORTAÇÃO — itens 2 e 6

Estado: **✅ IMPLEMENTADA / ✅ VALIDADA AUTOMATICAMENTE / ✅ BUILD WEB / 🧪 ANDROID FÍSICO PENDENTE**.

- ✅ EPUB e PDF locais têm lifecycle por `operationId`, fases explícitas, terminal único, UI de progresso/erro/sucesso e ações Abrir livro/Ir para Biblioteca.
- ✅ BUG — loading infinito: eliminado o estado booleano sem geração; operações antigas não sobrescrevem a atual, cancelamento não espera Promise nativa travada e aquisição remota cancelada não entra novamente por retry.
- ✅ Native trata `content://` e `file://` como origem: copia para `books/temp`, move para caminho próprio em `books/imported` e nunca apaga o original do usuário.
- ✅ Erro/cancelamento limpam temp/destino e registros/Blobs parciais; persistência de capítulos falha com rollback/soft-delete, sem livro fantasma conhecido.
- ✅ Download mostra percentual apenas com total de bytes confiável. Picker, cópia, validação, parser, metadados e persistência permanecem indeterminados com nome da etapa.
- ✅ Cancelamento disponível até a persistência; persistência/finalização são intencionalmente não canceláveis para não interromper commit no meio. Callback tardio é descartado por geração.
- ✅ Duplicidade deliberada permanece permitida; cada operação local/remota usa ID e caminho únicos, sem deduplicação agressiva nem sobrescrita acidental entre importações.
- ✅ Matriz automatizada de importação, regressão catálogo/download, typecheck e export Web passaram. Build Web validado; interface em navegador real não foi exercitada nesta rodada.
- 🧪 Android/emulador/aparelho físico, seletor SAF real, arquivo grande real, pouco espaço e encerramento do processo continuam pendentes. A chamada exata que ficou pendente nos celulares originais permanece inconclusiva sem captura física, embora o escape de estado terminal tenha sido corrigido.
- ↔️ Reader/Reflow, OCR, Auth, Sources/Search, Drive/Sync, Flashcards e Legal não foram alterados, salvo a tela de aquisição já existente como dependência direta do download/importação.

## AUTH / CONTA / SEGURANÇA — Etapa 3

Estado: **🟡 CÓDIGO E TESTES CONTROLADOS APROVADOS / REMOTO ADMINISTRATIVO E FLUXOS REAIS BLOQUEADOS**.

- ✅ Auditoria pública reproduzível: Auth saudável; email/Google habilitados; signup permitido; confirmação exigida; oito rotas privadas recusam `anon` com 401/42501 sem leitura de linhas.
- ✅ Inventário SQL read-only cobre tabelas, colunas/defaults, PK/FK/UNIQUE/CHECK, índices, RLS, policies, grants, triggers, `SECURITY DEFINER`, `search_path` e histórico de migrations.
- 🟡 Estado real de schema/RLS/migrations/triggers/policies continua **INCONCLUSIVO** sem SQL Editor/credencial administrativa. Nenhuma migration foi reaplicada ou alterada por hipótese.
- ✅ BUG 5 A–E, logout, guards, conta disabled, cache sem identidade/UUID divergente e offline do mesmo UUID passaram em testes controlados; login válido real/APK segue não testado.
- 🟡 BUG 6 classifica erros corretamente; signup real → `auth.users` → trigger → profile `user/active` → confirmação/email permanece não testado.
- 🟡 Google e recovery têm callback Aldus, parser, troca única e erros sanitizados aprovados localmente; Redirect URLs, provider/secret, Auth Logs, template e cadeias reais dependem do operador.
- ⚠️ `username-login` respondeu 404/`NOT_FOUND`; implantar/proteger a Edge Function antes de considerar login por username disponível.
- ✅ Contrato local não permite self-promotion nem escrita cliente em role/status/overrides; master amplia features, não privacidade de dados.
- 🧪 Roteiro transacional A×B/anon/autopromoção/override foi completado, mas contas MASTER/USER, override remoto, execução RLS, Security Advisor e testes funcionais completos ainda não foram executados.
- ↔️ Flashcards funcionais, Reader, Reflow, OCR, Sources, Search, Drive, sync, anti-enjoo e textos jurídicos não foram alterados.

## LEGAL, PRIVACIDADE E SOBRE — Etapa 2

Estado: **🟡 IMPLEMENTADO LOCALMENTE / REVISÃO JURÍDICA E VALIDAÇÃO OPERACIONAL PENDENTES**.

- ✅ Sete entradas em Ajustes: Sobre, Privacidade, Termos, Direitos Autorais, Licenças, resumo Privacidade e Dados e versão/build em runtime.
- ✅ Política de Privacidade e Termos públicos antes do login; Cadastro informa leitura sem consentimento genérico.
- ✅ Conteúdo baseado no fluxo real de dados locais, Supabase/Google, catálogos, WebViews, sensores, diagnósticos e batalha.
- ✅ Textos longos roláveis, retorno e temas claro/escuro validados no Web exportado; links externos conectados.
- ✅ Avisos gerados para 37 dependências diretas de runtime, com agrupamento, busca e verificação de desatualização.
- ✅ LGPD, Marco Civil e Direitos Autorais tratados como referências, sem alegação de conformidade definitiva.
- 🟡 Configurar controlador e contato validados via `EXPO_PUBLIC_LEGAL_CONTROLLER_NAME` e `EXPO_PUBLIC_LEGAL_CONTACT_EMAIL`.
- 🟡 Revisão jurídica: bases por finalidade, retenção, exclusão de conta, titulares, encarregado, menores, contratos e transferências.
- 🟡 Auditoria de licenças transitivas/nativas e teste visual em Android/iOS físico antes de publicação comercial.
- ↔️ OCR, Drive, sync, Reader/Reflow/Search/Sources, anti-enjoo, Flashcards e cobrança não tiveram comportamento alterado.

## IDENTIDADE / BRANDING — Aldus Reader

Estado: **🟡 IMPLEMENTADO E VALIDADO LOCALMENTE / CONFIGURAÇÃO EXTERNA PENDENTE**.

- ✅ Nome público atual: **Aldus Reader**; nome curto/Expo: **Aldus**; npm/slug: `aldus-reader`; Web name/title: **Aldus Reader**.
- ✅ Deep link/callback Native: `aldus://auth/callback`; recovery: `aldus://auth/callback?next=reset-password`.
- ✅ Android migrado de `com.kindle.reader` para `com.aldus.reader` em app config, Gradle, Kotlin, Manifest e manifesto mesclado, sem mistura entre packages.
- ✅ UI, Auth, User-Agent, origens sintéticas WebView, download de backup, testes e documentação operacional atual usam Aldus.
- ✅ Typecheck, Auth callback/recovery, integração de fonte, export Web, Expo config e merge do Manifest Android passaram localmente.
- 🟡 Supabase Redirect URLs, Google Cloud/Play package+SHA-1 e conferência do vínculo EAS ainda dependem do operador. Nenhuma configuração externa foi declarada como alterada.
- 🧪 Não testado: OAuth/recovery real, APK/AAB e instalação em aparelho sob o novo applicationId. O package novo não reutiliza automaticamente os dados privados do app Android antigo.
- ↔️ Compatibilidade preservada: chaves/bancos/formatos persistidos `kindle-*` e `@kindle/*`, caminhos locais e documentação histórica permanecem intencionalmente; não são a identidade pública atual.

## Prioridades vigentes — campanha Reader de 09/10/2026

Flashcards fora desta fase, trabalho anterior NÃO ALTERADO. Barra: disputa comprovada51→61→51; preview/commit único/comando explícito com ID/ACK sem reenvio/persistência confirmada IMPLEMENTADOS, gates EPUB/Reflow/Native/Screen/bytecode/Chromium com livros reais PASS. Primeiro retorno físico EPUB1015→429/1443, toggles/reabre429 PASS; step por página e matriz completa ainda PENDENTES. Preferências: gesto no slider nativo REPRODUZIDO; sliders direcionais/testes PASS, conjunto físico ainda NÃO PASSOU; separação backdrop/painel em contraprova, NÃO TESTADA. Gutenberg deixou placeholder: OPDS/contato autorizado/aquisição explícita IMPLEMENTADOS, consulta+registro real VALIDADOS na rede, APK PENDENTE. JSON/OPDS/HTML controlados PASS, filtros reais/cinco estados/parciais/cancel/stale preservados. BNDigital BLOQUEADA HTTP403/aquisição não validada, inventário objetivo em FONTES_INDEXACOES_VALIDACAO.md. Search normalizada/ranking título+autor/typo/transposição/fallback limitado IMPLEMENTADA e matriz local PASS; consultas Gutenberg misto/reordenado/typo também PASS na rede, retorno físico final PENDENTE. APK diagnóstico E67AACBE instalado preservando35 livros/sessão; segundo diagnóstico67CB09C8 compilado/verificado23 módulos, NÃO INSTALADO. Demonstração manual solicitada pelo usuário em14:15: observação sem toques automáticos nem instalação durante a reprodução. Demais bugs1–10 continuam conforme checkpoint, Auth externo e cancelamento final/movimento anti-enjoo ainda pendentes/inconclusivos.

## Decks/flashcards — estado de 09/10/2026

IMPLEMENTADO e VALIDADO em testes locais: editor completo/edição/gabarito explícito/imagem/desenho/prévia/proteção de saída, decks, regra comum ±10/±5, estudo idempotente persistido com resumo e snapshots estáveis. Persistência por conta: SQLite Native/IndexedDB Web, copiando legado AsyncStorage sem exclusão. Geração local salva rascunhos para selecionar gabarito; não é IA.

Batalha real preparada no Supabase: RPC autorizado por auth.uid/feature, fila/cancelamento/confirmação, 3/5/10/15 por participante, sorteio sem repetição/congelamento/troca sem ownership, respostas/pontos autoritativos, segredo antes da resposta, retomada/espera/resultado/empate. Migration e SQL manual passaram em PostgreSQL WASM isolado; aplicação remota e dois usuários reais PENDENTES. Sem regras de abandono/expiração, sem derrota por rede e sem simulação local apresentada como multiplayer concluído.

Guia de habilitação/verificações/manifesto: `FLASHCARDS_IMPLEMENTACAO.md`. Novo módulo Android e ponte SQLite NÃO TESTADOS. Nenhum APK/dependência nativa gerado/adicionado; Metro funciona em development build compatível, APK release instalado exige recompilação/reinstalação futura. Histórico Reader/APK abaixo é anterior a este módulo e permanece preservado.

## Fechamento da rodada física — 09/10/2026

Estado vigente, prevalecendo sobre os registros históricos abaixo: todos os grupos 1–10 e posição processados; conclusão por incidente na tabela final de `CORRECOES_BUGS_APK_PROGRESSO.md`. APK normal final 08/10 16:11:48, 207579358 bytes, SHA256 `BF49499ADB7079BA0ED8696935EC84E418FE4D74C30BA8E8094A430BF6D38F33`; compilação/export PASS, bundle e seis fontes conferidos. Instalado sem limpar dados; base.apk no Redmi novamente idêntico em 09/10.

Controles Native com visibilidade declarativa direta mantidos após retorno físico positivo; animação Web preservada. Composição experimental descartada. Contagem EPUB final usa fragmentos/índices de coluna, eliminando oscilação de total por geometria transformada; largura fracionária corrige deriva distante. Chromium com Freud/Ócio em duas fontes/sete posições e última página com texto PASS; typecheck/Reader Native/Screen/bytecode e demais gates relevantes PASS.

No APK normal final, controles/painéis disponíveis, setas, Back do header e fechamento/reabertura PASS: EPUB 220/631→221/631→220/631/reabre 220/631; Ócio Reflow 5/32→6/32→5/32/reabre 5/32; Sociedade Original 78/169→79/169→78/169/reabre 78/169. Estudo aberto somente para leitura, sem criar/editar anotações. Biblioteca 35 livros preservada em 09/10, anti-enjoo original off conferido, diagnósticos opt-in desligados, aparelho deixado na biblioteca sem filtro.

Ainda PARCIAL/PENDENTE: validação completa Auth/Google/signup/recovery e configuração administrativa externa; cutout/rotação/matriz tipográfica/encerramento forçado; cancelamento real de busca e montagem final; arquivo de 969 páginas sem identificação. Await Weber 582/584 INCONCLUSIVO. Dados reais/overlay/lifecycle anti-enjoo PASS, movimento/eficácia ainda pendentes. Nenhuma migration/dependência/configuração remota/Flashcard alterada; worktree anterior preservado.

## Retomada física final — 08/10/2026, 15:30

APK normal 15:03:38 compilado/verificado/instalado, sessão/34 livros preservados, diagnósticos 0. Inclui medidas DOM fracionárias e correção de última coluna vazia; retorno físico EPUB distante alinhado, Back/reabertura manual 220/631 com mesmo trecho. Build/typecheck/Reader Native/Screen/browser/export Web 2335 PASS; hash e limites no checkpoint. Anti-enjoo original off restaurado.

Controles EPUB e Reflow normal visíveis não responderam aos toques atuais; áreas central/laterais e Back físico respondem. Composição unificada ReaderScreen não melhorou e foi DESCARTADA; APK normal anterior reinstalado às 15:38:35, hash igual. Resultados positivos anteriores de PRESS/painéis eram da variante diagnóstica. Segundo experimento em execução: ReaderControls Native com View/opacidade literal por visible, Web mantém animação; gates locais PASS, build/export e retorno físico pendentes. Nenhuma migration/dependência/configuração remota/Flashcard alterada. Esta seção e o checkpoint canônico prevalecem sobre os registros históricos abaixo.

## Campanha APK — 08/10/2026 (prevalece sobre histórico)

Validação física: biblioteca 34/sessão preservadas; Sociedade Native fallback por corrupção PASS; Ócio bytecode REPRODUZIDO, causa .toString Hermes corrigida com literal WebView/paridade e retorno físico sem erro PASS. Gutendex sucesso real/detalhes; Minhas Fontes vazio terminal. Header busca/sumário/Aa/Back responderam. Rodapé Reflow fora da tela por wrapper zero-height CONFIRMADO/CORRIGIDO; limites overlay completos, retorno físico footer/slider/setas PASS e browser seis hits com iframe PASS.

Anti-enjoo: Expo/permissão/samples reais e três ciclos Home/retorno VALIDADO. Layer atrás de Reflow z20 CONFIRMADA/CORRIGIDA com root z30/pointerEvents none; oito pontos no Reflow pronto PASS. Aparelho parado, deslocamento/eficácia pendentes; restaurar off original ao fechar. Weber eventualmente concluiu/cache legível após pausa 582/584; await exato inconclusivo. Scheduler microtask→idle real+Abort corrigido. República 525 páginas CANCEL durante extração→Original e reentrada complete/SUCCESS→Reflow PASS; não prova Cancelar na montagem/969 páginas.

Deriva horizontal EPUB distante REPRODUZIDA física/browser: clientWidth inteiro difere da coluna fracionária. Medida getBoundingClientRect corrigida, baseline erro 33,47px na página 120→atual <0,05px, Freud/Ócio browser PASS. Última revisão APK/retorno físico em conclusão. Auth externo, rotação/cutout, cancel busca real e resposta ao movimento continuam pendentes. Estados abaixo são checkpoints históricos; detalhe/tabela canônica em CORRECOES_BUGS_APK_PROGRESSO.md.

Revisão integrada: posição agora VALIDADA em documentos de livros reais Chromium (Freud EPUB/Ócio Reflow) e orquestração ReaderScreen controlada. Corrigidos viewer vazio no preparo apagando progresso, retorno Original com progresso Reflow e timer de 500ms que revertia modo ou descartava última posição no fechamento. Sem novo delay/debounce: gravação direta e settings funcionais. Back/cancel/erro/invalid, ack/layout provisório, controles/settings/instância, page=1 real, troca de modo e fechamento imediato PASS (storage controlado). APK físico ainda PENDENTE. Build JBR25 falhou; JDK17 existente e recompilação final PASS, sem upgrade/prebuild.

Fechamento local: typecheck/export Web 2335 e suites relevantes PASS; diff da campanha limpo, EOF Flashcards preexistente preservado. APK final conferido em `C:\KIndle\android\app\build\outputs\apk\release\app-release.apk`, 207573078 bytes, 08/10/2026 09:47:07 -03:00, package com.kindle.reader, assinatura v2 Android Debug existente; hash/bundle no checkpoint. Aparelho Xiaomi 23117RA68G/Android 16 apareceu na conferência final: instalação `adb install -r` PASS preservando dados; processo iniciado, UI aguardando desbloqueio. Inventário anuncia os cinco tipos DeviceMotion, permissão já concedida; eventos/overlay ainda NÃO TESTADOS. Todos os grupos processados; tabela final e passos restantes no checkpoint. Nenhuma migration/dependência/config remota alterada.

Anti-enjoo BUG 10 INCONCLUSIVO no Redmi: watchdog/toggle CORRIGIDOS, hook/lifecycle/overlay VALIDADO controlado; inventário físico anuncia cinco tipos necessários e permissão concedida, mas disponibilidade Expo/eventos/overlay no app PENDENTES até desbloqueio/teste. Diagnóstico opt-in pronto. Sem animação falsa/fallback por hipótese; nenhuma dependência nova. Gates grupo E e fechamento local PASS. Físico pendente.

Sources BUG 9 PARCIAL: pipeline/seleção/terminais/cancelamento/resultados parciais IMPLEMENTADOS e VALIDADO controlado/HTTP local. Gutendex live terminou em erro de acesso; online Native PENDENTE e incidente físico INCONCLUSIVO. Histórico não bloqueia rede; nenhuma mudança de proxy/CORS/retry/timeout da busca. Gates grupo D PASS.

Reader UI: BUG 2 PARCIAL (insets documentais Native IMPLEMENTADOS, contrato geométrico PASS; físico pendente). BUG 3 PARCIAL (feedback interceptador reproduzido/corrigido; 5 botões Chromium PASS; wrapper Native INCONCLUSIVO instrumentado). Posição PARCIAL: âncora tipográfica/transition/display/handshake Native CORRIGIDOS, baseline/atual browser/React VALIDADO, sem filtro page=1; origem completa do incidente físico e reabertura Android PENDENTES. Gates grupo C PASS. Flashcards NÃO ALTERADOS.

Reflow: BUG 1 PARCIAL — contrato compartilhado/validação/cache v11 IMPLEMENTADOS e 5 PDFs reais Web VALIDADO; Native físico PENDENTE. BUG 8 PARCIAL — etapas, cancelamento/gerações/cleanup/renderer e builder cooperativo IMPLEMENTADOS, cancelamento controlado PASS; 969 páginas/memória/toque físico NÃO TESTADOS. `bytecode` INCONCLUSIVO, captura opt-in testada sem origem atribuída. Nenhum timeout novo nem perda de arquivo/progresso. Detalhes no checkpoint.

Auth: BUG 5 PARCIAL (A–E controlado PASS; físico inconclusivo). BUG 6 BLOQUEADO POR CONFIGURAÇÃO EXTERNA (policy/logs/schema real). BUG 4: defeitos locais de callback CORRIGIDOS e teste controlado PASS; Google↔Supabase ainda BLOQUEADO por logs/configuração. BUG 7: erros operacionais e callback recovery CORRIGIDOS; allowlist/template/email real BLOQUEADOS. Nenhum bug Auth integralmente VALIDADO no APK. Migrations NÃO ALTERADAS/não aplicadas nesta campanha. Detalhes e sequência persistente: CORRECOES_BUGS_APK_PROGRESSO.md. Flashcards fora do escopo.

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
| 8. PDF híbrido e OCR | 🟡 OCR local Android e cache/proveniência implementados; gates controlados PASS; aparelho pendente | Validar APK/aparelho, qualidade visual por livro, offline, memória, rotação e obrigações do SDK |
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
| Login email — BUG 5 | 🟡 PARCIAL / incidente APK INCONCLUSIVO | Correção do tratamento de erro de navegação VALIDADA em componentes/SDK controlados; credenciais inválidas recusadas no servidor. Conta válida/aparelho pendentes |
| Cadastro email — BUG 6 | 🟡 PARCIAL / rejeição real INCONCLUSIVA | Code/status/categoria preservados e regressões controladas aprovadas; policy/trigger/constraint efetivos e signup real pendentes |
| Recuperação e redefinição | 🧪 IMPLEMENTADO — AGUARDANDO CONFIG | Estado anterior preservado; NÃO ALTERADO na fase 1 de Auth |
| Login username | 🧪 IMPLEMENTADO — AGUARDANDO CONFIG | Edge Function preparada; implantação e teste real pendentes |
| Login Google Web/Android | 🧪 IMPLEMENTADO — AGUARDANDO CONFIG/DEVICE | OAuth PKCE/callback, scheme já existente; provider, secret rotacionado e device pendentes |
| Sessão, logout, AuthGuard e perfil | 🧪 IMPLEMENTADO / VALIDADO CONTROLADO | Matriz A–E, logout e bloqueios por estado/cache aprovados; diagnóstico opt-in. Conta real e autorização remota continuam PENDENTES |
| Roles, MASTER e TEST | 🧪 IMPLEMENTADO — AGUARDANDO CONFIG | Regra central e script admin; contas/UUIDs reais não provisionados |
| Controle de Flashcards | 🧪 IMPLEMENTADO — AGUARDANDO CONFIG | UI/rota/ações bloqueadas por override; teste local passou, MASTER/TEST reais pendentes |
| Profiles e override com RLS | 🟡 PARCIAL | Migrations preparadas, não aplicadas no remoto |
| RLS das seis tabelas legadas | ⚠️ BLOQUEADO | Security Advisor CRITICAL remoto; migration deny all preparada; requer SQL Editor/admin |
| Teste A/B e Security Advisor | ⚠️ BLOQUEADO | Precisa migrations, contas reais e acesso ao painel remoto |
| Android deep link e Play Store | 🟡 MIGRADO LOCALMENTE — AGUARDANDO CONFIG/DEVICE | `aldus`, `com.aldus.reader` no app/Manifest mesclado; Redirect URLs e SHA-1 da keystore real/EAS/Play Signing pendentes |

Auditoria, matriz, migrations, limites e passos externos: `AUTH_IMPLEMENTATION.md`. Nenhum valor de secret foi registrado. O reset EPUB permanece ABERTO. Sem alteração Native nova; não houve APK/reinstalação nesta etapa.

### Fase 1 de correções Auth — 2026-10-07

- **IMPLEMENTADO / VALIDADO controlado:** BUG 5, separação de falha de navegação após sucesso Auth; BUG 6, preservação sanitizada de erro e mensagens por categoria. Diagnósticos por operationId desligados por padrão. Nenhuma condição de acesso foi relaxada.
- **INCONCLUSIVO:** causa do erro seguido de entrada no APK e etapa que rejeita seu cadastro. Os dois incidentes não estão concluídos. **PENDENTE:** timeline física, Auth/Postgres Logs e política de senha efetiva.
- **VALIDADO:** testes React do fluxo, SDK instalado com HTTP controlado, regras Auth existentes, typecheck/export Web; tentativa remota sem sessão com credenciais inválidas permaneceu sem sessão. Build não valida autenticação funcional completa.
- **NÃO TESTADO:** login/cadastro com conta real, email entregue, Android e autopromoção/RLS real. Browser visual bloqueado pela revisão automática ao iniciar Chrome. Contrato de privilégios foi conferido somente na migration local.
- **NÃO ALTERADO:** migrations/schema/configuração remota, policy, Google/recovery e demais áreas fora de Auth. Nenhum novo APK; o standalone exige rebuild para receber o código embutido desta fase.
- Evidências, matriz dos dez testes, limites e instruções de captura em `PROJECT_CONTEXT.md`, seção “Resultado da fase 1 — BUGS 5 e 6”.
