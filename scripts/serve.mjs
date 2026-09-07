import http from 'node:http';
import {createReadStream,existsSync,statSync,realpathSync} from 'node:fs';
import {resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(fileURLToPath(new URL('../dist/client/',import.meta.url)));
const port=8766;
if(!existsSync(resolve(root,'index.html')))throw new Error('请先运行 npm run build。');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.rsc':'text/x-component','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon','.woff2':'font/woff2'};
const server=http.createServer((req,res)=>{
 const headers={'X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Cross-Origin-Resource-Policy':'same-origin','Cache-Control':'no-store','Content-Security-Policy':"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; connect-src 'self'; worker-src 'self' blob:; object-src 'none'; frame-ancestors 'none'"};
 if(!['127.0.0.1:8766','localhost:8766'].includes(req.headers.host||'')){res.writeHead(403,headers).end('Local access only');return;}
 if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,headers).end();return;}
 try{let pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);if(pathname.endsWith('/'))pathname+='index.html';
  let path=resolve(root,'.'+pathname);if(!extname(path)&&existsSync(path+'.html'))path+='.html';
  if(!path.startsWith(root+sep)||!existsSync(path)||!statSync(path).isFile()||!realpathSync(path).startsWith(root+sep)){res.writeHead(404,headers).end('Not found');return;}
  res.writeHead(200,{...headers,'Content-Type':types[extname(path)]||'application/octet-stream','Content-Length':statSync(path).size});if(req.method==='HEAD')res.end();else createReadStream(path).pipe(res);
 }catch{res.writeHead(400,headers).end('Bad request');}
});
server.on('error',e=>{console.error(e.code==='EADDRINUSE'?'8766 端口已被占用；请检查是否已打开导演台。':e.message);process.exitCode=1;});
server.listen(port,'127.0.0.1',()=>console.log('FRAME director: http://127.0.0.1:8766/ (local static files only)'));
