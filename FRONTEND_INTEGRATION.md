# Frontend Integration Contract

Este documento descreve como o frontend (`news-juliano340`) deve consumir os campos editoriais novos gerados pelo worker.

## Frontmatter novo por post

- `topic`: topico principal de IA para devs.
- `subtopic`: subcategoria para navegação de hub.
- `content_kind`: tipo de conteúdo (`news-curated`).
- `editorial_score`: score do quality gate.
- `primary_source`: URL da fonte primária.

## Seções no corpo markdown

Todo post novo passa a incluir as seções abaixo, nesta ordem:

1. `## Resumo em 3 bullets`
2. `## Por que isso importa para devs`
3. `## O que muda na pratica`
4. `## Contexto rapido`
5. `## Fonte primaria`

## Renderização recomendada

- Exibir `Resumo em 3 bullets` em destaque no topo da matéria.
- Exibir badge de `topic` e `subtopic` no cabeçalho do post.
- Exibir `editorial_score` apenas em ambientes internos (não obrigatório em produção).
- Renderizar `Fonte primaria` como bloco de referência ao final da matéria.

## Hubs temáticos

Criar páginas de hub por `topic`:

- `/ia-dev/llms`
- `/ia-dev/agentes`
- `/ia-dev/frameworks`
- `/ia-dev/infra-ia`
- `/ia-dev/seguranca-ia`
- `/ia-dev/produtividade-dev`

Cada hub deve listar posts filtrados por `topic` e priorizar `editorial_score` maior em destaque.

## Artefatos de recorrência

O worker agora gera:

- `content/digests/digest-24h.json`
- `content/digests/weekly-ia-dev.md`

Uso recomendado no frontend:

- Home: bloco "Resumo das ultimas 24h" consumindo `digest-24h.json`.
- Newsletter page: render do `weekly-ia-dev.md`.
