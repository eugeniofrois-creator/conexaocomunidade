const {chromium}=require('playwright-core');
const crypto=require('node:crypto');
const token=process.env.PROTOTYPE_GITHUB_TOKEN,password=process.env.PROTOTYPE_DATA_KEY_V1;
const repo=process.env.GITHUB_REPOSITORY;
if(!token||!password||!repo)throw Error('Secrets indisponíveis para o teste.');
const branch='integracao-github-individual',username='teste_'+crypto.randomBytes(8).toString('hex');
const accountHash=crypto.createHash('sha256').update('usuario:'+username).digest('hex');
const adminUsername='admtest_'+crypto.randomBytes(8).toString('hex');
const adminHash=crypto.createHash('sha256').update('usuario:'+adminUsername).digest('hex');
const paths=[`dados/contas/${accountHash}.json`,`dados/contas/${adminHash}.json`];
async function cleanup(path){const url=`https://api.github.com/repos/${repo}/contents/${path}`;const headers={Authorization:`Bearer ${token}`,Accept:'application/vnd.github+json','User-Agent':'conexao-test'};let r=await fetch(url+'?ref='+branch,{headers});if(r.status===404)return;if(!r.ok)throw Error('Falha ao consultar arquivo de teste: '+r.status);const item=await r.json();r=await fetch(url,{method:'DELETE',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({message:'Remover dados temporários de teste',branch,sha:item.sha})});if(!r.ok)throw Error('Falha ao limpar arquivo de teste: '+r.status);}
(async()=>{
 let browser;
 try{
  browser=await chromium.launch({headless:true,executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});const page=await browser.newPage();
  await page.goto('http://127.0.0.1:8765/conexaocomunidade/entrar.html',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.CONEXAO_CONFIG&&window.ConexaoDadosPublicos);
  async function call(path,method='GET',data){return page.evaluate(async ({path,method,data})=>{let r=await fetch(path,{method,...(data!==undefined?{headers:{'Content-Type':'application/json'},body:JSON.stringify(data)}:{})});let result=await r.json();if(!r.ok)throw Error(result.error||'Erro '+r.status);return result;},{path,method,data});}
  await call('/api/auth','POST',{action:'register-company',username,name:'Empresa de teste',email:'teste@example.test',password:'Senha de teste temporaria'});
  let auth=await call('/api/auth');if(auth.user?.role!=='company')throw Error('Sessão não criada');
  const created=await call('/api/companies','POST',{action:'create'});paths.push(`dados/empresas/${created.id}/cadastro.json`);
  const saved=await call('/api/companies','POST',{id:created.id,revision:created.revision,data:{name:'Empresa temporária',published:true,logo:null,facade:null,gallery:[],services:[],category:'Serviços',address:'Rua de teste',products:'Teste',description:'Teste'}});
  const upload=await page.evaluate(async ({id,revision})=>{const form=new FormData();form.set('company',id);form.set('revision',revision);form.set('kind','gallery');form.set('image',new Blob(['teste'],{type:'image/png'}),'teste.png');const r=await fetch('/api/company-image',{method:'POST',body:form});const d=await r.json();if(!r.ok)throw Error(d.error);return d;},{id:created.id,revision:saved.revision});
  const image=upload.images.gallery[0];paths.push(`dados/imagens/${image}.json`);if(upload.approval!=='pending')throw Error('Imagem deveria estar pendente');
  const catalogue=await call('/api/companies');if(!catalogue.companies.some(x=>x.id===created.id))throw Error('Empresa não encontrada');
  const report=await call('/api/reports','POST',{anonymous:true,title:'Relato teste',description:'Dados temporários'});paths.push(`dados/relatos/${report.id}.json`);
  await call('/api/auth','POST',{action:'logout'});if((await call('/api/auth')).user)throw Error('Sessão não encerrada');
  await page.evaluate(async ({username})=>{const {GithubJsonStore}=await import('/conexaocomunidade/github-direct.js');const {ContasRepositorio}=await import('/conexaocomunidade/contas-repositorio.js');const store=new GithubJsonStore(window.CONEXAO_CONFIG);await new ContasRepositorio(store).cadastrar({usuario:username,nome:'Administrador teste',senha:'Senha de administrador teste',perfil:'owner'});},{username:adminUsername});
  await call('/api/auth','POST',{username:adminUsername,password:'Senha de administrador teste'});
  const users=await call('/api/test-users');if(!users.users.some(x=>x.username===username))throw Error('Conta não aparece na administração');
  const images=await call('/api/admin-images');const found=images.companies.flatMap(x=>x.images).find(x=>x.id===image);if(!found||found.approval!=='pending')throw Error('Imagem pendente não aparece para administração');
  await call('/api/company-image','PATCH',{id:image,revision:found.revision,approval:'approved'});
  const reports=await call('/api/reports');const foundReport=reports.reports.find(x=>x.id===report.id);if(!foundReport)throw Error('Relato não aparece na administração');
  await call('/api/reports','PATCH',{id:report.id,revision:foundReport.revision,status:'Rejeitado'});
  await call('/api/company-image','DELETE',{company:created.id,id:image,revision:upload.revision});
  await call('/api/auth','POST',{action:'logout'});
  console.log('OK: navegador registrou conta, empresa e relato; administração aprovou imagem, rejeitou relato e listou contas.');
 } finally {if(browser)await browser.close();let errors=0;for(const path of paths.reverse())try{await cleanup(path)}catch(e){errors++;console.error('Limpeza:',path,e.message)}if(errors)throw Error('Alguns arquivos de teste precisam de limpeza.');}
})().catch(e=>{console.error('Erro:',e.message);process.exitCode=1});
