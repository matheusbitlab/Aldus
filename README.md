# Aldus Reader

Fase 1 de um leitor de e-books em Expo, com foco em uma experiencia de leitura limpa e preparada para EPUB real.

## Executar

Requisitos: Node.js LTS e npm.

```powershell
npm install
npm start
```

Para gerar um APK instalavel, autentique o EAS CLI e execute:

```powershell
npx eas login
npm run build:apk
```

O perfil `preview` em `eas.json` produz um APK Android para distribuicao interna.

### Gerar APK localmente (Windows)

Requisitos: JDK 17, Android SDK com as plataformas, build-tools e NDK exigidos
pelo projeto, `JAVA_HOME` e `ANDROID_HOME` configurados, e dependencias instaladas
com `npm ci`. O projeto nativo em `android/` esta versionado.

```powershell
npm run build:apk:local
```

Esse comando executa `gradlew.bat :app:assembleRelease` em `android/`. O APK fica
em `android/app/build/outputs/apk/release/app-release.apk`, com JavaScript e assets
embutidos, sem depender do Metro ou de login no EAS. A primeira compilacao pode
baixar dependencias do Gradle e componentes do Android SDK.

A configuracao nativa atual assina o release com a chave de debug padrao, adequada
para testes locais. Para publicacao, configure uma chave de assinatura propria.
`npm run build:apk` continua usando o EAS na nuvem.

## Fase 2

- SQLite local com WAL e migrations versionadas.
- Repositories para livros, capitulos e progresso de leitura.
- Seed do livro mockado para validar persistencia sem importacao EPUB.
- Biblioteca carregada do banco com estados de loading, vazio e erro.
- Progresso restaurado ao abrir o livro e salvo apos 500 ms de inatividade.

O banco continua usando o identificador legado `kindle-reader.db` para preservar compatibilidade com instalações e dados existentes. A importacao de arquivos locais, bookmarks e highlights persistidos ficam preparados nas interfaces de dominio para as fases seguintes.

## Fase 3

- Validador EPUB: ZIP, `mimetype`, `META-INF/container.xml` e OPF.
- Parser EPUB com metadata, manifest, spine e capítulos em ordem.
- Normalizacao de HTML, remocao de scripts/embeds e contagem de caracteres.
- Importacao local pela biblioteca usando Document Picker.
- Livro e capítulos importados diretamente para o SQLite.
- Erros de EPUB inválido tratados sem quebrar a biblioteca.

O parser recebe `Uint8Array` e permanece isolado da UI, enquanto `EpubFileImporter` faz a ponte com o filesystem do Expo.

## Fases 4, 5 e 6

- Busca web por Strategy Plugin com Project Gutenberg.
- Fetcher com timeout, retry e cancelamento.
- Cache de robots.txt, rate limit de 2 segundos por domínio e validação HEAD.
- Histórico de buscas persistido no SQLite.
- Download resumível em `books/temp` e importação em `books/imported`.
- Bloqueio abaixo de 200 MB livres.
- Retry exponencial de 1s, 2s e 4s.
- Validação EPUB antes do movimento atômico.
- Estados de busca e download separados em stores Zustand.
- Erros técnicos separados de mensagens de interface.

A rota inicial abre o leitor com um livro mockado. A aba Library tambem permite reabrir o mesmo livro.

## O que esta implementado

- Expo Router com rota inicial de leitura e abas de biblioteca, busca e configuracoes.
- Separacao inicial em `domain`, `data`, `presentation`, `core` e `theme`.
- Leitor com `FlatList` virtualizada por capitulo.
- Renderizacao HTML preparada com `react-native-render-html`.
- Temas Light, Dark e Sepia.
- Tipos serif, sans e dyslexic preparados sem embutir fontes comerciais.
- Tamanho de fonte e margens configuraveis.
- Controles discretos com animacao nativa e toque central para alternar visibilidade.
- Progresso visual, pagina estimada e debounce de 500 ms.
- Calculos de paginacao protegidos contra livro vazio e divisao por zero.
- Zustand isolado para estado reativo do leitor.

## Proximas fases

A persistencia SQLite, repositorios, importacao EPUB real, busca web e downloads resilientes permanecem para as fases seguintes. O callback de progresso ja esta isolado em `ReaderScreen` para ser ligado ao `ReadingProgressRepository` na Fase 2.

## Validacao

Com Node.js 24.19.0 e npm 11.17.0, `npm run typecheck`, `npx expo-doctor` e `npx expo export --platform web` foram executados com sucesso.

## Refatoracao de fontes e acervos

- Gerenciador persistente de fontes web em AsyncStorage.
- Importacao local de EPUB e PDF.
- Gutendex e fontes JSON/OPDS/HTML na busca; Gutenberg direto e BNDigital aparecem como Em breve.
- Filtros por acervo, capas e autores.
- WebView para BibliON e MEC Livros.
- Reader restaura o livro mockado e aceita EPUB/PDF persistidos.

Catálogo JSON V1: adicione em Ajustes → Gerenciar minhas fontes uma URL com uma lista ou `{ "books": [{ "title": "Livro", "author": "Autor", "url": "https://exemplo.org/livro.epub" }] }`. O catálogo e os EPUBs precisam permitir CORS para download dentro do app Web. Gutenberg pode exigir salvar pelo navegador e importar na Biblioteca. Remover uma fonte preserva livros importados.

Validação de catálogos: `node scripts/test-catalogs.cjs`; consulta real Gutendex: `node scripts/test-catalogs.cjs --live`. Auditoria e limites: [COPILOT_CONTINUATION_AUDIT.md](COPILOT_CONTINUATION_AUDIT.md).
