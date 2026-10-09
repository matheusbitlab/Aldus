# Contexto funcional — decks, flashcards, estudo e batalha

Este documento registra o comportamento desejado para o módulo de flashcards do projeto Kindle reader. Serve como fonte de contexto para futuros prompts de implementação. É uma especificação de produto; não comprova que as funcionalidades já existem no código.

## Decisões e estado após o pedido de 09/10/2026

O novo pedido confirmou ±10 na alta confiança/±5 na baixa, zero inicial/negativos, sorteio sem repetição, avanço independente sem cronômetro, maior pontuação/empate e retomada sem derrota automática. Portanto, as decisões numéricas/seleção/resultado abaixo deixaram de ser propostas abertas nesta implementação. Desenho foi implementado dentro do app com lápis, apagar, desfazer, limpar e salvar.

Implementação/verificações/limites e passos exatos de Supabase em `FLASHCARDS_IMPLEMENTACAO.md`. Testes locais do editor/estudo/armazenamento e PostgreSQL autoritativo passaram; migration não aplicada remotamente, batalha com duas contas reais e módulo Android NÃO TESTADOS. Nenhum APK gerado. Os critérios funcionais seguintes permanecem como especificação; não interpretar testes isolados como implantação real.

## 1. Objetivo e terminologia

Permitir que o usuário crie seus próprios decks e flashcards, estude individualmente e participe de batalhas contra outros usuários reais do sistema. O aprendizado combina afirmações verdadeiras ou falsas, escolha do grau de confiança, pontuação e explicação após responder.

Usar sempre os termos **deck**, **decks**, **flashcard** e **flashcards** na interface e nos próximos prompts. Não substituir esses termos por “baralho” ou “carta”. Os demais textos da interface permanecem em português.

## 2. Requisitos confirmados e propostas

São requisitos confirmados: tela completa de criação; título; pergunta/afirmação; gabarito verdadeiro ou falso; imagem/desenho opcional; explicação no verso; modos estudo e batalha; troca de flashcards entre dois usuários; quantidades de 3, 5, 10 ou 15 por participante; quatro respostas por nível de confiança; maior recompensa e maior penalidade nas respostas de certeza; mesma regra de resposta e pontuação nos dois modos; interface limpa, fluida, colorida, bonita e intuitiva.

Os valores numéricos de pontuação, critérios de seleção dos flashcards e regras de desconexão ainda não foram definidos pelo usuário. As propostas abaixo são uma base para futuros prompts, não decisões previamente aprovadas. A quantidade escrita como “3,510 ou 15” foi interpretada como **3, 5, 10 ou 15**.

## 3. Organização em decks

Um deck reúne flashcards do usuário. A interface deve permitir visualizar o deck, seus flashcards e a quantidade disponível, além de acessar criação, edição e estudo. Para entrar em uma batalha, o usuário escolhe o deck que fornecerá seus flashcards ao adversário.

Recomenda-se mostrar nome do deck e quantidade de flashcards na listagem, com ações claras de abrir, estudar e usar na batalha. Recursos adicionais, como tags, categorias, rankings e compartilhamento público, não fazem parte obrigatória deste escopo.

## 4. Tela completa de criação e edição

O usuário deve receber uma tela dedicada e completa, adequada ao celular e com espaço suficiente para escrever e revisar o conteúdo.

| Campo | Comportamento esperado |
| --- | --- |
| Deck | Indicar ou selecionar o deck ao qual o flashcard pertence. |
| Título | Identificação curta do flashcard; aparece centralizada na frente. |
| Pergunta/afirmação | Campo de texto multilinha. Deve representar uma afirmação que possa ser julgada verdadeira ou falsa. |
| Gabarito | Seleção explícita entre “Verdadeiro” e “Falso”, usada na validação das respostas. |
| Imagem/desenho | Conteúdo visual opcional, com opção de adicionar, visualizar, substituir e remover. |
| Explicação | Texto que esclarece por que a afirmação é verdadeira ou falsa, mostrado no verso após responder. |

Recomendação de validação: título, afirmação, gabarito e explicação são necessários para concluir a criação; imagem/desenho é opcional. Não definir o gabarito silenciosamente: exigir uma escolha consciente. Se a afirmação for falsa, incentivar que a explicação apresente também a informação correta.

“Imagem/desenho” deve contemplar imagem anexada e desenho. A forma de desenhar ainda precisa ser decidida: ferramenta dentro do app ou importação de uma imagem desenhada. Não considerar que anexar uma fotografia, sozinho, atende automaticamente a uma ferramenta de desenho.

Incluir pré-visualização da frente e do verso antes de salvar. Na pré-visualização do criador, o gabarito pode aparecer; durante estudo ou batalha, deve permanecer oculto até a resposta. Preservar os campos preenchidos quando ocorrer um erro ao salvar e proteger contra perda acidental de alterações.

## 5. Frente e verso do flashcard

O desenho enviado pelo usuário orienta a composição: título centralizado na parte superior, afirmação abaixo, imagem/desenho opcional após o texto e controles de resposta na região inferior.

Se não houver imagem, não reservar um retângulo vazio. Textos grandes devem poder ser lidos integralmente, com rolagem quando necessário e sem esconder os controles. Imagens devem manter sua proporção, com ampliação quando útil para leitura.

A frente apresenta somente o conteúdo necessário para responder. Não revelar gabarito, explicação ou pistas visuais que indiquem a resposta correta.

Após responder, a interface apresenta o resultado e vira o flashcard para mostrar o verso. O verso contém o gabarito, a explicação, a resposta escolhida e os pontos ganhos ou perdidos. O usuário decide quando seguir para o próximo flashcard, tendo tempo para ler a explicação.

O verde representa **acerto do usuário**, e o vermelho representa **erro do usuário**. Não usar vermelho apenas porque o gabarito é falso: responder corretamente a uma afirmação falsa também é um acerto e recebe feedback verde.

## 6. Quatro opções de resposta

O conteúdo continua tendo um gabarito binário. As quatro opções combinam o julgamento do usuário com seu grau de confiança; não são quatro gabaritos diferentes.

| Símbolo | Texto na interface | Julgamento | Confiança |
| --- | --- | --- | --- |
| XX | Certeza de que é falso | Falso | Alta |
| X | Talvez seja falso | Falso | Baixa |
| ✓ | Talvez esteja correto | Verdadeiro | Baixa |
| ✓✓ | Certeza de que está correto | Verdadeiro | Alta |

Sugestão de ordem visual: **XX, X, ✓, ✓✓**, expressando uma escala de confiança. No celular, os controles podem usar uma grade de duas colunas se isso melhorar a legibilidade. Exibir rótulos junto aos símbolos; não depender apenas de cor ou ícone para comunicar a opção.

Ao tocar em uma opção, registrar uma única resposta definitiva para aquele flashcard na sessão. Bloquear toques repetidos durante a validação e a animação. A virada não pode permitir escolher outra resposta depois de conhecer o gabarito.

## 7. Pontuação compartilhada entre os modos

Regra confirmada: respostas de certeza rendem mais pontos quando certas e retiram mais pontos quando erradas. Respostas de menor confiança têm recompensa e penalidade menores.

**Proposta inicial de valores, ajustável:**

| Escolha | Gabarito falso | Gabarito verdadeiro |
| --- | ---: | ---: |
| XX — certeza de que é falso | +10 | −10 |
| X — talvez seja falso | +5 | −5 |
| ✓ — talvez esteja correto | −5 | +5 |
| ✓✓ — certeza de que está correto | −10 | +10 |

O acerto depende da correspondência entre julgamento e gabarito. A confiança define a magnitude dos pontos. Exemplo: em uma afirmação falsa, XX acerta com alta confiança; X acerta com baixa confiança; ✓ e ✓✓ erram.

Recomendação: iniciar cada sessão em zero e permitir pontuação negativa, para que as penalidades tenham efeito integral. A tabela deve ser apresentada antes de iniciar e aplicada de forma idêntica no estudo e na batalha. Não introduzir bônus de velocidade, sequência ou tempo sem uma decisão adicional.

Implementar a regra em uma lógica de domínio compartilhada e versionada, evitando tabelas diferentes entre telas. Na batalha, a validação autoritativa precisa ocorrer no backend; o cliente não deve declarar seu próprio resultado ou saldo.

## 8. Modo estudo individual

Fluxo esperado:

1. O usuário abre um deck e inicia o estudo.
2. O sistema mostra a frente de um flashcard e as quatro respostas.
3. O usuário escolhe julgamento e confiança.
4. O sistema valida, aplica os pontos e apresenta feedback.
5. O flashcard vira e revela gabarito e explicação.
6. O usuário lê e avança.
7. Ao terminar, recebe um resumo da sessão.

O resumo deve mostrar pontuação, quantidade de respostas, acertos e erros. Recomenda-se distinguir erros de alta confiança, pois indicam conteúdos que o usuário julgava dominar. A regra de revisão posterior, como repetição espaçada, é uma evolução possível e não está definida neste pedido.

## 9. Modo batalha entre usuários reais

A batalha deve parear dois usuários que utilizam o sistema. O pareamento e a troca precisam existir de verdade; uma simulação local não atende ao modo solicitado.

Antes da partida, definir a quantidade de flashcards por participante: **3, 5, 10 ou 15**. Ambos devem aceitar a mesma configuração e selecionar seus decks de origem.

Em uma partida de N flashcards:

- O participante A fornece N flashcards do seu deck para B responder.
- O participante B fornece N flashcards do seu deck para A responder.
- Cada participante responde N flashcards recebidos do adversário.
- Há 2N flashcards fornecidos ao todo, mas cada participante responde somente N.

Exemplo: numa partida de 5, A envia 5 e recebe 5; B envia 5 e recebe 5. A responde os flashcards de B e B responde os de A.

A troca é de conteúdo para uso na partida. Não implica transferir propriedade, excluir flashcards do deck original ou incorporar automaticamente os flashcards recebidos à coleção permanente do outro usuário.

### Seleção e início

A forma de escolher os N flashcards ainda está aberta. Pode ser seleção manual pelo dono ou sorteio pelo sistema. Proposta inicial: sorteio sem repetição dentro do deck escolhido, informado claramente antes de confirmar a partida.

Se um deck não tiver N flashcards válidos, impedir o início nessa configuração e oferecer escolher outra quantidade ou outro deck. Não duplicar flashcards silenciosamente para completar a partida.

Antes de começar, registrar uma cópia estável do conteúdo utilizado, incluindo gabarito e explicação. Edições posteriores no deck não podem alterar uma partida em andamento. Manter os dados de resposta ocultos no cliente até a validação autorizar sua revelação.

### Durante a partida

Cada usuário responde com as mesmas quatro opções e a mesma pontuação do estudo. Mostrar adversário, progresso e pontuação pessoal de forma clara. A visibilidade do placar do adversário durante a partida ainda pode ser definida; não é necessária para permitir responder e aprender.

Proposta inicial: cada participante avança no próprio ritmo, sem limite de tempo. Depois de concluir seus N flashcards, aguarda o outro participante. Não impor rodadas sincronizadas ou vitória por velocidade sem nova definição.

### Resultado

Quando ambos concluírem, comparar a pontuação final. Proposta inicial: maior pontuação vence; pontuações iguais resultam em empate, sem desempate oculto por velocidade.

Mostrar vencedor ou empate, pontuação de ambos, acertos e erros, com possibilidade de revisar as explicações dos flashcards respondidos. Informar que os gabaritos são os cadastrados pelos autores; a validação automática não comprova a verdade do conteúdo escrito.

### Consistência e interrupções

A partida precisa ter estados claros: configuração/pareamento, aguardando confirmação, em andamento, aguardando adversário, concluída e interrompida. Uma resposta repetida por retransmissão não pode gerar pontuação duplicada. Reabrir a tela não pode apagar respostas já aceitas.

Recomenda-se reconexão e retomada enquanto a partida continuar ativa. Os critérios de abandono, expiração e eventual vitória por desistência precisam ser definidos antes de implementados; não atribuir derrota automaticamente por uma oscilação de conexão.

## 10. Interface e animações

A experiência deve ser limpa, fluida, bonita e intuitiva. Usar hierarquia visual clara, espaçamento confortável, cantos suaves e cores consistentes com o app existente.

Priorizar o conteúdo do flashcard. Na tela de resposta, mostrar título, afirmação, imagem opcional, progresso, pontuação e as quatro opções, evitando painéis que concorram com a leitura.

Usar animação curta de virada entre frente e verso, feedback de acerto/erro e transição suave para o próximo flashcard. O feedback pode combinar brilho discreto ou contorno colorido, mensagem textual e indicação de pontos. Evitar flashes intensos e excesso de efeitos. Respeitar redução de movimento e garantir uma alternativa sem virada animada.

Em temas claro e escuro, manter contraste e leitura. O teclado não deve cobrir campos ou ações da criação, e os controles devem respeitar as áreas seguras do celular. Animações e abertura de painéis não podem recriar o flashcard, reiniciar a sessão ou perder a resposta.

## 11. Dados e responsabilidades para futuros prompts técnicos

Antes de implementar, inspecionar a estrutura real do projeto e os recursos existentes. Não presumir nomes de arquivos, bibliotecas, tabelas ou funcionalidades prontas.

Como modelo conceitual, prever:

- **Deck:** identificação, proprietário, nome e flashcards associados.
- **Flashcard:** identificação, deck, título, afirmação, gabarito booleano, imagem/desenho opcional, explicação e versão.
- **Resposta:** sessão, participante, flashcard apresentado, julgamento, confiança, acerto, pontos e momento da resposta.
- **Sessão de estudo:** usuário, deck, sequência apresentada, progresso, pontuação e situação.
- **Batalha:** participantes, quantidade por usuário, decks de origem, conteúdo congelado, versão da pontuação, progresso e resultado.

A lógica de validação, o componente de apresentação e a tabela de pontuação devem ser reaproveitados entre os modos. As sessões têm persistência e coordenação diferentes, mas o significado das respostas é o mesmo.

No multiplayer, garantir autorização por participante, proteção do gabarito antes da resposta, validação no servidor e atualização consistente do estado. Não resolver uma batalha real apenas mantendo dois placares locais.

## 12. Critérios de aceitação

1. A criação oferece todos os campos solicitados e permite pré-visualizar frente e verso.
2. Imagem/desenho é opcional e sua ausência não cria espaço vazio no flashcard.
3. Estudo e batalha exibem XX, X, ✓ e ✓✓ com rótulos compreensíveis.
4. Todas as combinações entre gabarito e confiança produzem o resultado e os pontos esperados.
5. A explicação aparece após responder, com virada ou alternativa acessível.
6. O feedback verde/vermelho depende de acerto/erro do usuário.
7. Uma resposta não pode ser alterada após revelar o gabarito nem pontuada duas vezes.
8. A batalha funciona entre dois usuários reais e aceita 3, 5, 10 ou 15 flashcards por participante.
9. Cada participante responde à mesma quantidade de flashcards do deck do adversário.
10. Um deck insuficiente não inicia a configuração escolhida nem gera duplicações silenciosas.
11. O conteúdo da partida permanece estável mesmo após edição do deck original.
12. O resultado final segue uma regra explícita e mostra a pontuação dos dois usuários.
13. Textos extensos, teclado, imagens, temas e áreas seguras funcionam no celular.
14. A interface usa deck e flashcard em todos os fluxos.

## 13. Orientação permanente para os próximos prompts

Usar este documento como contexto funcional, distinguindo requisitos confirmados das propostas ajustáveis. Ao gerar um prompt de implementação, especificar quais propostas foram escolhidas e quais decisões continuam abertas. Evitar ampliar o escopo com rankings, monetização, cronômetros ou outras funcionalidades sem solicitação.

Validar a implementação com verificações adequadas ao projeto e testes das regras de pontuação, persistência e coordenação entre dois usuários. Não afirmar que o APK foi testado quando houve apenas validação web.

**Avisar explicitamente se alguma alteração exigir recompilar e reinstalar o aplicativo Android.** Distinguir isso das alterações que podem ser testadas com a atualização do JavaScript pelo Metro no ambiente de desenvolvimento existente.
