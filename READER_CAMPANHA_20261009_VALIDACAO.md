# Auditoria incremental Reader/Sources/Search — 09/10/2026

Escopo vigente: campanha APK completa, exceto Flashcards. Dados, sessão e trabalho anterior preservados. Cada etapa distingue fonte implementada, artefato conferido, teste automático e comportamento físico; estados históricos não são promovidos por build.

## Etapa 1 — demonstração manual da barra

APK instalado durante a demonstração: `E67AACBE86301DDE2C2EA161FF3F71A8B0131740E1507084324632833487F7A2`. Usuário controlou o aparelho, sem toques automáticos. Captura sanitizada em `.expo/reader-manual-2026-10-09T17-17-32-867Z`, 283 eventos entre 14:17:35 e 14:18:22; vídeo separado `.expo/reader-manual-followup-20261009-1419.mp4` (nome de arquivo não representa horário exato do início).

PDF Original recebeu arrastes para160 e36. EPUB confirmou699,339,756,1015/1443. Reflow confirmou11 e20/32; reabertura restaurou20, arrastes seguintes confirmaram11 e27. Prévias não foram usadas como posições confirmadas nesses registros. `SLIDER_COMMIT` existe nas camadas footer/host/documento; contar linhas não equivale a contar comandos. PDF Original ainda não dispõe de ACK de render nessa instrumentação.

**Resultado: NÃO REPRODUZIDO nesta demonstração.** Relato do usuário: “não, aparentemente foi corrigido”; autorizou prosseguir com auditoria a cada passo. Isso sustenta os cenários observados, sem provar toda a matriz de arrastes/tipografia/layout nem a granulação nova da segunda compilação. Nenhuma nova correção especulativa foi feita por causa desta captura.

## Etapa 2 — artefato e Preferências

Segundo diagnóstico compilado14:09:23: 207678610 bytes, SHA256 `67CB09C8B95904D8121BCC907329ED7FCD3A354A6C45344C7A067B9E05F6BF17`. Assinatura/bundle/23 módulos Reader/Sources/Search conferidos. `adb install -r` SUCCESS; hash de `base.apk` igual ao artefato. Sem limpeza de dados. Inclui granulação da barra por página e separação backdrop/painel para contraprova de scroll; não é APK normal final (diagnósticos opt-in ativos).

**Teste físico do painel: EM EXECUÇÃO.** Primeiro diagnóstico falhou em scroll global, embora o slider direcional passe nos testes controlados. Competição com Pressables ancestrais é HIPÓTESE a verificar no segundo APK; não foi tratada como causa confirmada apenas pela mudança de código.

## Demais etapas

Fontes reais/pesquisa: testes controlados e rede Gutenberg PASS; matriz física do segundo APK PENDENTE. BNDigital permanece bloqueada externamente (HTTP403/aquisição não validada). Auth externo, cancelamento Reflow98–100% e eficácia anti-enjoo mantêm os limites de `CORRECOES_BUGS_APK_PROGRESSO.md`. Versão normal com diagnósticos desligados PENDENTE.
