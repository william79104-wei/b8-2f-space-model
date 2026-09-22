import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { alignmentFaceX, type Part, type Settings } from './model';

export type View = 'overview' | 'top' | 'tatami' | 'master' | 'ceiling' | 'balcony';
export type SceneOptions = { cutaway:boolean; furniture:boolean; ceiling:boolean; dimensions:boolean; source:boolean };
const metric=(a:number)=>a/100;
function Box({part,selected,onSelect,cutaway}:{part:Part;selected:boolean;onSelect:(id:string)=>void;cutaway:boolean}) {
  const maxZ=part.wall&&cutaway?Math.min(part.max[2],140):part.max[2];
  const height=maxZ-part.min[2];
  const geometry=useMemo(()=>new THREE.BoxGeometry(metric(part.max[0]-part.min[0]),metric(Math.max(0.1,height)),metric(part.max[1]-part.min[1])),[part,height]);
  const edges=useMemo(()=>new THREE.EdgesGeometry(geometry),[geometry]);
  useEffect(()=>()=>{geometry.dispose();edges.dispose();},[geometry,edges]);
  if(height<=0)return null;
  const wire=part.kind==='door';
  function select(e:ThreeEvent<PointerEvent>){e.stopPropagation();onSelect(part.id);}
  return <group position={[metric((part.min[0]+part.max[0])/2),metric((part.min[2]+maxZ)/2),-metric((part.min[1]+part.max[1])/2)]}>
    <mesh geometry={geometry} onClick={select} castShadow={!['glass','ceiling','door'].includes(part.kind)} receiveShadow>
      <meshStandardMaterial color={selected?'#dcad5d':part.color} transparent={!!part.opacity||wire} opacity={wire?0.06:part.opacity??1} roughness={part.kind==='glass'?0.12:0.85} metalness={part.kind==='glass'?0.05:0} depthWrite={!part.opacity&&!wire}/>
    </mesh>
    <lineSegments geometry={edges} renderOrder={selected?9:1}>
      <lineBasicMaterial color={selected?'#9b6420':wire?'#b59260':'#55594f'} transparent opacity={selected?1:wire?0.65:part.kind==='glass'?0.5:0.18} />
    </lineSegments>
  </group>;
}
function TextLabel({text,position,color='#405950',width=1.2}:{text:string;position:[number,number,number];color?:string;width?:number}) {
  const sprite=useRef<THREE.Sprite>(null);
  const {camera,size}=useThree();
  const texture=useMemo(()=>{
    const c=document.createElement('canvas');c.width=768;c.height=144;const ctx=c.getContext('2d')!;
    ctx.fillStyle='rgba(248,247,241,0.94)';ctx.beginPath();ctx.roundRect(5,5,758,134,18);ctx.fill();
    ctx.font='500 54px sans-serif';ctx.fillStyle=color;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,384,76);
    const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;
  },[text,color]);
  useEffect(()=>()=>texture.dispose(),[texture]);
  useFrame(()=>{
    if(!sprite.current)return;
    const distance=camera.position.distanceTo(sprite.current.position);
    const screenWidth=Math.min(width*90,220,size.width*0.42);
    const w=screenWidth/size.height*distance*2*Math.tan(THREE.MathUtils.degToRad((camera as THREE.PerspectiveCamera).fov/2));
    sprite.current.scale.set(w,w*144/768,1);
  });
  return <sprite ref={sprite} position={position} renderOrder={20}><spriteMaterial map={texture} depthTest={false}/></sprite>;
}
function Line({points,color='#557a6b'}:{points:number[][];color?:string}) {
  const g=useMemo(()=>new THREE.BufferGeometry().setFromPoints(points.map(v=>new THREE.Vector3(v[0],v[1],v[2]))),[points]);
  useEffect(()=>()=>g.dispose(),[g]);
  return <lineSegments geometry={g}><lineBasicMaterial color={color} transparent opacity={0.85}/></lineSegments>;
}
function CameraControls({view,reset}:{view:View;reset:number}) {
  const {camera,gl,invalidate,size}=useThree();
  const controls=useMemo(()=>new OrbitControls(camera,gl.domElement),[camera,gl]);
  useEffect(()=>{controls.enableDamping=true;controls.dampingFactor=0.08;controls.minDistance=1;controls.maxDistance=35;controls.maxPolarAngle=Math.PI*0.49;const change=()=>invalidate();controls.addEventListener('change',change);return()=>{controls.removeEventListener('change',change);controls.dispose();};},[controls,invalidate]);
  useEffect(()=>{
    const presets:Record<View,{position:number[];target:number[]}>= {
      overview:{position:[-7.1,11.5,9.8],target:[4.3,0.25,-3.75]},
      top:{position:[4.325,15,-3.774],target:[4.325,0,-3.775]},
      tatami:{position:[5.1,3.8,1.3],target:[2.35,0.7,-2.15]},
      master:{position:[1.2,6.8,-1.1],target:[5.875,1.3,-4.3]},
      ceiling:{position:[-0.2,7.5,1.3],target:[4.45,2.55,-5.6]},
      balcony:{position:[-1.8,4.5,-2.0],target:[1.3,0.25,-4.8]},
    };
    const p=presets[view];
    const fit=Math.max(1,1.05/(size.width/size.height));
    camera.position.set(...p.position.map((v,i)=>p.target[i]+(v-p.target[i])*fit) as [number,number,number]);
    controls.target.set(...p.target as [number,number,number]);controls.update();invalidate();
  },[view,reset,camera,controls,invalidate,size.width,size.height]);
  useFrame(()=>controls.update());return null;
}
function Contents({parts,settings,view,reset,options,selected,onSelect}:{parts:Part[];settings:Settings;view:View;reset:number;options:SceneOptions;selected:string|null;onSelect:(id:string)=>void}) {
  const shown=parts.filter(p=>{
    if(!options.furniture&&['furniture','fixture','tv'].includes(p.kind))return false;
    if(p.kind==='ceiling'&&!options.ceiling&&view!=='ceiling')return false;
    if(view==='tatami')return ['tatami','living'].includes(p.room)&&p.id!=='entrance-cabinet';
    if(view==='master')return ['master','kitchen','closet','mainbath','bath'].includes(p.room)&&!['furniture','fixture'].includes(p.kind);
    if(view==='balcony')return ['terrace','balcony','tatami'].includes(p.room)&&!['furniture','fixture','desk','platform'].includes(p.kind);
    return true;
  });
  return <>
    <color attach="background" args={['#eeece5']}/>
    <ambientLight intensity={1.3}/><hemisphereLight args={['#ffffff','#a9aa98',1.1]}/>
    <directionalLight position={[1,14,6]} intensity={2.1} castShadow shadow-mapSize={[2048,2048]} shadow-camera-left={-12} shadow-camera-right={12} shadow-camera-top={12} shadow-camera-bottom={-12} shadow-bias={-0.0004}/>
    <mesh rotation={[-Math.PI/2,0,0]} position={[4.3,-0.135,-3.75]} receiveShadow><planeGeometry args={[200,200]}/><meshStandardMaterial color="#e9e7df" roughness={1}/></mesh>
    {shown.map(p=><Box key={p.id} part={p} selected={selected===p.id} onSelect={onSelect} cutaway={options.cutaway}/>)}
    {options.dimensions&&<>
      {view==='overview'&&<><Line points={[[0,0.04,0.65],[8.65,0.04,0.65],[0,0.04,0.5],[0,0.04,0.8],[8.65,0.04,0.5],[8.65,0.04,0.8]]}/><TextLabel text="原圖尺寸鏈 865 cm" position={[4.32,0.08,0.65]} width={2.1}/></>}
      {['overview','master'].includes(view)&&<><Line points={[[alignmentFaceX/100,0.04,0],[alignmentFaceX/100,0.04,-7.55]]} color="#b87732"/><TextLabel text="四段牆面共線" position={[5.875,1.6,-4.1]} width={1.6}/></>}
      {['overview','tatami'].includes(view)&&<><TextLabel text={`半牆 +${settings.halfWallTop} cm・上方開放`} position={[2.72,1.05,-2.4]} width={2}/><TextLabel text="平台 FL +45 cm" position={[0.95,0.52,-2.1]} width={1.55}/><TextLabel text="長桌・整段腿部淨空" position={[2.32,0.24,-1.6]} width={1.7}/></>}
      {view==='master'&&<TextLabel text="下方實牆・上方玻璃" position={[5.86,2.2,-6.35]} width={2.1}/>}
      {['overview','master'].includes(view)&&<><TextLabel text="右端牆內收門盒・短邊20 cm暫定" position={[6.35,2.15,-4.35]} width={2.35}/><TextLabel text="左側整合櫃 111 × 60 × 220 cm" position={[6.45,2.35,-3.72]} width={2.5}/><TextLabel text="格柵門客廳側開啟・前方不設占位" position={[5.25,1.55,-3.42]} width={2.8}/></>}
      {['overview','master'].includes(view)&&<TextLabel text="靠窗整面臥榻・268.5 × 60 cm 暫定" position={[7.2,0.65,-7.22]} width={2.65}/>} 
      {['overview','master'].includes(view)&&<TextLabel text="床頭櫃 182 × 20 × 110・凹槽 FL+75–95" position={[8.2,1.35,-6.05]} width={2.9}/>} 
      {['overview','tatami'].includes(view)&&<TextLabel text="玄關櫃整排延伸至次臥・暫定" position={[2.15,1.05,-0.32]} width={2.55}/>} 
      {view==='ceiling'&&<TextLabel text={`樓高 ${settings.height} − 預留 ${settings.kitchenDrop} = ${settings.height-settings.kitchenDrop} cm`} position={[4.35,3.55,-6.3]} width={3.4}/>}
      {view==='balcony'&&<TextLabel text="工作陽台 ↔ 露台・無新增門檻" position={[1.3,0.35,-4.8]} width={2.8}/>}
    </>}
    <CameraControls view={view} reset={reset}/>
  </>;
}
export function ModelScene(props:Parameters<typeof Contents>[0]) {
  return <div className="scene-host"><Canvas shadows dpr={[1,2]} camera={{position:[-7,11,9],fov:39,near:0.05,far:200}} gl={{antialias:true,preserveDrawingBuffer:true}} onCreated={({gl})=>{gl.setClearColor('#eeece5');gl.domElement.setAttribute('aria-label','B8-2F 可旋轉 3D 模型');}}><Contents {...props}/></Canvas></div>;
}
