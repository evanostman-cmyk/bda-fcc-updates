/* BDA Channel Planner v1.9 — visual branching DAS / RF Site Plan
 * Single TX source, deterministic branch loss accounting, standalone/offline.
 * This is a preliminary schematic, NOT an RF propagation or compliance model.
 */
(()=>{
 'use strict';
 if(document.getElementById('bdaSitePlanTop'))return;
 const get=id=>document.getElementById(id);
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const num=(v,d=0)=>v!==''&&v!==null&&Number.isFinite(Number(v))?Number(v):d;
 const finite=(v,min,max,d=0)=>Math.max(min,Math.min(max,num(v,d)));
 const fmt=(n,d=2)=>Number.isFinite(n)?n.toFixed(d):'—';
 const watts=p=>Math.pow(10,(p-30)/10);
 const fmtW=p=>{const w=watts(p);if(!Number.isFinite(w))return '—';if(w<.0001||w>=1e6)return w.toExponential(3)+' W';return Number(w.toPrecision(6)).toLocaleString('en-US',{maximumFractionDigits:8})+' W';};
 const power=p=>`${fmt(p)} dBm · ${fmt(p-30)} dBW · ${fmtW(p)}`;
 const storage='BDA_SITE_PLAN_v1.9';
 const MAX=300;
 const TYPES=['tx','port','splitter','coupler','cable','amplifier','loss','connector','antenna'];
 const icons={tx:'📡',port:'↳',splitter:'⑂',coupler:'⑃',cable:'〰',amplifier:'▲',loss:'−',connector:'◦',antenna:'⌁'};
 const labels={tx:'TX source',port:'Output port',splitter:'Power splitter',coupler:'Directional coupler',cable:'Coax cable',amplifier:'Amplifier / gain',loss:'Loss / attenuator',connector:'Connector',antenna:'Server antenna'};
 const style=document.createElement('style');style.textContent=`
 .bsp-open{background:#244e60!important;border-color:#a6c8d1!important;color:#ecf8fb!important}
 dialog#bdaSitePlanDialog{width:min(1450px,calc(100vw - 16px));max-width:none;max-height:calc(100dvh - 14px);border:1px solid #b9d4de;border-radius:17px;box-sizing:border-box;padding:0;overflow:hidden;background:#f7fbfd;color:#163746}
 dialog#bdaSitePlanDialog[open]{display:flex;flex-direction:column;height:min(95dvh,1030px)}
 #bdaSitePlanDialog *{box-sizing:border-box}
 #bdaSitePlanDialog button{cursor:pointer}
 #bdaSitePlanDialog .bsp-head{flex:0 0 auto;padding:12px 18px;display:flex;align-items:center;justify-content:space-between;gap:12px;border-bottom:1px solid #c4d8e2;background:#eaf4f7}
 #bdaSitePlanDialog .bsp-head h2{font-size:1.22rem;margin:0;color:#154b63}
 #bdaSitePlanDialog .bsp-head p{font-size:.76rem;color:#577482;margin:3px 0 0;line-height:1.4}
 #bdaSitePlanDialog .bsp-actions{display:flex;flex-wrap:wrap;gap:7px;align-items:center}
 #bdaSitePlanDialog button,#bdaSitePlanDialog select,#bdaSitePlanDialog input{font:inherit}
 #bdaSitePlanDialog .bsp-btn{border:1px solid #bbd1d9;border-radius:8px;padding:7px 10px;font-size:.8rem;font-weight:700;background:white;color:#235369}
 #bdaSitePlanDialog .bsp-btn.primary{background:#156b82;color:white;border-color:#156b82}
 #bdaSitePlanDialog .bsp-btn.warn{color:#963e35;border-color:#dcb8ae;background:#fff5f1}
 #bdaSitePlanDialog .bsp-btn:disabled{opacity:.45;cursor:not-allowed}
 #bdaSitePlanDialog .bsp-form{display:flex;align-items:flex-end;flex-wrap:wrap;gap:8px;padding:11px 16px;border-bottom:1px solid #d2e0e6;background:white;flex:0 0 auto}
 #bdaSitePlanDialog .bsp-field{min-width:0;display:flex;flex-direction:column;gap:4px}
 #bdaSitePlanDialog .bsp-field label{font-size:.71rem;font-weight:750;color:#436778}
 #bdaSitePlanDialog .bsp-field input,#bdaSitePlanDialog .bsp-field select{height:34px;min-width:0;border-radius:7px;padding:5px 7px;border:1px solid #b6cbd4;background:#fff;color:#183e51;font-size:.83rem}
 #bdaSitePlanDialog .bsp-field input:focus,#bdaSitePlanDialog .bsp-field select:focus{outline:2px solid #57a9c4;outline-offset:1px}
 #bdaSitePlanDialog .bsp-main{flex:1 1 auto;min-height:0;display:grid;grid-template-columns:minmax(0,1fr) minmax(280px,330px)}
 #bdaSitePlanDialog .bsp-left{min-width:0;min-height:0;display:flex;flex-direction:column;border-right:1px solid #cadae1}
 #bdaSitePlanDialog .bsp-bar{flex:0 0 auto;display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 12px;background:#f0f8fa;border-bottom:1px solid #d3e2e7;flex-wrap:wrap}
 #bdaSitePlanDialog .bsp-bar strong{font-size:.83rem;color:#174b5b}
 #bdaSitePlanDialog .bsp-canvas{flex:1;min-height:0;overflow:auto;background-color:#f9fcfd;background-image:radial-gradient(#c7d9e0 .9px,transparent .9px);background-size:19px 19px;overscroll-behavior:contain}
 #bdaSitePlanDialog #bspSvg{display:block;max-width:none;overflow:visible}
 #bdaSitePlanDialog .bsp-node{cursor:pointer;outline:none}
 #bdaSitePlanDialog .bsp-node:focus .bsp-node-box{stroke:#b88726!important;stroke-width:4!important}
 #bdaSitePlanDialog .bsp-node:hover .bsp-node-box{stroke:#2c9ca3;stroke-width:3}
 #bdaSitePlanDialog .bsp-side{min-height:0;min-width:0;overflow-y:auto;padding:13px 14px 22px;background:#fff;overscroll-behavior:contain}
 #bdaSitePlanDialog .bsp-side h3{margin:0 0 9px;font-size:1rem;color:#174b62}
 #bdaSitePlanDialog .bsp-side .bsp-field{margin-bottom:9px}
 #bdaSitePlanDialog .bsp-side input,#bdaSitePlanDialog .bsp-side select{width:100%;height:38px}
 #bdaSitePlanDialog .bsp-readout{background:#eff8fa;border:1px solid #c1dfe5;border-radius:11px;padding:10px;margin:9px 0 12px;font-size:.77rem;line-height:1.6}
 #bdaSitePlanDialog .bsp-readout strong{font-size:.85rem;color:#13475a}
 #bdaSitePlanDialog .bsp-readout .bsp-power{font-weight:800;font-variant-numeric:tabular-nums;color:#0f647a;overflow-wrap:anywhere}
 #bdaSitePlanDialog .bsp-hint{font-size:.75rem;color:#617985;line-height:1.5}
 #bdaSitePlanDialog .bsp-side-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}
 #bdaSitePlanDialog .bsp-parts{border-top:1px solid #d8e4e8;margin-top:11px;padding-top:10px}
 #bdaSitePlanDialog .bsp-antennas{flex:0 0 auto;max-height:100px;overflow-y:auto;padding:8px 12px;border-top:1px solid #d6e4e9;background:#f5fafc;font-size:.77rem;color:#285769}
 #bdaSitePlanDialog .bsp-antennas button{border:1px solid #bed7db;background:#fff;border-radius:6px;padding:4px 7px;margin:2px 5px 2px 0;font-size:.74rem;color:#1a6071}
 #bdaSitePlanDialog .bsp-footer{flex:0 0 auto;display:flex;align-items:center;justify-content:space-between;gap:9px;flex-wrap:wrap;padding:10px 15px max(10px,env(safe-area-inset-bottom));border-top:1px solid #cadce3;background:#ebf5f7}
 #bdaSitePlanDialog .bsp-status{font-size:.74rem;color:#31596a;max-width:730px;line-height:1.4}
 #bdaSitePlanDialog .bsp-disclaimer{font-size:.71rem;color:#816034;line-height:1.4;background:#fff6e7;border:1px solid #e8d6ad;border-radius:7px;padding:6px 9px}
 @media(max-width:900px){dialog#bdaSitePlanDialog[open]{height:calc(100dvh - 12px)}#bdaSitePlanDialog .bsp-main{grid-template-columns: minmax(0,1fr) 255px}#bdaSitePlanDialog .bsp-head{padding:10px}}
 @media(max-width:650px){
  #bdaSitePlanDialog .bsp-head{max-height:110px;overflow-y:auto;flex-shrink:0;padding:8px}
  #bdaSitePlanDialog .bsp-form{max-height:165px;overflow-y:auto;flex-shrink:0;padding:8px}
  #bdaSitePlanDialog .bsp-main{display:flex;flex-direction:column;overflow-y:auto;min-height:0}
  #bdaSitePlanDialog .bsp-left{min-height:310px;height:350px;flex:0 0 auto}
  #bdaSitePlanDialog .bsp-side{min-height:225px;overflow:visible}
  #bdaSitePlanDialog .bsp-footer{padding:6px 8px;flex-direction:column;align-items:stretch;flex-wrap:nowrap;gap:4px;overflow:visible;max-height:none;flex-shrink:0}
  #bdaSitePlanDialog .bsp-footer .bsp-actions{display:flex;flex-wrap:nowrap;overflow-x:auto;overflow-y:hidden;white-space:nowrap;align-items:center;min-width:0;width:100%;padding-bottom:3px}
  #bdaSitePlanDialog .bsp-footer .bsp-btn{flex:0 0 auto}
  #bdaSitePlanDialog .bsp-status{width:100%}
  #bdaSitePlanDialog .bsp-head h2{font-size:1.04rem}
}
 `;document.head.appendChild(style);
 const button=document.createElement('button');button.type='button';button.id='bdaSitePlanTop';button.className='btn bsp-open';button.textContent='🗺 Site Plan';button.title='Branching DAS schematic: splitters, couplers, cable, amplifiers, antennas and EIRP';
 const beside=get('linkBudgetTop')||get('fccOpenTop');if(beside)beside.insertAdjacentElement('afterend',button);else document.querySelector('.top-actions')?.appendChild(button);
 const dlg=document.createElement('dialog');dlg.id='bdaSitePlanDialog';dlg.setAttribute('aria-labelledby','bspTitle');dlg.innerHTML=`
 <div class="bsp-head"><div><h2 id="bspTitle">🗺 DAS Site Plan <span style="font-size:.65em;color:#65838e">v1.13</span></h2><p>Build a live, branching signal-flow schematic. Select any node to add cable, splitters, couplers, amplifiers or antennas.</p></div><div class="bsp-actions"><button type="button" class="bsp-btn" id="bspToLink">⚡ Link Budget</button><button type="button" class="bsp-btn" id="bspToFCC">⌕ P25</button><button type="button" class="bsp-btn" id="bspClose">✕ Close</button></div></div>
 <div class="bsp-form"><div class="bsp-field" style="flex:1 1 165px"><label for="bspSiteName">Site plan name</label><input id="bspSiteName" maxlength="90" placeholder="Site name"></div><div class="bsp-field" style="width:108px"><label for="bspTX">TX conducted</label><input id="bspTX" type="number" step="any"></div><div class="bsp-field" style="width:88px"><label for="bspTXUnit">Unit</label><select id="bspTXUnit"><option>dBm</option><option>dBW</option><option>W</option></select></div><div class="bsp-field" style="width:110px"><label for="bspRefGain">Test ant. dBi</label><input id="bspRefGain" type="number" step="any"></div><div class="bsp-field" style="width:152px"><label for="bspAddType">Add component</label><select id="bspAddType"><option value="splitter">Splitter</option><option value="cable">Cable</option><option value="antenna">Antenna</option><option value="coupler">Coupler</option><option value="amplifier">Amplifier</option><option value="loss">Attenuator / loss</option><option value="connector">Connector</option></select></div><button type="button" id="bspAdd" class="bsp-btn primary">+ Add after selected</button></div>
 <div class="bsp-main"><section class="bsp-left"><div class="bsp-bar"><strong>Signal-flow diagram · select a node to edit</strong><div class="bsp-actions"><button type="button" id="bspZoomOut" class="bsp-btn" title="Zoom out">−</button><button type="button" id="bspZoomReset" class="bsp-btn" title="Fit to width">Fit</button><button type="button" id="bspZoomIn" class="bsp-btn" title="Zoom in">+</button><span id="bspZoomLabel" style="font-size:.75rem;color:#426575">100%</span></div></div><div class="bsp-canvas" id="bspCanvas"><svg xmlns="http://www.w3.org/2000/svg" id="bspSvg" aria-label="Interactive DAS signal-flow diagram"></svg></div><div class="bsp-antennas" id="bspAntennaList" aria-live="polite"></div></section><aside class="bsp-side" id="bspDetails" aria-live="polite"></aside></div>
 <div class="bsp-footer"><div class="bsp-actions"><button type="button" class="bsp-btn" id="bspExample">Load example</button><button type="button" class="bsp-btn" id="bspFromLB">Copy TX from Link Budget</button><button type="button" class="bsp-btn" id="bspUndo" disabled>↶ Undo delete</button><button type="button" class="bsp-btn warn" id="bspReset">Clear plan</button></div><div class="bsp-actions"><button type="button" class="bsp-btn" id="bspExportSVG">⬇ Diagram SVG</button><button type="button" class="bsp-btn" id="bspExportCSV">⬇ RF CSV</button><button type="button" class="bsp-btn" id="bspExportJSON">⬇ Save JSON</button><button type="button" class="bsp-btn" id="bspImportJSON">⬆ Load JSON</button><input id="bspFile" type="file" hidden accept=".json,application/json"></div><div class="bsp-status" id="bspStatus" role="status">Stored locally in this browser. Start by adding a splitter or cable after TX.</div></div>`;
 document.body.appendChild(dlg);
 let serial=0,scale=1,lastUndo=null;
 const id=()=>`n${Date.now().toString(36)}_${++serial}`;
 const root=()=>({id:'tx',parent:null,type:'tx',name:'BDA / TX output'});
 const fresh=()=>({format:'BDA-Site-Plan',version:'1.9',site:'New DAS site',sourceDbm:30,sourceUnit:'dBm',referenceDbi:0,selected:'tx',nodes:[root()]});
 let st=fresh();
 const defaultFor=type=>({id:id(),parent:null,type,name:labels[type]||type,
  ...(type==='cable'?{feet:100,lossPer100Ft:0}:{}),
  ...(type==='amplifier'?{gainDb:0}:{}),
  ...(['loss','connector'].includes(type)?{lossDb:0}:{}),
  ...(type==='splitter'?{ports:2,excessDb:0}:{}),
  ...(type==='coupler'?{throughLossDb:0,tapLossDb:10}:{}),
  ...(type==='antenna'?{gainDbi:0}:{})});
 const byId=id=>st.nodes.find(n=>n.id===id);
 const children=id=>st.nodes.filter(n=>n.parent===id);
 function scrub(raw){
  if(!raw||raw.format!=='BDA-Site-Plan'||!Array.isArray(raw.nodes))throw Error('Not a supported DAS Site Plan JSON');
  const safe=fresh();safe.site=String(raw.site||safe.site).slice(0,90);safe.sourceDbm=finite(raw.sourceDbm,-180,150,30);safe.sourceUnit=['dBm','dBW','W'].includes(raw.sourceUnit)?raw.sourceUnit:'dBm';safe.referenceDbi=finite(raw.referenceDbi,-60,60,0);safe.nodes=[root()];
  const possible=raw.nodes.slice(0,MAX).filter(n=>n&&typeof n.id==='string'&&n.id!=='tx'&&TYPES.includes(n.type));
  const staged=new Map(possible.map(n=>[n.id,n]));const seen=new Set(['tx']);
  // Iterative traversal prevents orphaned nodes, cycles, and deep-recursion hangs.
  for(let pass=0;pass<MAX;pass++){
   let added=0;
   for(const n of possible){if(seen.has(n.id)||!seen.has(n.parent))continue;
    const x=defaultFor(n.type);x.id=n.id.slice(0,75);x.parent=n.parent;x.name=String(n.name||labels[n.type]).slice(0,90);
    for(const f of ['feet','lossPer100Ft','gainDb','lossDb','ports','excessDb','throughLossDb','tapLossDb','gainDbi'])if(n[f]!==undefined)x[f]=finite(n[f],f==='gainDbi'?-60:0,f==='feet'?200000:f==='ports'?8:200,x[f]||0);
    // Optional v1.13 equipment metadata remains backwards-compatible with older JSON files.
     for(const f of ['vendor','model','partNumber','specSource'])if(n[f]!==undefined)x[f]=String(n[f]??'').slice(0,120);
     if(n.specConfirmed!==undefined)x.specConfirmed=n.specConfirmed===true;
     if(n.unitCost!==undefined&&n.unitCost!==null)x.unitCost=finite(n.unitCost,0,10000000,0);
     for(const f of ['maxInputDbm','maxOutputDbm'])if(n[f]!==undefined&&n[f]!==null&&Number.isFinite(Number(n[f])))x[f]=finite(n[f],-180,150,0);
     if(x.type==='splitter')x.ports=Math.max(2,Math.min(8,Math.round(x.ports||2)));
    if(x.type==='antenna' && (possible.some(k=>k.parent===x.id)))continue;
    safe.nodes.push(x);seen.add(n.id);added++;
   }
   if(!added)break;
  }
  // Reject invalid topology (one serial child; ports only under branch devices).
  const nmap=new Map(safe.nodes.map(n=>[n.id,n]));const counts=new Map();
  safe.nodes=safe.nodes.filter(n=>{
   if(n.type==='tx')return true;
   const parent=nmap.get(n.parent);if(!parent)return false;
   if(n.type==='port'&&!['splitter','coupler'].includes(parent.type))return false;
   if(['splitter','coupler'].includes(parent.type)&&n.type!=='port')return false;
   const numSoFar=counts.get(n.parent)||0;counts.set(n.parent,numSoFar+1);
   return ['splitter','coupler'].includes(parent.type)||numSoFar===0;
  });
  for(const n of [...safe.nodes])if(n.type==='splitter'||n.type==='coupler'){
   const ports=safe.nodes.filter(x=>x.parent===n.id&&x.type==='port');const count=n.type==='splitter'?n.ports:2;
   for(let i=ports.length;i<count;i++){const port=defaultFor('port');port.parent=n.id;port.name=n.type==='coupler'?(i===0?'Through':'Tap'):`Port ${i+1}`;port.portIndex=i;safe.nodes.push(port)}
   ports.forEach((x,i)=>{x.portIndex=i;x.name=n.type==='coupler'?(i===0?'Through':'Tap'):`Port ${i+1}`});
  }
  // Import detached/invalid descendants are excluded rather than assigned guessed RF paths.
  let reachable=new Set(['tx']);for(let i=0;i<MAX;i++){let grew=false;for(const n of safe.nodes){if(reachable.has(n.id)||!reachable.has(n.parent))continue;reachable.add(n.id);grew=true;}if(!grew)break}
  safe.nodes=safe.nodes.filter(n=>reachable.has(n.id));safe.selected=safe.nodes.some(n=>n.id===raw.selected)?raw.selected:'tx';return safe;
 }
 try{const saved=localStorage.getItem(storage);if(saved)st=scrub(JSON.parse(saved))}catch(_){st=fresh()}
 const persist=()=>{try{localStorage.setItem(storage,JSON.stringify(st));get('bspStatus').textContent='Site plan saved locally · export JSON to back up your work.'}catch(_){get('bspStatus').textContent='Browser storage not available. Export JSON to save your work.'}
   window.dispatchEvent(new Event('batwing:siteplan-change'));
  };
 function makePorts(n){const count=n.type==='splitter'?n.ports:2;for(let i=0;i<count;i++){const p=defaultFor('port');p.parent=n.id;p.portIndex=i;p.name=n.type==='coupler'?(i===0?'Through':'Tap'):`Port ${i+1}`;st.nodes.push(p)}}
 function ensureLimit(extra){if(st.nodes.length+extra>MAX){window.alert('Limit: 300 diagram elements per site plan.');return false}return true}
 function attach(type,targetId=st.selected){
  let target=byId(targetId);if(!target)return;
  if(target.type==='antenna')target=byId(target.parent)||target;
  if(['splitter','coupler'].includes(target.type)){
   const outs=children(target.id);const empty=outs.find(n=>!children(n.id).length);
   if(!empty){window.alert('All splitter/coupler outputs have connected components. Select an output port or a component along the path to insert before its next stage.');return}
   target=empty;
  }
  if(target.type==='antenna')return;
  const needed=1+(type==='splitter'?2:type==='coupler'?2:0);if(!ensureLimit(needed))return;
  const next=children(target.id)[0];
  if(type==='antenna'&&next?.type==='antenna'){
   window.alert('This path already ends at an antenna. Select an unused splitter/coupler output to create another antenna path, or delete the existing antenna first.');return;
  }
  const n=defaultFor(type);n.parent=target.id;st.nodes.push(n);
  if(type==='splitter'||type==='coupler'){
   makePorts(n);
   if(next)next.parent=children(n.id)[0].id;
  }else if(next)next.parent=n.id;
  st.selected=n.id;lastUndo=null;render(true);persist();
 }
 function removeSelected(){
  const node=byId(st.selected);if(!node||node.type==='tx'||node.type==='port')return;
  const snapshot=JSON.stringify(st);
  if(['splitter','coupler'].includes(node.type)){
   const descendants=[];const todo=[node.id];while(todo.length){const x=todo.pop();descendants.push(x);todo.push(...children(x).map(n=>n.id))}
   if(descendants.length>1&&!window.confirm(`Delete ${node.name} and all ${descendants.length-1} downstream port/components? This will remove the connected branches.`))return;
   const doomed=new Set(descendants);st.nodes=st.nodes.filter(n=>!doomed.has(n.id));
  }else{
   const follow=children(node.id)[0];if(follow)follow.parent=node.parent;
   st.nodes=st.nodes.filter(x=>x.id!==node.id);
  }
  st.selected=node.parent;lastUndo=snapshot;render(true);persist();
 }
 function shrinkPorts(n,requested){
  const old=children(n.id),wanted=Math.max(2,Math.min(8,Math.round(requested)));
  if(wanted===old.length)return true;
  if(wanted<old.length){const removed=old.slice(wanted);const branchIds=[];let needsConfirm=false;
   for(const port of removed){const all=[port.id],stack=[port.id];while(stack.length){const cur=stack.pop();for(const x of children(cur)){all.push(x.id);stack.push(x.id)}}if(all.length>1)needsConfirm=true;branchIds.push(...all)}
   if(needsConfirm&&!window.confirm('Reducing output count will delete downstream components on removed ports. Continue?'))return false;
   const doomed=new Set(branchIds);st.nodes=st.nodes.filter(x=>!doomed.has(x.id));
   if(doomed.has(st.selected))st.selected=n.id;
  }else{
   if(!ensureLimit(wanted-old.length))return false;
   for(let i=old.length;i<wanted;i++){const x=defaultFor('port');x.parent=n.id;x.portIndex=i;x.name=`Port ${i+1}`;st.nodes.push(x)}
  }
  n.ports=wanted;return true;
 }
 function evaluate(){
  const result=new Map(),warnings=[];
  const walk=(nodeId,input,depth=0)=>{
   if(depth>MAX)return;const n=byId(nodeId);if(!n)return;
   let delta=0,eirp=null;
   const parent=byId(n.parent);
   if(n.type==='port'&&parent){
    if(parent.type==='splitter')delta=-10*Math.log10(Math.max(2,parent.ports)) - num(parent.excessDb);
    if(parent.type==='coupler')delta=-(n.portIndex===0?num(parent.throughLossDb):num(parent.tapLossDb));
   }else if(n.type==='cable')delta=-num(n.feet)*num(n.lossPer100Ft)/100;
   else if(n.type==='amplifier')delta=num(n.gainDb);
   else if(n.type==='loss'||n.type==='connector')delta=-num(n.lossDb);
   const out=input+delta;
   if(n.type==='antenna')eirp=out+num(n.gainDbi);
   result.set(n.id,{input,delta,out,eirp,referenceEirp:out+st.referenceDbi});
   for(const c of children(n.id))walk(c.id,out,depth+1);
  };
  walk('tx',st.sourceDbm);
  if([...result.values()].some(x=>x.out>80))warnings.push('Some stages exceed +80 dBm conducted; check equipment ratings and entry values.');
  return {results:result,warnings};
 }
 function nodePath(node){const steps=[];let n=node;for(let i=0;i<MAX&&n;i++){steps.push(n.name);n=byId(n.parent)}return steps.reverse().join(' → ')}
 const svgEscape=esc;
 function graphLayout(){
  const yMap=new Map();let leaf=0,maxDepth=0;
  const positions=new Map();
  function arrange(n,depth){maxDepth=Math.max(maxDepth,depth);const c=children(n.id);let y;
   if(!c.length){y=88+leaf++*128}else{const ys=c.map(k=>arrange(k,depth+1));y=(Math.min(...ys)+Math.max(...ys))/2}
   positions.set(n.id,{x:40+depth*244,y,depth});return y;
  }
  arrange(byId('tx'),0);
  return {positions,width:Math.max(920,40+maxDepth*244+240),height:Math.max(440,176+Math.max(0,leaf-1)*128),leaves:leaf};
 }
 function svgGraphic(){
  const {results}=evaluate();const lay=graphLayout(),nodeW=194,nodeH=92;
  const connectors=st.nodes.filter(n=>n.parent&&lay.positions.has(n.id)&&lay.positions.has(n.parent)).map(n=>{
   const p=lay.positions.get(n.parent),q=lay.positions.get(n.id);
   const sx=p.x+nodeW,sy=p.y,ex=q.x,ey=q.y,mx=(sx+ex)/2;
   return `<path d="M ${sx} ${sy} C ${mx} ${sy},${mx} ${ey},${ex} ${ey}" fill="none" stroke="#6aafbd" stroke-width="2.5"/><path d="M ${ex-9} ${ey-4} L ${ex} ${ey} L ${ex-9} ${ey+4}" stroke="#6aafbd" stroke-width="2" fill="none"/>`;
  }).join('');
  const svgNodes=st.nodes.filter(n=>lay.positions.has(n.id)).map(n=>{
   const q=lay.positions.get(n.id),cal=results.get(n.id);if(!cal)return '';
   const chosen=st.selected===n.id,isAnt=n.type==='antenna',isPort=n.type==='port';
   const bg=isAnt?'#e7f7ed':n.type==='splitter'?'#fff6df':n.type==='coupler'?'#fff3e9':isPort?'#f0f9fb':n.type==='tx'?'#d9eef5':'#ffffff';
   const border=chosen?'#d49b21':isAnt?'#469a6a':isPort?'#a1ccd7':'#91bdc9';
   const name=n.name.length>25?n.name.slice(0,23)+'…':n.name;
   const detail=isAnt?'EIRP '+fmt(cal.eirp)+' dBm':n.type==='cable'?`${fmt(n.feet,0)} ft × ${fmt(n.lossPer100Ft)} dB/100ft`:n.type==='splitter'?`${n.ports}-way · ideal −${fmt(10*Math.log10(n.ports))} dB/port`:n.type==='coupler'?'Through / tap outputs':n.type==='amplifier'?`Gain +${fmt(n.gainDb)} dB`:n.type==='loss'||n.type==='connector'?`Loss −${fmt(n.lossDb)} dB`:n.type==='port'?`Port Δ ${fmt(cal.delta)} dB`:'TX source';
   return `<g class="bsp-node" role="button" tabindex="0" data-site-node="${svgEscape(n.id)}" aria-label="${svgEscape(n.name)}: ${fmt(cal.out)} dBm" transform="translate(${q.x},${q.y-nodeH/2})">
     <rect class="bsp-node-box" width="${nodeW}" height="${nodeH}" rx="11" fill="${bg}" stroke="${border}" stroke-width="${chosen?3.5:1.8}"/><rect x="1" y="1" width="${nodeW-2}" height="25" rx="10" fill="${chosen?'#e9c979':'#e4eef2'}" opacity=".78"/>
     <text x="9" y="18" fill="#16485c" font-weight="750" font-size="12.2">${svgEscape(icons[n.type]||'•')} ${svgEscape(name)}</text>
     <text x="9" y="43" fill="#426d7b" font-size="10.5">${svgEscape(detail.length>33?detail.slice(0,31)+'…':detail)}</text>
     <text x="9" y="62" fill="#145c73" font-size="13" font-weight="760">${fmt(cal.out)} dBm</text>
     <text x="9" y="78" fill="${isAnt?'#168153':'#526e7d'}" font-size="10.7" font-weight="650">${isAnt?'Radiated EIRP: '+fmt(cal.eirp)+' dBm':fmt(cal.out-30)+' dBW · '+fmtW(cal.out)}</text>
    </g>`;
  }).join('');
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${lay.width}" height="${lay.height}" viewBox="0 0 ${lay.width} ${lay.height}" role="img" aria-label="DAS power and antenna distribution schematic"><rect width="100%" height="100%" fill="#f9fcfd"/>${connectors}${svgNodes}<text x="24" y="${lay.height-20}" fill="#7594a1" font-size="11">Site Plan v1.11 · preliminary conducted-power schematic · select nodes to edit</text></svg>`;
  return {svg,layout:lay};
 }
 let lastGraphic=null;
 function updateDiagram(){
  const d=svgGraphic();lastGraphic=d;const canvas=get('bspSvg');const wrapper=document.createElement('div');wrapper.innerHTML=d.svg;const built=wrapper.firstChild;
  canvas.replaceWith(built);built.id='bspSvg';built.style.width=(d.layout.width*scale)+'px';built.style.height=(d.layout.height*scale)+'px';
  get('bspZoomLabel').textContent=Math.round(scale*100)+'%';
 }
 function setFit(){const canvas=get('bspCanvas');const layout=graphLayout();scale=Math.min(1.25,Math.max(.40,(canvas.clientWidth-20)/layout.width));updateDiagram()}
 const editInput=(key,val,unit='')=>`<div class="bsp-field"><label for="bspEdit_${key}">${esc(val)}</label><input id="bspEdit_${key}" data-site-field="${key}" type="number" step="any" value="${esc(byId(st.selected)?.[key]??0)}"/>${unit?`<small class="bsp-hint">${esc(unit)}</small>`:''}</div>`;
 function updateSide(){
  const n=byId(st.selected),cal=evaluate().results.get(n?.id),side=get('bspDetails');if(!n||!cal)return;
  const read=`<div class="bsp-readout"><strong>Input conducted</strong><div class="bsp-power">${power(cal.input)}</div><strong>Stage effect</strong><div>${cal.delta>=0?'+':''}${fmt(cal.delta)} dB</div><strong>Output conducted</strong><div class="bsp-power">${power(cal.out)}</div><strong>${n.type==='antenna'?'Actual calculated antenna EIRP':'EIRP if test antenna connected here'}</strong><div class="bsp-power">${power(n.type==='antenna'?cal.eirp:cal.referenceEirp)}</div></div>`;
  let params='';
  if(n.type==='cable')params=editInput('feet','Cable length (ft)')+editInput('lossPer100Ft','Cable loss (dB / 100 ft)','Set from the cable manufacturer at your operating frequency; default 0.');
  else if(n.type==='amplifier')params=editInput('gainDb','Stage gain (dB)','Use measured or rated net gain for this branch.');
  else if(n.type==='loss'||n.type==='connector')params=editInput('lossDb','Insertion loss (dB)');
  else if(n.type==='splitter')params=`<div class="bsp-field"><label for="bspEdit_ports">Output ports</label><select id="bspEdit_ports" data-site-field="ports">${[2,3,4,5,6,7,8].map(p=>`<option value="${p}" ${n.ports===p?'selected':''}>${p}-way</option>`).join('')}</select></div>`+editInput('excessDb','Extra loss per port (dB)','Total = 10 log₁₀(number of ports) + this added loss.');
  else if(n.type==='coupler')params=editInput('throughLossDb','Through-path loss (dB)')+editInput('tapLossDb','Tapped-port loss (dB)');
  else if(n.type==='antenna')params=editInput('gainDbi','Antenna gain (dBi)','Antenna gain adds to conducted dBm to give EIRP.');
  const isDeleteAllowed=n.type!=='tx'&&n.type!=='port';
  side.innerHTML=`<h3>${esc(icons[n.type])} Selected: ${esc(labels[n.type])}</h3>
   <div class="bsp-field"><label for="bspNodeName">Component label</label><input id="bspNodeName" type="text" maxlength="90" value="${esc(n.name)}" ${n.type==='port'?'readonly':''}></div>
   <p class="bsp-hint" style="margin:0 0 8px">Path: ${esc(nodePath(n))}</p>
   ${params}${read}
   <div class="bsp-side-actions"><button type="button" class="bsp-btn primary" id="bspDetailAdd">+ Add next component</button>${isDeleteAllowed?'<button type="button" class="bsp-btn warn" id="bspDelete">× Delete selected</button>':''}</div>
   <div class="bsp-parts bsp-hint">${n.type==='tx'?'The TX source can feed a single series path. Insert a splitter or coupler to create multiple outputs.':n.type==='splitter'?'Choose an output port on the schematic and add cable or antenna to that branch.':n.type==='coupler'?'Two outputs: Through and Tap. Enter actual coupler through/tap losses from the manufacturer.':n.type==='port'?'This port includes its splitter/coupler loss. Add a cable or antenna after it.':n.type==='antenna'?'Antenna endpoints show calculated EIRP. To insert cable before an antenna, keep it selected and choose Add.':'Add after this component. If a downstream stage already exists, the new stage is inserted before it.'}<br>Placeholder losses and gains start at zero, except ideal splitter division. Verify every value before design use.</div>`;
  get('bspDetailAdd').addEventListener('click',()=>attach(get('bspAddType').value));
  if(isDeleteAllowed)get('bspDelete').addEventListener('click',removeSelected);
  get('bspNodeName').addEventListener('input',e=>{n.name=e.target.value.slice(0,90);updateDiagram();updateAntennas();persist()});
  side.querySelectorAll('[data-site-field]').forEach(field=>field.addEventListener('change',e=>{
   const key=e.target.dataset.siteField;
   if(key==='ports'){if(!shrinkPorts(n,Number(e.target.value))){e.target.value=n.ports;return}}
   else{if(n.specConfirmed&&key!=='feet')n.specConfirmed=false;const min=key==='gainDbi'?-60:0,max=key==='feet'?200000:200;
    n[key]=finite(e.target.value,min,max,n[key]||0);
   }
   render(false);persist();
  }));
 }
 function updateAntennas(){
  const {results,warnings}=evaluate();const ants=st.nodes.filter(n=>n.type==='antenna'&&results.has(n.id));
  const top=`<strong>${ants.length} antenna${ants.length===1?'':'s'} · ${st.nodes.filter(n=>n.type==='splitter').length} splitter${st.nodes.filter(n=>n.type==='splitter').length===1?'':'s'} · ${st.nodes.length-1} components/ports</strong>`;
  const links=ants.map(n=>`<button type="button" data-site-jump="${esc(n.id)}">${esc(n.name.slice(0,23))}: ${fmt(results.get(n.id).eirp)} dBm EIRP</button>`).join('');
  get('bspAntennaList').innerHTML=top+(links?`<div style="margin-top:5px">${links}</div>`:' · Add an antenna to an output port.')+(warnings.length?`<p style="color:#985c1e;margin:3px 0">${esc(warnings.join(' '))}</p>`:'');
 }
 function render(full=false){
  if(full){get('bspSiteName').value=st.site;get('bspTXUnit').value=st.sourceUnit;get('bspTX').value=String(Number((st.sourceUnit==='dBW'?st.sourceDbm-30:st.sourceUnit==='W'?watts(st.sourceDbm):st.sourceDbm).toPrecision(8)));get('bspRefGain').value=String(st.referenceDbi)}
  updateDiagram();updateSide();updateAntennas();get('bspUndo').disabled=!lastUndo;
   window.dispatchEvent(new Event('batwing:siteplan-render'));
 }
 function setStatus(v){get('bspStatus').textContent=v}
 function opener(){
  const open=document.querySelectorAll('dialog[open]');for(const d of open)if(d!==dlg)d.close?.();
  render(true);if(!dlg.open){if(dlg.showModal)dlg.showModal();else dlg.setAttribute('open','')}
  requestAnimationFrame(setFit);
 }
 button.addEventListener('click',opener);
 get('bspClose').addEventListener('click',()=>dlg.close?.());
 get('bspToLink').addEventListener('click',()=>{dlg.close?.();get('linkBudgetTop')?.click()});
 get('bspToFCC').addEventListener('click',()=>{dlg.close?.();get('fccOpenTop')?.click()});
 get('bspAdd').addEventListener('click',()=>attach(get('bspAddType').value));
 get('bspSvg').addEventListener('click',()=>{});
 get('bspCanvas').addEventListener('click',e=>{const target=e.target.closest('[data-site-node]');if(target&&byId(target.dataset.siteNode)){st.selected=target.dataset.siteNode;render(false);persist()}});
 get('bspCanvas').addEventListener('keydown',e=>{if(e.key!=='Enter'&&e.key!==' ')return;const target=e.target.closest('[data-site-node]');if(target&&byId(target.dataset.siteNode)){e.preventDefault();st.selected=target.dataset.siteNode;render(false);persist()}});
 get('bspAntennaList').addEventListener('click',e=>{const b=e.target.closest('[data-site-jump]');if(b&&byId(b.dataset.siteJump)){st.selected=b.dataset.siteJump;render(false);persist()}});
 get('bspTXUnit').addEventListener('change',e=>{st.sourceUnit=e.target.value;render(true);persist()});
 get('bspTX').addEventListener('change',e=>{const v=Number(e.target.value);if(!Number.isFinite(v)||st.sourceUnit==='W'&&v<=0){window.alert('Enter a valid positive source power in watts, or a finite dBm/dBW value.');render(true);return}const dbm=st.sourceUnit==='dBW'?v+30:st.sourceUnit==='W'?30+10*Math.log10(v):v;st.sourceDbm=finite(dbm,-180,150,30);render(true);persist()});
 get('bspRefGain').addEventListener('change',e=>{st.referenceDbi=finite(e.target.value,-60,60,0);render(true);persist()});
 get('bspSiteName').addEventListener('input',e=>{st.site=e.target.value.slice(0,90);persist()});
 get('bspZoomIn').addEventListener('click',()=>{scale=Math.min(2.5,scale*1.23);updateDiagram()});
 get('bspZoomOut').addEventListener('click',()=>{scale=Math.max(.25,scale/1.23);updateDiagram()});
 get('bspZoomReset').addEventListener('click',setFit);
 function example(){
  if(st.nodes.length>1&&!window.confirm('Replace the current site plan with a two-branch example? Export JSON first to keep your current plan.'))return;
  st=fresh();st.site='Example: two-branch public safety DAS';st.sourceDbm=30;st.referenceDbi=5;
  const amp=defaultFor('amplifier');amp.name='BDA amplifier';amp.gainDb=15;amp.parent='tx';st.nodes.push(amp);
  const split=defaultFor('splitter');split.name='2-way distribution splitter';split.parent=amp.id;split.excessDb=.4;st.nodes.push(split);makePorts(split);
  const ports=children(split.id);
  const c1=defaultFor('cable');c1.parent=ports[0].id;c1.name='East wing coax';c1.feet=180;c1.lossPer100Ft=4;st.nodes.push(c1);
  const a1=defaultFor('antenna');a1.parent=c1.id;a1.name='East wing server antenna';a1.gainDbi=5;st.nodes.push(a1);
  const c2=defaultFor('cable');c2.parent=ports[1].id;c2.name='West wing coax';c2.feet=95;c2.lossPer100Ft=4;st.nodes.push(c2);
  const a2=defaultFor('antenna');a2.parent=c2.id;a2.name='West wing server antenna';a2.gainDbi=3;st.nodes.push(a2);
  st.selected=split.id;lastUndo=null;render(true);requestAnimationFrame(setFit);persist();
 }
 get('bspExample').addEventListener('click',example);
 get('bspUndo').addEventListener('click',()=>{if(!lastUndo)return;st=scrub(JSON.parse(lastUndo));lastUndo=null;render(true);persist()});
 get('bspReset').addEventListener('click',()=>{if(st.nodes.length>1&&!window.confirm('Clear the site diagram and all branches? Save a JSON copy first if needed.'))return;st=fresh();lastUndo=null;render(true);persist()});
 get('bspFromLB').addEventListener('click',()=>{const lb=window.BDA_LinkBudget;if(!lb){setStatus('Link Budget was not available; enter TX power manually.');return}const p=lb.read();if(!Number.isFinite(p.sourceDbm)){setStatus('No valid source power in Link Budget.');return}st.sourceDbm=p.sourceDbm;render(true);persist();setStatus('TX conducted power copied from Link Budget (source only; component chain not imported).')});
 function download(filename,str,mime){const b=new Blob([str],{type:mime}),url=URL.createObjectURL(b),a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500)}
 const safeFile=s=>String(s).replace(/[^A-Za-z0-9_-]+/g,'_').slice(0,55)||'site';
 get('bspExportSVG').addEventListener('click',()=>download(`DAS_Site_Plan_${safeFile(st.site)}_v1.10.svg`,lastGraphic?.svg||svgGraphic().svg,'image/svg+xml;charset=utf-8'));
 get('bspExportJSON').addEventListener('click',()=>download(`DAS_Site_Plan_${safeFile(st.site)}_v1.10.json`,JSON.stringify({...st,exportedAt:new Date().toISOString()},null,2),'application/json'));
 const cell=x=>{let v=String(x??'');if(/^[\s]*[=+@\-]/.test(v) && !Number.isFinite(Number(v)))v="'"+v;return '"'+v.replace(/"/g,'""')+'"'};
 get('bspExportCSV').addEventListener('click',()=>{
  const {results}=evaluate();const rows=[['Site','Component_ID','Parent_ID','Path','Type','Component','Input_dBm','Delta_dB','Conducted_dBm','Conducted_dBW','Conducted_W','Antenna_gain_dBi','Antenna_EIRP_dBm','Antenna_EIRP_dBW','Antenna_EIRP_W']];
  for(const n of st.nodes){const r=results.get(n.id);if(!r)continue;rows.push([st.site,n.id,n.parent||'',nodePath(n),n.type,n.name,fmt(r.input,5),fmt(r.delta,5),fmt(r.out,5),fmt(r.out-30,5),watts(r.out).toPrecision(12),n.type==='antenna'?n.gainDbi:'',r.eirp===null?'':fmt(r.eirp,5),r.eirp===null?'':fmt(r.eirp-30,5),r.eirp===null?'':watts(r.eirp).toPrecision(12)])}
  download(`DAS_Site_Plan_${safeFile(st.site)}_v1.10.csv`,rows.map(row=>row.map(cell).join(',')).join('\r\n'),'text/csv;charset=utf-8');
 });
 get('bspImportJSON').addEventListener('click',()=>get('bspFile').click());
 get('bspFile').addEventListener('change',async e=>{
  const file=e.target.files?.[0];if(!file)return;
  if(file.size>4000000){window.alert('Site plan JSON is too large (maximum 4 MB).');e.target.value='';return}
  try{const data=JSON.parse(await file.text());const loaded=scrub(data);if(st.nodes.length>1&&!window.confirm('Replace your current site plan with the imported JSON?'))return;st=loaded;lastUndo=null;render(true);requestAnimationFrame(setFit);persist()}
  catch(err){window.alert('Unable to import site plan: '+err.message)}finally{e.target.value=''}
 });
 // Read-only inspection and calculation hooks for regression testing.
 function applyModel(model){
    const n=byId(st.selected);
    if(!n||!model||n.type!==model.type||['tx','port'].includes(n.type))return {ok:false,reason:'Select a matching non-port component.'};
    if(n.type==='splitter'&&model.ports!==undefined&&!shrinkPorts(n,Math.max(2,Math.min(8,Number(model.ports)||2))))return {ok:false,reason:'Port count change cancelled.'};
    const perType={cable:['lossPer100Ft'],splitter:['excessDb'],coupler:['throughLossDb','tapLossDb'],amplifier:['gainDb'],loss:['lossDb'],connector:['lossDb'],antenna:['gainDbi']};
    const valueRanges={gainDbi:[-60,60],gainDb:[0,200],lossPer100Ft:[0,200],excessDb:[0,200],throughLossDb:[0,200],tapLossDb:[0,200],lossDb:[0,200]};
    for(const f of perType[n.type]||[]){if(model[f]!==undefined&&model[f]!==null&&Number.isFinite(Number(model[f]))){const [min,max]=valueRanges[f];n[f]=finite(model[f],min,max,0)}}
    for(const f of ['vendor','model','partNumber','specSource'])n[f]=String(model[f]??'').slice(0,120);
    n.specConfirmed=model.specConfirmed===true;
    n.unitCost=model.unitCost!==undefined&&model.unitCost!==null&&model.unitCost!==''?finite(model.unitCost,0,10000000,0):null;
    for(const f of ['maxInputDbm','maxOutputDbm'])n[f]=model[f]!==undefined&&model[f]!==null&&model[f]!==''&&Number.isFinite(Number(model[f]))?finite(model[f],-180,150,0):null;
    if(n.model||n.partNumber)n.name=[n.vendor,n.model||n.partNumber].filter(Boolean).join(' ').slice(0,90);
    render(true);persist();return {ok:true,id:n.id};
   }
   window.BDA_SitePlan=Object.freeze({version:'v1.13',open:opener,read:()=>JSON.parse(JSON.stringify(st)),calculate:()=>{const {results}=evaluate();return Object.fromEntries(results)},add:attach,applyModel});
})();
