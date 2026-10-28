/* Evita token em texto puro no artefato. A chave é pública: isto é ofuscação, não sigilo. */
import {randomBytes,createCipheriv,createHash} from "node:crypto";
import {readFile,writeFile,readdir} from 'node:fs/promises';
const {PROTOTYPE_GITHUB_TOKEN:token,GITHUB_REPOSITORY:repository}=process.env;
const version=process.env.GITHUB_SHA||'auditoria-20261028';
const password='demo-conexao-4a705f2b-4f15-4a71-91ec-a40459ff94b4';
if(!token||!repository)throw Error('Configure o secret PROTOTYPE_GITHUB_TOKEN do repositório.');
const [owner,repo]=repository.split('/');
const key=randomBytes(32),iv=randomBytes(12);
const cipher=createCipheriv('aes-256-gcm',key,iv);
cipher.setAAD(Buffer.from(owner+'/'+repo));
const encrypted=Buffer.concat([cipher.update(token,'utf8'),cipher.final(),cipher.getAuthTag()]);
const tokenEnvelope={algorithm:'AES-256-GCM',iv:iv.toString('base64'),body:encrypted.toString('base64')};
const config={owner,repo,branch:process.env.CONEXAO_BRANCH||'main',password,version,tokenConfigured:true,tokenMasked:'********',tokenFingerprint:createHash('sha256').update(token).digest('hex').slice(0,12),tokenEnvelope,publicWrappingKey:key.toString('base64')};
await writeFile('conexao-config.js','window.CONEXAO_CONFIG='+JSON.stringify(config)+';\n');
for(const file of await readdir('.'))if(file.endsWith('.html')){
 const before=await readFile(file,'utf8');
 let html=before.replaceAll('"/brand-name.css"','"/conexaocomunidade/brand-name.css"').replaceAll('"/brand-name.js"','"/conexaocomunidade/brand-name.js"');
 if(html.includes('pages-independent.js')&&!html.includes('conexao-config.js'))html=html.replace(/(<script\s+src=["'][^"']*pages-independent\.js["'][^>]*><\/script>)/,'<script src="/conexaocomunidade/conexao-config.js"></script>\n    $1');
 html=html.replace(/(\b(?:src|href)=["'])([^"']+\.(?:js|css))(["'])/g,(all,start,path,end)=>path.includes(':')?all:start+path+'?v='+version+end);
 if(html!==before)await writeFile(file,html);
}
