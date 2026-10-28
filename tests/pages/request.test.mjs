import {test} from 'node:test';
import assert from 'node:assert/strict';
import {GithubRequest, getSharedGithubRequest} from '../../github-request.js';
import {GithubJsonStore} from '../../github-direct.js';
import {EmpresasDiretas} from '../../empresas-diretas.js';

const url='https://api.github.com/repos/test/project/contents/dados/test.json?ref=main';
function harness(reply=()=>Response.json({ok:true})) {
  let time=1800000000000;
  const records=new Map(),calls=[];
  const storage={getItem:key=>records.get(key)||null,setItem:(key,value)=>records.set(key,value)};
  const options={owner:'test',repo:'project',token:'synthetic-only',storage,now:()=>time,sleep:async ms=>{time+=ms;},request:async(input,init)=>{calls.push({url:input,init,time});return reply(input,init);}};
  return {client:new GithubRequest(options),options,calls,records,advance:ms=>{time+=ms;},now:()=>time};
}

test('primary limit survives another client and a reload; stores only its deadline',async()=>{
  const h=harness(()=>Response.json({message:'API rate limit exceeded'},{status:403,headers:{'x-ratelimit-remaining':'0','x-ratelimit-reset':String((1800000000000+120000)/1000)}}));
  await assert.rejects(h.client.request(url),error=>error.status===429);
  const fresh=new GithubRequest(h.options);
  await assert.rejects(fresh.request(url),error=>error.retryAt===h.now()+120000);
  assert.equal(h.calls.length,1);
  assert([...h.records.values()].every(value=>/^\d+$/.test(value)));
  h.advance(120001);
  h.options.request=async()=>Response.json({ok:true});
  const after=new GithubRequest(h.options);
  assert((await after.request(url)).ok);
});

test('secondary limits back off for at least a minute without rate headers',async()=>{
  const h=harness(()=>Response.json({message:'You have exceeded a secondary rate limit.'},{status:403}));
  await assert.rejects(h.client.request(url),error=>error.retryAt===h.now()+60000);
  h.advance(60001);
  await assert.rejects(h.client.request(url),error=>error.retryAt===h.now()+120000);
  assert.equal(h.calls.length,2);
});

test('Retry-After handles seconds and HTTP dates without using an unrelated primary reset',async t=>{
  for(const retry of ['90',new Date(1800000000000+90000).toUTCString()])await t.test(retry,async()=>{
    const h=harness(()=>new Response('',{status:429,headers:{'retry-after':retry,'x-ratelimit-remaining':'100','x-ratelimit-reset':String((1800000000000+3600000)/1000)}}));
    await assert.rejects(h.client.request(url),error=>error.retryAt===h.now()+90000);
    await assert.rejects(h.client.request(url));
    assert.equal(h.calls.length,1);
  });
});

test('an allowed last request returns its data and pauses subsequent requests',async()=>{
  const h=harness(()=>Response.json({last:true},{headers:{'x-ratelimit-remaining':'0','x-ratelimit-reset':String((1800000000000+60000)/1000)}}));
  assert.deepEqual(await (await h.client.request(url)).json(),{last:true});
  await assert.rejects(h.client.request(url+'other'),error=>error.status===429);
  assert.equal(h.calls.length,1);
});

test('invalid tokens and forbidden access are not confused with temporary limits',async()=>{
  for(const status of [401,403]){
    const h=harness(()=>Response.json({message:'Permission denied'},{status}));
    await assert.rejects(h.client.request(url),error=>error.status===status);
    assert.equal(h.client.status().blockedUntil,0);
    await assert.rejects(h.client.request(url));
    assert.equal(h.calls.length,2);
  }
});

test('GET deduplication, ETag revalidation and write invalidation avoid repeated downloads',async()=>{
  let count=0;
  const h=harness((input,options)=>{
    count++;
    if(options.method==='PUT')return Response.json({ok:true});
    if(count===2){assert.equal(options.headers.get('If-None-Match'),'"v1"');return new Response(null,{status:304});}
    return Response.json({value:count},{headers:{etag:'"v1"'}});
  });
  const responses=await Promise.all([h.client.request(url),h.client.request(url)]);
  assert.deepEqual(await responses[0].json(),{value:1});
  assert.deepEqual(await responses[1].json(),{value:1});
  assert.equal(h.calls.length,1);
  await h.client.request(url);
  assert.equal(h.calls.length,1);
  h.advance(60001);
  assert.deepEqual(await (await h.client.request(url)).json(),{value:1});
  await h.client.request(url,{method:'PUT',body:'{}'});
  await h.client.request(url);
  assert.equal(h.calls.length,4);
});

test('a fresh check revalidates even within the read cache TTL',async()=>{
  const h=harness();
  await h.client.request(url);
  await h.client.request(url,{githubFresh:true});
  assert.equal(h.calls.length,2);
});

test('queued calls stop on a limit; writes are neither replayed nor falsely confirmed',async()=>{
  const h=harness(()=>new Response('',{status:429,headers:{'retry-after':'60'}}));
  const results=await Promise.allSettled([h.client.request(url),h.client.request(url,{method:'PUT',body:'{}'}),h.client.request(url+'2')]);
  assert(results.every(r=>r.status==='rejected'));
  assert.equal(h.calls.length,1);
});

test('mutative calls are serialized and separated by at least a second',async()=>{
  const h=harness();
  await Promise.all([h.client.request(url,{method:'PUT'}),h.client.request(url,{method:'DELETE'})]);
  assert(h.calls[1].time-h.calls[0].time>=1000);
});

test('modules using the same repository credential share the transport',()=>{
  const config={owner:'test',repo:'project',token:crypto.randomUUID()};
  assert.equal(getSharedGithubRequest(config),getSharedGithubRequest(config));
});

test('unchanged directory SHAs avoid reading company files again',async()=>{
  let lists=0,files=0,hint='dir-v1';
  const store={async request(){lists++;return Response.json([{type:'dir',name:'12345678-1234-1234-1234-123456789abc',sha:hint}]);},headers:()=>({}),owner:'test',repo:'project',branch:'main'};
  store.read=GithubJsonStore.prototype.read.bind({...store,url:()=>url,listedRows:new Map(),open:async()=>({id:'12345678-1234-1234-1234-123456789abc',company:{name:'Teste',published:true}}),request:async()=>{files++;return Response.json({sha:'file-'+hint,encoding:'base64',content:btoa('{}')});}});
  const companies=new EmpresasDiretas(store);
  await companies.lista(null);await companies.lista(null);
  assert.equal(lists,2);assert.equal(files,1);
  hint='dir-v2';await companies.lista(null);assert.equal(files,2);
});

test('stale record revisions are rejected before any mutation',async()=>{
  let writes=0;
  const config={owner:'test',repo:'project',token:crypto.randomUUID(),password:'synthetic',request:async(input,options)=>{
    if(options.method==='PUT'){writes++;return Response.json({});}
    return Response.json({sha:'new-version',encoding:'base64',content:btoa('{}')});
  }};
  const store=new GithubJsonStore(config);store.open=async()=>({});
  await assert.rejects(store.write('dados/test.json',{},'old-version'),error=>error.status===409);
  assert.equal(writes,0);
});

test('a changed directory SHA revalidates a recently cached record',async()=>{
  let version='v1',reads=0;
  const store=new GithubJsonStore({owner:'test',repo:'project',token:crypto.randomUUID(),password:'synthetic',request:async()=>{
    reads++;
    return Response.json({sha:version,encoding:'base64',content:btoa('{}')});
  }});
  store.open=async()=>({version});
  await store.read('dados/test.json',{versionHint:'directory-v1'});
  version='v2';
  const changed=await store.read('dados/test.json',{versionHint:'directory-v2'});
  assert.equal(changed.revision,'v2');
  assert.equal(reads,2);
  await store.read('dados/test.json',{versionHint:'directory-v2'});
  assert.equal(reads,2);
});

test('a read queued after a write never borrows an earlier pending GET',async()=>{
  let version=1;
  const h=harness((input,options)=>{
    if(options.method==='PUT')version=2;
    return Response.json({version});
  });
  const before=h.client.request(url);
  const write=h.client.request(url,{method:'PUT'});
  const after=h.client.request(url);
  assert.equal((await (await before).json()).version,1);
  await write;
  assert.equal((await (await after).json()).version,2);
});

test('publication initializes existing demo accounts without rewriting them',async()=>{
  const {execFileSync}=await import('node:child_process');
  const root=new URL('../../',import.meta.url);
  const output=execFileSync(process.execPath,['--input-type=module','--eval',`
    import {GithubJsonStore} from './github-direct.js';
    const fixture=new GithubJsonStore({owner:'test',repo:'project',token:'synthetic',password:'demo-conexao-4a705f2b-4f15-4a71-91ec-a40459ff94b4'});
    globalThis.fetch=async(input,options)=>{
      if(options.method!=='GET')throw Error('Existing accounts must not be rewritten');
      const path=new URL(input).pathname.split('/contents/')[1];
      const envelope=await fixture.seal(path,{id:'synthetic-account'});
      return Response.json({sha:'existing',encoding:'base64',content:btoa(JSON.stringify(envelope))});
    };
    await import('./iniciar-contas.mjs');
  `],{cwd:root,env:{...process.env,PROTOTYPE_GITHUB_TOKEN:'synthetic-init-only',GITHUB_REPOSITORY:'test/project'},encoding:'utf8'});
  assert.match(output,/Contas iniciais verificadas/);
});
