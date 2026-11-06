---
name: aldus-web-delivery
description: "Exportar, conferir ou publicar o Aldus Web em preview/produção, vinculando dist, build-info, revisão, hashes, rotas e testes ao deployment efetivo."
---

# Entrega Web identificável

Consulte o [README](../../../README.md), `vercel.json`, scripts de export/metadata e os
[contexto](../../../PROJECT_CONTEXT.md) e o módulo
[legal-build-git](../../../docs/context/legal-build-git.md) (Web/CI) e entregas em `docs/context/historico/`. Não suponha
que a URL de uma entrega antiga aponta para o código atual.

## Preparar e validar localmente

- Confirme HEAD/branch e diferenças, incluindo fontes não versionadas importadas pelo app.
  Se o checkout mudar durante o export, não atribua automaticamente o resultado ao HEAD inicial.
- Use os comandos existentes: gates pertinentes e `npm run export:web`, que executa
  validação de env pública, catálogo, Expo, assets/rotas e metadata. Não exporte ignorando o guard.
- Leia `dist/build-info.json`: commit, dirty e hashes. `dirty=true` descreve uma fonte com
  diferenças; não a apresente como checkout limpo nem apague mudanças para obter `false`.
- `node scripts/test-web-build.cjs --exported` confere o export existente. Exercite browser
  conforme [aldus-validation](../aldus-validation/SKILL.md). Não reutilize dist antigo por nome.
- Env pública só pode conter chave anon/publishable e configuração destinada ao cliente.
  Configuração sintética de CI valida build, não login/serviços reais. Produção exige dados
  legais verificados conforme o guard atual.

## Publicação solicitada

1. Leia as skills Vercel de deployment/CLI disponíveis e confirme projeto/equipe/ambiente.
   O projeto documentado é `kindle-reader`; reconfirme o vínculo, sem criar outro por engano.
2. Publique somente o destino autorizado. Preview não autoriza promoção de produção.
   Não execute deploy de trabalho alheio que esteja no mesmo worktree.
3. Use conector suficiente ou CLI autenticada. Se publicar uma pasta preparada separada,
   confirme o cwd efetivo (por exemplo, opção `--cwd` suportada), arquivos e configuração.
   Não deduza que `--prebuilt`/um argumento posicional resolve a raiz por conta própria.
4. Aguarde estado final e confira ID, origin/alias, revisão e `/build-info.json`. Verifique
   HTTP/rotas/assets e hashes dos bundles contra o artefato local. READY/HTTP 200 não é smoke.
5. Faça os fluxos do pedido na URL publicada. Landing/biblioteca/Reader/Auth/Admin exigem
   evidência própria conforme o escopo. Bundle disponível não comprova Reader pronto ou login.
6. Se houver Deployment Protection, use acesso autorizado e a skill específica disponível;
   não desative proteção nem confunda tela de login Vercel com o app.
7. Origin novo pode precisar de allowlist/callback/recovery. Inventarie e registre a lacuna;
   não mude OAuth/Auth geral automaticamente. Não recicle token de recovery de uma captura.

Registre URL HTTPS real, ID/ambiente, fonte/dirty, checks executados e limites no contexto.
Sem publicação realizada, entregue caminhos locais e diga que não houve deploy. Nunca invente
URL, status READY, login autenticado ou aprovação de CI. Um workflow versionado não prova
execução remota; consulte a execução correspondente quando isso fizer parte do pedido.
