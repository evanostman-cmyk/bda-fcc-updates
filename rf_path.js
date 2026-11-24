(function rfPathModule(){
 'use strict';
 if(document.getElementById('bwRfPath')||!document.getElementById('fccElevationDialog'))return;
 const $=id=>document.getElementById(id), FT_PER_M=3.280839895,MI_TO_M=1609.344,RE=6371000,C=299792458;
 let dataset=null,last=null;
 const css=document.createElement('style');
 css.textContent=`
 #bwRfPath{border:1px solid #bcd5de;background:#f4fafc;border-radius:12px;margin-bottom:14px;padding:14px;min-width:0}
 #bwRfPath h4{font-size:1rem;margin:0 0 5px;color:#175064}
 #bwRfPath .rfp-note{font-size:.77rem;color:#587a87;line-height:1.5;margin:8px 0}
 #bwRfPath .rfp-fields{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin:11px 0}
 #bwRfPath label{display:block;font-size:.76rem;color:#355a6b;font-weight:750;min-width:0}
 #bwRfPath label input,#bwRfPath label select{width:100%;min-width:0;min-height:39px;border:1px solid #bad1db;padding:7px 9px;border-radius:7px;margin-top:5px}
 #bwRfPath .rfp-metrics{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin:12px 0}
 #bwRfPath .rfp-metric{background:white;border:1px solid #d2e3e9;border-radius:9px;padding:10px}
 #bwRfPath .rfp-metric small{font-size:.69rem;color:#587783;display:block}
 #bwRfPath .rfp-metric strong{font-size:1.17rem;color:#174e64;overflow-wrap:anywhere}
 #bwRfPath #rfpStatus{font-size:.84rem;font-weight:750;background:#eff7fa;border:1px solid #d4e3e8;border-radius:9px;padding:10px;color:#27566c;line-height:1.5}
 #bwRfPath #rfpStatus.problem{background:#fff2e8;border-color:#e8b7a0;color:#874e2d}
 #bwRfPath .rfp-chart{max-width:100%;border:1px solid #d6e5e9;background:#fff;border-radius:9px;overflow:hidden;margin:10px 0}
 #bwRfPath #rfpSvg{display:block;width:100%;height:auto;max-height:400px}
 #bwRfPath .rfp-actions{display:flex;gap:9px;align-items:center;flex-wrap:wrap}
 #bwRfPath .rfp-actions button{border-radius:8px;background:#196980;color:#fff;border:none;font-size:.77rem;font-weight:750;padding:9px 12px;width:auto}
 #bwRfPath .rfp-actions button:disabled{opacity:.45}
 #bwRfPath #rfpHover{font-size:.75rem;min-height:20px;color:#315d72}
 @media(max-width:840px){#bwRfPath .rfp-fields{grid-template-columns:repeat(2,minmax(0,1fr))}#bwRfPath .rfp-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}}
 @media(max-width:530px){#bwRfPath{padding:9px}#bwRfPath .rfp-fields{gap:7px}#bwRfPath .rfp-metric{padding:7px}#bwRfPath .rfp-metric strong{font-size:1.05rem}}
 `;
 document.head.appendChild(css);
 const root=document.createElement('section');root.id='bwRfPath';root.setAttribute('aria-label','RF path first Fresnel zone line of sight and free space path loss');
 root.innerHTML=`
 <h4>📡 RF Path: LOS, Fresnel &amp; link estimate</h4>
 <p class="rfp-note">Set actual site and FCC-tower antenna heights <strong>above ground level</strong> (AGL) and operating frequency. Uses the loaded sampled terrain profile. Effective Earth radius defaults to k=4/3; all other site readings must be entered.</p>
 <div class="rfp-fields">
  <label>Site antenna AGL (ft)<input id="rfpSiteAgl" type="number" min="0" max="3000" step="any" placeholder="Required measured AGL"></label>
  <label>Tower antenna AGL (ft)<input id="rfpTowerAgl" type="number" min="0" max="3000" step="any" placeholder="Required measured AGL"></label>
  <label>Frequency (MHz)<input id="rfpFreq" type="number" min="30" max="12000" step="any" placeholder="e.g. 851"></label>
  <label>Earth radius k factor<input id="rfpK" type="number" min="0.5" max="4" step="any" value="1.333333"></label>
  <label>First Fresnel clearance target (%)<input id="rfpClearance" type="number" min="0" max="100" step="any" value="60"></label>
  <label>Link direction for power estimate<select id="rfpDirection"><option value="site">Site → tower (uplink)</option><option value="tower">Tower → site (downlink)</option></select></label>
 </div>
 <div id="rfpStatus" role="status" aria-live="polite">Open a tower terrain profile and enter both antenna heights and frequency.</div>
 <div class="rfp-metrics">
  <div class="rfp-metric"><small>Sampled terrain LOS</small><strong id="rfpLOS">—</strong></div>
  <div class="rfp-metric"><small>Minimum terrain clearance</small><strong id="rfpMinGround">—</strong></div>
  <div class="rfp-metric"><small>Minimum Fresnel margin</small><strong id="rfpMinF1">—</strong></div>
  <div class="rfp-metric"><small>Worst sampled point</small><strong id="rfpWorst">—</strong></div>
  <div class="rfp-metric"><small>Maximum first-zone radius</small><strong id="rfpF1">—</strong></div>
  <div class="rfp-metric"><small>Free-space path loss</small><strong id="rfpFSPL">—</strong></div>
 </div>
 <div class="rfp-chart"><svg id="rfpSvg" viewBox="0 0 900 340" role="img" aria-label="Effective Earth radius corrected terrain and straight line antenna path with Fresnel clearance boundary"></svg></div>
 <div id="rfpHover" aria-live="off">Ground terrain (green), direct path (blue), required Fresnel lower boundary (orange). No terrain data loaded yet.</div>
 <details><summary style="font-size:.83rem;font-weight:750;cursor:pointer;color:#225b73">Optional free-space received power / fade margin (not a propagation prediction)</summary>
  <div class="rfp-fields">
    <label>TX conducted power (dBm)<input id="rfpTxDbm" type="number" step="any" placeholder="Actual TX power"></label>
    <label>TX antenna gain (dBi)<input id="rfpTxGain" type="number" step="any" placeholder="Required"></label>
    <label>TX cable loss (dB)<input id="rfpTxLoss" type="number" min="0" step="any" placeholder="Required"></label>
    <label>RX antenna gain (dBi)<input id="rfpRxGain" type="number" step="any" placeholder="Required"></label>
    <label>RX cable loss (dB)<input id="rfpRxLoss" type="number" min="0" step="any" placeholder="Required"></label>
    <label>Other entered loss (dB)<input id="rfpExtraLoss" type="number" min="0" step="any" value="0"></label>
    <label>Receiver sensitivity (dBm)<input id="rfpSensitivity" type="number" step="any" placeholder="Optional receiver spec"></label>
  </div>
  <p class="rfp-note">When you enter all power values, free-space RX = TX conducted + TX antenna gain − TX feeder loss − FSPL + RX antenna gain − RX cable loss − other losses. The number excludes obstructions, diffraction, building clutter, foliage, fading and interference. Only meaningful where a verified link model applies.</p>
  <div class="rfp-metrics">
    <div class="rfp-metric"><small>Hypothetical free-space RX</small><strong id="rfpRx">—</strong></div>
    <div class="rfp-metric"><small>Margin vs. receiver sensitivity</small><strong id="rfpMargin">—</strong></div>
    <div class="rfp-metric"><small>Distance</small><strong id="rfpDistance">—</strong></div>
  </div>
 </details>
 <div class="rfp-actions"><button type="button" id="rfpExport" disabled>⬇ RF path CSV</button><button type="button" id="rfpReset">Reset measurements</button></div>
 <p class="rfp-note">This is a preliminary <strong>sampled ground-terrain clearance</strong> screen, not verified LOS, link availability, coverage, or a complete diffraction model. Missing elevations, sample spacing, Earth-refraction changes, trees, buildings, local structures, terrain accuracy, polarized antenna patterns and dynamic obstructions can invalidate results. FCC coordinates are licensed locations, not proof of active transmitters.</p>`;
 const target=$('bdaElevChart');target.parentElement.insertBefore(root,target);
 const inputIds=['rfpSiteAgl','rfpTowerAgl','rfpFreq','rfpK','rfpClearance','rfpTxDbm','rfpTxGain','rfpTxLoss','rfpRxGain','rfpRxLoss','rfpExtraLoss','rfpSensitivity'];
 function raw(id){const s=$(id).value.trim();return s!==''&&Number.isFinite(Number(s))?Number(s):null;}
 const inRange=(v,min,max)=>v!==null&&Number.isFinite(v)&&v>=min&&v<=max;
 function compute(profile,opt){
  const {siteAgl,towerAgl,freq,k,fraction,txDbm,txGain,txLoss,rxGain,rxLoss,extraLoss,sensitivity,direction}=opt;
  if(!profile||!Array.isArray(profile.points)||profile.points.length<2)return {error:'Terrain samples are not available.',rows:[]};
  const distanceMi=Number(profile.distanceMi),D=distanceMi*MI_TO_M;
  if(!Number.isFinite(D)||D<=0.5)return {error:'Tower distance must be greater than zero.',rows:[]};
  if(!inRange(freq,30,12000))return {error:'Enter a valid operating frequency between 30 and 12,000 MHz.',rows:[]};
  const fspl=32.45+20*Math.log10(D/1000)+20*Math.log10(freq);
  const wavelength=C/(freq*1e6);
  const heightsReady=inRange(siteAgl,0,3000)&&inRange(towerAgl,0,3000)&&inRange(k,0.5,4)&&inRange(fraction,0,1);
  const points=profile.points;
  const siteGround=Number(points[0].ft),towerGround=Number(points[points.length-1].ft);
  const endsReady=Number.isFinite(siteGround)&&Number.isFinite(towerGround)&&points[0].ft!==null&&points.at(-1).ft!==null;
  const rows=[];
  if(heightsReady&&endsReady){
    const start=siteGround+siteAgl,end=towerGround+towerAgl;
    for(let i=0;i<points.length;i++){
     const p=points[i],d=Math.max(0,Math.min(D,Number.isFinite(Number(p.mi))?Number(p.mi)*MI_TO_M:D*i/(points.length-1))),t=d/D;
     const validTerrain=p.ft!==null&&p.ft!==undefined&&Number.isFinite(Number(p.ft));
     const g=validTerrain?Number(p.ft):null;
     const bulgeFt=d*(D-d)/(2*k*RE)*FT_PER_M;
     const corrected=g===null?null:g+bulgeFt;
     const line=start+(end-start)*t;
     const fresnel=Math.sqrt(Math.max(0,wavelength*d*(D-d)/D))*FT_PER_M;
     const clearance=corrected===null?null:line-corrected;
     const margin=clearance===null?null:clearance-fraction*fresnel;
     rows.push({mi:d/MI_TO_M,terrain:g,bulgeFt,corrected,line,fresnel,clearance,margin,lat:p.lat,lon:p.lon});
    }
  }
  const tested=rows.filter(p=>p.clearance!==null),complete=rows.length===points.length&&tested.length===rows.length;
  const minClear=tested.length?Math.min(...tested.map(p=>p.clearance)):null;
  const minMargin=tested.length?Math.min(...tested.map(p=>p.margin)):null;
  const worst=tested.length?tested.reduce((a,b)=>b.margin<a.margin?b:a):null;
  const maxF1=rows.length?Math.max(...rows.map(p=>p.fresnel)):null;
  let rx=null,fadeMargin=null;
  if([txDbm,txGain,txLoss,rxGain,rxLoss,extraLoss].every(Number.isFinite)&&txLoss>=0&&rxLoss>=0&&extraLoss>=0){
   rx=txDbm+txGain-txLoss-fspl+rxGain-rxLoss-extraLoss;
   if(Number.isFinite(sensitivity))fadeMargin=rx-sensitivity;
  }
  let condition='unknown';
  if(rows.length&&complete)condition=minClear<0?'terrain-obstructed':minMargin<0?'fresnel-intrusion':'sampled-clear';
  if(rows.length&&!complete)condition='incomplete';
  return {distanceMi,fspl,rows,condition,minClear,minMargin,worst,maxF1,rx,fadeMargin,
   validSamples:tested.length,totalSamples:points.length,fraction,k,frequencyMHz:freq,siteAgl,towerAgl,direction,heightsReady,endsReady};
 }
 const fmt=(n,d=1)=>Number.isFinite(n)?Number(n).toFixed(d):'—';
 function clearOutputs(note){
  for(const id of ['rfpLOS','rfpMinGround','rfpMinF1','rfpWorst','rfpF1','rfpFSPL','rfpRx','rfpMargin','rfpDistance'])$(id).textContent='—';
  $('rfpSvg').replaceChildren();$('rfpExport').disabled=true;
  $('rfpHover').textContent='No computed RF path yet.';
  $('rfpStatus').textContent=note;$('rfpStatus').classList.remove('problem');
 }
 const NS='http://www.w3.org/2000/svg';
 function svgTag(tag,attrs,txt){
  const e=document.createElementNS(NS,tag);
  for(const [k,v] of Object.entries(attrs||{}))e.setAttribute(k,String(v));
  if(txt!==undefined)e.textContent=String(txt);
  return e;
 }
 function draw(result){
  const svg=$('rfpSvg');svg.replaceChildren();
  const rows=result.rows;
  if(!rows.length)return;
  const W=900,H=340,left=70,right=24,top=34,bottom=47,pw=W-left-right,ph=H-top-bottom;
  const values=rows.flatMap(r=>[r.corrected,r.line,r.line-result.fraction*r.fresnel]).filter(Number.isFinite);
  let min=Math.min(...values),max=Math.max(...values),span=Math.max(30,max-min);
  min-=span*.14;max+=span*.14;
  const xx=p=>left+(p.mi/result.distanceMi)*pw,yy=n=>top+(max-n)/(max-min)*ph;
  svg.appendChild(svgTag('rect',{x:0,y:0,width:W,height:H,fill:'#fff'}));
  for(let i=0;i<=4;i++){
   const elevation=min+(max-min)*i/4,y=yy(elevation);
   svg.appendChild(svgTag('line',{x1:left,y1:y,x2:W-right,y2:y,stroke:'#e1e9ed','stroke-width':1}));
   svg.appendChild(svgTag('text',{x:left-9,y:y+4,'text-anchor':'end','font-size':13,fill:'#587382'},Math.round(elevation)));
   const x=left+pw*i/4;
   svg.appendChild(svgTag('text',{x,y:H-14,'text-anchor':i===0?'start':i===4?'end':'middle','font-size':13,fill:'#587382'},(result.distanceMi*i/4).toFixed(result.distanceMi<10?2:1)+' mi'));
  }
  svg.appendChild(svgTag('text',{x:left,y:17,'font-size':13,fill:'#3b6275','font-weight':750},'ELEVATION (FT) · EFFECTIVE-EARTH TERRAIN'));
  const drawLine=(key,color,width,dash='')=>{
   let segments=[],seg=[];
   for(const r of rows){
    const v=key(r);
    if(Number.isFinite(v))seg.push([xx(r),yy(v)]);
    else if(seg.length){segments.push(seg);seg=[];}
   }
   if(seg.length)segments.push(seg);
   for(const points of segments)if(points.length>1){
    const path='M '+points.map(x=>x.map(n=>n.toFixed(2)).join(' ')).join(' L ');
    const attrs={d:path,fill:'none',stroke:color,'stroke-width':width,'stroke-linecap':'round'};
    if(dash)attrs['stroke-dasharray']=dash;
    svg.appendChild(svgTag('path',attrs));
   }
  };
  drawLine(r=>r.corrected,'#2f9270',3);
  drawLine(r=>r.line-result.fraction*r.fresnel,'#dd8b2d',2.5,'7 4');
  drawLine(r=>r.line,'#246ea3',2.9);
  if(result.worst){
   const x=xx(result.worst),y=yy(result.worst.corrected);
   svg.appendChild(svgTag('circle',{cx:x,cy:y,r:6,fill:'#ce4e31',stroke:'white','stroke-width':2}));
  }
  const cursor=svgTag('line',{x1:0,y1:top,x2:0,y2:H-bottom,stroke:'#444','stroke-dasharray':'4 5',visibility:'hidden','stroke-width':1.5});
  svg.appendChild(cursor);
  svg.onpointermove=e=>{
   const rect=svg.getBoundingClientRect(),mx=((e.clientX-rect.left)/Math.max(rect.width,1))*W;
   const idx=Math.max(0,Math.min(rows.length-1,Math.round((mx-left)/pw*(rows.length-1))));
   const p=rows[idx],x=xx(p);cursor.setAttribute('x1',x);cursor.setAttribute('x2',x);cursor.setAttribute('visibility','visible');
   $('rfpHover').textContent=p.mi.toFixed(2)+' mi • Ground '+fmt(p.terrain)+' ft • Earth bulge '+fmt(p.bulgeFt)+' ft • Ray '+fmt(p.line)+' ft • LOS clearance '+fmt(p.clearance)+' ft • Fresnel margin '+fmt(p.margin)+' ft';
  };
  svg.onpointerleave=()=>{cursor.setAttribute('visibility','hidden');$('rfpHover').textContent='Green = Earth-corrected terrain, blue = direct ray, orange = minimum Fresnel lower boundary.';};
  $('rfpHover').textContent='Green = Earth-corrected terrain, blue = direct ray, orange = minimum Fresnel lower boundary.';
 }
 function options(){
  return {
   siteAgl:raw('rfpSiteAgl'),towerAgl:raw('rfpTowerAgl'),freq:raw('rfpFreq'),k:raw('rfpK'),
   fraction:raw('rfpClearance')===null?null:raw('rfpClearance')/100,direction:$('rfpDirection').value,
   txDbm:raw('rfpTxDbm'),txGain:raw('rfpTxGain'),txLoss:raw('rfpTxLoss'),rxGain:raw('rfpRxGain'),
   rxLoss:raw('rfpRxLoss'),extraLoss:raw('rfpExtraLoss'),sensitivity:raw('rfpSensitivity')
  };
 }
 function render(){
  if(!dataset){clearOutputs('Select a tower under P25 Site Finder, open its RF Path, and load terrain elevations.');return;}
  const result=compute(dataset.profile,options());last=result;
  if(result.error){clearOutputs(result.error);$('rfpStatus').classList.add('problem');return;}
  $('rfpFSPL').textContent=fmt(result.fspl,2)+' dB';
  $('rfpDistance').textContent=fmt(result.distanceMi,2)+' mi';
  $('rfpRx').textContent=result.rx===null?'—':fmt(result.rx,2)+' dBm';
  $('rfpMargin').textContent=result.fadeMargin===null?'—':fmt(result.fadeMargin,2)+' dB';
  if(!result.rows.length){
   clearOutputs('Enter both measured antenna heights AGL, Earth k-factor and Fresnel target to estimate terrain clearance.');
   $('rfpFSPL').textContent=fmt(result.fspl,2)+' dB';
   $('rfpDistance').textContent=fmt(result.distanceMi,2)+' mi';
   return;
  }
  $('rfpLOS').textContent=result.condition==='sampled-clear'?'Sampled clear':result.condition==='fresnel-intrusion'?'Fresnel intrudes':result.condition==='terrain-obstructed'?'Terrain blocks':result.condition==='incomplete'?'Incomplete':'Unknown';
  $('rfpMinGround').textContent=fmt(result.minClear)+' ft';
  $('rfpMinF1').textContent=fmt(result.minMargin)+' ft';
  $('rfpWorst').textContent=result.worst?fmt(result.worst.mi,2)+' mi':'—';
  $('rfpF1').textContent=fmt(result.maxF1)+' ft';
  const gap=result.totalSamples-result.validSamples;
  const messages={
   'sampled-clear':'All available sample points clear the entered Fresnel target, but LOS is NOT independently verified.',
   'fresnel-intrusion':'Sampled terrain infringes the requested first Fresnel-zone clearance. Investigate height, terrain and path design.',
   'terrain-obstructed':'STOP / REWORK: sampled terrain crosses the effective-Earth direct antenna line.',
   'incomplete':'Terrain elevations contain missing samples. Do not conclude that the path is clear.'
  };
  $('rfpStatus').textContent=(messages[result.condition]||'Clearance uncertain.')+' '+result.validSamples+'/'+result.totalSamples+' elevations valid'+(gap?' ('+gap+' missing).':'.')+' FSPL and received power (if entered) are idealized free-space values only.';
  $('rfpStatus').classList.toggle('problem',result.condition!=='sampled-clear');
  draw(result);$('rfpExport').disabled=false;
 }
 window.addEventListener('batwing:terrain-loading',()=>{
  dataset=null;last=null;
  for(const id of ['rfpSiteAgl','rfpTowerAgl','rfpTxDbm','rfpTxGain','rfpTxLoss','rfpRxGain','rfpRxLoss','rfpSensitivity'])$(id).value='';
  clearOutputs('New terrain route loading. Enter actual AGL antenna heights for this site and tower.');
 });
 window.addEventListener('batwing:terrain-ready',e=>{dataset=e.detail;render()});
 inputIds.forEach(id=>$(id).addEventListener('input',render));
 $('rfpDirection').addEventListener('change',render);
 $('rfpReset').addEventListener('click',()=>{
  inputIds.forEach(id=>$(id).value='');$('rfpK').value='1.333333';$('rfpClearance').value='60';$('rfpExtraLoss').value='0';$('rfpDirection').value='site';render();
 });
 $('rfpExport').addEventListener('click',()=>{
  if(!last?.rows?.length)return;
  const rows=[['distance_miles','latitude','longitude','terrain_ft','earth_bulge_ft','corrected_terrain_ft','antenna_line_ft','first_fresnel_radius_ft','ground_clearance_ft','fresnel_margin_ft'],
   ...last.rows.map(p=>[p.mi,p.lat,p.lon,p.terrain,p.bulgeFt,p.corrected,p.line,p.fresnel,p.clearance,p.margin])];
  const csv=rows.map(row=>row.map(v=>'"'+String(v??'').replace(/"/g,'""')+'"').join(',')).join('\r\n');
  const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');
  a.href=url;a.download='Batwing_RF_Path_'+String(dataset.towerLabel||'tower').replace(/[^A-Za-z0-9_-]/g,'_').slice(0,40)+'.csv';
  document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1300);
 });
 window.BatwingRFPath=Object.freeze({version:'v1.13',compute,getCurrent:()=>last?{...last,rows:last.rows.map(r=>({...r}))}:null});
 clearOutputs('Open a tower terrain profile, then enter both antenna heights and frequency.');
})();