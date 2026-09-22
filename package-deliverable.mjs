import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url));
const out=path.resolve(here,process.argv[2]||'deliverables');
await fs.mkdir(out,{recursive:true});
const dist=path.join(here,'dist');
let html=await fs.readFile(path.join(dist,'index.html'),'utf8');
const jsPath=html.match(/<script[^>]+src="([^"]+)"[^>]*><\/script>/)[1];
const cssPath=html.match(/<link[^>]+href="([^"]+\.css)"[^>]*>/)[1];
let js=await fs.readFile(path.join(dist,jsPath),'utf8');
const css=await fs.readFile(path.join(dist,cssPath),'utf8');
for(const [file,mime] of [['plan-crop.png','image/png'],['plan.pdf','application/pdf'],['spec.md','text/markdown;charset=utf-8'],['hardware-estimate.md','text/markdown;charset=utf-8']]) {
  const data=`data:${mime};base64,${(await fs.readFile(path.join(dist,file))).toString('base64')}`;
  js=js.replaceAll(`./${file}`,data);
}
const icon=await fs.readFile(path.join(dist,'favicon.svg'),'utf8');
html=html.replace(/href="\.\/favicon.svg"/,`href="data:image/svg+xml,${encodeURIComponent(icon)}"`);
html=html.replace(/<script[^>]+src="[^"]+"[^>]*><\/script>/,()=>`<script type="module">${js.replaceAll('</script','<\\/script')}</script>`);
html=html.replace(/<link[^>]+href="[^"]+\.css"[^>]*>/,()=>`<style>${css}</style>`);
await fs.writeFile(path.join(out,'B8-2F_互動模型_v0.3.html'),html);
console.log(`Standalone HTML: ${Buffer.byteLength(html)} bytes`);
