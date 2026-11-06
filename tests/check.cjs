const fs=require('fs'),vm=require('vm'),assert=require('assert');const elements=new Map();function el(){return {textContent:'',innerHTML:'',style:{},classList:{toggle(){}},value:'',showModal(){},close(){}}}const document={querySelector(s){if(!elements.has(s))elements.set(s,el());return elements.get(s)},querySelectorAll(){return []}};const ctx=vm.createContext({document,localStorage:{getItem(){return null},setItem(){}},Intl,console,setTimeout,clearTimeout,window:{},URL,Blob,navigator:{},FormData:class {constructor(form){return form.entries}}});vm.runInContext(fs.readFileSync(require('path').join(__dirname, '../engine.js'),'utf8'),ctx);vm.runInContext(fs.readFileSync(require('path').join(__dirname, '../app.js'),'utf8'),ctx);vm.runInContext(`
if(tab!=='company')throw Error('company must be first');
state.company={confirmed:true};state.brief={...defaults,brand:'Test',niche:'Skincare',market:'United States',budget:5000};
if(creators.length!==9)throw Error('creator pool');
toggle(0);if(state.selected.length!==1)throw Error('add shortlist');
toggle(0);if(state.selected.length!==0)throw Error('remove shortlist');
recommend();if(total()>available())throw Error('budget overflow');
if(state.selected.length===0)throw Error('no recommendations');
if(!draft(creators[0]).includes(state.brief.brand))throw Error('draft personalization');
state.brief.budget=100;recommend();if(state.selected.length)throw Error('small budget');
state.brief.budget=5000;state.brief.platform='YouTube';state.brief.market='United Kingdom';recommend();if(selected().some(c=>c.platform!=='YouTube'||c.market!=='United Kingdom'))throw Error('preference filter');
state.brief.brand='<script>alert(1)</script>';if(!strip().includes('&lt;script&gt;'))throw Error('escaping');
pendingAnalysis=OrbitEngine.analyze('Company: Example Labs\\nProducts: Skincare serum for adults interested in ingredients.\\nTarget market: United States');
state.company=null;tab='company';render();
if(!company().includes('Here’s what we found.'))throw Error('analysis review missing');
const review={brand:'Reviewed Labs',market:'United States',audience:'Adults',niche:'Skincare',goal:'Brand awareness',budget:'4000',reserve:'20',description:'Reviewed summary',platform:'Instagram',keywords:'serum'};
$('#review-company').onsubmit({preventDefault(){},target:{entries:Object.entries(review)}});
if(!state.company.confirmed||tab!=='discover'||state.brief.budget!==4000||state.selected.length||state.company.analysis.fields.brand!=='Reviewed Labs')throw Error('review confirmation');
state.company=null;tab='discover';render();if(tab!=='company')throw Error('onboarding bypass');
state.company={confirmed:true};
for(const t of ['company','discover','brief','shortlist','outreach']){tab=t;render()}
`,ctx);console.log('PASS: shortlist add/remove, budget limits, preferences, draft personalization, HTML escaping, all four views.');
