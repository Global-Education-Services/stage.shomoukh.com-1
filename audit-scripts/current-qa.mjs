import { chromium } from 'playwright';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const base=process.env.AUDIT_BASE_URL||'http://127.0.0.1:5174';
const out='audit-results/current-qa';fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
const page=await browser.newPage();page.setDefaultTimeout(5000);const results=[],runtime=[],consoleErrors=[],linkIssues=[];
page.on('pageerror',e=>runtime.push({url:page.url(),error:e.message}));page.on('console',m=>{if(m.type()==='error')consoleErrors.push({url:page.url(),error:m.text()})});
const names=['index','about','programs','enrichments','spaces','admissions','book-a-visit','apply-online','parents','contact'];
async function check(name,fn){try{await fn();results.push({name,pass:true})}catch(e){results.push({name,pass:false,error:e.message})}console.log(JSON.stringify(results.at(-1)))}
for(const name of names){await page.goto(`${base}/${name}.html`,{waitUntil:'domcontentloaded'});
 const links=await page.locator('a[href]').evaluateAll(els=>els.map(e=>e.getAttribute('href')));
 for(const href of new Set(links)){if(!href||!href.startsWith('/')&&!href.startsWith('#'))continue;const url=new URL(href,page.url());const file=url.pathname==='/'?'index.html':url.pathname.slice(1);if(!fs.existsSync(file)&&!fs.existsSync('public/'+file)){linkIssues.push({page:name,href,error:'missing file'});continue}if(url.hash&&file.endsWith('.html')){const html=fs.readFileSync(file,'utf8');const id=decodeURIComponent(url.hash.slice(1));if(!html.includes(`id="${id}"`)&&!html.includes(`id='${id}'`))linkIssues.push({page:name,href,error:'missing anchor'})}}
 for(const width of [320,360,375,390,414,768,1024,1280,1440,1920,2560]){await page.setViewportSize({width,height:900});await page.goto(`${base}/${name}.html`,{waitUntil:'domcontentloaded'});
 await check(`${name} ${width}: navigation, search, keyboard, scrolling`,async()=>{
 await page.locator('#menu-toggle-btn').click();assert.equal(await page.locator('#offcanvas-drawer').getAttribute('aria-hidden'),'false');assert.equal(await page.evaluate(()=>document.activeElement.id),'menu-close-btn');
 for(const toggle of await page.locator('.submenu-toggle-btn').all()){await toggle.click();assert.equal(await toggle.getAttribute('aria-expanded'),'true');const submenu=toggle.locator('..').locator('.submenu-dropdown');if(await submenu.count())assert.equal(await submenu.evaluate(e=>e.inert),false)}
 await page.keyboard.press('Escape');assert.equal(await page.locator('#offcanvas-drawer').getAttribute('aria-hidden'),'true');assert.equal(await page.evaluate(()=>document.activeElement.id),'menu-toggle-btn');
 await page.locator('#search-open-btn').click();await page.locator('#search-input').fill('zzzauditnomatch');await page.locator('#search-form').evaluate(e=>e.requestSubmit());assert.match(await page.locator('#search-results').textContent(),/No matching/);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>document.activeElement.id),'search-open-btn');
 await page.evaluate(()=>scrollTo(0,600));await page.waitForTimeout(70);assert.equal(await page.locator('#site-header').evaluate(e=>e.classList.contains('scrolled')),true);
 });
 }
}
await check('Internal links and fragments resolve',async()=>assert.deepEqual(linkIssues,[]));
for(const [name,form]of [['contact','contact-inquiry-form'],['book-a-visit','tour-booking-form'],['apply-online','online-enrollment-form']])await check(`${name}: empty form validation`,async()=>{await page.goto(`${base}/${name}.html`,{waitUntil:'domcontentloaded'});assert.equal(await page.locator('#'+form).evaluate(f=>f.checkValidity()),false);await page.locator(`#${form} [type=submit]`).click();assert.equal(await page.locator('#toast-feedback').evaluate(e=>e.classList.contains('show')),false)});
await check('Search matching topic navigates',async()=>{await page.goto(base+'/index.html');await page.locator('#search-open-btn').click();await page.locator('#search-input').fill('tour');await page.locator('#search-form').evaluate(f=>f.requestSubmit());await page.waitForURL('**/book-a-visit.html')});
await check('No runtime errors',async()=>assert.deepEqual(runtime,[]));
fs.writeFileSync(out+'/qa.json',JSON.stringify({results,runtime,consoleErrors,linkIssues},null,2));await browser.close();console.log(`Passed ${results.filter(r=>r.pass).length}/${results.length}`);process.exitCode=results.some(r=>!r.pass)?1:0;
