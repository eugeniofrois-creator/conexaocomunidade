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
const empSource=await readFile(new URL('./empresa-repositorio.js',import.meta.url),'utf8');
const {EmpresaRepositorio}=await import('data:text/javascript;base64,'+Buffer.from(empSource).toString('base64'));
const empresas=new EmpresaRepositorio(a);
const cadastro=await empresas.salvar('empresa-2',{nome:'Mercado de teste',bairro:'Brejaru'});
const foto=await empresas.salvarFoto('empresa-2','fachada',{mime:'image/png',base64:'aGVsbG8='});
assert.equal((await empresas.consultar('empresa-2')).data.nome,'Mercado de teste');
assert.equal((await empresas.consultarFoto('empresa-2','fachada')).data.base64,'aGVsbG8=');
await empresas.removerFoto('empresa-2','fachada',foto.revision);
assert.equal(await empresas.consultarFoto('empresa-2','fachada'),null);
assert.equal((await empresas.consultar('empresa-2')).revision,cadastro.revision);
await assert.rejects(empresas.salvarFoto('empresa-2','x',{mime:'text/html',base64:'YQ=='}));
console.log('OK: arquivos separados por empresa e exclusão individual de imagem.');
// O limite é validado antes da gravação e a remoção preserva as demais fotos.
const registros=new Map();let seq=0;
const memoria={async read(k){return registros.get(k)||null},async write(k,data,revision=null){const old=registros.get(k);if(old&&old.revision!==revision)throw Error('conflito');const row={data,revision:String(++seq)};registros.set(k,row);return {revision:row.revision}},async remove(k,revision){const old=registros.get(k);if(!old||old.revision!==revision)throw Error('conflito');registros.delete(k)}};
const guard=new EmpresaRepositorio(memoria);let rev=(await guard.salvar('id',{nome:'Loja',fotos:[]})).revision;
for(let i=0;i<10;i++)rev=(await guard.adicionarFoto('id','foto'+i,{mime:'image/png',base64:'YQ=='},rev)).cadastroRevision;
await assert.rejects(guard.adicionarFoto('id','foto10',{mime:'image/png',base64:'YQ=='},rev),/10 fotos/);
const removed=await guard.removerFotoVinculada('id','foto0',rev);
assert.equal(removed.limpezaPendente,false);assert.equal((await guard.consultar('id')).data.fotos.length,9);
assert.equal(await guard.consultarFoto('id','foto0'),null);
console.log('OK: limite de dez imagens e remoção individual.');
