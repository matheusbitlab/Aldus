# Decks, flashcards, estudo e batalha — 09/10/2026

Estado: **IMPLEMENTADO / VALIDADO EM TESTES LOCAIS**. **Android novo módulo e batalha entre duas contas no Supabase remoto: NÃO TESTADOS**. Nenhum APK foi gerado nesta etapa. Fonte funcional: `CONTEXTO_FLASHCARDS.md` e pedido de 09/10; as propostas agora escolhidas são ±10/±5, sorteio sem repetição, avanço independente sem cronômetro, maior pontuação/empate e retomada sem derrota automática.

## Fluxos entregues

- Estudo → Novo deck; abrir deck permite editar nome, listar/editar seus flashcards, criar outro, estudar e usar na batalha. A listagem atualiza ao voltar da navegação.
- Editor completo em tela cheia: deck, título, afirmação multilinha, gabarito explícito, explicação multilinha, prévia frente/verso, salvar/cancelar. Nenhum gabarito é escolhido para um flashcard novo. Falhas preservam os campos; saída com alterações pede confirmação, navegação é interceptada e Web tem proteção beforeunload. ID do rascunho é estável durante retentativas; toque duplicado é bloqueado.
- Anexo PNG/JPEG/WebP até 3 MB, visualização ampliada, substituição e remoção. Dados são incorporados ao flashcard, sem depender de URI temporária do picker. Desenho local com traço livre, apagar traços tocados, desfazer, limpar e salvar; nenhuma biblioteca nativa adicional. Sem imagem/desenho, não existe área vazia reservada.
- Frente com título centralizado, afirmação e visual opcional. XX/X/✓/✓✓ têm rótulos completos. Verso revela gabarito do autor, explicação, escolha e pontos somente após resposta. Verde/vermelho expressam acerto/erro, incluindo acerto em afirmação falsa. Virada curta tem alternativa sem movimento por AccessibilityInfo.
- Regra compartilhada entre os modos no domínio: certeza +10/−10; talvez +5/−5; zero inicial e valores negativos. Backend tem regra central privada versionada correspondente; testes verificam paridade nas oito combinações. Não há velocidade, sequência, bônus, ranking ou cronômetro.
- Estudo grava sessão/conteúdo congelado/resposta/pontos/avanço no mesmo snapshot serializado, antes de revelar/avançar. Resposta e avanço são idempotentes por sessão/flashcard. Rerender, virada e saída/retorno não reiniciam a sessão. Resumo inclui pontos/acertos/erros e explicações; nova sessão é uma ação explícita.
- Flashcards antigos continuam armazenados. Sem título/gabarito explícito/explicação, precisam ser completados no editor antes de participar. Geração local do livro salva rascunhos para revisão; não inventa gabarito verdadeiro. A origem e os metadados SRS existentes são preservados na edição.

## Persistência e limites

Dados continuam separados por conta: `@kindle/flashcards.v1:<auth.users UUID>`. Native usa o módulo já instalado expo-sqlite/kv-store em `kindle-flashcards.db`; Web usa IndexedDB `kindle-flashcards`, store `snapshots`. A leitura inicial copia a chave legada AsyncStorage da mesma conta quando ainda não existe registro novo; não apaga o legado, não sobrescreve cópia nova e não atribui dados globais a outra conta. Escrita IndexedDB só resolve após transaction.oncomplete. O fallback `.ts` existe para ferramentas sem seleção de plataforma.

Isso acomoda imagens e cópias estáveis de sessões sem depender de snapshots grandes em localStorage. Quota/espaço do dispositivo ainda podem falhar: a UI informa falha e mantém o preenchimento/última escrita confirmada. Ao executar uma versão anterior do aplicativo, as edições feitas no armazenamento novo não aparecerão no snapshot legado preservado; não é sincronização entre versões/dispositivos.

Limites explícitos: título 240 caracteres, afirmação 20.000, explicação 30.000, imagem 3 MB, desenho 2.500 pontos. Upload de deck para batalha: até 500 flashcards completos e 16 MB por payload; usar deck/imagens menores quando o servidor rejeitar o tamanho. Imagens antigas cadastradas apenas por URL precisam ser reanexadas para a batalha. Estudo e decks próprios continuam locais; entrar na batalha envia somente o deck escolhido, após a ação do usuário.

## Backend da batalha

Reutiliza Supabase Auth/cliente configurado/perfis/controle da feature existentes. `public.flashcard_battle(action,payload)` é o único RPC exposto; não aceita pontuação/acerto/proprietário declarados pelo cliente. Identidade vem de auth.uid(); conta ativa/username/feature são conferidos no servidor. Conteúdo, fila, participantes, itens e regra de pontuação estão no schema `flashcard_private`, sem grants/policies cliente de leitura direta. RLS está habilitada e o RPC SECURITY DEFINER usa search_path vazio e objetos qualificados. Referências: [Supabase Database Functions](https://supabase.com/docs/guides/database/functions), [PostgreSQL CREATE FUNCTION](https://www.postgresql.org/docs/17/sql-createfunction.html).

N = 3/5/10/15; fila pareia somente contas distintas com a mesma quantidade e decks suficientes. Ambos confirmam deck/quantidade. Ao iniciar, o servidor sorteia N sem repetição de cada deck e congela o conteúdo para o outro participante. A troca não muda proprietário nem importa flashcards na coleção adversária.

O RPC retorna apenas campos públicos da frente enquanto não houver resposta aceita. Gabarito, explicação, back e fonte privada ficam ocultos. Depois, calcula julgamento/acerto/pontos no servidor e publica apenas a resposta do próprio participante. PK por partida/participante/ordinal e coordenação transacional tornam retentativas idempotentes. Avanço é independente e explicitamente solicitado; quem termina espera. Quando ambos respondem N, resultado é persistido e comparado, com empate por igualdade. Cada um pode consultar suas explicações antes de configurar outra partida.

Retomada consulta a fila/partida persistida, sem recriar a partida nem impor derrota por rede. Cliente atualiza por RPC a cada três segundos enquanto a tela está ativa/foreground e permite reconectar manualmente; não requer publicação Realtime, Redis ou Socket.IO. Cancelamento funciona na busca/configuração; partida já iniciada permanece retomável. **Não há regra de expiração/abandono/desistência/vitória automática**: uma partida sem retorno do adversário pode permanecer aguardando. Lock transacional global prioriza consistência nesta primeira implementação; escala/carga remotas não foram testadas.

Inspeção do doador `C:\Flashcards`: gateway aceita userId/isCorrect do cliente, usa sessão em memória, HP/bônus de velocidade e JWT próprio com identidade diferente do Supabase. Não foi reutilizado como backend autoritativo. Nenhum arquivo do doador ou tabela legada public.decks/cards/battles foi alterado; novos objetos não presumem vínculo dos UUIDs legados com auth.users.

## Habilitação externa — passos exatos

1. No mesmo projeto Supabase de `.env.local`, verificar `public.profiles` e `public.user_feature_overrides` conforme `AUTH_IMPLEMENTATION.md`/`supabase/audit/01_inventory.sql`. A migration nova depende do contrato Auth existente (FK para auth.users, username, account_status, role e feature). Presença de arquivos locais não comprova aplicação remota; resolver prerequisites de Auth conforme o guia existente se ainda faltarem.
2. Supabase Dashboard → SQL Editor → New query: executar integralmente `supabase/migrations/202610090001_flashcard_battles.sql`. O arquivo é transacional, aditivo e notifica o PostgREST para recarregar schema. Não executar novamente após sucesso. Não copiar service_role/JWT_SECRET para o app; o cliente continua usando as variáveis públicas já existentes.
3. Em um projeto de TESTE, com duas contas distintas confirmadas, perfis ativos/username e flashcards habilitados, substituir os UUIDs de `supabase/tests/flashcard_battles_manual.sql`. Executar integralmente no SQL Editor; o teste simula claims/role authenticated dentro de uma transação e termina em ROLLBACK. Usa contas sem fila/partida atual. Não é prova de login/app em dois aparelhos.
4. Teste real: abrir duas sessões independentes autenticadas, criar deck completo em cada conta, escolher a mesma quantidade, buscar e confirmar ambos. Verificar que cada um recebe o deck adversário e somente a frente; responder, conferir verso/pontos, avançar até terminar primeiro e aguardar. Desconectar/reabrir uma sessão, consultar a mesma partida e completar a segunda. Conferir vencedor/empate/placares iguais nas duas telas e revisar explicações.
5. Repetir 3/5/10/15, deck insuficiente, cancelamento da busca/configuração, erro/transmissão repetida e edição do deck após início. Usar duas contas com acesso permitido; uma conta com override flashcards=false será corretamente bloqueada.

Sem aplicar/configurar o backend, a tela informa que a batalha não foi habilitada; não substitui multiplayer por simulação local. Nenhuma migration foi aplicada ao Supabase por esta execução.

## Verificações

Preparação das ferramentas de teste isoladas (sem modificar package.json/lockfile do app):

```powershell
npm.cmd install --prefix .expo/flashcard-db-test --no-save --package-lock=false @electric-sql/pglite@0.5.8 fake-indexeddb
npm.cmd install --prefix .expo/auth-test-tools --no-save --package-lock=false react@19.2.3 react-test-renderer@19.2.3
```

```powershell
npm.cmd run typecheck
node scripts/test-flashcard-scoring.cjs
node scripts/test-flashcards.cjs
node scripts/test-flashcard-sessions.cjs
node scripts/test-flashcard-storage.cjs
node scripts/test-flashcard-ui.cjs
node scripts/test-flashcard-battles.cjs
node scripts/test-auth.cjs
node scripts/test-reader-screen.cjs
npm.cmd run build
git -c core.safecrlf=false diff --check
```

PASS: oito combinações nos dois modos; persistência/SRS/geração existentes; sessões idempotentes, congelamento, falha de escrita, contas separadas, saída/retorno e resumo; componentes React editor/desenho/estudo; IndexedDB em fake-indexeddb com commit/abort e payload 8 MB; adaptador Native com SQLite real Node, sem testar ponte Expo; migration/RPC e script SQL em PostgreSQL WASM PGlite, com dois actors autenticados e outsider/anon/feature/conta desabilitada, todas as quantidades, conteúdo congelado, segredo, retentativas, retomada, espera e empate. Esse banco é isolado, não o Supabase remoto.

TypeScript/export Web/diff verificados no fechamento. Instrumentos React-test-renderer são testes controlados e emitiram aviso de depreciação, sem falha; não são smoke de navegador autenticado ou prova Android. **Não executados**: novo módulo no Android, picker/desenho/toque/teclado físicos, ponte Expo SQLite, IndexedDB real de navegador e batalha em duas contas remotas. Nenhum build/prebuild/instalação Android foi feito.

## Android e Metro

Fechamento 09/10: TypeScript PASS; export Web final PASS (2344 módulos, `.expo/flashcards-web-export-final.log`); diff global PASS; Auth/ReaderScreen de preservação PASS. SHA256 do APK antigo permaneceu `BF49499ADB7079BA0ED8696935EC84E418FE4D74C30BA8E8094A430BF6D38F33`, sem compilação/instalação nova.

São mudanças JavaScript/TypeScript e SQL, com expo-document-picker/expo-file-system/expo-sqlite já presentes; package.json, lockfile, app.json e configurações Android não foram alterados. **Não exigem novo módulo nativo**: em development build compatível, testar com `npm.cmd start -- --dev-client`, conectando o cliente de desenvolvimento ao Metro, depois de habilitar o backend para a batalha.

O **APK release atualmente instalado contém o bundle anterior**. Para distribuir/testar estas alterações nesse APK release, será necessário **recompilar e reinstalar Android em uma etapa futura**, preservando dados. Nenhum APK novo foi gerado, conforme solicitado. O teste físico do Reader de 09/10 permanece histórico e não valida este módulo novo.

## Arquivos da entrega

- Rotas: `app/(tabs)/study.tsx`, `app/study/[deckId].tsx`, `app/decks/[deckId].tsx`, `app/battle.tsx`, registros protegidos em `app/_layout.tsx`.
- Domínio: `src/domain/types/flashcards.ts`, `src/domain/repositories/FlashcardRepository.ts`, `src/domain/study/flashcardScoring.ts`, `flashcardBattle.ts`.
- Dados: `src/data/local/FlashcardRepository.ts`, `flashcardStorage.ts`, `flashcardStorage.native.ts`, `flashcardStorage.web.ts`, `src/data/remote/FlashcardBattleRepository.ts`.
- UI: `src/presentation/screens/FlashcardStudyScreen.tsx`; componentes FlashcardCreateModal/CardView/ConfidenceControls/Visual/Flip/SessionView em `src/presentation/components/flashcards`.
- Banco/testes: migration e SQL manual acima; scripts test-flashcards/scoring/sessions/storage/ui/battles; adaptado o carregador de test-auth ao novo storage, mantendo as verificações de permissões/isolamento existentes.
- Contexto: este documento, `CONTEXTO_FLASHCARDS.md`, `PROJECT_CONTEXT.md`, `ROADMAP_FUNCIONALIDADES.md` e `INTEGRATION_FLASHCARDS.md`.

Reader/EPUB/PDF/progresso/âncoras, livros, Auth, fontes e anti-enjoo não foram refatorados. Alterações anteriores do worktree foram preservadas; Flashcards agora estão explicitamente no escopo deste novo pedido, diferente da campanha APK anterior.
