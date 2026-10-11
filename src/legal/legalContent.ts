import {
  controllerDescription,
  LEGAL_EFFECTIVE_DATE,
  LEGAL_REVIEW_STATUS,
  LEGAL_DOCUMENT_VERSION,
  legalContactDescription,
} from "./legalConfig";

export interface LegalLink {
  label: string;
  url: string;
}

export interface LegalSection {
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
  links?: LegalLink[];
}

export interface LegalDocument {
  title: string;
  subtitle: string;
  sections: LegalSection[];
}

const identitySection: LegalSection = {
  heading: "Responsável e contato",
  paragraphs: [controllerDescription(), `Canal legal e de privacidade: ${legalContactDescription()}`],
};

const versionSection: LegalSection = {
  heading: "Versão deste documento",
  paragraphs: [
    `Versão ${LEGAL_DOCUMENT_VERSION}, vigente a partir de ${LEGAL_EFFECTIVE_DATE}.`,
    LEGAL_REVIEW_STATUS + ". O texto descreve a implementação técnica observada nesta versão e poderá ser atualizado após revisão jurídica ou mudança do serviço.",
  ],
};

export const privacyDocument: LegalDocument = {
  title: "Política de Privacidade",
  subtitle: "Como o Aldus Reader trata dados nesta versão.",
  sections: [
    {
      heading: "Fonte Google Drive opcional",
      paragraphs: [
        "Conectar Drive é uma autorização separada do login Aldus. Solicitamos drive.readonly, que permite ler e baixar arquivos de todo o Drive, embora o aplicativo consulte somente a pasta cadastrada e baixe apenas livros escolhidos. Não enviamos livros nem alteramos arquivos no Drive.",
        "O Google recebe autorização, IDs da pasta/arquivos e pedidos normais de conexão/listagem/download. Nomes, IDs, formato, tamanho e datas compõem um catálogo de metadados que pode permanecer localmente em SQLite no aplicativo nativo ou IndexedDB na Web, inclusive após fechar o app. A busca nesta biblioteca é local. Indexar não baixa EPUB/PDF; o download acontece somente por ação de importação. Capas remotas de outras fontes podem gerar pedidos de imagem. Não enviamos esses catálogos ao Supabase nem sincronizamos livros entre aparelhos.",
        "Tokens Drive ficam somente em memória do app; não salvamos refresh tokens. Google Play Services pode manter cache de autorização no sistema Android. Expiração exige reconexão para atualizar/baixar, não para ler o catálogo local. Desconectar limpa autorização e cache em memória, mantendo o último catálogo local; remover a fonte elimina configuração, catálogo local e vínculos remotos. Livros já importados, arquivos, capas, progresso e anotações permanecem. Tentamos revogar o acesso Google; se não confirmado, remova o acesso nas conexões da conta Google. Revogar pode afetar outras fontes da mesma conta/projeto.",
      ],
    },
    {
      heading: "1. Escopo e transparência",
      paragraphs: [
        "Esta política cobre o aplicativo Aldus Reader, incluindo autenticação, biblioteca local, leitura, estudo e pesquisa em catálogos. Ela não transforma todos os tratamentos em consentimento e não substitui avisos específicos que possam ser necessários.",
        "A implementação atual foi auditada a partir do código do projeto. Configurações externas e práticas operacionais do ambiente de produção ainda precisam de validação antes de uma publicação comercial.",
      ],
    },
    identitySection,
    {
      heading: "2. Dados de conta e autenticação",
      bullets: [
        "Email, identificador da conta, nome de usuário, nome de exibição e, quando informado, avatar.",
        "Provedor de autenticação, estado da conta, função e liberações individuais de recursos.",
        "Sessão e credenciais técnicas de acesso administradas pelo SDK do Supabase e armazenadas no dispositivo. O Aldus não deve exibir nem registrar senhas ou tokens em texto aberto.",
        "No login com Google, dados de identidade disponibilizados pelo Google e necessários para concluir a autenticação.",
      ],
      paragraphs: [
        "O Supabase processa a autenticação e o perfil remoto. O Google participa no login Google, quando escolhido, e separadamente na autorização opcional da fonte Google Drive. A configuração efetiva, a região de hospedagem e os contratos desses provedores devem ser confirmados pelo operador do serviço.",
      ],
    },
    {
      heading: "3. Biblioteca e leitura no dispositivo",
      paragraphs: [
        "Livros importados, arquivos EPUB/PDF, capas, capítulos extraídos, cache de reflow, metadados, progresso, posição, histórico de pesquisa e preferências ficam no armazenamento local do dispositivo ou navegador nesta versão. Não há sincronização da biblioteca nem envio automático desses arquivos a um armazenamento em nuvem do Aldus.",
        "Quando a pessoa escolhe reconhecer o texto de um PDF no Android, as páginas necessárias são renderizadas e processadas no próprio aparelho pelo ML Kit Text Recognition com modelo latino incluído no aplicativo. O arquivo, as imagens das páginas e o texto reconhecido não são enviados pelo Aldus nem pelo ML Kit a servidores para executar o OCR.",
      ],
      bullets: [
        "Título, autoria, nome, tipo, tamanho e hash do arquivo, datas e contagens técnicas.",
        "Favoritos, coleções, etiquetas, série, volume e estado de leitura.",
        "Tema, tipografia, margens, brilho, modo de PDF e outras preferências do leitor.",
        "Marcadores, notas, grifos, trechos destacados, comentários e respectivas posições no livro.",
      ],
    },
    {
      heading: "4. Pesquisa, fontes e serviços externos",
      paragraphs: [
        "Ao pesquisar em um catálogo, a consulta é enviada diretamente à fonte escolhida. Podem ser usados Gutendex, Project Gutenberg e fontes JSON, OPDS ou HTML cadastradas pela própria pessoa. A origem recebe dados usuais de conexão, como endereço IP, data, cabeçalhos e a consulta, conforme suas próprias regras.",
        "Downloads são obtidos diretamente da origem indicada. BibliON e MEC Livros são abertos em uma visualização web; a interação dentro dessas páginas é regida pelos respectivos serviços. O histórico de busca do Aldus permanece local.",
      ],
    },
    {
      heading: "5. Sensores, diagnósticos e permissões",
      paragraphs: [
        "Se o recurso anti-enjoo for ativado em Android compatível, amostras de movimento são usadas em memória para posicionar indicadores visuais. O código auditado não persiste nem envia essas amostras; apenas a preferência de ativação é salva localmente.",
        "O SDK do ML Kit pode contatar serviços do Google para correções, informações de compatibilidade de aceleradores e métricas de desempenho e uso. O modelo de OCR desta versão é empacotado no aplicativo e não precisa ser baixado para reconhecer texto; o conteúdo e o resultado do OCR permanecem no dispositivo. As divulgações de segurança de dados e os termos do fornecedor devem ser revistos antes da publicação.",
        "Há diagnósticos técnicos opcionais, desativados por padrão, que escrevem no console campos previamente permitidos sobre autenticação, busca, leitura, reflow e sensores. Não foram encontrados SDKs próprios de publicidade, analytics ou crash reporting. Logs do sistema operacional, da hospedagem e dos provedores externos devem ser avaliados separadamente.",
      ],
    },
    {
      heading: "6. Finalidades",
      bullets: [
        "Criar e proteger a conta, manter a sessão e controlar o acesso a recursos.",
        "Importar, organizar e exibir livros; salvar progresso, preferências e materiais de estudo.",
        "Executar pesquisas e downloads solicitados em catálogos externos.",
        "Investigar falhas técnicas quando diagnósticos forem deliberadamente habilitados.",
      ],
    },
    {
      heading: "7. Bases legais",
      paragraphs: [
        "Conforme a operação e o contexto, o tratamento poderá se apoiar na execução de contrato ou de procedimentos solicitados pela pessoa, no cumprimento de obrigação legal, no exercício regular de direitos, em interesse legítimo sujeito a avaliação e salvaguardas, ou em consentimento específico quando essa for a base adequada. A Política de Privacidade não é um consentimento geral.",
        "O enquadramento definitivo por operação, inclusive para menores de idade e eventuais dados sensíveis, depende de revisão jurídica antes da oferta comercial.",
      ],
    },
    {
      heading: "8. Compartilhamento e transferências",
      bullets: [
        "Supabase: autenticação e perfil.",
        "Google: autenticação escolhida pela pessoa e autorização/consultas/downloads da fonte Drive, quando conectada.",
        "Catálogos, sites e serviços escolhidos: consulta, navegação e download solicitado.",
        "Autoridades ou terceiros quando houver fundamento e obrigação jurídica aplicável.",
      ],
      paragraphs: [
        "Provedores podem operar infraestrutura em outros países. A localização, os mecanismos de transferência internacional e as garantias contratuais ainda precisam ser confirmados na implantação de produção.",
      ],
    },
    {
      heading: "9. Retenção, exclusão e segurança",
      paragraphs: [
        "Dados locais permanecem enquanto estiverem no armazenamento do aplicativo ou navegador, até serem removidos pela própria funcionalidade disponível, pela limpeza do armazenamento ou pela desinstalação. Alguns fluxos usam exclusão lógica e backups exportados permanecem sob controle de quem os criou.",
        "O projeto ainda não define um prazo formal único para dados remotos nem oferece exclusão de conta dentro do aplicativo. Esses pontos, inclusive procedimentos de backup e atendimento manual, precisam ser definidos antes da operação comercial.",
        "São empregados controles técnicos presentes no projeto, como armazenamento isolado pelo sistema, validações de entrada e regras de acesso preparadas para o backend. Nenhum sistema é infalível, e a aplicação efetiva das regras remotas precisa ser verificada no ambiente de produção.",
      ],
    },
    {
      heading: "10. Direitos da pessoa titular",
      paragraphs: [
        "A LGPD prevê direitos que podem incluir confirmação de tratamento, acesso, correção, anonimização, bloqueio ou eliminação nos casos cabíveis, portabilidade quando regulamentada, informação sobre compartilhamentos, revisão de decisões automatizadas e revogação do consentimento quando ele for a base utilizada.",
        `Solicitações devem usar o canal indicado em “Responsável e contato”. Enquanto o canal dedicado não estiver publicado, esta versão não deve ser apresentada como pronta para operação comercial sem uma alternativa válida de atendimento.`,
      ],
    },
    {
      heading: "11. Crianças e adolescentes",
      paragraphs: [
        "O aplicativo não possui, nesta versão, fluxo específico de verificação de idade ou consentimento parental. O tratamento de dados de crianças e adolescentes exige avaliação e controles próprios antes de direcionar o serviço a esse público.",
      ],
    },
    {
      heading: "12. Legislação de referência",
      paragraphs: [
        "O texto considera a Lei nº 13.709/2018 (LGPD) e, quando aplicável ao serviço, a Lei nº 12.965/2014 (Marco Civil da Internet). A referência a essas normas não é uma certificação de conformidade.",
      ],
      links: [
        { label: "LGPD — texto compilado no Planalto", url: "https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm" },
        { label: "Marco Civil da Internet — Planalto", url: "https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2014/lei/l12965.htm" },
      ],
    },
    versionSection,
  ],
};

export const termsDocument: LegalDocument = {
  title: "Termos de Uso",
  subtitle: "Regras iniciais para usar o Aldus Reader.",
  sections: [
    { heading: "1. Aceitação", paragraphs: ["Ao criar uma conta ou usar o Aldus Reader, você declara que leu estes Termos e a Política de Privacidade. Essa declaração não substitui consentimentos específicos exigidos para tratamentos que dependam de consentimento."] },
    { heading: "2. Objeto e estágio do serviço", paragraphs: ["O Aldus Reader é um leitor, organizador, ferramenta de descoberta e ferramenta de estudo. Seu objetivo é facilitar a leitura de obras em domínio público, conteúdos disponibilizados por fontes autorizadas e arquivos obtidos legalmente pela própria pessoa.", "O aplicativo está em implantação inicial. Recursos podem mudar, falhar ou permanecer indisponíveis, e algumas integrações dependem de configuração externa ainda não concluída. O serviço não é apresentado como certificadamente compatível com toda exigência jurídica ou técnica."] },
    { heading: "3. Conta", paragraphs: ["Você deve fornecer informações corretas, proteger suas credenciais e comunicar uso não autorizado pelo canal disponível. Uma conta pode ser limitada quando necessário para segurança, cumprimento legal ou prevenção de abuso, com análise proporcional ao caso."] },
    { heading: "4. Uso permitido", bullets: ["Ler e organizar arquivos aos quais você tenha acesso legítimo.", "Criar anotações e materiais de estudo próprios.", "Consultar e baixar obras oferecidas legalmente pelas fontes escolhidas.", "Usar os recursos sem prejudicar terceiros, a infraestrutura ou a segurança do serviço."] },
    { heading: "5. Uso proibido", bullets: ["Violar direitos autorais, privacidade, segredo, marcas ou outros direitos.", "Contornar controles de acesso, explorar vulnerabilidades ou interferir no serviço.", "Distribuir malware, conteúdo ilícito ou material cuja disponibilização não esteja autorizada.", "Usar automação de forma incompatível com limites, termos ou robots.txt das fontes consultadas."] },
    { heading: "6. Conteúdo do usuário", paragraphs: ["Você mantém os direitos sobre arquivos, notas, grifos e outros materiais que cria ou importa. Você é responsável por ter autorização para usá-los. O Aldus recebe apenas as permissões técnicas necessárias para processar localmente o conteúdo na funcionalidade solicitada."] },
    { heading: "7. Livros, domínio público e fontes externas", paragraphs: ["Resultados, capas, descrições, arquivos e páginas externas são fornecidos por terceiros. Disponibilidade em um catálogo não garante domínio público, licença ou autorização em sua jurisdição. Mesmo quando a obra original está em domínio público, uma tradução, edição, ilustração ou apresentação pode ter proteção própria. Verifique os direitos aplicáveis antes de baixar, copiar ou compartilhar."] },
    { heading: "8. Propriedade do aplicativo", paragraphs: ["O software, a identidade visual e os elementos próprios do Aldus são protegidos conforme a legislação e as licenças aplicáveis. Componentes de terceiros permanecem sujeitos às licenças indicadas em “Licenças de terceiros”. Estes Termos não transferem propriedade intelectual."] },
    { heading: "9. Privacidade", paragraphs: ["O tratamento de dados é descrito na Política de Privacidade. Biblioteca e leitura são predominantemente locais nesta versão; conta e certas partidas usam serviços remotos. Não interprete a aceitação destes Termos como consentimento geral para qualquer tratamento."] },
    { heading: "10. Recursos experimentais", paragraphs: ["Reflow de PDF, sensores, catálogos e diagnósticos podem depender do aparelho, da rede ou de serviços externos. Resultados de extração, paginação e pesquisa podem conter erros. Preserve os arquivos originais e backups importantes."] },
    { heading: "11. Disponibilidade e alterações", paragraphs: ["O serviço pode ser atualizado, suspenso ou descontinuado. Quando uma mudança material exigir aviso ou nova manifestação, o procedimento adequado deverá ser adotado. Alterações não devem retroagir para retirar direitos já adquiridos."] },
    { heading: "12. Isenção limitada", paragraphs: ["O Aldus é uma ferramenta de leitura e não fornece aconselhamento jurídico, educacional ou profissional. Nada nestes Termos exclui garantias ou responsabilidades que não possam ser afastadas pela legislação aplicável."] },
    { heading: "13. Responsabilidade", paragraphs: ["Eventual responsabilidade será analisada conforme a lei, a natureza do dano, a conduta das partes e os limites que possam ser validamente aplicados. Não há renúncia a direitos do consumidor nem exclusão antecipada de responsabilidade obrigatória."] },
    { heading: "14. Encerramento", paragraphs: ["Você pode deixar de usar o aplicativo e remover dados locais pelos controles disponíveis ou pelo sistema. A exclusão remota de conta ainda não está implementada dentro do app e requer um procedimento de atendimento a ser definido antes da operação comercial."] },
    { heading: "15. Lei e solução de conflitos", paragraphs: ["Aplica-se a legislação brasileira quando pertinente, inclusive normas de proteção de dados, internet, consumo e direitos autorais. Foro, mediação e canal de atendimento dependem da identificação formal do responsável e de revisão jurídica; direitos inderrogáveis permanecem preservados."] },
    identitySection,
    versionSection,
  ],
};

export const copyrightDocument: LegalDocument = {
  title: "Direitos Autorais e Conteúdo",
  subtitle: "Responsabilidades sobre livros, catálogos e materiais de estudo.",
  sections: [
    { heading: "Conteúdo importado", paragraphs: ["O Aldus Reader funciona como leitor e ferramenta de organização, indexação e descoberta; ele não adquire direitos sobre as obras que localiza ou abre. A presença de um arquivo no dispositivo não prova autorização para reproduzir, adaptar, distribuir ou disponibilizar a obra. Use apenas conteúdo próprio, licenciado, autorizado ou em domínio público conforme a lei aplicável."] },
    { heading: "Catálogos e downloads", paragraphs: ["Gutendex, Project Gutenberg, fontes cadastradas, BibliON e MEC são serviços independentes e permanecem responsáveis pelo que disponibilizam. O Aldus não afirma ser proprietário de seus acervos e não garante que cada item esteja livre de restrições em todos os países. Uma obra em domínio público pode aparecer em tradução, edição ou apresentação ainda protegida. Consulte a licença, os termos e o aviso de direitos da própria fonte."] },
    { heading: "Proteções tecnológicas", paragraphs: ["O Aldus não se destina a remover DRM, romper controles de acesso ou contornar medidas tecnológicas de proteção. Não use o aplicativo para obter ou distribuir conteúdo de forma ilícita."] },
    { heading: "Notas, grifos e exportações", paragraphs: ["Trechos de obras podem aparecer em grifos, notas e arquivos exportados. O uso de citações e cópias deve respeitar finalidade, extensão, atribuição e demais limites legais."] },
    { heading: "Software e marca", paragraphs: ["A marca Aldus Reader, sua interface e código próprio não são licenciados por estes avisos. Bibliotecas de código aberto mantêm seus respectivos direitos e licenças, listados na tela “Licenças de terceiros”."] },
    { heading: "Comunicação sobre conteúdo", paragraphs: ["Uma comunicação deve identificar a obra, o titular ou representante, a localização do conteúdo, a justificativa do pedido e um meio de resposta. O canal dedicado será o mesmo indicado abaixo quando estiver configurado. Nenhuma remoção automática é prometida sem análise do caso e das obrigações aplicáveis."] },
    { heading: "Legislação de referência", paragraphs: ["A Lei nº 9.610/1998 disciplina direitos autorais no Brasil. Exceções, domínio público, licenças e regras de outras jurisdições exigem análise do caso concreto."], links: [{ label: "Lei de Direitos Autorais — Planalto", url: "https://www.planalto.gov.br/ccivil_03/leis/l9610.htm" }] },
    identitySection,
    versionSection,
  ],
};

export const dataDocument: LegalDocument = {
  title: "Privacidade e Dados",
  subtitle: "Resumo prático dos lugares por onde seus dados passam.",
  sections: [
    { heading: "Fica no dispositivo", bullets: ["Arquivos e biblioteca de livros.", "Configuração das fontes, catálogos persistentes de metadados e vínculos com livros importados. Remover a fonte elimina seu índice, não os livros pessoais; indexação não baixa EPUB/PDF.", "Progresso, posições, cache e preferências de leitura.", "Texto reconhecido por OCR no Android, quando você escolhe executar o recurso.", "Marcadores, notas, grifos e histórico de pesquisa.", "Preferência do recurso anti-enjoo."], paragraphs: ["Esses dados não são sincronizados pelo Aldus nesta versão. Backups exportados passam a ficar sob sua responsabilidade."] },
    { heading: "Vai para o Supabase", bullets: ["Dados necessários à conta, autenticação e perfil.", "Sessão técnica administrada pelo SDK."], paragraphs: ["A configuração remota e as regras de acesso ainda devem ser conferidas antes do uso em produção."] },
    { heading: "Vai para Google e fontes escolhidas", bullets: ["Google recebe o fluxo de login quando escolhido e, separadamente, autorização Drive e pedidos de listagem/download com IDs da pasta/arquivos. Drive usa drive.readonly: leitura ampla; o app consulta a pasta escolhida, busca localmente nos metadados e baixa somente por ação explícita.", "O ML Kit pode enviar ao Google métricas técnicas de desempenho e uso do SDK; o conteúdo e o resultado do OCR não são enviados para processar o reconhecimento.", "Catálogos públicos recebem a sua consulta e dados normais de conexão.", "BibliON e MEC recebem as interações feitas dentro de suas páginas.", "A origem do livro recebe o pedido de download." ] },
    { heading: "Sensores e diagnósticos", paragraphs: ["Movimento é processado em memória no Android quando o recurso anti-enjoo está ligado. Diagnósticos opcionais vão apenas para o console no código auditado e vêm desligados por padrão. A política completa explica as ressalvas sobre logs de plataforma e provedores."] },
    { heading: "Seus controles atuais", bullets: ["Escolher se usa Google, sensores e fontes personalizadas.", "Editar dados de perfil disponíveis.", "Remover itens locais pelos fluxos existentes ou limpar o armazenamento pelo sistema.", "Exportar determinados dados de organização e grifos."], paragraphs: ["Ainda não existe exclusão de conta dentro do aplicativo nem prazo formal único de retenção remota. Consulte a Política de Privacidade para o estado completo e os pontos pendentes."] },
    identitySection,
    versionSection,
  ],
};

export const aboutDocument: LegalDocument = {
  title: "Sobre o Aldus Reader",
  subtitle: "Leitura atenta, biblioteca própria e estudo sem ruído.",
  sections: [
    { heading: "Nossa proposta", paragraphs: ["O Aldus nasceu de uma ideia simples: ler pelo celular também pode ser uma experiência prazerosa. Em uma época em que carregamos praticamente tudo no bolso, acreditamos que a literatura também pode estar ali — organizada, confortável e acessível.", "O Aldus Reader é um leitor de EPUB e PDF pensado para leitura concentrada, organização pessoal e estudo. A biblioteca fica prioritariamente no dispositivo: você escolhe os arquivos, ajusta a experiência e constrói seu próprio percurso de leitura.", "O projeto busca reduzir barreiras entre uma pessoa e um bom livro, tornar a leitura digital mais agradável e ajudar leitores a descobrir obras legalmente disponíveis sem exigir grandes gastos. Queremos reacender a faísca da literatura no Brasil: transformar alguns minutos livres em páginas, capítulos e histórias que permanecem conosco.", "Essa proposta combina o silêncio de uma boa página com recursos digitais úteis — progresso, temas, reflow, anotações e fontes públicas — sem transformar a leitura em uma disputa por atenção."] },
    { heading: "Por que “Aldus”?", paragraphs: ["O nome homenageia Aldus Manutius, ou Aldo Manuzio (c. 1450–1515), humanista, editor e impressor ativo em Veneza. Sua oficina tornou-se especialmente conhecida pela preservação, edição cuidadosa e circulação de textos clássicos gregos e latinos, em colaboração com estudiosos.", "A partir de 1501, sua produção ajudou a difundir edições em formato octavo, menores, leves e portáteis. Elas são um antecedente importante do livro de bolso moderno, mas o Aldus Reader não atribui a Manutius a invenção absoluta de todo livro portátil ou do paperback contemporâneo.", "Séculos atrás, sua oficina ajudou grandes textos a acompanhar os leitores de seu tempo. O Aldus Reader escolheu esse nome porque busca, no contexto atual, permitir que a literatura acompanhe o leitor no dispositivo que ele já carrega todos os dias."] },
    { heading: "Princípios do produto", bullets: ["Leitura antes de distração.", "Dados locais sempre que a função permitir.", "Clareza sobre o que sai do dispositivo.", "Respeito ao arquivo original, ao leitor e aos direitos das obras.", "Evolução baseada em evidência técnica, sem promessas absolutas."] },
    { heading: "Fontes históricas consultadas", links: [
      { label: "Biblioteca Casanatense — edições aldinas", url: "https://casanatense.cultura.gov.it/en/activities/editorials/the-aldine-editions-of-the-casanatense/" },
      { label: "Biblioteca Nazionale Marciana — Aldus Manutius", url: "https://bibliotecanazionalemarciana.cultura.gov.it/en/library/digital-library/aldo-manutius-ten-interludes/" },
      { label: "Museo Correr — história da impressão em Veneza", url: "https://archivio-correr.visitmuve.it/en/mostre-en/archivio-mostre-en/words-and-images-moments-in-the-history-of-printing-and-print-making-from-the-museo-correr-collection/2006/06/4940/progetto-71/" },
    ] },
    { heading: "Estado desta apresentação", paragraphs: ["Esta é a apresentação oficial inicial do projeto. Recursos, disponibilidade e identidade institucional poderão ser refinados antes de uma publicação comercial."] },
  ],
};
