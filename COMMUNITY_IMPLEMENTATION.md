# Comunidade literária — Etapa 1

Branch obrigatória: `feature/comunidade-literaria`.
Commit base: `566e8a6da8efe6ae4da265dea097cf778e348d92`.
Base recebida limpa; histórico anterior preservado. Esta branch é um snapshot antigo;
a main mais recente está em outro computador. A implementação prioriza isolamento e cherry-pick.

## Checkpoint — domínio

Módulo puro em `src/community/domain`: perfil, privacidade PUBLIC/FOLLOWERS/PRIVATE,
metas, métricas, progressão, atividades, conquistas e contratos de seguidores, clubes,
threads, posts, comentários e spoilers. Sem dependências novas.

Dados ausentes são `null`. Interrompido não significa abandonado. Última página não
significa páginas lidas; última abertura não significa sessão de leitura. Datas anuais/mensais
não são inferidas. Pontos internos: início 10, conclusão 100, dia medido 5.
Uma chave semântica mantém início uma vez por livro; conclusão uma vez por livro ou
identidade de releitura fornecida por fonte futura confiável. Abrir/fechar não pontua.
FOLLOWERS permanece fechado para terceiros sem relação verificada.

`node scripts/test-community-domain.cjs` cobre os contratos e cálculos.
Domínio: commit `1ed4496`, push PASS. Typecheck da base e do domínio PASS.

## Checkpoint — dados e aplicação

`LocalCommunityRepository` usa storage injetável, chave por conta e fila compartilhada
por storage/conta. Serialização v1 valida identidade, versões, privacidade, pontos e
duplicatas. Falhas/corrupção não apagam nem substituem os dados. Edição rejeita versão antiga.
O lock opcional permite serialização entre abas Web no adapter de composição.

`CommunityService` recebe ports de identidade, repository e leitura. Não conhece Auth,
Supabase ou Router. A fonte antiga lê BookRepository, ReadingProgressRepository e a
organização existente sem escrever. Prioriza progresso persistido e status explícito.
Biblioteca desta base tem escopo DEVICE; nenhum livro é automaticamente atribuído à conta.
A inclusão na jornada local é opt-in por conta. Sem opt-in, métricas do dispositivo
podem ser vistas, mas não geram pontos/atividades. Nenhuma informação é publicada.

Observações sem data preservam `occurredAt: null` e usam apenas `recordedAt` para ordenar
a timeline. Desativar/reativar a inclusão não elimina as chaves já pontuadas. A fonte
futura ACCOUNT precisa enviar eventos confiáveis e uma identidade real por releitura;
não deve aceitar IDs de conclusão arbitrários vindos da interface.

`node scripts/test-community-data.cjs`: reload, duas contas, opt-in, toggles,
serialização, duas instâncias concorrentes, revisão antiga, corrupção, disco cheio,
adapter somente leitura e troca de conta. PASS. UI e schema ainda em implementação.

Repository/adapters: commit `03e4ff9`, push PASS, typecheck PASS.
Hardening de evidência: status/progresso/datas/medidas inválidos rejeitam métricas;
dia medido deve existir no calendário e corresponder à data do evento.
Não transformar progresso corrompido em livro não iniciado. Tests domínio/dados PASS.
Hardening: commit `a99bfb9`; push verificado antes do checkpoint seguinte.

## Checkpoint — UI navegável

Entrada: **Ajustes → Comunidade literária**. Sem reorganizar tabs.
Rotas `app/community`: index, profile, edit-profile e `[section]` para clubs/forums/people.
Home: identidade, progressão, meta, métricas locais, inclusão explícita e timeline.
Perfil: bio/favoritos, jornada, meta e atividade; prévia para terceiros aplica privacidade.
Editor: nome de exibição, bio, favoritos, meta/ano e privacidade de perfil/novas atividades.
Identidade/username/avatar são recebidos por adapter; não há upload novo.
Perfil privado por padrão. A prévia é local: não equivale a publicação real.
Sem contadores fictícios de seguidores; destinos futuros têm empty states navegáveis.
Tema/paleta atual, safe areas, targets de 48, labels e barras acessíveis preservados.

Composição isolada: `adapters/runtime.ts` importa as dependências antigas sem modificá-las;
`CommunityProvider` lê Auth somente na borda e oculta resultados de outra identidade.
Web exige Web Locks para read-modify-write entre abas; indisponibilidade falha explicitamente.
Native usa fila por chave e AsyncStorage existente. Sem SQLite migration/dependência nova.

Arquivos centrais alterados: `app/_layout.tsx` (uma rota dentro de Stack.Protected),
`app/(tabs)/settings.tsx` (uma seção/entrada), `.gitignore` (artifacts/apk).
`Href` nas rotas permite checkout com tipos Expo Router gerados anteriormente;
rotas reais e destinos são cobertos pelos testes controlados e pela exportação.

Gates: typecheck, testes Community domínio/dados/UI, organização de biblioteca,
Auth flows/auth-only e export:web PASS. Export Web: 2372 módulos.
Nenhum teste antigo afetado falhou. Reader, Auth, Library repositories e migrations
históricas permanecem inalterados. UI controlada não é teste físico/navegador autenticado.

`scripts/build-community-apk.ps1` usa o wrapper release local existente, exige a branch,
salva `artifacts/apk/Aldus-community-<hash>.apk`, verifica assinatura/bundle e produz
manifesto JSON ignorado. Não instala nem limpa dados. Primeiro APK será gerado após
este commit de UI; outro após o commit final da Etapa 1.

UI: commit `a40f132`, push PASS. A primeira chamada parou antes da compilação:
`NoDefaultCurrentDirectoryInExePath=1` impede resolver `gradlew.bat` sem caminho.
Contraprova: `gradlew.bat --version` FAIL; caminho absoluto `--version` PASS (Gradle
9.3.1/JDK17). O helper Community passa a invocar o wrapper por caminho absoluto;
helper histórico, projeto Android, dependências e configuração permanecem intactos.

## Checkpoint — métricas ausentes e APK da UI

`e862f1b — fix: keep unmeasured community metrics unavailable`: a fonte declara
explicitamente quais medidas existem. Uma biblioteca vazia ou só com livros não iniciados
não passa a ter tempo/páginas medidos igual a zero. Dados ausentes continuam null;
zero só é calculado quando a fonte declara medição disponível. A branch antiga declara
datas de conclusão, páginas, tempo e gêneros indisponíveis. Eventos de leitura sem data
usam "Leitura registrada", inclusive quando o livro já estava concluído.
Domínio/dados/typecheck e export Web final PASS depois desse refinamento.

Primeiro APK de UI (após `a40f132`, com fix de wrapper `dbbb808`):

- Commit: `dbbb808b5b97a4dd404b1e0a2673ff1920d07228`.
- Arquivo: `artifacts/apk/Aldus-community-dbbb808.apk`.
- Tamanho: 207731046 bytes.
- SHA256: `A4CEA3951902645EB4B225E5C8104AD3D5E06039C7829FE2030BE6D019F1C703`.
- Build release PASS (7m58s, Android 2920 módulos); assinatura v2 PASS; markers
  Community no bundle PASS. Manifesto ignorado `Aldus-community-dbbb808.json`.
- Não instalado; não validado fisicamente. Não é o artefato final após refinamento das métricas.

Após o último commit desta Etapa 1, executar novamente:
`powershell -ExecutionPolicy Bypass -File scripts/build-community-apk.ps1`.
O arquivo e SHA256 do APK final ficam no manifesto ignorado
`artifacts/apk/Aldus-community-<hash-final>.json`, e no relatório de fechamento.
O hash final não é inserido neste próprio commit para evitar ciclos de autorreferência.
Os APKs não entram no Git; `.gitignore` foi conferido. Não realizar instalação ou limpar
dados implicitamente para validar; seguir o roteiro físico com livros/sessão preservados.

## Schema / RLS

Migration nova: `supabase/migrations/202610130001_community_foundation.sql`.
**MIGRATIONS CRIADAS. NÃO APLICADAS REMOTAMENTE.**
Somente testada em PostgreSQL WASM local PGlite. Não foi usado CLI/link/push/SQL remoto.
Tabelas: community_profiles, community_reading_stats, community_activities,
community_progression_awards e community_achievements. Todas referenciam auth.users(id).
Nenhuma segunda autenticação ou alteração de migrations históricas.

Perfil: dono cria/edita/exclui com `auth.uid() = user_id`; leitura pública exige PUBLIC.
FOLLOWERS é restrito ao dono enquanto não existe relação verificada. Atividade pública
exige atividade PUBLIC **e** perfil PUBLIC; dono lê suas atividades privadas.
Estatísticas, awards e conquistas são privados. Client só recebe SELECT próprio, sem
INSERT/UPDATE/DELETE. Atividades também serão geradas por servidor confiável.
Não há `using(true)`, service_role no client, level editável ou RPC de autopromoção.
Local XP não pode ser enviado como pontuação autoritativa. O futuro servidor precisa
validar conclusões/dias e derivar chaves semânticas antes de gerar pontos/atividades.

Seguidores/clubes/fóruns permanecem somente contratos nesta etapa. Schema futuro:
community_follows (par follower/following único, sem auto-follow; solicitações para
perfis privados), community_clubs, community_club_members (papel/adesão verificados),
community_threads, community_posts e community_comments (autoria, acesso ao clube,
spoilers, bloqueios e moderação). Essas tabelas **não foram criadas** nesta migration.
Não habilitar FOLLOWERS no SQL sem implementar e testar o social graph.

## Inventário dos arquivos novos

| Área | Arquivos |
|---|---|
| src/community/domain | models.ts, ports.ts, profile.ts, metrics.ts, progression.ts |
| src/community/data | serialization.ts, LocalCommunityRepository.ts |
| src/community/application | CommunityService.ts |
| src/community/adapters | identity.ts, LegacyReadingDataSource.ts, runtime.ts |
| src/community/presentation | CommunityProvider.tsx, content.ts, components.tsx, CommunityHomeScreen.tsx, CommunityProfileScreen.tsx, CommunityEditProfileScreen.tsx, CommunityFoundationScreen.tsx |
| app/community | _layout.tsx, index.tsx, profile.tsx, edit-profile.tsx, [section].tsx |
| scripts | community-test-loader.cjs, test-community-domain.cjs, test-community-data.cjs, test-community-ui.cjs, test-community-provider.cjs, test-community-schema.cjs, build-community-apk.ps1 |
| supabase/migrations | 202610130001_community_foundation.sql |
| raiz | COMMUNITY_IMPLEMENTATION.md |

Centrais: apenas `app/_layout.tsx`, `app/(tabs)/settings.tsx`, `.gitignore`.
package.json/lockfile, Reader, PDF/EPUB, Library repositories, AuthContext, Supabase
client, Drive, Sync, OCR, importação, Sources, Legal e Flashcards não foram alterados.

## Testes e reprodução

Pré-requisito usual: dependências do projeto instaladas com o lock existente.
Ferramentas de teste reutilizadas dos caches locais, sem mudar dependências do app:
React/react-test-renderer 19.2.3 e PGlite 0.5.8. Em outro PC, preparar somente os tools:

```powershell
npm.cmd install --prefix .expo/auth-test-tools --no-save react@19.2.3 react-test-renderer@19.2.3
npm.cmd install --prefix .expo/flashcard-db-test --no-save @electric-sql/pglite@0.5.8
npm.cmd run typecheck
node scripts/test-community-domain.cjs
node scripts/test-community-data.cjs
node scripts/test-community-ui.cjs
node scripts/test-community-provider.cjs
node scripts/test-community-schema.cjs
node scripts/test-library-organization.cjs
node scripts/test-auth-flows.cjs
node scripts/test-auth.cjs --auth-only
npm.cmd run export:web
git diff --check
```

Os nomes históricos dos diretórios de tools são apenas caches ignorados, sem alteração
do módulo Flashcards. Os testes Community de domínio/dados usam o TypeScript já instalado.
UI usa componentes reais com primitivas RN/Router controladas. Provider usa contexto
real, service/repository local e troca de conta com Promise pendente. Schema executa
a migration real em banco local isolado com dono, intruso e anon; testa PUBLIC,
FOLLOWERS/PRIVATE, edição, constraints, duplicatas e bloqueio de XP inventado.
Testes afetados de biblioteca/Auth PASS; não houve falha histórica para atribuir.

Limites: não é prova de navegação autenticada no browser ou do funcionamento no
Android físico. Não foram realizados login remoto, publicação de perfil ou testes
de social graph. Web export e APK são gates de artefato. Acessibilidade foi verificada
nos contratos de componentes; TalkBack, teclado e fontes ampliadas em aparelho pendentes.

## Integração na main nova

1. Primeiro enviar/revisar a main do outro computador. Não tentar reconstruí-la aqui.
2. Criar branch de integração a partir da main nova e cherry-pick em ordem conforme
   MERGE MAP. Não aplicar a branch antiga inteira sobre sistemas novos sem revisão.
3. Manter domain/application/data; substituir `adapters/identity.ts` pela identidade
   atual. Não publicar email ou IDs de sessão no perfil. Username vem do contrato atual.
4. Substituir `LegacyReadingDataSource` em runtime pelo repository **da conta** nova.
   Retornar scope ACCOUNT/userId correto; datas ausentes continuam null. Eventos reais
   de começo/conclusão precisam de IDs duráveis. Revisão de metadata não é releitura.
   Sessões só geram streak/tempo quando houver medição de foreground/inatividade confiável.
5. Rever inclusão DEVICE por conta; não migrar biblioteca compartilhada automaticamente.
   Dados Community são locais por userId, sem export, envio ou import de livros/arquivos.
6. Reaplicar manualmente a entrada de Ajustes ou escolher uma tab na nova navegação.
   Registrar `community` no grupo protegido do Router novo; não substituir o layout novo.
7. Criar SupabaseCommunityRepository futuro implementando o port, com política de sync
   e tratamento de conflitos. Ele não existe nesta etapa; não há stub que simule sucesso.
8. Comparar nomes, constraints e RLS da migration com o schema real atualizado; preparar
   adaptação incremental se preciso. Só então planejar aplicação em ambiente de teste.
   Exigir teste remoto de duas contas/anon e privacidade antes de liberar perfis reais.
9. Rodar os gates e roteiro manual abaixo; validar Web e Native separadamente.

Conflitos prováveis: Router protegido e linha de entrada em Ajustes (risco médio),
imports de dependências/identity adapters (médio), schema remoto ainda desconhecido
(alto, revisão obrigatória antes de aplicar). Domínio/repository/telas novos: baixo
risco textual; alterações de ports podem exigir ajuste de composição, sem refatorar Reader.

## Roteiro manual pendente

- Conta A → Ajustes → Comunidade; estado vazio ou contagens do dispositivo coerentes.
- Editar nome/bio/favoritos/meta; sair/reabrir app e conferir persistência.
- PUBLIC/FOLLOWERS/PRIVATE na prévia; atividades privadas permanecem ocultas para terceiros.
- Inclusão local default OFF; ligar, atualizar/reabrir/toggle e conferir ausência de pontos duplicados.
- Marcar conclusão na biblioteca existente; atualizar Community; não confundir registro com data histórica.
- Conta B não recebe perfil/XP de A; biblioteca compartilhada explicitamente identificada.
- Clubes/Fóruns/Pessoas e Back funcionam; claro/escuro, fonte ampliada, safe area e TalkBack.
- Abrir EPUB, PDF Original e Reflow; posição/progresso/controles preservados (sem alteração no Reader).

# MERGE MAP

| Commit / assunto | Escopo | Dependência | Risco | Push |
|---|---|---|---|---|
| 1ed4496 — feat: add literary community domain foundation | Domínio puro, testes, doc inicial | Base | Baixo | PASS |
| 03e4ff9 — feat: add isolated community repository and reading adapters | Repository, serialização, service, adapters | 1ed4496 | Baixo; trocar adapters na main nova | PASS |
| a99bfb9 — fix: validate community reading evidence and calendar days | Evidência, calendário, tests | Anteriores | Baixo | PASS |
| a40f132 — feat: add community foundation screens and protected routes | UI, Router, Ajustes, helper APK | Anteriores | Médio na navegação | PASS |
| dbbb808 — fix: invoke community Android wrapper by explicit path | Helper APK Windows | a40f132 | Baixo | PASS |
| e862f1b — fix: keep unmeasured community metrics unavailable | Disponibilidade explícita, testes, texto de atividades | Domínio e adapter | Baixo | PASS |
| chore: add community schema draft and integration docs (commit final deste documento) | SQL, testes RLS/provider, docs | Schema independente de UI; tests provider dependem anteriores | Revisar schema novo antes de aplicar | Ver git log/manifesto final |

Cada commit pode ser selecionado como unidade, respeitando dependências. Domínio é
independente; repository depende dele; UI depende de ambos. Migration SQL pode ser
revisada/cherry-picked sem habilitar UI, mas **não aplicada** sem confronto com schema novo.
Para identificar o hash deste último commit sem autorreferência impossível:
`git log --oneline -- COMMUNITY_IMPLEMENTATION.md`.

## Etapas futuras (registradas, não implementadas)

2. Social Graph + perfis públicos reais.
3. Feed social.
4. Clubes do livro.
5. Fóruns/discussões.
6. Desafios/conquistas ampliadas.
7. Moderação, denúncias e segurança.

Recomendação imediata: integrar na main nova e validar fisicamente a fundação local;
depois implementar Etapa 2 com privacidade e derivação de métricas/XP no servidor.

## Fechamento da integração com o Aldus atual

Integração executada em `integration/comunidade-literaria` a partir do Aldus atual
`52456d9740a6234db94508b3a3ed48ba3012d060`, recebendo `07c382fd10190444675c3343a4521eb0ccad6550`.
O único conflito textual foi `.gitignore`; foram preservadas as regras `artifacts/`,
os diretórios Android gerados, `*.apk`, `*.aab`, credenciais e keystores. Os arquivos
centrais `app/_layout.tsx` e `app/(tabs)/settings.tsx` mantiveram a infraestrutura atual
e receberam somente a rota/entrada da Community. Nenhum arquivo de Reader, Auth, Drive,
OCR, Library Sync, Importação, Sources ou Legal foi substituído pela versão antiga.

Testes de domínio, dados, provider, UI, schema, organização e Auth passaram. O schema
foi testado somente em PostgreSQL local e não foi aplicado remotamente. Neste ambiente,
`npm run typecheck` ficou pendente por `@noble/hashes@2.0.1` ausente em `node_modules`,
embora declarado no `package.json` e no lockfile; a tentativa de sincronização do registry
não concluiu. Exportação Web e APK dependem da mesma instalação completa de dependências.
