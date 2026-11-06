/* Client-side PDF text extraction. File bytes stay in the visitor's browser. */
(function(root){
 const VERSION='4.10.38';
 const BASE='https://cdn.jsdelivr.net/npm/pdfjs-dist@'+VERSION+'/legacy/build/';
 let libraryPromise;
 function loadLibrary(){
  if(!libraryPromise){
   libraryPromise=import(BASE+'pdf.min.mjs').then(lib=>{lib.GlobalWorkerOptions.workerSrc=BASE+'pdf.worker.min.mjs';return lib}).catch(()=>{libraryPromise=null;throw Error('Could not load the PDF reader. Connect to the internet, allow cdn.jsdelivr.net, and try again. Your file has not been uploaded.');});
  }
  return libraryPromise;
 }
 function pageText(items){
  let text='',lastY=null;
  for(const item of items){
   if(typeof item.str!=='string')continue;
   const y=item.transform?.[5];
   if(lastY!==null&&typeof y==='number'&&Math.abs(y-lastY)>2&&!text.endsWith('\n'))text+='\n';
   text+=item.str+(item.hasEOL?'\n':' ');
   if(typeof y==='number')lastY=y;
   if(text.length>120000)throw Error('This PDF has too much text. Use a shorter portfolio (up to 120,000 characters).');
  }
  return text.trim();
 }
 async function extractWithLibrary(lib,data,progress=()=>{}){
  let task,timer;
  try{
   task=lib.getDocument({data,isEvalSupported:false,disableFontFace:true,useSystemFonts:true,stopAtErrors:true});
   const work=(async()=>{
    const doc=await task.promise;
    if(doc.numPages>60)throw Error('Choose a PDF with 60 pages or fewer.');
    const pages=[];let count=0;
    for(let i=1;i<=doc.numPages;i++){
     progress('Reading PDF page '+i+' of '+doc.numPages+'…');
     const page=await doc.getPage(i);const content=await page.getTextContent();
     const text=pageText(content.items);count+=text.length+1;
     if(count>120000)throw Error('This PDF has too much text. Use a shorter portfolio (up to 120,000 characters).');
     pages.push(text);page.cleanup();
    }
    const text=pages.join('\n').trim();
    if(text.length<40)throw Error('This PDF has too little selectable text. For a scanned PDF, export it with OCR or paste the text.');
    return text;
   })();
   return await Promise.race([work,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Reading this PDF took too long. Try a smaller PDF or paste its text.')),45000)})]);
  }catch(err){
   if(err.name==='PasswordException')throw Error('This PDF is password protected. Upload an unlocked copy.');
   if(err.name==='InvalidPDFException')throw Error('This PDF could not be read. Try exporting a new PDF from the original document.');
   throw err;
  }finally{clearTimeout(timer);if(task)await task.destroy().catch(()=>{});}
 }
 async function extract(file,progress=()=>{}){
  if(!file||file.size===0||file.size>8*1024*1024)throw Error('Choose a nonempty PDF up to 8 MB.');
  progress('Loading the browser PDF reader…');
  let timer;
  try{
   const lib=await Promise.race([loadLibrary(),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('PDF reader download timed out. Check your internet connection and try again.')),20000)})]);
   const bytes=new Uint8Array(await file.arrayBuffer());
   return await extractWithLibrary(lib,bytes,progress);
  }finally{clearTimeout(timer)}
 }
 const api={extract,extractWithLibrary,pageText};root.OrbitPDF=api;
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
