# Aldus Reader

Leitor EPUB/PDF para Android e Web, construído com Expo/React Native e TypeScript.
Contexto técnico: [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md).
Problemas ativos: [BUGS_ATUAIS.md](BUGS_ATUAIS.md).

## Executar

Node.js 24 e npm; usar o lockfile existente:

```powershell
npm ci
npm start
```

A configuração pública fica em .env.local, ignorado pelo Git:
EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_KEY. Somente chave anon/publishable.
Drive Web usa adicionalmente EXPO_PUBLIC_GOOGLE_DRIVE_WEB_CLIENT_ID; catálogos usam
EXPO_PUBLIC_CATALOG_CONTACT. Nunca colocar secret/service_role no app.

## Validar

```powershell
npm run typecheck
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
npm install --prefix .expo/auth-test-tools --no-save --package-lock=false --ignore-scripts react@19.2.3 react-test-renderer@19.2.3
npm install --prefix .expo/library-db-test --no-save --package-lock=false --ignore-scripts @electric-sql/pglite@0.5.8
npm install --prefix .expo/flashcard-db-test --no-save --package-lock=false --ignore-scripts @electric-sql/pglite@0.5.8 fake-indexeddb
```

Suites browser exigem export e Chrome; usam perfis e identidades fictícias isoladas,
sem acessar livros/contas do usuário. PASS controlado/Web não comprova Android ou deploy.

## Operação remota

- [Library Sync](LIBRARY_SYNC_DEPLOYMENT.md): inventário e implantação incremental privada.
- [Google Auth/Drive](GOOGLE_AUTH_DRIVE_DEPLOYMENT.md): configuração e roteiro do aparelho.
- node scripts/audit-library-sync-public.cjs: sonda somente leitura do contrato REST.

Estes são procedimentos humanos, não contextos extras de IA nem prova de implantação.

## Android quando solicitado

A campanha de 15/10 não gera APK: PENDENTE DE BUILD CONSOLIDADO.

Para uma build futura autorizada, usar JDK 17 e o Android SDK/NDK declarado pelo Gradle,
com JAVA_HOME/ANDROID_HOME corretos e android/ existente:

```powershell
npm run build:apk:local
```

Saída: android/app/build/outputs/apk/release/app-release.apk. O release local usa a
keystore debug existente para testes; publicação exige assinatura apropriada.
build:apk usa o perfil EAS preview (APK interno); build:apk:archive arquiva o hash atual
em artifacts/apk. Binários/segredos não entram no Git; atualização não deve limpar dados.

## Licenças

[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) contém os avisos gerados.
npm run legal:notices:check verifica sua consistência; npm run legal:notices os regenera.
