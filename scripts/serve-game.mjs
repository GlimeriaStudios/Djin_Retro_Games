// Dependency-free Quick Drive preview. No online room API in this mode.
import http from 'node:http';import path from 'node:path';
import {readFile,stat} from 'node:fs/promises';import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../public/',import.meta.url));
const port=Number(process.env.PORT||4173);
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png'};
http.createServer(async(req,res)=>{
 try{
  let pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  if(pathname==='/'){res.writeHead(302,{Location:'/game/'});return res.end();}
  const filename=path.resolve(root,'.'+pathname);
  if(!filename.startsWith(root)){res.writeHead(403);return res.end();}
  const target=(await stat(filename)).isDirectory()?path.join(filename,'index.html'):filename;
  const bytes=await readFile(target);res.writeHead(200,{'Content-Type':types[path.extname(target)]||'application/octet-stream','Cache-Control':'no-store'});res.end(bytes);
 }catch{res.writeHead(404);res.end('Not found. Online rooms require npm run dev.');}
}).listen(port,'127.0.0.1',()=>console.log(`Quick Drive: http://127.0.0.1:${port}/game/ (offline rooms disabled)`));
