# Comunidade literária — Etapa 1

Branch obrigatória: `feature/comunidade-literaria`.
Commit base: `566e8a6da8efe6ae4da265dea097cf778e348d92`.
Base recebida limpa; histórico anterior preservado. Esta branch é um snapshot antigo;
a main mais recente está em outro computador. A implementação prioriza isolamento e cherry-pick.

## Checkpoint — domínio

Módulo puro em `src/community/domain`: perfil, privacidade PUBLIC/FOLLOWERS/PRIVATE,
metas, métricas, progressão, atividades, conquistas e contratos de seguidores, clubes,
threads, posts, comentários e spoilers. Sem dependências novas.

Dados ausentes são `null`. Interrompido não significa abandonado. Última página não
significa páginas lidas; última abertura não significa sessão de leitura. Datas anuais/mensais
não são inferidas. Pontos internos: início 10, conclusão 100, dia medido 5.
Uma chave semântica mantém início uma vez por livro; conclusão uma vez por livro ou
identidade de releitura fornecida por fonte futura confiável. Abrir/fechar não pontua.
FOLLOWERS permanece fechado para terceiros sem relação verificada.

`node scripts/test-community-domain.cjs` cobre os contratos e cálculos.
Integração, UI, persistência e schema ainda em implementação neste checkpoint.

# MERGE MAP

1. Domínio puro e testes: baixo risco; sem integração central.
2. Repository e adapters: depende do domínio; substituir adapters na main nova.
3. Telas e rotas: depende dos anteriores; revisar Router e entrada em Ajustes.
4. Migration e documentação: revisar schema novo antes de qualquer aplicação.

Migrations serão somente versionadas. **NÃO APLICADAS REMOTAMENTE.**
