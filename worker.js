const fs = require('fs').promises;
const path = require('path');
const config = require('./config');
const logger = require('./logger');
const Utils = require('./utils');
const git = require('./git');
const editorial = require('./pipeline/editorial');
const quality = require('./pipeline/quality');

const g1 = require('./sources/g1');
const tecnoblog = require('./sources/tecnoblog');
const canaltech = require('./sources/canaltech');
const tecmundo = require('./sources/tecmundo');
const uol = require('./sources/uol');

class NewsWorker {
  constructor(options = {}) {
    this.dryRun = Boolean(options.dryRun);
    this.sources = [];

    if (config.SOURCES.G1.enabled) this.sources.push(g1);
    if (config.SOURCES.TECNOBLOG.enabled) this.sources.push(tecnoblog);
    if (config.SOURCES.CANALTECH.enabled) this.sources.push(canaltech);
    if (config.SOURCES.TECMUNDO.enabled) this.sources.push(tecmundo);
    if (config.SOURCES.UOL.enabled) this.sources.push(uol);

    this.slugs = new Set();
    this.urls = new Set();
    this.postIndex = [];
    this.publishedPosts = [];
  }

  escapeYaml(value) {
    return String(value ?? '')
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\r?\n/g, ' ')
      .trim();
  }

  async init() {
    await logger.init();
    await git.init();
    if (this.dryRun) {
      logger.info('Dry-run ativo: pull desabilitado');
    } else {
      await git.pull();
    }
    await fs.mkdir(config.REPORT_PATH, { recursive: true });
    await this.loadExistingPosts();
    logger.info('Iniciado');
  }

  clampTextRange(text, min, max) {
    const normalized = String(text || '').replace(/\s+/g, ' ').trim();
    if (!normalized) return '';
    if (normalized.length > max) return normalized.slice(0, max).trim();
    if (normalized.length >= min) return normalized;

    const filler = ' Saiba o que muda na pratica, riscos e proximos passos para acompanhar o caso.';
    return (normalized + filler).slice(0, max).trim();
  }

  buildSeoMetadata(post) {
    const canonicalUrl = `https://news.juliano340.com/posts/${post.slug}`;
    const baseTitle = String(post.title || '').trim();
    const seoTitle = this.clampTextRange(baseTitle, 45, 62);

    const summaryText = String(post.summary_text || '').replace(/\s+/g, ' ').trim();
    const descriptionSeed = summaryText || `${baseTitle} com contexto, impacto pratico e pontos de acompanhamento.`;
    const metaDescription = this.clampTextRange(descriptionSeed, 140, 160);

    return {
      seo_title: seoTitle,
      meta_description: metaDescription,
      canonical_url: canonicalUrl,
      og_type: 'article',
      schema_type: 'NewsArticle',
      schema_headline: baseTitle,
      schema_description: metaDescription,
      schema_date_published: post.date,
      schema_date_modified: post.date,
      schema_author_name: 'News juliano340',
      schema_publisher_name: 'News juliano340',
      schema_publisher_logo: 'https://news.juliano340.com/logo.png',
      schema_main_entity_of_page: canonicalUrl,
      breadcrumb_home: 'https://news.juliano340.com/',
      breadcrumb_posts: 'https://news.juliano340.com/posts',
      breadcrumb_current: canonicalUrl
    };
  }

  validatePostMetadata(post) {
    const checks = [];
    const fail = (id, reason, details = {}) => checks.push({ id, status: 'FAIL', level: 'BLOCK', reason, ...details });
    const pass = (id) => checks.push({ id, status: 'PASS', level: 'BLOCK' });

    const requiredFields = ['title', 'slug', 'date', 'source', 'original_url', 'primary_source', 'content', 'meta_description', 'canonical_url'];
    for (const field of requiredFields) {
      const value = String(post[field] || '').trim();
      if (!value) fail(`required_${field}`, `${field}_ausente`);
      else pass(`required_${field}`);
    }

    if (/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(String(post.slug || '').trim())) pass('slug_format');
    else fail('slug_format', 'slug_invalido');

    if (/^https?:\/\//i.test(String(post.original_url || ''))) pass('original_url_format');
    else fail('original_url_format', 'original_url_invalida');

    if (String(post.canonical_url || '') === `https://news.juliano340.com/posts/${post.slug}`) pass('canonical_matches_slug');
    else fail('canonical_matches_slug', 'canonical_inconsistente');

    const descLen = String(post.meta_description || '').length;
    if (descLen >= 140 && descLen <= 160) pass('meta_description_length');
    else fail('meta_description_length', 'meta_description_fora_faixa', { length: descLen, min: 140, max: 160 });

    const hasSchema =
      String(post.schema_type || '') === 'NewsArticle' &&
      String(post.schema_headline || '').trim() &&
      String(post.schema_date_published || '').trim() &&
      String(post.schema_main_entity_of_page || '').trim();

    if (hasSchema) pass('schema_min_fields');
    else fail('schema_min_fields', 'schema_campos_obrigatorios_ausentes');

    const failures = checks.filter((check) => check.status === 'FAIL');
    return {
      status: failures.length > 0 ? 'BLOCK' : 'PASS',
      checks,
      warnings: [],
      errors: failures.map((check) => check.reason),
      score: failures.length > 0 ? Math.max(0, 100 - failures.length * 10) : 100
    };
  }

  async loadExistingPosts() {
    try {
      const files = await fs.readdir(config.POSTS_PATH);

      for (const file of files) {
        if (!file.endsWith('.md')) continue;

        const content = await fs.readFile(path.join(config.POSTS_PATH, file), 'utf8');
        const slugMatch = content.match(/slug:\s*"([^"]+)"/);
        const urlMatch = content.match(/original_url:\s*"([^"]+)"/);
        const titleMatch = content.match(/title:\s*"([^"]+)"/);
        const topicMatch = content.match(/topic:\s*"([^"]*)"/);
        const dateMatch = content.match(/date:\s*"([^"]+)"/);
        const tagsMatch = content.match(/tags:\s*\[([^\]]*)\]/);

        if (slugMatch) this.slugs.add(slugMatch[1]);
        if (urlMatch) this.urls.add(urlMatch[1]);
        if (titleMatch) this.urls.add(Utils.generateSlug(titleMatch[1]));

        if (slugMatch && titleMatch) {
          const tags = tagsMatch
            ? tagsMatch[1]
              .split(',')
              .map((tag) => tag.replace(/^\s*"|"\s*$/g, '').trim())
              .filter(Boolean)
            : [];

          this.postIndex.push({
            slug: slugMatch[1],
            title: titleMatch[1],
            topic: topicMatch ? topicMatch[1] : '',
            date: dateMatch ? dateMatch[1] : '',
            tags
          });
        }
      }
    } catch (error) {
      logger.error('L', { error: error.message });
    }
  }

  getRelatedLinks(post, max = 3) {
    const postTags = new Set(post.tags || []);
    const currentDate = post.date ? new Date(post.date) : new Date();

    const scored = this.postIndex
      .filter((item) => item.slug !== post.slug)
      .map((item) => {
        let score = 0;
        if (item.topic && post.topic && item.topic === post.topic) score += 5;

        const overlap = (item.tags || []).filter((tag) => postTags.has(tag)).length;
        score += overlap * 2;

        if (item.date) {
          const diff = Math.abs(currentDate.getTime() - new Date(item.date).getTime());
          const days = diff / (1000 * 60 * 60 * 24);
          score += Math.max(0, 2 - Math.floor(days / 7));
        }

        return { ...item, score };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, max);

    return scored;
  }

  appendRelatedLinks(content, relatedLinks) {
    if (!relatedLinks || relatedLinks.length === 0) return content;

    const uniqueLinks = relatedLinks.filter((item) => !content.includes(`(/posts/${item.slug})`));
    if (uniqueLinks.length === 0) return content;

    const section = [
      '## Leitura relacionada',
      ...uniqueLinks.map((item) => `- [${item.title}](/posts/${item.slug})`)
    ].join('\n');

    return `${content.trim()}\n\n${section}\n`;
  }

  async saveQualityReport(slug, report) {
    if (!slug || !report) return;
    const safeSlug = String(slug).trim();
    if (!safeSlug) return;

    const filePath = path.join(config.REPORT_PATH, `${safeSlug}.json`);
    const payload = {
      slug: safeSlug,
      generated_at: new Date().toISOString(),
      ...report
    };

    if (this.dryRun) {
      logger.info('Dry-run: relatorio nao gravado', { slug: safeSlug, path: filePath });
      return;
    }

    await fs.writeFile(filePath, JSON.stringify(payload, null, 2), 'utf8');
  }

  isDuplicate(post) {
    return (
      this.slugs.has(post.slug) ||
      this.urls.has(post.original_url) ||
      this.urls.has(Utils.generateSlug(post.title))
    );
  }

  isTooOld(post) {
    const MAX_AGE_DAYS = 7;
    const postDate = new Date(post.date);
    const now = new Date();
    const diffTime = Math.abs(now - postDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > MAX_AGE_DAYS;
  }

  buildPostContent(post) {
    const tags = (post.tags || []).map((tag) => `"${this.escapeYaml(tag)}"`).join(',');
    const seoTitle = post.seo_title || Utils.truncateText(post.title || '', 62);
    const description = post.meta_description || Utils.truncateText((post.summary_text || post.title || '').trim(), 155);
    const canonicalUrl = post.canonical_url || `https://news.juliano340.com/posts/${post.slug}`;
    const dateValue = this.escapeYaml(post.date);

    return `---\n` +
      `title: "${this.escapeYaml(post.title)}"\n` +
      `seo_title: "${this.escapeYaml(seoTitle)}"\n` +
      `meta_description: "${this.escapeYaml(description)}"\n` +
      `canonical_url: "${this.escapeYaml(canonicalUrl)}"\n` +
      `og_type: "${this.escapeYaml(post.og_type || 'article')}"\n` +
      `date: "${dateValue}"\n` +
      `published_at: "${dateValue}"\n` +
      `modified_at: "${dateValue}"\n` +
      `tags: [${tags}]\n` +
      `source: "${this.escapeYaml(post.source)}"\n` +
      `original_url: "${this.escapeYaml(post.original_url)}"\n` +
      `image_url: "${this.escapeYaml(post.image_url || '')}"\n` +
      `image: "${this.escapeYaml(post.image_url || '')}"\n` +
      `slug: "${this.escapeYaml(post.slug)}"\n` +
      `topic: "${this.escapeYaml(post.topic || '')}"\n` +
      `subtopic: "${this.escapeYaml(post.subtopic || '')}"\n` +
      `content_kind: "${this.escapeYaml(post.content_kind || 'news')}"\n` +
      `editorial_score: "${this.escapeYaml(post.editorial_score || '')}"\n` +
      `editorial_mode: "${this.escapeYaml(post.editorial_mode || '')}"\n` +
      `ai_model: "${this.escapeYaml(post.ai_model || '')}"\n` +
      `ai_confidence: "${this.escapeYaml(post.ai_confidence || '')}"\n` +
      `primary_source: "${this.escapeYaml(post.primary_source || post.original_url || '')}"\n` +
      `schema_type: "${this.escapeYaml(post.schema_type || 'NewsArticle')}"\n` +
      `schema_headline: "${this.escapeYaml(post.schema_headline || post.title || '')}"\n` +
      `schema_description: "${this.escapeYaml(post.schema_description || description)}"\n` +
      `schema_date_published: "${this.escapeYaml(post.schema_date_published || post.date || '')}"\n` +
      `schema_date_modified: "${this.escapeYaml(post.schema_date_modified || post.date || '')}"\n` +
      `schema_author_name: "${this.escapeYaml(post.schema_author_name || 'News juliano340')}"\n` +
      `schema_publisher_name: "${this.escapeYaml(post.schema_publisher_name || 'News juliano340')}"\n` +
      `schema_publisher_logo: "${this.escapeYaml(post.schema_publisher_logo || 'https://news.juliano340.com/logo.png')}"\n` +
      `schema_main_entity_of_page: "${this.escapeYaml(post.schema_main_entity_of_page || canonicalUrl)}"\n` +
      `breadcrumb_home: "${this.escapeYaml(post.breadcrumb_home || 'https://news.juliano340.com/')}"\n` +
      `breadcrumb_posts: "${this.escapeYaml(post.breadcrumb_posts || 'https://news.juliano340.com/posts')}"\n` +
      `breadcrumb_current: "${this.escapeYaml(post.breadcrumb_current || canonicalUrl)}"\n` +
      `lang: "pt-BR"\n` +
      `is_ai_curated: "true"\n` +
      `---\n\n` +
      `${post.content || ''}\n`;
  }

  async savePost(post) {
    if (this.isDuplicate(post)) {
      logger.skip('Existe: ' + post.title);
      return false;
    }

    if (this.isTooOld(post)) {
      logger.skip('Antigo: ' + post.title);
      return false;
    }

    const fileName = Utils.generateFileName(post.slug);
    const filePath = path.join(config.POSTS_PATH, fileName);

    if (this.dryRun) {
      logger.info('Dry-run: post nao gravado', { title: post.title, slug: post.slug, file: filePath });

      this.slugs.add(post.slug);
      this.urls.add(post.original_url);
      this.postIndex.push({
        slug: post.slug,
        title: post.title,
        topic: post.topic || '',
        date: post.date,
        tags: post.tags || []
      });
      this.publishedPosts.push(post);

      return true;
    }

    await fs.writeFile(filePath, this.buildPostContent(post), 'utf8');

    this.slugs.add(post.slug);
    this.urls.add(post.original_url);
    this.postIndex.push({
      slug: post.slug,
      title: post.title,
      topic: post.topic || '',
      date: post.date,
      tags: post.tags || []
    });
    this.publishedPosts.push(post);

    logger.ok('Salvo: ' + post.title);
    return true;
  }

  async applyEditorialPolicy(post) {
    if (!config.EDITORIAL_ENABLED) {
      return {
        accepted: true,
        post,
        quality: null,
        report: {
          status: 'PASS',
          checks: [
            {
              id: 'editorial_disabled',
              status: 'PASS',
              level: 'WARN',
              reason: 'politica_editorial_desativada'
            }
          ],
          warnings: ['politica_editorial_desativada'],
          errors: [],
          score: 100
        }
      };
    }

    const curated = await editorial.compose(post);

    if (curated.blocked) {
      return {
        accepted: false,
        deferred: true,
        reason: curated.block_reason || 'ai_generation_failed',
        quality: null,
        post,
        report: {
          status: 'BLOCK',
          checks: [
            {
              id: 'ai_editorial_generation',
              status: 'FAIL',
              level: 'BLOCK',
              reason: curated.block_reason || 'ai_generation_failed'
            }
          ],
          warnings: [],
          errors: [curated.block_reason || 'ai_generation_failed'],
          score: 0
        }
      };
    }

    const relatedLinks = this.getRelatedLinks({ ...post, topic: curated.topic }, 3);
    const curatedWithLinks = {
      ...curated,
      content: this.appendRelatedLinks(curated.content, relatedLinks)
    };

    const qualityCheck = quality.evaluate(post, curatedWithLinks);

    if (qualityCheck.status === 'BLOCK') {
      return {
        accepted: false,
        post,
        quality: qualityCheck,
        report: {
          status: qualityCheck.status,
          checks: qualityCheck.checks,
          warnings: qualityCheck.warnings,
          errors: qualityCheck.reasons,
          score: qualityCheck.score
        }
      };
    }

    return {
      accepted: true,
      quality: qualityCheck,
      report: {
        status: qualityCheck.status,
        checks: qualityCheck.checks,
        warnings: qualityCheck.warnings,
        errors: qualityCheck.reasons,
        score: qualityCheck.score
      },
      post: {
        ...post,
        summary_text: quality.sectionText(curatedWithLinks.content, '## Resumo em 3 bullets').replace(/^\s*-\s+/gm, '').trim(),
        content: curatedWithLinks.content,
        topic: curated.topic,
        subtopic: curated.subtopic,
        content_kind: curated.content_kind,
        primary_source: curated.primary_source,
        editorial_score: qualityCheck.score,
        editorial_mode: curated.editorial_mode,
        ai_model: curated.ai_metadata?.model_used || '',
        ai_confidence: curated.ai_metadata?.editorial_confidence || null
      }
    };
  }

  async generateDigests() {
    if (this.publishedPosts.length === 0) return;

    if (this.dryRun) {
      logger.info('Dry-run: digest nao gravado', { total: this.publishedPosts.length });
      return;
    }

    await fs.mkdir(config.DIGEST_PATH, { recursive: true });

    const now = new Date();
    const cutoff24h = now.getTime() - (24 * 60 * 60 * 1000);
    const digest24h = this.publishedPosts
      .filter((post) => new Date(post.date).getTime() >= cutoff24h)
      .map((post) => ({
        title: post.title,
        slug: post.slug,
        topic: post.topic || '',
        source: post.source,
        date: post.date,
        editorial_score: post.editorial_score || null,
        original_url: post.original_url
      }));

    const digest24hPath = path.join(config.DIGEST_PATH, 'digest-24h.json');
    await fs.writeFile(
      digest24hPath,
      JSON.stringify(
        {
          generated_at: now.toISOString(),
          niche: config.EDITORIAL_NICHE,
          total: digest24h.length,
          posts: digest24h
        },
        null,
        2
      ),
      'utf8'
    );

    const weeklyTitle = now.toISOString().slice(0, 10);
    const weeklyPath = path.join(config.DIGEST_PATH, 'weekly-ia-dev.md');
    const weeklyContent = [
      `# Weekly IA para Devs - ${weeklyTitle}`,
      '',
      `Gerado em ${now.toISOString()}`,
      '',
      ...this.publishedPosts.slice(0, 25).map((post) => (
        `- [${post.title}](${post.original_url}) | topico: ${post.topic || 'n/a'} | score: ${post.editorial_score || 'n/a'}`
      ))
    ].join('\n');

    await fs.writeFile(weeklyPath, weeklyContent + '\n', 'utf8');
    logger.ok('Digests gerados', { digest24h: digest24hPath, weekly: weeklyPath });
  }

  async run() {
    const start = Date.now();
    let novos = 0;
    let pulados = 0;
    let erros = 0;
    let descartados = 0;
    let adiados = 0;
    let blockedSemantic = 0;

    logger.info('Iniciando...');
    if (this.dryRun) {
      logger.info('Modo dry-run: sem gravacao, commit ou push');
    }

    for (const source of this.sources) {
      try {
        const posts = await source.fetch();

        for (const post of posts) {
          try {
            if (this.isDuplicate(post)) {
              logger.skip('Existe: ' + post.title);
              pulados += 1;
              continue;
            }

            if (this.isTooOld(post)) {
              logger.skip('Antigo: ' + post.title);
              pulados += 1;
              continue;
            }

            const policyResult = await this.applyEditorialPolicy(post);
            const reportSlug = policyResult.post?.slug || post.slug || Utils.generateSlug(post.title);
            const enrichedPost = policyResult.accepted
              ? {
                ...policyResult.post,
                ...this.buildSeoMetadata(policyResult.post)
              }
              : policyResult.post;

            let metadataReport = null;
            if (policyResult.accepted) {
              metadataReport = this.validatePostMetadata(enrichedPost);
            }

            const finalReport = {
              ...(policyResult.report || {
                status: 'PASS',
                checks: [],
                warnings: [],
                errors: [],
                score: 100
              }),
              metadata: metadataReport
            };

            await this.saveQualityReport(reportSlug, finalReport);

            if (metadataReport && metadataReport.status === 'BLOCK') {
              descartados += 1;
              logger.skip('Descartado por metadados SEO: ' + post.title, {
                status: metadataReport.status,
                errors: metadataReport.errors,
                failed_checks: metadataReport.checks.filter((check) => check.status === 'FAIL').map((check) => check.id)
              });
              continue;
            }

            if (!policyResult.accepted) {
              if (policyResult.deferred) {
                adiados += 1;
                logger.skip('Adiado aguardando IA: ' + post.title, {
                  reason: policyResult.reason
                });
                continue;
              }

              descartados += 1;
              const failedChecks = (policyResult.quality?.checks || [])
                .filter((check) => check.status === 'FAIL' && check.level === 'BLOCK')
                .map((check) => check.id);
              if (failedChecks.includes('semantic_alignment')) blockedSemantic += 1;
              logger.skip('Descartado por qualidade: ' + post.title, {
                status: policyResult.quality?.status || 'BLOCK',
                score: policyResult.quality?.score || 0,
                errors: policyResult.quality?.reasons || [policyResult.reason || 'descartado'],
                failed_checks: failedChecks
              });
              continue;
            }

            if (policyResult.quality) {
              logger.debug('Aprovado no quality gate: ' + post.title, {
                score: policyResult.quality.score,
                threshold: policyResult.quality.threshold,
                checks: policyResult.quality.checks,
                editorial_mode: enrichedPost.editorial_mode,
                ai_model: enrichedPost.ai_model,
                ai_confidence: enrichedPost.ai_confidence
              });
            }

            if (await this.savePost(enrichedPost)) novos += 1;
            else pulados += 1;
          } catch (error) {
            logger.error('P', { error: error.message });
            erros += 1;
          }
        }

        await Utils.sleep(1000);
      } catch (error) {
        logger.error('F ' + source.name, { error: error.message });
        erros += 1;
      }
    }

    await this.generateDigests();

    if (novos > 0 && !this.dryRun) {
      await git.commitAndPush('feat: ' + novos + ' posts');
    } else if (novos > 0 && this.dryRun) {
      logger.info('Dry-run: commit/push ignorado', { novos });
    }

    logger.ok('Fim em ' + ((Date.now() - start) / 1000).toFixed(1) + 's', {
      novos,
      pulados,
      descartados,
      adiados,
      erros,
      blocked_semantic_alignment: blockedSemantic
    });
  }
}

if (require.main === module) {
  const dryRun = process.argv.includes('--dry-run');
  const worker = new NewsWorker({ dryRun });
  worker
    .init()
    .then(() => worker.run())
    .catch((error) => {
      logger.error('Fatal', { error: error.message });
      process.exit(1);
    });
}

module.exports = NewsWorker;
