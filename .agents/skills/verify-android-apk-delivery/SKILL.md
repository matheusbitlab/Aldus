---
name: verify-android-apk-delivery
description: "Preparar, auditar e entregar APK Android do Aldus com fonte, hash, tamanho, package, versão, assinatura e instalação segura. Use para build/entrega/QA Android, respeitando auditorias somente leitura."
---

# APK verificável, dados preservados

Leia o [contexto](../../../PROJECT_CONTEXT.md), a seção 15 de
[legal-build-git](../../../docs/context/legal-build-git.md) e a entrega mais recente em `docs/context/historico/`,
as pendências físicas em [BUGS_ATUAIS.md](../../../BUGS_ATUAIS.md) e o
[README](../../../README.md). Configure ferramentas pelo checkout atual, sem copiar
credenciais. Auditoria de APK não autoriza compilar, instalar ou usar o aparelho.

## Fonte e build quando solicitadas

- Registre HEAD, branch e diferenças antes/depois. Inclua fontes não versionadas que
  participam do bundle. `archive-commit-apk.mjs` inspeciona sujeira tracked; sua aprovação
  não prova ausência de fonte untracked. Não arquive sob hash de commit que não contém a fonte.
- Preserve stack/lockfile e `android/` versionado. JDK 17 e SDK/NDK/build-tools vêm do
  README/Gradle; não rode prebuild, upgrade ou limpeza como primeiro passo.
- `npm run build:apk:local` usa o wrapper oficial; saída esperada é
  `android/app/build/outputs/apk/release/app-release.apk`. `npm run build:apk:archive`
  arquiva por revisão em `artifacts/apk`, se a fonte satisfizer suas guardas.
- `-- --allow-context-only-dirty` só admite os caminhos explicitamente aceitos no script,
  já revisados. Não altere a guarda para acomodar código sujo ou esconda fontes locais.
- Release privado exige `ALDUS_SIGNING_STORE_FILE`, `ALDUS_SIGNING_STORE_PASSWORD`,
  `ALDUS_SIGNING_KEY_ALIAS` e `ALDUS_SIGNING_KEY_PASSWORD` por mecanismo protegido.
  Não exporte chaves nem leia/imprima valores para diagnosticar sua presença.
- `ALDUS_ALLOW_DEVELOPMENT_SIGNING=device-rehearsal` é exceção de ensaio autorizado.
  Derivado com assinatura legada não é o APK Beta privado e não deve ser distribuído como tal.
- EAS `build:apk` usa perfil preview interno APK. Descubra CLI instalada/ajuda e estado final.
  Tarball, AAB, build ID, fila iniciada ou EAS FINISHED sem APK obtido/verificado não são entrega.

## Conferir o artefato efetivo

1. Exija processo concluído com sucesso e `.apk` existente/não vazio. Se Gradle reutilizar
   artefato, confirme sua origem, bundle e correspondência com a fonte antes de atribuir revisão.
2. Registre caminho absoluto, bytes e SHA-256 (`Get-FileHash -Algorithm SHA256`).
3. Use `apksigner verify --verbose --print-certs` do SDK para certificado/assinaturas e
   `apkanalyzer` ou `aapt dump badging` para applicationId, versionName, versionCode,
   debuggable e ABIs. Descubra caminhos/comandos reais; não deduza esses campos do nome.
4. Compare manifesto/config com o esperado e confira JS/Hermes/assets incluídos quando
   a entrega depender deles. Development build via Metro não é APK independente com o JS novo.
5. Antes de upload autorizado, use destino privado e manifesto/hash. Se fragmentado por
   limite do conector, prove remontagem integral. Metadata remota não é redownload com hash.
   Não envie chaves, backups, livros ou dados pessoais junto do APK.

## Instalação e ensaio físico quando autorizados

- Confirme `adb devices -l` e selecione serial explicitamente com `-s`. Leia package,
  assinatura, versionCode e firstInstallTime da instalação de destino antes de atualizar.
- Certificado incompatível bloqueia atualização segura. Não desinstale, execute `pm clear`,
  troque applicationId, faça downgrade ou ressignifique distribuição para contornar o bloqueio.
  Use apenas a linha de assinatura/derivado explicitamente autorizada para aquele destino.
- Atualização usa `adb -s SERIAL install -r CAMINHO_APK`, sem opções de downgrade.
  Depois confira package, versão, certificado/hash instalado e firstInstallTime preservado.
- Registre configurações do aparelho alteradas pelo ensaio e restaure os valores originais.
  Há pendência histórica de heads-up no Redmi: confira o registro atual antes de agir;
  não presuma conexão/disponibilidade ou que essa restauração já aconteceu.
- Inicie o app e valide os cenários afetados com a build identificada. APK compilado,
  instalação bem-sucedida e inicialização são gates diferentes. Emulador falhando antes
  de instalar não fornece prova de execução do APK; Web não substitui gesto/brilho/seleção.

## Registro da entrega

Informe fonte/dirty, arquivo/bytes/SHA-256, package/versão/code, certificado/ABIs/debuggable,
tipo (Beta, ensaio legado ou development/Metro), evidência de instalação/preservação e
cenários executados. Separe `IMPLEMENTADO`, artefato `VALIDADO`, instalação e QA `PARCIAL`
ou `BLOQUEADO`. Sem hospedagem real, forneça caminho local; nunca invente link HTTPS.
