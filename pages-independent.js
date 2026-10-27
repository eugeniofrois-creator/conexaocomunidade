/* O catálogo é público; esta chave é pública e não protege dados privados. */
(() => {
 const viewerKey = "885e64f2-9fec-4974-9566-fc190436408523af1865-fed4-41a0-8710-94e241896394";
 const prefix = new URL('.', document.currentScript.src);
 const cache = new Map();
 const decode = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
 async function load(kind, id) {
  if (kind === 'image' && !/^[0-9a-f-]{36}$/i.test(id || '')) throw Error('Imagem inválida.');
  const path = kind === 'companies' ? 'dados/publicos/catalogo.json' : kind === 'image' ? `dados/publicos/imagens/${id}.json` : 'dados/publicos/mapa.json';
  if (!cache.has(path)) cache.set(path, (async () => {
   const response = await window.fetch(new URL(path,prefix));
   if (!response.ok) throw Error('Catálogo indisponível.');
   const e=await response.json();
   if(e.version!==1||e.algorithm!=='AES-256-GCM'||e.kdf!=='PBKDF2-SHA256'||e.iterations!==210000)throw Error('Formato de catálogo inválido.');
   const material=await crypto.subtle.importKey('raw',new TextEncoder().encode(viewerKey),'PBKDF2',false,['deriveKey']);
   const key=await crypto.subtle.deriveKey({name:'PBKDF2',salt:decode(e.salt),iterations:210000,hash:'SHA-256'},material,{name:'AES-GCM',length:256},false,['decrypt']);
   const bytes=await crypto.subtle.decrypt({name:'AES-GCM',iv:decode(e.iv),additionalData:new TextEncoder().encode(path)},key,decode(e.body));
   return JSON.parse(new TextDecoder().decode(bytes));
  })().catch(e=>{cache.delete(path);throw e;}));
  return cache.get(path);
 }
 window.ConexaoDadosPublicos={load};
})();
/* Prévia de leitura direta; operações de conta serão conectadas em seguida. */
(() => {
 const original=window.fetch.bind(window);
 let authPromise, reportPromise;
 async function getReports(){
  if(!reportPromise) reportPromise=(async()=>{const cfg=window.CONEXAO_CONFIG;if(!cfg?.token||!cfg?.password)throw Error('Integração com o repositório ainda não configurada.');const [{GithubJsonStore},{RelatosRepositorio}]=await Promise.all([import('./github-direct.js'),import('./relatos-repositorio.js')]);return new RelatosRepositorio(new GithubJsonStore({...cfg,request:original}));})().catch(e=>{reportPromise=null;throw e;});return reportPromise;
 }
 async function getAuth(){
  if(!authPromise) authPromise=(async()=>{
   const cfg=window.CONEXAO_CONFIG;
   if(!cfg?.token || !cfg?.password) throw Error('Integração com o repositório ainda não configurada.');
   const [{GithubJsonStore},{ContasRepositorio},{AuthIndividual}]=await Promise.all([import('./github-direct.js'),import('./contas-repositorio.js'),import('./auth-individual.js')]);
   const store=new GithubJsonStore({...cfg,request:original});
   return new AuthIndividual(new ContasRepositorio(store),window.sessionStorage,window.localStorage);
  })().catch(e=>{authPromise=null;throw e;});
  return authPromise;
 }
 window.fetch=async (input,options={})=>{
  const url=new URL(typeof input==='string'?input:input.url||input.href,location.href);
  if(url.origin!==location.origin||!url.pathname.startsWith('/api/'))return original(input,options);
  const method=String(options.method||(input instanceof Request?input.method:'GET')).toUpperCase();
  const name=url.pathname.slice(5);
  if(method==='GET' && (name==='companies'||name==='community')){
   try{const data=await window.ConexaoDadosPublicos.load(name);let user=null;try{user=(await (await getAuth()).handle('GET')).user;}catch{}return Response.json({...data,user});}
   catch{return Response.json({error:'Não foi possível ler o catálogo do repositório.'},{status:503});}
  }
  if(method==='GET'&&name==='company-image'){
   try {const image=await window.ConexaoDadosPublicos.load('image',url.searchParams.get('id'));const bytes=Uint8Array.from(atob(image.base64),c=>c.charCodeAt(0));return new Response(bytes,{headers:{'Content-Type':image.mime}});}
   catch{return Response.json({error:'Imagem indisponível.'},{status:404});}
  }
  if(name==='auth'){
   try{const auth=await getAuth();const body=options.body?JSON.parse(options.body):{};return Response.json(await auth.handle(method,body));}
   catch(e){return Response.json({error:e.message||'Não foi possível acessar a conta.'},{status:400});}
  }
  if(name==='reports'){
   try{const reports=await getReports();if(method==='POST')return Response.json(await reports.criar(JSON.parse(options.body||'{}')));const user=(await (await getAuth()).handle('GET')).user;if(!user||!['owner','company-admin','coordination'].includes(user.role))return Response.json({error:'Entre como administração ou coordenação.'},{status:403});if(method==='GET')return Response.json(await reports.listar());if(method==='PATCH')return Response.json(await reports.atualizar(JSON.parse(options.body||'{}')));throw Error('Operação indisponível.');}catch(e){return Response.json({error:e.message||'Não foi possível processar o relato.'},{status:400});}
  }
  if(method==='GET'&&name==='about-images')return Response.json({slots:[]});
  return Response.json({error:'Esta função ainda não está disponível na integração individual.'},{status:503});
 };
})();

(() => {
 const pending=new WeakSet();
 function render(img){const src=img.getAttribute('src');if(!src||!src.startsWith('/api/company-image')||pending.has(img))return;pending.add(img);window.fetch(src).then(r=>{if(!r.ok)throw Error('Imagem indisponível');return r.blob()}).then(b=>{img.src=URL.createObjectURL(b)}).catch(()=>{}).finally(()=>pending.delete(img));}
 function scan(node){if(node.nodeType!==1)return;if(node.tagName==='IMG')render(node);node.querySelectorAll?.('img').forEach(render);}
 new MutationObserver(events=>events.forEach(e=>e.type==='attributes'?render(e.target):e.addedNodes.forEach(scan))).observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['src']});
})();
