# Community, Flashcards/Battle e comunidade futura

> Módulo de referência. Ler somente quando Community, Estudo ou Battle estiver no escopo.
> Texto preservado do PROJECT_CONTEXT.md original (2192 linhas, escrito pelo Codex), movido sem reescrita em 06/11/2026. Trate como hipótese: confira Git/código antes de confiar. O estado atual e as pendências estão em [PROJECT_CONTEXT.md](../../PROJECT_CONTEXT.md).

## 11. Community

Community v0.1 preservada em src/community/ e app/community/, entrada em Ajustes.
Modelos: LiteraryProfile, ReadingStats, ReadingActivity, LiteraryLevel, Achievement,
Progression e contratos Follow, BookClub, DiscussionThread, CommunityPost/Comment/spoilers.
Home/perfil/editor/meta/timeline/prévia de privacidade e foundations de clubes/fóruns/pessoas
existem. Empty states não representam rede social publicada; não iniciar Etapa 2 implicitamente.

LocalCommunityRepository: chave @aldus/community.v1:<userId codificado>, revisão,
serialização v1, filas por storage/conta, corrupção/falha preservando dados. Web exige
Web Locks para escrita entre abas; Native usa AsyncStorage/fila. Provider esconde resultado
de outra identidade e usa Auth apenas na borda; domínio/application não dependem de Supabase.

LegacyReadingDataSource é somente leitura e continua declarando scope=device/userId=null,
com inclusão opt-in por conta e desligada por padrão. Repository da Library ser account-scoped
não autoriza inventar histórico medido. Ausente é null, não zero; última página não é páginas
lidas e última abertura não é sessão. Interrompido não significa abandonado. Sem data real,
occurredAt=null. Não inferir gêneros/tempo/streak/conclusões anuais.

Progressão interna: início 10, conclusão 100, dia medido 5; chaves semânticas impedem pontos
duplicados em refresh/toggle. Releitura exige identidade confiável do evento, não UUID da UI.
Perfil privado por padrão. FOLLOWERS falha fechado sem relação verificada. PUBLIC é prévia local,
não publicação real. XP local não é pontuação autoritativa para enviar ao servidor.

Migration 202610130001_community_foundation.sql prepara profiles/stats/activities/awards/
achievements com auth.users, owner e privacidade. Derivados não aceitam escrita cliente;
atividade pública exige perfil público. Testada em PostgreSQL/PGlite local, não aplicada
remotamente. Não existe SupabaseCommunityRepository nesta entrega. Social graph depende
de servidor/eventos confiáveis, sync/conflitos e testes A/B/anon antes de habilitar publicação.

## 12. Flashcards

Termos da UI: deck/decks e flashcard/flashcards. Editor completo: deck, título centralizado,
afirmação multilinha, true/false explícito, explicação no verso e imagem/desenho opcionais;
frente sem gabarito, verso após resposta, sem área vazia quando não há visual.
Criação/edição preserva rascunho em falha, previne toque duplicado e confirma saída alterada.
PNG/JPEG/WebP até 3 MB; desenho local com traço/apagar/desfazer/limpar e limite 2.500 pontos.
Título até 240, afirmação 20.000, explicação 30.000 caracteres; não definir gabarito silencioso.

| Resposta | Julgamento | Confiança | Acerto / erro |
| --- | --- | --- | --- |
| XX | Falso | Alta | +10 / -10 |
| X | Falso | Baixa | +5 / -5 |
| ✓ | Verdadeiro | Baixa | +5 / -5 |
| ✓✓ | Verdadeiro | Alta | +10 / -10 |

Zero inicial, negativos permitidos, verde=acerto e vermelho=erro, inclusive gabarito falso.
Mesma regra versionada no Study e Battle; sem bônus/cronômetro. Resposta/avanço e conteúdo
congelado são duráveis/idempotentes antes de revelar. Resumo mostra pontos/acertos/erros/
explicações; retomar não reinicia a sessão. SRS SM-2 existente é preservado, separado do placar.

Persistência por conta @kindle/flashcards.v1:<UUID>, SQLite kv-store kindle-flashcards.db
no Native e IndexedDB kindle-flashcards/snapshots na Web. Migração copia legado da mesma
conta sem apagá-lo/sobrescrever o novo. Quota falha explicitamente; oncomplete confirma Web.
Cartões incompletos exigem revisão antes de uso. Geração local por capítulos/grifos cria
rascunhos editáveis com origem, sem IA remota/gabarito inventado. Origem exata pelo Reader,
Anki e sync de cartões/revisões ainda são evoluções, não parte do engine da Library.

Batalha: cliente Supabase e RPC public.flashcard_battle(action,payload), auth.uid,
schema flashcard_private, snapshots/filas/gabaritos privados e pontuação no servidor.
N=3/5/10/15; dois usuários distintos escolhem decks suficientes e confirmam.
A fornece N para B e B fornece N para A, sorteio sem repetição e sem mudar propriedade.
Cada um avança independentemente; primeiro a terminar espera; maior pontuação vence, empate
por igualdade. Sem derrota por desconexão, expiração ou abandono presumido.
Retomada consulta partida; polling de 3s só na tela ativa/foreground. Deck de batalha até
500 cartões/16 MB; gabarito/explicação não são enviados antes da resposta aceita.

Cliente Battle congela UUID/epoch/JWT para toda operação upload→join, usa HTTP autenticado
com cancelamento ao trocar conta e rejeita resposta A→B→A. UI remonta somente o conteúdo
da batalha ao mudar UUID e ignora load/resultado após blur. Não altera estudo/SRS local.
Testes test-battle-account.cjs e PostgreSQL real test-flashcard-battles.cjs não equivalem
a duas sessões Supabase autenticadas independentes.

Migration 202610090001_flashcard_battles.sql e supabase/tests/flashcard_battles_manual.sql
passaram historicamente em PostgreSQL isolado; usuário informou deploy real como versão
20261015144958=flashcard_battles. Não reaplicar. Duas sessões reais continuam pendentes.
Verificar Auth/ledger antes de aplicar. O projeto doador C:/Flashcards não é o backend do Aldus:
JWT distinto, gateway com isCorrect do cliente e regras de HP/velocidade não são reutilizados.
Nenhuma geração por IA/cobrança/serviço doador deve ser anunciada como concluída.

## 13. Comunidade futura

Sequência real: Social Graph/perfis públicos → feed → clubes/leitura conjunta → fóruns/
teorias/spoilers → desafios/achievements ampliados → moderação/denúncias/bloqueios.
Relações/verificações, acesso a clubes, autoria e eventos/XP devem ser autoritativos no servidor.
Sem criar followers/clubes/posts falsos, ativar FOLLOWERS ou enviar livros privados por padrão.
