/* Preparação do Pages. O token e a chave ficam visíveis no JavaScript gerado deste protótipo. */
import {readFile,writeFile,readdir} from 'node:fs/promises';
const {PROTOTYPE_GITHUB_TOKEN:token,GITHUB_REPOSITORY:repository}=process.env;
const version=process.env.GITHUB_SHA||'auditoria-20261028';
const password='demo-conexao-4a705f2b-4f15-4a71-91ec-a40459ff94b4';
if(!token||!repository)throw Error('Configure o secret PROTOTYPE_GITHUB_TOKEN do repositório.');
const [owner,repo]=repository.split('/');
await writeFile('conexao-config.js','window.CONEXAO_CONFIG='+JSON.stringify({owner,repo,branch:process.env.CONEXAO_BRANCH||'main',token,password,version})+';\n');
for(const file of await readdir('.'))if(file.endsWith('.html')){
 const before=await readFile(file,'utf8');
 let html=before.replaceAll('"/brand-name.css"','"/conexaocomunidade/brand-name.css"').replaceAll('"/brand-name.js"','"/conexaocomunidade/brand-name.js"');
 if(html.includes('pages-independent.js')&&!html.includes('conexao-config.js'))html=html.replace(/(<script\s+src=["'][^"']*pages-independent\.js["'][^>]*><\/script>)/,'<script src="/conexaocomunidade/conexao-config.js"></script>\n    $1');
 html=html.replace(/(\b(?:src|href)=["'])([^"']+\.(?:js|css))(["'])/g,(all,start,path,end)=>path.includes(':')?all:start+path+'?v='+version+end);
 if(html!==before)await writeFile(file,html);
}
