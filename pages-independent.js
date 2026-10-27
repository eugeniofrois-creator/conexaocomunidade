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
 let authPromise, reportPromise, businessPromise, imagePromise;
 async function getImages(){if(!imagePromise) imagePromise=(async()=>{const [{GithubJsonStore},{ImagensDiretas},companies]=await Promise.all([import("./github-direct.js"),import("./imagens-diretas.js"),getBusinesses()]);return new ImagensDiretas(new GithubJsonStore({...window.CONEXAO_CONFIG,request:original}),companies);})().catch(e=>{imagePromise=null;throw e;});return imagePromise;}
 async function getBusinesses(){
  if(!businessPromise) businessPromise=(async()=>{const cfg=window.CONEXAO_CONFIG;if(!cfg?.token||!cfg?.password)throw Error("Integração com o repositório ainda não configurada.");const [{GithubJsonStore},{EmpresasDiretas}]=await Promise.all([import("./github-direct.js"),import("./empresas-diretas.js")]);return new EmpresasDiretas(new GithubJsonStore({...cfg,request:original}));})().catch(e=>{businessPromise=null;throw e;});return businessPromise;
 }
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
   try{const data=await window.ConexaoDadosPublicos.load(name);let user=null,rows=[];if(window.CONEXAO_CONFIG?.token){user=(await (await getAuth()).handle('GET')).user;rows=await (await getBusinesses()).lista(user);const images=await getImages();rows=await Promise.all(rows.map(async r=>{if(r.mine)return r;const visible=async id=>{if(!id)return null;const a=await images.row(id);return a?.data.approval==='approved'?id:null};return {...r,logo:await visible(r.logo),facade:await visible(r.facade),gallery:(await Promise.all((r.gallery||[]).map(visible))).filter(Boolean)};}));}if(name==='companies')return Response.json({...data,user,companies:[...data.companies,...rows]});return Response.json({...data,user,records:[...data.records,...rows.filter(r=>r.published).map(r=>({...r,title:r.name,kind:'service',created_at:0,status:'Publicado',photo:r.facade||null}))]});}
   catch{return Response.json({error:'Não foi possível ler o catálogo do repositório.'},{status:503});}
  }
  if(name==='companies'&&method!=='GET'){try{const user=(await (await getAuth()).handle('GET')).user;if(!user)return Response.json({error:'Entre na conta para continuar.'},{status:401});const b=JSON.parse(options.body||'{}'),companies=await getBusinesses();if(method==='POST')return Response.json(b.action==='create'?await companies.criar(user):await companies.salvar(user,b));if(method==='DELETE')return Response.json(await companies.excluir(user,b));throw Error('Operação indisponível.');}catch(e){return Response.json({error:e.message},{status:400});}}
  if(name==='company-image'&&method!=='GET'){try{const user=(await (await getAuth()).handle('GET')).user,images=await getImages();if(method==='POST')return Response.json(await images.enviar(user,options.body));const b=JSON.parse(options.body||'{}');if(method==='DELETE')return Response.json(await images.excluir(user,b));if(method==='PATCH')return Response.json(await images.moderar(user,b));throw Error('Operação indisponível.');}catch(e){return Response.json({error:e.message},{status:400});}}
  if(method==='GET'&&name==='company-image'){
   try {let image;const id=url.searchParams.get('id');if(window.CONEXAO_CONFIG?.token){const item=await (await getImages()).row(id);if(item){const user=(await (await getAuth()).handle('GET')).user;const company=await (await getBusinesses()).row(item.data.company);if(item.data.approval!=='approved'&&!(company&&(await getBusinesses()).can(user,company.data)))return Response.json({error:'Imagem indisponível.'},{status:404});image=item.data;}}if(!image)image=await window.ConexaoDadosPublicos.load('image',id);const bytes=Uint8Array.from(atob(image.base64),c=>c.charCodeAt(0));return new Response(bytes,{headers:{'Content-Type':image.mime}});}
   catch{return Response.json({error:'Imagem indisponível.'},{status:404});}
  }
  if(name==='auth'){
   try{const auth=await getAuth();const body=options.body?JSON.parse(options.body):{};return Response.json(await auth.handle(method,body));}
   catch(e){return Response.json({error:e.message||'Não foi possível acessar a conta.'},{status:400});}
  }
  if(name==='admin-images'&&method==='GET'){try{const user=(await (await getAuth()).handle('GET')).user;if(!user||!['owner','company-admin'].includes(user.role))return Response.json({error:'Área exclusiva da administração.'},{status:403});const companies=await (await getBusinesses()).lista(user),images=await getImages();const rows=await Promise.all(companies.filter(c=>c.sourceType==='company').map(async c=>{const slots=[[c.logo,'logo'],[c.facade,'facade'],...(c.gallery||[]).map(id=>[id,'gallery'])].filter(x=>x[0]);const assets=(await Promise.all(slots.map(async ([id,kind])=>{const item=await images.row(id);return item?{id,kind,revision:item.revision,approval:item.data.approval}:null}))).filter(Boolean);return {id:c.id,name:c.name,revision:c.revision,images:assets}}));return Response.json({companies:rows,aboutSlots:[]});}catch(e){return Response.json({error:e.message},{status:400});}}
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
