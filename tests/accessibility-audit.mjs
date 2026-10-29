/** Local WCAG scanner. Supply AXE_SCRIPT pointing to a downloaded axe-core axe.min.js. */
import {chromium} from 'playwright';
import fs from 'node:fs/promises';
const base=process.env.SITE_TEST_URL||'http://127.0.0.1:5174';
if(!process.env.AXE_SCRIPT)throw new Error('Set AXE_SCRIPT to a local axe-core axe.min.js; see docs/website-audit.md.');
const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_EXECUTABLE?{executablePath:process.env.CHROMIUM_EXECUTABLE}:{})});
const results=[];
async function scan(page,label,width){
 const result=await page.evaluate(()=>axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','best-practice']}}));
 const entry={page:label,width,violations:result.violations.map(v=>({id:v.id,impact:v.impact,help:v.help,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))})),incomplete:result.incomplete.map(v=>({id:v.id,count:v.nodes.length}))};
 results.push(entry);console.log(label,width,entry.violations.map(v=>`${v.id}:${v.nodes.length}`).join(', ')||'PASS');
}
try{
 for(const width of [1440,390]){
  const context=await browser.newContext({viewport:{width,height:900},hasTouch:width<600,isMobile:width<600,reducedMotion:'reduce'});
  await context.route('**/*',route=>new URL(route.request().url()).origin===new URL(base).origin?route.continue():route.abort());
  // English pages, then the generated Arabic pages under /ar/.
  for(const name of ['index','about','programs','enrichments','spaces','admissions','book-a-visit','apply-online','parents','contact'].flatMap(name=>[name,`ar/${name}`])){
   const page=await context.newPage();await page.goto(base+(name==='index'?'/':name==='ar/index'?'/ar/':`/${name}`),{waitUntil:'domcontentloaded'});await page.locator('#school-chat-launcher').waitFor();await page.addScriptTag({path:process.env.AXE_SCRIPT});await scan(page,name,width);
   if(name==='index'){
    for(const [button,dialog,label]of [['#menu-toggle-btn','#offcanvas-drawer','navigation'],['#search-open-btn','#search-modal','search'],['#school-chat-launcher','.school-chat','chat']]){
     await page.goto(base,{waitUntil:'domcontentloaded'});await page.locator('#school-chat-launcher').waitFor();await page.addScriptTag({path:process.env.AXE_SCRIPT});
     await page.locator(button).click();await page.locator(dialog).waitFor({state:'visible'});await scan(page,`index:${label}`,width);
     if(label==='navigation'){
      await page.locator('.submenu-toggle-btn').filter({hasText:'PROGRAMS'}).click();
      await scan(page,'index:navigation-expanded',width);
     }
     await page.keyboard.press('Escape');
    }
   }
   await page.close();
  }
  await context.close();
 }
}finally{await browser.close();}
await fs.mkdir('test-results',{recursive:true});await fs.writeFile('test-results/accessibility-audit.json',JSON.stringify({checkedAt:new Date().toISOString(),results},null,2)+'\n');
if(results.some(r=>r.violations.length))process.exitCode=1;
