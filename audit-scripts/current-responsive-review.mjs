import {chromium} from 'playwright';import fs from 'node:fs';
const b=await chromium.launch({channel:'chrome',headless:true});const p=await b.newPage();fs.mkdirSync('audit-results/current-run/responsive-detail',{recursive:true});
for(const name of ['index','contact','book-a-visit','apply-online','parents']){
await p.setViewportSize({width:320,height:844});await p.goto(`http://127.0.0.1:5174/${name}.html`,{waitUntil:'load'});await p.evaluate(()=>document.fonts.ready);
await p.screenshot({path:`audit-results/current-run/responsive-detail/${name}-320-fold.png`});
const target=({index:'.hero-cta-group',contact:'.form-panel-card','book-a-visit':'.booking-form-panel','apply-online':'.application-card-wrapper',parents:'.parents-platform-card'})[name];
await p.locator(target).first().screenshot({path:`audit-results/current-run/responsive-detail/${name}-320-component.png`});
}await b.close();
