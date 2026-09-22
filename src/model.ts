export type Status = 'confirmed' | 'drawing' | 'proposed';
export type DoorState = 'closed' | 'parked';
export type Vec3 = [number, number, number];
export type Part = {
  id: string; name: string; kind: string; room: string;
  min: Vec3; max: Vec3; color: string; status: Status; source: string;
  note?: string; opacity?: number; wall?: boolean;
};
export type Settings = {
  height: number; kitchenDrop: number; halfWallTop: number;
  secondarySill: number; deskHeight: number; deskLength: number; deskDepth: number;
};
export const defaults: Settings = {
  height: 340, kitchenDrop: 45, halfWallTop: 90,
  secondarySill: 120, deskHeight: 74, deskLength: 180, deskDepth: 60,
};
export const chains = [
  { name: '上側', segments: [260,15,61,251.5,9,268.5], total: 865 },
  { name: '下側', segments: [266,9,192.5,110,20.5,267], total: 865 },
  { name: '左側', segments: [274.5,15,142.5,15,308], total: 755 },
  { name: '右側', segments: [294.6,9,131,10.4,149.6,10.4,150], total: 755 },
];
// Origin: intersection of the left and lower 865 / 755 dimension-chain baselines.
// X: plan right. Y: plan up. Z: elevation. All values are centimetres.
export const alignmentFaceX = 260 + 15 + 61 + 251.5;
export const kitchenX = 275;
export const roomLabels = [
  { name:'露台', x:128, y:615 }, {name:'工作陽台',x:128,y:394},
  { name:'廚房・餐廳',x:441,y:699}, {name:'主臥',x:737,y:495},
  { name:'和室',x:88,y:218}, {name:'客廳',x:434,y:240},
  { name:'更衣室',x:724,y:385}, {name:'主衛浴',x:724,y:240},
  { name:'次衛浴',x:710,y:82}, {name:'玄關',x:517,y:75},
];
export function createModel(s: Settings, doorState: DoorState = 'closed'): Part[] {
  const p: Part[] = [];
  function add(id: string,name:string,kind:string,room:string,min:Vec3,max:Vec3,color:string,status:Status,source:string,note?:string,opacity?:number) {
    p.push({id,name,kind,room,min,max,color,status,source,note,opacity,wall:kind==='wall'});
  }
  const floor = (id:string,name:string,room:string,x0:number,y0:number,x1:number,y1:number,color:string) => add(id,name,'floor',room,[x0,y0,-12],[x1,y1,0],color,'drawing','PL-01 尺寸鏈；地坪厚度 12 僅作展示，不屬施工資料');
  floor('floor-living','客廳地坪','living',275,0,587.5,451.4,'#d5cec1');
  floor('floor-kitchen','餐廚地坪','kitchen',275,451.4,587.5,755,'#d9d3c9');
  floor('floor-master','主臥地坪','master',596.5,460.4,865,755,'#d9d0c0');
  floor('floor-closet','更衣室地坪','closet',596.5,320.4,865,451.4,'#d4cbbb');
  floor('floor-mainbath','主衛浴地坪','mainbath',598,160.4,865,310,'#b8c6c5');
  floor('floor-bath','次衛浴地坪','bath',598,0,865,150,'#bdccca');
  floor('floor-tatami','次臥地坪','tatami',0,0,266,308,'#d9d0c1');
  floor('floor-balcony','工作陽台地坪','balcony',0,323,260,480.5,'#cbd0c8');
  floor('floor-terrace','露台地坪','terrace',0,480.5,260,755,'#c3ccc5');
  add('entry-floor','玄關分區','floor','living',[467.5,0,0],[577.5,145,0.4],'#e4e0d7','drawing','PL-01 玄關位置；上緣分界暫示意');
  function wall(id:string,name:string,room:string,x0:number,y0:number,x1:number,y1:number,z0=0,z1=s.height,status:Status='drawing',source='PL-01；端點未標之局部尺寸依位置描繪，待複核') {
    add(id,name,'wall',room,[x0,y0,z0],[x1,y1,z1],'#e5e1d8',status,source,'一般牆頂暫採樓高；未扣樓板與非廚房天花厚度');
  }
  // Outer envelope is a provisional 15 cm wall; dimension-chain inside limits stay fixed.
  wall('outer-left','左外牆','outer',-15,0,0,755,0,s.height,'proposed','未標外牆厚；15 cm 展示占位');
  wall('outer-right','右外牆','outer',865,0,880,755,0,s.height,'proposed','未標外牆厚；15 cm 展示占位');
  wall('outer-bottom-a','下外牆','outer',-15,-15,467.5,0,0,s.height,'proposed','PL-01 入口左側；厚度暫 15');
  wall('outer-bottom-b','入口右側外牆','outer',577.5,-15,880,0,0,s.height,'proposed','PL-01 入口右側；厚度暫 15');
  // Keep the outdoor outer rail unconfirmed instead of inventing a wall to the ceiling.
  add('terrace-rail','露台邊界（高度待定）','railing','terrace',[0,755,0],[260,764,110],'#9ca9a5','proposed','PL-01 戶外邊界；高度 110 暫示意',undefined,0.4);
  wall('kitchen-exterior-a','餐廚窗側實牆','kitchen',260,755,360,770,0,s.height,'proposed');
  wall('kitchen-sill','廚房窗下牆 · 40 cm','kitchen',360,755,578,770,0,40,'confirmed','使用者：廚房窗台離地 40；水平開口範圍暫依原圖');
  wall('kitchen-exterior-b','餐廚窗右端','kitchen',578,755,596.5,770,0,s.height,'proposed');
  wall('master-sill','主臥窗下牆 · 40 cm','master',596.5,755,865,770,0,40,'confirmed','使用者：主臥窗台離地 40；窗寬依圖面範圍展示');
  const windowTop = Math.min(240,s.height-s.kitchenDrop-12);
  function glass(id:string,name:string,room:string,min:Vec3,max:Vec3,source:string,status:Status='proposed') { add(id,name,'glass',room,min,max,'#85b9b5',status,source,'玻璃厚度／框型暫示意',0.28); }
  glass('kitchen-window','廚房外窗','kitchen',[360,761,40],[578,763,windowTop],'窗台 40 已確認；窗頂與開口寬待確認');
  glass('master-window','主臥外窗','master',[596.5,761,40],[865,763,windowTop],'窗台 40 已確認；窗頂與開口寬待確認');
  wall('kitchen-window-head','廚房窗上牆','kitchen',360,755,578,770,windowTop,s.height,'proposed');
  wall('master-window-head','主臥窗上牆','master',596.5,755,865,770,windowTop,s.height,'proposed');
  wall('kitchen-west','廚房西側實牆','kitchen',260,460.4,275,755);
  wall('balcony-door-jamb','工作陽台門側','balcony',260,323,275,373,0,s.height,'proposed');
  wall('balcony-door-head','工作陽台門上牆','balcony',260,373,275,460.4,210,s.height,'proposed');
  // No threshold box exists at the terrace / work balcony junction.
  wall('tatami-north-left','次臥窗左側','tatami',0,308,60,323);
  wall('tatami-north-right','次臥窗右側','tatami',176,308,266,323);
  wall('tatami-sill','次臥窗下牆 · 基準待確認','tatami',60,308,176,323,0,s.secondarySill,'proposed','120 cm 已確認；模型暫從一般地坪量起');
  glass('tatami-window','次臥外窗','tatami',[60,314,s.secondarySill],[176,316,Math.max(windowTop,s.secondarySill+30)],'窗台量測面與窗頂待確認');
  wall('tatami-window-head','次臥窗上牆','tatami',60,308,176,323,Math.max(windowTop,s.secondarySill+30),s.height,'proposed');
  // This mesh is genuinely 90 cm high; no glass or high wall is instantiated above it.
  add('tatami-halfwall','和室／客廳半牆','halfwall','tatami',[266,128,0],[275,308,s.halfWallTop],'#859b90','confirmed','使用者：90 cm、沙發背後整段上方完全開放','90 數值已確認；FL±0 基準暫採。南端 128 為桌長配套展示值');
  wall('tatami-door-bottom','次臥門下端牆','tatami',266,0,275,42,0,s.height,'proposed');
  // Shared left-face constraint, not independently positioned wall centres.
  add('master-halfwall','主臥／餐廚半牆','halfwall','master',[alignmentFaceX,550,0],[alignmentFaceX+9,755,s.halfWallTop],'#859b90','confirmed','使用者：90 cm 實牆＋玻璃；左面與更衣室及衛浴共線','半牆南端與門洞端點暫依原圖示意');
  glass('master-partition-glass','主臥半牆上方玻璃','master',[alignmentFaceX+3.5,550,s.halfWallTop],[alignmentFaceX+5.5,755,s.height-s.kitchenDrop],'使用者：玻璃沿同一半牆；頂端暫接廚房天花');
  wall('master-door-head','主臥門上牆','master',alignmentFaceX,460.4,alignmentFaceX+9,550,210,s.height-s.kitchenDrop,'proposed');
  // The dressing-room side now reserves the return/pocket for the kitchen-living
  // glass partition.  The access door is shown as a separate provisional opening;
  // its final width and exact sill/jamb position still require the interior design.
  const closetEntryY0 = 340;
  const closetEntryY1 = 430;
  wall('closet-west-a','更衣室左側牆（門洞下段）','closet',alignmentFaceX,320.4,596.5,closetEntryY0);
  wall('closet-west-b','更衣室左側牆（門洞上段）','closet',alignmentFaceX,closetEntryY1,596.5,451.4);
  add('closet-entry-door','客廳至更衣室預留門洞','door','closet',[alignmentFaceX,closetEntryY0,0],[596.5,closetEntryY1,210],'#a28f72','proposed','使用者要求：更衣室左側預留可由客廳進入的門；門寬與開向待確認');
  // The linked door system is represented as a wall pocket at the right end
  // of the opening, rather than as an exposed stack beside the entry door.
  const partitionY = 451.4;
  const panelWidth = (alignmentFaceX - kitchenX) / 4;
  const pocketY0 = partitionY - 20;
  const pocketY1 = partitionY;
  const pocketX0 = 596.5;
  const pocketX1 = pocketX0 + panelWidth;
  add('closet-parking-pocket','牆內收門盒（3+0連動概念）','pocket','closet',[pocketX0,pocketY0,0],[pocketX1,pocketY1,s.height-s.kitchenDrop],'#b99763','proposed','影片參考：3+0同步連動拉門，門片往右端牆內收；本案以312.5 cm開口暫按4扇示意','牆盒完成厚度、內部軌道、檢修方式與結構補強待廠商；20 cm為模型占位，不是施工尺寸',0.24);
  wall('mainbath-west','主衛浴左側牆','mainbath',alignmentFaceX,150,598,320.4);
  wall('bath-west-a','次衛浴門左側牆下段','bath',alignmentFaceX,0,598,65,0,s.height,'proposed');
  wall('bath-west-head','次衛浴門上牆','bath',alignmentFaceX,65,598,150,210,s.height,'proposed');
  // Interior horizontal partitions are split around real openings.
  wall('master-closet-a','主臥／更衣室隔牆左段','closet',596.5,451.4,650,460.4);
  wall('master-closet-b','主臥／更衣室隔牆右段','closet',750,451.4,865,460.4);
  wall('master-closet-head','更衣室門上牆','closet',650,451.4,750,460.4,210,s.height,'proposed');
  wall('closet-bath-a','更衣室／主衛浴隔牆左段','mainbath',598,310,680,320.4);
  wall('closet-bath-b','更衣室／主衛浴隔牆右段','mainbath',770,310,865,320.4);
  wall('closet-bath-head','主衛浴門上牆','mainbath',680,310,770,320.4,210,s.height,'proposed');
  wall('bath-divider','主次衛浴隔牆','bath',598,150,865,160.4);
  // Equipment reservation is a volume, not a fabricated equipment model.
  add('kitchen-ceiling','廚房設備預留層','ceiling','kitchen',[275,451.4,s.height-s.kitchenDrop],[587.5,755,s.height],'#b4bcb2','proposed','本次：樓高 340；廚房吊隱冷氣＋除濕。暫預留 45 cm','覆蓋餐廚區域僅為預留範圍；設備、檢修及管線未定',0.22);
  // The platform deliberately stops before the desk; under-desk volume reaches FL 0.
  const deskEnd=308, deskStart=deskEnd-s.deskLength, deskBack=266, deskFront=deskBack-s.deskDepth;
  add('tatami-platform','和室架高平台 · FL+45','platform','tatami',[0,128,0],[deskFront,308,45],'#b9aa90','confirmed','PL-01 FL+45；整體和室；平面範圍與收納待確認','高度 45 已定；平台平面深度隨桌深連動，為草模示意');
  add('tatami-desk','半牆旁長桌','desk','tatami',[deskFront,deskStart,s.deskHeight-4],[deskBack,deskEnd,s.deskHeight],'#b99972','proposed','歷史建議 180 × 60 × H74；桌板厚暫 4','桌下整段開放；懸挑結構待設計。落腳面暫為 FL0');
  // Sofa is at the LEFT of the living room, back against the half-wall, facing right.
  add('sofa-base','客廳沙發','furniture','living',[277,140,0],[355,305,28],'#d0c5b5','proposed','使用者：沙發在左側、背靠和室半牆；外尺寸依原圖位置暫示意');
  add('sofa-back','沙發靠背','furniture','living',[277,140,28],[291,305,77],'#beb3a2','proposed','沙發示意；背面朝和室');
  add('sofa-seat-1','沙發坐墊 1','furniture','living',[291,149,28],[353,221,44],'#dbd2c4','proposed','沙發示意');
  add('sofa-seat-2','沙發坐墊 2','furniture','living',[291,224,28],[353,296,44],'#dbd2c4','proposed','沙發示意');
  add('sofa-arm-a','沙發扶手','furniture','living',[291,140,28],[355,149,57],'#c9bead','proposed','沙發示意');
  add('sofa-arm-b','沙發扶手','furniture','living',[291,296,28],[355,305,57],'#c9bead','proposed','沙發示意');
  add('tv-console','原圖右側電視櫃','furniture','living',[550,157,0],[587.5,320,42],'#a79a85','proposed','PL-01 電視櫃所在側；尺寸待確認');
  add('tv','唯一電視 · 客廳右側','tv','living',[546,175,70],[551,298,140],'#38413f','proposed','原圖右側；禁止沙發背後新增電視','尺寸為展示占位，位置關係已確認');
  add('kitchen-base','廚具下櫃','furniture','kitchen',[275,530,0],[336,755,85],'#c4c7bb','proposed','PL-01 61 cm 深度分段；高度及分段待確認');
  add('kitchen-counter','廚具檯面','furniture','kitchen',[275,530,85],[336,755,89],'#edebe3','proposed','檯面高度暫示意');
  add('sink','水槽位置','fixture','kitchen',[282,552,89],[325,602,91],'#899b99','proposed','PL-01 水槽位置；設備外尺寸待確認');
  add('hob','爐具位置','fixture','kitchen',[282,672,89],[325,726,91],'#53605b','proposed','PL-01 爐具位置；設備外尺寸待確認');
  add('fridge','冰箱位置','furniture','kitchen',[275,460.4,0],[336,530,180],'#b0b5ad','proposed','PL-01 REF；尺寸為占位');
  add('island','中島 · 90 × 90','furniture','kitchen',[426,625,0],[516,715,90],'#c2b49e','drawing','PL-01 90×90；左側距 90、上側距 40；高度 90 暫示意');
  add('table','餐桌 · 70 × 130','furniture','kitchen',[436,495,73],[506,625,77],'#c7bda9','drawing','PL-01 70×130；桌高及桌板厚暫示意');
  for(const x of [444,492]) for(const y of [506,612]) add(`table-leg-${x}-${y}`,'餐桌腳','furniture','kitchen',[x,y,0],[x+5,y+5,73],'#b0a58f','proposed','餐桌構造占位');
  // King mattress placeholder requested by the user: 182 × 188 cm. The
  // window-side edge is held at 60 cm so the proposed daybed can sit beside
  // the bed; frame dimensions remain unresolved.
  add('master-bed','主臥加大雙人床墊占位 · 182 × 188','furniture','master',[670,513,0],[858,695,45],'#e4dfd2','proposed','使用者要求：台規加大雙人床墊 182 × 188；右側仍留原圖約7 cm；床架外框、床頭板與實際定位待確認');
  add('master-daybed','主臥靠窗整面臥榻（突出占位）','furniture','master',[596.5,695,0],[865,755,45],'#c4b499','proposed','沿主臥靠窗上側整面牆；暫按268.5 × 60 × H45 cm，與加大床架相接；實際深度、高度、收口與窗扇開啟淨空待確認');
  add('master-pillow-a','枕頭示意','furniture','master',[827,566,45],[855,623,53],'#f3efe6','proposed','展示示意');
  add('master-pillow-b','枕頭示意','furniture','master',[827,634,45],[855,692,53],'#f3efe6','proposed','展示示意');
  // The door stack occupies the dressing-room west edge.  The electrical
  // cabinet is therefore moved to the opposite (east) wall so its front,
  // service clearance and ventilation are not behind the parked leaves.
  add('electrical-cabinet','電器櫃（右側牆暫定）','furniture','closet',[805,326,0],[865,405,220],'#8f806d','proposed','使用者需求：電器櫃整合路由器、NAS、Switch、PS5','為避開更衣室左側收門袋，電器櫃暫移至右側牆；分層、散熱、插座與維修淨空待確認');
  add('electrical-cabinet-service','電器櫃前方維修／散熱淨空（暫定）','furniture','closet',[745,326,0],[805,405,220],'#c3ab7f','proposed','本版電器櫃右側牆避讓配置','只作動線檢查占位；不得視為已確認的櫃前淨尺寸或設備尺寸',0.12);
  add('closet-right','更衣室右側一般收納櫃（避開電器櫃與牆盒）','furniture','closet',[810,410,0],[865,425,220],'#b8aa93','proposed','與電器櫃及牆內收門盒分區；櫃體尺寸與整合方式待確認');
  add('closet-left','更衣室左側櫃（避開牆內收門盒）','furniture','closet',[611.5,323,0],[647,425,220],'#b8aa93','proposed','本版不作電器櫃；牆內收門盒位於更衣室南側；櫃體實際深度待確認');
  add('bath-tub','主衛浴浴缸','fixture','mainbath',[785,171,0],[856,299,55],'#edf0eb','proposed','PL-01 浴缸位置；尺寸待確認');
  add('bath-tub-water','浴缸內部示意','fixture','mainbath',[794,182,55],[847,288,56],'#adc3be','proposed','設備外觀占位');
  add('main-wash','主衛浴面盆','fixture','mainbath',[605,262,0],[650,304,82],'#e6ece6','proposed','PL-01 設備位置；尺寸待確認');
  add('main-wc','主衛浴馬桶','fixture','mainbath',[605,188,0],[663,235,44],'#e6ece6','proposed','PL-01 設備位置；尺寸待確認');
  add('bath-wash','次衛浴面盆','fixture','bath',[609,8,0],[660,58,82],'#e6ece6','proposed','PL-01 設備位置；尺寸待確認');
  add('bath-wc','次衛浴馬桶','fixture','bath',[690,8,0],[735,72,44],'#e6ece6','proposed','PL-01 設備位置；尺寸待確認');
  glass('shower-screen','次衛浴淋浴分隔','bath',[759,0,0],[761,150,210],'PL-01 淋浴位置；分隔與高度待確認');
  add('entrance-cabinet','玄關櫃・客廳段','furniture','living',[275,0,0],[456,40,105],'#b9aa94','proposed','玄關櫃整排的客廳段；前緣、高度、櫃深與門片形式待確認');
  add('tatami-entry-cabinet','玄關櫃・次臥延伸段','furniture','tatami',[0,0,0],[266,40,105],'#b9aa94','proposed','與玄關櫃客廳段同一排延伸；跨越牆厚處須保留次臥門洞與結構牆，櫃體前緣、高度、櫃深與收口待確認');
  // Door leaves are deliberately wireframe in the viewer; their dimensions remain provisional.
  add('entry-door','玄關門洞','door','living',[467.5,-1,0],[577.5,1,210],'#a28f72','proposed','下鏈入口 110；門高 210 為示意');
  add('tatami-door','次臥門洞','door','tatami',[266,42,0],[268,128,210],'#a28f72','proposed','PL-01 位置；門尺寸待確認');
  add('master-door','主臥門洞','door','master',[588,460.4,0],[590,550,210],'#a28f72','proposed','PL-01 位置；門尺寸待確認');
  add('balcony-door','工作陽台門洞','door','balcony',[261,373,0],[263,460.4,210],'#a28f72','proposed','PL-01 位置；門尺寸待確認');
  // 312.5 cm kitchen/living partition: 4 provisional leaves at 78.125 cm.
  // In parked mode the linked leaves overlap inside the wall pocket and do not
  // remain exposed in the dressing-room entry.
  const partitionHeight = s.height - s.kitchenDrop;
  for(let i=0;i<4;i++) {
    const x0 = doorState==='closed' ? kitchenX + panelWidth*i : pocketX0;
    const y0 = doorState==='closed' ? partitionY-0.8 : pocketY0 + i*4.1;
    const x1 = doorState==='closed' ? x0+panelWidth : pocketX1;
    const y1 = doorState==='closed' ? partitionY+0.8 : y0+3.2;
    add(`kitchen-living-panel-${i+1}`,`廚房／客廳玻璃門 ${i+1}/4`,'door','kitchen',[x0,y0,0],[x1,y1,partitionHeight],'#86aaa1','proposed','全寬312.5 cm；4扇暫按每扇78.125 cm；參考影片採同步連動牆內收門',doorState==='closed'?'關閉狀態；玻璃厚度、五金與牆盒尺寸待廠商':'收起狀態；4扇門片重疊於右端牆內收門盒；實際3+0／4+0系統待廠商',0.18);
  }
  add('kitchen-living-partition-track','312.5 cm玻璃門上吊軌','door','kitchen',[kitchenX,partitionY-1.2,partitionHeight-3],[alignmentFaceX,partitionY+1.2,partitionHeight],'#a88959','proposed','使用者指定全寬312.5 cm；吊軌需固定於結構補強','停放端改至更衣室側；軌道剖面待確認',0.22);
  return p;
}
export type Check = { id:string; title:string; result:'pass'|'pending'|'fail'; detail:string };
export function overlap(a:Part,b:Part) { return a.min.every((v,i)=>Math.min(a.max[i],b.max[i])-Math.max(v,b.min[i])>0.1); }
export function validateModel(parts:Part[],s:Settings,doorState:DoorState='closed'):Check[] {
  const get=(id:string)=>parts.find(p=>p.id===id)!;
  const pocketX0=596.5;
  const pocketX1=pocketX0+(alignmentFaceX-kitchenX)/4;
  const pocketY1=451.4;
  const pocketY0=pocketY1-20;
  const chainOK=chains.every(c=>Math.abs(c.segments.reduce((a,b)=>a+b,0)-c.total)<0.1);
  const alignIds=['master-halfwall','closet-west-a','closet-west-b','mainbath-west','bath-west-a'];
  const alignOK=alignIds.every(id=>Math.abs(get(id).min[0]-alignmentFaceX)<0.1);
  const half=get('tatami-halfwall');
  const voidRegion={...half,min:[half.min[0],half.min[1],s.halfWallTop+0.1],max:[half.max[0],half.max[1],s.height]} as Part;
  const blocked=parts.filter(p=>p.kind!=='ceiling'&&p.id!==half.id&&overlap(p,voidRegion));
  const desk=get('tatami-desk');
  const legs={...desk,min:[desk.min[0],desk.min[1],0.1],max:[desk.max[0],desk.max[1],desk.min[2]-0.1]} as Part;
  const legBlocks=parts.filter(p=>p.id!==desk.id&&p.kind!=='floor'&&overlap(p,legs));
  const televisions=parts.filter(p=>p.kind==='tv');
  const tvObjects=parts.filter(p=>p.kind==='tv'||/電視/.test(p.name));
  const tvOK=televisions.length===1&&tvObjects.every(p=>p.min[0]>get('sofa-base').max[0]);
  const halfHeightOK=Math.abs(half.max[2]-90)<0.1&&Math.abs(half.min[2])<0.1;
  return [
    {id:'A01',title:'原圖尺寸鏈',result:chainOK?'pass':'fail',detail:'上／下 865；左／右 755 cm，四組加總一致。'},
    {id:'A02',title:'房間與門窗定位',result:'pending',detail:'主空間按尺寸鏈；未標的門窗端點及外牆厚仍需複核。'},
    {id:'A03',title:'主臥、更衣室與衛浴牆面共線',result:alignOK?'pass':'fail',detail:`牆段共用左側面 X=${alignmentFaceX} cm；門洞上下段仍保持同一完成面。`},
    {id:'A04',title:'主臥玻璃',result:'pending',detail:`玻璃實體已建；上緣暫接廚房 ${s.height-s.kitchenDrop} cm 預留天花。`},
    {id:'A05',title:'次臥上方完全開放',result:blocked.length||!halfHeightOK?'fail':'pass',detail:!halfHeightOK?'半牆實體高度不符合 90 cm。':blocked.length?`干涉：${blocked.map(p=>p.name).join('、')}`:`實際半牆頂 ${s.halfWallTop} cm，上方無玻璃或高牆；量測基準待確認。`},
    {id:'A06',title:'和室平台 +45',result:get('tatami-platform').max[2]===45?'pass':'fail',detail:'實體完成面 +45 cm；平台平面範圍仍為草模。'},
    {id:'A07',title:'長桌在半牆和室側',result:desk.max[0]<=half.min[0]?'pass':'fail',detail:'桌背貼半牆；次臥左側外牆沒有另加書桌。'},
    {id:'A08',title:'桌下連續腿部空間',result:legBlocks.length?'fail':'pass',detail:legBlocks.length?`干涉：${legBlocks.map(p=>p.name).join('、')}`:`連續淨空 ${s.deskLength} × ${s.deskDepth} × ${s.deskHeight-4} cm；尺寸與落腳面暫定。`},
    {id:'A09',title:'電視只在客廳右側',result:tvOK?'pass':'fail',detail:'僅一台電視；沙發在左側，背後沒有電視／電視牆。'},
    {id:'A10',title:'窗台與地坪基準',result:'pending',detail:`廚房／主臥 +40；次臥暫 +${s.secondarySill}。次臥量測面及窗頂待確認。`},
    {id:'A11',title:'工作陽台至露台無門檻',result:'pending',detail:'模型交界無新增檻、暫採連續地坪；現場標高、坡度未確認。'},
    {id:'A12',title:'樓高與廚房降板',result:'pending',detail:`樓高 ${s.height} 已提供；預留 ${s.kitchenDrop}，淨高暫 ${s.height-s.kitchenDrop}。樓板／設備尺寸仍需核對。`},
    {id:'A13',title:'廚房／客廳312.5 cm玻璃隔間',result:doorState==='closed' ? (Math.abs((get('kitchen-living-panel-4').max[0]-get('kitchen-living-panel-1').min[0])-312.5)<0.1?'pass':'fail') : (parts.filter(p=>p.id.startsWith('kitchen-living-panel-')).every(p=>p.min[0]>=pocketX0&&p.max[0]<=pocketX1&&p.min[1]>=pocketY0&&p.max[1]<=pocketY1)?'pass':'fail'),detail:doorState==='closed'?'4扇暫按每扇78.125 cm；關閉線跨越冰箱上方與側邊，門片往右端牆內收。':'收起狀態的4扇門片重疊於右端牆內收門盒；實際同步連動片數與軌道待廠商。'},
    {id:'A14',title:'右端牆內收門盒',result:'pending',detail:'本版改為牆內收門盒示意；盒體厚度、軌道、檢修面、結構補強及木作收口須以廠商平面／剖面覆核。'},
    {id:'A15',title:'工作陽台出口不放收門堆疊',result:'pass',detail:'收門盒位於廚房／客廳隔間右端；冰箱與工作陽台側未建立門片堆疊。'},
    {id:'A16',title:'電器櫃避開牆內收門盒',result:overlap(get('electrical-cabinet'),get('closet-parking-pocket'))?'fail':'pass',detail:overlap(get('electrical-cabinet'),get('closet-parking-pocket'))?'電器櫃與牆內收門盒重疊，無法維修。':'電器櫃暫置更衣室右側牆；與右端牆內收門盒分離，設備分層與實際維修淨空仍待確認。'},
    {id:'A17',title:'加大床與整面窗邊臥榻示意',result:'pending',detail:'床墊暫按182×188 cm；臥榻沿主臥靠窗整面牆暫按268.5×60 cm並與床架相接。床架外框、臥榻收口、窗扇開啟及實際走道待確認。'},
    {id:'A18',title:'玄關櫃延伸至次臥',result:'pending',detail:'玄關櫃分為客廳段與次臥段，前緣與高度暫對齊；次臥門洞、牆厚、櫃深、內部分格與收口待確認。'},
  ];
}
