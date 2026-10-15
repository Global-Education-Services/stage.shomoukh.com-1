import { chromium } from 'playwright';
import fs from 'node:fs';
const dir='audit-results/current-qa';
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
const tests=[];
for(const baseline of [true,false]){
const context=await browser.newContext();
if(baseline)for(const [name,file] of [['style.css','style.before.css'],['design.css','design.before.css'],['main.js','main.before.js'],['ui-dialogs.js','dialogs.before.js']])await context.route('**/'+name+'*',route=>route.fulfill({body:fs.readFileSync(dir+'/'+file),contentType:name.endsWith('.css')?'text/css':'text/javascript'}));
const p=await context.newPage();
for(const width of [320,414,768,1024,1440,2560]){
await p.setViewportSize({width,height:800}); await p.goto('http://127.0.0.1:5174/',{waitUntil:'domcontentloaded'});
await p.locator('#menu-toggle-btn').click();await p.waitForTimeout(600);
for(const toggle of await p.locator('.submenu-toggle-btn').all()){
 await toggle.click();await p.waitForTimeout(600);
 const result=await toggle.evaluate(e=>{const sub=e.closest('.drawer-menu-item').querySelector('.submenu-dropdown');return {label:e.textContent.trim(),client:sub.clientHeight,scroll:sub.scrollHeight,inert:sub.inert,overflow:getComputedStyle(sub).overflowY};});tests.push({baseline,width,type:'submenu',...result});
}
await p.locator('#menu-close-btn').evaluate(e=>e.scrollIntoView()); await p.waitForTimeout(150);
await p.screenshot({path:`${dir}/review-${baseline?'before':'after'}-menu-${width}.png`});
await p.keyboard.press('Escape'); await p.waitForTimeout(500); tests.push({baseline,width,type:'escape-menu',expanded:await p.locator('#menu-toggle-btn').getAttribute('aria-expanded'),focus:await p.evaluate(()=>document.activeElement.id)});
await p.locator('#search-open-btn').click();await p.waitForTimeout(500);await p.locator('#search-input').fill('nonexistent');await p.locator('.search-submit-btn').click();await p.screenshot({path:`${dir}/review-${baseline?'before':'after'}-search-${width}.png`});await p.keyboard.press('Escape');
}
for(const width of [320,1024,1440]){
await p.setViewportSize({width,height:360});await p.goto('http://127.0.0.1:5174/',{waitUntil:'domcontentloaded'});await p.locator('#search-open-btn').click();await p.waitForTimeout(500);await p.locator('#search-input').fill('nonexistent');await p.locator('.search-submit-btn').click();
tests.push({baseline,width,type:'short-search',...await p.locator('.search-modal-content').evaluate(e=>{const r=e.getBoundingClientRect();return {top:r.top,bottom:r.bottom,viewport:innerHeight,client:e.clientHeight,scroll:e.scrollHeight,overflow:getComputedStyle(e).overflowY};})});await p.screenshot({path:`${dir}/review-${baseline?'before':'after'}-short-search-${width}.png`});
}
await context.close();
}
fs.writeFileSync(dir+'/independent-results.json',JSON.stringify(tests,null,2));await browser.close();
