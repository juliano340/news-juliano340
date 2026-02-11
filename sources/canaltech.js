const Parser=require('rss-parser');const config=require('../config');const logger=require('../logger');const Utils=require('../utils');
class C{constructor(){this.name='Canaltech';this.p=new Parser({timeout:config.REQUEST_TIMEOUT});}
async fetch(){try{logger.info('B');const f=await this.p.parseURL(config.SOURCES.CANALTECH.url);return f.items.slice(0,config.MAX_POSTS_PER_SOURCE).map(i=>({title:Utils.normalizeEncoding(i.title),date:Utils.formatDate(i.pubDate||i.isoDate),source:this.name,original_url:i.link,slug:Utils.generateSlug(i.title),content:Utils.truncateText(Utils.normalizeEncoding(Utils.stripHtml(i['content:encoded']||i.content||i.summary||'')),800),tags:Utils.extractTags(i.title,i.title,this.name)}));}catch(e){logger.error('E',{error:e.message});return[];}}}
module.exports=new C();
