const fs=require('fs'),vm=require('vm'),assert=require('assert');const elements=new Map();function el(){return {textContent:'',innerHTML:'',style:{},classList:{toggle(){}},value:'',showModal(){},close(){}}}const document={querySelector(s){if(!elements.has(s))elements.set(s,el());return elements.get(s)},querySelectorAll(){return []}};const ctx=vm.createContext({document,localStorage:{getItem(){return null},setItem(){}},Intl,console,setTimeout,clearTimeout,window:{},URL,Blob,navigator:{}});vm.runInContext(fs.readFileSync(require('path').join(__dirname, '../app.js'),'utf8'),ctx);vm.runInContext(`
if(creators.length!==9)throw Error('creator pool');
toggle(0);if(state.selected.length!==1)throw Error('add shortlist');
toggle(0);if(state.selected.length!==0)throw Error('remove shortlist');
recommend();if(total()>available())throw Error('budget overflow');
if(state.selected.length===0)throw Error('no recommendations');
if(!draft(creators[0]).includes(state.brief.brand))throw Error('draft personalization');
state.brief.budget=100;recommend();if(state.selected.length)throw Error('small budget');
state.brief.budget=5000;state.brief.platform='YouTube';state.brief.market='United Kingdom';recommend();if(selected().some(c=>c.platform!=='YouTube'||c.market!=='United Kingdom'))throw Error('preference filter');
state.brief.brand='<script>alert(1)</script>';if(!strip().includes('&lt;script&gt;'))throw Error('escaping');
for(const t of ['discover','brief','shortlist','outreach']){tab=t;render()}
`,ctx);console.log('PASS: shortlist add/remove, budget limits, preferences, draft personalization, HTML escaping, all four views.');
