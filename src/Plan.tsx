import { alignmentFaceX, roomLabels, type Part } from './model';
export function Plan({parts,source,selected,onSelect}:{parts:Part[];source:boolean;selected:string|null;onSelect:(id:string)=>void}) {
  const ordered=[...parts.filter(p=>p.kind==='floor'),...parts.filter(p=>!['floor','ceiling'].includes(p.kind)&&p.min[2]<150)];
  return <svg className="plan-svg" viewBox="-75 -65 1005 900" role="img" aria-label="B8-2F 模型正上方平面，含尺寸與原圖疊合">
    <defs><pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse"><path d="M50 0H0V50" fill="none" stroke="#d9d9cf" strokeWidth=".8"/></pattern></defs>
    <rect x="-75" y="-65" width="1005" height="900" fill="url(#grid)"/>
    {source&&<image href="./plan-crop.png" x="0" y="0" width="865" height="755" preserveAspectRatio="none"/>}
    <g opacity={source?0.48:1}>{ordered.map(p=><rect key={p.id} x={p.min[0]} y={755-p.max[1]} width={p.max[0]-p.min[0]} height={p.max[1]-p.min[1]} fill={selected===p.id?'#d6a551':p.kind==='door'?'none':p.color} stroke={p.kind==='halfwall'?'#41675a':p.kind==='door'?'#b58147':'#817e72'} strokeWidth={p.kind==='halfwall'?2.8:0.7} strokeDasharray={p.kind==='door'?'5 4':undefined} onClick={()=>onSelect(p.id)} tabIndex={0} role="button" aria-label={p.name} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onSelect(p.id);}}}/>)}</g>
    <line x1={alignmentFaceX} y1="-20" x2={alignmentFaceX} y2="785" stroke="#ad752d" strokeWidth="1.8" strokeDasharray="8 6"/>
    <text x={alignmentFaceX+12} y="-30" className="plan-callout">牆面共線 X = 587.5</text>
    {!source&&roomLabels.map(r=><g key={r.name}><rect x={r.x-48} y={755-r.y-15} width="96" height="28" rx="5" fill="#f5f3ec" opacity=".85"/><text x={r.x} y={755-r.y+4} textAnchor="middle" className="plan-room">{r.name}</text></g>)}
    <g stroke="#496658" strokeWidth="1.4"><path d="M0 785H865 M0 775V795 M865 775V795 M-40 0V755 M-50 0H-30 M-50 755H-30"/></g>
    <text x="432.5" y="817" textAnchor="middle" className="plan-dimension">865 cm</text><text x="-48" y="385" textAnchor="middle" className="plan-dimension" transform="rotate(-90,-48,385)">755 cm</text>
    <text x="0" y="-30" className="plan-callout">圖面上方 ↑（非北向）</text>
  </svg>;
}
