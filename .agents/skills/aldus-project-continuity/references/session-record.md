# Modelo para registro nos documentos oficiais

Copie e adapte apenas os campos necessários dentro de `PROJECT_CONTEXT.md`. Para bugs,
atualize também o item correspondente em `BUGS_ATUAIS.md`. Não salve uma cópia preenchida
como novo handoff/checkpoint. Campos desconhecidos devem dizer “não verificado”.

```markdown
## AAAA-MM-DD — resultado concreto da tarefa

Pedido/aceite: comportamento esperado e escopo autorizado.
Base: branch, HEAD completo e alterações locais preexistentes relevantes.
Mudança: causa/decisão, comportamento final e principais caminhos alterados.

Evidências desta revisão:
- Comando/cenário, resultado observado, ambiente e fixtures ou dados reais autorizados.
- Identidade do artefato/deployment quando aplicável; caminho de log/captura regenerável.
- Limites: quais cenários/plataformas/serviços não foram verificados.

Estado: IMPLEMENTADO / VALIDADO em cenário definido / PARCIAL / PENDENTE /
NÃO TESTADO / INCONCLUSIVO / BLOQUEADO, conforme cada item.
Pendências: problema + dependência concreta, sem transformar hipótese em causa.
Próximo passo: ação executável, arquivo/comando e critério de sucesso.
Autorização: ações externas cobertas pelo pedido e ações ainda fora do escopo.
```

Para um bug, acrescente reprodução mínima, esperado/observado, primeira divergência,
causa `CONFIRMADA`/`FORTE EVIDÊNCIA`/`HIPÓTESE`/`INCONCLUSIVA`, correção e regressão.
Um item resolvido sai da lista ativa apenas no escopo comprovado; retenha decisão e
evidência permanente no contexto, sem apagar pendências físicas/remotas relacionadas.

Para APK, use o registro completo da skill de entrega Android. Para Web, inclua commit,
dirty, hashes e deployment/origin reais. Um nome de arquivo não identifica sua origem.
