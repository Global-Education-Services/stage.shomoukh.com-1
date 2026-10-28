import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
const base = process.env.CHATBOT_TEST_URL || 'http://127.0.0.1:5174';
const browser = await chromium.launch({headless: true, ...(process.env.CHROMIUM_EXECUTABLE ? {executablePath: process.env.CHROMIUM_EXECUTABLE} : {})});
const results = [];
await mkdir('test-results', {recursive:true});
try {
  for (const viewport of [{width:1440,height:1000},{width:390,height:844},{width:320,height:568},{width:844,height:390}]) {
    const context = await browser.newContext({viewport});
    // Existing site font/icon CDNs are unrelated to the local chatbot.
    await context.route('**/*', route => new URL(route.request().url()).origin === new URL(base).origin ? route.continue() : route.abort());
    const page = await context.newPage();
    const errors = [];
    const chatRequests = [];
    const relatedSourceRequests = [];
    page.on('request', r => { if (new URL(r.url()).hostname.endsWith('ges.om')) relatedSourceRequests.push(r.url()); });
    page.on('pageerror', e => errors.push(e.message));
    page.on('request', r => { if (/chatbot\/(widget|engine|knowledge)|assets\/widget/.test(r.url())) chatRequests.push(r.url()); });
    await page.goto(base, {waitUntil:'domcontentloaded'});
    const launcher = page.getByRole('button', {name:'Open Shomoukh website assistant'});
    await launcher.waitFor();
    assert.equal(chatRequests.length,0,'Chat data must be lazy loaded');
    await launcher.focus();
    await page.keyboard.press('Enter');
    const dialog = page.getByRole('dialog', {name:'Shomoukh assistant'});
    await dialog.waitFor();
    const input = page.getByLabel('Ask about Shomoukh');
    assert.equal(await input.evaluate(el=>document.activeElement===el),true);
    await dialog.evaluate(el => Promise.all(el.getAnimations().map(animation => animation.finished)));
    const bounds = await dialog.boundingBox();
    assert.ok(bounds.x>=0 && bounds.y>=0 && bounds.x+bounds.width<=viewport.width+1 && bounds.y+bounds.height<=viewport.height+1,`dialog fits viewport ${JSON.stringify({viewport,bounds})}`);
    const ask = async text => {
      const count = await page.locator('.school-chat-assistant').count();
      await input.fill(text);
      await input.press('Enter');
      await page.waitForFunction(count=>document.querySelectorAll('.school-chat-assistant').length>count && !document.querySelector('.school-chat-typing'),count);
      return page.locator('.school-chat-assistant').last().innerText();
    };
    assert.match(await ask('How can I contact Al Mouj?'),/24555515|almouj|Al Mouj/i);
    for (const href of await dialog.locator('a').evaluateAll(links=>links.map(a=>a.getAttribute('href')))) {
      const response = await context.request.get(base+href.split('#')[0]);
      assert.equal(response.status(),200,'source resolves');
    }
    assert.match(await ask('who is. shk julanda'), /Vice President/);
    const officialLink = dialog.locator('a[href="https://www.ges.om/about.php"]').last();
    assert.equal(await officialLink.count(), 1, 'Official GES citation is shown');
    if(viewport.width===390) await page.screenshot({path:'test-results/julanda-answer-mobile.png'});
    assert.equal(await officialLink.getAttribute('target'), '_blank');
    assert.match(await officialLink.getAttribute('rel'), /noopener/);
    assert.match(await ask('What is his role?'), /Vice President/);
    for (const [question,name] of [['who is md','Jinan'],['who vp?','Julanda'],['ceo?','Janat']]) assert.ok((await ask(question)).includes(name), question);
    const personalPhone = await ask('phone?');
    assert.match(personalPhone, /personal contact/);
    assert.doesNotMatch(personalPhone, /24555515|24600610/);
    assert.match(await ask('qurm programs'), /general program/);
    assert.match(await ask('email?'), /info.alqurum/);
    let campusLinks = await page.locator('.school-chat-assistant').last().locator('a').evaluateAll(links=>links.map(link=>link.getAttribute('href')));
    assert.deepEqual(campusLinks, ['/contact#alqurm']);
    assert.match(await ask('hrs?'), /7:00 AM/);
    if(viewport.width===390) await page.screenshot({path:'test-results/short-campus-questions-mobile.png'});
    assert.match(await ask('whr is alqurm'), /Al Suraj/);
    let interpreted = await page.locator('.school-chat-assistant').last().locator('.school-chat-interpretation').innerText();
    assert.match(interpreted, /Understood as: where is al qurm/);
    assert.match(await ask('emal?'), /info.alqurum/);
    assert.match(await ask('whos managin director of ges'), /Jinan/);
    interpreted = await page.locator('.school-chat-assistant').last().locator('.school-chat-interpretation').innerText();
    assert.match(interpreted, /managing director/);
    if(viewport.width===390) await page.screenshot({path:'test-results/autocorrect-mobile.png'});
    const pizza=await ask('pizza');
    assert.match(pizza,/couldn’t find/);
    assert.doesNotMatch(pizza,/Central Square|Piazza/);
    assert.match(await ask('What time do you close?'), /4:00 PM/);
    const gesHours = await ask('When does GES close?');
    assert.match(gesHours, /do not publish/);
    assert.doesNotMatch(gesHours, /7:00 AM|4:00 PM/);
    assert.equal(relatedSourceRequests.length, 0, 'Related facts use local snapshots, not live requests');
    assert.match(await ask('What programs do you offer?'),/program|EYFS|Reggio|Infant/i);
    assert.match(await ask('What about the fees?'),/not|contact|publish|available/i);
    assert.match(await ask('How can I apply?'),/apply|admission|enrol/i);
    assert.match(await ask('Who won the world cup?'),/couldn|cannot|could not|don.t|not|website|clarif/i);
    await ask('<img src=x onerror="window.chatbotXSS=true">');
    assert.equal(await page.evaluate(()=>window.chatbotXSS),undefined);
    assert.equal(await dialog.locator('img,script').count(),0,'query rendered as text');
    assert.match(await ask('ما هي الرسوم؟'),/English|Arabic|available/i);
    await context.setOffline(true);
    assert.match(await ask('Who is Sheikh Julanda?'), /Vice President/);
    assert.match(await ask('whr r u'),/Muscat|Mouj|Qurm|campus/i);
    await context.setOffline(false);
    await page.getByRole('button',{name:'Reset conversation'}).click();
    assert.equal(await page.locator('.school-chat-user').count(),0);
    await input.press('Escape');
    assert.equal(await dialog.isVisible(),false);
    assert.equal(await launcher.evaluate(el=>el===document.activeElement),true);
    await launcher.click();
    await dialog.evaluate(el => Promise.all(el.getAnimations().map(animation => animation.finished)));
    await page.screenshot({path:`test-results/chat-${viewport.width}x${viewport.height}.png`});
    assert.deepEqual(errors,[],'No uncaught browser errors');
    results.push({viewport,passed:true});
    await context.close();
  }
  // Every existing public entry point gets the launcher.
  for (const name of ['about','admissions','apply-online','book-a-visit','contact','enrichments','parents','programs','spaces']) {
    const page=await browser.newPage();
    await page.goto(`${base}/${name}`,{waitUntil:'domcontentloaded'});
    await page.locator('#school-chat-launcher').waitFor();
    await page.close();
  }
  await writeFile('test-results/browser-report.json', JSON.stringify({results,publicPages:10},null,2));
  console.log(`PASS: ${results.length} desktop/mobile viewports; all 10 pages; lazy loading, keyboard, XSS, sources, context, and offline replies.`);
} finally { await browser.close(); }
