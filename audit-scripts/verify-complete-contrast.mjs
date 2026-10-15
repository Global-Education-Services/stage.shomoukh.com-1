import {chromium} from 'playwright';import fs from 'node:fs';
const b=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});const p=await b.newPage({viewport:{width:1440,height:900}});const results=[];
for(const name of ['index','about','programs','enrichments','spaces','admissions','book-a-visit','apply-online','parents','contact']){
 await p.goto(`http://127.0.0.1:5182/${name}.html`,{waitUntil:'domcontentloaded'});
 results.push({name,checks:await p.evaluate(()=>{
  function rgba(s){const x=s.match(/[\d.]+/g)?.map(Number);return x?.length>=3?[...x.slice(0,3),x[3]??1]:[0,0,0,0];}
  function background(el){let c=[255,255,255,1];const chain=[];for(let e=el;e;e=e.parentElement)chain.unshift(e);for(const e of chain){const s=getComputedStyle(e);if(s.backgroundImage!=='none')return null;const b=rgba(s.backgroundColor);c=b.slice(0,3).map((v,i)=>v*b[3]+c[i]*(1-b[3])).concat(1);}return c;}
  const luminance=c=>c.slice(0,3).map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);
  return [...document.querySelectorAll('.page-task-link,.btn-secondary-small,#application-progress button,.directions-link,.admissions-fee-link,.badge-pill,.btn-primary-coral,.btn-form-submit,.btn-play-video,.tile-inquire,.tile-inquire .tile-title,.tile-inquire .tile-sub,.btn-platform-action,.booking-info-box p,.required,[style*="color: var(--shomoukh-coral-ink)"]')].filter(e=>!e.closest('[inert],[hidden]')&&e.getClientRects().length&&getComputedStyle(e).visibility==='visible').map(e=>{
   const s=getComputedStyle(e),bg=background(e),fg=rgba(s.color);if(!bg)return null;const lum=[luminance(fg),luminance(bg)].sort((a,b)=>b-a);const ratio=(lum[0]+.05)/(lum[1]+.05);const large=parseFloat(s.fontSize)>=24||(parseFloat(s.fontSize)>=18.66&&Number(s.fontWeight)>=700);return {text:e.textContent.trim().slice(0,65),class:e.className,fg:s.color,ratio:Math.round(ratio*100)/100,required:large?3:4.5,pass:ratio>=(large?3:4.5)};
  }).filter(Boolean);
 })});
}
fs.writeFileSync('audit-results/complete-ui-2026-10-15/contrast.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results.flatMap(p=>p.checks.filter(c=>!c.pass).map(c=>({page:p.name,...c}))),null,2));await b.close();
