const testPages=new Set(['/teste','/teste.html','/entrar','/entrar.html','/contas','/contas.html','/offline','/offline.html']);
export function protectResponse(request:Request,response:Response){
  const path=new URL(request.url).pathname;
  const headers=new Headers(response.headers);
  headers.set('X-Content-Type-Options','nosniff');
  headers.set('Referrer-Policy','no-referrer');
  headers.set('Permissions-Policy','geolocation=(self), camera=(), microphone=(), payment=()');
  headers.set('X-Robots-Tag','noindex, nofollow, noarchive');
  if(path.startsWith('/api/')||testPages.has(path))headers.set('Cache-Control','private, no-store');
  const ancestors="frame-ancestors 'self' https://chatgpt.com https://*.chatgpt.com https://*.chatgpt.site";
  headers.set('Content-Security-Policy',testPages.has(path)?"default-src 'self'; script-src 'self' https://challenges.cloudflare.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; frame-src https://www.openstreetmap.org https://challenges.cloudflare.com; worker-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; "+ancestors:"object-src 'none'; base-uri 'self'; "+ancestors);
  return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
}
