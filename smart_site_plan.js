(function smartSitePlan(){
 'use strict';
 if(document.getElementById('bwSmartPanel'))return;
 const api=window.BDA_SitePlan,$=id=>document.getElementById(id);
 if(!api||!$('bdaSitePlanDialog'))return;
 const STORE='BATWING_EQUIPMENT_LIBRARY_v1.13',CFG='BATWING_DAS_REVIEW_v1.13',MAX=250;
 const fieldSpecs={
  cable:[['lossPer100Ft','Cable loss (dB / 100 ft)']],
  splitter:[['ports','Output ports (2–8)'],['excessDb','Extra insertion loss per output (dB)']],
  coupler:[['throughLossDb','Through loss (dB)'],['tapLossDb','Tap loss (dB)']],
  amplifier:[['gainDb','Gain (dB)']],
  loss:[['lossDb','Attenuation (dB)']],
  connector:[['lossDb','Insertion loss (dB)']],
  antenna:[['gainDbi','Antenna gain (dBi)']]
 };
 let library=[],cfg={minEirp:'',maxEirp:'',highCableLoss:'15'};
 function load(){
  try{const x=JSON.parse(localStorage.getItem(STORE)||'[]');if(Array.isArray(x))library=x.filter(y=>y&&fieldSpecs[y.type]&&typeof y.id==='string').slice(0,MAX).map(safeRecord)}catch(e){}
  try{const c=JSON.parse(localStorage.getItem(CFG)||'{}');if(c&&typeof c==='object')cfg={...cfg,...c}}catch(e){}
 }
 const safeString=(v,len=120)=>String(v??'').trim().slice(0,len);
 const safeNum=v=>v!==''&&v!==null&&v!==undefined&&Number.isFinite(Number(v))?Number(v):null;
 function safeRecord(x){
  const type=fieldSpecs[x.type]?x.type:'cable';
  const o={id:safeString(x.id,70),type,vendor:safeString(x.vendor),model:safeString(x.model),partNumber:safeString(x.partNumber),specSource:safeString(x.specSource,220),specFrequencyMHz:safeNum(x.specFrequencyMHz),specConfirmed:x.specConfirmed===true,unitCost:safeNum(x.unitCost),maxInputDbm:safeNum(x.maxInputDbm),maxOutputDbm:safeNum(x.maxOutputDbm)};
  for(const [k] of fieldSpecs[type]){const v=safeNum(x[k]);if(v!==null)o[k]=v}
  return o;
 }
 load();
 const style=document.createElement('style');
 style.textContent=`
 #bwSmartPanel{background:white;margin:13px 0 32px;border:1px solid #c8dee5;border-radius:15px;padding:18px;color:#193d50;min-width:0}
 #bwSmartPanel .smart-head{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap}
 #bwSmartPanel .smart-head h2{font-size:1.19rem;margin:0}
 #bwSmartPanel .smart-head p{font-size:.78rem;color:#597581;margin:5px 0 0}
 #bwSmartPanel .smart-tiles{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px;margin:13px 0}
 #bwSmartPanel .smart-tile{padding:11px;background:#edf7f9;border:1px solid #d1e6e9;border-radius:10px}
 #bwSmartPanel .smart-tile small{font-size:.74rem;color:#577481;display:block}
 #bwSmartPanel .smart-tile strong{font-size:1.28rem;color:#184c63}
 #bwSmartPanel .smart-alert{padding:9px 11px;border:1px solid #d7e5e8;border-radius:9px;background:#f6fafb;font-size:.82rem;margin:8px 0}
 #bwSmartPanel .smart-alert.warn{border-color:#ebc58c;background:#fff7e9;color:#7c511f}
 #bwSmartPanel details{margin:13px 0;border:1px solid #cfdfe5;border-radius:11px;padding:12px}
 #bwSmartPanel summary{font-weight:800;cursor:pointer;font-size:.94rem;color:#235267}
 #bwSmartPanel .smart-form{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px;margin:11px 0}
 #bwSmartPanel .smart-field{display:flex;flex-direction:column;gap:4px;min-width:0}
 #bwSmartPanel .smart-field label{font-size:.74rem;color:#436477;font-weight:700}
 #bwSmartPanel input,#bwSmartPanel select{height:39px;width:100%;min-width:0;border-radius:8px}
 #bwSmartPanel .smart-check{display:flex;align-items:center;gap:8px;font-size:.79rem;font-weight:700}
 #bwSmartPanel .smart-check input{height:20px;width:20px;flex:none}
 #bwSmartPanel .smart-actions{display:flex;flex-wrap:wrap;gap:7px;margin:11px 0;align-items:center}
 #bwSmartPanel button{border:1px solid #bfd4de;border-radius:8px;background:#f4fafb;padding:8px 11px;font-size:.78rem;font-weight:750;color:#205167;width:auto;min-height:36px}
 #bwSmartPanel button.primary{background:#166e81;border-color:#166e81;color:#fff}
 #bwSmartPanel button:disabled{opacity:.45}
 #bwSmartPanel .smart-table-wrap{overflow:auto}
 #bwSmartPanel table{border-collapse:collapse;width:100%;min-width:680px;font-size:.78rem}
 #bwSmartPanel th,#bwSmartPanel td{padding:9px;text-align:left;border-bottom:1px solid #dce6ea;vertical-align:top}
 #bwSmartPanel th{background:#edf5f8;color:#315a68}
 #bwSmartPanel .smart-hint{font-size:.75rem;color:#617b86;line-height:1.55}
 @media(max-width:870px){#bwSmartPanel .smart-form{grid-template-columns:repeat(2,minmax(0,1fr))}#bwSmartPanel .smart-tiles{grid-template-columns:repeat(2,minmax(0,1fr))}}
 @media(max-width:540px){#bwSmartPanel{padding:10px}#bwSmartPanel .smart-form{gap:7px}#bwSmartPanel .smart-tiles{gap:6px}}
 `;
 document.head.appendChild(style);
 const panel=document.createElement('section');panel.id='bwSmartPanel';panel.setAttribute('aria-label','Smart DAS engineering and bill of materials');
 panel.innerHTML=`
 <div class="smart-head"><div><h2>🧠 Smart DAS Engineering & Bill of Materials</h2>
 <p>Works directly with your selected schematic. Assign user-verified equipment specifications, check RF paths, and export a materials list.</p></div><span class="fcc-pill">v1.13</span></div>
 <div class="smart-tiles">
  <div class="smart-tile"><small>Server antennas</small><strong id="smAntennas">—</strong></div>
  <div class="smart-tile"><small>Cable length</small><strong id="smCable">—</strong></div>
  <div class="smart-tile"><small>Review findings</small><strong id="smFindings">—</strong></div>
  <div class="smart-tile"><small>Cost entered so far</small><strong id="smCost">—</strong></div>
 </div>
 <div class="smart-alert" id="smSummary">Reviewing current site plan…</div>
 <details id="smLibrary" open><summary>Equipment catalog & assigned component</summary>
  <p class="smart-hint">All vendor and model values are entered by you. No unverified manufacturer specifications or prices are supplied by Batwing.</p>
  <div class="smart-form">
   <div class="smart-field"><label for="smSaved">Saved equipment entry</label><select id="smSaved"><option value="">New entry</option></select></div>
   <div class="smart-field"><label for="smType">Type</label><select id="smType"><option value="cable">Cable</option><option value="splitter">Splitter</option><option value="coupler">Coupler</option><option value="amplifier">Amplifier</option><option value="loss">Attenuator/loss</option><option value="connector">Connector</option><option value="antenna">Antenna</option></select></div>
   <div class="smart-field"><label for="smVendor">Manufacturer</label><input id="smVendor" placeholder="ADRF / Comba / SOLiD / JMA / …" maxlength="120"></div>
   <div class="smart-field"><label for="smModel">Model / product</label><input id="smModel" placeholder="Exact model" maxlength="120"></div>
   <div class="smart-field"><label for="smPart">Part number / SKU</label><input id="smPart" placeholder="Optional" maxlength="120"></div>
   <div class="smart-field"><label for="smSource">Specification source</label><input id="smSource" placeholder="Datasheet revision or measurement" maxlength="220"></div>
   <div class="smart-field"><label for="smSpecFreq">Specs measured at frequency (MHz)</label><input id="smSpecFreq" type="number" step="any" placeholder="Optional reference frequency"></div><div class="smart-field"><label for="smCostInput">Cost ($ / item; cable $ / ft)</label><input id="smCostInput" type="number" min="0" step="any" placeholder="Optional"></div>
   <div class="smart-field"><label for="smMaxInput">Maximum input (dBm)</label><input id="smMaxInput" type="number" step="any" placeholder="Optional rating"></div>
   <div class="smart-field"><label for="smMaxOutput">Maximum output (dBm)</label><input id="smMaxOutput" type="number" step="any" placeholder="Optional rating"></div>
  </div>
  <div class="smart-form" id="smSpecs"></div>
  <label class="smart-check"><input id="smConfirmed" type="checkbox"> I verified this model's values against a datasheet or measurements</label>
  <p class="smart-hint" id="smSelected">Selected in diagram: —</p>
  <div class="smart-actions">
    <button type="button" id="smUseType">Use selected node's type</button>
    <button type="button" id="smNew">New model</button>
    <button type="button" id="smSave">Save / update catalog</button>
    <button type="button" class="primary" id="smApply">Apply to selected component</button>
    <button type="button" id="smDelete">Delete catalog entry</button>
  </div>
  <div class="smart-actions">
    <button type="button" id="smExportLibrary">⬇ Export catalog JSON</button>
    <button type="button" id="smImportLibrary">⬆ Import catalog JSON</button>
    <input id="smLibraryFile" hidden type="file" accept=".json,application/json">
  </div>
  <p class="smart-hint" id="smCatalogStatus" role="status">Equipment models are saved locally and can be backed up as JSON. Changes to RF values after assignment mark them unverified again.</p>
 </details>
 <details open><summary>Validation and engineering checks</summary>
  <div class="smart-form">
   <div class="smart-field"><label for="smMinEirp">Minimum antenna EIRP (dBm) · optional</label><input id="smMinEirp" type="number" step="any" placeholder="No minimum set"></div>
   <div class="smart-field"><label for="smMaxEirp">Maximum antenna EIRP (dBm) · optional</label><input id="smMaxEirp" type="number" step="any" placeholder="No maximum set"></div>
   <div class="smart-field"><label for="smCableThreshold">Flag cable sections losing over (dB)</label><input id="smCableThreshold" type="number" min="0" step="any" value="15"></div>
  </div>
  <p class="smart-hint">Thresholds are your project values, not automatic code/AHJ limits. Real design compliance depends on manufacturer specs, frequency, topology, link budget and field measurements.</p>
  <div id="smIssues" aria-live="polite"></div>
  <div class="smart-actions"><button id="smExportIssues" type="button">⬇ Findings CSV</button></div>
 </details>
 <details open><summary>Live bill of materials</summary>
  <div id="smTable" class="smart-table-wrap"></div>
  <p class="smart-hint">Cable is counted by total drawn feet; other items are counted per component. Unpriced entries are excluded from the partial cost figure, not treated as free. Internal split ports are not physical parts.</p>
  <div class="smart-actions"><button id="smExportBOM" class="primary" type="button">⬇ Export BOM CSV</button></div>
 </details>`;
 const destination=$('bwPage-siteplan')||$('bdaSitePlanDialog').parentElement;
 destination.appendChild(panel);
 const status=s=>$('smCatalogStatus').textContent=s;
 const $n=id=>{const v=Number($(id).value);return $(id).value.trim()!==''&&Number.isFinite(v)?v:null;};
 const currency=v=>Number.isFinite(v)?'$'+v.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}):'—';
 function writeFile(name,mime,data){
  const url=URL.createObjectURL(new Blob([data],{type:mime})),a=document.createElement('a');
  a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1200);
 }
 const safeFile=s=>safeString(s,60).replace(/[^A-Za-z0-9_-]+/g,'_')||'DAS';
 const csvRow=r=>r.map(v=>{let s=String(v??'');if(/^\s*[=+@-]/.test(s)&&!Number.isFinite(Number(s)))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';}).join(',');
 function resetForm(){
  $('smSaved').value='';$('smVendor').value='';$('smModel').value='';$('smPart').value='';$('smSource').value='';$('smCostInput').value='';
  $('smMaxInput').value='';$('smMaxOutput').value='';$('smSpecFreq').value='';$('smConfirmed').checked=false;specFields();
 }
 function specFields(){
  const root=$('smSpecs');root.replaceChildren();
  for(const [key,label] of fieldSpecs[$('smType').value]||[]){
   const box=document.createElement('div');box.className='smart-field';
   const l=document.createElement('label');l.htmlFor='smSpec_'+key;l.textContent=label;
   const input=document.createElement('input');input.id='smSpec_'+key;input.type='number';input.step=key==='ports'?'1':'any';
   input.placeholder=key==='ports'?'2–8':'Required';input.min=key==='ports'?'2':key==='gainDbi'?'-60':'0';
   if(key==='ports')input.max='8';
   box.append(l,input);root.appendChild(box);
  }
 }
 function getRecord(){
  const type=$('smType').value;
  const out={id:$('smSaved').value||'m_'+Date.now().toString(36)+'_'+Math.floor(Math.random()*100000).toString(36),type,
   vendor:safeString($('smVendor').value),model:safeString($('smModel').value),partNumber:safeString($('smPart').value),
   specSource:safeString($('smSource').value,220),specFrequencyMHz:$n('smSpecFreq'),specConfirmed:$('smConfirmed').checked,unitCost:$n('smCostInput'),
   maxInputDbm:$n('smMaxInput'),maxOutputDbm:$n('smMaxOutput')};
  for(const [key] of fieldSpecs[type])out[key]=$n('smSpec_'+key);
  return safeRecord(out);
 }
 function validateRecord(r){
  if(!r.vendor||!r.model)return 'Enter both a manufacturer and model.';
  for(const [key] of fieldSpecs[r.type]){
    const n=r[key];
    if(!Number.isFinite(n))return 'Enter '+key+' from manufacturer specifications or measurements.';
    if(key==='ports'&&(!Number.isInteger(n)||n<2||n>8))return 'Splitter ports must be an integer from 2 through 8.';
    if(key!=='gainDbi'&&n<0)return key+' cannot be negative.';
  }
  if(r.unitCost!==null&&r.unitCost<0)return 'Unit cost cannot be negative.';
  if(r.specFrequencyMHz!==null&&(r.specFrequencyMHz<30||r.specFrequencyMHz>12000))return 'Reference frequency must be between 30 and 12,000 MHz.';
  if(r.specConfirmed&&!r.specSource)return 'A datasheet or measurement reference is required to mark specs verified.';
  return '';
 }
 function persistCatalog(){
  try{localStorage.setItem(STORE,JSON.stringify(library))}catch(e){status('Equipment catalog could not be saved locally; export JSON.');}
 }
 function updateChoices(selected=''){
  const input=$('smSaved');input.replaceChildren();const none=document.createElement('option');none.value='';none.textContent='New entry';input.appendChild(none);
  library.sort((a,b)=>(a.vendor+' '+a.model).localeCompare(b.vendor+' '+b.model));
  for(const r of library){const opt=document.createElement('option');opt.value=r.id;opt.textContent=[r.vendor,r.model,'('+r.type+')'].join(' ');input.appendChild(opt);}
  input.value=selected;
 }
 function setForm(rec){
  $('smType').value=rec.type;$('smVendor').value=rec.vendor;$('smModel').value=rec.model;$('smPart').value=rec.partNumber;
  $('smSource').value=rec.specSource;$('smSpecFreq').value=rec.specFrequencyMHz??'';$('smCostInput').value=rec.unitCost??'';$('smMaxInput').value=rec.maxInputDbm??'';
  $('smMaxOutput').value=rec.maxOutputDbm??'';$('smConfirmed').checked=rec.specConfirmed;
  specFields();for(const [key] of fieldSpecs[rec.type])$('smSpec_'+key).value=rec[key]??'';
 }
 $('smSaved').addEventListener('change',()=>{const r=library.find(x=>x.id===$('smSaved').value);if(r)setForm(r);else resetForm()});
 $('smType').addEventListener('change',specFields);
 $('smNew').addEventListener('click',resetForm);
 $('smUseType').addEventListener('click',()=>{
  const st=api.read(),n=st.nodes.find(x=>x.id===st.selected);
  if(!n||!fieldSpecs[n.type]){status('Choose a physical component on the site-plan diagram first.');return;}
  $('smType').value=n.type;specFields();for(const [key] of fieldSpecs[n.type])$('smSpec_'+key).value=n[key]??'';
  status('Editing '+n.name+' ('+n.type+'); review and verify values before saving a catalog model.');
 });
 $('smSave').addEventListener('click',()=>{
  const r=getRecord(),error=validateRecord(r);if(error){status(error);return;}
  const i=library.findIndex(x=>x.id===r.id);
  if(i<0&&library.length>=MAX){status('Equipment catalog limit: 250 models. Export and delete unused entries.');return;}
  if(i<0)library.push(r);else library[i]=r;
  persistCatalog();updateChoices(r.id);status('Saved '+r.vendor+' '+r.model+' to your local equipment catalog.');review();
 });
 $('smApply').addEventListener('click',()=>{
  const r=getRecord(),error=validateRecord(r);if(error){status(error);return;}
  const res=api.applyModel(r);
  if(res.ok){status('Assigned '+r.vendor+' '+r.model+' to the selected '+r.type+' node.');review();}
  else status(res.reason||'Could not apply this model.');
 });
 $('smDelete').addEventListener('click',()=>{
  const id=$('smSaved').value;if(!id)return;
  const r=library.find(x=>x.id===id);
  if(!window.confirm('Delete '+(r?.vendor||'')+' '+(r?.model||'')+' from the saved model catalog? Already assigned Site Plan components remain unchanged.'))return;
  library=library.filter(x=>x.id!==id);persistCatalog();updateChoices();resetForm();review();status('Catalog entry deleted. Existing node assignments were retained.');
 });
 $('smExportLibrary').addEventListener('click',()=>writeFile('Batwing_Equipment_Catalog_v1.13.json','application/json',JSON.stringify({format:'Batwing-Equipment-Catalog',version:'1.13',items:library},null,2)));
 $('smImportLibrary').addEventListener('click',()=>$('smLibraryFile').click());
 $('smLibraryFile').addEventListener('change',async e=>{
  const file=e.target.files?.[0];if(!file)return;
  try{
   if(file.size>500000)throw Error('Catalog file exceeds 500 KB.');
   const doc=JSON.parse(await file.text());if(doc?.format!=='Batwing-Equipment-Catalog'||!Array.isArray(doc.items))throw Error('Unsupported equipment catalog JSON.');
   const cleaned=doc.items.slice(0,MAX).map(safeRecord).filter(x=>!validateRecord(x));
   if(!window.confirm('Import '+cleaned.length+' equipment models? Models with duplicate IDs will replace existing entries.'))return;
   const map=new Map(library.map(x=>[x.id,x]));for(const x of cleaned)map.set(x.id,x);
   library=[...map.values()].slice(0,MAX);persistCatalog();updateChoices();resetForm();status('Imported '+cleaned.length+' verified-format catalog entries. Confirm all manufacturer specifications individually.');
  }catch(err){status('Catalog import failed: '+err.message)}finally{e.target.value='';}
 });
 for(const [id,key] of [['smMinEirp','minEirp'],['smMaxEirp','maxEirp'],['smCableThreshold','highCableLoss']]){
  $(id).value=cfg[key]??'';
  $(id).addEventListener('input',()=>{cfg[key]=$(id).value;try{localStorage.setItem(CFG,JSON.stringify(cfg))}catch(e){}review()});
 }
 function reviewData(plan,calc,settings){
  const nodes=plan.nodes||[],physical=nodes.filter(x=>x.type!=='port'&&x.type!=='tx');
  const findings=[],add=(severity,component,message)=>findings.push({severity,component,message});
  const threshold=safeNum(settings.highCableLoss),minEirp=safeNum(settings.minEirp),maxEirp=safeNum(settings.maxEirp);
  const children=new Map();
  for(const n of nodes){if(n.parent){const x=children.get(n.parent)||[];x.push(n);children.set(n.parent,x)}}
  for(const n of nodes){
   const r=calc[n.id];
   if(!r) {add('error',n.name||n.type,'Not connected to a calculated RF path.');continue;}
   if(n.type==='port'&&!(children.get(n.id)||[]).length)add('warning',n.name,'Splitter/coupler output is unused; confirm termination and design requirements.');
   if(n.type==='tx'&&!(children.get(n.id)||[]).length)add('warning',n.name,'No signal distribution components connected.');
   if(n.type!=='antenna'&&n.type!=='port'&&n.type!=='tx'&&!(children.get(n.id)||[]).length)add('warning',n.name,'Unterminated branch: no antenna at this endpoint.');
   if(n.type==='splitter'){
    if(n.ports<2||n.ports>8)add('error',n.name,'Splitter way count is outside 2–8.');
   }
   if(n.type==='coupler'){
    const through=Math.pow(10,-Number(n.throughLossDb||0)/10),tap=Math.pow(10,-Number(n.tapLossDb||0)/10);
    if(through+tap>1.02)add('error',n.name,'Through and tap coefficients imply more output power than passive input; verify losses.');
   }
   if(n.type==='cable'){
    const loss=Number(n.feet||0)*Number(n.lossPer100Ft||0)/100;
    if(threshold!==null&&threshold>=0&&loss>threshold)add('warning',n.name,'Cable section loses '+loss.toFixed(2)+' dB (threshold '+threshold+' dB).');
    if(Number(n.feet||0)<=0)add('warning',n.name,'Cable length is zero; enter actual footage.');
   }
   if(n.type==='antenna'){
    if(minEirp!==null&&r.eirp<minEirp)add('error',n.name,'Calculated antenna EIRP '+r.eirp.toFixed(2)+' dBm is below user minimum '+minEirp+' dBm.');
    if(maxEirp!==null&&r.eirp>maxEirp)add('error',n.name,'Calculated antenna EIRP '+r.eirp.toFixed(2)+' dBm exceeds user maximum '+maxEirp+' dBm.');
   }
   if(n.type==='port'||n.type==='tx')continue;
   if(!n.specConfirmed)add('review',n.name,'RF values have not been marked verified against a datasheet or measured record.');
   if(!n.vendor||!n.model)add('review',n.name,'Manufacturer and model are unspecified.');
   if(Number.isFinite(Number(plan.frequencyMHz))&&plan.frequencyMHz!==null&&plan.frequencyMHz!==undefined){
    if(n.specFrequencyMHz!==undefined&&n.specFrequencyMHz!==null&&Number.isFinite(Number(n.specFrequencyMHz))&&Math.abs(Number(n.specFrequencyMHz)-Number(plan.frequencyMHz))>0.5)add('warning',n.name,'RF parameters were entered for '+n.specFrequencyMHz+' MHz, but project frequency is '+plan.frequencyMHz+' MHz. Verify frequency-specific loss/gain.');
    else if(n.type==='cable'&&(n.specFrequencyMHz===undefined||n.specFrequencyMHz===null))add('review',n.name,'Cable attenuation has no stated reference frequency; verify at '+plan.frequencyMHz+' MHz.');
   }
   if(n.maxInputDbm!==undefined&&n.maxInputDbm!==null&&r.input>Number(n.maxInputDbm)+.01)add('error',n.name,'Input '+r.input.toFixed(2)+' dBm exceeds rated input '+n.maxInputDbm+' dBm.');
   if(n.maxOutputDbm!==undefined&&n.maxOutputDbm!==null&&r.out>Number(n.maxOutputDbm)+.01)add('error',n.name,'Output '+r.out.toFixed(2)+' dBm exceeds rated output '+n.maxOutputDbm+' dBm.');
  }
  const antennaCount=nodes.filter(n=>n.type==='antenna').length;
  if(!antennaCount)add('warning','Overall plan','No server antenna endpoints are drawn.');
  if(minEirp!==null&&maxEirp!==null&&minEirp>maxEirp)add('error','Review settings','Minimum antenna EIRP exceeds maximum.');
  const cableFt=physical.filter(n=>n.type==='cable').reduce((s,n)=>s+Number(n.feet||0),0);
  const bomMap=new Map();
  for(const n of physical){
    const key=[n.type,n.vendor||'',n.model||'',n.partNumber||'',n.unitCost??''].join('|');
    if(!bomMap.has(key))bomMap.set(key,{type:n.type,vendor:n.vendor||'Unspecified',model:n.model||'Unspecified',partNumber:n.partNumber||'',qty:0,feet:0,unitCost:n.unitCost!==undefined&&n.unitCost!==null?Number(n.unitCost):null});
    const item=bomMap.get(key);item.qty++;if(n.type==='cable')item.feet+=Number(n.feet||0);
  }
  const bom=[...bomMap.values()].sort((a,b)=>(a.type+a.vendor+a.model).localeCompare(b.type+b.vendor+b.model));
  const countKnown=bom.filter(x=>x.unitCost!==null).length;
  const knownCost=bom.reduce((s,x)=>s+(x.unitCost===null?0:x.unitCost*(x.type==='cable'?x.feet:x.qty)),0);
  return {findings,bom,antennaCount,cableFt,knownCost,countKnown,unpriced:bom.length-countKnown,physicalCount:physical.length};
 }
 let latest=null;
 function review(){
  const plan=api.read(),calc=api.calculate();
  latest={plan,...reviewData(plan,calc,{minEirp:$('smMinEirp').value,maxEirp:$('smMaxEirp').value,highCableLoss:$('smCableThreshold').value})};
  $('smAntennas').textContent=latest.antennaCount;
  $('smCable').textContent=latest.cableFt.toLocaleString('en-US',{maximumFractionDigits:1})+' ft';
  $('smFindings').textContent=latest.findings.length;
  $('smCost').textContent=currency(latest.knownCost)+(latest.unpriced?'*':'');
  $('smSummary').textContent=latest.findings.filter(f=>f.severity==='error').length+' blocking checks, '+latest.findings.filter(f=>f.severity==='warning').length+' warnings, '+latest.findings.filter(f=>f.severity==='review').length+' unverified details. '+latest.unpriced+' BOM groups without entered prices.';
  $('smSummary').classList.toggle('warn',latest.findings.some(f=>f.severity==='error'));
  const issues=$('smIssues');issues.replaceChildren();
  if(!latest.findings.length){issues.textContent='No flagged conditions at the entered assumptions. Field verification is still required.';}
  for(const f of latest.findings){
   const row=document.createElement('div');row.className='smart-alert'+(f.severity==='error'||f.severity==='warning'?' warn':'');
   const strong=document.createElement('strong');strong.textContent=f.severity.toUpperCase()+' · '+f.component+' — ';
   row.append(strong,document.createTextNode(f.message));issues.appendChild(row);
  }
  const table=$('smTable');table.replaceChildren();
  const t=document.createElement('table');
  const header=document.createElement('tr');for(const h of ['Type','Manufacturer / model','Part number','Qty','Cable ft','Unit price','Subtotal']){const th=document.createElement('th');th.textContent=h;header.appendChild(th)}t.appendChild(header);
  for(const b of latest.bom){
   const row=document.createElement('tr');
   const subtotal=b.unitCost===null?'Not priced':currency(b.unitCost*(b.type==='cable'?b.feet:b.qty));
   for(const v of [b.type,b.vendor+' / '+b.model,b.partNumber,b.qty,b.type==='cable'?b.feet.toFixed(1):'—',b.unitCost===null?'—':currency(b.unitCost),subtotal]){
    const td=document.createElement('td');td.textContent=String(v);row.appendChild(td);
   }t.appendChild(row);
  }
  if(!latest.bom.length){const r=document.createElement('tr'),td=document.createElement('td');td.colSpan=7;td.textContent='Add components in the diagram to generate a BOM.';r.appendChild(td);t.appendChild(r)}
  table.appendChild(t);
  const selected=plan.nodes.find(x=>x.id===plan.selected);
  $('smSelected').textContent='Selected in diagram: '+(selected?selected.name+' ('+selected.type+')':'none')+'. Choose a catalog entry of the matching type to assign it.';
 }
 $('smExportIssues').addEventListener('click',()=>{
  review();
  const rows=[['severity','component','finding'],...latest.findings.map(f=>[f.severity,f.component,f.message])];
  writeFile('Batwing_DAS_Findings_'+safeFile(latest.plan.site)+'.csv','text/csv;charset=utf-8',rows.map(csvRow).join('\r\n'));
 });
 $('smExportBOM').addEventListener('click',()=>{
  review();
  const rows=[['Type','Manufacturer','Model','Part Number','Quantity','Cable Feet','Unit Price USD','Subtotal USD','Pricing status'],
    ...latest.bom.map(b=>[b.type,b.vendor,b.model,b.partNumber,b.qty,b.type==='cable'?b.feet:'',b.unitCost??'',b.unitCost===null?'':(b.unitCost*(b.type==='cable'?b.feet:b.qty)).toFixed(2),b.unitCost===null?'Unpriced':'Entered price'])];
  writeFile('Batwing_DAS_BOM_'+safeFile(latest.plan.site)+'.csv','text/csv;charset=utf-8',rows.map(csvRow).join('\r\n'));
 });
 const jump=document.createElement('button');jump.id='smJump';jump.className='bsp-btn';jump.type='button';jump.textContent='🧠 Smart BOM / Checks';
 const holder=$('bspToLink')?.parentElement;
 holder?.insertBefore(jump,holder.firstChild);
 jump.addEventListener('click',()=>panel.scrollIntoView({behavior:'smooth',block:'start'}));
 window.addEventListener('batwing:siteplan-change',review);
 window.addEventListener('batwing:siteplan-render',review);
 window.BatwingSmartDAS=Object.freeze({version:'v1.13',review:()=>reviewData(api.read(),api.calculate(),cfg),getCatalog:()=>JSON.parse(JSON.stringify(library))});
 updateChoices();specFields();review();
})();