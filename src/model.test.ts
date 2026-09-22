import test from 'node:test';
import assert from 'node:assert/strict';
import { createModel, defaults, validateModel, alignmentFaceX, overlap, type Part } from './model.ts';

const result=(parts:Part[],id:string)=>validateModel(parts,defaults).find(c=>c.id===id)!.result;
test('baseline: finite positive solids, reference chains, half-wall and TV constraints',()=>{
  const parts=createModel(defaults);
  for(const p of parts) for(let i=0;i<3;i++) {
    assert.ok(Number.isFinite(p.min[i])&&Number.isFinite(p.max[i]),p.id);
    assert.ok(p.max[i]>p.min[i],`${p.id} axis ${i}`);
  }
  assert.equal(validateModel(parts,defaults).filter(c=>c.result==='fail').length,0);
  assert.equal(new Set(parts.map(p=>p.id)).size,parts.length);
});
test('alignment checks wall faces, catches a displaced primary bedroom wall',()=>{
  const parts=createModel(defaults);
  assert.equal(result(parts,'A03'),'pass');
  const wall=parts.find(p=>p.id==='master-halfwall')!;
  wall.min[0]-=1;wall.max[0]-=1;
  assert.equal(result(parts,'A03'),'fail');
});
test('a high wall or glass inserted over the tatami partition fails',()=>{
  for(const kind of ['wall','glass']) {
    const parts=createModel(defaults);
    parts.push({id:'bad-overhead',name:'錯誤新增隔間',kind,room:'tatami',min:[266,130,90],max:[275,300,340],color:'#fff',status:'proposed',source:'test'});
    assert.equal(result(parts,'A05'),'fail');
  }
  const parts=createModel(defaults);
  parts.find(p=>p.id==='tatami-halfwall')!.max[2]=340;
  assert.equal(result(parts,'A05'),'fail');
});
test('a cabinet or extended platform in the continuous leg zone fails',()=>{
  const parts=createModel(defaults);
  parts.push({id:'bad-drawer',name:'錯誤抽屜',kind:'furniture',room:'tatami',min:[220,200,0],max:[260,250,65],color:'#fff',status:'proposed',source:'test'});
  assert.equal(result(parts,'A08'),'fail');
});
test('a second television behind the sofa fails',()=>{
  const parts=createModel(defaults);
  parts.push({...parts.find(p=>p.kind==='tv')!,id:'bad-tv',min:[270,175,90],max:[275,298,160]});
  assert.equal(result(parts,'A09'),'fail');
});
test('kitchen reservation updates ceiling and glass while confirmed heights remain fixed',()=>{
  for(const drop of [20,45,90]) {
    const s={...defaults,kitchenDrop:drop};const parts=createModel(s);
    assert.equal(parts.find(p=>p.id==='kitchen-ceiling')!.min[2],340-drop);
    assert.equal(parts.find(p=>p.id==='master-partition-glass')!.max[2],340-drop);
    assert.equal(parts.find(p=>p.id==='tatami-platform')!.max[2],45);
    assert.equal(parts.find(p=>p.id==='tatami-halfwall')!.max[2],90);
    assert.equal(parts.find(p=>p.id==='closet-west-a')!.min[0],alignmentFaceX);
  }
});
test('all supported desk settings retain continuous clearance',()=>{
  for(const length of [140,160,180]) for(const depth of [45,60,70]) for(const height of [70,74,85]) {
    const settings={...defaults,deskLength:length,deskDepth:depth,deskHeight:height};
    assert.equal(validateModel(createModel(settings),settings).find(c=>c.id==='A08')!.result,'pass');
  }
});
test('the terrace transition contains no threshold, and datum uncertainty stays pending',()=>{
  const parts=createModel(defaults);
  assert.equal(parts.filter(p=>p.kind==='threshold').length,0);
  assert.equal(result(parts,'A10'),'pending');
  assert.equal(result(parts,'A11'),'pending');
  assert.equal(result(parts,'A12'),'pending');
});
test('parked door state moves all four leaves into the dressing-room pocket',()=>{
  const parts=createModel(defaults,'parked');
  const panels=parts.filter(p=>p.id.startsWith('kitchen-living-panel-'));
  assert.equal(panels.length,4);
  for(const p of panels){
    assert.ok(p.min[0]>=596.5&&p.max[0]<=674.625);
    assert.ok(p.min[1]>=431.4&&p.max[1]<=451.4);
  }
  assert.equal(validateModel(parts,defaults,'parked').find(c=>c.id==='A13')!.result,'pass');
});
test('integrated dressing-room cabinet uses the requested 70/41/20 split',()=>{
  const parts=createModel(defaults);
  const integrated=parts.find(p=>p.id==='closet-integrated-cabinet')!;
  const wardrobe=parts.find(p=>p.id==='closet-wardrobe-module')!;
  const electrical=parts.find(p=>p.id==='electrical-cabinet')!;
  const pocket=parts.find(p=>p.id==='closet-parking-pocket')!;
  assert.deepEqual(integrated.min,[596.5,320.4,0]);
  assert.deepEqual(integrated.max,[656.5,431.4,220]);
  assert.equal(wardrobe.max[1]-wardrobe.min[1],70);
  assert.equal(electrical.max[1]-electrical.min[1],41);
  assert.equal(overlap(integrated,pocket),false);
  assert.equal(validateModel(parts,defaults).find(c=>c.id==='A19')!.result,'pass');
  assert.equal(validateModel(parts,defaults).find(c=>c.id==='A20')!.result,'pass');
  assert.equal(validateModel(parts,defaults).find(c=>c.id==='A22')!.result,'pass');
});
