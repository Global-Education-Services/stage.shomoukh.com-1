import {chromium} from 'playwright';import fs from 'node:fs';import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'chrome',headless:true});const results=[];
for(const baseline of [true,false])for(const width of [320,1440]){
 const context=await browser.newContext({viewport:{width,height:800}});
 if(baseline)await context.route('**/ui-dialogs.js*',route=>route.fulfill({body:fs.readFileSync('audit-results/current-qa/dialogs.before.js','utf8'),contentType:'text/javascript'}));
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:5174/index.html',{waitUntil:'load'});
 const row={baseline,width};
 const focus=()=>page.evaluate(()=>({id:document.activeElement.id,cls:document.activeElement.className,hidden:!!document.activeElement.closest('[aria-hidden="true"],[inert]')}));
 row.initialInert=await page.locator('#offcanvas-drawer').evaluate(e=>e.inert);
 await page.locator('#menu-toggle-btn').click();await page.locator('#menu-close-btn').focus();await page.keyboard.press('Shift+Tab');row.openContained=await page.evaluate(()=>!!document.activeElement.closest('#offcanvas-drawer'));
 await page.keyboard.press('Escape');row.closeInert=await page.locator('#offcanvas-drawer').evaluate(e=>e.inert);row.restoredFocus=await focus();await page.keyboard.press('Tab');row.immediateTabFocus=await focus();
 await page.locator('#menu-toggle-btn').click();row.reopenInert=await page.locator('#offcanvas-drawer').evaluate(e=>e.inert);row.reopenContained=true;for(let i=0;i<30;i++){await page.keyboard.press('Tab');if(!await page.evaluate(()=>!!document.activeElement.closest('#offcanvas-drawer')))row.reopenContained=false;}
 await page.keyboard.press('Escape');await page.waitForTimeout(400);
 await page.locator('#search-open-btn').click();await page.keyboard.press('Escape');row.searchCloseInert=await page.locator('#search-modal').evaluate(e=>e.inert);await page.keyboard.press('Tab');row.searchImmediateTabFocus=await focus();await page.locator('#search-open-btn').click();row.searchReopenContained=await page.evaluate(()=>!!document.activeElement.closest('#search-modal'));row.searchReopenInert=await page.locator('#search-modal').evaluate(e=>e.inert);
 row.errors=errors;results.push(row);await context.close();
}
await browser.close();fs.writeFileSync('audit-results/current-qa/dialog-independent-results.json',JSON.stringify(results,null,2));
for(const r of results){if(r.baseline)assert.equal(r.immediateTabFocus.hidden,true,'Baseline bug must reproduce');else{assert(r.initialInert&&r.closeInert&&r.searchCloseInert);assert.equal(r.immediateTabFocus.hidden,false);assert.equal(r.searchImmediateTabFocus.hidden,false);assert.equal(r.reopenInert,false);assert.equal(r.searchReopenInert,false);assert(r.openContained&&r.reopenContained&&r.searchReopenContained);assert.equal(r.restoredFocus.id,'menu-toggle-btn');assert.equal(r.errors.length,0);}}
console.log(JSON.stringify(results,null,2));
