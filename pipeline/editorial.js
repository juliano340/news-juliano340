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

const DEFAULT_TOPIC = 'geral';
const DEFAULT_SUBTOPIC = 'geral';

const DOMAIN_RULES = {
  'ia-dev': ['ia', 'inteligencia artificial', 'llm', 'gpt', 'claude', 'gemini', 'openai', 'anthropic', 'agente', 'prompt', 'copilot', 'cursor'],
  games: ['game', 'jogo', 'playstation', 'xbox', 'nintendo', 'steam', 'rpg', 'fps'],
  entretenimento: ['filme', 'serie', 'ator', 'atriz', 'oscar', 'trailer', 'cinema', 'netflix', 'disney'],
  seguranca: ['malware', 'ransomware', 'vazamento', 'phishing', 'ciber', 'ataque', 'exploit', 'privacidade'],
  hardware: ['gpu', 'cpu', 'chip', 'nvidia', 'amd', 'intel', 'memoria', 'processador', 'datacenter'],
  negocios: ['mercado', 'investimento', 'acoes', 'receita', 'fusao', 'aquisicao', 'preco', 'contrato']
};

class EditorialComposer {
  detectTopic(title, rawContent) {
    const text = `${title || ''} ${Utils.stripHtml(rawContent || '')}`.toLowerCase();
    let best = { topic: DEFAULT_TOPIC, subtopic: DEFAULT_SUBTOPIC, matches: 0 };

    for (const topic of config.TOPIC_TAXONOMY) {
      const rule = TOPIC_RULES[topic];
      if (!rule) continue;
      const matches = rule.keywords.filter((keyword) => text.includes(keyword)).length;
      if (matches > best.matches) {
        best = { topic, subtopic: rule.subtopic, matches };
      }
    }

    if (best.matches < 1) return { topic: DEFAULT_TOPIC, subtopic: DEFAULT_SUBTOPIC };
    return { topic: best.topic, subtopic: best.subtopic };
  }

  detectDomain(title, rawContent, topic) {
    if (['llms', 'agentes', 'frameworks', 'infra-ia', 'seguranca-ia', 'produtividade-dev'].includes(topic)) {
      return 'ia-dev';
    }

    const text = `${title || ''} ${Utils.stripHtml(rawContent || '')}`.toLowerCase();
    let selected = 'geral';
    let score = 0;

    for (const [domain, keywords] of Object.entries(DOMAIN_RULES)) {
      const matches = keywords.filter((keyword) => text.includes(keyword)).length;
      if (matches > score) {
        score = matches;
        selected = domain;
      }
    }

    return selected;
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

  buildWhyMatters(domain, title) {
    const core = {
      'ia-dev': 'A pauta impacta decisoes de produto, arquitetura e governanca para times que usam IA no dia a dia.',
      games: 'A noticia importa para jogadores porque afeta catalogo, plataforma e expectativa de lancamento no curto prazo.',
      entretenimento: 'A pauta ajuda o leitor a entender contexto cultural, carreira e repercussao publica do tema.',
      seguranca: 'O impacto principal esta em risco digital, protecao de dados e medidas praticas de prevencao.',
      hardware: 'A atualizacao influencia desempenho, custo e decisoes de compra para usuarios e empresas.',
      negocios: 'O tema altera cenario competitivo, estrategia e movimentacao de mercado para os proximos meses.',
      geral: 'A noticia e relevante porque organiza fatos-chave e mostra o que muda para o leitor no curto prazo.'
    };

    return [
      `${core[domain] || core.geral}`,
      `No contexto de "${Utils.truncateText(title || 'esta noticia', 90)}", o ganho real e separar ruido de informacao util para decidir o proximo passo.`
    ].join(' ');
  }

  buildPracticalImpact(domain) {
    const actions = {
      'ia-dev': ['Revisar impacto tecnico no stack atual e no backlog de curto prazo.', 'Definir criterios claros de risco, custo e desempenho para decidir proximos passos.', 'Planejar experimento pequeno antes de escalar qualquer mudanca.'],
      games: ['Conferir plataformas e datas para evitar compra no ecossistema errado.', 'Comparar preco, desempenho e disponibilidade antes de decidir a compra.', 'Acompanhar anuncios oficiais de edicao, bonus e atualizacoes de lancamento.'],
      entretenimento: ['Verificar contexto da obra ou da carreira para entender o destaque atual.', 'Separar fato de rumor antes de compartilhar ou tomar conclusoes.', 'Acompanhar confirmacoes oficiais sobre elenco, estreia e distribuicao.'],
      seguranca: ['Aplicar medida preventiva imediata nos dispositivos e contas afetadas.', 'Verificar se ha atualizacao oficial, patch ou mitigacao disponivel.', 'Registrar incidente e revisar politica interna para reduzir recorrencia.'],
      hardware: ['Comparar especificacoes reais com necessidade de uso do dia a dia.', 'Avaliar custo-beneficio considerando durabilidade e suporte.', 'Esperar benchmarks independentes antes de compra de alto valor.'],
      negocios: ['Monitorar impacto no mercado e no posicionamento dos principais atores.', 'Revisar implicacoes de preco, contrato e estrategia de curto prazo.', 'Acompanhar comunicados oficiais para confirmar mudancas estruturais.'],
      geral: ['Entender o fato central antes de formar opiniao.', 'Acompanhar os desdobramentos nos proximos dias.', 'Usar fontes primarias para validar pontos sensiveis.']
    };

    return (actions[domain] || actions.geral).map((line) => `- ${line}`).join('\n');
  }

  buildContext(domain, title) {
    const contextByTopic = {
      'ia-dev': 'A pauta se conecta a uso pratico de IA em produto, decisao tecnica e governanca de implementacao.',
      games: 'O tema se encaixa no calendario de lancamentos e no comportamento de consumo de jogadores em diferentes plataformas.',
      entretenimento: 'A cobertura ganha relevancia por combinar interesse publico, contexto cultural e impacto de audiencia.',
      seguranca: 'A discussao envolve risco real para usuarios e exige leitura atenta de orientacoes e mitigacoes oficiais.',
      hardware: 'A noticia conversa com ciclo de renovacao de dispositivos, desempenho esperado e custo de atualizacao.',
      negocios: 'O assunto cruza estrategia, competicao e movimento financeiro de empresas do setor.',
      geral: 'A materia organiza os principais fatos e ajuda a entender o contexto sem ruido.'
    };

    return [
      contextByTopic[domain] || contextByTopic.geral,
      `No caso de "${Utils.truncateText(title || 'esta noticia', 90)}", o ponto central e transformar informacao em decisao pratica para o leitor.`
    ].join(' ');
  }

  buildIntro(domain, title) {
    const leadByTopic = {
      'ia-dev': 'A noticia traz um sinal util para quem trabalha com IA e precisa tomar decisoes tecnicas com mais previsibilidade.',
      games: 'A semana de games ganhou destaque com novos lancamentos e mudancas de plataforma que afetam decisao de compra.',
      entretenimento: 'A pauta ganhou tracao por reunir contexto, nomes relevantes e impacto de audiencia no momento atual.',
      seguranca: 'O caso chama atencao por envolver risco digital e necessidade de resposta rapida para reduzir impacto.',
      hardware: 'A novidade chama atencao por potencial efeito em desempenho, custo e escolha de equipamentos.',
      negocios: 'A movimentacao do mercado sinaliza mudancas importantes para estrategia e posicionamento no setor.',
      geral: 'A noticia traz informacoes relevantes e pede leitura com foco em fatos e desdobramentos imediatos.'
    };

    return [
      leadByTopic[domain] || leadByTopic.geral,
      `Em "${Utils.truncateText(title || 'esta noticia', 90)}", o valor esta em entender o que muda na pratica para o publico interessado no tema.`
    ].join(' ');
  }

  buildDeveloperChecklist(domain) {
    const checklist = {
      'ia-dev': [
        'Mapear onde o produto depende de um unico provedor de modelo.',
        'Definir fallback tecnico e contratual para indisponibilidade ou mudanca de politica.',
        'Atualizar matriz de risco para uso de IA em contexto regulado.'
      ],
      games: [
        'Conferir plataformas, requisitos e idioma antes da compra.',
        'Comparar faixa de preco entre lojas e edicoes disponiveis.',
        'Acompanhar atualizacoes de desempenho e eventuais correcoes no lancamento.'
      ],
      entretenimento: [
        'Verificar informacoes em fontes oficiais e comunicados dos estúdios.',
        'Separar anuncio confirmado de especulacao de redes sociais.',
        'Acompanhar calendario de estreia e disponibilidade por plataforma.'
      ],
      seguranca: [
        'Aplicar patches e mitigacoes recomendadas pelo fornecedor.',
        'Revisar credenciais, acessos e politicas de autenticao.',
        'Registrar incidente e monitorar tentativas de exploracao relacionadas.'
      ],
      hardware: [
        'Comparar especificacoes reais com seu uso principal.',
        'Avaliar custo total considerando acessorios e suporte.',
        'Aguardar reviews independentes para confirmar desempenho prometido.'
      ],
      negocios: [
        'Mapear impactos da noticia em concorrencia e posicionamento.',
        'Acompanhar indicadores de preco, margem e demanda.',
        'Ajustar comunicacao e planejamento conforme novos desdobramentos.'
      ],
      geral: [
        'Priorizar fatos confirmados em fontes primarias.',
        'Acompanhar atualizacoes oficiais nos proximos dias.',
        'Evitar conclusoes definitivas antes de novos dados.'
      ]
    };

    return (checklist[domain] || checklist.geral).map((line) => `- ${line}`).join('\n');
  }

  buildWatchList(domain) {
    const watch = {
      'ia-dev': [
        'Comunicados oficiais sobre requisitos de seguranca para contratos de IA.',
        'Mudancas em clausulas de conformidade entre governo e fornecedores.',
        'Sinais de atraso ou cancelamento em programas que dependem de modelos generativos.'
      ],
      games: [
        'Atualizacoes de data, preco e disponibilidade por plataforma.',
        'Analises iniciais de desempenho e estabilidade nos primeiros dias.',
        'Feedback da comunidade sobre jogabilidade e conteudo.'
      ],
      entretenimento: [
        'Novas confirmacoes de elenco, producao e distribuicao.',
        'Repercussao de publico e critica especializada.',
        'Mudancas no calendario oficial de lancamento.'
      ],
      seguranca: [
        'Comunicados oficiais sobre alcance e mitigacao do risco.',
        'Liberacao de patches, atualizacoes e indicadores de exploracao.',
        'Recomendacoes de autoridades e equipes de resposta a incidentes.'
      ],
      hardware: [
        'Novos benchmarks e testes independentes de desempenho.',
        'Mudanca de preco, estoque e janela de disponibilidade.',
        'Atualizacoes tecnicas de firmware, drivers e compatibilidade.'
      ],
      negocios: [
        'Movimentos de concorrentes apos o anuncio inicial.',
        'Resultados financeiros e sinais de adocao do mercado.',
        'Mudancas regulatórias ou contratuais ligadas ao tema.'
      ],
      geral: [
        'Confirmacoes oficiais e atualizacoes da historia.',
        'Dados adicionais que mudem a interpretacao inicial.',
        'Reacao do publico e dos atores diretamente envolvidos.'
      ]
    };

    return (watch[domain] || watch.geral).map((line) => `- ${line}`).join('\n');
  }

  buildFaq(domain, title) {
    const generic = [
      {
        q: '### O que aconteceu de fato?',
        a: `A noticia "${Utils.truncateText(title || 'desta pauta', 100)}" apresenta um novo desdobramento com impacto direto para quem acompanha esse assunto.`
      },
      {
        q: '### Qual o impacto pratico para o publico?',
        a: 'O impacto depende do tipo de pauta, mas em geral afeta decisao de consumo, expectativa de lancamento ou forma de acompanhamento do tema.'
      },
      {
        q: '### O que fazer agora?',
        a: 'A melhor estrategia e acompanhar fontes oficiais, comparar informacoes e aguardar confirmacoes antes de uma conclusao definitiva.'
      }
    ];

    if (domain === 'ia-dev') {
      generic[1].q = '### Qual o impacto para times de tecnologia?';
      generic[1].a = 'Times podem precisar rever arquitetura, custo, risco e governanca para adaptar o produto com seguranca.';
      generic[2].a = 'Mapeie dependencia tecnica, revise criterios de risco e execute um teste controlado antes de escalar a mudanca.';
    }

    if (domain === 'games') {
      generic[1].a = 'Para jogadores, o efeito aparece em escolha de plataforma, momento de compra e avaliacao de custo-beneficio.';
    }

    if (domain === 'seguranca') {
      generic[1].a = 'O impacto pode envolver risco de exposicao de dados e necessidade de atualizacao imediata para reduzir vulnerabilidade.';
      generic[2].a = 'Aplique recomendacoes oficiais, atualize sistemas e monitore sinais de exploracao ligados ao caso.';
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
    const domain = this.detectDomain(title, rawFormatted, topic);
    const summary = this.buildSummary(sentences, title);
    const intro = this.buildIntro(domain, title);
    const whyMatters = this.buildWhyMatters(domain, title);
    const practical = this.buildPracticalImpact(domain);
    const context = this.buildContext(domain, title);
    const checklist = this.buildDeveloperChecklist(domain);
    const watchList = this.buildWatchList(domain);
    const faq = this.buildFaq(domain, title);
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
      '## Checklist pratico',
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
    const domain = this.detectDomain(post.title, post.raw_content || post.content || '', post.topic);
    const intro = this.buildIntro(domain, post.title);
    const whyMatters = Utils.truncateText(String(aiDraft.why_matters || '').trim(), 700);
    const practical = this.normalizeAIActions(aiDraft.practical_actions);
    const context = this.buildContext(domain, post.title);
    const checklist = this.buildDeveloperChecklist(domain);
    const watchList = this.buildWatchList(domain);
    const faq = this.buildFaq(domain, post.title);
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
        '## Checklist pratico',
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
        risk_flags: aiDraft.risk_flags || [],
        domain
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
