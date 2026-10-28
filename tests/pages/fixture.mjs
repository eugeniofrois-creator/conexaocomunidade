import {mkdtemp, readdir, cp, readFile, writeFile, mkdir, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {createServer} from 'node:http';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
export const token='fixture-token-not-a-real-credential';
export const password='Senha sintética longa para os testes!';
export async function prepareFixture(){
  const directory=await mkdtemp(resolve(tmpdir(),'conexao-pages-'));
  for(const file of await readdir(root)){
    if(/\.(html|js|css|webmanifest)$/.test(file)||['brand','vendor','preparar-publicacao.mjs','favicon.svg','icon-192.png','icon-512.png'].includes(file))await cp(resolve(root,file),resolve(directory,file),{recursive:true});
  }
  execFileSync(process.execPath,[resolve(directory,'preparar-publicacao.mjs')],{cwd:directory,env:{...process.env,GITHUB_REPOSITORY:'test/project',GITHUB_SHA:'fixture-pages',PROTOTYPE_GITHUB_TOKEN:token}});
  const configText=await readFile(resolve(directory,'conexao-config.js'),'utf8');
  const config=JSON.parse(configText.slice(configText.indexOf('=')+1).trim().replace(/;$/,''));
  const source=await readFile(resolve(root,'pages-independent.js'),'utf8');
  const viewer=source.match(/const viewerKey\s*=\s*"([^"]+)"/)[1];
  const row={id:'survey-test',name:'Padaria sintética',title:'Padaria sintética',category:'Padaria',district:'Bairro de teste',sector:'Alimentos',products:'pão de teste',address:'Rua sintética',contact:'',description:'Dados apenas para testes',sourceType:'survey',listingType:'business',published:true,mine:false,logo:null,facade:null,gallery:[],services:[],lat:-27.645,lng:-48.669,kind:'service',created_at:0};
  for(const [file,data] of Object.entries({'catalogo.json':{companies:[row],directory:{count:1,sourceDate:'2026-10-28'},complementary:[]},'mapa.json':{records:[row],directory:{count:1,sourceDate:'2026-10-28'},complementary:[]}})){
    const path='dados/publicos/'+file;
    const salt=crypto.getRandomValues(new Uint8Array(16)),iv=crypto.getRandomValues(new Uint8Array(12));
    const material=await crypto.subtle.importKey('raw',new TextEncoder().encode(viewer),'PBKDF2',false,['deriveKey']);
    const key=await crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:210000,hash:'SHA-256'},material,{name:'AES-GCM',length:256},false,['encrypt']);
    const body=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:new TextEncoder().encode(path)},key,new TextEncoder().encode(JSON.stringify(data)));
    await mkdir(dirname(resolve(directory,path)),{recursive:true});
    await writeFile(resolve(directory,path),JSON.stringify({version:1,algorithm:'AES-256-GCM',kdf:'PBKDF2-SHA256',iterations:210000,salt:Buffer.from(salt).toString('base64'),iv:Buffer.from(iv).toString('base64'),body:Buffer.from(body).toString('base64')}));
  }
  await writeFile(resolve(directory,'dados/publicos/enderecos-referencia.json'),'{}');
  const types={html:'text/html',js:'text/javascript',css:'text/css',json:'application/json',webmanifest:'application/manifest+json',png:'image/png',svg:'image/svg+xml',webp:'image/webp'};
  const server=createServer(async(req,res)=>{
    const url=new URL(req.url,'http://localhost');
    if(!url.pathname.startsWith('/conexaocomunidade/')){res.writeHead(404);res.end();return;}
    const relative=decodeURIComponent(url.pathname.slice('/conexaocomunidade/'.length))||'index.html';
    const path=resolve(directory,relative);
    if(!path.startsWith(directory+'/')){res.writeHead(403);res.end();return;}
    try{const bytes=await readFile(path);res.writeHead(200,{'Content-Type':types[path.split('.').pop()]||'application/octet-stream','Cache-Control':'no-store'});res.end(bytes);}catch{res.writeHead(404);res.end();}
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  return {directory,config,configText,base:`http://127.0.0.1:${server.address().port}/conexaocomunidade/`,close:async()=>{await new Promise(resolve=>server.close(resolve));await rm(directory,{recursive:true,force:true});}};
}

export class FakeContents {
  constructor(){this.files=new Map();this.calls=[];this.rate=false;this.writeFailure=null;}
  sha(text){return createHash('sha1').update(text).digest('hex');}
  async route(route){
    const request=route.request(),url=new URL(request.url()),method=request.method();
    const headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Authorization,Content-Type,X-GitHub-Api-Version,Accept,If-None-Match','Access-Control-Allow-Methods':'GET,PUT,DELETE,OPTIONS','Access-Control-Expose-Headers':'ETag,Retry-After,X-RateLimit-Remaining,X-RateLimit-Reset'};
    const send=(status,json,extra={})=>route.fulfill({status,headers:{...headers,...extra},...(status===304?{}:{json})});
    if(method==='OPTIONS')return send(204,undefined);
    const path=decodeURIComponent(url.pathname.split('/contents/')[1]||'');
    this.calls.push({method,path});
    if(url.pathname.indexOf('/repos/test/project/contents/')!==0)throw Error('Unexpected GitHub endpoint: '+url.pathname);
    if(request.headers().authorization!==`Bearer ${token}`)throw Error('Unexpected test credential');
    if(this.rate)return send(403,{message:'API rate limit exceeded'},{'x-ratelimit-remaining':'0','x-ratelimit-reset':String(Math.ceil(Date.now()/1000)+120)});
    if(method==='GET'){
      let data;
      if(this.files.has(path)){
        const text=this.files.get(path);data={sha:this.sha(text),encoding:'base64',content:Buffer.from(text).toString('base64')};
      }else{
        const children=new Map();
        for(const key of this.files.keys()){if(!key.startsWith(path+'/'))continue;const rest=key.slice(path.length+1),name=rest.split('/')[0];const dir=rest.includes('/');children.set(name,{name,type:dir?'dir':'file',sha:this.sha([...this.files].filter(([p])=>dir?p.startsWith(path+'/'+name+'/'):p===key).map(([p,t])=>p+':'+this.sha(t)).sort().join('\n'))});}
        if(!children.size)return send(404,{message:'Not Found'});
        data=[...children.values()];
      }
      const etag='"'+this.sha(JSON.stringify(data))+'"';
      if(request.headers()['if-none-match']===etag)return send(304,null,{etag});
      return send(200,data,{etag});
    }
    if(this.writeFailure)return send(this.writeFailure,{message:'Simulated write failure'});
    const body=request.postDataJSON(),current=this.files.get(path);
    if((body.sha||null)!==(current?this.sha(current):null))return send(409,{message:'Conflict'});
    if(method==='DELETE'){this.files.delete(path);return send(200,{});}
    if(method!=='PUT')throw Error('Unexpected write method');
    const text=Buffer.from(body.content,'base64').toString();
    const envelope=JSON.parse(text);if(!envelope.body||!envelope.iv)throw Error('Unencrypted write in test');
    this.files.set(path,text);return send(200,{content:{sha:this.sha(text)}});
  }
}
