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

# MERGE MAP

1. Domínio puro e testes: baixo risco; sem integração central.
2. Repository e adapters: depende do domínio; substituir adapters na main nova.
3. Telas e rotas: depende dos anteriores; revisar Router e entrada em Ajustes.
4. Migration e documentação: revisar schema novo antes de qualquer aplicação.

Migrations serão somente versionadas. **NÃO APLICADAS REMOTAMENTE.**
