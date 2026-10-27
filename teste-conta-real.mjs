import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const load=async f=>import('data:text/javascript;base64,'+Buffer.from(await readFile(f,'utf8')).toString('base64'));
const {GithubJsonStore}=await load('./github-direct.js');
const {ContasRepositorio}=await load('./contas-repositorio.js');
const store=new GithubJsonStore({owner:'eugeniofrois-creator',repo:'conexaocomunidade',branch:'integracao-github-individual',token:process.env.CONEXAO_TESTE_TOKEN,password:'teste-temporario-nao-pessoal'});
const contas=new ContasRepositorio(store), usuario='teste_'+crypto.randomUUID().replaceAll('-','').slice(0,16),senha='senha-temporaria-de-teste';
const path=await contas.path(usuario);let criado=false;
try {
 await contas.cadastrar({usuario,nome:'Conta de teste',senha});criado=true;
 assert.equal((await contas.autenticar(usuario,senha)).nome,'Conta de teste');
 assert.equal(await contas.autenticar(usuario,'senha-incorreta'),null);
 await assert.rejects(()=>contas.cadastrar({usuario,nome:'Conta repetida',senha}));
 const row=await store.read(path);await store.remove(path,row.revision);criado=false;
 console.log('OK: cadastro, login, senha incorreta, duplicidade e limpeza no repositório de teste.');
} catch(e){if(criado){try{const row=await store.read(path);if(row)await store.remove(path,row.revision);criado=false}catch{}}console.error('Falha:',e.message,'Limpeza pendente:',criado);process.exitCode=1;}
