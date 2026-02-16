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

const DOMAIN_URL_HINTS = {
  games: ['/voxel/', '/games/', '/jogos/'],
  entretenimento: ['/minha-serie/', '/cinema/', '/series/', '/entretenimento/'],
  negocios: ['/mercado/', '/negocios/'],
  hardware: ['/hardware/', '/tablet/', '/smartphone/', '/notebook/'],
  seguranca: ['/seguranca/', '/privacidade/']
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

  detectDomain(title, rawContent, sourceUrl = '') {
    const titleText = String(title || '').toLowerCase();
    const bodyText = Utils.stripHtml(rawContent || '').toLowerCase();
    const text = `${titleText} ${bodyText}`;
    const lowerUrl = String(sourceUrl || '').toLowerCase();

    for (const [domain, urlHints] of Object.entries(DOMAIN_URL_HINTS)) {
      if (urlHints.some((hint) => lowerUrl.includes(hint))) {
        return domain;
      }
    }

    let selected = 'geral';
    let score = 0;

    for (const [domain, keywords] of Object.entries(DOMAIN_RULES)) {
      const titleMatches = keywords.filter((keyword) => titleText.includes(keyword)).length;
      const bodyMatches = keywords.filter((keyword) => bodyText.includes(keyword)).length;
      const matches = (titleMatches * 3) + bodyMatches;
      if (matches > score) {
        score = matches;
        selected = domain;
      }
    }

    return selected;
  }

  detectPostType(title, rawContent, sourceUrl = '') {
    const text = `${String(title || '')} ${Utils.stripHtml(rawContent || '')}`.toLowerCase();
    const url = String(sourceUrl || '').toLowerCase();

    const isJobsUrl = /remotar|vagas|home-office|trabalho-remoto/.test(url);
    const jobsSignals = [
      'vagas',
      'trabalho remoto',
      'home office',
      'candidate',
      'candidatura',
      'remotar',
      'remoto internacional'
    ].filter((signal) => text.includes(signal)).length;

    if (isJobsUrl || jobsSignals >= 2) return 'job_roundup';
    return 'standard';
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
      'ia-dev': `A discussao em "${Utils.truncateText(title || 'esta noticia', 90)}" toca diretamente em decisao de produto, risco e ritmo de implementacao.`,
      games: `Em "${Utils.truncateText(title || 'esta noticia', 90)}", o contexto passa por disponibilidade em plataformas, janela de lancamento e recepcao da comunidade.`,
      entretenimento: `A pauta de "${Utils.truncateText(title || 'esta noticia', 90)}" ganha peso por combinar interesse de publico, relevancia cultural e timing de lancamento.`,
      seguranca: `O caso de "${Utils.truncateText(title || 'esta noticia', 90)}" exige atencao porque mistura risco real, resposta rapida e impacto em usuarios.`,
      hardware: `No tema "${Utils.truncateText(title || 'esta noticia', 90)}", o contexto passa por custo, desempenho e momento certo de compra.`,
      negocios: `A noticia "${Utils.truncateText(title || 'esta noticia', 90)}" se encaixa em movimento de mercado e pode influenciar decisao de carreira e estrategia.`,
      geral: `"${Utils.truncateText(title || 'esta noticia', 90)}" e um tema que vale acompanhar pelo efeito pratico no dia a dia de quem consome tecnologia.`
    };

    return contextByTopic[domain] || contextByTopic.geral;
  }

  buildIntro(domain, title) {
    const leadByTopic = {
      'ia-dev': `A noticia "${Utils.truncateText(title || 'esta pauta', 90)}" traz um sinal relevante para quem decide stack, risco e governanca em IA.`,
      games: `"${Utils.truncateText(title || 'esta pauta', 90)}" entra no radar de quem acompanha lancamentos e quer decidir melhor onde e quando jogar.`,
      entretenimento: `Em "${Utils.truncateText(title || 'esta pauta', 90)}", o ponto mais interessante e separar hype de informacao realmente util para o publico.`,
      seguranca: `"${Utils.truncateText(title || 'esta pauta', 90)}" merece leitura atenta porque combina risco imediato com possivel efeito em usuarios e servicos.`,
      hardware: `A pauta "${Utils.truncateText(title || 'esta pauta', 90)}" chama atencao por mexer com custo, desempenho e decisao de compra.`,
      negocios: `"${Utils.truncateText(title || 'esta pauta', 90)}" aponta um movimento com impacto pratico para carreira, mercado e estrategia.`,
      geral: `"${Utils.truncateText(title || 'esta pauta', 90)}" e uma noticia que vale ler com foco no que muda de forma concreta para o leitor.`
    };

    return leadByTopic[domain] || leadByTopic.geral;
  }

  buildInsights(domain, title) {
    const insights = {
      'ia-dev': 'O principal insight e que o custo de adotar cedo pode ser menor que o custo de corrigir tarde, especialmente quando risco e compliance entram na conta.',
      games: 'O insight pratico e simples: quem compara plataforma, desempenho inicial e preco de lancamento costuma errar menos na compra.',
      entretenimento: 'O ganho para o leitor esta em distinguir o que e confirmacao oficial do que e apenas repercussao de rede social.',
      seguranca: 'O ponto central e que resposta rapida reduz dano: atraso de poucas horas pode ampliar impacto tecnico e reputacional.',
      hardware: 'O insight mais util e fugir de decisao por hype: especificacao isolada sem contexto de uso quase sempre leva a compra ruim.',
      negocios: 'A leitura mais valiosa e observar como essa pauta mexe em oferta, demanda e janela de oportunidade para profissionais e empresas.',
      geral: 'A leitura mais util e transformar manchete em criterio pratico: o que muda agora, o que pode mudar depois e o que ainda precisa de confirmacao.'
    };

    return `${insights[domain] || insights.geral} Em "${Utils.truncateText(title || 'esta noticia', 90)}", esse filtro ajuda a tomar decisoes mais conscientes.`;
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

  buildJobRoundupHighlights(rawFormatted) {
    const text = Utils.stripHtml(rawFormatted || '').toLowerCase();
    const categoryMap = [
      ['administrativa', 'Area administrativa e operacional'],
      ['marketing', 'Funcoes de marketing e crescimento'],
      ['vendas', 'Posicoes em vendas e relacionamento comercial'],
      ['design', 'Oportunidades em design de produto e experiencia'],
      ['produto', 'Vagas ligadas a produto e gestao de roadmap'],
      ['ti', 'Posicoes tecnicas em TI e engenharia de software'],
      ['engenheiro', 'Cargos para engenheiros e perfis tecnicos'],
      ['backend', 'Vagas para backend e infraestrutura de aplicacoes']
    ];

    const picks = [];
    for (const [keyword, label] of categoryMap) {
      if (text.includes(keyword)) picks.push(`- ${label}.`);
      if (picks.length >= 8) break;
    }

    if (picks.length === 0) {
      return [
        '- A lista inclui vagas internacionais com trabalho remoto para brasileiros.',
        '- Ha oportunidades em diferentes niveis de senioridade e especialidades.',
        '- A candidatura costuma ocorrer por links diretos na plataforma indicada na fonte.'
      ].join('\n');
    }

    return picks.slice(0, 8).join('\n');
  }

  buildJobRoundupContent(post, title, rawFormatted, primarySource, summaryBullets = null) {
    const summary = Array.isArray(summaryBullets) && summaryBullets.length >= 3
      ? summaryBullets
      : this.buildSummary(this.sentenceCandidates(rawFormatted), title);

    const intro = [
      `Saiu uma nova rodada de vagas em "${Utils.truncateText(title || 'trabalho remoto internacional', 90)}", com foco em oportunidades remotas e candidatura online.`,
      'A leitura vale para quem quer filtrar melhor as opcoes, priorizar as vagas com mais aderencia e se candidatar com mais qualidade.'
    ].join(' ');

    const howTo = [
      '- Abra a fonte primaria e filtre primeiro por area de atuacao e senioridade.',
      '- Priorize vagas com requisitos que voce ja atende hoje para ganhar velocidade de candidatura.',
      '- Ajuste CV, LinkedIn e portfolio para o contexto internacional antes de aplicar.',
      '- Verifique idioma exigido, fuso horario e formato de contrato antes de enviar o perfil.',
      '- Organize um rastreador simples com vaga, data de envio e status do processo.'
    ].join('\n');

    const checklist = [
      '- CV em ingles com resultados objetivos e links validos.',
      '- LinkedIn atualizado com resumo profissional e stack atual.',
      '- Portfolio com 2 a 4 projetos relevantes para a vaga.',
      '- Carta curta de apresentacao adaptada para cada candidatura.',
      '- Confirmacao de idioma, fuso e disponibilidade para entrevistas.',
      '- Validacao do tipo de contrato (contractor, PJ, CLT local ou equivalente).',
      '- Planejamento de recebimento internacional (moeda, taxas e meios de pagamento).',
      '- Checagem basica da empresa para evitar vagas falsas ou desatualizadas.'
    ].join('\n');

    const watch = [
      '- Novas listas de vagas e atualizacoes de links de candidatura.',
      '- Posicoes que costumam fechar rapido nas primeiras 48 a 72 horas.',
      '- Mudancas de requisitos de idioma, senioridade ou localidade.',
      '- Novas vagas em areas com maior demanda para remoto internacional.'
    ].join('\n');

    const faq = [
      '### Preciso falar ingles para me candidatar?',
      'Na maioria das vagas internacionais, sim. Mesmo quando a vaga aceita portugues, ingles funcional costuma ser diferencial no processo.',
      '',
      '### Fuso horario realmente importa?',
      'Importa bastante. Muitas empresas pedem sobreposicao minima de horario para reunioes e colaboracao com o time.',
      '',
      '### Como receber em dolar ou euro trabalhando do Brasil?',
      'Depende do tipo de contrato e da empresa. O essencial e confirmar meio de pagamento, taxas e obrigacoes fiscais antes de aceitar a proposta.',
      '',
      '### Como evitar vagas falsas?',
      'Prefira links oficiais, valide dominio da empresa, desconfie de pedidos financeiros e confirme a vaga em canais institucionais.'
    ].join('\n');

    return [
      intro,
      '',
      '## Resumo em 3 bullets',
      ...summary,
      '',
      '## Como usar esta lista',
      howTo,
      '',
      '## Destaques rapidos',
      this.buildJobRoundupHighlights(rawFormatted),
      '',
      '## Checklist de candidatura',
      checklist,
      '',
      '## O que observar nos proximos dias',
      watch,
      '',
      '## FAQ',
      faq,
      '',
      '## Fonte e transparencia',
      this.buildSourceTransparency(post, primarySource),
      '',
      '## Por que isso importa',
      'Quando a curadoria de vagas vem organizada, o candidato ganha tempo, evita candidatura no escuro e aumenta a chance de entrar em processos com melhor aderencia ao seu perfil.'
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
      list.push('Monitorar atualizacoes e adaptar os proximos passos com base no impacto para o publico.');
    }
    return list.slice(0, 3).map((line) => `- ${Utils.truncateText(line, 140)}`).join('\n');
  }

  hasForcedIABias(text) {
    const value = String(text || '').toLowerCase();
    const signals = [
      'governanca de implementacao',
      'provedor de modelo',
      'modelos generativos',
      'backlog tecnico',
      'times que usam ia',
      'arquitetura de ia'
    ];
    return signals.some((signal) => value.includes(signal));
  }

  pickWhyMatters(domain, aiWhyMatters, title) {
    const candidate = Utils.truncateText(String(aiWhyMatters || '').trim(), 700);
    if (!candidate) return this.buildWhyMatters(domain, title);
    if (domain !== 'ia-dev' && this.hasForcedIABias(candidate)) {
      return this.buildWhyMatters(domain, title);
    }
    return candidate;
  }

  pickPractical(domain, aiActions) {
    const candidate = this.normalizeAIActions(aiActions);
    if (!candidate) return this.buildPracticalImpact(domain);
    if (domain !== 'ia-dev' && this.hasForcedIABias(candidate)) {
      return this.buildPracticalImpact(domain);
    }
    return candidate;
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

  buildHeuristicContent(post, topic, title, rawFormatted, primarySource, postType = 'standard') {
    if (postType === 'job_roundup') {
      return this.buildJobRoundupContent(post, title, rawFormatted, primarySource);
    }

    const sentences = this.sentenceCandidates(rawFormatted);
    const domain = this.detectDomain(title, rawFormatted, post.original_url || post.source_url || '');
    const summary = this.buildSummary(sentences, title);
    const intro = this.buildIntro(domain, title);
    const whyMatters = this.buildWhyMatters(domain, title);
    const practical = this.buildPracticalImpact(domain);
    const context = this.buildContext(domain, title);
    const watchList = this.buildWatchList(domain);
    const insights = this.buildInsights(domain, title);
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
      '## Insights e implicacoes',
      insights,
      '',
      '## O que fazer agora',
      practical,
      '',
      '## O que vale acompanhar',
      watchList,
      '',
      '## Fonte e transparencia',
      sourceTransparency,
      '',
      '## Por que isso importa',
      whyMatters
    ].join('\n');
  }

  buildAIContent(post, aiDraft, primarySource, postType = 'standard') {
    if (postType === 'job_roundup') {
      const summary = this.normalizeAIBullets(aiDraft.summary_bullets);
      return {
        content: this.buildJobRoundupContent(post, post.title, post.raw_content || post.content || '', primarySource, summary),
        primarySource: primarySource,
        aiMetadata: {
          model_used: aiDraft.model_used || '',
          latency_ms: aiDraft.latency_ms || null,
          fallback_used: Boolean(aiDraft.fallback_used),
          editorial_confidence: aiDraft.editorial_confidence || 0,
          risk_flags: aiDraft.risk_flags || [],
          domain: 'negocios'
        }
      };
    }

    const summary = this.normalizeAIBullets(aiDraft.summary_bullets);
    const domain = this.detectDomain(post.title, post.raw_content || post.content || '', post.original_url || post.source_url || '');
    const intro = this.buildIntro(domain, post.title);
    const whyMatters = this.pickWhyMatters(domain, aiDraft.why_matters, post.title);
    const practical = this.pickPractical(domain, aiDraft.practical_actions);
    const context = this.buildContext(domain, post.title);
    const watchList = this.buildWatchList(domain);
    const insights = this.buildInsights(domain, post.title);
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
        '## Insights e implicacoes',
        insights,
        '',
        '## O que fazer agora',
        practical,
        '',
        '## O que vale acompanhar',
        watchList,
        '',
        '## Fonte e transparencia',
        sourceTransparency,
        '',
        '## Por que isso importa',
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

    let { topic, subtopic } = this.detectTopic(post.title, rawFormatted);
    const domain = this.detectDomain(post.title, rawFormatted, post.original_url || post.source_url || '');
    const postType = this.detectPostType(post.title, rawFormatted, post.original_url || post.source_url || '');
    if (domain !== 'ia-dev') {
      topic = 'geral';
      subtopic = 'geral';
    }
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
      domain,
      post_type: postType,
      raw_content: Utils.stripHtml(rawFormatted)
    });

    if (aiDraft) {
      const aiOutput = this.buildAIContent({ ...post, topic, domain }, aiDraft, primarySource, postType);
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
      content = this.buildHeuristicContent(post, topic, post.title, rawFormatted, primarySource, postType);
      editorialMode = 'heuristic';
    }

    return {
      blocked: false,
      content,
      raw_formatted: rawFormatted,
      domain,
      post_type: postType,
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
