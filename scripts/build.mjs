import {cp,mkdir,rm,readFile} from 'node:fs/promises';
await rm('dist',{recursive:true,force:true});await mkdir('dist',{recursive:true});
for(const path of ['index.html','styles.css','favicon.svg','src','app.json','LICENSE'])await cp(path,`dist/${path}`,{recursive:true});
await cp('docs/screenshots','dist/docs/screenshots',{recursive:true});
const html=await readFile('dist/index.html','utf8');for(const file of ['src/app.js','styles.css','favicon.svg'])if(!html.includes(file))throw new Error(`Missing entry reference ${file}`);
console.log('Built static Bytewell in dist/');
