import {chromium} from 'playwright';
import fs from 'node:fs';
const mode=process.argv[2]||'baseline';
const out=`audit-results/current-run/${mode}`;fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const pages=['index','about','programs','enrichments','spaces','admissions','book-a-visit','apply-online','parents','contact'];
const widths=[320,360,375,390,414,768,1024,1280,1440,1920,2560];
const result=[];
for(const name of pages){
 const page=await browser.newPage();
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 for(const width of widths){
 await page.setViewportSize({width,height:width<768?844:900});
 await page.goto(`http://127.0.0.1:5174/${name}.html`,{waitUntil:'load'});
 await page.evaluate(async()=>{await document.fonts.ready; document.querySelectorAll('video').forEach(v=>v.pause()); document.querySelectorAll('.reveal').forEach(e=>e.classList.add('active'));});
 await page.waitForTimeout(150);
 const measurements=await page.evaluate(()=>{
 const visible=e=>{const s=getComputedStyle(e),r=e.getBoundingClientRect();return s.display!=='none'&&s.visibility!=='hidden'&&r.width>0&&r.height>0;};
 const elements=[...document.querySelectorAll('body *')].filter(visible);
 return {width:innerWidth,scrollWidth:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight,
 outside:elements.filter(e=>{const r=e.getBoundingClientRect();return r.left< -2||r.right>innerWidth+2;}).map(e=>({tag:e.tagName,cls:e.className,text:e.textContent.trim().slice(0,80),left:Math.round(e.getBoundingClientRect().left),right:Math.round(e.getBoundingClientRect().right)})).slice(0,30),
 clipped:elements.filter(e=>['hidden','clip'].includes(getComputedStyle(e).overflow)&&e.scrollWidth>e.clientWidth+2&&!['IMG','VIDEO','SVG'].includes(e.tagName)).map(e=>({tag:e.tagName,cls:e.className,scrollWidth:e.scrollWidth,clientWidth:e.clientWidth,text:e.textContent.trim().slice(0,100)})).slice(0,20)};
 });
 await page.screenshot({path:`${out}/${name}-${width}.png`,fullPage:true,animations:'disabled'});
 result.push({name,width,...measurements,errors:[...errors]});
 }
 console.log(name,'complete'); await page.close();
}
fs.writeFileSync(`${out}/measurements.json`,JSON.stringify(result,null,2));await browser.close();
console.log(JSON.stringify({cases:result.length,overflow:result.filter(r=>r.scrollWidth>r.width+1).length,clipped:result.filter(r=>r.clipped.length).length}));
