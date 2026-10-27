import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const source=await readFile(new URL('./github-direct.js',import.meta.url),'utf8');
const {GithubJsonStore}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const files=new Map();let version=0;
const request=async(url,options)=>{
 const key=new URL(url).pathname;
 if(!options.method)return files.has(key)?Response.json(files.get(key)):new Response('',{status:404});
 const body=JSON.parse(options.body),current=files.get(key);
 if(options.method==='PUT'){
  if(current&&current.sha!==body.sha)return new Response('',{status:409});
  const sha=`version-${++version}`;files.set(key,{encoding:'base64',content:body.content,sha});return Response.json({content:{sha}});
 }
 if(options.method==='DELETE'){
  if(!current||current.sha!==body.sha)return new Response('',{status:409});
  files.delete(key);return Response.json({});
 }
 return new Response('',{status:405});
};
const store=(owner,password='senha-de-teste')=>new GithubJsonStore({owner,repo:'app',token:'simulado',password,request});
const a=store('repositorio-a'),b=store('repositorio-b'),path='dados/empresas/empresa-1/cadastro.json';
const first=await a.write(path,{nome:'Empresa de teste'});
assert.equal((await a.read(path)).data.nome,'Empresa de teste');
assert.equal(await b.read(path),null);
assert(!JSON.stringify([...files.values()]).includes('Empresa de teste'));
await assert.rejects(store('repositorio-a','senha-errada').read(path));
const second=await a.write(path,{nome:'Alterado'},first.revision);
await assert.rejects(a.write(path,{nome:'Valor antigo'},first.revision));
await a.remove(path,second.revision);
assert.equal(await a.read(path),null);
console.log('OK: isolamento, criptografia, senha incorreta, edição, conflito e exclusão.');
