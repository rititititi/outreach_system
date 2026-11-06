/* Real, public creator records. Sources support identity links and content summaries,
   not audience demographics, rates, availability, or campaign suitability. */
(function(root){
const day='2026-11-06';
const seeds=[
 [1000,'James Welsh','james_s_welsh','Instagram','Skincare','Skincare education, product ingredients, and Korean skincare reviews.','https://www.instagram.com/james_s_welsh','https://www.outreachtalentgroup.com/talent/james-welsh/'],
 [1001,'Cassey Ho','blogilates','Instagram','Fitness','Pilates workouts, fitness, activewear design, and apparel.','https://www.instagram.com/blogilates/','https://www.blogilates.com/about-me/'],
 [1002,'Sadia / Pick Up Limes','pickuplimes','Instagram','Wellness','Plant-based recipes, cooking, food, and nutrition education.','https://www.instagram.com/pickuplimes/','https://www.pickuplimes.com/about'],
 [1003,'Marques Brownlee','MKBHD','YouTube','Technology','Technology videos reviewing electronics, devices, and consumer gadgets.','https://www.youtube.com/channel/UCBJycsmduvYEL83R_U4JriQ','https://mkbhd.com/'],
 [1004,'Calum Harris','calumharris','Instagram','Lifestyle','Vegan cooking, plant-based recipes, and food content.','https://www.instagram.com/calumharris','https://www.outreachtalentgroup.com/talent/calum-harris/'],
 [1005,'Bex Beauty','__bexbeauty__','Instagram','Lifestyle','Makeup tutorials, beauty transformations, and get-ready-with-me content.','https://www.instagram.com/__bexbeauty__','https://www.outreachtalentgroup.com/talent/bex-beauty/']
].map(([id,name,handle,platform,niche,reason,profileUrl,sourceUrl])=>({id,name,handle,platform,niche,reason,profileUrl,sourceUrl,checkedAt:day,provenance:'Website-linked public profile',market:'',followers:null,engagement:null,views:null,rate:null,metricsSource:'',metricsDate:'',rateSource:'',rateDate:'',color:'#879e85',cover:niche.toLowerCase(),real:true}));
function url(value,required=false){if(!value&&!required)return '';let u;try{u=new URL(String(value))}catch{throw Error('Provide a valid source and profile URL.')}if(u.protocol!=='https:'||u.username||u.password)throw Error('Creator URLs must use HTTPS without credentials.');return u.href;}
function date(s){return /^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s))&&new Date(s).toISOString().slice(0,10)===s;}
function num(v,max){if(v===''||v===null||v===undefined)return null;const n=Number(v);if(!Number.isFinite(n)||n<0||n>max)throw Error('A creator metric is outside the allowed range.');return n;}
function normalize(row){
 if(!row||typeof row!=='object'||Array.isArray(row))throw Error('Each creator must be an object or CSV row.');
 const name=String(row.name||'').trim().slice(0,120),handle=String(row.handle||'').trim().replace(/^@/,'');
 if(!name||!/^[-a-zA-Z0-9_.]{1,100}$/.test(handle))throw Error('Each creator needs a name and a valid public handle.');
 if(!['Instagram','YouTube','TikTok'].includes(row.platform))throw Error('Platform must be Instagram, YouTube, or TikTok.');
 const profileUrl=url(row.profileUrl,true),host=new URL(profileUrl).hostname.replace(/^www\./,'');
 const hosts={Instagram:['instagram.com'],YouTube:['youtube.com','youtu.be'],TikTok:['tiktok.com']};
 if(!hosts[row.platform].includes(host))throw Error('The profile URL must match the selected social platform.');
 if(row.platform==='Instagram'&&new URL(profileUrl).pathname.replace(/^\/+|\/+$/g,'').toLowerCase()!==handle.toLowerCase())throw Error('Instagram profile URL must identify the same handle.');
 const sourceUrl=url(row.sourceUrl,true),reason=String(row.reason||row.topics||'').trim().slice(0,1500);if(reason.length<12)throw Error('Add a sourced content description (at least 12 characters).');
 const followers=num(row.followers,1e10),views=num(row.views,1e10),engagement=num(row.engagement,100),rate=num(row.rate,1e8);
 const market=String(row.audienceMarket||row.market||'').trim().slice(0,100);
 const metricsSource=url(row.metricsSource),metricsDate=String(row.metricsDate||'');
 if((followers!==null||views!==null||engagement!==null||market)&&(!metricsSource||!date(metricsDate)))throw Error('Audience and performance data need metricsSource and metricsDate (YYYY-MM-DD). Do not use creator location as audience location.');
 const rateSource=url(row.rateSource),rateDate=String(row.rateDate||'');if(rate!==null&&(!rateSource||!date(rateDate)))throw Error('A quoted USD rate needs rateSource and rateDate (YYYY-MM-DD).');
 return {name,handle,platform:row.platform,niche:String(row.niche||'Other').slice(0,80),reason,profileUrl,sourceUrl,checkedAt:new Date().toISOString().slice(0,10),provenance:'User-supplied record · review source',market,followers,engagement,views,rate,metricsSource,metricsDate,rateSource,rateDate,color:'#879e85',cover:String(row.niche||'Other').slice(0,80),real:true};
}
function csv(text){
 const rows=[];let row=[],cell='',quoted=false;
 for(let i=0;i<text.length;i++){const ch=text[i];if(ch==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++}else if(quoted||cell==='')quoted=!quoted;else throw Error('Malformed CSV quote.')}else if(ch===','&&!quoted){row.push(cell);cell=''}else if((ch==='\n'||ch==='\r')&&!quoted){if(ch==='\r'&&text[i+1]==='\n')i++;row.push(cell);if(row.some(x=>x.trim()))rows.push(row);row=[];cell=''}else cell+=ch}
 if(quoted)throw Error('Unclosed CSV quote.');row.push(cell);if(row.some(x=>x.trim()))rows.push(row);
 if(rows.length<2)throw Error('Include CSV headers and at least one creator.');const headers=rows.shift().map(x=>x.trim().replace(/^\uFEFF/,''));
 if(new Set(headers).size!==headers.length)throw Error('Duplicate CSV headers.');
 return rows.map(r=>{if(r.length!==headers.length)throw Error('CSV rows must match the header columns.');return Object.fromEntries(headers.map((h,i)=>[h,r[i]]))});
}
function parse(text,filename){if(text.length>2*1024*1024)throw Error('Import up to 2 MB.');const rows=filename.toLowerCase().endsWith('.csv')?csv(text):JSON.parse(text);if(!Array.isArray(rows)||!rows.length||rows.length>500)throw Error('Import an array of 1 to 500 creators.');const result=rows.map(normalize);const keys=result.map(c=>c.platform+':'+c.handle.toLowerCase());if(new Set(keys).size!==keys.length)throw Error('Remove duplicate creator handles in this import.');return result;}
const api={seeds,normalize,parse};root.OrbitCreators=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
