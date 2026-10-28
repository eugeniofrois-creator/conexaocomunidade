import {chromium,firefox} from 'playwright-core';
import assert from 'node:assert/strict';
import {prepareFixture,FakeContents,password} from './fixture.mjs';

const fixture=await prepareFixture();
const names=(process.env.PAGES_BROWSERS||'chromium,firefox').split(',');
const pixel=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a/TsAAAAASUVORK5CYII=','base64');
try{
  assert(!fixture.configText.includes('fixture-token-not-a-real-credential'),'published configuration keeps its current token envelope');
  for(const name of names){
    const engine={chromium,firefox}[name];assert(engine,'Supported browser required');
    const browser=await engine.launch({headless:true,...(name==='chromium'&&process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),...(name==='chromium'?{args:['--no-sandbox']}: {})});
    try{
      const github=new FakeContents(),errors=[],failedAssets=[],unexpected=[];
      const context=await browser.newContext();
      context.on('page',p=>{p.setDefaultTimeout(15000);p.on('pageerror',e=>errors.push(e.message));p.on('response',r=>{if(r.url().startsWith(fixture.base)&&r.status()>=400)failedAssets.push(new URL(r.url()).pathname);});});
      await context.route('**/*',async route=>{
        const url=route.request().url();
        if(url.startsWith('https://api.github.com/'))return github.route(route);
        if(url.startsWith(fixture.base))return route.continue();
        if(/^https:\/\/[abc]\.tile\.openstreetmap\.org\//.test(url))return route.fulfill({contentType:'image/png',body:pixel});
        unexpected.push(new URL(url).origin);return route.abort();
      });
      const page=await context.newPage();
      await page.clock.install();
      await page.goto(fixture.base);
      await page.locator('#catalogue .company-card').filter({hasText:'Padaria sintética'}).waitFor();
      await page.goto(fixture.base+'comunidade.html');
      await page.locator('.leaflet-marker-icon').first().waitFor();
      await page.goto(fixture.base+'cadastro.html');
      const signup=page.locator('#signup-company');
      for(const [key,value]of Object.entries({name:'Pessoa sintética',email:'fixture@example.test',username:'fixture.company',password,confirmPassword:password}))await signup.locator(`[name="${key}"]`).fill(value);
      await signup.locator('button').click();
      await page.waitForURL(/teste\.html/);
      await page.locator('#company-form [name=name]').waitFor();
      await page.locator('#company-form [name=name]').fill('Empresa sintética criada');
      await page.locator('#company-form [name=category]').fill('Padaria');
      await page.locator('#company-form [name=published]').check();
      await page.locator('#save-company').click();
      await page.waitForFunction(()=>!document.querySelector('#save-company').disabled);
      assert.match(await page.locator('#message').innerText(),/Empresa salva/);
      assert.equal([...github.files.keys()].filter(p=>p.startsWith('dados/empresas/')).length,1);
      await page.locator('#company-form [name=name]').fill('Empresa sintética editada');
      await page.locator('#save-company').click();
      await page.waitForFunction(()=>!document.querySelector('#save-company').disabled);
      assert.match(await page.locator('#message').innerText(),/Empresa salva/);
      // A confirmed write must be visible in another tab without its own authenticated session.
      const publicPage=await context.newPage();await publicPage.goto(fixture.base);
      await publicPage.locator('#catalogue .company-card').filter({hasText:'Empresa sintética editada'}).waitFor();
      await publicPage.close();
      await page.goto(fixture.base+'entrar.html');
      await page.locator('#session-logout').click();
      await page.locator('#login [name=username]').waitFor();
      await page.locator('#login [name=username]').fill('fixture.company');
      await page.locator('#login [name=password]').fill(password);
      await page.locator('#login button').click();
      await page.waitForURL(/teste\.html/);
      await page.locator('#business-account-nav').click();
      await page.locator('#company-form [name=name]').fill('Não pode perder este texto');
      github.writeFailure=503;
      await page.locator('#save-company').click();
      await page.locator('#message').filter({hasText:'Falha ao salvar'}).waitFor();
      assert.equal(await page.locator('#company-form [name=name]').inputValue(),'Não pode perder este texto');
      github.writeFailure=null;
      github.rate=true;
      // Force a revalidation: a user action may not authorize itself from cached account data.
      await page.locator('#save-company').click();
      await page.locator('#github-api-status').waitFor();
      assert.equal(await page.locator('#company-form [name=name]').inputValue(),'Não pode perder este texto');
      await page.waitForFunction(()=>document.querySelector('#save-company').disabled);
      const session=await page.evaluate(()=>sessionStorage.getItem('conexao-sessao-v2:test/project'));
      assert(session,'temporary limit keeps the authenticated session');
      const calls=github.calls.length;
      await page.reload();
      await page.locator('#github-api-status').waitFor();
      await page.locator('#catalogue .company-card').first().waitFor({state:'attached'});
      assert.equal(github.calls.length,calls,'reload must respect the stored cooldown');
      assert.equal(await page.evaluate(()=>sessionStorage.getItem('conexao-sessao-v2:test/project')),session);
      await page.goto(fixture.base+'comunidade.html');
      await page.locator('.leaflet-marker-icon').first().waitFor();
      assert.equal(github.calls.length,calls,'map must use the published snapshot during a pause');
      const fallback=await page.evaluate(async()=>await (await fetch('/api/community')).json());
      assert(fallback.sync.stale);assert.equal(fallback.user,null);
      assert(fallback.records.every(row=>row.mine===false&&!row.privateNote&&!row.owner));
      github.rate=false;
      await page.clock.fastForward(125000);
      const recovered=await page.evaluate(async()=>await (await fetch('/api/auth')).json());
      assert(recovered.user,JSON.stringify(recovered));
      assert.equal(recovered.user.username,'fixture.company','session resumes after the pause');
      await page.locator('#github-api-status').waitFor({state:'hidden'});
      await page.goto(fixture.base+'teste.html?area=business');
      await page.locator('#company-form [name=name]').waitFor();
      await page.waitForFunction(()=>!document.querySelector('#save-company').disabled);
      assert.deepEqual(errors,[]);assert.deepEqual(failedAssets,[]);assert.deepEqual(unexpected,[]);
      console.log(`PASS ${name}: Pages assets, public catalogue/map, registration, login, company create/edit, retained form, shared cooldown and public fallback.`);
      await context.close();
    }finally{await browser.close();}
  }
}finally{await fixture.close();}
