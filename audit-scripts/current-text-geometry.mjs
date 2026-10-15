import {chromium} from 'playwright';import fs from 'node:fs';
const b=await chromium.launch({channel:'chrome',headless:true});const p=await b.newPage();const result=[];
for(const name of ['index','about','programs','enrichments','spaces','admissions','book-a-visit','apply-online','parents','contact'])for(const width of [320,360,375,390,414,768,1024,1280,1440,1920,2560]){
await p.setViewportSize({width,height:900});await p.goto(`http://127.0.0.1:5174/${name}.html`,{waitUntil:'load'});await p.evaluate(()=>document.fonts.ready);
const geometry=await p.evaluate(()=>{
let clips=[];const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let n;
while(n=walker.nextNode()){
 if(!n.textContent.trim())continue;const el=n.parentElement;if(el.closest('.sr-only,script,style,[aria-hidden="true"]'))continue;
 if(!el.checkVisibility({checkOpacity:true,checkVisibilityCSS:true}))continue;
 const range=document.createRange();range.selectNodeContents(n);const rects=[...range.getClientRects()];
 for(let a=el;a&&a!==document.body;a=a.parentElement){const s=getComputedStyle(a);if(!['hidden','clip'].includes(s.overflowX)&&!['hidden','clip'].includes(s.overflowY))continue;
 const r=a.getBoundingClientRect();const offending=rects.filter(t=>t.width&&t.height&&(t.left<r.left-2||t.right>r.right+2||t.top<r.top-2||t.bottom>r.bottom+2));if(offending.length){clips.push({text:n.textContent.trim().slice(0,90),parent:el.className,container:a.className,rect:{left:r.left,right:r.right,top:r.top,bottom:r.bottom},offending:offending.map(t=>({left:t.left,right:t.right,top:t.top,bottom:t.bottom}))});break;}
 }
}
const header=[...document.querySelectorAll('.header-container > *')].filter(e=>e.checkVisibility()).map(e=>({cls:e.className,rect:e.getBoundingClientRect().toJSON()}));return{clips,header};
});result.push({name,width,...geometry});}
fs.writeFileSync('audit-results/current-run/text-geometry.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result.filter(r=>r.clips.length)));await b.close();
