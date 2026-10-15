import {chromium} from 'playwright';
import fs from 'node:fs';
const base='http://127.0.0.1:5175', out='audit-results/inspection-2026-10-15';
fs.mkdirSync(out,{recursive:true});
const names=['index','about','programs','enrichments','spaces','admissions','book-a-visit','apply-online','parents','contact'];
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
const page=await browser.newPage();page.setDefaultTimeout(10000);page.setDefaultNavigationTimeout(15000);
const results={base,date:'2026-10-15',pages:[],requests:[],errors:[],interactions:[]};
page.on('pageerror',e=>results.errors.push({url:page.url(),error:e.message}));
page.on('requestfailed',r=>results.requests.push({url:r.url(),error:r.failure()?.errorText}));
for(const name of names){
 const entry={name,path:`/${name}.html`,views:[]};
 for(const [label,width,height] of [['desktop',1440,900],['tablet',768,1024],['mobile',390,844],['small-mobile',320,740]]){
  await page.setViewportSize({width,height});
  await page.goto(`${base}/${name}.html`,{waitUntil:'domcontentloaded'});
  await page.evaluate(async()=>{await Promise.race([document.fonts.ready,new Promise(r=>setTimeout(r,2000))]);for(const v of document.querySelectorAll('video'))v.pause(); for(const i of document.images)i.loading='eager';});
  await page.waitForTimeout(300);
  await page.screenshot({path:`${out}/${name}-${label}-frame.png`});
  await page.screenshot({path:`${out}/${name}-${label}-full.png`,fullPage:true});
  entry.views.push(await page.evaluate(({label,width,height})=>{
   const visible=e=>e.getBoundingClientRect().width>0&&e.getBoundingClientRect().height>0&&getComputedStyle(e).visibility!=='hidden'&&!e.closest('[aria-hidden="true"]');
   return {label,width,height,scrollWidth:document.documentElement.scrollWidth,brokenImages:[...document.images].filter(i=>i.complete&&!i.naturalWidth).map(i=>i.getAttribute('src')),smallControls:[...document.querySelectorAll('button,input,select,textarea')].filter(visible).filter(e=>e.getBoundingClientRect().height<40).map(e=>({id:e.id,height:e.getBoundingClientRect().height})),links:[...document.querySelectorAll('a[href]')].map(e=>({text:e.textContent.trim(),href:e.getAttribute('href')})),ids:[...document.querySelectorAll('[id]')].map(e=>e.id),headings:[...document.querySelectorAll('h1,h2,h3')].map(e=>e.textContent.trim()),forms:[...document.forms].map(f=>({id:f.id,action:f.getAttribute('action'),fields:[...f.elements].map(e=>({id:e.id,type:e.type,required:e.required,min:e.min,max:e.max,options:e.tagName==='SELECT'?[...e.options].map(o=>o.text):undefined}))}))};
  },{label,width,height}));
 }
 await page.locator('#menu-toggle-btn').click();
 await page.screenshot({path:`${out}/${name}-mobile-menu.png`});
 entry.menu={open:await page.locator('#offcanvas-drawer').getAttribute('aria-hidden'),focus:await page.evaluate(()=>document.activeElement?.id)};
 await page.keyboard.press('Escape');
 await page.locator('#search-open-btn').click();
 entry.search={open:await page.locator('#search-modal').getAttribute('aria-hidden')};
 await page.keyboard.press('Escape');
 results.pages.push(entry);console.log('Captured '+name);
}
for(const [name,id] of [['book-a-visit','tour-booking-form'],['apply-online','online-enrollment-form'],['contact','contact-inquiry-form']]){
 await page.setViewportSize({width:1440,height:900});await page.goto(`${base}/${name}.html`,{waitUntil:'domcontentloaded'});
 const form=page.locator('#'+id);
 for(const el of await form.locator('input,select,textarea').all()){
  const type=await el.getAttribute('type'),tag=await el.evaluate(e=>e.tagName);
  if(tag==='SELECT'){const value=await el.evaluate(e=>[...e.options].find(o=>o.value&&!o.disabled)?.value);if(value)await el.selectOption(value);}
  else if(type==='checkbox'||type==='radio')await el.check();
  else await el.fill(type==='email'?'audit@example.test':type==='date'?'2024-01-15':type==='datetime-local'?'2026-10-20T10:00':type==='tel'?'+96890000000':'UI Audit Test');
 }
 const requests=[];const listener=r=>requests.push({method:r.method(),url:r.url(),type:r.resourceType()});page.on('request',listener);
 await form.locator('[type=submit]').click();await page.waitForTimeout(300);page.off('request',listener);
 await page.screenshot({path:`${out}/${name}-submission.png`});
 results.interactions.push({name,id,valid:await form.evaluate(f=>f.checkValidity()),toast:await page.locator('#toast-message').textContent(),requests,remainingName:await form.locator('input[type=text]').first().inputValue()});
}
await page.goto(base+'/enrichments.html',{waitUntil:'domcontentloaded'});const card=page.locator('.pursue-item-card').first();await card.click();await page.screenshot({path:`${out}/enrichments-detail-modal.png`});results.interactions.push({name:'enrichments',modalOpen:await page.locator('#detail-modal').getAttribute('aria-hidden'),focus:await page.evaluate(()=>document.activeElement?.outerHTML.slice(0,180))});
await page.goto(base+'/index.html',{waitUntil:'domcontentloaded'});await page.locator('#search-open-btn').click();await page.locator('#search-input').fill('zzzauditnomatch');await page.locator('#search-form').evaluate(f=>f.requestSubmit());await page.waitForURL('**/about.html');results.interactions.push({name:'search',query:'zzzauditnomatch',destination:page.url()});
fs.writeFileSync(`${out}/inspection.json`,JSON.stringify(results,null,2));await browser.close();console.log('Done');
