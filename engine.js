/* Shared, dependency-free portfolio analysis and creator matching. */
(function(root){
const categories={Skincare:['skincare','skin care','serum','moisturizer','cleanser','cosmetics'],Lifestyle:['lifestyle','homeware','fashion','apparel','clothing','jewellery','jewelry','travel'],Wellness:['wellness','meditation','mindfulness','supplements','nutrition'],Fitness:['fitness','workout','gym','sportswear','athletic','training'],Technology:['technology','software','saas','electronics','devices','gadgets']};
const stop=new Set('the and for with from your our are that this their into about company brand products product target audience campaign market goals goal budget profile portfolio offers offering people customers designed based through have has its'.split(' '));
function tokens(text){return [...new Set(String(text||'').toLowerCase().match(/[a-z][a-z0-9-]{2,}/g)||[])].filter(x=>!stop.has(x))}
function analyze(text,source='Pasted portfolio'){
 text=String(text||'').replace(/\r/g,'').trim();if(text.length<40)throw Error('Add at least 40 characters of company information.');if(text.length>120000)throw Error('Portfolio text is too long. Use up to 120,000 characters.');
 const lines=text.split(/\n+/).map(x=>x.trim()).filter(Boolean),fields={},evidence={};
 function field(key,re){const line=lines.find(x=>re.test(x));if(line){fields[key]=line.replace(re,'').trim().slice(0,key==='description'?3000:400);evidence[key]=line.slice(0,500)}}
 field('brand',/^(?:company(?: name)?|brand(?: name)?|business name)\s*[:：]\s*/i);
 field('products',/^(?:products?(?: and services)?|services|offering|what we (?:do|sell))\s*[:：]\s*/i);
 field('audience',/^(?:target audience|audience|target customers?|ideal customers?)\s*[:：]\s*/i);
 field('market',/^(?:target markets?|markets?|target (?:countries|country)|geography|region)\s*[:：]\s*/i);
 field('tone',/^(?:brand tone|tone(?: of voice)?|brand voice)\s*[:：]\s*/i);
 field('exclusions',/^(?:exclusions|restrictions|avoid|competitors)\s*[:：]\s*/i);
 field('description',/^(?:description|about(?: us)?|overview|mission)\s*[:：]\s*/i);
 const website=text.match(/https?:\/\/[^\s<>"']+/i);if(website){fields.website=website[0].replace(/[.,;)]+$/,'');evidence.website=website[0]}
 const explicitIndustry=lines.find(x=>/^(?:industry|category|sector)\s*[:：]/i.test(x));
 const scores=Object.entries(categories).map(([name,words])=>({name,hits:words.filter(w=>new RegExp('\\b'+w+'\\b','i').test(explicitIndustry||text))})).sort((a,b)=>b.hits.length-a.hits.length);
 if(scores[0].hits.length&&(scores[0].hits.length>scores[1].hits.length||explicitIndustry)){fields.niche=scores[0].name;evidence.niche=lines.find(l=>scores[0].hits.some(w=>l.toLowerCase().includes(w)))?.slice(0,500)||''}
 const goal=lines.find(l=>/^(?:campaign goal|objective|goal)\s*[:：]/i.test(l));if(goal){const v=goal.split(/[:：]/).slice(1).join(':');if(/sales|conversion|purchase/i.test(v))fields.goal='Sales conversions';else if(/engage|engagement|community/i.test(v))fields.goal='Engagement';else if(/awareness|reach|visibility/i.test(v))fields.goal='Brand awareness';if(fields.goal)evidence.goal=goal.slice(0,500)}
 const budgetLine=lines.find(l=>/^(?:campaign budget|budget)\s*[:：]/i.test(l));if(budgetLine){const m=budgetLine.match(/(?:USD|US\$)\s*([\d,]+(?:\.\d{1,2})?)|([\d,]+(?:\.\d{1,2})?)\s*USD\b/i);if(m){const n=Number((m[1]||m[2]).replace(/,/g,''));if(n>=100&&n<=10000000){fields.budget=n;evidence.budget=budgetLine.slice(0,500)}}}
 const platformLine=lines.find(l=>/^(?:platform|preferred platform)\s*[:：]/i.test(l));if(platformLine){const matches=['Instagram','TikTok','YouTube'].filter(p=>platformLine.toLowerCase().includes(p.toLowerCase()));if(matches.length===1){fields.platform=matches[0];evidence.platform=platformLine.slice(0,500)}}
 fields.description=fields.description||text.slice(0,3000);evidence.description=evidence.description||text.slice(0,500);
 const freq={};tokens([fields.products,fields.audience,fields.description].filter(Boolean).join(' ')).forEach(w=>{freq[w]=(text.toLowerCase().split(w).length-1)});fields.keywords=Object.keys(freq).sort((a,b)=>freq[b]-freq[a]).slice(0,12).join(', ');evidence.keywords='Suggested from terms in your portfolio; review before matching.';
 return {version:1,method:'Local rules · review required',source,fields,evidence,characters:text.length,analyzedAt:new Date().toISOString()};
}
function match(creator,brief){
 const relevant=tokens([brief.products,brief.audience,brief.keywords].join(' '));const creatorWords=tokens([creator.niche,creator.reason,creator.cover].join(' '));const overlap=relevant.filter(w=>creatorWords.includes(w));
 const marketAlias=s=>String(s||'').toLowerCase().replace(/\b(usa|us|u\.s\.)\b/g,'united states').replace(/\buk\b/g,'united kingdom').trim();
 const marketKnown=!!brief.market,marketMatch=marketAlias(brief.market)===marketAlias(creator.market);
 const parts=[{label:'Category relevance',points:brief.niche&&brief.niche===creator.niche?40:0,max:40},{label:'Content keyword overlap',points:Math.round(20*Math.min(1,overlap.length/3)),max:20},{label:'Audience market',points:marketKnown&&marketMatch?20:0,max:20},{label:'Platform preference',points:brief.platform==='All platforms'||brief.platform===creator.platform?10:0,max:10},{label:'Engagement signal',points:Math.round(Math.min(10,creator.engagement)),max:10}];
 const excluded=tokens(brief.exclusions).filter(w=>creatorWords.includes(w));
 return {score:parts.reduce((s,p)=>s+p.points,0),parts,overlap,eligible:!excluded.length&&(!marketKnown||marketMatch)&&(brief.platform==='All platforms'||brief.platform===creator.platform)&&(parts[0].points>0||overlap.length>0),excluded,explanation:overlap.length?'Shared content terms: '+overlap.join(', '):brief.niche===creator.niche?'Matches your reviewed '+brief.niche.toLowerCase()+' category.':'Limited evidence of content relevance.'};
}
const api={analyze,match,tokens};if(typeof module!=='undefined'&&module.exports)module.exports=api;root.OrbitEngine=api;
})(typeof globalThis!=='undefined'?globalThis:this);
