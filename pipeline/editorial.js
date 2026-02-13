const config = require('../config');
const Utils = require('../utils');

const TOPIC_RULES = {
  llms: {
    keywords: ['llm', 'gpt', 'claude', 'gemini', 'mistral', 'modelo de linguagem', 'openai', 'anthropic'],
    subtopic: 'modelos-fundacionais'
  },
  agentes: {
    keywords: ['agente', 'agent', 'autonomo', 'multiagente', 'ferramenta', 'tool calling'],
    subtopic: 'fluxos-autonomos'
  },
  frameworks: {
    keywords: ['langchain', 'llamaindex', 'autogen', 'sdk', 'framework', 'biblioteca'],
    subtopic: 'ecossistema-dev'
  },
  'infra-ia': {
    keywords: ['gpu', 'nvidia', 'infra', 'latencia', 'deploy', 'inferencia', 'kubernetes', 'servidor'],
    subtopic: 'operacao-e-custo'
  },
  'seguranca-ia': {
    keywords: ['seguranca', 'vazamento', 'prompt injection', 'spyware', 'privacidade', 'compliance', 'ataque'],
    subtopic: 'risco-e-governanca'
  },
  'produtividade-dev': {
    keywords: ['copilot', 'cursor', 'ide', 'programador', 'desenvolvedor', 'frontend', 'backend', 'coding'],
    subtopic: 'workflow-de-codigo'
  }
};

const DEFAULT_TOPIC = 'produtividade-dev';
const DEFAULT_SUBTOPIC = 'workflow-de-codigo';

class EditorialComposer {
  detectTopic(title, rawContent) {
    const text = `${title || ''} ${Utils.stripHtml(rawContent || '')}`.toLowerCase();

    for (const topic of config.TOPIC_TAXONOMY) {
      const rule = TOPIC_RULES[topic];
      if (!rule) continue;
      if (rule.keywords.some((keyword) => text.includes(keyword))) {
        return { topic, subtopic: rule.subtopic };
      }
    }

    return { topic: DEFAULT_TOPIC, subtopic: DEFAULT_SUBTOPIC };
  }

  sentenceCandidates(text) {
    const cleaned = text.replace(/\s+/g, ' ').trim();
    if (!cleaned) return [];
    return cleaned
      .split(/(?<=[.!?])\s+/)
      .map((value) => value.trim())
      .filter(Boolean);
  }

  toBullet(topicIndex, line, maxLength = 120) {
    const clipped = Utils.truncateText(line, maxLength);
    return `- **Topico ${topicIndex}**: ${clipped}`;
  }

  buildSummary(sentences, title) {
    const pool = [...sentences];
    if (pool.length === 0 && title) pool.push(title);
    while (pool.length < 3) {
      pool.push('Detalhe tecnico em evolucao, acompanhe atualizacoes da fonte primaria.');
    }

    return pool.slice(0, 3).map((line, index) => this.toBullet(index + 1, line));
  }

  buildWhyMatters(topic, title) {
    const core = {
      llms: 'A mudanca afeta diretamente selecao de modelos, custo por token e qualidade de resposta em produtos com IA.',
      agentes: 'A noticia mexe no desenho de agentes e automacoes, impactando confiabilidade, observabilidade e manutencao.',
      frameworks: 'A atualizacao pode alterar stack e velocidade de entrega para times que integram IA em produto.',
      'infra-ia': 'O impacto principal aparece em latencia, throughput e custo operacional de inferencia para squads de engenharia.',
      'seguranca-ia': 'O ponto central e reduzir superficie de ataque em apps com IA e fortalecer praticas de seguranca de software.',
      'produtividade-dev': 'A mudanca influencia fluxo diario de desenvolvimento e pode acelerar ou travar ciclos de entrega.'
    };

    return [
      `${core[topic] || core['produtividade-dev']}`,
      `Para quem desenvolve, o valor esta em entender implicacoes praticas cedo e ajustar backlog tecnico antes da concorrencia.`,
      `No contexto de "${Utils.truncateText(title || 'noticia de IA', 90)}", o ganho real vem de transformar sinal de mercado em decisao de implementacao.`
    ].join(' ');
  }

  buildPracticalImpact(topic) {
    const actions = {
      llms: ['Revisar benchmark dos modelos usados hoje.', 'Comparar custo e qualidade em cenarios reais da aplicacao.', 'Planejar fallback multi-modelo para reduzir risco.'],
      agentes: ['Auditar tarefas criticas que dependem de autonomia.', 'Adicionar telemetria e limites de execucao por agente.', 'Criar testes de regressao para fluxos com tool calling.'],
      frameworks: ['Mapear compatibilidade da stack atual com o novo ecossistema.', 'Atualizar provas de conceito para validar ganho tecnico.', 'Documentar estrategia de migracao antes de escalar uso.'],
      'infra-ia': ['Monitorar latencia p95 e custo por requisicao.', 'Ajustar politicas de cache e roteamento de inferencia.', 'Revisar capacidade de ambiente para picos de uso.'],
      'seguranca-ia': ['Aplicar validacao de entrada e saida contra abuso.', 'Adicionar checagens de seguranca no pipeline de prompts.', 'Reforcar trilha de auditoria para incidentes com IA.'],
      'produtividade-dev': ['Definir guideline de uso de IA no time.', 'Mensurar impacto em lead time e qualidade de codigo.', 'Padronizar revisao humana para saidas criticas.']
    };

    return (actions[topic] || actions['produtividade-dev']).map((line) => `- ${line}`).join('\n');
  }

  buildContext(post) {
    return [
      `- Fonte original: ${post.source || 'Fonte nao informada'}`,
      `- Publicado em: ${post.date || new Date().toISOString()}`,
      `- Niche editorial: ${config.EDITORIAL_NICHE}`
    ].join('\n');
  }

  compose(post) {
    const rawFormatted = Utils.formatArticleContent(post.raw_content || post.content || '', {
      heroImageUrl: post.image_url || ''
    });
    const sentences = this.sentenceCandidates(rawFormatted);
    const { topic, subtopic } = this.detectTopic(post.title, rawFormatted);

    const summary = this.buildSummary(sentences, post.title);
    const whyMatters = this.buildWhyMatters(topic, post.title);
    const practical = this.buildPracticalImpact(topic);
    const context = this.buildContext(post);
    const primarySource = post.original_url || post.source_url || '';

    const content = [
      '## Resumo em 3 bullets',
      ...summary,
      '',
      '## Por que isso importa para devs',
      whyMatters,
      '',
      '## O que muda na pratica',
      practical,
      '',
      '## Contexto rapido',
      context,
      '',
      '## Fonte primaria',
      primarySource ? `- ${primarySource}` : '- Fonte primaria nao identificada'
    ].join('\n');

    return {
      content,
      raw_formatted: rawFormatted,
      topic,
      subtopic,
      primary_source: primarySource,
      content_kind: 'news-curated'
    };
  }
}

module.exports = new EditorialComposer();
