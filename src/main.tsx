import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { createModel, defaults, validateModel, type DoorState, type Settings } from './model';
import { ModelScene, type SceneOptions, type View } from './Scene';
import { Plan } from './Plan';
import './style.css';

function Icon({name,size=20}:{name:string;size?:number}) {
  const paths:Record<string,React.ReactNode>={
    cube:<><path d="m12 3 9 5v9l-9 5-9-5V8zM3 8l9 5 9-5M12 13v9"/></>,
    plan:<><rect x="3" y="3" width="18" height="18" rx="1"/><path d="M3 13h10V3m0 10v8m0-5h8"/></>,
    rotate:<><path d="M20 7a9 9 0 1 0 1 8M20 3v5h-5"/></>,
    download:<><path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/></>,
    check:<path d="m5 12 4 4L19 6"/>,
    arrow:<path d="m9 5 7 7-7 7"/>,
    eye:<><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></>,
    ruler:<><path d="m4 17 13-13 4 4L8 21ZM8 13l3 3m0-6 3 3m0-6 3 3"/></>,
    close:<path d="m6 6 12 12M18 6 6 18"/>,
    file:<><path d="M5 3h9l5 5v13H5zM14 3v6h5M8 13h8M8 17h5"/></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]||paths.cube}</svg>;
}
const viewNames:Record<View,string>={overview:'整體鳥瞰',top:'正上方平面',tatami:'和室與長桌',master:'主臥半牆',ceiling:'廚房設備層',balcony:'陽台至露台'};
const viewDescriptions:Record<View,string>={overview:'從格局開始，把每一處修改落在實際模型上。',top:'比對原圖尺寸鏈與模型牆位，點選構件查看依據。',tatami:'平台 +45 cm，半牆 +90 cm，桌下連續開放。',master:'主臥、更衣室與兩間衛浴共用同一條左側牆面。',ceiling:'楼高 340 cm；廚房暫預留 45 cm 給冷氣、除濕機及管線。',balcony:'工作陽台與露台交界不新增凸起門檻。'};
function download(name:string,data:BlobPart,type:string) {const u=URL.createObjectURL(new Blob([data],{type}));const a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);}
function App() {
  const [settings,setSettings]=useState<Settings>({...defaults});
  const [view,setView]=useState<View>('overview');
  const [options,setOptions]=useState<SceneOptions>({cutaway:true,furniture:true,ceiling:false,dimensions:true,source:false});
  const [doorState,setDoorState]=useState<DoorState>('closed');
  const [selected,setSelected]=useState<string|null>(null);
  const [panel,setPanel]=useState<'design'|'checks'|'settings'>('design');
  const [reset,setReset]=useState(0);
  const [toast,setToast]=useState('');
  const parts=useMemo(()=>createModel(settings,doorState),[settings,doorState]);
  const checks=useMemo(()=>validateModel(parts,settings,doorState),[parts,settings,doorState]);
  const item=parts.find(p=>p.id===selected);
  const passed=checks.filter(c=>c.result==='pass').length;
  const pending=checks.filter(c=>c.result==='pending').length;
  function showMessage(text:string){setToast(text);setTimeout(()=>setToast(''),3500);}
  function chooseView(v:View){setView(v);setSelected(null);setReset(r=>r+1);}
  function toggle(key:keyof SceneOptions){setOptions(o=>({...o,[key]:!o[key]}));}
  function exportData(){download('B8-2F-model-data.json',JSON.stringify({version:'0.3',units:'cm',coordinateSystem:'X 右、Y 圖上、Z 向上；FL0 為一般地坪',settings,doorState,warning:'含待確認展示值；幾何檢查通過不等於設計驗收完成',parts,checks},null,2),'application/json');showMessage('模型資料已匯出，包含門片狀態與電器櫃避讓標示。');}
  function capture(){
    if(view==='top'){
      const svg=document.querySelector('.plan-svg')!;const text=new XMLSerializer().serializeToString(svg);download('B8-2F-plan.svg',text,'image/svg+xml');
    }else {const c=document.querySelector('canvas')!;const a=document.createElement('a');a.download=`B8-2F-${view}.png`;a.href=c.toDataURL('image/png');a.click();}
    showMessage('目前視角已下載。');
  }
  return <div className="app">
    <header className="header">
      <div className="brand"><span className="brand-mark"><Icon name="plan" size={24}/></span><span><b>B8—2F</b><small>空間模型工作室</small></span></div>
      <div className="project-meta"><span>馥華之丘・陳宅</span><span className="meta-divider"/><span>幾何確認版 <b>01</b></span></div>
      <div className="header-actions"><a className="text-button" href="./plan.pdf" download="B8-2F平面配置圖.pdf"><Icon name="file" size={17}/>原始平面圖</a><button className="primary-button" onClick={exportData}><Icon name="download" size={17}/>匯出模型資料</button></div>
    </header>
    <div className="workspace">
      <aside className="left-sidebar">
        <div className="sidebar-heading"><span className="eyebrow">YOUR SPACE, IN DETAIL</span><h1>讓家的輪廓<br/>清楚成形。</h1><p>先確認空間，再決定細節。</p></div>
        <div className="nav-label">觀看視角 <span>06</span></div>
        <nav className="view-nav" aria-label="模型視角">
          {(Object.keys(viewNames) as View[]).map((v,i)=><button key={v} className={view===v?'active':''} onClick={()=>chooseView(v)} aria-pressed={view===v}><span className="nav-number">0{i+1}</span><span>{viewNames[v]}</span>{view===v?<span className="active-dot"/>:<Icon name="arrow" size={13}/>}</button>)}
        </nav>
        <div className="sidebar-card"><span className="small-label">本次新增</span><strong>340 <small>cm</small></strong><p>樓高已更新。廚房上方<br/>預留冷氣與除濕設備層。</p><button onClick={()=>{chooseView('ceiling');setPanel('settings');}}>檢視淨高設定 <Icon name="arrow" size={14}/></button></div>
        <div className="sidebar-foot"><span className="live-dot"/>依原圖 PL-01 建立<br/><small>2025.03.21 · 尺寸單位 cm</small></div>
      </aside>
      <main className="main">
        <div className="view-heading"><div><div className="eyebrow">B8-2F / SPATIAL STUDY</div><h2>{viewNames[view]}<span>模型 v0.3</span></h2><p>{viewDescriptions[view].replace('楼高','樓高')}</p></div><button className="icon-button" title="重設視角" aria-label="重設視角" onClick={()=>setReset(r=>r+1)}><Icon name="rotate"/></button></div>
        <div className="viewer" data-view={view}>
          <div className="viewer-topline"><span className="mode-badge"><span/>{view==='top'?'正交平面':options.cutaway?'剖視模式 · 一般牆裁切顯示':'完整牆高模式'}</span><button className="viewer-capture" onClick={capture}><Icon name="download" size={15}/>{view==='top'?'下載平面圖':'儲存視角'}</button></div>
          {view==='top'?<Plan parts={parts.filter(p=>options.furniture||!['furniture','fixture','tv'].includes(p.kind))} source={options.source} selected={selected} onSelect={setSelected}/>:<ModelScene parts={parts} settings={settings} view={view} reset={reset} options={options} selected={selected} onSelect={setSelected}/>}
          <div className="viewer-hint">{view==='top'?'點選構件，檢視尺寸與來源':'拖曳旋轉　·　滾輪縮放　·　右鍵平移'}</div>
          <div className="orientation"><span>圖上</span><i>↑</i><small>非北向</small></div>
          <div className="viewer-toolbar" role="group" aria-label="顯示選項">
            {view==='top'?<button className={options.source?'on':''} onClick={()=>toggle('source')} aria-pressed={options.source}><Icon name="file" size={16}/>疊合原圖</button>:<button className={options.cutaway?'on':''} onClick={()=>toggle('cutaway')} aria-pressed={options.cutaway}><Icon name="cube" size={16}/>剖視</button>}
            <button className={options.furniture?'on':''} onClick={()=>toggle('furniture')} aria-pressed={options.furniture}><Icon name="plan" size={16}/>家具</button>
            {view!=='top'&&<button className={doorState==='parked'?'on':''} onClick={()=>setDoorState(v=>v==='closed'?'parked':'closed')} aria-pressed={doorState==='parked'}><Icon name="arrow" size={16}/>{doorState==='parked'?'門片已收起':'收起門片'}</button>}
            {view!=='top'&&<button className={options.dimensions?'on':''} onClick={()=>toggle('dimensions')} aria-pressed={options.dimensions}><Icon name="ruler" size={16}/>標註</button>}
            {view!=='top'&&<button className={options.ceiling||view==='ceiling'?'on':''} onClick={()=>view==='ceiling'?chooseView('overview'):toggle('ceiling')} aria-pressed={options.ceiling||view==='ceiling'}><Icon name="eye" size={16}/>設備層</button>}
          </div>
        </div>
        <div className="model-summary"><div><span className="legend-dot confirmed"/>已確認高度／關係</div><div><span className="legend-dot drawing"/>原圖基準</div><div><span className="legend-dot proposed"/>展示尺寸仍待確認</div><span className="summary-note">灰模含暫定值，不是施工定案</span></div>
        <div className="metric-row"><div><span>主臥與和室半牆</span><b>{settings.halfWallTop}<small>cm</small></b><em>以一般地坪暫作基準</em></div><div><span>和室平台</span><b>+45<small>cm</small></b><em>已確認完成面高度</em></div><div><span>廚房暫定淨高</span><b>{settings.height-settings.kitchenDrop}<small>cm</small></b><em>設備預留 {settings.kitchenDrop} cm · 待確認</em></div></div>
      </main>
      <aside className="right-sidebar">
        <div className="panel-tabs" role="tablist" aria-label="模型資訊"><button role="tab" aria-selected={panel==='design'} className={panel==='design'?'active':''} onClick={()=>setPanel('design')}>設計重點</button><button role="tab" aria-selected={panel==='checks'} className={panel==='checks'?'active':''} onClick={()=>setPanel('checks')}>檢查</button><button role="tab" aria-selected={panel==='settings'} className={panel==='settings'?'active':''} onClick={()=>setPanel('settings')}>尺寸</button></div>
        <div className="panel-scroll">
          {item&&<section className="selection-card"><div className="selection-top"><span className="eyebrow">已選取構件</span><button className="plain-icon" aria-label="取消選取" onClick={()=>setSelected(null)}><Icon name="close" size={15}/></button></div><h3>{item.name}</h3><p>{item.source}</p><dl><div><dt>長 × 深 × 高</dt><dd>{item.max.map((v,i)=>+(v-item.min[i]).toFixed(1)).join(' × ')} cm</dd></div><div><dt>底 / 頂標高</dt><dd>{item.min[2]} / {item.max[2]} cm</dd></div></dl>{item.note&&<small>{item.note}</small>}<span className="status-tag">{item.status==='proposed'?'展示值・待確認':item.status==='drawing'?'含原圖尺寸・其餘待確認':'確認項目・詳見限制'}</span></section>}
          {panel==='design'&&<>
            <div className="panel-intro"><span className="small-label">這一版，先看這裡</span><h3>把修改做在模型裡。</h3></div>
            {[{n:'01',title:'兩種半牆，各有不同',text:'主臥上方有玻璃；和室上方完全開放。不是把高牆藏起來。',v:'master'}, {n:'02',title:'四段牆面，真正齊平',text:'主臥、更衣室與兩間衛浴，使用同一條左側牆面座標。',v:'top'}, {n:'03',title:'坐在和室，桌下能伸腿',text:'平台 +45，桌子沿半牆；下方整段留空，平台不塞進桌下。',v:'tatami'}, {n:'04',title:'沙發背後，不再有電視',text:'沙發放在客廳左側、背靠矮牆；唯一電視在客廳右側。',v:'overview'}].map(c=><button key={c.n} className="focus-card" onClick={()=>chooseView(c.v as View)}><span>{c.n}</span><div><h4>{c.title}</h4><p>{c.text}</p></div><Icon name="arrow" size={15}/></button>)}
            <div className="notice"><b>仍需確認的細節</b><p>次臥窗台量測面、桌子尺寸、門窗端點及設備降板高度。暫定值均保留在尺寸頁。</p><button onClick={()=>setPanel('settings')}>查看暫定尺寸 <Icon name="arrow" size={14}/></button></div>
          </>}
          {panel==='checks'&&<><div className="check-summary"><span className="small-label">目前幾何檢查</span><strong>{passed}<small> / {checks.length}</small></strong><p>{pending} 項待確認；通過只表示目前草模符合該項幾何檢查。</p></div><div className="checks-list">{checks.map(c=><div className="check" key={c.id}><span className={`check-symbol ${c.result}`}>{c.result==='pass'?<Icon name="check" size={13}/>:c.result==='fail'?'!':'·'}</span><div><h4>{c.title}</h4><p>{c.detail}</p><small>{c.id} · {c.result==='pass'?'草模幾何通過':c.result==='fail'?'需要修正':'待確認'}</small></div></div>)}</div></>}
          {panel==='settings'&&<><div className="panel-intro"><span className="small-label">尺寸與展示參數</span><h3>清楚保留每個假設。</h3><p>此處修改只作用於目前畫面。匯出資料可保存此版設定。</p></div><div className="locked-value"><span>樓高 · 使用者提供</span><strong>340 <small>cm</small></strong></div>
            <Setting label="廚房設備預留" value={settings.kitchenDrop} min={20} max={90} onChange={v=>setSettings(s=>({...s,kitchenDrop:v}))} note="暫 45 cm；需按機型、管線及檢修淨空確認。"/>
            <div className="height-equation"><span>340 − {settings.kitchenDrop}</span><b>{settings.height-settings.kitchenDrop} <small>cm</small></b><span>廚房暫定淨高</span></div>
            <div className="locked-value"><span>半牆頂 · 暫按一般地坪</span><strong>90 <small>cm</small></strong></div><div className="locked-value"><span>和室平台完成面 · 已確認</span><strong>+45 <small>cm</small></strong></div>
            <label className="field"><span>次臥窗台量測基準</span><select aria-label="次臥窗台量測基準" value={settings.secondarySill} onChange={e=>setSettings(s=>({...s,secondarySill:Number(e.target.value)}))}><option value="120">一般地坪 +120 cm（暫採）</option><option value="165">平台面 +120 cm（FL+165）</option></select><small>120 數值已定，量測面尚待確認。</small></label>
            <Setting label="長桌長度" value={settings.deskLength} min={140} max={180} onChange={v=>setSettings(s=>({...s,deskLength:v}))} note="本版沿半牆的可用展示範圍 180 cm，端點待確認。"/>
            <Setting label="桌面深度" value={settings.deskDepth} min={45} max={70} onChange={v=>setSettings(s=>({...s,deskDepth:v}))} note="平台邊緣同步退讓，桌下不被平台填滿。"/>
            <Setting label="桌面標高 FL" value={settings.deskHeight} min={70} max={85} onChange={v=>setSettings(s=>({...s,deskHeight:v}))} note="桌板暫厚 4 cm；落腳面暫 FL0，均待確認。"/>
            <button className="secondary-button" onClick={()=>{setSettings({...defaults});showMessage('已恢復本版展示尺寸。');}}>恢復本版設定</button>
          </>}
        </div>
        <div className="right-foot"><span className="foot-links"><a href="./spec.md" download="B8-2F建模規格.md"><Icon name="file" size={15}/>規格</a><a href="./hardware-estimate.md" download="B8-2F拉門五金估價評估.md"><Icon name="file" size={15}/>五金估價</a></span><span>v0.3 · 收門袋與電器櫃分離示意</span></div>
      </aside>
    </div>
    {toast&&<div className="toast" role="status"><Icon name="check" size={17}/>{toast}</div>}
  </div>;
}
function Setting({label,value,min,max,onChange,note}:{label:string;value:number;min:number;max:number;onChange:(v:number)=>void;note:string}) {
  return <label className="field"><span>{label}<small>待確認</small></span><div className="number-field"><input aria-label={label} type="number" value={value} min={min} max={max} step={1} onChange={e=>{const n=Number(e.target.value);if(Number.isFinite(n)&&n>=min&&n<=max)onChange(n);}}/><span>cm</span></div><small>{note}</small></label>;
}
class ErrorBoundary extends React.Component<{children:React.ReactNode},{error:string}> {
  state={error:''};static getDerivedStateFromError(e:Error){return {error:e.message};}
  render(){return this.state.error?<div className="error-screen"><h1>3D 畫面暫時無法開啟</h1><p>請啟用瀏覽器硬體加速，或重新整理。原始平面圖仍可查閱。</p><a href="./plan.pdf">開啟原始平面圖</a><pre>{this.state.error}</pre></div>:this.props.children;}
}
createRoot(document.getElementById('root')!).render(<ErrorBoundary><App/></ErrorBoundary>);
