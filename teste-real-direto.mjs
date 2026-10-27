import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const source=await readFile(new URL('./github-direct.js',import.meta.url),'utf8');
const {GithubJsonStore}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const store=new GithubJsonStore({owner:process.env.CONEXAO_TESTE_OWNER,repo:process.env.CONEXAO_TESTE_REPO,branch:process.env.CONEXAO_TESTE_BRANCH||'main',token:process.env.CONEXAO_TESTE_TOKEN,password:'senha-temporaria-teste'});
const path=`dados/testes/javascript-${crypto.randomUUID()}.json`;let revision=null;
try {
 const created=await store.write(path,{test:'temporario'});revision=created.revision;
 const read=await store.read(path);assert.equal(read.data.test,'temporario');
 const changed=await store.write(path,{test:'atualizado'},revision);revision=changed.revision;
 assert.equal((await store.read(path)).data.test,'atualizado');
 await store.remove(path,revision);revision=null;assert.equal(await store.read(path),null);
 console.log(JSON.stringify({criar:'ok',ler:'ok',atualizar:'ok',excluir:'ok'}));
} catch(e) {
 if(revision){try{await store.remove(path,revision);revision=null}catch{}}
 console.log(JSON.stringify({erro:e.message,limpeza_pendente:Boolean(revision),arquivo_teste:revision?path:undefined}));process.exitCode=1;
}
