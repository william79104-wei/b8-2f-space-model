import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import * as THREE from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import {createModel,defaults,validateModel} from './src/model.ts';

const here=path.dirname(fileURLToPath(import.meta.url));
const out=path.resolve(here,process.argv[2]||'deliverables');
await fs.mkdir(out,{recursive:true});
const parts=createModel(defaults);
const scene=new THREE.Scene();scene.name='B8-2F_geometry_review_v0.3';
scene.userData={units:'m',source:'PL-01 + B8-2F 3D 建模規格 v1.0 + 樓高340cm + 更衣室整合櫃修改',status:'provisional-geometry-review',warning:'Includes explicitly marked provisional dimensions. Not construction drawings.',settings:defaults};
for(const p of parts){
  const size=p.max.map((v,i)=>(v-p.min[i])/100);
  const geometry=new THREE.BoxGeometry(size[0],size[2],size[1]);
  const material=new THREE.MeshStandardMaterial({color:p.color,roughness:p.kind==='glass'?0.12:0.85,transparent:p.opacity!==undefined||p.kind==='door',opacity:p.kind==='door'?0.06:p.opacity??1,depthWrite:!p.opacity});
  const mesh=new THREE.Mesh(geometry,material);
  mesh.name=p.id;
  mesh.position.set((p.min[0]+p.max[0])/200,(p.min[2]+p.max[2])/200,-(p.min[1]+p.max[1])/200);
  mesh.userData={...p,units:'cm',visualizationOnly:p.kind==='door'||p.kind==='ceiling'};
  scene.add(mesh);
}
globalThis.FileReader=class {
  result=null;onloadend=null;onerror=null;
  readAsArrayBuffer(blob){blob.arrayBuffer().then(value=>{this.result=value;this.onloadend?.({target:this});},error=>this.onerror?.(error));}
  readAsDataURL(blob){blob.arrayBuffer().then(value=>{this.result=`data:${blob.type};base64,${Buffer.from(value).toString('base64')}`;this.onloadend?.({target:this});},error=>this.onerror?.(error));}
};
const buffer=await new GLTFExporter().parseAsync(scene,{binary:true,onlyVisible:true});
await fs.writeFile(path.join(out,'B8-2F_幾何模型_v0.3.glb'),Buffer.from(buffer));
const checks=validateModel(parts,defaults);
await fs.writeFile(path.join(out,'B8-2F_模型資料_v0.3.json'),JSON.stringify({version:'0.3',units:'cm',coordinateSystem:'X 右、Y 圖上、Z 向上；一般地坪 FL0',source:'PL-01 + 規格v1.0 + 樓高340cm + 更衣室整合櫃修改',settings:defaults,parts,checks},null,2));
console.log(JSON.stringify({parts:parts.length,glbBytes:buffer.byteLength,checks:checks.map(c=>({id:c.id,result:c.result}))}));
