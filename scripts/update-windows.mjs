import {cp,readFile,stat} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {homedir} from 'node:os';
import {createServer} from 'node:net';
import {spawn} from 'node:child_process';
const source=fileURLToPath(new URL('../',import.meta.url));
async function main(){
  if(process.platform!=='win32')throw new Error('Use npm start on this operating system. This launcher is for Windows.');
  const target=join(homedir(),'Downloads','AITU-Lost-and-Found-Registration-SQLite','aitu-lost-found');
  const pkg=JSON.parse(await readFile(join(target,'package.json'),'utf8'));
  if(pkg.name!=='aitu-lost-found-fullstack')throw new Error('The existing project folder was not found. Keep the archive and ask for the correct installation path.');
  await new Promise((resolve,reject)=>{const probe=createServer();probe.once('error',()=>reject(new Error('The website is still running on port 8000. Close its PowerShell window and run this launcher again.')));probe.listen(8000,'127.0.0.1',()=>probe.close(resolve));});
  if(resolve(source).toLowerCase()!==resolve(target).toLowerCase()){
    for(const dir of ['api','lib','public','scripts','tests','database'])await cp(join(source,dir),join(target,dir),{recursive:true,force:true});
    for(const name of ['package.json','package-lock.json','server.js','vercel.json','README.md','DEPLOYMENT.md','UPDATE-RU.md','DATABASE-RU.md','IMPORT-ASSIGNMENT3.cmd','UPDATE-WINDOWS.cmd','.env.example','.gitignore'])await cp(join(source,name),join(target,name),{force:true});
    console.log('Website files updated. data/, node_modules/ and .env were kept.');
  }
  let installed=true;try{await stat(join(target,'node_modules','@libsql','client'));}catch{installed=false;}
  const run=command=>new Promise((resolve,reject)=>{const child=spawn('cmd.exe',['/d','/s','/c',command],{cwd:target,stdio:'inherit'});child.on('error',reject);child.on('exit',code=>code===0?resolve():reject(new Error('Command stopped with exit code '+code)));});
  if(!installed)await run('npm.cmd ci');
  console.log('Starting http://localhost:8000 . Keep this window open.');await run('npm.cmd start');
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
