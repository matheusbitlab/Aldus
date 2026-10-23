# Aldus Reader

Leitor EPUB/PDF para Android e Web, construído com Expo/React Native e TypeScript.
Contexto técnico: [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md).
Problemas ativos: [BUGS_ATUAIS.md](BUGS_ATUAIS.md).

## Executar

Node.js 24 e npm; usar o lockfile existente:

```powershell
npm ci
npm run setup:test-tools
npm start
```

A configuração pública fica em .env.local, ignorado pelo Git:
EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_KEY. Somente chave anon/publishable.
Drive Web usa adicionalmente EXPO_PUBLIC_GOOGLE_DRIVE_WEB_CLIENT_ID; catálogos usam
EXPO_PUBLIC_CATALOG_CONTACT. Nunca colocar secret/service_role no app.

## Validar

```powershell
npm run typecheck
npm run test:critical
npm run export:web
node scripts/test-epub-resources.cjs
node scripts/test-source-indexing.cjs
node scripts/test-library-ui.cjs
node scripts/test-library-organization.cjs
npm run test:drive
npm run test:library:sync
npm run test:legal
git diff --check
```

Testes adicionais e limites de cada módulo estão no contexto oficial. Suites React e
PostgreSQL usam ferramentas isoladas em .expo, sem mudar as dependências do aplicativo:

```powershell
npm run setup:test-tools
```

Suites browser exigem export e Chrome; usam perfis e identidades fictícias isoladas,
sem acessar livros/contas do usuário. PASS controlado/Web não comprova Android ou deploy.

## Operação remota

- [Library Sync](LIBRARY_SYNC_DEPLOYMENT.md): inventário e implantação incremental privada.
- [Google Auth/Drive](GOOGLE_AUTH_DRIVE_DEPLOYMENT.md): configuração e roteiro do aparelho.
- node scripts/audit-library-sync-public.cjs: sonda somente leitura do contrato REST.

Estes são procedimentos humanos, não contextos extras de IA nem prova de implantação.

### Vercel e GitHub

No projeto kindle-reader e equipe corretos, conectar matheusbitlab/Aldus em Settings → Git.
Revisar a branch de produção (main revisada), sem promover esta integração automaticamente.
Usar npm ci, npm run build e saída dist, já declarados em vercel.json.
Configurar as variáveis públicas Supabase; Drive Web e contato de catálogos quando usados;
produção exige responsável/canal legal verificados. Não colocar tokens administrativos em EXPO_PUBLIC_*.

O workflow Aldus validation é somente CI, sem deployment secrets nem publicação. Habilitar
branch protection e os Deployment Checks correspondentes ao resultado real desse workflow.
Conferir dist/build-info.json e /build-info.json do deployment: commit, dirty=false e hash
devem identificar a fonte testada. Isso não substitui smoke tests nem o ID/commit do deployment.

Para logs403: selecionar a conta/equipe proprietária e pedir ao administrador acesso de
projeto/observabilidade com menor privilégio necessário; reautorizar a integração nessa equipe.
Consultar [papéis Vercel](https://vercel.com/docs/rbac/access-roles). Não desativar proteção
ou tentar outro token para contornar uma negação. Validar Auth/Reader/rotas em preview,
revisar logs sanitizados e aprovar explicitamente a publicação de produção.

## Android quando solicitado

Para uma build futura autorizada, usar JDK 17 e o Android SDK/NDK declarado pelo Gradle,
com JAVA_HOME/ANDROID_HOME corretos e android/ existente:

```powershell
npm run build:apk:local
```

Saída: android/app/build/outputs/apk/release/app-release.apk. O release local exige
assinatura privada: ALDUS_SIGNING_STORE_FILE, ALDUS_SIGNING_STORE_PASSWORD,
ALDUS_SIGNING_KEY_ALIAS e ALDUS_SIGNING_KEY_PASSWORD. Configure os valores por um
mecanismo protegido, fora do Git e sem gravá-los no histórico do terminal.
A exceção ALDUS_ALLOW_DEVELOPMENT_SIGNING=device-rehearsal serve exclusivamente ao
ensaio autorizado com a assinatura antiga. Esse derivado não é o APK Beta privado.
build:apk usa o perfil EAS preview (APK interno); build:apk:archive arquiva o hash atual
em artifacts/apk. Binários/segredos não entram no Git; atualização não deve limpar dados.

## Continuar em outro Windows

Use `main`. Não é necessário importar o bundle DesignIdeas nem copiar `.expo`, `dist`,
`node_modules`, bancos pessoais, caches ou livros de usuários.

```powershell
git clone https://github.com/matheusbitlab/Aldus.git
Set-Location Aldus
git switch main
npm ci
npm run setup:test-tools
npm run typecheck
npm run test:critical
npm run export:web
npm run test:reader:settings:web
```

O setup instala versões explícitas das ferramentas React, PGlite, IndexedDB, Yoga e
esbuild fora do aplicativo. `.expo` é reconstruível. Os ensaios novos aceitam CHROME_PATH
ou CHROMIUM_PATH e procuram Chrome/Edge no Windows/PATH, usando perfis isolados.

Antes do export/execução, prepare `.env.local` com as configurações públicas descritas
acima. Não copie chaves administrativas. O CI usa uma configuração explicitamente
sintética para exportar sem produção; isso não autentica usuários ou valida serviços reais.

Ambiente verificado em 23/10/2026: Node 24.19.0, npm 11.17.0, Git 2.55.0.windows.5,
JDK Microsoft 17.0.20.1. Use Node 24 e JDK 17 compatíveis com o projeto; o Gradle Wrapper
versionado resolve a versão do Gradle. Instale VS Code/Codex pelos canais oficiais e
autentique sua própria conta; credenciais desses programas não fazem parte do repositório.

Para Android, configure JAVA_HOME para o JDK 17 e ANDROID_HOME/ANDROID_SDK_ROOT para
o SDK local, com platform-tools/ADB e as versões de SDK/NDK solicitadas pelo Gradle.
O caminho padrão do SDK no Windows é `$env:LOCALAPPDATA\Android\Sdk`; não reutilize
um `android/local.properties` com o caminho de outro usuário. Os dois módulos nativos
`aldus-drive-auth` e `aldus-pdf-ocr` estão versionados e não precisam ser obtidos à parte.

```powershell
node --version
npm --version
git --version
java -version
& "$env:ANDROID_HOME\platform-tools\adb.exe" devices -l
```

GitHub e Vercel exigem a autenticação própria do proprietário no novo computador.
O preview deve usar o projeto existente `kindle-reader`, sem promoção automática.
Não copie `.vercel` com estado de autenticação nem use tokens administrativos no app.
Supabase continua no projeto existente; clone/export não aplicam migrations.

A chave privada de assinatura e a recuperação dos backups EFS/DPAPI exigem transferência
protegida e autorização específica. Blobs DPAPI deste Windows não são portáveis por si só.
Não exporte certificados ou chaves automaticamente. Sem a custódia necessária, a build
privada deve permanecer bloqueada, mesmo quando typecheck/testes/export passam.

As diferenças locais preexistentes de contexto e `.gitignore` não são incorporadas
silenciosamente. Consulte o registro atual nos dois arquivos oficiais antes de transferir
qualquer patch; nunca publique esses arquivos locais junto com backups ou credenciais.

## Licenças

[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) contém os avisos gerados.
npm run legal:notices:check verifica sua consistência; npm run legal:notices os regenera.
