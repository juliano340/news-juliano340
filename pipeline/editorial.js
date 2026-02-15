const config = require('../config');
const Utils = require('../utils');
const ai = require('../ai');

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

  toBullet(_topicIndex, line, maxLength = 120) {
    const clipped = Utils.truncateText(line, maxLength);
    return `- ${clipped}`;
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

  buildContext(topic, title) {
    const contextByTopic = {
      llms: 'A pauta conecta disputa regulatoria, seguranca de modelos e contratos com governo em um momento de aceleracao da IA generativa.',
      agentes: 'O tema reforca que autonomia sem governanca cria risco operacional, juridico e reputacional para produtos baseados em agentes.',
      frameworks: 'A discussao sinaliza impacto direto em padroes de integracao, requisitos de observabilidade e escolha de stack para escalar IA.',
      'infra-ia': 'A noticia toca em capacidade de operacao segura, previsibilidade de custo e requisitos tecnicos para workloads sensiveis.',
      'seguranca-ia': 'A cobertura aponta para pressao por controles tecnicos mais rigorosos e trilha de auditoria em sistemas com IA.',
      'produtividade-dev': 'O assunto mostra como decisao de mercado e regulacao pode mudar backlog de engenharia e prioridades de entrega em curto prazo.'
    };

    return [
      contextByTopic[topic] || contextByTopic['produtividade-dev'],
      `No caso de "${Utils.truncateText(title || 'esta noticia', 90)}", o ponto central e transformar informacao em decisao pratica de produto.`
    ].join(' ');
  }

  buildIntro(topic, title) {
    const leadByTopic = {
      llms: 'A disputa sobre salvaguardas de IA ganhou peso estrategico e pode redefinir como empresas negociam uso de modelos em contextos sensiveis.',
      agentes: 'Mudancas em governanca de IA estao elevando o nivel de exigencia para fluxos autonomos usados em producao.',
      frameworks: 'O ecossistema de IA continua mudando rapido e exige leitura tecnica para evitar decisoes de stack com alto custo de reversao.',
      'infra-ia': 'Decisoes recentes reforcam que infraestrutura de IA precisa equilibrar desempenho, custo e conformidade.',
      'seguranca-ia': 'A pauta aumenta o foco em controles de seguranca e responsabilidade no uso de IA em ambientes criticos.',
      'produtividade-dev': 'A noticia traz sinais relevantes para times de engenharia que dependem de IA no fluxo diario de desenvolvimento.'
    };

    return [
      leadByTopic[topic] || leadByTopic['produtividade-dev'],
      `Em "${Utils.truncateText(title || 'noticia de IA', 90)}", o impacto nao e apenas narrativo: ele afeta risco, roadmap e criterio de decisao tecnica.`
    ].join(' ');
  }

  buildDeveloperChecklist(topic) {
    const checklist = {
      llms: [
        'Mapear onde o produto depende de um unico provedor de modelo.',
        'Definir fallback tecnico e contratual para indisponibilidade ou mudanca de politica.',
        'Atualizar matriz de risco para uso de IA em contexto regulado.'
      ],
      agentes: [
        'Classificar tarefas que podem ser automatizadas com baixo risco.',
        'Aplicar limites de autonomia com aprovacoes humanas em decisoes criticas.',
        'Registrar logs de acoes para auditoria e troubleshooting.'
      ],
      frameworks: [
        'Comparar lock-in tecnico entre opcoes antes de migrar stack.',
        'Validar compatibilidade com monitoramento e observabilidade existentes.',
        'Planejar rollout incremental com metas de desempenho e custo.'
      ],
      'infra-ia': [
        'Revisar SLA e SLO de inferencia para cargas sensiveis.',
        'Definir budget de custo por requisicao e alertas por anomalia.',
        'Testar plano de contingencia para aumento brusco de latencia.'
      ],
      'seguranca-ia': [
        'Aplicar validacao de entrada e filtros de saida em prompts.',
        'Reforcar trilha de auditoria para respostas e acoes automatizadas.',
        'Executar revisao de seguranca antes de ampliar escopo do uso de IA.'
      ],
      'produtividade-dev': [
        'Definir politica interna para uso de IA em codigo e documentacao.',
        'Medir impacto de produtividade com metrica de lead time.',
        'Manter revisao humana obrigatoria em entregas de alto risco.'
      ]
    };

    return (checklist[topic] || checklist['produtividade-dev']).map((line) => `- ${line}`).join('\n');
  }

  buildWatchList(topic) {
    const watch = {
      llms: [
        'Comunicados oficiais sobre requisitos de seguranca para contratos de IA.',
        'Mudancas em clausulas de conformidade entre governo e fornecedores.',
        'Sinais de atraso ou cancelamento em programas que dependem de modelos generativos.'
      ],
      agentes: [
        'Novas restricoes para autonomia em fluxos de decisao automatizada.',
        'Atualizacoes de boas praticas para supervisao humana.',
        'Incidentes que motivem revisao de governanca em agentes.'
      ],
      frameworks: [
        'Lancamentos de recursos voltados a compliance e auditoria.',
        'Mudancas de licenca e termos de uso em ferramentas chave.',
        'Estudos comparativos de desempenho em casos reais.'
      ],
      'infra-ia': [
        'Anuncios de requisitos extras para operacao em ambientes criticos.',
        'Variacao de custo de infraestrutura para inferencia em escala.',
        'Atualizacoes de latencia e disponibilidade dos provedores.'
      ],
      'seguranca-ia': [
        'Guias e normativos novos sobre seguranca aplicada a IA.',
        'Incidentes publicos relacionados a prompt injection e vazamento.',
        'Exigencias de auditoria em setores regulados.'
      ],
      'produtividade-dev': [
        'Mudancas de politica em ferramentas de IA usadas no desenvolvimento.',
        'Novos recursos que alterem custo-beneficio no fluxo de engenharia.',
        'Casos de uso com ganho comprovado em produtividade real.'
      ]
    };

    return (watch[topic] || watch['produtividade-dev']).map((line) => `- ${line}`).join('\n');
  }

  buildFaq(topic) {
    const generic = [
      {
        q: '### O que aconteceu de fato?',
        a: 'Houve um impasse entre as partes sobre requisitos de seguranca e governanca no uso de IA, com potencial impacto em contratos e continuidade de projetos.'
      },
      {
        q: '### Qual o impacto para times de tecnologia?',
        a: 'Times podem precisar rever riscos de fornecedor, compliance e arquitetura para reduzir dependencia e manter continuidade operacional.'
      },
      {
        q: '### O que fazer agora?',
        a: 'Priorize mapeamento de dependencia, ajuste de politicas internas e acompanhamento de comunicados oficiais para agir antes de mudancas bruscas.'
      }
    ];

    if (topic === 'seguranca-ia') {
      generic[1].a = 'O impacto principal recai sobre controles de seguranca, auditoria de prompts e exigencias de rastreabilidade em sistemas com IA.';
    }

    return generic.map((item) => `${item.q}\n${item.a}`).join('\n\n');
  }

  buildSourceTransparency(post, sourceUrl) {
    return [
      sourceUrl ? `- Fonte primaria: ${sourceUrl}` : '- Fonte primaria nao identificada',
      '- Este conteudo foi gerado automaticamente com curadoria editorial assistida por IA.',
      '- Encontrou um erro? Solicite revisao via repositorio oficial do projeto.'
    ].join('\n');
  }

  normalizeAIBullets(summaryBullets) {
    const cleaned = (summaryBullets || []).map((line) => String(line || '').trim()).filter(Boolean);
    const list = [...cleaned];
    while (list.length < 3) {
      list.push('Detalhe tecnico em evolucao, acompanhe atualizacoes da fonte primaria.');
    }

    return list.slice(0, 3).map((line) => `- ${Utils.truncateText(line, 140)}`);
  }

  normalizeAIActions(actions) {
    const list = (actions || []).map((line) => String(line || '').trim()).filter(Boolean);
    while (list.length < 3) {
      list.push('Monitorar atualizacoes e adaptar backlog tecnico com base no impacto para o produto.');
    }
    return list.slice(0, 3).map((line) => `- ${Utils.truncateText(line, 140)}`).join('\n');
  }

  normalizeAIContext(contextBullets, post) {
    const list = (contextBullets || []).map((line) => String(line || '').trim()).filter(Boolean);
    const defaults = [
      `Fonte original: ${post.source || 'Fonte nao informada'}`,
      `Publicado em: ${post.date || new Date().toISOString()}`,
      `Niche editorial: ${config.EDITORIAL_NICHE}`
    ];

    for (const line of defaults) {
      if (list.length >= 3) break;
      list.push(line);
    }

    return list.slice(0, 3).map((line) => `- ${Utils.truncateText(line, 170)}`).join('\n');
  }

  buildHeuristicContent(post, topic, title, rawFormatted, primarySource) {
    const sentences = this.sentenceCandidates(rawFormatted);
    const summary = this.buildSummary(sentences, title);
    const intro = this.buildIntro(topic, title);
    const whyMatters = this.buildWhyMatters(topic, title);
    const practical = this.buildPracticalImpact(topic);
    const context = this.buildContext(topic, title);
    const checklist = this.buildDeveloperChecklist(topic);
    const watchList = this.buildWatchList(topic);
    const faq = this.buildFaq(topic);
    const sourceTransparency = this.buildSourceTransparency(post, primarySource);

    return [
      intro,
      '',
      '## Resumo em 3 bullets',
      ...summary,
      '',
      '## Contexto',
      context,
      '',
      '## O que muda na pratica',
      practical,
      '',
      '## Para devs/negocios (checklist)',
      checklist,
      '',
      '## O que observar nos proximos dias',
      watchList,
      '',
      '## FAQ',
      faq,
      '',
      '## Fonte e transparencia',
      sourceTransparency,
      '',
      '## Por que isso importa para devs',
      whyMatters
    ].join('\n');
  }

  buildAIContent(post, aiDraft, primarySource) {
    const summary = this.normalizeAIBullets(aiDraft.summary_bullets);
    const intro = this.buildIntro(post.topic || 'produtividade-dev', post.title);
    const whyMatters = Utils.truncateText(String(aiDraft.why_matters || '').trim(), 700);
    const practical = this.normalizeAIActions(aiDraft.practical_actions);
    const context = this.buildContext(post.topic || 'produtividade-dev', post.title);
    const checklist = this.buildDeveloperChecklist(post.topic || 'produtividade-dev');
    const watchList = this.buildWatchList(post.topic || 'produtividade-dev');
    const faq = this.buildFaq(post.topic || 'produtividade-dev');
    const resolvedSource = aiDraft.source_reference && /^https?:\/\//i.test(aiDraft.source_reference)
      ? aiDraft.source_reference
      : primarySource;
    const sourceTransparency = this.buildSourceTransparency(post, resolvedSource);

    return {
      content: [
        intro,
        '',
        '## Resumo em 3 bullets',
        ...summary,
        '',
        '## Contexto',
        context,
        '',
        '## O que muda na pratica',
        practical,
        '',
        '## Para devs/negocios (checklist)',
        checklist,
        '',
        '## O que observar nos proximos dias',
        watchList,
        '',
        '## FAQ',
        faq,
        '',
        '## Fonte e transparencia',
        sourceTransparency,
        '',
        '## Por que isso importa para devs',
        whyMatters
      ].join('\n'),
      primarySource: resolvedSource,
      aiMetadata: {
        model_used: aiDraft.model_used || '',
        latency_ms: aiDraft.latency_ms || null,
        fallback_used: Boolean(aiDraft.fallback_used),
        editorial_confidence: aiDraft.editorial_confidence || 0,
        risk_flags: aiDraft.risk_flags || []
      }
    };
  }

  async compose(post) {
    const rawFormatted = Utils.formatArticleContent(post.raw_content || post.content || '', {
      heroImageUrl: post.image_url || ''
    });
    const { topic, subtopic } = this.detectTopic(post.title, rawFormatted);
    const primarySource = post.original_url || post.source_url || '';

    let content = '';
    let resolvedPrimarySource = primarySource;
    let editorialMode = '';
    let aiMetadata = null;

    const aiDraft = await ai.generateEditorialDraft({
      title: post.title,
      source: post.source,
      source_url: post.source_url,
      original_url: post.original_url,
      date: post.date,
      topic,
      raw_content: Utils.stripHtml(rawFormatted)
    });

    if (aiDraft) {
      const aiOutput = this.buildAIContent({ ...post, topic }, aiDraft, primarySource);
      content = aiOutput.content;
      resolvedPrimarySource = aiOutput.primarySource;
      editorialMode = aiDraft.fallback_used ? 'ai_fallback_model' : 'ai_primary_model';
      aiMetadata = aiOutput.aiMetadata;
    } else if (config.AI_EDITORIAL_REQUIRED) {
      const reason = ai.editorialEnabled ? 'ai_generation_failed' : 'ai_editorial_disabled';

      return {
        blocked: true,
        block_reason: reason,
        raw_formatted: rawFormatted,
        topic,
        subtopic,
        primary_source: primarySource,
        content_kind: 'news-curated',
        editorial_mode: 'blocked'
      };
    } else {
      content = this.buildHeuristicContent(post, topic, post.title, rawFormatted, primarySource);
      editorialMode = 'heuristic';
    }

    return {
      blocked: false,
      content,
      raw_formatted: rawFormatted,
      topic,
      subtopic,
      primary_source: resolvedPrimarySource,
      content_kind: 'news-curated',
      editorial_mode: editorialMode,
      ai_metadata: aiMetadata
    };
  }
}

module.exports = new EditorialComposer();
