# Legal, build Android, Git e CI

> Módulo de referência. Seções 14, 15 (build/homologação física Redmi) e 16 (Git, Web/CI).
> Texto preservado do PROJECT_CONTEXT.md original (2192 linhas, escrito pelo Codex), movido sem reescrita em 06/11/2026. Trate como hipótese: confira Git/código antes de confiar. O estado atual e as pendências estão em [PROJECT_CONTEXT.md](../../PROJECT_CONTEXT.md).

## 14. Legal

**Acervo embutido (decisão permanente, 06/11/2026, adaptação de `21f595f`):** o catálogo ATIVO, registrado em contas novas, só
contém obras originalmente escritas em português por autores falecidos há mais de 70 anos (Lei 9.610/98, art. 41), sem tradução,
notas, adaptação ou prefácio de terceiros (traduções/edições são obras protegidas, art. 7º, XI). Cada título é declarado em
`src/data/library/bundledCatalog.ts` (`source`, `license`, `authorDeathYear`) e em `bundledBookManifest.json` (hash). Os 33 títulos
protegidos do acervo antigo são LEGADO (`legacyBundledAssets.json`, `legacyBundledCatalog.ts`): não entram em contas novas, mas o
usuário decidiu que contas existentes não os perdem — retirada em 3 etapas (estado e desenho em PROJECT_CONTEXT.md §8). Nunca
apagar entradas da lista legada. `scripts/test-bundled-catalog.cjs` (critical) impõe a política; `scripts/copy-books-to-dist.mjs` só
publica arquivos declarados com hash conferido (`ALDUS_DIST_ACTIVE_BOOKS_ONLY=1` exclui o legado). Na dúvida sobre tradutor/edição,
não incluir. Os binários continuam no histórico Git (não reescrito).

Telas públicas e fontes: src/legal/legalContent.ts, legalConfig.ts, appMetadata.ts e
app/legal/*.tsx. Privacidade/Termos acessíveis antes de login; política atual descreve
Auth/Supabase privado, Sources/Drive, OCR, sensores, offline, exclusões e ausência de E2E.
LGPD, privacidade, termos e direitos autorais exigem revisão operacional/profissional;
o app não certifica conformidade nem concede licença para a obra sincronizada.

Batalha preparada envia deck escolhido ao Supabase somente quando habilitada; estudo individual
é local. PUBLIC da Community não significa publicação remota. Revisar textos antes de ativar
novos tratamentos. Controlador/canal via EXPO_PUBLIC_LEGAL_CONTROLLER_NAME e
EXPO_PUBLIC_LEGAL_CONTACT_EMAIL, sem inventar identidade, DPO, prazo de retenção ou endereço.
Retenção/expurgo, exclusão de conta, região/contratos, menores e obrigações ML Kit/Drive
continuam pendências de operação, não permissões administrativas do cliente.

THIRD_PARTY_NOTICES.md e src/legal/thirdPartyNotices.generated.ts são gerados por
npm run legal:notices; npm run legal:notices:check verifica 38 dependências diretas.
Comparação normaliza CRLF no Windows. Não remover avisos/licenças para cumprir a regra de
dois contextos. Transitivos/artefatos nativos exigem revisão própria antes de distribuição.

## 15. Build Android

### Homologação física contínua — autorização de 16/10/2026

O Redmi conectado via USB é o dispositivo oficial de homologação Android. O Codex deve utilizá-lo autonomamente para testes físicos sempre que disponível e relevante, preservando dados e distinguindo testes reais de simulações.

Usar ADB e preferir development build/Metro compatíveis. APK debug temporário é autorizado
para homologação, sem publicar release. Antes de atualizar, conferir package, versão e
certificado da instalação. Nunca desinstalar, limpar dados, trocar applicationId ou substituir
assinatura incompatível sem autorização específica. USB unauthorized exige confirmação
no aparelho; não contornar bloqueio de tela. Preservar livros, arquivos, contas, preferências,
progresso e outbox. Não ampliar essa autorização para produção, pagamentos ou privilégios.
Resultados físicos devem identificar aparelho/Android, fonte/artefato, cenário e evidência;
usar PASS físico, FAIL físico, PASS controlado, NÃO EXECUTADO ou BLOQUEADO. Um bug original
só é encerrado após reproduzir o cenário original e validar sua correção no aparelho.
Configurações temporárias do sistema usadas nos ensaios devem ser registradas localmente
e restauradas. Não versionar capturas com notificações externas ou conteúdo pessoal.

Execução física de 16/10/2026: Redmi 23117RA68G, Android 16/API 36, ARM64,
com.aldus.reader 1.0.0/code 1. Debug temporário atualizado com install -r após comparar
package/certificado; firstInstallTime e 35 livros anteriores preservados, sem uninstall/clear.
APK debug em android/app/build/outputs/apk/debug/app-debug.apk, 106.185.143 bytes,
SHA-256 BC28BAB08CC720BB17096E62CC49C710DB16EA567615249CE8FBDC79393590DE.
Certificado SHA-256 fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c.
Esse APK carrega JS pelo Metro/USB: hash do APK não identifica o bundle dinâmico.
Fonte nativa f851b3a; correção JS 101395c validada via Metro, sem recompilação nativa.
Não foi gerado release. O development build depende do Metro para retomar o projeto.

PASS físico: arquivo original Amêndoas disponível no aparelho; importação em 16,295s,
cancelamento durante leitura em 3,986s sem livro adicional, biblioteca 35→36 apenas pela
importação concluída. Bytes originais preservados (SHA-256 nos relatórios locais).
Foi reproduzido bloqueio de paginação por imagens lazy fora da tela: readiness aguardava
recursos que o Chromium não solicitava. waitForImage instala listeners antes de promover
loading=lazy para eager; nova WebView normal carregou as dez imagens e paginou sem intervenção.
Controles Buscar/Sumário/Aparência/Estudos, anterior/próxima, retorno à biblioteca e reabertura
após encerramento do processo preservaram 18/728. Rolagem longa de Preferências e gesto
vertical iniciado no slider funcionaram sem alterar fonte/documento. Fonte 26→22→26 e
temas Claro/Sépia funcionaram, com valores originais restaurados; ciclo tipográfico terminou
17/728, portanto precisão da âncora continua parcial. Quatro cópias locais iguais ao EPUB
foram encontradas sem baseline por arquivo; origem/limpeza inconclusivas, nada apagado.

PASS controlado: matriz crítica 66/66, typecheck, export Web e Chromium com documento
gerado/imagens lazy; regressão de readiness falha no baseline anterior e passa com a correção.
Ferramentas Metro excluem artefatos gerados preservando fontes/dependency dist/entry virtual.
Automação física reproduzível: scripts/redmi-qa.cjs; evidências/capturas ignoradas em
.expo/redmi-qa. Falhas de seletor/espera do harness foram corrigidas e repetidas; não foram
tratadas como falhas do Reader. Ausência de crash nos logs amostrados não certifica todos
os cenários. BUGS_ATUAIS.md mantém resultados parciais e dependências externas por cenário.

SaaS 3 PASS físico: Ajustes→Meu Plano→retry→Comparar→retorno; backend ainda indisponível,
sem fabricar Free/Pro ou consumo zero. Com Wi-Fi e dados móveis temporariamente desligados,
ambas as telas mostraram erro de conexão; EPUB local abriu, avançou 17→18/728 e reabriu
em 18/728. Rede original (ambas habilitadas) restaurada e conferida. JS via USB continuou
disponível; não certifica cold start offline de release. Drive: navegação/gerenciador/retorno
PASS físico, fonte existente preservada; indexação/API/cancelamento em andamento BLOQUEADOS
por reconexão necessária, sem renovar OAuth nem modificar arquivos/contas.

PDF Reflow PASS físico parcial: Weber 584 páginas/5.265.071 bytes; cancelamento após
extração completa durante validação retornou ao Original 1/584. Repetição passou por
montagem/validação/finalização e SUCCESS em 212.227ms no debug; primeira paginação 1/2098.
Voltar à biblioteca/reabrir reutilizou cache, sem novo START de extração. A latência segue
alta; amostras PSS do processo em torno de 1,3–1,6 GiB não provam pico nem vazamento.
Back durante finalização permanece inconclusivo; OCR físico e arquivo original de 969p
não foram validados. Nenhum cache/livro anterior foi apagado para forçar novos testes.
Fonte do sistema 130% PASS físico em Meu Plano/Comparar/rolagem longa das Preferências,
com capturas revisadas; 100% restaurado. Solicitação de rotação pelo sistema manteve o
app em retrato 1080×2400, como declarado no manifesto; não prova giro físico/sensor.
TalkBack físico não executado; labels de navegação foram usados pela automação Native.
Conferência final: biblioteca 36 livros; PDF Original do Weber restaurado em 1/584,
cache Reflow mantido; hash do EPUB original inalterado. Rede, fonte do sistema, rotação
e heads-up notifications coincidiram integralmente com o baseline. Forward CDP temporário
removido; reverse USB/Metro mantidos para usar o development build. Buffer consultado
do PID final sem assinaturas FATAL/erro JS/ANR, sem inferir ausência em todo o histórico.

Package com.aldus.reader, scheme aldus; applicationId antigo com.kindle.reader não compartilha
automaticamente dados privados com o novo. Versão/code genéricos não identificam um commit.
Infra local: android/ versionado, JDK 17 e SDK/build-tools/NDK declarados no Gradle.
Comandos existentes: npm run build:apk:local, build:apk:archive e build:apk (EAS preview APK).
Build de distribuição somente quando solicitado; a autorização de homologação acima
permite build debug quando necessário aos testes físicos, sem gerar release por commit.
O guard de variáveis públicas é compartilhado entre export Web e wrapper Android,
antes de embutir JS; configuração insegura impede build sem imprimir valores.

Release local usa a debug.keystore existente para testes; produção/EAS/Play exigem certificado
apropriado e fingerprint do artefato efetivo. Não atribuir SHA de debug a Play.
Artefatos ficam ignorados em artifacts/apk e não entram no Git; identidade exige hash,
tamanho, assinatura, package e fonte/bundle correspondente. Compilar não comprova instalação
ou funcionamento. Atualização física preserva dados; não desinstalar/limpar como diagnóstico.
JS pode usar Metro em development build compatível; APK release requer build consolidado
futuro para incluir o novo bundle. A missão SaaS anterior não gerou APK; os testes físicos
autorizados em 16/10 permitem apenas o debug temporário descrito acima.

Wrapper local Windows usa caminho absoluto de gradlew.bat, com quoting para espaços e
windowsVerbatimArguments. Corrigido lookup quando NoDefaultCurrentDirectoryInExePath=1;
test-android-build-command.cjs reproduz o defeito e executa somente um .bat temporário de
echo, nunca Gradle. Package, keystore, versionCode=1 e versionName=1.0.0 não mudaram.
Antes de publicação futura, comparar versionCode com Play/instalação e escolher inteiro
maior; preservar certificado da linha instalada ou planejar migração. Não trocar por debug.

## 16. Git e fluxo de trabalho

Antes de editar: git status --short, branch --show-current, rev-parse HEAD e log recente.
Preservar trabalho existente; stage somente arquivos relacionados, revisar cached diff e check.
Trabalhar normalmente na main, com commits por bloco e push para origin/main após validação.
Criar branches separadas somente para trabalhos experimentais, arriscados ou isolados que
justifiquem isso. Se main estiver protegida, usar Pull Request sem contornar a proteção.
Nunca fazer force push, reescrever histórico publicado, reset, clean, stash ou descarte
em massa. integration/comunidade-literaria é histórica, não a branch padrão; não foi apagada.
Migrations históricas são imutáveis; incrementais só após inventário e autorização remota.
Nunca commitar .env.local, tokens, secrets, keystores privados, APKs ou livros pessoais.

Validação local da primeira consolidação na main (Etapa 1) em 15/10/2026: typecheck, export:web e
test:critical PASS (57/57 suítes), cobrindo Community, Reader/EPUB/Reflow, Library Sync,
Auth/segurança, Drive, Flashcards/Battle e SaaS. Código/migrations são idênticos à integração;
a única edição nova desta consolidação é este documento. BUGS_ATUAIS.md foi preservado
byte a byte. Testes controlados/export não equivalem a validação física, Storage/Auth HTTP
ou implantação remota. Nenhum APK, deploy Supabase, migration de produção ou SaaS Etapa 2.

Consolidação da Etapa 2 na main em 15/10/2026: fetch confirmou as duas branches locais
alinhadas aos respectivos remotos e main ancestral da integração. Fast-forward de
9cb5a96 para 9b3c619 preservou integralmente Admin 1.5, Community, Reader, Auth, Sync,
SaaS e migrations. Typecheck e export:web PASS; test:critical 62/62 PASS, incluindo
admin-security/admin-client, saas-schema/saas-client/saas-compatibility e as três suítes
de cotas (SQL PGlite, cliente SQLite e driver HTTP controlado). Apenas este documento
foi editado após a integração; BUGS_ATUAIS.md e todos os arquivos de aplicação/testes/
migrations permanecem idênticos à integração. Plugins GitHub, Supabase e Vercel foram
consultados somente para leitura. Nenhum APK, deploy, migration remota ou nova etapa SaaS.
As pendências de validação autenticada/concorrência remota da Etapa 2 continuam abertas.

Web/CI: npm run build delega a export:web. Antes do Expo, validate-web-env.cjs rejeita
chaves privadas/public env insegura; Vercel produção exige configuração legal real.
Depois do export, write-build-metadata.cjs gera dist/build-info.json com commit, dirty,
data, ambiente não sensível e SHA-256 dos arquivos JS/HTML/CSS (não de livros/contas).
VERCEL_GIT_COMMIT_SHA/GITHUB_SHA precisam corresponder ao HEAD. dirty=true nunca é
prova de build limpa. O metadata não inclui env, JWT, host privado ou dados de usuário.
vercel.json fixa build/output/install e headers compatíveis com o iframe do Reader.
.github/workflows/validate.yml: Node24, npm ci, ferramentas de teste isoladas, typecheck,
Deno check, matriz test:critical, export/metadata, diff check e audit crítico. Actions pinadas
por SHA, contents:read, checkout sem persistir credencial. Sem segredo/deploy automático.
Workflow preparado/localmente validado; só execução Actions real comprova CI remoto.
Testes controlados não certificam produção ou Android. A matriz inclui leitura binária
Native, cache/commit/cancelamento final Reflow e adapter REST com sessão/rede pendentes.
Vercel Git integration/checks/permissões/logs dependem do operador; não presumir deploy
com base no último commit. README contém roteiro humano; não publicar produção sozinho.
