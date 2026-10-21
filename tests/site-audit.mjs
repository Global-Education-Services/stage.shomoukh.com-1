import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const base=process.env.SITE_TEST_URL||'http://127.0.0.1:5174';
const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_EXECUTABLE?{executablePath:process.env.CHROMIUM_EXECUTABLE}:{})});
const pages=['','about','programs','enrichments','spaces','admissions','book-a-visit','apply-online','parents','contact'];
const checks=[];
await fs.mkdir('test-results',{recursive:true});
try {
 for(const width of [1440,390,320]){
  const context=await browser.newContext({viewport:{width,height:900},hasTouch:width<600,isMobile:width<600});
  await context.route('**/*',route=>new URL(route.request().url()).origin===new URL(base).origin?route.continue():route.abort());
  for(const name of pages){
   console.log('CHECK',width,name||'home');
   const page=await context.newPage(),errors=[];
   page.on('pageerror',error=>errors.push(error.message));
   const missingAssets=[];page.on('response',response=>{if(new URL(response.url()).origin===new URL(base).origin&&response.status()>=400)missingAssets.push(response.url());});
   await page.goto(base+(name?`/${name}.html`:'/'),{waitUntil:'domcontentloaded'});
   const launcher=page.locator('#school-chat-launcher');await launcher.waitFor();
   assert.equal(await page.getByRole('main').count(),1);assert.equal(await page.getByRole('link',{name:'Skip to content'}).getAttribute('href'),'#main-content');
   const language=page.getByLabel('Select language'),search=page.getByRole('button',{name:'Open search modal'});
   const lb=await language.boundingBox(),sb=await search.boundingBox(),logo=await page.locator('.brand-logo').boundingBox(),menu=await page.locator('#menu-toggle-btn').boundingBox();
   assert.ok(lb.x+lb.width<=sb.x+1,'Language selector before search');
   assert.ok(logo.x+logo.width<=lb.x+1,`Logo overlaps language at ${width} ${name}`);
   assert.ok(menu.x+menu.width<=width+1,`Header exceeds viewport ${width} ${name}`);
   if(width<600)assert.ok(await language.evaluate(element=>parseFloat(getComputedStyle(element).fontSize))>=16,'Mobile select prevents input zoom');
   assert.equal(await page.locator('.chat-widget-pill,.hero-bottom-actions').count(),0);
   const overflow=await page.locator('input,select,textarea,button,a').evaluateAll(elements=>elements.filter(element=>element.getClientRects().length&&!element.closest('[aria-hidden=\"true\"]')&&getComputedStyle(element).visibility!=='hidden').filter(element=>{const rect=element.getBoundingClientRect();return rect.right>innerWidth+2||rect.left< -2;}).map(element=>element.id||element.outerHTML.slice(0,100)));
   assert.deepEqual(overflow,[],`Visible controls fit at ${width} ${name}`);
   // Native validation stays enabled; submitted values are never falsely discarded.
   for(const form of await page.locator('form:not(#search-form)').all())assert.equal(await form.getAttribute('novalidate'),null);
   await search.click();await page.locator('#search-modal.open').waitFor();
   await page.waitForFunction(()=>document.activeElement?.id==='search-input');
   await page.keyboard.press('Escape');assert.equal(await search.evaluate(element=>document.activeElement===element),true);
   const menuButton=page.getByRole('button',{name:'Toggle Navigation Drawer'});await menuButton.click();
   const drawer=page.locator('#offcanvas-drawer');assert.equal(await drawer.getAttribute('aria-hidden'),'false');
   await page.waitForFunction(()=>document.activeElement?.id==='menu-close-btn');
   for(const toggle of await drawer.locator('.submenu-toggle-btn').all()){
    const submenu=toggle.locator('..').locator('.submenu-dropdown');
    assert.equal(await submenu.evaluate(element=>getComputedStyle(element).visibility),'hidden','Collapsed links cannot receive keyboard focus');
    await toggle.click();
    assert.equal(await toggle.getAttribute('aria-expanded'),'true');
    assert.equal(await submenu.evaluate(element=>getComputedStyle(element).visibility),'visible');
    assert.ok(await submenu.evaluate(element=>element.scrollHeight<=element.clientHeight+1),'Expanded submenu does not clip lower links');
    await toggle.click();
   }
   await page.keyboard.press('Shift+Tab');assert.equal(await drawer.evaluate(element=>element.contains(document.activeElement)),true);
   await page.keyboard.press('Escape');assert.equal(await menuButton.evaluate(element=>document.activeElement===element),true);
   assert.deepEqual(missingAssets,[],`${name} local asset errors`);
   assert.deepEqual(errors,[],`${name} runtime errors`);
   await drawer.evaluate(element=>Promise.all(element.getAnimations().map(animation=>animation.finished.catch(()=>{}))));
   if(!name)await page.screenshot({path:`test-results/site-home-${width}.png`});
   await page.close();
  }
  await context.close();checks.push({check:'ten-page responsive header, native validation and keyboard dialogs',width,passed:true});
 }
 const context=await browser.newContext();
 await context.route('**/*',route=>new URL(route.request().url()).origin===new URL(base).origin?route.continue():route.abort());
 const page=await context.newPage();await page.goto(base,{waitUntil:'domcontentloaded'});
 await page.getByRole('button',{name:'Open search modal'}).click();
 for(const [query,href]of [['contact page','/contact.html'],['registration','/admissions.html'],['facilities','/spaces.html']]){
  await page.getByLabel('Search this website').fill(query);await page.getByLabel('Search this website').press('Enter');
  await page.waitForFunction(()=>document.querySelector('.site-search-results [role=status]').textContent.includes('matching'));
  assert.ok((await page.locator('.site-search-results a').evaluateAll(links=>links.map(link=>link.getAttribute('href')))).some(url=>url.startsWith(href)),query);
 }
 await page.getByLabel('Search this website').fill('xyzzyunpublished123');await page.getByLabel('Search this website').press('Enter');
 await page.waitForFunction(()=>document.querySelector('.site-search-results [role=status]').textContent.includes('No matching'));
 await page.getByLabel('Search this website').fill('<img src=x onerror="window.auditXss=true">');await page.getByLabel('Search this website').press('Enter');
 assert.equal(await page.evaluate(()=>window.auditXss),undefined);assert.equal(await page.locator('.site-search-results img').count(),0);
 await page.keyboard.press('Escape');await page.getByLabel('Select language').selectOption('ar');
 assert.equal(await page.getByLabel('Select language').inputValue(),'en');await page.locator('#toast-feedback.show').waitFor();assert.match(await page.locator('#toast-message').innerText(),/Arabic content is not available/);
 for(const name of ['book-a-visit','apply-online','contact']){
  await page.goto(base+`/${name}.html`,{waitUntil:'domcontentloaded'});
  const form=page.locator('form:not(#search-form)').first();
  assert.equal(await form.evaluate(element=>element.checkValidity()),false);
  for(const field of await form.locator('[required]').all()){
   const type=await field.getAttribute('type'),tag=await field.evaluate(element=>element.tagName);
   if(tag==='SELECT')await field.selectOption(await field.locator('option').evaluateAll(options=>options.find(option=>option.value&&!option.disabled).value));
   else await field.fill(type==='email'?'audit@example.com':type==='date'?'2024-01-01':type==='datetime-local'?'2027-01-05T10:00':type==='tel'?'+968 90000000':'Audit sample');
  }
  const dob=form.locator('input[type=date][id*=dob]');
  if(await dob.count()){await dob.fill('2099-01-01');assert.equal(await dob.evaluate(element=>element.validity.rangeOverflow),true);await dob.fill('2024-01-01');}
  const visit=form.locator('input[type=datetime-local]');
  if(await visit.count()){await visit.fill('2000-01-01T10:00');assert.equal(await visit.evaluate(element=>element.validity.rangeUnderflow),true);await visit.fill('2027-01-05T10:00');}
  let submissions=0;const onRequest=request=>{if(request.method()==='POST')submissions++;};page.on('request',onRequest);
  await form.getByRole('button',{name:'Check request details'}).click();
  await page.waitForSelector('#toast-feedback.show');assert.match(await page.locator('#toast-message').innerText(),/not been sent/);
  assert.equal(await form.locator('input[type=text]').first().inputValue(),'Audit sample');assert.equal(submissions,0);page.off('request',onRequest);
 }
 await page.goto(base+'/enrichments.html',{waitUntil:'domcontentloaded'});
 for(const hash of ['tiny-town','sensory-play','music-drama'])assert.equal(await page.locator('#'+hash).count(),1);
 const detail=page.getByRole('button',{name:'Open Tiny Town details'});await detail.focus();await page.keyboard.press('Enter');
 await page.locator('#detail-modal.open').waitFor();await page.waitForFunction(()=>document.activeElement?.id==='detail-modal-close');
 await page.keyboard.press('Escape');assert.equal(await detail.evaluate(element=>document.activeElement===element),true);
 await context.close();checks.push({check:'search, unavailable language, truthful forms, anchors and detail focus',passed:true});
 const reduced=await browser.newContext({reducedMotion:'reduce'});const reducedPage=await reduced.newPage();const videoRequests=[];
 reducedPage.on('request',request=>{if(/\.mp4(?:$|\?)/.test(request.url()))videoRequests.push(request.url());});
 await reducedPage.goto(base,{waitUntil:'domcontentloaded'});await reducedPage.locator('#school-chat-launcher').waitFor();
 assert.equal(await reducedPage.locator('#hero-bg-video').getAttribute('src'),null);assert.equal(videoRequests.length,0,'Reduced motion does not download or autoplay background video');
 await reduced.close();checks.push({check:'reduced-motion video loading',passed:true});
 const noScript=await browser.newContext({javaScriptEnabled:false});const noScriptPage=await noScript.newPage();
 await noScriptPage.goto(base+'/contact.html',{waitUntil:'domcontentloaded'});
 assert.equal(await noScriptPage.locator('#contact-inquiry-form button[type=submit]').isDisabled(),true,'Forms cannot accidentally submit without their JavaScript guard');
 await noScript.close();checks.push({check:'no-script form submission guard',passed:true});
 await fs.writeFile('test-results/site-audit.json',JSON.stringify({checkedAt:new Date().toISOString(),checks},null,2)+'\n');
 console.log('PASS website audit: 10 pages × 3 viewports; search, forms, language, anchors and keyboard dialogs.');
} finally {await browser.close();}
