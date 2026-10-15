import {chromium} from 'playwright';import fs from 'node:fs';
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});const p=await browser.newPage({viewport:{width:1024,height:360}});
await p.goto('http://127.0.0.1:5174/index.html',{waitUntil:'domcontentloaded'});await p.locator('#search-open-btn').click();await p.waitForTimeout(350);await p.locator('#search-input').fill('nonexistent');await p.locator('.search-submit-btn').click();
const metrics=await p.locator('.search-modal-content').evaluate(e=>{const r=e.getBoundingClientRect();return {top:r.top,bottom:r.bottom,height:r.height,viewport:innerHeight,clientHeight:e.clientHeight,scrollHeight:e.scrollHeight}});console.log(metrics);
await p.screenshot({path:'audit-results/current-components/short-search-before.png'});fs.writeFileSync('audit-results/current-components/short-search-before.json',JSON.stringify(metrics,null,2));await browser.close();
