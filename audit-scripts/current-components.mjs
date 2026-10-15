import {chromium} from 'playwright';
import fs from 'node:fs';
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
const p=await browser.newPage();p.setDefaultTimeout(12000);
const result={checks:[],errors:[]};p.on('pageerror',e=>result.errors.push(e.message));
const base='http://127.0.0.1:5174',out='audit-results/current-components';
const metrics=async(selector)=>p.locator(selector).evaluate(el=>{const r=el.getBoundingClientRect();return{top:r.top,right:r.right,bottom:r.bottom,left:r.left,width:r.width,height:r.height,scrollWidth:el.scrollWidth,clientWidth:el.clientWidth,viewportWidth:innerWidth,viewportHeight:innerHeight}});
for(const width of [320,360,375,390,414,768,1024,1280,1440,1920,2560]){
 await p.setViewportSize({width,height:800});
 await p.goto(base+'/index.html',{waitUntil:'domcontentloaded'});
 await p.locator('#menu-toggle-btn').click();await p.waitForTimeout(350);
 const menu={width,type:'menu',close:await metrics('#menu-close-btn'),overflow:await p.evaluate(()=>document.documentElement.scrollWidth-innerWidth)};
 for(const toggle of await p.locator('.submenu-toggle-btn').all()){await toggle.click();const submenu=await toggle.evaluate(e=>{const list=e.closest('.drawer-menu-item').querySelector('.submenu-dropdown');return{height:list.getBoundingClientRect().height,scroll:list.scrollHeight,client:list.clientHeight,inert:list.inert};});if(submenu.scroll>submenu.client+2)menu.clippedSubmenu=submenu;}
 if([320,1440].includes(width))await p.screenshot({path:`${out}/before-menu-${width}.png`});
 await p.keyboard.press('Escape');await p.waitForTimeout(350);menu.focusAfter=await p.evaluate(()=>document.activeElement.id);result.checks.push(menu);
 await p.locator('#search-open-btn').click();await p.waitForTimeout(350);await p.locator('#search-input').fill('nonexistent');await p.locator('.search-submit-btn').click();
 result.checks.push({width,type:'search-no-results',panel:await metrics('.search-modal-content'),submit:await metrics('.search-submit-btn'),close:await metrics('#search-close-btn')});
 if([320,1440].includes(width))await p.screenshot({path:`${out}/before-search-${width}.png`});
 await p.keyboard.press('Escape');await p.waitForTimeout(350);
 await p.locator('.pursue-item-card').first().click();await p.waitForTimeout(350);
 result.checks.push({width,type:'detail',panel:await metrics('.detail-modal-card'),close:await metrics('#detail-modal-close')});
 if([320,1440].includes(width))await p.screenshot({path:`${out}/before-detail-${width}.png`});
 await p.keyboard.press('Escape');
}
fs.writeFileSync(`${out}/before.json`,JSON.stringify(result,null,2));await browser.close();console.log(JSON.stringify(result,null,2));
