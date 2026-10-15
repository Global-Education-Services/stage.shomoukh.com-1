import {chromium} from 'playwright';import fs from 'node:fs';import assert from 'node:assert/strict';
const base=process.env.AUDIT_BASE_URL||'http://127.0.0.1:5174',out='audit-results/form-repairs';fs.mkdirSync(out,{recursive:true});
const b=await chromium.launch({channel:'chrome',headless:true});const p=await b.newPage();const results=[],errors=[],posts=[];p.on('pageerror',e=>errors.push(e.message));await p.route('**/*',r=>{if(r.request().method()==='POST'){posts.push(r.request().url());return r.abort()}return r.continue()});
async function check(name,fn){try{await fn();results.push({name,pass:true})}catch(e){results.push({name,pass:false,error:e.message})}}
for(const width of [320,360,375,390,414,768,1024,1280,1440,1920,2560])for(const [name,id]of [['contact','contact-inquiry-form'],['book-a-visit','tour-booking-form'],['apply-online','online-enrollment-form']]){
 await p.setViewportSize({width,height:800});await p.goto(`${base}/${name}.html`,{waitUntil:'domcontentloaded'});const form=p.locator('#'+id);
 await check(`${name} validation and retained unavailable feedback ${width}`,async()=>{
 await form.locator('[type=submit]').click();assert.equal(await p.locator('#toast-feedback').evaluate(e=>e.classList.contains('show')),false);
 for(const el of await form.locator('input[required],select[required],textarea[required]').all()){
 const tag=await el.evaluate(e=>e.tagName),type=await el.getAttribute('type');
 if(tag==='SELECT')await el.selectOption(await el.evaluate(e=>[...e.options].find(o=>o.value&&!o.disabled).value));
 else await el.fill(type==='email'?'audit@example.test':type==='tel'?'+96890000000':type==='date'?'2024-01-15':type==='datetime-local'?'2030-01-15T10:00':'UI Audit');
 }
 assert.equal(await form.evaluate(f=>f.checkValidity()),true);const values=await form.evaluate(f=>[...new FormData(f).entries()]);
 await form.locator('[type=submit]').click();await p.waitForTimeout(400);assert.match(await p.locator('#toast-message').textContent(),/Nothing has been sent/);assert.deepEqual(await form.evaluate(f=>[...new FormData(f).entries()]),values);
 const r=await p.locator('#toast-feedback').evaluate(e=>{const r=e.getBoundingClientRect();return{left:r.left,right:r.right,bottom:r.bottom,width:innerWidth,height:innerHeight}});assert(r.left>=0&&r.right<=r.width&&r.bottom<=r.height);
 if([320,1440].includes(width))await p.screenshot({path:`${out}/${name}-${width}.png`});
 });
}
for(const params of ['?inquiry=Fees&subject=Please%20send%20your%20fee%20schedule.','?inquiry=Parent%20portal','?subject=%3Cscript%3Ealert(1)%3C/script%3E','?subject='+('A'.repeat(250))])await check('contact prefill '+params.slice(0,50),async()=>{await p.goto(base+'/contact.html'+params,{waitUntil:'domcontentloaded'});const q=new URLSearchParams(params),expected=(q.get('subject')||q.get('inquiry')).slice(0,180);assert.equal(await p.locator('#contact-message').inputValue(),expected);assert.equal(await p.locator('#contact-char-count').textContent(),String(expected.length));assert.equal(await p.locator('#contact-message script').count(),0)});
await check('No unexpected submission or JavaScript errors',async()=>{assert.deepEqual(posts,[]);assert.deepEqual(errors,[])});
fs.writeFileSync(out+'/verification.json',JSON.stringify({results,errors,posts},null,2));console.log(JSON.stringify({passed:results.filter(x=>x.pass).length,total:results.length,failures:results.filter(x=>!x.pass)},null,2));await b.close();process.exitCode=results.some(x=>!x.pass)?1:0;
