# Histórico — Android, beta e Web (19–21/10)

> Registro cronológico.
> Texto preservado do PROJECT_CONTEXT.md original (2192 linhas, escrito pelo Codex), movido sem reescrita em 06/11/2026. Trate como hipótese: confira Git/código antes de confiar. O estado atual e as pendências estão em [PROJECT_CONTEXT.md](../../../PROJECT_CONTEXT.md).

### Android: cadastro, PKCE e catálogos grandes — 19/10/2026

- main atualizada por fast-forward seguro de 10d6d24 para 112450d; alterações anteriores
  de fontes e documentação preservadas. O redesign de Minhas bibliotecas já existia no
  worktree; esta correção priorizou estabilidade, busca e fluxos preparados existentes.
- Redmi Android 16: APK instalado originalmente 1.0.0/code 1, atualizado em 17/10,
  Supabase público cmivracxuihtmsbmtuec. SHA-256 do APK inspecionado:
  60066f5377b24d0beb72c8fed8441d893a4464ee1ac1db1aeb3b66f3ad5758dd.
  O bundle difere do release 761c28d; não foi atribuída uma revisão exata sem prova.
  Development build existente instalado com adb install -r após conferir a mesma assinatura,
  sem desinstalar/limpar dados; o código atual foi carregado via Metro. Nenhum release gerado.
- Cadastro: quatro /signup HTTP 500 do incidente de 17/10 classificados por leitura
  remota como conflito único profiles/username. O trigger auth_create_profile insere o
  username fornecido nos metadados e abortava a criação da identidade quando ocupado.
  Cliente agora envia preferred_username como sugestão, deixa o perfil inicial sem username
  e usa o fluxo autenticado existente para reivindicá-lo após confirmação de e-mail.
  Conflito e falha de rede em completar perfil possuem erro recuperável e encerram busy.
- SDK Supabase instalado reproduz code_challenge_method=plain sem SubtleCrypto; era a
  condição rejeitada pelo validador S256. Native usa SecureRandom do Expo Core existente
  para getRandomValues e SHA-256 de @noble/hashes para endurecer os desafios de OAuth e
  signup/recovery/OTP, preservando o verifier armazenado pelo SDK. Sem fallback Math.random,
  sem SubtleCrypto fictício, sem relaxar origem/callback/PKCE, sem dependência nativa nova.
  Hermes físico confirmou ausência de subtle, RNG disponível e vetor RFC 7636 S256 correto.
- Auditoria remota somente leitura: redirect Native e recovery corretos; Web localhost
  não preservado e caminho Native não aprovado aceito pelo servidor. Configuração Auth
  externa não alterada. As quatro migrations SaaS/Admin já constam no ledger remoto sob
  versões de 16/10 documentadas anteriormente; não foram reaplicadas nesta execução.
- Catálogos: snapshot imutável reaproveitado após validar conta/identidade; índices e
  ordenações construídos somente quando usados; Intl.Collator reutilizado. Busca coopera
  em lotes de 100, pode ser cancelada e descarta respostas antigas. JSON é serializado
  antes da transação SQLite exclusiva, mantendo rollback e verificações de cancelamento.
- Físico: 38 livros pessoais preservados antes e após reiniciar. Catálogo existente:
  713 livros / 62 pastas visíveis (63 nós incluindo raiz). Abertura, busca, pastas, rolagem,
  Voltar, cancelamento real e nova tentativa exercitados; sem ANR registrado pelo Android.
  Indexação Google real terminou em 117.056 ms, com 713 livros e 62 pastas consultadas;
  serialização 11,8 ms e escrita SQLite 60,9 ms. Catálogo reaberto após encerrar o processo
  e também com Wi-Fi/dados móveis desligados, sem nova indexação. Rede restaurada.
  Tentativa anterior após segundo plano terminou em erro network após 34 pastas;
  carregamento terminou, índice anterior preservado e retry explícito posterior concluiu.
- Leitura SQLite inicial 49,2 ms, parse 7,7 ms, árvore inicial 15,6 ms e callback de frame
  após mount 748,1 ms no build de desenvolvimento. Busca cooperativa dos 713 registros:
  229 ms e 25 callbacks de timer; isso não mede FPS nem latência de toque. Não existe
  medição física anterior equivalente para afirmar percentuais de ganho ou encerrar todos
  os congelamentos intermitentes. Fixtures isoladas de 1.000/5.000/10.000 e cancelamento
  têm evidência controlada distinta do aparelho.
- Gates: typecheck, export Web e matriz crítica final 74/74 PASS; Sources UI controlada
  PASS; Chromium exportado PASS para navegação, busca, importação, IndexedDB/rollback,
  offline, remoção preservando arquivo e 1.000 livros com 24 cards montados. Testes foram
  adaptados às labels/ownership atuais e resposta HTTP retida explicitamente durante loading,
  sem depender de atraso artificial curto. Nova Sources UI incorporada à matriz crítica.
- Cadastro real autorizado: UI Verifique seu email; servidor confirmou uma identidade nova,
  um perfil ativo/user, plano Free automático e username ainda não reivindicado. Confirmação de e-mail, login posterior
  e login Google continuam em andamento; não declarar PASS completo por fixtures ou vetor
  PKCE. Senha e confirmação entram exclusivamente no Redmi; sem credenciais no Git.
  Importação física sob demanda e reprodução de todos os congelamentos continuam pendentes.
- Necessário futuro bundle Android para distribuir as correções; development build atual
  serve apenas à homologação. Sem migrations/configurações remotas, deploy ou cobrança.

### Resultado físico de Auth/Drive — 19/10/2026 (complemento)

- Cadastro de teste expressamente autorizado: identidade criada, e-mail confirmado,
  login por senha realizado, nome de usuário concluído pelo fluxo autenticado e perfil
  active/user com Free automático. Credenciais inseridas exclusivamente pelo proprietário
  no Redmi; e-mail e senha de teste não foram acrescentados ao Git.
- O link de confirmação foi aberto no computador: confirmou o e-mail no servidor, mas
  não poderia abrir o Android em outro aparelho. Entrada manual posterior no Redmi validada.
- No primeiro login houve falha ao consultar o perfil, apesar da senha e sessão aceitas.
  Tentar novamente recuperou o perfil com HTTP 200, sem modificar RLS. Causa desse evento
  intermitente permanece INCONCLUSIVA; não atribuir a credenciais inválidas nem encerrar
  esse acompanhamento por ter funcionado no retry.
- Isolamento real A/B: a conta de teste mostrou 34 assets bundled, zero livros privados
  da conta original e zero fontes atribuídas a ela. Uma fonte legada permaneceu sem adoção
  automática. A conta original foi restaurada por e-mail/senha e confirmada por getUser
  no servidor; voltou aos 38 livros, uma fonte ativa e um cadastro legado preservado.
- Login Google real: autorização abriu no Chrome do Redmi, o proprietário escolheu sua
  conta e confirmou. Logs remotos da janela 17:44–17:47 UTC registraram invalid_client
  na troca do código do provedor no /callback. NÃO houve sessão Google válida. Bloqueio
  EXTERNO na configuração OAuth Google/Supabase, distinto da autorização Native do Drive.
  Conferir o par Client ID/secret do provedor e seu callback exige acesso protegido e
  autorização específica; nada foi alterado no Google Cloud ou na configuração Auth.
- Detectada também corrida local: useURL recebia o endereço inicial do development client
  depois do evento de callback, substituindo a mensagem do provedor por origem inválida.
  Agora o Root captura o callback Native validado antes da tela; evento novo prevalece sobre
  initial URL atrasada. Cache contém só um URI efêmero, sem persistir/logar códigos; novas
  operações/logout o invalidam. Parâmetros de rota Native sozinhos não autorizam exchange.
  Esquema/host/caminho/credenciais continuam estritos. Ensaio físico com erro sintético
  confirmou mensagem do provedor e estado terminal correto; NÃO é PASS de login Google real.
- Nova reconexão Drive após trocar contas concluiu os mesmos 713 livros/62 pastas. Importação
  explícita de um EPUB real concluiu, ofereceu Abrir livro, abriu no Reader com controles e
  retornou à fonte pelo Voltar. Biblioteca passou legitimamente de 38 para 39, mantendo os
  anteriores; nova reabertura com o código final preservou os 39. Nenhuma fonte foi removida.
- Memória no development build ficou elevada (amostras PSS 712.814–913.368 KB; heap JS
  ~64 MB em uma amostra). Não comparar diretamente ao APK release inicial e não inferir
  vazamento/causa única desses números. Manter investigação de memória/congelamentos
  intermitentes; Android não registrou ANR nos ensaios. PDF físico não foi revalidado aqui.
- Gates finais: typecheck/export Web, 75/75 suítes críticas, Auth/callback/PKCE e ensaio
  Chromium do export atual PASS. Regressores incluem callback antes de mount, initial URL
  atrasada, reset de operação e parâmetros Native sem origem confiável. Provas físicas,
  fixtures e bloqueios do provedor permanecem distintos.
- Sem release/deploy/migrations/RLS/configuração OAuth/OWNER/pagamentos. Conta de teste
  real e operações normais autorizadas do aplicativo são as exceções explicitamente
  consentidas; não afirmar ausência total de escrita remota. A conta original está ativa.
  Development build depende do Metro local; distribuição independente requer futuro build
  Android autorizado. Rede e ajuste temporário de manter a tela ligada foram restaurados.
  Alterações documentais preexistentes e .gitignore permanecem preservadas fora destes commits.

### 20/10/2026 — Capas editoriais, Ajustes e organização do Admin

- Trabalho na main, partindo de 35d092bf512cc7f96d2c2ad864c956ade62462e7. As alterações
  preexistentes de .gitignore e destes dois documentos foram preservadas sem reset/clean/stash
  e não foram incluídas nos commits desta revisão.
- Capas: BookCover compartilhado por biblioteca, fontes/Drive, busca/detalhes e seleção
  de livros. Original disponível, miniatura alternativa quando fornecida e fallback editorial
  determinístico; carregamento/erro, proporção preservada, imagem pequena rejeitada e
  downsampling Android. Sem imagens geradas por IA, arquivos de placeholder ou busca externa.
  As 35 imagens estáticas existentes mantêm dimensões válidas e não foram substituídas.
- EPUB: declarações EPUB 3 cover-image, meta cover do EPUB 2 e guia HTML/raster, inclusive
  caminhos relativos fora da pasta do OPF. Extração apenas da capa declarada, limitada a
  1 MiB, com assinatura raster verificada; reaproveita recursos já lidos. Usa coverImagePath
  persistido existente. Arte inválida/ausente/grande não impede importação nem leitura.
  Não há reimportação automática de livros antigos. Capas vetoriais SVG não ganham um
  novo renderizador Native: nesses casos ou sem capa disponível usa-se o fallback editorial.
- PDF: Web mantém renderização só da primeira página, canvas limitado a 300 x 480 e
  destruição do documento/worker também em falhas. Android reutiliza miniatura local válida;
  o módulo atual só expõe OCR, não thumbnail, portanto sem miniatura usa o placeholder.
  Não foi acionado Reflow/OCR para gerar capas, nem adicionada dependência Native.
- Ajustes: identidade compacta, grupos Conta e plano, Leitura e aparência, Biblioteca e
  serviços, Comunidade e Privacidade e informações. Sincronização, tema, conforto e serviços
  usam subdivisões internas; preferências e operações anteriores continuam disponíveis.
  Índice Legal e informações público, além dos sete documentos públicos existentes.
  A entrada Admin depende da mesma autorização verificada no servidor.
- Admin: dez seções agrupadas em quatro áreas; lateral recolhível no desktop e menu
  fechado inicialmente no celular. Configurações em lista resumida, editor só após seleção,
  histórico e identificadores avançados recolhíveis. Contratos/chaves/RPCs/MFA/confirmações,
  revisões, auditoria e proteção do último OWNER preservados. Sem mutações administrativas reais.
- Leitura Livre: nenhuma otimização de produção adotada. Experimento local com o Weber
  empacotado (5.265.071 bytes, 584 páginas, 58.594 itens) comparou agrupamento linear a busca
  binária: medianas 213,96 ms e 191,49 ms em oito execuções alternadas; linhas e documento
  textual idênticos. Economia de ~22 ms insuficiente para justificar mudança sem prova Native.
  No mesmo ensaio Node/PDF.js 6.3.289: leitura 3,34 ms, base64 2,69 ms, abertura 167,91 ms,
  texto 7.374 ms, listas de operações 5.921 ms, montagem/validação 1.282 ms, serialização
  15,55 ms e gravação de arquivo temporário 16,17 ms. JSON de ponte foi apenas simulado.
  Houve dois avisos JBIG2 no desktop; pixels/OCR/ponte real/SQLite/memória móvel não foram
  validados nesse ensaio. Os ~212 s previamente informados no Redmi não são comparáveis.
  Extrator WebView/PDF.js 3.11.174, Reader, imagens, OCR, validação e cache de produção intactos.
- Qualidade: typecheck/export Web; matriz 79/79; novas regressões de capas/miniaturas,
  Ajustes e Admin, mais reexecução das suítes afetadas após revisão. Chromium do export:
  Admin com HTTP/Auth/TOTP sintéticos e PostgreSQL/PGlite isolado, dez seções e operações
  auditadas, edição/rollback de configuração, teclado, telas móveis e fonte ampliada;
  fontes com mil itens, 24 cartões montados, grade/lista, busca, importação e IndexedDB.
  Esses ensaios não são validação de Supabase gerenciado. Capturas locais em .expo/admin-validation
  e .expo/source-library-validation; medições/logs em artifacts/design-20261020 (ignorados).
  Bundle Web principal: 5.623.899 bytes contra 5.617.078 em 35d092b (+6.821); gzip
  1.472.471 contra 1.470.417 (+2.054). Zero dependências Native e imagens bitmap novas.
  Isso não mede RSS do Android nem tamanho de um APK com as novas telas.
- Redmi Android 16: development build já existente, compatível por assinatura, com JS novo;
  40 livros preservados (o proprietário confirmou a importação adicional desde os 39).
  Ajustes/Legal/temas/rolagem e fonte 1,3x após reabertura, fonte Teste, pastas e grade/lista
  exercitados. Catálogo em cache com 713 livros/62 pastas + raiz; pede reconexão para atualizar,
  sem novo consentimento, indexação ou importação nesta revisão. Três fontes atuais preservadas.
  Após mudar font_scale a automação precisou reabrir o development build para recuperar a
  árvore acessível; a captura já mostrava a biblioteca. Não classificar isso como ANR provado.
  Preferências restauradas (tema sistema, escala 1,0 e manter tela ligada 0).
- Entrega anterior concluída separadamente: APK independente 35d092b, 345.627.034 bytes,
  SHA-256 F0B152615D2A6F45C7DBA64414FBA25A14B6A125ABCFA5077E691EA0B1748117,
  artifacts/apk/Aldus-35d092b.apk e cópia USB Download/Aldus-35d092b.apk. Mesmo package/certificado,
  install -r, primeiro install preservado; restaurado no aparelho ao terminar e aberto sem Metro.
  Preview anterior somente homologação: https://kindle-reader-gzaek9u7j-matheus-projects-70f48ed9.vercel.app
  (commit 35d092b, conteúdo remoto verificado). APK/preview anteriores NÃO incluem esta revisão.
  Nova distribuição Android precisará de novo bundle/build autorizado; sem nova dependência Native.
- Sem novo APK de distribuição nesta revisão, deploy de produção, mudanças Supabase,
  migrations, OAuth, OWNER ou pagamentos. Push da main não aciona o projeto Vercel inspecionado:
  não há integração Git conectada; o preview anterior foi envio explícito estático.


### 20/10/2026 — Beta fechado: checkpoint de infraestrutura e artefatos

- Missão A–J EM ANDAMENTO na main, partindo de e3618b6. Não há GO nem autorização
  de convites/produção. As alterações preexistentes de .gitignore e dos dois documentos
  continuam separadas; não foram incorporadas a esta revisão.
- Código distribuído: 579cf752489538a5666e059062585b8e601cd4f3. Commits anteriores
  desta missão: 15b56b6 (tipagem Web de touchAction/CI) e 7990f67 (preparo beta).
  Versão 1.0.0-beta.1, Android code 2. Feedback manual em Ajustes: versão/plataforma,
  categoria, descrição e reprodução; prepara rascunho, sem envio/coleta automáticos.
  Contato público autorizado: matheusborbaifc@gmail.com. Identificação formal do controlador,
  retenção operacional e revisão jurídica ainda pendentes; nenhuma certificação legal.
- Build local exige assinatura privada; exceção explícita apenas para ensaio compatível.
  APK artifacts/apk/Aldus-579cf75.apk: 274.843.921 bytes; SHA-256
  43b06eab6de6c0466b6da49bb578ff827abb6a0f07d1c0de50b06008972a8c6a.
  com.aldus.reader, não depurável, Hermes embarcado, ARM64/ARMv7, módulos Drive/OCR presentes.
  Remover x86/x86_64 economizou 70.783.113 bytes frente ao 35d092b, sem retirar recursos.
  Certificado beta privado SHA-256 4adef0a46afa7f9d685a3ae7dba564379a5c9eb406a9452b05decdea11cb9875.
  Chave cifrada fora do Git; custódia recuperável em outra máquina depende do proprietário.
- Redmi recebeu somente Aldus-579cf75-redmi.apk, derivado com o certificado anterior.
  Payload não relacionado à assinatura e bundle idênticos ao beta; install -r confirmado,
  primeiro install 11/10 preservado, sem limpar/desinstalar, sem Metro. O beta de nova
  assinatura NÃO substitui esse aplicativo; instalação nova com esse certificado e OAuth
  Drive para seu SHA-1 continuam sem prova física. Não distribuir o derivado de ensaio.
- Preview isolado/protegido, sem promoção:
  https://kindle-reader-b83yrgk17-matheus-projects-70f48ed9.vercel.app
  Código 579cf75, conteúdo/rotas/bundle remoto verificados. Chromium real: login por senha,
  perfil, reload, Free/quotas, negação Admin, logout e A→B→A PASS com identidades QA reais;
  nenhuma fixture HTTP. Cadastro por Admin NÃO prova entrega de e-mail ou recuperação.
  CI remoto 39436524460 PASS. Push na main não publica o Vercel: integração Git ausente.
- Auditoria somente leitura: sete versões remotas históricas preservadas; 31 funções e
  27 policies equivalentes às quatro migrations incrementais originais. Bucket privado,
  schemas privados sem USAGE de clientes, sem escrita direta de plano/Admin/biblioteca.
  Não reaplicar nem reparar ledger. Nenhuma migration, OAuth, OWNER ou cobrança alterados.
- Backup REAL atualizado e cifrado (EFS, ACL usuário/SYSTEM, credenciais DPAPI), fora do Git:
  %USERPROFILE%\.aldus-private\beta-20261020\backup-2026-10-20T17-23-35-346Z.
  Dump 595.970 bytes, SHA-256 ebb042d5f430364462fdb20c3e91df5ee20eed4cc6cdbfc618bd877066a365a6.
  Snapshot consistente; restore PostgreSQL isolado em loopback, depois parado; 65 tabelas,
  contagens/fingerprints, funções/policies/triggers e FKs conferidos. Seis objetos físicos,
  5.952.849 bytes, copiados e hashes conferidos. Metadata não foi confundida com arquivos.
  Vault sem segredos omitido apenas no restore Windows; arquivo completo preservado.
  Não recria GoTrue/Storage gerenciados, SMTP/OAuth/segredos/configuração externa nem comprova
  recuperação fora deste Windows sem preservar suas chaves EFS/DPAPI separadamente.
- Piloto especificamente autorizado: três contas QA sintéticas A/B/D, D desativada;
  credenciais apenas cifradas fora do Git, JWTs GoTrue reais usados para RLS. Doze cenários
  remotos PASS: Free, autopromoção negada, CAS/retry, A/B/anônimo, upload sem reserva negado,
  reserva concorrente/idempotente, tamanho real, publicação, download/hash, upsert/remoção
  cruzada negados, cancelamento/retorno tardio e D com JWT anterior negada. A primeira
  asserção de confirmação imediata da limpeza falhou; causa inicial não retida. Ausência
  do objeto no banco, GET 404, delete repetido e tombstone CAS foram confirmados depois.
  Não converter esse incidente em PASS sem ressalva nem inventar sua causa.
- ATENÇÃO: o proprietário importou Amêndoas manualmente na QA A ao abrir o seletor.
  Foi preservado localmente com sua fila; rede pausada antes de envio, sem uso como fixture.
  Logout offline funcionou e os ensaios controlados passaram para QA B. NÃO excluir,
  desativar ou tratar QA A como descartável enquanto esse livro não tiver destino definido
  explicitamente. Não transferir ownership nem limpar outbox automaticamente.
- QA B no Redmi: importação real dos dois arquivos originais QA (EPUB 2.954 bytes e
  PDF 4.236 bytes), EPUB aberto, avanço, marcador e nota salvos; PDF Original página 2/4.
  Storage real confirmou dois objetos/7.190 bytes, zero reservas pendentes. Livro público
  empacotado tem metadata própria sincronizável; não interpretar toda contagem de livros
  como quantidade de arquivos enviados. Manifest contém 34 assets públicos.
  Ida à Web e retorno de dados ao Android ainda precisam fechar o cenário completo.
- Qualidade controlada: typecheck/export Web, 80/80 críticas, 19 cenários PostgreSQL real
  local com cinco esperas entre sessões independentes; Chromium Admin/SaaS/marketing/Library
  PASS com contratos/HTTP/Auth/Storage sintéticos claramente separados do serviço real.
  Leitura Livre/Reader não foram refatorados. Amostra release de memória não é prova de
  ausência de vazamentos nem comparação pareada com development build.
- Operação proposta, não ativada: iniciar com cinco convidados e avaliar expansão a dez;
  admissão controlada por Auth/convites revogáveis, preservando contas existentes e sem
  privilégios administrativos. Cadastro público ainda habilitado; mudar isso e convidar
  requer aprovações específicas. Free comercial 100 livros/500 MiB e Pro 2.000/10 GiB intactos;
  Pro não contratável. Supabase Free não garante simultaneamente essas franquias: 1 GB
  Storage, 500 MB banco, máximo de arquivo Free 50 MB, egress limitado e sem PITR/backup
  automático contratado; saldo mensal de tráfego não disponibilizado pelo conector.
- Incidentes: contato manual com versão/plataforma/passos, sem enviar livros/tokens/logs
  pessoais. Preservar arquivos/outbox; se suspeita de isolamento, pausar Sync, não apagar.
  Recuperação de dados somente em instância isolada antes de qualquer ação aprovada em
  produção. Atualização Android por fix-forward com code maior e mesma assinatura; nunca
  uninstall/clear/downgrade. Web conserva previews anteriores; rollback/promoção requerem
  aprovação, não são automáticos. Não há política automática de purga ou exclusão de contas.
- Bloqueios: Google invalid_client remoto permanece; função username-login não implantada;
  primeiro perfil intermitente segue inconclusivo; cadastro/confirm/recovery nos artefatos,
  ciclo completo Android↔Web, instalação do novo certificado e recuperação de chaves fora
  da máquina pendentes. Não convidar usuários nem declarar GO com esses portões abertos.


### 20/10/2026 — Beta: ciclo real Web/Android e recuperação concluídos no Redmi

- Este registro atualiza o checkpoint anterior, sem apagar seu histórico. Situação final
  desta rodada: NO-GO para abertura da Beta; nenhum convite ou deploy de produção realizado.
  main em f521187 antes deste registro. Código funcional dos artefatos: 22eb657521ca76cc2b655f7b2fa0136c4c122bc6.
- CORRIGIDO em 22eb657: BookCover tratava somente nativeEvent.source; no preview real,
  onLoad do React Native Web forneceu target/naturalWidth/naturalHeight e provocou exceção.
  Agora aceita os dois contratos e rejeita dimensões inválidas/miniaturas sem travar fallback.
  Regressões Web/Native, typecheck/export e 80/80 críticas PASS. Nenhuma lógica do Reader alterada.
- CI Linux de 22eb657 encontrou uma espera frágil no TESTE de cache do Reader: cem voltas
  de setImmediate não garantiam a fronteira de gravação de uma pipeline cooperativa.
  f521187 passou a aguardar a chamada real do save simulado, também detectando término
  sem gravação. Não é mudança no Reader de produção. Teste focado local PASS; CI remoto
  39477626025 SUCCESS com 80/80, typecheck e export. Tentativa Windows anterior não
  reproduziu deterministicamente a falha Linux; não alegar reprodução local inexistente.
- APK privado final: artifacts/apk/Aldus-22eb657.apk, 274.844.045 bytes (~262,1 MiB),
  SHA-256 46ed94d86116f5d55edd51ea345ebc1e8137a5200403cf3a3bf7a6a796270ea1.
  com.aldus.reader, 1.0.0-beta.1/code 2, release não depurável, ARM64/ARMv7, Hermes,
  módulos Drive/OCR presentes. Certificado privado SHA-256
  4adef0a46afa7f9d685a3ae7dba564379a5c9eb406a9452b05decdea11cb9875.
  Não instalado fisicamente: assinatura incompatível com o app pessoal existente.
  Não há URL HTTPS de APK publicada; obtenção privada pelo arquivo local. Não distribuir
  o derivado Aldus-22eb657-redmi.apk, usado exclusivamente como ensaio de compatibilidade.
- Redmi atualizado por install -r com o derivado de certificado antigo, sem uninstall/clear;
  primeiro install 11/10 preservado. Payload e bundle idênticos aos do APK privado,
  assinatura separada. Cold start sem Metro e offline PASS; isso não prova instalação
  da chave nova nem seu consentimento Google Drive. Bundle Hermes SHA-256
  fd3d503e1ec42cdbfa2fff38d141aed23ae3eae63aaa90a171fb4779c1ee10fe.
- Preview atual confirmado, isolado e protegido por Vercel:
  https://kindle-reader-ro081u87x-matheus-projects-70f48ed9.vercel.app
  Código funcional 22eb657; HTML, rotas, metadata e bundle remoto conferidos. Nenhuma
  promoção ou mudança global de proteção. CI/documentação posteriores não mudaram o runtime.
- Chromium do preview real: oito cenários de Reader/Sync PASS, sem fixtures HTTP e sem
  exceções não tratadas: recebeu metadata EPUB/PDF, progresso e nota do Android; baixou
  os dois arquivos privados; abriu os Readers; persistiu nota offline em IndexedDB;
  criou grifo pela âncora do engine; alterou progresso EPUB/PDF e organização; servidor
  confirmou os dados e fila zero. Autenticação A→B→A já PASS no preview 579cf75 anterior,
  com código Auth inalterado. Não atribuir esses quatro casos ao novo preview como reteste.
- Conflito REAL em dois perfis Chromium/sessões GoTrue independentes: edições offline
  concorrentes da nota PDF sintética, CAS conflitante visível, duas versões preservadas,
  escolha explícita da versão remota e restauração da nota QA pelo formulário. PASS,
  zero exceções, nenhuma identidade ou biblioteca pessoal usada como fixture.
- Retorno físico ao Redmi/22eb657: EPUB 17% e página 3/13, nota e grifo da Web recebidos;
  PDF Original fonte 3/4 e nota da Web recebidos; coleção e tag recebidas. Paginação EPUB
  varia com viewport, portanto não comparar número bruto de páginas entre Web/Android.
  Marcador/nota criados no Android offline persistiram após encerrar/reabrir o processo;
  após reconexão, servidor confirmou a nota e ownership. B: 35 metadados de livros,
  compostos por 33 assets públicos empacotados e dois QA, não 35 uploads privados.
  Criação de grifo no Android ainda NÃO EXECUTADA; foi criado na Web e recebido no Redmi.
- Recuperação REAL da conta original: primeiro link abriu erro e o Auth registrou
  One-time token not found; causa do consumo/rejeição original não comprovada. Um único
  novo pedido às 19:06 UTC abriu Redefinir senha. Proprietário digitou/salvou senha só no
  aparelho; Auth registrou exchange 200 e user_modified/PUT 200, nova sessão confirmada.
  Biblioteca original com 40 livros, inclusive após cold reopen, sessão mantida e sem
  erro de callback. Recuperação Android PASS. Não declarar novo cadastro/confirmação
  de e-mail nem recuperação Web validados nos artefatos atuais. Nenhuma senha/URI/token
  entrou em relatório, chat, argumento de processo ou Git.
- Estado agregado remoto após piloto: seis contas, oito objetos privados/5.960.039 bytes,
  zero tamanhos desconhecidos/objetos sem livro vivo. Os dois arquivos QA de B somam
  7.190 bytes e zero reservas pendentes. As seis cópias pessoais anteriores preservadas.
  QA A/Amêndoas, seu cadastro e outbox continuam preservados, sem adoção ou limpeza.
- Backup verificado continua sendo o snapshot ANTERIOR ao piloto: 65 tabelas e seis
  objetos/5.952.849 bytes; não inclui contas/arquivos QA criados depois. Na conferência
  final, arquivos temporários do restore e de perfis Chromium não haviam herdado EFS;
  ACL privada esteve ativa e dump/credenciais já estavam cifrados. Corrigida a cifragem
  no diretório exato da operação e fechados apenas navegadores QA próprios. Conferência:
  zero arquivos não vazios sem EFS; marcadores vazios não contêm dados. Hash do dump
  permanece ebb042d5f430364462fdb20c3e91df5ee20eed4cc6cdbfc618bd877066a365a6.
  Chaves EFS/DPAPI e assinatura ainda exigem custódia protegida fora desta máquina.
- Memória release após Reader/Sync/Auth: amostra PSS 235.756 KiB, sem CRASH/ANR no histórico
  retido. Não equivale a teste prolongado, ausência de vazamento ou comparação pareada
  com development build. Leitura Livre de PDF grande mantém a limitação já documentada.
- Matriz conservadora dos 34 portões do pedido: 27 PASS, um FAIL, seis BLOQUEADOS (79,4%).
  Segurança 5/5 PASS; recuperação 2/3 (custódia/recuperação em outra máquina bloqueada);
  Auth 4/7 (cadastro atual e recuperação Web bloqueados; redirecionamentos FAIL por Google);
  Sync 7/8 (criação de grifo Native e ida à Web não comprovadas); app 4/5 (Reader/Reflow
  prolongado no artefato final sem prova suficiente); distribuição 5/6 (instalação física
  da nova assinatura bloqueada). PASS vale para o escopo/ambiente descrito, não é garantia
  universal nem percentual de testes unitários. Recovery Android isolado é PASS dentro
  do portão Auth que exige as duas plataformas. Sem ampliação silenciosa de cobertura.
- Bloqueios operacionais mantidos: Google invalid_client; username-login ausente; primeiro
  perfil novo intermitente inconclusivo; Drive para o SHA-1 da nova assinatura não homologado;
  controlador/retenção e custódia de chaves pendentes. Pro não contratável. Admissão de
  cinco testadores, posterior expansão a dez, requer aprovação de controle Auth/convites.
  Não ocultar Google ou alterar configuração OAuth sem autorização específica. Nenhuma
  migration/RLS/OWNER/cobrança/produção modificada nesta rodada. Próximas ações externas
  precisam de aprovação específica; preservar todo dado pessoal e a fila QA A.


### 21/10/2026 — Fechamento Beta: Google Android validado e checkpoint local

- HEAD inicial e14480c3e610bb7e0ecec87933d61889d152017b, main. As diferenças anteriores
  em .gitignore e nos dois contextos foram preservadas; não são parte dos commits locais.
- Causa confirmada do login Google: Auth remoto registrou, em 19/10, erro no callback
  de troca com o provedor: invalid_client / The provided client secret is invalid.
  Cliente Web Aldus reader, projeto Google coral-antonym-393317, coincide com o Client ID
  do Supabase e callback /auth/v1/callback correto. Não foi falha da troca PKCE do app.
- Com autorização específica, o proprietário criou segunda chave no MESMO cliente Web,
  preservou a anterior e salvou somente o novo secret do provedor Google no Supabase.
  Nenhum secret foi lido, registrado ou enviado ao Git. Nenhum Client ID, URL, switch,
  conta, RLS, migration, OWNER, Drive ou pagamento foi alterado pelo agente.
- VALIDAÇÃO REAL: Redmi Android 16, payload 22eb657/assinatura antiga compatível, retornou
  da escolha Google à conta original. Logs 21/10 16:25–16:32 UTC: login/provider google,
  nova sessão, perfil ativo, zero invalid_client ou falhas de exchange nessa janela.
  Biblioteca mantém 40 livros; sessão original preservada após force-stop/cold reopen.
  Isso valida o Google nesse fluxo Android; não valida Web ou a autorização Drive.
- Bloqueio Web concreto: allowlist Supabase contém somente os dois callbacks Native;
  nenhum callback HTTPS do preview. Não alterar URLs sem aprovação específica.
- ff2f131: falha ao gravar cache opcional não substitui mais perfil fresco retornado
  pelo servidor. Regressões incluem perfil desativado e resposta tardia A→B. Antes FAIL,
  depois PASS; typecheck PASS. A causa do incidente intermitente de primeiro perfil
  relatado em 19/10 continua inconclusiva; não atribuir retroativamente ao cache.
- de64178: falha de configuração do provedor recebida como access_denied não é mais
  exibida como cancelamento. Regressão do callback antes FAIL/depois PASS; PKCE Native,
  cancelamento legítimo e sanitização preservados. Essas duas correções exigem rebuild.
- Redmi confirmou regressão visual dos Ajustes: ícone, título e seta empilhados.
  Correção local envia geometria estática à linha Pressable, mantendo feedback Android;
  navegação/área de toque passam no teste controlado. Revalidação física do novo APK
  pendente. Não refatorar Reader nem generalizar causa de interop sem ensaio do build.
- Novo AVD isolado Aldus_Beta_20261021, Android 17/API37, dados privados com ACL/EFS,
  loopback e nenhuma identidade pessoal. APK privado 22eb657 instalado e hash conferido,
  sem Metro, mas processo falhou ANTES da interface: SoLoader não encontra libreactnative.so
  na tradução ARM em x86_64 com carregamento direto do APK. Comando am start retornou ok,
  o que NÃO equivale a inicialização funcional. AVD desligado; imagem e dados preservados.
  Próximo build pode incluir ABI x86_64 já suportada pelo projeto para teste nativo.
- Matriz existente atualizada sem apagar evidências: Google Native PASS, Web pendente;
  Ajustes físicos FAIL até revalidar; instalação privada não declarada funcional.
  NO-GO mantido. Username-login ainda ausente; cadastro atual, recovery Web, grifo
  Native→Web, Reader prolongado e custódia fora desta máquina continuam pendentes.
  QA A/Amêndoas e outbox preservados. Não iniciar publicação de produção/convites.


### 21/10/2026 — Google Web validado; beta.2 em homologação

- Após aprovação específica, adicionadas SOMENTE duas Redirect URLs do preview 22eb657:
  https://kindle-reader-ro081u87x-matheus-projects-70f48ed9.vercel.app/auth/callback
  https://kindle-reader-ro081u87x-matheus-projects-70f48ed9.vercel.app/auth/callback?next=reset-password
  Total conferido: quatro URLs; dois retornos Native e Site URL aldus://auth/callback
  preservados, sem wildcard, alteração de proteção Vercel ou produção. Reversão: remover
  somente as duas novas entradas após aprovação. Não são autorização para outras origens.
- Google Web REAL no Chromium integrado/preview 22eb657: callback concluído, header
  autenticado, biblioteca abriu; navegação com reload à Conta confirmou identidade
  original e perfil disponível. Logout removeu identidade visível e abriu login; segunda
  entrada Google voltou ao header autenticado, sem erro de callback. Servidor confirmou
  login/provider google e nova sessão original. Evidências sanitizadas em artifacts/
  beta-20261021/google-web-confirmed.json e google-native-confirmed.json. Google login
  passa nesses dois ambientes; ainda não é prova do APK beta.2 com nova assinatura/Drive.
- Cliente Android Google existente vincula com.aldus.reader ao SHA-1 antigo
  5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25. Certificado beta privado
  tem SHA-1 BC:6B:12:C9:C3:3E:6C:97:F9:FC:FD:96:73:E7:8A:D6:55:1F:61:96.
  Configurar segundo cliente para beta exige aprovação específica; preservar o antigo.
  OAuth continua Externo/Testando, três usuários de teste, sem alteração de público.
- Código c92308fe6a00e6b8e1e3a19f5baf74ae1c1d3920, main enviada: beta.2/versionCode3,
  versões Expo/package/lock/Gradle consistentes. Typecheck e 80/80 críticas PASS. Export
  Web PASS e metadata/arquivos conferidos; dirty=true significa só as três diferenças
  contextuais preexistentes reconhecidas, não código de runtime fora do commit.
  CI 39638828390 SUCCESS: https://github.com/matheusbitlab/Aldus/actions/runs/39638828390
- Novo preview PRIVADO, sem promoção de produção:
  https://kindle-reader-gfwlrbj7z-matheus-projects-70f48ed9.vercel.app
  dpl_ACviy4EVTJyg8EvefxdLF4XwYkEt, READY, metadata e bundle remoto idênticos ao export.
  JS SHA-256 a8aa8fa9e626d9517596d31465587ec6484d0323426272d43dd8083081c37167.
  GET anônimo retorna302 para autenticação Vercel. Autenticação/Reader nesse novo
  preview ainda não ensaiados; callbacks dessa NOVA origem ainda não autorizados.
- Build APK privado c92308f em andamento no wrapper oficial, ARM64/ARMv7/x86_64 para
  testar sem tradução ARM no AVD. Não declarar APK gerado, inicialização ou correção
  física dos Ajustes até conferir artefato e executar. Não distribuir derivado Redmi.
- Proprietário autorizou uma nova conta sintética no alias Gmail de teste desta rodada
  e e-mails de confirmação/recovery. Formulário preparado no preview 22eb657, senhas
  deixadas para entrada direta pelo proprietário; não registrar nem recuperar senha.
  Cadastro/confirm/recovery ainda pendentes de resultado, não criar contas duplicadas.
- Custódia externa preparada como procedimento, NÃO executada: escolher destino offline
  cifrado aprovado; exportar certificado/chave EFS em PFX com senha forte inserida pelo
  proprietário; preservar backup/objetos/manifestos, keystore beta e recuperação de suas
  senhas em invólucros cifrados separados. Blobs DPAPI isolados não bastam em outro Windows.
  Não copiar chaves/segredos para Git, Vercel ou chat. Em segunda máquina isolada, importar
  material com participação do proprietário, confirmar decriptação/hashes e restore
  loopback, e conferir certificado do keystore sem assinar/publicar release por engano.
  Só unidade C: disponível nesta sessão; destino externo/segunda máquina não aprovados.
  Portão de custódia permanece BLOQUEADO; backup comprovado anterior ao piloto preservado.
- Configuração temporária de manter Redmi acordado restaurada a0; fonte1.0, Wi-Fi1 e
  dados móveis1 preservados. Conta original e40 livros confirmados após Google/reabertura.
  Matrizes guardam evidências anteriores; NO-GO e demais pendências mantidos.


### 21/10/2026 — Cadastro real entre dispositivos expôs dois novos bloqueios Web

- O proprietário trocou o endereço sintético sugerido por outro endereço sob seu controle
  e enviou o cadastro diretamente. Consulta restrita à identidade indicada confirmou
  uma conta nova desta rodada, e-mail verificado e perfil ativo. Senha inserida somente
  pelo proprietário. Não registrar o endereço privado/UUID nem usar contas pessoais
  existentes como fixtures. A conta de teste é preservada; não criar duplicata.
- Link aberto pelo proprietário no Redmi foi conferido na tela autorizada do Chrome:
  abriu a WEB do preview22eb657, não o app Native. Exibia erro genérico de link inválido
  ou expirado, apesar da confirmação já efetivada. Nenhum link/código/token foi capturado
  no relatório. O cadastro começou no navegador integrado do computador, que detém o
  verificador PKCE; outro dispositivo não compartilha esse material. SDK instalado, em
  ensaio controlado sem rede, reproduz pkce_code_verifier_not_found antes de chamar HTTP.
  Não equiparar essa prova controlada a uma captura do erro interno daquela sessão.
- 68d6061 preserva PKCE e trata apenas códigos allowlisted de verificador ausente/incorreto
  com orientação segura: login por senha se e-mail já confirmado; novo pedido no navegador
  desejado para recovery. Erros desconhecidos/expirados mantêm fallback, sem corpos brutos.
  Regressão antes FAIL/depois PASS, SDK real sem HTTP, NativePKCE e Auth lifecycle PASS.
  Não torna códigos reutilizáveis nem transfere sessão silenciosamente entre aparelhos.
- Login por senha real da conta nova no computador foi aceito; servidor confirmou sessão
  e perfil ativo, mas username ainda vazio. A Web voltou à landing com CTA de visitante.
  Causa local determinística: entrada Web exige username para signedIn, mas não encaminha
  ao complete-profile, ao contrário da entrada Native. Não confundir com incidente Native
  de primeiro perfil de19/10, cuja causa permanece inconclusiva.
- f6cf52ce542f0332a4625b315381eb9533309826 corrige esse encaminhamento Web após resolver
  perfil ativo da MESMA sessão. Anônimo, perfil ausente, conta desativada, UUID diferente
  e loading não são encaminhados indevidamente. Teste do componente real antes FAIL/depois
  PASS; typecheck PASS. Perfil remoto do teste foi mantido sem username para testar a
  conclusão no preview corrigido; cadastro completo ainda não é PASS final.
- Sem modificar Site URL/templates: dashboard confirmou templates padrão e ausência de
  SMTP personalizado, necessário pela interface atual para editar conteúdo. Não contratar
  SMTP nem escolher provedor automaticamente. Uma entrada Web estável e aprovada poderá
  orientar abrir Aldus/entrar na Web; só mudar URL não supera vínculo PKCE entre contextos.
  Recovery Web ainda não solicitado nesta rodada, nem senha principal alterada.
- Candidato anterior c92308f GERADO/VERIFICADO: artifacts/apk/Aldus-c92308f.apk,
  309.993.585 bytes, SHA-256 bc9436a59634909aae9e188211733332e9c8d611f4778cafbc1ffdc00c55756c,
  beta.2/code3, release não depurável, ARM64/ARMv7/x86_64, módulos Drive/OCR e Hermes.
  Certificado privado SHA-2564adef0a46afa7f9d685a3ae7dba564379a5c9eb406a9452b05decdea11cb9875.
  Bundle7.537.936 bytes/SHA-2567af2e78b7cf1a38058839a11fcbc7b61bb915b4ee53aa120c62cc78fea26710f.
  Esse candidato antecede68d6061/f6cf52c e NÃO é o artefato final atualizado. Não instalado
  no Redmi nem declarado funcional no AVD. Preservar como evidência; não distribuí-lo.
- main/f6cf52c enviada. Nova matriz crítica e export Web em execução devido às regressões
  descobertas no teste real. Depois, gerar APK com mesmo certificado/ABIs usando caches,
  conferir, instalar no AVD dedicado e derivado compatível no Redmi, sem apagar dados.
  Nenhum outro ajuste Native/dependência/migration/RLS/OWNER/produção foi realizado.
- Automação do painel Google deixou de responder em duas leituras de navegação; nenhum
  segundo cliente Android foi criado, nem houve autorização para isso. Revalidar estado
  da aba antes de retomar. Após artefatos prontos, pendem aprovações específicas para
  callbacks da origem final, cliente Android do certificado beta e alterações sintéticas
  de leitura somente em QA B/dois arquivos permitidos. Não interpretar aprovação das
  duas URLs antigas como autorização ampla para outras mudanças. NO-GO permanece.


### 21/10/2026 — Beta.2 atualizada, preview público autorizado e recuperação limitada pelo serviço

- Código funcional main/f6cf52ce542f0332a4625b315381eb9533309826: typecheck PASS,
  80/80 suítes críticas PASS, export Web e verificação do export PASS. CI remoto
  39643844900 SUCCESS: https://github.com/matheusbitlab/Aldus/actions/runs/39643844900
- Preview dessa mesma versão READY, metadata/HTML/rotas/bundle conferidos:
  https://kindle-reader-oe05lf7iw-matheus-projects-70f48ed9.vercel.app
  dpl_3XYBQQcVszSvnywoRpASRwbKSiRL; JS SHA-256
  eba315153fdd839b425be7315849a02ee97831e63cacffcc58fbf9f36d115235.
- Cadastro autorizado: conta criada/confirmada no preview anterior, perfil ativo com
  username persistido após interação do proprietário, login por senha no preview f6cf52c
  e header autenticado preservado após reload. Tela intermediária do proprietário não
  foi capturada; encaminhamento do componente real tem regressão controlada antes/depois.
  Não registrar endereço, UUID, senha ou link privado nem duplicar a conta.
- Após autorização específica, incluídas APENAS as duas Redirect URLs da origem f6cf52c,
  /auth/callback e /auth/callback?next=reset-password. Total seis, quatro entradas anteriores
  e Site URL aldus://auth/callback preservados. Leitura posterior e screenshot conferidos.
- NOVA DECISÃO EXPLÍCITA DO PROPRIETÁRIO: tornar o projeto Vercel público, removendo a
  exigência de login Vercel para homologação. CLI oficial confirmou projeto kindle-reader
  /prj_zwDSZceLWCUigb4GedVycWAEQMIm e mudou SOMENTE ssoProtection preview para null.
  Git fork protection preservada; sem promoção/deploy de produção, mudança de RLS ou Auth
  do aplicativo. HTTP sem cookies/credenciais retornou200 na landing/login/callback/reset
  e shell Admin; navegador anônimo exibiu login Aldus e redirecionou /admin e /library
  à landing sem dados privados. A barreira Vercel não é mais requisito deste preview.
- Senha da conta principal recusada no Redmi e no Chrome isolado, inserida exclusivamente
  pelo proprietário. E-mail exato conferido na tentativa Native das17:58:59UTC: servidor
  retornou400/invalid_credentials antes de sessão/perfil. Conta única, confirmada, ativa,
  não banida, com credencial de senha e username presentes. Não afirmar falha exclusiva
  do Android nem verificar/registrar o valor da senha. Nenhuma senha redefinida pelo agente.
- Primeiro recovery principal autorizado foi aceito pela UI às18:03UTC; proprietário
  encontrou a barreira Vercel. Segundo envio especificamente autorizado, após tornar
  público, foi RECUSADO às18:12:29UTC com429/over_email_send_rate_limit; UI mostrou erro
  e não houve confirmação de envio/alteração de senha. Sem retry automático, aumento de
  limites, contratação/configuração SMTP, template ou outro ajuste Auth. Recovery Web
  continua BLOQUEADO. Não declarar e-mail enviado quando o serviço o recusou.
- Cliente Android adicional expressamente autorizado foi criado e lido de volta:
  Aldus Reader Beta - assinatura privada, ID
  712522561124-aoihj2tg6m9dvrask2o8ibe4mroeteak.apps.googleusercontent.com,
  com.aldus.reader, SHA-1 BC:6B:12:C9:C3:3E:6C:97:F9:FC:FD:96:73:E7:8A:D6:55:1F:61:96.
  Cliente Android antigo e Web preservados, sem mudança de secrets, público ou escopos.
  Cadastro não comprova consentimento/Drive funcional com a assinatura privada.
- APK final GERADO/VERIFICADO: C:\Kindle\artifacts\apk\Aldus-f6cf52c.apk,
  309.991.893 bytes, SHA-256016f7cf752596f9e7792b0c3c1ecaeda72009f83b0e3f8f235f4f0fc2802167e.
  com.aldus.reader,1.0.0-beta.2/code3, release não depurável, ARM64/ARMv7/x86_64, Drive/OCR
  e Hermes. Certificado privado SHA-2564adef0a46afa7f9d685a3ae7dba564379a5c9eb406a9452b05decdea11cb9875;
  bundle7.536.244 bytes/SHA-256868eca2f31b3a21e8536278e6c7575fd0aff8a72c459a1d81814bafd2f517ddf.
- Derivado SOMENTE para homologação no Redmi, NÃO DISTRIBUIR:
  artifacts/apk/Aldus-f6cf52c-redmi.apk,310.099.484 bytes,
  SHA-256f31c9d09c4d4f39a233fd104495f1ab94ba2de07977989681b97be98b8637adf.
  Payload não relacionado à assinatura idêntico ao beta; certificado antigo conferido
  contra APK realmente instalado antes de adb install -r. Hash instalado corresponde,
  primeira instalação preservada, sem uninstall/clear. Rede e manter acordado restaurados.
- Redmi Android16 FÍSICO, f6cf52c compatível: login Google original concluído pelo dono,
  identidade conferida na Conta,40 livros. Ajustes agora mostram ícone/título/seta na
  mesma linha, comprovados visualmente em redmi-settings-after.png. Reabertura a frio
  offline/sem Metro manteve sessão e40 livros; processo ativo, depois rede restaurada.
  Isso fecha regressão visual reproduzida, sem alegar certificação física TalkBack.
- Proprietário pediu priorizar Redmi/evitar Android Studio; AVD dedicado encerrado.
  Inicialização do APK privado f6cf52c NÃO executada no AVD/segundo aparelho. Falha anterior
  da tradução ARM no AVD refere-se ao22eb657 e permanece registrada; três ABIs no novo
  APK ainda não são prova de execução. Não instalar certificado incompatível no Redmi.
- Evidências sanitizadas em artifacts/beta-20261021/f6cf52c, matriz existente preservada.
  NO-GO mantido: recovery Web, grifo Native→Web, leitura prolongada no artefato final,
  runtime da assinatura privada e custódia externa ainda pendentes. Escritas de leitura
  somente nos dois arquivos sintéticos/QA B foram autorizadas; não usar40 livros ou
  QA A/Amêndoas como fixtures. Username-login/limiter, admissão e retenção continuam
  dependentes de aprovações/infraestrutura; nenhum deploy de função ou convite executado.


### 21/10/2026 — Landing cinematográfica Web com livro e particle morphing

- Implementação funcional 82be6a46788b3bbb2d9a90aeccb4b9fd88f2b418, main, com preview somente de homologação:
  https://kindle-reader-odm52odxt-matheus-projects-70f48ed9.vercel.app
  dpl_BxvqohCbqz67k6q14w3Dd3PB9NtV, READY; metadata/HTML/entry e chunk WebGL comparados byte a byte; HTTP público200. Sem promoção de produção, domínio ou mudanças Auth/Supabase.
- Three.js0.186.1 e tipos0.186.0; avisos MIT gerados pelo fluxo existente. Three puro escolhido por integrar um renderer descartável ao Expo Web sem adicionar R3F/GSAP ou outro scheduler React. Nada de modelos/texturas externos ou módulos Native.
- Um livro principal: capa/lombada/bloco de papel sólidos, quatro folhas subdivididas com curvatura no vertex shader, texturas Canvas próprias, sombras suaves e câmera perspectiva. Capas menores da Biblioteca são ilustrações internas, não livros principais separados.
- Sete cenas: formação do livro fechado, abertura, Biblioteca, Reader, estudo/flashcards, comunidade explicitamente em evolução, reconstrução/fechamento com CTA real. Superfícies se dissolvem e Points/BufferGeometry interpolam sete alvos estáveis na GPU. Nenhum vídeo, DOM por partícula ou biblioteca privada consultada.
- ScrollBookStory acompanha o contêiner real data-landing-scroll, eventos passivos, geometria em ResizeObserver e requestAnimationFrame sob demanda e sondas finitas de até24 quadros por capítulo/resize, sempre desenhando a mesma pose da rolagem. Sem relógio que avance a pose ou React state por frame; parar mantém a pose, voltar reconstrói a mesma pose. Skip/âncoras e rolagem nativa preservados.
- BookScene é importado dinamicamente apenas pela landing Web. Orçamentos: desktop4096 partículas/DPR≤1,5/sombras512; mobile1600/DPR≤1,25/sem sombras; perfil limitado900/DPR1. Redução adaptativa após frames lentos consecutivos. Pausa invisível/documento oculto e dispose de geometrias, materiais, texturas, sombra/contexto/listeners.
- Fallback HTML estático com capa e resumo semântico completo para reduced motion, Save-Data/perfil muito limitado, falha de inicialização ou perda WebGL; no-JS também navega. Sem trilha vazia obrigatória; conteúdo essencial fora do Canvas.
- Typecheck, export Web, metadata do export, pt-BR/marketing/SEO, contratos cinematográficos e 81/81 críticas PASS. Primeiro ensaio concorrente teve timeout180s em Battle; repetição serial sem ensaio gráfico PASS, sem alterar Battle nem aumentar timeout.
- Chromium ANGLE/SwiftShader na rodada inicial e D3D11 na matriz final: shader real, oito poses0/10/25/40/55/70/85/100%,72 amostras de viewport (360/390/430/768/1024/1440/1920 e extras320/landscape844), hold/reverse/wheel, descarte/remount, falha GPU/context loss, perfil limitado, reduced motion, no-JS, AX/teclado, menu, FAQ, login/cadastro, catálogo e guards Library/Admin e rotas legais PASS. Fixtures HTTP sintéticas; nenhuma conta real usada.
- Comparação sequencial contra bundle público anterior f6cf52c, hash conferido, mesmo Chromium/viewport/240 frames de ida e volta, sem builds/testes concorrentes. GPU POR SOFTWARE; não é prova de GPU física, Android, dispositivo modesto real ou garantia60FPS.
- 1440×1000: cadência total 6.9→8.4 FPS; p95 267.1→250.0ms; frames>50ms 233→226/240.
  Canvas ativo: 3.7FPS; fallback {"frame":8,"elapsedMs":4466.299999952316,"reason":"performance-limited"}; após fallback 8.8FPS. A média total que contém fallback NÃO representa3D contínuo.
  CPU TaskDuration 21.9→7.6s; heap JS 16.2→19.0MiB; loadEventEnd 5153.8→2671.2ms; primeira renderização 3D 1481.7ms; qualidade final adaptive-low.
- 390×844 emulado: cadência total 27.5→38.6 FPS; p95 66.7→66.7ms; frames>50ms 25→23/240.
  Canvas ativo: 16.5FPS; fallback {"frame":29,"elapsedMs":2081.100000023842,"reason":"performance-limited"}; após fallback 47.8FPS. A média total que contém fallback NÃO representa3D contínuo.
  CPU TaskDuration 5.9→1.9s; heap JS 16.1→25.3MiB; loadEventEnd 1899.5→1132.4ms; primeira renderização 3D 1483.5ms; qualidade final adaptive-low.
- Entry gzip anterior 1474393B, atual 1472020B (delta-2373B); chunk3D separado 850770B raw/200929B gzip, baixado sob demanda. Não requerido no reduced motion inicial nem pela entrada Native.
- Evidências ignoradas: .expo/cinematic-validation (capturas/results.json); artifacts/landing-cinematic (logs, paired/*.json e baseline de origem pública). Memória é heap JS amostrado, não VRAM total; contadores de dispose não certificam ausência universal de vazamentos.
- Permanecem: homologação em outros GPUs/mobile físico, domínio/canonical oficial e callbacks de um eventual novo domínio de preview não autorizados nesta missão. Sem novos testes físicos no Android, APK ou alterações Reader/Auth/Drive/Admin/Sync/RLS/migrations/pagamentos. Bloqueios beta anteriores continuam válidos; não declarar GO.
- Alterações locais preexistentes em .gitignore/PROJECT_CONTEXT.md/BUGS_ATUAIS.md preservadas por hash; somente estes acréscimos documentais entram no commit. Nenhum novo dossiê permanente.
- Sondas de cadência são contíguas e limitadas: não confundem a velocidade do mouse ou um intervalo frio de inicialização com GPU lenta. Regressões de gaps400ms, cadência alternada e um pico inicial seguido de60FPS; qualidade900/sem sombras e fallback estático efetivo em software. Primeiras medições insuficientes e falso positivo de cold gap preservados em paired-before-*; não usar esses resultados como prova de3D60FPS.
- A matriz visual força geometria WebGL via flag de QA para inspecionar cada pose; o orçamento de PRODUÇÃO foi exercitado separadamente sem essa flag. Após o último ajuste de orçamento, typecheck/export/marketing/contratos de cadência foram revalidados; suítes de Reader/Auth/Sync não foram modificadas.
- GPU de hardware local confirmada: ANGLE/D3D11 Intel HD Graphics520. Canvas ativo durante240/240 frames, sem fallback: desktop 57.5→56.9FPS (p95 16.8ms),390px 58.7→58.9FPS (p95 16.8ms). Não é teste físico Redmi nem promessa universal.
- Hardware1440×1000: cadência total 57.5→56.9 FPS; p95 16.8→16.8ms; frames>50ms 1→2/240.
  Canvas ativo: 56.9FPS; fallback não acionado; após fallback não aplicável. A média total que contém fallback NÃO representa3D contínuo.
  CPU TaskDuration 2.4→1.4s; heap JS 16.4→22.7MiB; loadEventEnd 1818.7→1144.6ms; primeira renderização 3D 1296.8ms; qualidade final desktop.
- Hardware390×844 emulado: cadência total 58.7→58.9 FPS; p95 16.8→16.8ms; frames>50ms 1→0/240.
  Canvas ativo: 58.9FPS; fallback não acionado; após fallback não aplicável. A média total que contém fallback NÃO representa3D contínuo.
  CPU TaskDuration 2.3→1.2s; heap JS 16.4→23.8MiB; loadEventEnd 1794.6→6630.7ms; primeira renderização 3D 779.0ms; qualidade final mobile.
- Commits: dependências/licenças 8ae2dcd21731377641823647afee36c503f5c12b, experiência/testes 82be6a46788b3bbb2d9a90aeccb4b9fd88f2b418. Navegador no preview real compilou WebGL e percorreu quatro cenas; fixtures Auth sintéticas, sem login ou escritas em conta real. Production deployment existente conferido inalterado após preview.
