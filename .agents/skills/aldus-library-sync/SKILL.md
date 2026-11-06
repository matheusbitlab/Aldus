---
name: aldus-library-sync
description: "Trabalhar na biblioteca Aldus, organização por conta, operações em lote, arquivos privados, progresso e Sync/outbox durável, preservando ownership e conflitos."
---

# Biblioteca e Sync existentes

Leia o [contexto](../../../PROJECT_CONTEXT.md) e o módulo
[biblioteca-sync](../../../docs/context/biblioteca-sync.md). Inspecione composição, `LibraryAccountScope`,
repositórios por conta, `LibraryLocalReplica`, journal, service e coordinator antes de editar.

## Dados e transações

- Livros e organização são camadas distintas. Editar coleção/tag/favorito/estado não
  muda arquivo nem progresso. Preserve IDs e chaves legadas.
- Acesso exige conta/epoch; logout revoga acesso sem apagar bytes. Retorno A→B→A precisa
  distinguir gerações. Não atribua dados DEVICE/legados sem dono à conta por inferência.
- Use a outbox/journal existentes: dirty/ready, operation UUID, CAS/baseRevision,
  recibo idempotente e replay de escrita interrompida. Não limpe a fila para remover aviso.
- Pull aprende tombstones antes de push. Exclusão do pai impede ressurreição de filhos.
  Conflito preserva intenção e pede escolha; maior progresso ou relógio não vence sozinho.
- Operação em lote reutiliza a escrita local/CAS e os guards de conta. Não prometa
  transação remota de lote: o servidor aplica por livro. Serialização por runtime não
  comprova atomicidade entre abas Web independentes.
- Coleção é associação existente de livros; não acrescente entidade paralela de coleção
  vazia sem uma mudança de produto explícita. Seleção da UI limpa ao trocar de conta.

## Arquivos e conta remota

- Importação local completa precede metadata/upload/publicação de remotePath. Livro
  CLOUD_ONLY só baixa ao abrir; staging valida tamanho/SHA-256/formato antes da promoção.
- “Remover deste dispositivo” requer cópia remota íntegra confirmada; “remover da biblioteca”
  escreve tombstone. Preserve as duas ações/confirmadores e seus guards.
- Hash local antes do primeiro Sync usa `PrivateBookFileService.localFingerprint()` em
  leitura, com cancelamento/conta; não altere metadata/outbox para identificar conteúdo.
- Cancelamento cobre sessão SDK, fetch e leitura do corpo. Execução antiga/finally não
  pode sobrescrever execução nova. Distinga contrato ausente, sessão, autorização e rede.
  Negação RLS não deve sugerir novo login como solução automática.
- Quotas vêm do backend; desconhecido permanece `null`. Bloqueio de crescimento mantém
  a intenção durável e permite retry; leitura, estudo e dados existentes são preservados.
- Sources, grants Drive, caches OCR/Reflow, aparência e Flashcards não entram neste
  engine por associação. Confirme o contrato antes de acrescentar entidades ao Sync.

Use [aldus-backend-operations](../aldus-backend-operations/SKILL.md) quando tocar no
contrato remoto/Auth/Storage. Migrations no disco não estabelecem o estado implantado.

## Evidência necessária

Selecione testes de account, sync, files, reading, coordinator, cancellation, restart,
RLS e bulk conforme a alteração; o catálogo está em
[aldus-validation](../aldus-validation/SKILL.md). Verifique durabilidade após reabrir o
armazenamento, cancelamento, resposta tardia, conta A/B e preservação da outbox em falha.

Suítes controladas não encerram disputa real entre clientes, RLS/Storage gerenciado ou
comportamento físico. Não use contagem de livros visíveis/filtrados como inventário total
ou prova de perda. Preserve a origem e o escopo de qualquer contagem real.
