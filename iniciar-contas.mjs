/* Inicializa as contas de demonstração apenas quando ainda não existem. */
import {readFile} from 'node:fs/promises';
const token=process.env.PROTOTYPE_GITHUB_TOKEN,password='demo-conexao-4a705f2b-4f15-4a71-91ec-a40459ff94b4';
const [owner,repo]=String(process.env.GITHUB_REPOSITORY||'').split('/');
if(!token||!password||!owner||!repo)throw Error('Configuração incompleta.');
const source=await readFile('./github-direct.js','utf8');
const {GithubJsonStore}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const accountSource=await readFile('./contas-repositorio.js','utf8');
const {ContasRepositorio}=await import('data:text/javascript;base64,'+Buffer.from(accountSource).toString('base64'));
const store=new GithubJsonStore({owner,repo,branch:'main',token,password});
const accounts=new ContasRepositorio(store);
for(const account of JSON.parse(await readFile('./contas-iniciais.json','utf8'))){
 const path=await accounts.path(account.usuario);
 if(await store.read(path))continue;
 try{await store.write(path,account);}catch(e){if(!(await store.read(path)))throw e;}
}
console.log('Contas iniciais verificadas.');
