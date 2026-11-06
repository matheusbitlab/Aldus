# Histórico — Interface pública, Admin, entrega e Drive (16/10)

> Registro cronológico.
> Texto preservado do PROJECT_CONTEXT.md original (2192 linhas, escrito pelo Codex), movido sem reescrita em 06/11/2026. Trate como hipótese: confira Git/código antes de confiar. O estado atual e as pendências estão em [PROJECT_CONTEXT.md](../../../PROJECT_CONTEXT.md).

## Interface pública, Aldus Admin e português brasileiro (16/10/2026)

IMPLEMENTADO localmente a partir de main/origin/main 44c1d45, inicialmente limpas e
alinhadas após fetch. Trabalho em C:\Kindle. Nenhuma migration, dependência nativa,
estrutura persistida, permissão remota ou conteúdo do Reader foi alterado nesta tarefa.

- Apresentação pt-BR centralizada em src/presentation/i18n/ptBR.ts: Gratuito/Pro,
  Proprietário/Administrador, permissões, concessões, estados, ações e configurações.
  Datas e números brasileiros; filtros DD/MM/AAAA e expiração DD/MM/AAAA HH:mm (UTC)
  convertem para os contratos ISO existentes com validação de datas reais. Nomes
  comerciais personalizados são preservados. IDs free/pro, OWNER/ADMIN, rotas,
  tabelas, chaves premium_, nomes de livros/autores e termos Reader/deck/flashcard/
  EPUB/PDF permanecem intactos. Auditoria AST cobre texto JSX e atributos visíveis
  literais em app/src; regressões de rótulos cobrem os enums dinâmicos conhecidos.
  A auditoria estática não certifica traduções de conteúdo externo arbitrário.
- Aldus Admin mantém as dez seções e o mesmo repository/RPC/MFA. Desktop com menu
  lateral recolhível e largura integral; celular com navegação expansível, indicadores
  adaptáveis, tabela de usuários semântica no desktop e cartões em telas pequenas.
  Foco, contraste, estados de seleção, confirmação rolável, feedback de envio e
  atualização dos dados após salvar foram refinados. Controles da revisão anterior
  são removidos enquanto o novo snapshot é consultado. Filtros e paginação conservados;
  busca da auditoria é explicitamente restrita à página carregada.
- Formulários reais existentes: conta ativa/desativada, concessão/revogação Pro e
  permissões adicionais, catálogo/preços/franquias/propostas, configurações/revisões/
  restauração e associação/delegação/revogação administrativa. Nenhuma ação concede
  acesso somente pelo frontend. Mutação continua exigindo servidor, MFA recente,
  motivo, confirmação, revisão e identificador idempotente. Não há acesso administrativo
  ao conteúdo privado da biblioteca. Pro não concede papel administrativo.
- Métricas: cadastros por dia e distribuição atual de planos usam somente o snapshot;
  dados vazios não geram gráficos fictícios. Acessos não são chamados de usuários ativos.
  Receita mensal/anual/total, conversão, cancelamentos e histórico de pagamentos exibem
  “Aguardando integração de pagamentos.” Concessão manual não é venda. Crescimento
  histórico de Storage e sondas operacionais ausentes são declarados indisponíveis.
  Repository rejeita métricas incompletas, evitando zeros inventados; média de bytes
  fracionária válida é formatada sem confundir tamanho real de arquivo com média.
- Landing pública exclusiva Web em app/index.web.tsx e src/marketing, sem novo framework
  ou biblioteca de animação. Cabeçalho/mobile menu, hero, prévia ilustrativa interativa,
  recursos, etapas, planos, perguntas frequentes e rodapé legal. Entrar/Criar conta usam
  Auth real; visitante autenticado tem acesso à biblioteca. Contratação Pro desabilitada,
  preço indefinido explícito, nuvem em ativação e recursos sociais em homologação.
  Leitura local continua gratuita. FAQ distingue offline Android de carregamento inicial
  Web. Não foram inventados clientes, depoimentos, faturamento ou disponibilidade remota.
- Catálogo público anônimo: referência inicial GERADA da migration SaaS imutável por
  scripts/generate-public-catalog.cjs, validada pelo parser CatalogPlan existente.
  Não é permissão, uso da conta ou consulta ao catálogo atual de produção. Usuário com
  sessão elegível consulta readCatalog() existente e recebe mudanças do backend.
  A referência inicial é identificada na página; não há API pública de catálogo criada,
  grant novo ou migration. Free 100/500 MiB e Pro 2.000/10 GiB permanecem configuração
  comercial, sem garantia de capacidade agregada no Supabase Free nem oferta Pro ativa.
- Entrada Native app/index.tsx conservada. Root Web pública não fica no frame de celular
  nem inicia Library Sync; demais rotas mantêm os guards e o mesmo coordenador. Menu de
  três pontos da Biblioteca e exportação em Ajustes preservados: não foi reintroduzido
  botão grande “Opções de…” ou “Backup da organização” na Biblioteca.
- Animações CSS leves, entrada/revelação por rolagem, realces e hover/foco. Sem rolagem
  artificial; respeita prefers-reduced-motion, inclusive mudança durante a sessão.
  Prévia tem navegação por teclado, tabs/arrow/Home/End, temas ilustrativos e dados
  explicitamente demonstrativos. Não apresenta biblioteca pessoal na página pública.
- SEO: export:web gera HTML público indexável usando o MESMO LandingDocument, mesmo
  sem JavaScript. Rotas privadas usam app.html sem conteúdo de marketing e noindex;
  rewrites Vercel preparados localmente. Título, descrição, Open Graph, idioma pt-BR,
  robots e imagem própria public/aldus-share.png. EXPO_PUBLIC_SITE_URL valida origem
  HTTP(S) sem credenciais/caminho/query e habilita canonical/sitemap/imagem absoluta.
  Domínio não foi inventado: configuração definitiva continua pendente. Contato legal
  usa somente a configuração pública existente. Sem pixels, analytics ou deploy.

Validação: typecheck, export Web e matriz crítica 69/69 PASS. Inclui Auth, SaaS/quotas,
Library/SQLite/outbox, Admin, EPUB/PDF/Reflow/OCR, Community, Flashcards e Battle. Novas
suítes test-pt-br, test-admin-presentation e test-marketing integradas à matriz. Export
verificado também por test-web-build --exported. Chromium Admin PASS: dez áreas, TOTP
sintético certo/errado, papel delegado, Pro negado, formulários, revogação, offline e
desktop/mobile, incluindo leitura atrasada após salvar.
Ambos os temas administrativos, claro e escuro, foram conferidos no Chromium; preferência
salva foi usada para testar o tema, sem inferir cobertura de troca de tema do sistema.
Chromium marketing PASS em
320/360/430/768/1024/1440/1920: HTML sem JS, login/cadastro/biblioteca, catálogo autenticado
alterado, rotas protegidas/Admin negado, menu, FAQ, teclado, foco e redução de movimento.
SaaS Web e Library Web PASS (importação EPUB real sintética offline, duas origens
IndexedDB, upload reservado, download/Reader, remoção local e outbox). Auth/HTTP/TOTP e
Storage dos ensaios são controlados; SQL em PGlite não comprova serviço gerenciado nem
concorrência PostgreSQL entre sessões independentes. Nenhuma escrita remota executada.

Redmi USB Android 16: alterações JS recebidas pelo debug já instalado via Metro. Entrada
continua Biblioteca; Meu Plano/Comparar com indisponibilidade/retry/retorno e acesso
direto Admin negado/indisponível foram exercitados fisicamente. Não é prova do painel
OWNER autorizado ou de SaaS remoto. Biblioteca com 36 livros preservada. Capturas e
relatórios locais ignorados em .expo/marketing-validation, .expo/admin-validation e
.expo/redmi-qa; capturas administrativas identificam dados sintéticos. Nenhum APK foi
gerado ou instalado nesta tarefa; código nativo intacto. Debug usa Metro; distribuição
Android futura precisa incorporar o novo bundle em build próprio autorizado.

Pendências: recuperação do backup real, implantação incremental e validação autenticada
Auth/RLS/Storage, bootstrap OWNER específico, TOTP real do proprietário, domínio/contato
institucional definitivos e publicação Web autorizada. Produção não foi modificada.
Continuar na main; não abrir janela de senha, aplicar migrations, conceder OWNER, ativar
pagamentos ou publicar automaticamente em tarefas de interface.

### Livro 3D interativo da landing — 16/10/2026

- Implementação Web a partir da main 761c28d, alinhada ao remoto após fetch. Os dois
  documentos oficiais já continham registros operacionais posteriores; essas alterações
  foram preservadas separadamente das mudanças de interface desta etapa.
- ScrollBookStory substitui a prévia por UM livro: capa verde com espessura, lombada,
  miolo/arestas, marcador terracota e quatro folhas com quatro segmentos conectados cada.
  Faces frente/verso e dobradiças em preserve-3d, sem imagem esticada, vídeo, canvas ou
  dependência gráfica nova. Biblioteca, Reader, estudo, planos e convite final aparecem
  impressos nas páginas; conteúdo demonstrativo identificado e sem bibliotecas privadas.
- bookMotion.ts contém a geometria pura, contínua e reversível. Progresso calculado pelo
  scrollTop da região data-landing-scroll/.al-page-scroll e posições reais da trilha,
  cabeçalho e sticky. Eventos passivos/RAF sob demanda e ResizeObserver; nenhuma animação
  autônoma ou atualização React por frame. Parar mantém a pose; voltar ao topo fecha.
- Navegação explícita por etapas e opção Pular demonstração. Legenda acessível anuncia
  somente mudanças de capítulo; geometria duplicada oculta da árvore assistiva. Redução
  de movimento elimina a trilha longa e usa composição estática com navegação, inclusive
  se a preferência mudar durante a visita. Sem JS: livro estático/conteúdo indexável,
  instrução pt-BR, fallback de redução de movimento e demais seções disponíveis.
- Desktop, celular, tablet e telas baixas usam proporções coerentes; paisagem curta
  apresenta duas colunas. Bordas reais das folhas, inclusive curvas, foram verificadas
  contra título, viewport e cabeçalho. Nenhum bloqueio ou interceptação da rolagem nativa.
- Planos usam o MESMO CatalogPlan recebido pela landing e a referência inicial gerada
  existente, sem copiar limites para regras novas. Gratuito conserva Sync/Storage; Pro
  sem contratação/preço inventado. Franquia não é uso real nem promessa de infraestrutura.
- Metro passou a excluir somente artifacts da raiz do projeto, além de dist; entregas
  locais não pertencem ao grafo runtime. Regressão preserva pastas homônimas de dependências.
- Gates locais: typecheck, export Web e 69/69 críticas; SSR/geometria/pt-BR e Chromium com
  roda nativa, scroll real interno (window.scrollY permanece zero), pausa, reversão,
  botões/teclado, redução de movimento em runtime/sem JS, Auth/SEO e rotas protegidas.
  Dez viewports: 320x568/800, 360x800, 430x932, 768x1024, 844x390, 1024x800, 1440x540/1000
  e 1920x1080. Ensaios HTTP/Auth controlados; não comprovam sessões reais do Supabase.
- Capturas locais ignoradas em .expo/marketing-validation: landing-desktop/mobile,
  book-library/reader/study/plans/final e book-nojs-reduced-motion. Nenhum novo deploy,
  alteração Supabase, bootstrap, cobrança, APK ou teste físico Android nesta etapa.
  Entrada Native e Reader intactos; não exige recompilação nativa para esse recurso Web.

### Entrega consolidada de 16/10/2026 — commit 761c28d

- main local/remota confirmada em 761c28d529ef4dea0fb36bc200cc03725d3f25ad;
  worktree limpo no início e durante os builds. Nenhum commit/push nesta entrega.
- Gates: typecheck, export Web de produção, test-web-build --exported e 69/69
  suítes críticas PASS. Export em C:\KIndle\dist, dirty=false;
  contentSha256 b0ce3977d7a4dff9368d2efdbc1be800f8143011f72f62f6a5b180784dd3f22a.
- Preview autorizado: https://kindle-reader-77tpwi5bw-matheus-projects-70f48ed9.vercel.app
  READY, projeto kindle-reader. Proteção de preview ativada com autorização explícita;
  exige autenticação Vercel. Metadados remotos conferem commit/hash; HTML corresponde
  ao export acrescido da barra Vercel. Sem promoção à produção ou alterações Supabase.
- APK via pipeline local existente, BUILD SUCCESSFUL em 23m34s. Arquivo arquivado:
  C:\KIndle\artifacts\apk\Aldus-761c28d.apk, 345532846 bytes (329,5 MiB),
  SHA256 180CF948781188CEB8E4856DC6FCDE0D238C0045D0C73E1ECFE2C571E5F52D58.
  com.aldus.reader 1.0.0/build 1; release não debuggable, bundle incorporado e
  assinatura válidos. Usa a chave debug existente, igual à instalação anterior;
  isto não estabelece uma chave privada exclusiva para distribuição pública.
- Redmi: adb install -r Success, sem desinstalação/limpeza. Hash instalado igual
  ao arquivado e primeira instalação preservada. MainActivity abriu com Status ok;
  não equivale a repetir QA funcional nem comprovar conteúdo da biblioteca.
  Cópia USB em /sdcard/Download/Aldus-761c28d-180cf948.apk, hash igual.
- Sem URL HTTPS de APK: credencial GitHub de publicação indisponível e nenhuma
  ferramenta disponível de upload de Release/artifact. Arquivo acessível localmente
  no computador e no Downloads do Redmi. Não foi criada hospedagem pública.
- Evidências compactas: artifacts/delivery-761c28d/apk-integrity.json e logs locais;
  build: artifacts/apk/build-761c28d-20261016170035008.log. Não compartilhar a pasta
  interna web-preview/.vercel, que contém estado de autenticação da CLI.
- Pendentes: hospedagem privada do APK, domínio definitivo, implantação/validação
  remota SaaS/Admin e pendências funcionais já registradas. Nenhuma migration,
  concessão OWNER ou ativação de pagamentos executada.

### Dashboard remoto — implantação autorizada em 16/10/2026

Esta continuação recebeu autorização explícita para backup privado, quatro incrementais
e bootstrap OWNER. Substitui o estado de backend pendente da entrega acima; não autoriza
pagamentos, publicação Web em produção ou mudanças gerais de Auth.

- Backup lógico REAL completo (PostgreSQL 17.6), papéis sem senhas e cópia física do
  único objeto Storage em pasta fora do Git, restrita ao usuário Windows/SYSTEM:
  C:\Users\supor\.aldus-private\cmivracxuihtmsbmtuec\backup-20261016T202132Z.
  Conexão direta com TLS verify-full e CA oficial Supabase. Credencial local cifrada
  com DPAPI; nunca colocar credenciais/backup no repositório, chat ou artefatos públicos.
- Restauração isolada local PostgreSQL 17.11: 46 tabelas com contagens e fingerprints
  de conteúdo iguais à origem, objeto Storage com 542723 bytes e SHA256 conferido.
  As quatro migrations passaram sobre a cópia real; auth.users, profiles, biblioteca
  e objetos originais preservados. Extensão gerenciada Vault excluída do ensaio Windows
  (zero segredos confirmado), arquivo completo preservado. Papéis locais sem login;
  não recria serviços Supabase Auth/Storage nem comprova recuperação gerenciada completa.
- Quatro migrations originais aplicadas via conector, sem editar fontes ou reaplicar
  históricos. Mapeamento de versões REAIS retornadas pelo serviço:
  20261016203037 -> 20261015160539_library_active_account_fences.sql;
  20261016203128 -> 20261015190705_saas_plans_entitlements.sql;
  20261016203152 -> 20261015194604_aldus_admin.sql;
  20261016203214 -> 20261015215745_saas_quota_reservations.sql.
  Não usar db push/repair automático para alinhar esses prefixos: consultar o relatório
  artifacts/dashboard-deployment/remote-migrations.json, que registra nomes e SHA256.
  Os três históricos 20261015144958/145012/145018 foram conservados. O script original
  saas-deployment-preflight.cjs é planejamento anterior, não consulta o estado implantado.
- Cada incremento conferido contra os dados anteriores: 45 tabelas existentes preservadas
  (ledger excluído da comparação por receber novas entradas). Permanecem duas contas,
  41 registros de biblioteca e um objeto. Ambas as assinaturas permanecem Free.
- OWNER concedido somente à conta matheusborbaifc@gmail.com após reconfirmar UUID,
  e-mail verificado e perfil ativo. Bootstrap existente usado, uma auditoria de sucesso;
  nenhum papel legado foi promovido nem plano Pro concedido. Schema PostgREST recarregado.
- Verificações remotas: RPC Admin anônima HTTP 401/42501, sem dados; seis tabelas Admin
  com RLS; schemas privados sem USAGE para anon/authenticated; RPCs Admin SECURITY DEFINER
  com search_path vazio. Advisor sem ERROR: avisos de RPCs definer intencionais, RLS sem
  políticas em tabelas fechadas e proteção de senhas vazadas desativada no provedor;
  nenhum ajuste genérico de segurança/Auth foi aplicado por inferência.
- Frontend: preview protegido ATUAL, READY:
  https://kindle-reader-1h5tmo1j5-matheus-projects-70f48ed9.vercel.app/admin.
  Sem novo bundle/export/APK. Houve redeploy estático do export 761c28d para corrigir
  /admin e /auth/login, que retornavam 404 no preview inicial. CLI 62.5.0 com --cwd
  carregava configuração do cwd original enquanto enviava arquivos da pasta preparada.
  Solução conferida: executar CLI com workdir REAL na pasta preparada, sem --cwd;
  configuração estática gerada com rewrites para app.html, cleanUrls=false, sem build
  remoto de JS. Sem alteração do vercel.json versionado ou publicação em produção.
  /admin HTTP 200, HTML exato do app (mais toolbar Vercel), commit/contentSha256 remoto
  iguais ao export. Login Vercel concluído; formulário Aldus carregado e aba aberta.
  O preview antigo 77tpwi5bw não deve ser usado como link operacional de /admin.
  Validar sessão real do proprietário,
  leituras do painel e enrollment/verify TOTP do próprio usuário antes de declarar fluxo
  administrativo completo. Não ler/copiar chave TOTP nem inserir fatores sintéticos.
- Evidências sem credenciais: artifacts/dashboard-deployment/deployment-result.json,
  recovery-summary.json, remote-preflight.json e remote-migrations.json. BACKEND IMPLANTADO;
  login/TOTP real, testes remotos A/B/disabled e piloto Storage/concorrência ainda pendentes.

### Sessão OWNER real e correção do menu autenticado — 16/10/2026

- Login real confirmado no preview 1h5tmo1j5: /admin abriu Visão Geral, papel Proprietário,
  métricas reais do servidor e aviso de alterações bloqueadas sem TOTP. Nenhuma operação
  administrativa foi exercitada por inferência dessa leitura. TOTP real ainda pendente.
- Landing mantinha links “Entrar” fixos em desktop/mobile mesmo com CTA de biblioteca
  autenticado. Corrigidos com !signedIn no LandingDocument.tsx; acesso à biblioteca mantido.
- Havia trabalho paralelo de animação/livro na landing. Preservado integralmente no worktree;
  o export desta correção foi isolado em C:\AldusBuilds\landing-auth-761c28d, a partir de
  761c28d + somente duas linhas de correção. Sem commit/push, build-info dirty=true declarado.
  Não publicar o restante do worktree por inferência desta entrega.
- PASS: marketing SSR, visitante com dois links Entrar e autenticado com zero, typecheck,
  export Web e test-web-build --exported. Bundle compilado conferido; trabalho paralelo
  excluído. Hash do JS servido e metadados remotos iguais ao export corrigido.
- Preview ATUAL protegido, READY:
  https://kindle-reader-3e4kgte0a-matheus-projects-70f48ed9.vercel.app/admin.
  Formulário Aldus verificado e aba aberta. Origem nova requer novo login Aldus para
  conferir o cabeçalho autenticado no navegador; sessão anterior preservada em outra aba.
  O preview 1h5tmo1j5 permanece evidência da leitura OWNER, mas não contém a correção do menu.
- Evidência: artifacts/dashboard-deployment/header-auth-result.json e header-auth.patch.
  Fonte principal contém a correção junto ao trabalho paralelo existente; APK não alterado.

### Drive e Minhas bibliotecas — preparação funcional de 16/10/2026

- Núcleo local: busca completa e validada em memória (prepare), seguida de commitPrepared
  no coordenador existente, sem segunda varredura. A operação correlaciona autorização,
  verificação da pasta, paginação, livros/pastas encontrados, organização e gravação;
  diagnósticos aceitam somente ID de operação, horário/duração, contadores e códigos seguros.
- Cancelamento e respostas tardias: gerações por fonte e sessão, escrita serializada,
  rollback SQLite dentro da transação e abort IndexedDB antes do commit. Uma gravação já
  confirmada não é desfeita por cancelamento posterior. Falha recuperável de salvamento
  admite nova tentativa explícita usando o índice preparado, sem retry automático.
- Cadastros existentes permanecem na mesma chave e com os mesmos IDs. Novas fontes têm
  ownerId local; contas autenticadas só consultam seus cadastros. Legados sem proprietário
  exigem revisão local e vinculação explícita, sem adoção automática. Troca A/B/A limpa
  imediatamente fontes, catálogos em memória, autorizações e resultados de pesquisa.
- Edição interrompida preserva o índice anterior; a identidade impede mostrar associações
  antigas para uma pasta/endereço alterado. Falha na gravação restaura condicionalmente
  a configuração anterior, sem sobrescrever edição mais recente nem apagar livros pessoais.
- Validação física: ADB sem aparelhos na execução atual; conexão USB/desbloqueio solicitados
  ao proprietário. A fonte real Teste não foi aberta, alterada, excluída ou recriada.
  Contagem atual do Redmi e resultado real da indexação não verificados; última evidência
  física anterior de 36 livros não foi reinterpretada como contagem atual.
- A causa raiz física do carregamento permanente continua INCONCLUSIVA até uma operação
  real autorizada no Redmi. Não encerrar BUG-03 por melhorias de UI ou fixtures HTTP.
  Nenhuma alteração remota, concessão de privilégios, cobrança, deploy ou APK nesta execução.
