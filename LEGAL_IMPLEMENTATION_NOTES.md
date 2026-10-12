# Aldus Reader — notas da implementação legal inicial

Data da auditoria: 12/10/2026

Versão dos documentos públicos: 0.6

## Adendo Drive — árvore de pastas, 12/10/2026

Política0.6 e Privacidade/Dados descrevem raiz, subpastas, destinos acessíveis de atalhos encontrados (inclusive externos), IDs/parent/caminhos no snapshot local, navegação/busca local sem enviar query nem reindexar, download só por escolha. drive.readonly permanece amplo/leitura; nenhum token novo persistido ou dado da Source enviado ao Supabase. Dados da biblioteca pessoal após import continuam sujeitos ao fluxo já documentado. Sem nova autorização/secret/scopes ou alteração do consentimento SDK. Pasta pública livros geral visualizada sem login; grant/API/app/Android real não validados. DRIVE_FOLDER_NAVIGATION_IMPLEMENTATION.md é o checkpoint atual; consultas só na pasta direta descritas no histórico abaixo foram superadas.

## Checkpoint atual — biblioteca privada da conta, 11/10/2026

IMPLEMENTADO / VALIDADO CONTROLADO: arquivos EPUB/PDF importados são locais primeiro e depois enviados automaticamente ao bucket privado Supabase da conta. Metadados, progresso, posições PDF, favoritos, coleções, tags, marcadores/notas e grifos/comentários sincronizam. Outro dispositivo recebe metadados; arquivo só é baixado ao abrir. Legados exigem seleção explícita. Política, Privacidade e Dados, Termos e Direitos Autorais descrevem o fluxo, o fornecedor, exclusões, offline e ausência de criptografia de ponta a ponta. Direitos das obras permanecem com seus titulares; sincronizar privadamente não concede licença sobre a obra.

Capas, capítulos, cache/OCR, aparência, histórico, catálogo/configuração/credenciais das Sources continuam locais e são excluídos dos payloads pessoais. Assets bundled verificados não são enviados. Capa personalizada nova, publicação, links públicos, compartilhamento entre contas e marketplace não foram implementados.

Remover deste dispositivo exige cópia remota confirmada e verificada, limpa ponteiro/cópia local e mantém o livro na conta. Remover da biblioteca gera tombstone; o coordinator só apaga objetos privados depois da confirmação e retoma falhas. Tombstones, recibos e registros pessoais excluídos logicamente permanecem. Logout revoga acesso de UI/repository, sem apagar todos os bytes locais. Caches de outros aparelhos, exportações e backups do provedor não têm eliminação física garantida pelo app.

PENDENTE EXTERNO: as duas migrations foram criadas, NÃO APLICADAS REMOTAMENTE. RLS REMOTO PENDENTE; STORAGE REMOTO PENDENTE; Android físico NÃO TESTADO. Região, contratos, limites do plano, retenção/expurgo/backups, responsável/canal de direitos e exclusão de conta precisam de definição operacional. Não há prazo inventado de retenção nem certificação de conformidade. O roteiro técnico está em LIBRARY_SYNC_DEPLOYMENT.md; o relatório de 41 itens em LIBRARY_SYNC_FINAL_REPORT.md. Registros abaixo são históricos quando divergirem deste checkpoint.

Checkpoint SOURCE LIBRARY (quarta etapa): catálogo metadata local permanente SQLite v3 / IndexedDB v4, separado da Library. Pesquisa local/reabertura não requer token/rede; refresh completo é atômico. Indexação não baixa EPUB/PDF; capa remota gera somente pedido de imagem. Desconectar invalida autorização/índice memória mas preserva snapshot; remover elimina configuração/snapshot/vínculos, sem tocar livros/arquivos/progresso/notas/highlights/capas importados. Nenhum envio de catálogo ao Supabase/Cloud Sync/upload. Política pública e descrição do modal atualizadas. Notas antigas de índice somente temporário abaixo são históricas, superadas por este checkpoint.

Estado: **implementação jurídica inicial; revisão profissional e validação operacional pendentes**.

Checkpoint Drive final: download explícito entrega EPUB/PDF ao importador existente, sem upload; metadata índice memória, config local, credenciais app memória/header transitório, API Google direta. GIS script só carregado no modal quando Drive é escolhido ou há fonte Drive já cadastrada, preparando o gesto de reconexão. Revogação Web GIS/Native POST, best effort; importados preservados. Gates legal/typecheck/notices/export PASS, sem conta real. Play Services Auth depende também de termos/licenças/transitivos nativos, ainda em revisão antes de produção. Não há alegação de conformidade definitiva.

Este arquivo registra o que foi observado no código e por que os textos públicos foram redigidos dessa forma. Ele não é parecer jurídico, certificação de conformidade nem substituto para validar o ambiente remoto, contratos com fornecedores e práticas reais de operação.

## 1. Inventário técnico auditado

| Área | Dados observados | Local / destinatário nesta versão | Observação usada nos textos |
| --- | --- | --- | --- |
| Conta e sessão | email, UUID, provedor, tokens de sessão, username, nome de exibição, avatar, papel, status e overrides | Supabase; sessão/cache também no armazenamento local | Login com email/username e Google. Tokens são administrados pelo SDK. |
| Biblioteca | EPUB/PDF, Blob/caminho, capa, título, autor, hash, MIME, tamanho, capítulos e datas | SQLite/arquivos Native; IndexedDB/Blob Web; EPUB/PDF e allowlist de metadados no Supabase privado | Upload após import completo; outro aparelho baixa ao abrir. Caminho local, capas e capítulos não são enviados. |
| Leitura | capítulo, CFI/âncora, percentual, página, cache de reflow, tema, fonte, margens, brilho e modo PDF | Local e Supabase para progresso, modo e posições PDF | Cache, tema, fonte, margens e brilho são locais. Chaves legadas preservadas por compatibilidade. |
| OCR de PDF | imagem renderizada das páginas necessárias, texto reconhecido, limites geométricos e proveniência do motor | processamento local no Android; resultado validado no cache Reflow local | ML Kit Text Recognition v2 latino `16.0.1`, modelo empacotado; conteúdo e resultado não são enviados para executar OCR. O SDK pode transmitir métricas técnicas de uso/desempenho e consultar informações de correção/compatibilidade conforme os termos do fornecedor. |
| Organização | favorito, coleções, tags, série, volume, status, metadados editados e capa | AsyncStorage local e Supabase por livro; capa apenas local | Payload exclui capa/revision/relógio local; exportações permanecem sob controle da pessoa. |
| Estudo | marcadores, notas, grifos, trecho, comentário, posição e exportações | SQLite/IndexedDB e Supabase para entidades próprias de leitura | IDs independentes; nota no marcador e comentário no payload da localização. Exportações locais. |
| Flashcards locais | decks, cartões, imagens/desenhos, origem, respostas, revisões, pontuação e sessões | SQLite Native / IndexedDB Web; migração local legada | Estudo individual não envia cartões ao Supabase. |
| Batalha | deck selecionado, cartões completos, conta, partida, escolha, ordinal, pontuação e estado | RPC/tabelas Supabase quando o recurso for habilitado | Migration e cliente existem, mas a aplicação no backend remoto não foi comprovada. |
| Pesquisa | consulta, fonte, resultados e horário | Consulta enviada à fonte; histórico salvo localmente | Gutendex, Gutenberg e fontes JSON/OPDS/HTML do usuário. |
| Downloads | URL e arquivo solicitado | Transferência direta entre fonte e dispositivo | A disponibilidade no catálogo não prova licença em toda jurisdição. |
| Serviços web | interações dentro de BibliON e MEC Livros | WebView dos respectivos sites | Serviços independentes, com regras próprias. |
| Sensores | amostras DeviceMotion/Accelerometer e preferência | Amostras em memória; preferência local | Código auditado não persiste ou transmite amostras; recurso Android e opt-in. |
| Diagnósticos | eventos e campos permitidos sobre Auth, Search, Reader, Reflow e Motion | console, somente com flags `EXPO_PUBLIC_*_DIAGNOSTICS=1` | Desligados por padrão; UUID pode aparecer no diagnóstico de Auth. Sem SDK dedicado de analytics/crash encontrado. |

## 2. Serviços e destinatários externos observados

- Supabase: autenticação, perfil, recuperação de conta, biblioteca/arquivos/dados de leitura privados e batalha de flashcards preparada.
- Google: OAuth quando escolhido.
- Gutendex e Project Gutenberg: busca e aquisição de livros.
- Fontes personalizadas HTTP/HTTPS: JSON, OPDS ou HTML cadastrados pelo usuário.
- BibliON e MEC Livros: navegação por WebView.
- Sistema operacional/plataforma: armazenamento isolado, permissões, console e entrega do aplicativo.
- Google ML Kit: motor de OCR executado no aparelho; modelo latino empacotado. O conteúdo e o resultado não são enviados ao Google para reconhecimento, mas o SDK pode contatar serviços do fornecedor para correções, compatibilidade e métricas técnicas.

Google Drive agora implementado (NÃO TESTADO COM CONTA REAL): autorização separada Android AuthorizationClient/Web GIS; drive.readonly restrito/amplo leitura/download, consultas app só na pasta direta. Configuração nome/URL/folderId/resourceKey local, índice metadata memória (5 min), token memória/SDK cache Android, sem refresh/segredo/upload. Google recebe IDs/pedidos/autorização/transferências; busca Drive não envia query. Disconnect/removal limpa conexão/índice/configuração conforme ação; revoke best effort, importados preservados. Revisar consentimento/verificação de scopes/políticas/Data safety e termos de Play Services Auth 22.0.0 antes de publicação. Roteiro GOOGLE_DRIVE_IMPLEMENTATION.md. Não foram encontrados publicidade comportamental, analytics ou crash reporting dedicados; não prova ausência de logs externos.

## 3. Decisões de redação

- Não foi usado “consentimento com a Política de Privacidade”. O cadastro informa leitura de Termos e Política; consentimento deve ser específico quando for a base adequada.
- Bases legais foram apresentadas como possibilidades dependentes da operação. O mapeamento definitivo por finalidade ficou pendente de revisão.
- Retenção não ganhou prazo inventado. Dados locais são descritos pelo ciclo técnico observado; retenção remota, backup e atendimento precisam de política operacional.
- Não se afirmou que RLS ou migrations estão ativas no Supabase remoto. O repositório contém regras preparadas, mas o deploy não foi comprovado.
- Não se afirmou conformidade integral com LGPD, Marco Civil, CDC ou Lei de Direitos Autorais.
- A história de Aldus Manutius evita a alegação de “inventor absoluto do livro de bolso”. A redação usa “antecedente importante” e registra formato octavo, Veneza e edições clássicas.

## 4. Configuração institucional

As telas leem, em tempo de build, as seguintes variáveis opcionais:

- `EXPO_PUBLIC_LEGAL_CONTROLLER_NAME`: nome validado do responsável/controlador.
- `EXPO_PUBLIC_LEGAL_CONTACT_EMAIL`: canal validado para solicitações legais e de privacidade.

Sem essas variáveis, a interface informa de forma neutra que a identificação/canal será publicado após validação. Nenhum CNPJ, endereço, DPO/encarregado, empresa ou email foi inventado.

TODO antes de publicação comercial:

1. Identificar formalmente controlador, operador(es), endereço e jurisdição aplicáveis.
2. Definir e testar canal de titulares, prazo de resposta e processo de autenticação do solicitante.
3. Avaliar necessidade e divulgar identidade/contato do encarregado conforme o cenário aplicável.
4. Mapear base legal, necessidade, minimização e retenção por finalidade.
5. Definir exclusão de conta, retenção de autenticação, backups, logs e dados de batalha.
6. Confirmar região, suboperadores, transferências internacionais e contratos do Supabase/Google.
7. Verificar aplicação remota de migrations, RLS, funções, segredos e controles administrativos.
8. Avaliar faixa etária, melhor interesse e controles para crianças/adolescentes antes de direcionar o produto a esse público.
9. Revisar termos de Gutendex, Project Gutenberg, BibliON, MEC e fontes oferecidas por padrão.
10. Fazer revisão jurídica brasileira e das jurisdições em que o produto será oferecido.

## 5. Licenças de terceiros

`scripts/generate-third-party-notices.cjs` lê as dependências diretas de runtime de `package.json`, resolve versões/licenças no lockfile e coleta arquivos `LICENSE`, `LICENCE`, `COPYING` e `NOTICE` instalados. Ele gera:

- `THIRD_PARTY_NOTICES.md`, com inventário e textos idênticos agrupados;
- `src/legal/thirdPartyNotices.generated.ts`, consumido pela tela pesquisável do aplicativo.

O inventário atual inclui 37 dependências diretas de runtime. Dependências de desenvolvimento não aparecem na tela. Dependências transitivas, código embarcado em artefatos Android/iOS, fontes, ícones e obrigações específicas de distribuição ainda precisam de auditoria antes de publicar binários. Use `npm run legal:notices:check` no CI para detectar divergência.

O módulo local `aldus-pdf-ocr` adiciona diretamente o artefato Android `com.google.mlkit:text-recognition:16.0.1`; por não ser dependência npm, ele não entra automaticamente no gerador acima. Seu uso está sujeito aos Termos do ML Kit e aos Termos das APIs do Google. A cadeia transitiva, avisos/licenças do artefato, declaração de Data safety da Play Store e obrigações de distribuição precisam ser conferidos antes de publicar o APK/AAB. A escolha empacotada acrescenta aproximadamente 4 MB por script ao aplicativo e evita o download inicial do modelo.

## 6. Referências consultadas

- Lei nº 13.709/2018 (LGPD), texto compilado: <https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm>
- Lei nº 12.965/2014 (Marco Civil da Internet): <https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2014/lei/l12965.htm>
- Lei nº 9.610/1998 (Direitos Autorais): <https://www.planalto.gov.br/ccivil_03/leis/l9610.htm>
- Biblioteca Casanatense, edições aldinas: <https://casanatense.cultura.gov.it/en/activities/editorials/the-aldine-editions-of-the-casanatense/>
- Biblioteca Nazionale Marciana, exposição Aldus Manutius: <https://bibliotecanazionalemarciana.cultura.gov.it/en/library/digital-library/aldo-manutius-ten-interludes/>
- Museo Correr, história da impressão em Veneza: <https://archivio-correr.visitmuve.it/en/mostre-en/archivio-mostre-en/words-and-images-moments-in-the-history-of-printing-and-print-making-from-the-museo-correr-collection/2006/06/4940/progetto-71/>
- ML Kit, reconhecimento de texto no Android: <https://developers.google.com/ml-kit/vision/text-recognition/v2/android>
- ML Kit, idiomas compatíveis: <https://developers.google.com/ml-kit/vision/text-recognition/v2/languages>
- ML Kit, termos e privacidade: <https://developers.google.com/ml-kit/terms>
- ML Kit, divulgação de dados no Google Play: <https://developers.google.com/ml-kit/android-data-disclosure>

## 7. Verificações desta etapa

- `npm run typecheck`
- `npm run test:legal`
- `npm run legal:notices:check`
- `npm run test:legal:browser` com o Web exportado servido localmente e Chrome em modo remote debugging
- `npm run export:web`
- `git diff --check`
- auditoria textual de afirmações absolutas e placeholders públicos

O smoke visual Web confirmou fundo claro `rgb(245, 245, 243)`, fundo escuro `rgb(18, 23, 26)`, rolagem longa até `4138/4138` e retorno da rota pública para `/auth/login`. Android/iOS físico e navegador autenticado ainda devem ser registrados separadamente.

## 8. Mudanças futuras que obrigam revisão

Reabrir a auditoria de dados, atualizar os documentos públicos e revisar bases/contratos antes de ativar qualquer uma destas mudanças:

- Google Drive ou outro armazenamento em nuvem;
- sincronização de biblioteca, progresso, notas ou flashcards entre dispositivos;
- OCR, geração ou análise de conteúdo em servidor/IA externa;
- analytics, crash reporting, publicidade ou perfil comportamental;
- billing, assinatura, compra, monetização ou emissão fiscal;
- novos provedores de login, catálogos, downloads ou compartilhamento;
- telemetria persistente de sensores ou diagnósticos;
- alteração de região, suboperadores, retenção ou finalidade no Supabase/Google;
- direcionamento do produto a crianças ou adolescentes.
