import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import api from './api/index.js';

const root=resolve(fileURLToPath(new URL('./public/',import.meta.url)));
const types={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml'};
export function createApp(){return createServer(async(req,res)=>{
  const url=new URL(req.url,'http://localhost');
  if(url.pathname==='/api/index'||url.pathname==='/api'||url.pathname==='/api/'){await api(req,res);return;}
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('X-Frame-Options','DENY');
  if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405);res.end('Method not allowed');return;}
  let path;
  try{path=resolve(root,'.'+decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname));}catch{res.writeHead(400);res.end('Bad path');return;}
  if(!path.startsWith(root+sep)){res.writeHead(404);res.end('Not found');return;}
  try{const body=await readFile(path);res.setHeader('Content-Type',types[extname(path)]||'application/octet-stream');res.end(req.method==='HEAD'?undefined:body);}catch{res.writeHead(404);res.end('File not found');}
});}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const port=Number(process.env.PORT||8000);createApp().listen(port,'127.0.0.1',()=>console.log(`AITU Lost & Found: http://localhost:${port}\nPress Ctrl+C to stop. SQLite data is saved in ./data unless a remote database is configured.`));
}
