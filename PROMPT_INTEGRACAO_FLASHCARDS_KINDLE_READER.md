# Integração do projeto de Flashcards ao Kindle Reader

## Objetivo autorizado

Integrar meu projeto existente de flashcards ao Kindle Reader. Quero um aplicativo principal para ler EPUB/PDF, criar e gerar cartões a partir dos livros, estudar com repetição espaçada e participar de batalhas em tempo real.

Use o código existente dos dois projetos como ponto de partida. Verifique o que realmente funciona e complete a integração em etapas. Esta descrição não comprova que todas as funcionalidades estejam implementadas.

A orientação inicial é manter o Kindle Reader como interface principal e aproveitar o domínio de estudo, telas adaptáveis, serviços e backend do projeto de flashcards. Uma reorganização de todo o leitor em monorepo só deve ocorrer se o código demonstrar necessidade e vantagem concretas.

## 1. Contexto conhecido e material necessário

O Kindle Reader possui leitores EPUB e PDF, PDF Original/Reflow, biblioteca, configurações e persistência local, com implementações Web e Native. Leia PROJECT_CONTEXT.md atualizado, os dossiês de bugs e as instruções dos repositórios. Preserve as correções e a posição de leitura.

O projeto de flashcards foi descrito assim:
- apps/mobile: React Native, Expo, Expo Router, NativeWind e Zustand.
- apps/server: NestJS, Prisma, PostgreSQL, Redis e Socket.IO.
- Recursos: decks/cartões manuais, geração assistida por IA, revisão SRS, batalhas, JWT e perfil.

Foram inspecionados apenas três arquivos de configuração:
- O package.json raiz identifica flashcards-monorepo, workspaces apps/* e packages/*.
- Scripts: dev:server, dev:mobile, build:server, prisma:generate, test:server e test:mobile.
- Dependências raiz: @expo/metro-runtime ~57.0.16, react-dom 19.2.3 e react-native-web ^0.21.2. Isso não confirma as versões dos pacotes internos.
- tsconfig.json raiz estende expo/tsconfig.base.
- docker-compose.yml define PostgreSQL 16 e Redis 7 locais com volumes persistentes. Isso não comprova que Supabase ou os serviços de produção estejam configurados.

Localize os códigos completos dos dois projetos, incluindo manifests internos, lockfiles, rotas, componentes, domínio SRS, clientes HTTP/socket, schema.prisma, migrations, testes e configurações de compilação. O resumo e esses três arquivos são insuficientes para executar a migração.

Se um dos códigos não estiver acessível, prepare o inventário e indique exatamente a pasta ou repositório que falta. Não reconstrua uma suposta cópia do projeto doador com base apenas na descrição.

## 2. Auditoria e decisão de integração

Crie um inventário com: funcionalidade, implementação existente, validação encontrada, componente a reutilizar, adaptação necessária e bloqueio real.

Compare as versões efetivas de React, React Native, Expo, Router, NativeWind, Zustand, Socket.IO e demais dependências. Evite substituir o package.json ou os estilos globais do leitor pelos do projeto doador.

Adapte as rotas e telas de estudo ao tema e à navegação do Kindle Reader. Reutilize componentes compatíveis; isole ou converta estilos do NativeWind quando sua configuração global puder afetar o leitor.

Mantenha:
- Um aplicativo principal e uma navegação coerente.
- Um modelo de sessão/identidade para as funções online.
- Um núcleo SRS compartilhável e testável.
- Contratos explícitos entre cliente e API.
- Implementações locais e de plataforma alinhadas à arquitetura atual.

O backend NestJS pode continuar como serviço separado. Compartilhe tipos e lógica pura quando útil, sem importar Prisma, segredos ou código exclusivo de servidor no cliente. Supabase como PostgreSQL não implica uso obrigatório de Supabase Auth; avalie a autenticação real antes de decidir.

## 3. Módulo Estudo no Kindle Reader

Integre os fluxos reais de:
- Lista, criação, edição e exclusão de baralhos.
- Criação e edição de cartões com frente, verso e tags.
- Sessão de estudo, revelação da resposta e avaliações Errei/Difícil/Bom/Fácil.
- Revisões pendentes e introdução controlada de novos cartões.
- Histórico, métricas e exportação.
- Perfil e acesso às batalhas.

Permita baralhos independentes e baralhos vinculados a livros. Um conjunto pode reunir vários livros, mantendo a origem de cada cartão.

Leitura local e estudo de cartões salvos devem continuar funcionando sem login ou conexão, conforme a capacidade local existente. As funções online usam autenticação. Preserve os dados do usuário local ao associá-los a uma conta; não misture dados entre contas.

Excluir ou perder acesso a um livro não deve apagar automaticamente os cartões. Registre referências indisponíveis e ofereça reparo quando possível.

## 4. Vínculo entre livros e flashcards

Amplie o modelo existente com campos ou entidades apropriados para:
- Identidade do livro, edição e documento de origem.
- Capítulo/trecho, referência de página original quando houver e localização recuperável.
- Origem manual, grifo ou geração por IA.
- Estado rascunho/aprovado, versão do conteúdo e edição pelo usuário.
- Vínculo entre conjuntos, cartões e fontes.

Reutilize IDs atuais e mantenha mapeamento entre identidade local e servidor quando necessário.

PDF: preserve a página do original e a origem dos blocos de Reflow.
EPUB: use capítulo, localização estrutural e trecho/contexto, sem inventar paginação fixa.

Adicione “Criar flashcard” à seleção ou grifo quando essa integração existir de fato. No cartão, “Abrir origem” deve retornar ao trecho e permitir voltar ao estudo, preservando a posição de leitura.

## 5. Geração por IA a partir do livro

Reaproveite a integração de IA existente após verificar seu provedor, contrato e funcionamento.

Fluxo:
1. Escolher livro, capítulos, grifos, trechos ou livro completo.
2. Escolher objetivo, idioma, detalhe e quantidade desejada.
3. Informar o processamento online e o consumo estimado.
4. Extrair conteúdo válido com referências.
5. Processar em blocos, com progresso, cancelamento e retomada.
6. Gerar candidatos, verificar apoio no texto e remover duplicatas.
7. Apresentar prévia para edição e aprovação.
8. Persistir aprovados e disponibilizá-los para estudo.

A importação do livro não dispara envio automático para IA. Envie apenas o material necessário para a geração escolhida.

Extração corrompida deve ser sinalizada; não produzir cartões a partir de texto ilegível. PDF escaneado exige OCR real. Preserve livro Original e dados do leitor. “Somente conteúdo lido” precisa de trechos efetivamente registrados ou confirmados, sem considerar um salto ao final como leitura completa.

Cada cartão deve abordar uma ideia e trazer resposta sustentada pela fonte. Diferencie fatos apresentados no livro das interpretações do autor. A existência de uma citação não comprova a correção semântica: mantenha a prévia.

Use fila e worker existentes quando apropriado. Verifique o uso real do Redis; não presuma uma biblioteca de filas específica. Evite duplicar gerações em retentativas e reutilize resultados equivalentes sem sobrescrever edições do usuário.

## 6. Repetição espaçada e sincronização

Audite o algoritmo já implementado, seus estados, avaliações e testes antes de substituí-lo.

Se atualmente roda apenas no servidor, avalie extrair a mesma lógica para um núcleo puro reutilizável no cliente e backend, mantendo equivalência. O estudo offline não deve depender de uma chamada HTTP a cada avaliação.

Separe:
- Conteúdo do cartão.
- Estado de revisão de cada usuário.
- Eventos de revisão.
- Métricas e eventos de batalha.

Persistir eventos offline e sincronizar com IDs estáveis e idempotência. Uma retentativa não pode contar uma revisão duas vezes nem avançar novamente seu intervalo.

Defina como conciliar revisões feitas em dois aparelhos, alterações concorrentes, exclusões e fusos horários. Preservar eventos e tratar conflitos explicitamente é preferível a escolher arbitrariamente o maior intervalo.

Novos cartões gerados ficam em fila própria; não entram todos automaticamente nas revisões do dia. O usuário controla sua introdução. Resultados de batalha não devem modificar automaticamente o SRS pessoal.

## 7. Batalhas em tempo real

Reutilize o gateway, regras e telas existentes após auditar seu comportamento.

A autoavaliação pessoal de um flashcard não comprova acerto em uma disputa. Para partidas com ranking, use respostas objetivamente verificáveis, começando pelo formato que o projeto já suporte de forma confiável. Se necessário, crie uma variante aprovada de questão com alternativas e gabarito. Questões interpretativas sem critério definido ficam fora do ranking.

O servidor deve validar participação, rodada, resposta, prazo e calcular a pontuação. O cliente envia a resposta; não determina seu próprio acerto, tempo oficial ou resultado. Exiba o gabarito da rodada após o momento apropriado.

Audite e trate:
- Pareamento/salas, entrada e saída de fila.
- Mesmas questões e versão do conjunto para ambos.
- IDs de partida/rodada/resposta e retentativas idempotentes.
- Cronômetro oficial, limites de resposta e critérios claros de velocidade.
- Desconexão, retorno ao app, recuperação de estado e término por abandono.
- Persistência única do resultado e atualização consistente do ranking.
- Autorização dos eventos, limites de requisições e acesso aos baralhos.
- Encerramento de listeners/conexões ao sair da tela.

A reconexão do socket não garante que todos os eventos perdidos tenham sido recuperados. Implemente consulta ou recuperação de estado conforme a versão/configuração real.

Baralhos gerados de livros pessoais são privados por padrão. Apenas conjuntos autorizados para a partida podem ser disponibilizados aos participantes. Compartilhar um conjunto não publica automaticamente o livro de origem.

Mantenha batalhas opcionais e independentes da leitura. Não simule um segundo jogador para declarar multiplayer validado.

## 8. Backend, identidade, dados e implantação

Adapte Prisma e migrations preservando usuários, cartões e históricos existentes. Não faça reset de banco ou volume para simplificar a integração.

Audite JWT, validade/renovação da sessão, logout e autenticação HTTP/socket. Unifique a identidade das funções online e confira propriedade/permissão por recurso, além da validade do token.

EXPO_PUBLIC_API_URL identifica um endpoint público. Chaves de IA, JWT secrets e credenciais administrativas pertencem ao servidor. Produza exemplos de configuração sem valores secretos.

Verifique quais serviços já existem no Reader e no doador antes de criar outro backend, autenticação ou banco. PostgreSQL local e Supabase são ambientes possíveis; não os trate como dois bancos que precisam ser escritos simultaneamente.

Documente acesso à API no navegador, emulador e Android físico. Use endereços adequados a cada ambiente; o localhost do telefone não é o computador.

Antes de implantar, confirme que a hospedagem escolhida suporta API, WebSockets persistentes e workers necessários. A hospedagem do frontend Web, por si só, não demonstra isso. Separe execução local, build e implantação.

## 9. Monetização

Preserve a proposta de:
- Grátis: cartões manuais, revisão local, edição, exportação e pequena demonstração de geração.
- Assinatura: franquias de geração, sincronização e ferramentas avançadas.
- Adicionais: processamento excedente e OCR quando houver custo.

Preços e limites ainda são decisões a validar. Controle consumo por processamento real, não apenas por quantidade de cartões. Benefícios pagos de serviços online devem ser verificados no backend.

Cartões já salvos permanecem consultáveis, revisáveis localmente e exportáveis após cancelamento. Uma mudança de plano não apaga aprendizado ou histórico.

A participação básica em batalhas pode ser avaliada separadamente. Benefícios pagos não devem dar vantagem de pontuação em uma mesma disputa.

## 10. Ordem de execução e entregas

1. Auditar os dois códigos, versões, dados e contratos; registrar o mapa de reaproveitamento.
2. Integrar decks/cartões, persistência e SRS local ao Reader.
3. Integrar fontes do livro e geração de cartões com prévia e aprovação.
4. Integrar identidade, API e sincronização.
5. Integrar batalhas reais e perfil/ranking.
6. Completar processamento de livros extensos, OCR e benefícios comerciais conforme suas dependências.

Implemente as partes autorizadas e disponíveis. Bloqueios por ausência de código, credenciais ou serviço devem identificar a dependência específica, preservando progresso nas partes independentes.

Atualize PROJECT_CONTEXT.md e crie/atualize INTEGRATION_FLASHCARDS.md com origem dos módulos, decisões, migrações, comandos, validações, pendências e próximos passos. Não declare integração concluída apenas por acrescentar telas ou botões.

## 11. Validação funcional

Use scripts realmente presentes em cada projeto. Os scripts verificados na raiz do doador são os listados na seção 1; confira os manifests internos antes de executá-los. No Reader, confira typecheck, export:web e demais scripts atuais.

Valide:
- CRUD e exportação, preservação de dados anteriores e reabertura.
- Datas/intervalos SRS, revisões offline e retentativa sem duplicação.
- Login/logout, troca de conta e dois aparelhos com alterações concorrentes.
- Cartões de EPUB/PDF com origem correta, extração inválida e cancelamento de geração.
- Abrir/fechar a origem sem resetar o Reader, inclusive ao mostrar controles e alterar aparência.
- API e estudo nas plataformas disponíveis, registrando diferenças Web/Native.
- Uma batalha entre duas sessões reais, resposta duplicada/atrasada, desconexão e ranking persistido uma única vez.

Testes semânticos e funcionais devem verificar o comportamento, além da compilação. Sem Android físico, registre essa validação como pendente.

## 12. Aviso obrigatório sobre Android

Sempre que uma alteração exigir recompilar e reinstalar, avise claramente antes de executá-la:
“Esta alteração exige recompilar e reinstalar o aplicativo no Android. Atualizar pelo Metro/Fast Refresh não será suficiente.”

Explique o motivo e os comandos corretos para o ambiente. Mudanças apenas em JavaScript/estilos devem seguir seu fluxo aplicável. Diferencie a atualização do app das alterações/migrations/reinicialização do backend.

## Referências técnicas para conferir com as versões do projeto

- NestJS — gateways: https://docs.nestjs.com/websockets/gateways
- Socket.IO — desconexão e recuperação: https://socket.io/docs/v4/tutorial/handling-disconnections/
- Expo — variáveis de ambiente públicas: https://docs.expo.dev/guides/environment-variables/

