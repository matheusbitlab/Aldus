# Flashcards — recompilação e testes físicos, 09/10/2026

Pedido: recompilar e iniciar testes no celular desbloqueado. Atualização por `adb install -r`, sem limpar dados, alterar dependências ou executar prebuild.

## Ponto de partida

- Aparelho Xiaomi 23117RA68G, Android conectado por ADB; tela desbloqueada e sessão existente ativa.
- Biblioteca: **35 livros**. Estudo: deck `Estudo: Sigmund Freud Na Sua Época E Em Nosso Tempo`, **8 flashcards**, e deck `a`, **2 flashcards**. Dados existentes devem permanecer intactos.
- APK anterior: SHA256 `BF49499ADB7079BA0ED8696935EC84E418FE4D74C30BA8E8094A430BF6D38F33`; instalado originalmente em 07/10/2026 08:36:14, atualizado em 08/10/2026 16:17:25.
- Evidência local anterior: TypeScript, export Web, testes controlados de pontuação, armazenamento, UI, sessões, Auth/Reader e migration PostgreSQL isolada passaram. Não substituem os testes abaixo.

## Checkpoint atual

**BUILD VALIDADO**: release com JDK 17, `npm.cmd run build:apk:local`, 6m24s, 907 tarefas (60 executadas). APK `android/app/build/outputs/apk/release/app-release.apk`, 207644638 bytes, gerado em 09/10/2026 09:37:20 -03. SHA256 `E3FD9A5F6D52D8E137156408C6010C49EB8A8231D463C6A3D7DC135C1EC7EA85`. Bundle SHA256 `C0CB9CEC91D530D9D1FCED4E1AFEE7BC2E507766888F0CA79FD9955083EEE4F9`, Metro Android 2892 módulos. Bundle extraído do APK corresponde ao gerado e 22 fontes Reader/Flashcards conferem com o worktree, incluindo `flashcardStorage.native.ts`. Assinatura v2 válida, mesmo certificado Android Debug preexistente, pacote/versão 1/1.0.0, min24/target36, quatro ABIs, sem flag debuggable. Diagnósticos Reader/Reflow/Motion/Auth/Search desligados. Logs e JSONs isolados em `.expo/flashcards-*`.

**EM ANDAMENTO**: instalação por atualização e testes físicos; build não é prova de funcionamento no aparelho.

| Cenário | Estado | Evidência |
| --- | --- | --- |
| Novo APK release, assinatura e bundle atual | VALIDADO | Build, assinatura v2, bundle e 22 fontes atuais |
| Instalação por atualização e preservação de biblioteca/decks/sessão | PENDENTE | Baseline acima |
| Criar/editar, validar campos, prévias e descartar | PENDENTE | Usar somente deck identificado como QA |
| Desenho e anexo de imagem no Android | PENDENTE | Picker e gestos físicos |
| Responder, pontuar, bloquear repetição, avançar e resumir | PENDENTE | Sessão criada no aparelho |
| Retomar após fechar/reabrir o aplicativo | PENDENTE | Conferir posição e pontos |
| Disponibilidade do backend da batalha | PENDENTE | Consultar pela tela autenticada |
| Batalha remota entre duas contas | NÃO TESTADO | Migration remota e segunda sessão não comprovadas |
| Smoke Reader integrado no novo APK | PENDENTE | Preservar livros/posição |

Migration preparada: `supabase/migrations/202610090001_flashcard_battles.sql`. Nenhuma migration foi aplicada remotamente por esta execução.
