import {chromium} from 'playwright';import assert from 'node:assert/strict';import fs from 'node:fs';
const b=await chromium.launch({channel:'chrome',headless:true});const p=await b.newPage();const results=[];
async function check(name,fn){try{await fn();results.push({name,pass:true})}catch(e){results.push({name,pass:false,error:e.message})}}
for(const width of [320,1440]){
 await p.setViewportSize({width,height:800});await p.goto('http://127.0.0.1:5174/index.html',{waitUntil:'domcontentloaded'});
 await check(`drawer keyboard containment ${width}`,async()=>{await p.locator('#menu-toggle-btn').click();await p.locator('#menu-close-btn').focus();await p.keyboard.press('Shift+Tab');assert(await p.evaluate(()=>!!document.activeElement.closest('#offcanvas-drawer')));await p.keyboard.press('Escape');await p.locator('#menu-toggle-btn').focus();await p.keyboard.press('Tab');assert.equal(await p.evaluate(()=>!!document.activeElement.closest('[aria-hidden="true"],[inert]')),false)});
 await check(`search empty and keyboard containment ${width}`,async()=>{await p.locator('#search-open-btn').click();await p.locator('#search-form').evaluate(f=>f.requestSubmit());assert.match(await p.locator('#search-results').textContent(),/Enter a topic/);await p.locator('#search-close-btn').focus();await p.keyboard.press('Shift+Tab');assert(await p.evaluate(()=>!!document.activeElement.closest('#search-modal')));await p.locator('#search-close-btn').click();assert.equal(await p.evaluate(()=>document.activeElement.id),'search-open-btn')});
 await check(`scroll to top ${width}`,async()=>{await p.evaluate(()=>scrollTo(0,1000));await p.waitForTimeout(200);assert(await p.locator('#scroll-to-top').evaluate(e=>e.classList.contains('visible')));await p.locator('#scroll-to-top').click();await p.waitForFunction(()=>scrollY<5)});
 await p.goto('http://127.0.0.1:5174/contact.html',{waitUntil:'domcontentloaded'});
 await check(`contact character count ${width}`,async()=>{await p.locator('#contact-message').fill('UI audit message');assert.equal(await p.locator('#contact-char-count').textContent(),'16')});
}
fs.writeFileSync('audit-results/current-qa/supplemental.json',JSON.stringify(results,null,2));console.log(results);await b.close();process.exitCode=results.some(r=>!r.pass)?1:0;
