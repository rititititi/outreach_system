const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');const reader=require('../pdf-reader.js');
(async()=>{
 let destroyed=0;const lib={getDocument(){return {promise:Promise.resolve({numPages:1,async getPage(){return {async getTextContent(){return {items:[{str:'Company: Test Labs',hasEOL:true},{str:'Products: Skincare products and ingredient-focused routines.',hasEOL:true}]}},cleanup(){}}}}),async destroy(){destroyed++}}}};
 assert.match(await reader.extractWithLibrary(lib,new Uint8Array()),/Company: Test Labs/);assert.equal(destroyed,1);
 const stub=doc=>({getDocument(){return {promise:Promise.resolve(doc),async destroy(){destroyed++}}}});
 await assert.rejects(()=>reader.extractWithLibrary(stub({numPages:61}),new Uint8Array()),/60 pages/);
 await assert.rejects(()=>reader.extractWithLibrary(stub({numPages:1,async getPage(){return {async getTextContent(){return {items:[]}},cleanup(){}}}}),new Uint8Array()),/OCR/);
 await assert.rejects(()=>reader.extractWithLibrary({getDocument(){return {promise:Promise.reject(Object.assign(Error(),{name:'PasswordException'})),async destroy(){}}}},new Uint8Array()),/unlocked/);
 await assert.rejects(()=>reader.extract({size:0}),/nonempty/);
 await assert.rejects(()=>reader.extract({size:8*1024*1024+1}),/8 MB/);
 const elements=new Map();function el(){return {textContent:'',innerHTML:'',style:{},classList:{toggle(){},add(){},remove(){}},value:'',showModal(){},close(){},scrollIntoView(){}}}
 const document={querySelector(s){if(!elements.has(s))elements.set(s,el());return elements.get(s)},querySelectorAll(){return []}};
 let pdfCalled=0;
 const ctx=vm.createContext({document,localStorage:{getItem(){return null},setItem(){}},Intl,console,setTimeout,clearTimeout,window:{},URL,Blob,navigator:{},location:{protocol:'file:'},OrbitPDF:{async extract(file,progress){pdfCalled++;progress('Reading page 1');return 'Company: Test Labs\nProducts: Skincare products and ingredient-focused routines.'}},fetch(){throw Error('PDF must never call the Python endpoint')}});
 for(const f of ['engine.js','app.js'])vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'..',f),'utf8'),ctx);
 await vm.runInContext("readPortfolio({name:'test.pdf',size:100})",ctx);
 assert.equal(pdfCalled,1);assert.equal(vm.runInContext('pendingAnalysis.fields.brand',ctx),'Test Labs');assert.equal(vm.runInContext('uploadBusy',ctx),false);
 console.log('PASS: PDF extraction, cleanup, limits, scanned/encrypted errors, and standalone file:// upload without server fetch.');
})().catch(err=>{console.error(err);process.exitCode=1});
