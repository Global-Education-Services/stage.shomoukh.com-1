import fs from 'node:fs';
import path from 'node:path';
const files=fs.readdirSync('.').filter(file=>file.endsWith('.html'));
const html=new Map(files.map(file=>[file,fs.readFileSync(file,'utf8')]));
const failures=[];
for(const [file,source]of html){
 const ids=[...source.matchAll(/\bid="([^"]+)"/g)].map(match=>match[1]);
 if(new Set(ids).size!==ids.length)failures.push({file,issue:'duplicate ID'});
 for(const [,raw]of source.matchAll(/\b(?:href|src)="([^"]+)"/g)){
  if(/^(?:https?:|mailto:|tel:|data:|javascript:)/.test(raw))continue;
  const url=new URL(raw,'https://local.invalid/'+file),base=decodeURIComponent(url.pathname);
  const target=base==='/'?'index.html':base.slice(1);
  if(!fs.existsSync(target)&&!fs.existsSync(path.join('public',target)))failures.push({file,url:raw,issue:'missing local asset/page'});
  if(url.hash&&html.has(target)&&!html.get(target).includes(`id="${decodeURIComponent(url.hash.slice(1))}"`))failures.push({file,url:raw,issue:'missing fragment'});
 }
}
console.log(JSON.stringify({pages:files.length,failures},null,2));if(failures.length)process.exitCode=1;
