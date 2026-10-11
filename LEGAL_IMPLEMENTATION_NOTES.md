# Aldus Reader — notas da implementação legal inicial

Data da auditoria: 11/10/2026

Versão dos documentos públicos: 0.2

Estado: **implementação jurídica inicial; revisão profissional e validação operacional pendentes**.

Este arquivo registra o que foi observado no código e por que os textos públicos foram redigidos dessa forma. Ele não é parecer jurídico, certificação de conformidade nem substituto para validar o ambiente remoto, contratos com fornecedores e práticas reais de operação.

## 1. Inventário técnico auditado

| Área | Dados observados | Local / destinatário nesta versão | Observação usada nos textos |
| --- | --- | --- | --- |
| Conta e sessão | email, UUID, provedor, tokens de sessão, username, nome de exibição, avatar, papel, status e overrides | Supabase; sessão/cache também no armazenamento local | Login com email/username e Google. Tokens são administrados pelo SDK. |
| Biblioteca | EPUB/PDF, Blob/caminho, capa, título, autor, hash, MIME, tamanho, capítulos e datas | SQLite no Native; IndexedDB no Web | Não foi encontrada sincronização da biblioteca nem upload automático para nuvem. |
| Leitura | capítulo, CFI/âncora, percentual, página, cache de reflow, tema, fonte, margens, brilho e modo PDF | SQLite/IndexedDB/AsyncStorage local | Alguns registros usam chaves legadas `kindle-*`; elas foram preservadas por compatibilidade. |
| OCR de PDF | imagem renderizada das páginas necessárias, texto reconhecido, limites geométricos e proveniência do motor | processamento local no Android; resultado validado no cache Reflow local | ML Kit Text Recognition v2 latino `16.0.1`, modelo empacotado; conteúdo e resultado não são enviados para executar OCR. O SDK pode transmitir métricas técnicas de uso/desempenho e consultar informações de correção/compatibilidade conforme os termos do fornecedor. |
| Organização | favorito, coleções, tags, série, volume, status, metadados editados e capa | AsyncStorage local | Exportação/importação de backup transfere responsabilidade ao arquivo exportado. |
| Estudo | marcadores, notas, grifos, trecho, comentário, posição e exportações | SQLite/IndexedDB local | Comentário do grifo fica codificado no payload da localização. |
| Flashcards locais | decks, cartões, imagens/desenhos, origem, respostas, revisões, pontuação e sessões | SQLite Native / IndexedDB Web; migração local legada | Estudo individual não envia cartões ao Supabase. |
| Batalha | deck selecionado, cartões completos, conta, partida, escolha, ordinal, pontuação e estado | RPC/tabelas Supabase quando o recurso for habilitado | Migration e cliente existem, mas a aplicação no backend remoto não foi comprovada. |
| Pesquisa | consulta, fonte, resultados e horário | Consulta enviada à fonte; histórico salvo localmente | Gutendex, Gutenberg e fontes JSON/OPDS/HTML do usuário. |
| Downloads | URL e arquivo solicitado | Transferência direta entre fonte e dispositivo | A disponibilidade no catálogo não prova licença em toda jurisdição. |
| Serviços web | interações dentro de BibliON e MEC Livros | WebView dos respectivos sites | Serviços independentes, com regras próprias. |
| Sensores | amostras DeviceMotion/Accelerometer e preferência | Amostras em memória; preferência local | Código auditado não persiste ou transmite amostras; recurso Android e opt-in. |
| Diagnósticos | eventos e campos permitidos sobre Auth, Search, Reader, Reflow e Motion | console, somente com flags `EXPO_PUBLIC_*_DIAGNOSTICS=1` | Desligados por padrão; UUID pode aparecer no diagnóstico de Auth. Sem SDK dedicado de analytics/crash encontrado. |

## 2. Serviços e destinatários externos observados

- Supabase: autenticação, perfil, recuperação de conta e batalha de flashcards preparada.
- Google: OAuth quando escolhido.
- Gutendex e Project Gutenberg: busca e aquisição de livros.
- Fontes personalizadas HTTP/HTTPS: JSON, OPDS ou HTML cadastrados pelo usuário.
- BibliON e MEC Livros: navegação por WebView.
- Sistema operacional/plataforma: armazenamento isolado, permissões, console e entrega do aplicativo.
- Google ML Kit: motor de OCR executado no aparelho; modelo latino empacotado. O conteúdo e o resultado não são enviados ao Google para reconhecimento, mas o SDK pode contatar serviços do fornecedor para correções, compatibilidade e métricas técnicas.

Não foi encontrada integração funcional com Google Drive, publicidade comportamental, analytics ou crash reporting. Isso descreve o repositório auditado, não prova a inexistência de logs na hospedagem, lojas, sistema operacional ou painéis externos.

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
