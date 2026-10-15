import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const base='http://127.0.0.1:5180',mockBase='http://127.0.0.1:5181';
const out='audit-results/fixes-2026-10-15';fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
const p=await browser.newPage();p.setDefaultTimeout(8000);
// External font/CDN requests do not participate in behavioral assertions.
const errors=[];p.on('pageerror',e=>errors.push(e.message));
const results=[];async function check(name,fn){try{await fn();results.push({name,pass:true});}catch(e){results.push({name,pass:false,error:e.message});}console.log(results.at(-1));}
const names=['index','about','programs','enrichments','spaces','admissions','book-a-visit','apply-online','parents','contact'];
for(const name of names){
 await check(`${name}: dialog focus, accordion navigation and search`,async()=>{
  await p.setViewportSize({width:390,height:844});await p.goto(`${base}/${name}.html`,{waitUntil:'domcontentloaded'});
  await p.locator('#menu-toggle-btn').focus();await p.keyboard.press('Tab');assert.equal(await p.evaluate(()=>!!document.activeElement.closest('[inert],[aria-hidden="true"]')),false);
  await p.locator('#menu-toggle-btn').click();assert.equal(await p.evaluate(()=>document.activeElement.id),'menu-close-btn');
  assert.equal(await p.locator('#site-header').evaluate(e=>e.inert),true);
  for(const toggle of await p.locator('.submenu-toggle-btn').all()){
   await toggle.click();assert.equal(await toggle.getAttribute('aria-expanded'),'true');
   assert.equal(await toggle.evaluate(e=>e.closest('.drawer-menu-item').querySelector('.submenu-dropdown').inert),false);
  }
  const last=p.locator('#offcanvas-drawer a[href]').last();await last.focus();await p.keyboard.press('Tab');assert.equal(await p.evaluate(()=>!!document.activeElement.closest('#offcanvas-drawer')),true);
  await p.keyboard.press('Escape');assert.equal(await p.evaluate(()=>document.activeElement.id),'menu-toggle-btn');assert.equal(await p.locator('#site-header').evaluate(e=>e.inert),false);
  await p.locator('#search-open-btn').click();assert.equal(await p.evaluate(()=>document.activeElement.id),'search-input');
  await p.locator('#search-input').fill('zzzauditnomatch');await p.locator('#search-form').evaluate(f=>f.requestSubmit());
  assert.match(await p.locator('#search-results').textContent(),/No matching pages/);assert.equal(new URL(p.url()).pathname,`/${name}.html`);
  await p.locator('#search-input').fill('ages');await p.locator('#search-form').evaluate(f=>f.requestSubmit());assert.equal(await p.locator('#search-results a').getAttribute('href'),'/programs.html#ages');
  await p.screenshot({path:`${out}/${name}-search.png`,animations:'disabled'});await p.keyboard.press('Escape');assert.equal(await p.evaluate(()=>document.activeElement.id),'search-open-btn');
  assert.equal(await p.locator('a[href="https://www.facebook.com/"],a[href="https://www.instagram.com/"],a[href="https://www.youtube.com/"],a[href="https://www.linkedin.com/"]').count(),0);
  assert.doesNotMatch(await p.locator('body').innerText(),/6 months to (?:4|6) years/);
 });
 for(const [label,width,height] of [['desktop',1440,900],['tablet',768,1024],['mobile',390,844],['small-mobile',320,740]]){
  await check(`${name}: ${label} layout`,async()=>{await p.goto(`${base}/${name}.html`,{waitUntil:'domcontentloaded'});await p.setViewportSize({width,height});await p.evaluate(()=>{for(const v of document.querySelectorAll('video'))v.pause();});assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await p.screenshot({path:`${out}/${name}-${label}.png`,fullPage:true,animations:'disabled'});});
 }
}
await check('Every detail dialog contains and returns focus',async()=>{for(const name of ['index','enrichments']){await p.goto(`${base}/${name}.html`,{waitUntil:'domcontentloaded'});for(const card of await p.locator('.pursue-item-card').all()){await card.click();assert.equal(await p.evaluate(()=>document.activeElement.id),'detail-modal-close');await p.keyboard.press('Shift+Tab');assert.equal(await p.evaluate(()=>!!document.activeElement.closest('#detail-modal')),true);await p.keyboard.press('Escape');assert.equal(await card.evaluate(e=>e===document.activeElement),true);}}});
await check('Unsupported language and outdated term removed',async()=>{await p.goto(base+'/index.html',{waitUntil:'domcontentloaded'});assert.equal(await p.locator('.language-selector-pill').count(),0);await p.goto(base+'/apply-online.html',{waitUntil:'domcontentloaded'});assert.equal(await p.locator('input[type=checkbox]:checked').count(),0);assert.equal(await p.locator('option[value="Summer Camp 2026"]').count(),0);});
await check('Hero video accessible name follows pause and play',async()=>{await p.goto(base+'/index.html',{waitUntil:'domcontentloaded'});await p.locator('#hero-bg-video').evaluate(v=>v.pause());assert.equal(await p.locator('#hero-video-toggle-btn').getAttribute('aria-label'),'Play background video');await p.locator('#hero-video-toggle-btn').click();await p.waitForFunction(()=>!document.querySelector('#hero-bg-video').paused);assert.equal(await p.locator('#hero-video-toggle-btn').getAttribute('aria-label'),'Pause background video');});
async function fillForm(form){for(const el of await form.locator('input,select,textarea').all()){const tag=await el.evaluate(e=>e.tagName);const type=await el.getAttribute('type');if(tag==='SELECT'){const value=await el.evaluate(e=>[...e.options].find(o=>o.value&&!o.disabled&&(e.name!=='schedule'||o.value.startsWith('Toddlers')))?.value);if(value)await el.selectOption(value);}else if(type==='checkbox')continue;else if(type==='date'){const dob=new Date();dob.setUTCFullYear(dob.getUTCFullYear()-2);await el.fill(dob.toISOString().slice(0,10));}else if(type==='datetime-local'){const d=new Date(Date.now()+7*86400000);await el.fill(d.toISOString().slice(0,16));}else await el.fill(type==='email'?'audit@example.test':type==='tel'?'+96890000000':'UI Verification');}}
for(const [name,id] of [['book-a-visit','tour-booking-form'],['apply-online','online-enrollment-form'],['contact','contact-inquiry-form']]){
 await check(`${name}: empty, dates and unavailable service`,async()=>{await p.goto(`${base}/${name}.html`,{waitUntil:'domcontentloaded'});const f=p.locator('#'+id);await f.locator('[type=submit]').click();assert.equal(await p.locator('.form-status').getAttribute('data-state'),'error');await fillForm(f);const dob=f.locator('input[type=date]');await dob.fill('2099-01-01');assert.equal(await dob.evaluate(e=>e.checkValidity()),false);await fillForm(f);if(name==='book-a-visit'){await f.locator('[type=datetime-local]').fill('2020-01-01T10:00');assert.equal(await f.evaluate(e=>e.checkValidity()),false);await fillForm(f);}await f.locator('[type=submit]').click();assert.match(await p.locator('.form-status').textContent(),/Nothing has been sent/);assert.equal(await f.locator('input[type=text]').first().inputValue(),'UI Verification');await p.screenshot({path:`${out}/${name}-unavailable.png`,animations:'disabled'});});
 await check(`${name}: HTTP failure, malformed receipt, network failure and confirmed receipt`,async()=>{
  await p.goto(`${mockBase}/${name}.html`,{waitUntil:'domcontentloaded'});const f=p.locator('#'+id);await fillForm(f);let responseMode='error',requests=[];
  await p.route('**/api/submissions',async route=>{requests.push(route.request().postDataJSON());if(responseMode==='network')await route.abort('failed');else await route.fulfill({status:responseMode==='error'?503:200,contentType:'application/json',body:JSON.stringify(responseMode==='success'?{success:true,reference:'AUDIT-123'}:{success:false})});});
  for(const mode of ['error','malformed','network']){responseMode=mode;await f.locator('[type=submit]').click();await p.waitForFunction(()=>document.querySelector('.form-status')?.dataset.state==='error');assert.equal(await f.locator('input[type=text]').first().inputValue(),'UI Verification');assert.equal(await f.locator('[type=submit]').isEnabled(),true);}
  responseMode='success';await f.locator('[type=submit]').click();await p.waitForFunction(()=>document.querySelector('.form-status')?.dataset.state==='success');assert.match(await p.locator('.form-status').textContent(),/AUDIT-123/);assert.equal(await f.locator('input[type=text]').first().inputValue(),'');assert.equal(requests.length,4);assert.equal(typeof requests[0].fields,'object');assert.ok(['tour','enrollment','inquiry'].includes(requests[0].type));await p.screenshot({path:`${out}/${name}-receipt.png`,animations:'disabled'});await p.unroute('**/api/submissions');
 });
}
await check('Age mismatch is rejected',async()=>{await p.goto(base+'/apply-online.html',{waitUntil:'domcontentloaded'});await fillForm(p.locator('#online-enrollment-form'));await p.locator('#app-attendance-schedule').selectOption({index:1});assert.equal(await p.locator('#app-child-dob').evaluate(e=>e.checkValidity()),false);});
await check('No browser runtime errors',async()=>assert.deepEqual(errors,[]));
fs.writeFileSync(`${out}/verification.json`,JSON.stringify(results,null,2));await browser.close();console.log(`Passed ${results.filter(r=>r.pass).length}/${results.length}`);process.exitCode=results.some(r=>!r.pass)?1:0;
