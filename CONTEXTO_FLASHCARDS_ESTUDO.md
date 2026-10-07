# Contexto para implantação — Flashcards gerados a partir de livros

Quero acrescentar ao meu app de leitura EPUB/PDF uma função de estudo: a pessoa importa um livro, o sistema extrai e analisa seu conteúdo e gera flashcards baseados nesse material. Os cartões ficam vinculados ao livro e podem ser revisados dentro do app.

Esta é uma proposta de funcionalidade. Incorpore-a ao contexto e ao roadmap do projeto, preservando as prioridades atuais e verificando o que já existe antes de implementar. Não considere os recursos abaixo concluídos apenas por estarem descritos aqui.

## 1. Objetivo e integração com o projeto

O objetivo é conectar leitura, grifos, notas, flashcards e revisão. O usuário deve conseguir estudar o material que está lendo e retornar à explicação original quando tiver dificuldade.

Leia o PROJECT_CONTEXT.md atualizado, as instruções do repositório e o código relevante. O projeto possui caminhos Web e Native, leitores EPUB e PDF e modos PDF Original/Reflow. Reutilize a importação, a extração de texto, a persistência e os identificadores disponíveis, verificando sua qualidade.

A implantação precisa preservar posição de leitura, desempenho e dados existentes. Avalie as dependências com as correções atuais do leitor antes de ampliar seu escopo.

## 2. Fluxo de uso desejado

1. O usuário importa ou escolhe um livro da biblioteca.
2. Aciona “Gerar flashcards”. A importação, sozinha, não autoriza envio do conteúdo para um serviço de IA.
3. Escolhe a abrangência: capítulos, trechos selecionados, grifos, conteúdo já lido ou livro completo.
4. Define objetivo, idioma dos cartões, nível de detalhe e quantidade desejada.
5. O sistema informa o conteúdo que será processado, se usará um serviço online e o consumo estimado da franquia.
6. Gera uma prévia de cartões, organizada por capítulo ou assunto.
7. O usuário edita, descarta ou aprova os cartões, individualmente ou em conjunto.
8. Os aprovados entram na fila de novos cartões. O usuário decide quando introduzi-los na rotina de revisão.
9. Durante o estudo, pode abrir o trecho de origem e retornar ao cartão sem perder sua posição no livro.

Permita escolher objetivos como conceitos principais, vocabulário, revisão para prova e compreensão de argumentos. A quantidade solicitada é uma preferência; não force cartões redundantes para preencher um número.

## 3. Reconhecimento e processamento do conteúdo

- EPUB: extrair texto com sua estrutura e vínculo com o capítulo.
- PDF com texto: aproveitar a extração, mantendo referência à página original.
- PDF escaneado: identificar a necessidade de OCR e explicitar essa dependência.
- Texto corrompido ou insuficiente: apresentar o problema e interromper a geração daquela parte. OCR ou recuperação não devem ser presumidos como implementados.
- Livro completo: processar por capítulos ou blocos, com progresso, cancelamento e possibilidade de retomar. Evitar reenviar o livro inteiro a cada operação.
- Reaproveitar resultados quando conteúdo e configurações forem equivalentes, respeitando edições do usuário.

“Conteúdo já lido” deve usar capítulos ou trechos efetivamente registrados ou confirmados pelo usuário. Uma visita temporária ao final do livro não comprova leitura.

## 4. Qualidade dos flashcards e referências

Comece com perguntas e respostas curtas. Evolua para lacunas, comparações e etapas de processos quando o fluxo básico estiver validado.

Cada cartão deve abordar uma ideia, ter pergunta específica e resposta sustentada pelo material selecionado. Preserve termos, condições e exceções importantes. Questões sobre uma interpretação devem deixar claro quando representam a posição do autor.

Associe a resposta a um trecho verificável. Remova duplicatas e descarte candidatos sem apoio suficiente. Validar a existência do trecho ajuda a conferir a origem, mas não garante que a interpretação esteja correta: mantenha prévia editável e indicação de geração por IA.

Referências:
- PDF: página original e localização no texto ou na página, quando disponíveis.
- EPUB: capítulo e localização estável, com trecho e contexto para recuperação.
- Reflow: manter a origem no PDF; a página dinâmica do texto ajustado não substitui a página original.

Não invente páginas, capítulos, citações ou precisão de localização. Se o vínculo não puder ser recuperado, indique o estado e permita correção.

## 5. Persistência e revisão espaçada

Persistir cartões, vínculo com livro/edição e origem, tipo, pergunta/resposta, estado de aprovação, alterações do usuário e histórico de revisões. Separar dados de geração da IA dos dados de estudo.

A revisão deve funcionar offline para cartões salvos. O usuário tenta lembrar, revela a resposta e informa sua dificuldade. Utilize um agendador de repetição espaçada adequado ao projeto, reaproveitando uma implementação existente quando houver. Registre a escolha e valide seu comportamento.

Evite colocar uma grande geração automaticamente entre as revisões vencidas. Ofereça controle de novos cartões por sessão, suspensão, edição e exclusão. Estatísticas devem refletir revisões reais.

Se houver sincronização, inclua cartões e histórico com tratamento de conflitos e exclusões. Se não houver infraestrutura pronta, registre essa etapa como pendente e entregue o funcionamento local.

## 6. Funcionalidades previstas

- Converter um grifo ou seleção em flashcard.
- Gerar cartões de um capítulo ou conjunto de grifos.
- Oferecer geração ao concluir um capítulo, com preferência ajustável.
- Gerar para o livro completo por processamento gradual.
- Organizar conjuntos por livro, capítulo, assunto ou objetivo.
- Abrir o trecho de origem após dificuldade em uma revisão.
- Reunir cartões de vários livros em um conjunto.
- Exportar pergunta, resposta, referências e tags em formato utilizável fora do app, incluindo importação no Anki.
- Sincronizar cartões e revisão quando o serviço estiver disponível.

## 7. Monetização proposta

Grátis: criação manual, estudo offline, edição, exportação e pequena cota de demonstração da geração automática.

Plano Estudo: franquia de geração, processamento mais amplo, organização avançada e sincronização, conforme o pacote comercial definido.

Pacotes adicionais: processamento excedente e OCR, quando houver custo.

Preços e cotas ainda precisam ser definidos. Mantenha limites configuráveis e considere o volume de texto processado e as chamadas ao provedor; quantidade de cartões, sozinha, não representa o custo.

Preserve consulta, revisão local e exportação dos cartões já salvos após o cancelamento. A cobrança limita novos serviços pagos.

Verifique se já existem backend, autenticação, controle de benefícios e faturamento. Não apresente uma trava visual como cobrança integrada. Credenciais de serviços devem permanecer no ambiente apropriado, sem exposição no app ou no bundle Web.

## 8. Implantação e validação

Comece pelo fluxo completo de selecionar conteúdo, gerar cartões reais com origem, revisar/aprovar, persistir, estudar e voltar ao trecho. Avance depois para livro completo, OCR, sincronização e funções avançadas conforme suas dependências.

Se faltar um provedor ou credencial, implemente as partes independentes e registre o bloqueio específico. Não apresente perguntas fixas ou dados fictícios como geração funcional.

Verifique: EPUB, PDF válido e extração inválida; referências; edição e persistência após reabrir; duplicatas; cancelamento; agendamento de revisões; uso offline; exportação; limites de processamento; preservação da posição ao abrir a origem.

Use os comandos existentes no projeto. Diferencie código implementado, testes aprovados, validação em dispositivo pendente e bloqueios externos. Atualize PROJECT_CONTEXT.md e o roadmap com decisões e próximos passos.

Sempre que uma mudança exigir recompilar e reinstalar no Android, avise claramente antes de executá-la:
“Esta alteração exige recompilar e reinstalar o aplicativo no Android. Atualizar pelo Metro/Fast Refresh não será suficiente.”

Explique o motivo e forneça os comandos adequados ao ambiente. Alterações somente de JavaScript ou estilos devem seguir o fluxo de atualização aplicável, sem exigir reinstalação desnecessária.

