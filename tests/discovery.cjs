const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
(async()=>{
 const elements=new Map();const document={querySelector(s){if(!elements.has(s))elements.set(s,{textContent:'',innerHTML:'',style:{},value:'',disabled:false,classList:{toggle(){}},showModal(){},close(){}});return elements.get(s)},querySelectorAll(){return []}};
 let calls=0;const context=vm.createContext({document,Intl,console,setTimeout,clearTimeout,window:{},URL,Blob,AbortController,navigator:{},location:{protocol:'file:'},localStorage:{getItem(){return null},setItem(){}},fetch:async()=>{calls++;return {ok:false,status:503,json:async()=>({error:'No key configured.'})}}});
 for(const f of ['creator-data.js','engine.js','app.js'])vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'..',f),'utf8'),context);
 vm.runInContext("openDiscovery();discoverySettings={query:'skincare',minFollowers:1000,maxFollowers:100000,language:''}",context);
 await vm.runInContext('runDiscovery(0)',context);assert.equal(calls,0);assert.match(document.querySelector('#discovery-status').textContent,/backend/);
 context.location.protocol='http:';await vm.runInContext('runDiscovery(0)',context);assert.equal(calls,1);assert.match(document.querySelector('#discovery-status').textContent,/No key/);assert.equal(document.querySelector('#discovery-submit').disabled,false);
 context.fetch=async()=>({ok:true,status:200,json:async()=>({candidates:[{name:'Test Creator',handle:'test_creator',followers:12345,reason:''}],page:0,total:1,cached:false})});
 await vm.runInContext('runDiscovery(0)',context);assert.match(document.querySelector('#discovery-results').innerHTML,/Review & add/);assert.equal(vm.runInContext('creators.length',context),6,'search must not silently add candidates');
 console.log('PASS: standalone backend guidance, no-key errors, loading cleanup, candidate review, and no silent catalog imports.');
})().catch(e=>{console.error(e);process.exitCode=1});
