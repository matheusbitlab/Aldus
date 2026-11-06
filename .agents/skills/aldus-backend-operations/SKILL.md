---
name: aldus-backend-operations
description: "Trabalhar em Supabase, Auth, RLS, Storage, migrations, SaaS e Admin do Aldus, separando implementação local de operação remota e preservando dados e autorização."
---

# Backend: contrato local e estado remoto

Leia o [contexto](../../../PROJECT_CONTEXT.md), [auth](../../../docs/context/auth.md),
[biblioteca-sync](../../../docs/context/biblioteca-sync.md) (SaaS/Admin) e [bugs](../../../BUGS_ATUAIS.md). Há registros
antigos de backend pendente que foram substituídos por implantação autorizada posterior.
Não use a seção inicial de um módulo como inventário remoto atual.

Se disponíveis, leia as skills do provedor Supabase e de boas práticas Postgres pertinentes.
Antes de implementar uma API/configuração do provedor, confira documentação oficial atual
e changelog relevante. Descubra CLI por `--help`; não adivinhe flags. As regras específicas
do Aldus e o pedido vigente definem o destino/escopo das operações.

## Desenvolvimento local

- Reutilize contratos/repositórios e RPCs atuais; plano/Admin no cliente não é autoridade.
  Fonte indisponível retorna snapshot/uso/preço `null`, sem fabricar Free/Pro, receita ou zero.
- Preserve perfil ativo, isolamento A/B, epoch A→B→A, cancelamento e JWT congelado por operação.
  Grants de Admin não são assinatura paga. Roles/user metadata editáveis não concedem permissão.
- Segredos/service_role ficam fora do cliente e de `EXPO_PUBLIC_*`. Não imprima `.env`,
  sessão/JWT, tokens de recovery, TOTP, backup ou credenciais em logs/chat.
- Migrations históricas são imutáveis. Uma mudança de schema exige incremental nova e
  validação isolada de dados/grants/RLS/contrato; crie pelo comando suportado da CLI quando
  disponível. Não execute SQL experimental num projeto remoto conectado.
- Preserve o contrato de Storage privado/imutável e quotas/reservas. Não acrescente upsert,
  URL pública, bypass RLS ou SECURITY DEFINER para contornar permissão negada.
- Auth Google, recovery e Drive têm fluxos distintos. Localize a primeira falha em sessão,
  callback, allowlist/origin, perfil ou serviço antes de mudar configuração geral.
- OWNER/MFA/auditoria/último OWNER exigem as guardas reais. Fixture que simula claims/TOTP
  não comprova sessão gerenciada. Não faça bootstrap novamente por ler uma instrução antiga.

## Operação remota quando estiver autorizada

1. Identifique projeto, conta/equipe, ambiente e operação exata usando ferramentas disponíveis.
   Prefira conector suficiente; se faltar acesso, não contorne negação ou relaxe proteção.
2. Faça inventário mínimo somente leitura de ledger, definições/RLS/ACL, bucket e dependências.
   Compare equivalência/hash de migrations, não apenas nomes/versões locais. Versões históricas
   locais e remotas já podem diferir. Não use `db push` ou repair indiscriminado.
3. Prepare mudança concreta, impacto, validação e recuperação proporcional. Para implantação
   que afeta dados reais, confirme backup e restauração isolada necessários. Backup SQL não
   inclui automaticamente objetos Storage nem configuração Auth/SMTP/OAuth do provedor.
4. Execute apenas o incremento/destino autorizado. Confirme objetos/dados/contrato após cada
   etapa; pare em divergência. Não faça rollback destrutivo/replay em loop por suposição.
5. Homologue o comportamento relevante com sessões reais autorizadas A/B/disabled/anon,
   quotas/concorrência/Storage conforme a alteração. Service_role não representa usuário.
   Não crie contas ou dados remotos extras fora do piloto autorizado.
6. Registre evidência sanitizada e estado restante. Aplicar SQL não publica frontend;
   deploy Web, alterações OAuth, bootstrap e cobrança são ações distintas.

Os procedimentos existentes de [Library Sync](../../../LIBRARY_SYNC_DEPLOYMENT.md) e
[Google](../../../GOOGLE_AUTH_DRIVE_DEPLOYMENT.md) apoiam tarefas operacionais específicas,
sem conceder autorização. Se ela já existir para a ação, prossiga sem solicitar de novo.

Use [aldus-validation](../aldus-validation/SKILL.md) para testes locais. PGlite e Postgres
isolado não provam GoTrue/PostgREST/Storage gerenciado. Falta de acesso é bloqueio externo
da verificação remota; não invalida uma implementação local que passou seus próprios gates.
