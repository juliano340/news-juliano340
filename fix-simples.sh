#!/bin/bash
cd ~/projetos/news-worker

echo "1/5 - Config..."
cat > config.js << 'CEOF'
require('dotenv').config();
const path = require('path');
module.exports = {
  CRON_FREQUENCY: '0 */2 * * *', USE_AI: false, OPENROUTER_KEY: '',
  REPO_PATH: path.resolve(__dirname), POSTS_PATH: path.resolve(__dirname, 'content/posts'),
  GIT_USER_NAME: 'News Worker', GIT_USER_EMAIL: 'worker@juliano340.com',
  MAX_POSTS_PER_SOURCE: 10, REQUEST_TIMEOUT: 30000, LOG_LEVEL: 'info',
  LOG_FILE: path.resolve(__dirname, 'logs/news-worker.log'),
  SOURCES: {
    G1: { enabled: true, url: 'https://g1.globo.com/dynamo/tecnologia/rss2.xml' },
    TECNOBLOG: { enabled: true, url: 'https://tecnoblog.net/feed/' },
    CANALTECH: { enabled: true, url: 'https://feeds.feedburner.com/canaltech/' },
    TECMUNDO: { enabled: true, url: 'https://www.tecmundo.com.br/feed/' },
    BOREDPANDA: { enabled: true, url: 'https://www.boredpanda.com/feed/' }
  }
};
CEOF

echo "2/5 - Tecnoblog..."
cat > sources/tecnoblog.js << 'TOF'
const Parser = require('rss-parser');
const config = require('../config');
const logger = require('../logger');
const Utils = require('../utils');
class T { constructor(){this.name='Tecnoblog';this.p=new Parser({timeout:config.REQUEST_TIMEOUT});}
async fetch(){try{logger.info('B');const f=await this.p.parseURL(config.SOURCES.TECNOBLOG.url);return f.items.slice(0,config.MAX_POSTS_PER_SOURCE).map(i=>({title:Utils.normalizeEncoding(i.title),date:Utils.formatDate(i.pubDate||i.isoDate),source:this.name,original_url:i.link,slug:Utils.generateSlug(i.title),content:Utils.truncateText(Utils.normalizeEncoding(Utils.stripHtml(i['content:encoded']||i.content||i.summary||'')),800),tags:Utils.extractTags(i.title,i.title,this.name)}));}catch(e){logger.error('E',{error:e.message});return[];}}}
module.exports=new T();
TOF

echo "3/5 - Canaltech..."
cat > sources/canaltech.js << 'COF'
const Parser=require('rss-parser');const config=require('../config');const logger=require('../logger');const Utils=require('../utils');
class C{constructor(){this.name='Canaltech';this.p=new Parser({timeout:config.REQUEST_TIMEOUT});}
async fetch(){try{logger.info('B');const f=await this.p.parseURL(config.SOURCES.CANALTECH.url);return f.items.slice(0,config.MAX_POSTS_PER_SOURCE).map(i=>({title:Utils.normalizeEncoding(i.title),date:Utils.formatDate(i.pubDate||i.isoDate),source:this.name,original_url:i.link,slug:Utils.generateSlug(i.title),content:Utils.truncateText(Utils.normalizeEncoding(Utils.stripHtml(i['content:encoded']||i.content||i.summary||'')),800),tags:Utils.extractTags(i.title,i.title,this.name)}));}catch(e){logger.error('E',{error:e.message});return[];}}}
module.exports=new C();
COF

echo "4/5 - BoredPanda..."
cat > sources/boredpanda.js << 'BOF'
const Parser=require('rss-parser');const config=require('../config');const logger=require('../logger');const Utils=require('../utils');
class B{constructor(){this.name='Bored Panda';this.p=new Parser({timeout:config.REQUEST_TIMEOUT});}
async fetch(){try{logger.info('B');const f=await this.p.parseURL(config.SOURCES.BOREDPANDA.url);return f.items.slice(0,config.MAX_POSTS_PER_SOURCE).map(i=>({title:Utils.normalizeEncoding(i.title),date:Utils.formatDate(i.pubDate||i.isoDate),source:this.name,original_url:i.link,slug:Utils.generateSlug(i.title),content:Utils.truncateText(Utils.normalizeEncoding(Utils.stripHtml(i['content:encoded']||i.content||i.summary||'')),800),tags:Utils.extractTags(i.title,i.title,this.name)}));}catch(e){logger.error('E',{error:e.message});return[];}}}
module.exports=new B();
BOF

echo "5/5 - Worker..."
cat > worker.js << 'WOF'
const fs=require('fs').promises;const path=require('path');const config=require('./config');const logger=require('./logger');const Utils=require('./utils');const git=require('./git');
const g1=require('./sources/g1');const tecnoblog=require('./sources/tecnoblog');const canaltech=require('./sources/canaltech');const tecmundo=require('./sources/tecmundo');const boredpanda=require('./sources/boredpanda');
class NW{constructor(){this.s=[];if(config.SOURCES.G1.enabled)this.s.push(g1);if(config.SOURCES.TECNOBLOG.enabled)this.s.push(tecnoblog);if(config.SOURCES.CANALTECH.enabled)this.s.push(canaltech);if(config.SOURCES.TECMUNDO.enabled)this.s.push(tecmundo);if(config.SOURCES.BOREDPANDA.enabled)this.s.push(boredpanda);this.slugs=new Set();this.urls=new Set();}
async init(){await logger.init();await git.init();await git.pull();await this.load();logger.info('Iniciado');}
async load(){try{const f=await fs.readdir(config.POSTS_PATH);for(const file of f){if(file.endsWith('.md')){const c=await fs.readFile(path.join(config.POSTS_PATH,file),'utf8');const s=c.match(/slug:\s*"([^"]+)"/);const u=c.match(/original_url:\s*"([^"]+)"/);const t=c.match(/title:\s*"([^"]+)"/);if(s)this.slugs.add(s[1]);if(u)this.urls.add(u[1]);if(t)this.urls.add(Utils.generateSlug(t[1]));}}}catch(e){logger.error('L',{error:e.message});}}
dup(p){return this.slugs.has(p.slug)||this.urls.has(p.original_url)||this.urls.has(Utils.generateSlug(p.title));}
async save(p){if(this.dup(p)){logger.skip('Existe: '+p.title);return false;}const fn=Utils.generateFileName(p.slug);await fs.writeFile(path.join(config.POSTS_PATH,fn),`---\ntitle: "${p.title}"\ndate: "${p.date}"\ntags: [${p.tags.map(t=>`"${t}"`).join(',')}]\nsource: "${p.source}"\noriginal_url: "${p.original_url}"\nslug: "${p.slug}"\n---\n\n${p.content}\n`,'utf8');this.slugs.add(p.slug);this.urls.add(p.original_url);logger.ok('Salvo: '+p.title);return true;}
async run(){const s=Date.now();let nv=0,pl=0,er=0;logger.info('Iniciando...');for(const src of this.s){try{const ps=await src.fetch();for(const p of ps){try{nv+=await this.save(p)?1:(pl++,0);}catch(e){logger.error('P',{error:e.message});er++;}}await Utils.sleep(1000);}catch(e){logger.error('F '+src.name,{error:e.message});er++;}}if(nv>0)await git.commitAndPush('feat: '+nv+' posts');logger.ok('Fim em '+((Date.now()-s)/1000).toFixed(1)+'s',{novos:nv,pulados:pl,erros:er});}}
new NW().init().then(()=>new NW().run()).catch(e=>{logger.error('Fatal',{error:e.message});process.exit(1);});
WOF

echo "Pronto!"
echo ""
echo "Testando..."
node worker.js
