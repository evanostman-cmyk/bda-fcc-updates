(function coverageModule(){
  'use strict';
  if(document.getElementById('bwCoverageDialog'))return;
  const $=id=>document.getElementById(id),KEY='BATWING_COVERAGE_SURVEY_v1.14',MAX_FLOORS=16,MAX_CELLS=900;
  const safe=(s,max=180)=>String(s??'').slice(0,max);
  const esc=s=>safe(s,5000).replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','"':'&quot;'}[x]));
  const finite=s=>s!==null&&s!==undefined&&String(s).trim()!==''&&Number.isFinite(Number(s))?Number(s):null;
  const clamp=(v,min,max,def)=>v!==null&&Number.isFinite(Number(v))?Math.max(min,Math.min(max,Number(v))):def;
  const id=()=>Math.random().toString(36).slice(2,11);
  function floor(name='Floor 1',rows=4,cols=5){return {id:id(),name,rows,cols,image:null,inset:{l:0,t:0,r:0,b:0},cells:{}}}
  function fresh(){return {format:'Batwing-Coverage-Survey',version:'1.14',site:'New survey',address:'',ahj:'',criteriaRef:'',technician:'',equipment:'',radio:'',channel:'',date:new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,10),thresholds:{dlRssi:null,dlDaq:null,ulRssi:null,ulDaq:null,generalPercent:null,criticalPercent:null},required:{dlRssi:true,dlDaq:true,ulRssi:false,ulDaq:false},floors:[floor()],current:0,selected:'0,0'}}
  let st=fresh(), saveTimer=null,db=null,dbFailed=false,loadResolved=false,dirtyCell=false;
  const btn=document.createElement('button');btn.type='button';btn.className='btn';btn.id='bwCoverageOpen';btn.textContent='▦ Coverage Survey';
  (document.getElementById('bdaSitePlanTop')||document.getElementById('fccOpenTop'))?.insertAdjacentElement('afterend',btn);
  const css=document.createElement('style');
  css.textContent=`
  #bwCoverageDialog{width:min(1440px,calc(100vw - 18px));max-height:96dvh;overflow:auto;padding:0;border:1px solid #c5dce7;border-radius:15px;color:#15384b}
  #bwCoverageDialog .cs-head{padding:17px 19px;border-bottom:1px solid #cbdce6;background:#eaf3f7;display:flex;justify-content:space-between;gap:12px;align-items:flex-start}
  #bwCoverageDialog .cs-head h2{font-size:1.35rem;margin:0 0 4px;color:#164a62}
  #bwCoverageDialog .cs-head p{font-size:.8rem;margin:0;color:#557787}
  #bwCoverageDialog .cs-head button{white-space:nowrap;width:auto}
  #bwCoverageDialog .cs-body{padding:15px 17px 26px;display:grid;gap:14px}
  #bwCoverageDialog .cs-section{border:1px solid #d3e1e7;border-radius:12px;padding:13px;background:white;min-width:0}
  #bwCoverageDialog h3{font-size:1.04rem;color:#194c62;margin:0 0 11px}
  #bwCoverageDialog .cs-fields{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px}
  #bwCoverageDialog .cs-field{min-width:0}
  #bwCoverageDialog label{display:block;font-size:.75rem;font-weight:750;color:#345c70}
  #bwCoverageDialog input:not([type=checkbox]),#bwCoverageDialog select,#bwCoverageDialog textarea{width:100%;min-width:0;margin-top:4px;border:1px solid #c3d7df;border-radius:8px;padding:8px 10px;background:#fff;color:#16384a;min-height:38px}
  #bwCoverageDialog textarea{min-height:75px;resize:vertical}
  #bwCoverageDialog .cs-check{display:flex;align-items:center;gap:6px;font-size:.76rem;font-weight:700;margin-bottom:4px}
  #bwCoverageDialog .cs-check input{width:18px;height:18px;margin:0;flex:none}
  #bwCoverageDialog .cs-actions{display:flex;flex-wrap:wrap;gap:7px;align-items:center}
  #bwCoverageDialog button.cs-btn{background:#edf6f9;color:#205871;border:1px solid #b9d3dd;border-radius:8px;font-size:.78rem;font-weight:750;min-height:36px;padding:8px 12px;width:auto}
  #bwCoverageDialog button.cs-btn.primary{background:#176c85;border-color:#176c85;color:white}
  #bwCoverageDialog button.cs-btn.danger{background:#fff3ef;border-color:#e9b9a5;color:#934d37}
  #bwCoverageDialog button:disabled{opacity:.5;cursor:not-allowed}
  #bwCoverageDialog .cs-help{font-size:.76rem;line-height:1.5;color:#637d89;margin:8px 0 0}
  #bwCoverageDialog .cs-floor-header{display:flex;justify-content:space-between;align-items:flex-end;gap:8px;flex-wrap:wrap}
  #bwCoverageDialog .cs-tiles{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:9px}
  #bwCoverageDialog .cs-tile{border:1px solid #d2e3e9;background:#f2f9fa;border-radius:10px;padding:11px}
  #bwCoverageDialog .cs-tile small{display:block;font-size:.73rem;color:#577784}
  #bwCoverageDialog .cs-tile strong{display:block;font-size:1.18rem;color:#184d66}
  #bwCoverageDialog .cs-work{display:grid;grid-template-columns:minmax(0,1.6fr) minmax(250px,.8fr);gap:13px;align-items:start}
  #bwCoverageDialog .cs-map-frame{border:1px solid #cadfe5;border-radius:11px;overflow:auto;background:#f3f7f7;max-height:76vh}
  #bwCoverageDialog .cs-paper{position:relative;min-width:300px}
  #bwCoverageDialog .cs-paper img{display:block;width:100%;height:auto}
  #bwCoverageDialog .cs-paper .cs-placeholder{aspect-ratio:1.5;background:repeating-linear-gradient(0deg,#f1f6f8,#f1f6f8 28px,#dce7eb 29px),repeating-linear-gradient(90deg,#f1f6f8,#f1f6f8 28px,#dce7eb 29px)}
  #bwCoverageDialog .cs-overlay{position:absolute;display:grid}
  #bwCoverageDialog button.cs-cell{min-height:0;min-width:0;padding:2px 0;border:1px solid #4b6c7980;font-size:clamp(.5rem,1vw,.8rem);font-weight:850;text-align:center;color:#12374a;border-radius:0;background:#e9f0f399}
  #bwCoverageDialog button.cs-cell.pass{background:#68d6a998}
  #bwCoverageDialog button.cs-cell.fail{background:#ff8585ac}
  #bwCoverageDialog button.cs-cell.partial{background:#f6cf76ac}
  #bwCoverageDialog button.cs-cell.excluded{background:#c2cbd1b5;color:#576671}
  #bwCoverageDialog button.cs-cell.active{outline:3px solid #f19b28;outline-offset:-3px;z-index:1}
  #bwCoverageDialog .cs-editor{border:1px solid #d3e3e7;border-radius:11px;padding:13px;min-width:0;background:#fafcfc}
  #bwCoverageDialog .cs-editor h3{margin-bottom:10px}
  #bwCoverageDialog .cs-editor .cs-fields{grid-template-columns:repeat(2,minmax(0,1fr))}
  #bwCoverageDialog .cs-editor .cs-field.full{grid-column:span 2}
  #bwCoverageDialog #csCellStatus{padding:9px;border:1px solid #dce6eb;border-radius:8px;font-weight:750;font-size:.82rem;margin:9px 0}
  #bwCoverageDialog .cs-legend{font-size:.76rem;display:flex;gap:12px;flex-wrap:wrap;align-items:center;margin-top:8px}
  #bwCoverageDialog .cs-legend span:before{content:'';display:inline-block;width:12px;height:12px;margin-right:5px;vertical-align:-1px;background:var(--swatch);border-radius:2px}
  #bwCoverageDialog .cs-status{border:1px solid #d6e4e9;border-radius:8px;padding:10px;font-size:.82rem;line-height:1.5;background:#f6f9fb;color:#365b70}
  #bwCoverageDialog .cs-status.warn{background:#fff5e9;border-color:#ebc89c;color:#824c28}
  #bwCoverageDialog .cs-footer{padding:11px 16px;border-top:1px solid #cbdee5;display:flex;gap:8px;flex-wrap:wrap;align-items:center;background:#edf6f8}
  #bwCoverageDialog .cs-footer small{flex:1;font-size:.75rem;color:#5b7b88}
  #bwCoverageDialog details>summary{cursor:pointer;font-weight:800;color:#20566f}
  #bwCoverageDialog .cs-floor-summary{font-size:.81rem;overflow:auto}
  #bwCoverageDialog .cs-floor-summary table{border-collapse:collapse;width:100%;min-width:540px}
  #bwCoverageDialog .cs-floor-summary th,#bwCoverageDialog .cs-floor-summary td{border-bottom:1px solid #dce7ed;padding:9px 7px;text-align:left}
  #bwCoverageDialog .cs-floor-summary th{background:#edf6f9}
  #bwWorkspacePages #bwCoverageDialog{height:auto!important;max-height:none!important;overflow:visible!important}
  #bwWorkspacePages #bwCoverageDialog .cs-head{position:relative}
  .top-actions #bwCoverageOpen{display:none!important}
  @media(max-width:1040px){#bwCoverageDialog .cs-fields{grid-template-columns:repeat(2,minmax(0,1fr))}#bwCoverageDialog .cs-work{grid-template-columns:minmax(0,1fr)}#bwCoverageDialog .cs-editor .cs-fields{grid-template-columns:repeat(4,minmax(0,1fr))}}
  @media(max-width:680px){#bwCoverageDialog .cs-body{padding:8px}#bwCoverageDialog .cs-section{padding:10px}#bwCoverageDialog .cs-head{padding:11px}#bwCoverageDialog .cs-head h2{font-size:1.1rem}#bwCoverageDialog .cs-tiles{grid-template-columns:repeat(2,minmax(0,1fr))}#bwCoverageDialog .cs-fields,#bwCoverageDialog .cs-editor .cs-fields{grid-template-columns:repeat(2,minmax(0,1fr))}#bwCoverageDialog button.cs-cell{font-size:.6rem}}
  `;
  document.head.appendChild(css);
  const dialog=document.createElement('dialog');dialog.id='bwCoverageDialog';dialog.setAttribute('aria-labelledby','csTitle');
  dialog.innerHTML=`
  <header class="cs-head"><div><h2 id="csTitle">▦ Building RF Coverage Survey <span style="font-size:.6em;color:#65818e">v1.14</span></h2>
  <p>Floor-plan test grids, DL/UL RSSI and DAQ, critical areas, color-coded coverage, and reports — offline-first.</p></div>
  <button class="cs-btn" type="button" id="csClose">← Channel Planner</button></header>
  <div class="cs-body">
   <section class="cs-section"><h3>1 · Survey identification</h3><div class="cs-fields">
    <div class="cs-field"><label for="csSite">Facility / project</label><input id="csSite" maxlength="120"></div>
    <div class="cs-field"><label for="csAddress">Facility address</label><input id="csAddress" maxlength="220"></div>
    <div class="cs-field"><label for="csAhj">AHJ / agency</label><input id="csAhj" maxlength="150" placeholder="Authority having jurisdiction"></div>
    <div class="cs-field"><label for="csCriteriaRef">Applicable acceptance criteria</label><input id="csCriteriaRef" maxlength="170" placeholder="Adopted code, revision, approved test plan"></div>
    <div class="cs-field"><label for="csTechnician">Survey technician</label><input id="csTechnician" maxlength="100"></div>
    <div class="cs-field"><label for="csDate">Survey date</label><input id="csDate" type="date"></div>
    <div class="cs-field"><label for="csEquipment">Test equipment / serial</label><input id="csEquipment" maxlength="180"></div>
    <div class="cs-field"><label for="csRadio">Radio / system</label><input id="csRadio" maxlength="150"></div>
    <div class="cs-field"><label for="csChannel">Test frequency / channel(s)</label><input id="csChannel" maxlength="150" placeholder="State direction and frequency"></div>
   </div></section>
   <section class="cs-section"><h3>2 · AHJ-approved test criteria</h3>
    <div class="cs-fields">
     <div class="cs-field"><label class="cs-check"><input type="checkbox" id="csReqDL"> Require DL RSSI</label><label for="csDL">Minimum DL RSSI (dBm)</label><input type="number" id="csDL" step="0.1" placeholder="Enter threshold"></div>
     <div class="cs-field"><label class="cs-check"><input type="checkbox" id="csReqDLDAQ"> Require DL DAQ</label><label for="csDLDAQ">Minimum DL DAQ (0–5)</label><input type="number" id="csDLDAQ" min="0" max="5" step="0.1" placeholder="Enter threshold"></div>
     <div class="cs-field"><label class="cs-check"><input type="checkbox" id="csReqUL"> Require UL RSSI</label><label for="csUL">Minimum UL RSSI at tower (dBm)</label><input type="number" id="csUL" step="0.1" placeholder="Enter threshold"></div>
     <div class="cs-field"><label class="cs-check"><input type="checkbox" id="csReqULDAQ"> Require UL DAQ</label><label for="csULDAQ">Minimum UL DAQ (0–5)</label><input type="number" id="csULDAQ" min="0" max="5" step="0.1" placeholder="Enter threshold"></div>
     <div class="cs-field"><label for="csGeneralTarget">General-area target coverage (%)</label><input id="csGeneralTarget" type="number" min="0" max="100" step=".1" placeholder="Approved target"></div>
     <div class="cs-field"><label for="csCriticalTarget">Critical-area target coverage (%)</label><input id="csCriticalTarget" type="number" min="0" max="100" step=".1" placeholder="Approved target"></div>
    </div><p class="cs-help"><strong>No automatic code assumptions:</strong> thresholds and required directions must reflect the site’s adopted code and AHJ test protocol. A blank required threshold prevents a passing classification. Results use equal-area grid cells, not a calibrated RF heat map. Areas you exclude require a reason.</p>
   </section>
   <section class="cs-section"><div class="cs-floor-header"><h3 style="margin:0">3 · Floors and test grid</h3><div class="cs-actions">
     <button class="cs-btn" id="csAddFloor" type="button">+ Add floor</button>
     <button class="cs-btn danger" id="csDeleteFloor" type="button">Delete floor</button>
   </div></div>
   <div class="cs-fields" style="margin-top:10px">
    <div class="cs-field"><label for="csFloor">Current floor</label><select id="csFloor"></select></div>
    <div class="cs-field"><label for="csFloorName">Floor label</label><input id="csFloorName" maxlength="100"></div>
    <div class="cs-field"><label for="csRows">Grid rows</label><input id="csRows" type="number" min="1" max="30" step="1"></div>
    <div class="cs-field"><label for="csCols">Grid columns</label><input id="csCols" type="number" min="1" max="30" step="1"></div>
   </div>
   <div class="cs-actions" style="margin:10px 0">
    <button class="cs-btn" id="csApplyGrid" type="button">Apply grid size</button>
    <label for="csImage">Upload floor plan (PNG / JPG / WebP)</label>
    <input id="csImage" type="file" accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp" style="max-width:320px">
    <button class="cs-btn" id="csClearImage" type="button">Remove plan image</button>
   </div>
   <details><summary>Adjust grid position over floor-plan image</summary><div class="cs-fields" style="margin-top:10px">
    <div class="cs-field"><label for="csLeft">Left margin (%)</label><input id="csLeft" type="number" step=".5" min="0" max="80"></div>
    <div class="cs-field"><label for="csTop">Top margin (%)</label><input id="csTop" type="number" step=".5" min="0" max="80"></div>
    <div class="cs-field"><label for="csRight">Right margin (%)</label><input id="csRight" type="number" step=".5" min="0" max="80"></div>
    <div class="cs-field"><label for="csBottom">Bottom margin (%)</label><input id="csBottom" type="number" step=".5" min="0" max="80"></div>
   </div><p class="cs-help">Use margins to exclude page titles or blank edges from the visual grid overlay. Each grid cell remains an equal rectangular test area; non-covered spaces must be individually excluded with notes.</p></details>
   <p class="cs-help">Floor-plan images are resized locally (up to 1,800 pixels) for portable offline saving. PDFs should be converted to PNG/JPEG before importing; this version does not rasterize PDFs. Nothing is uploaded to the public GitHub repository.</p>
   </section>
   <section class="cs-section"><div class="cs-floor-header"><h3 style="margin:0">4 · Floor-plan coverage map</h3><div class="cs-actions">
    <button id="csPrev" class="cs-btn" type="button">← Previous cell</button><button id="csNext" class="cs-btn primary" type="button">Next untested →</button>
   </div></div>
    <div class="cs-legend">
      <span style="--swatch:#65cfa4">Pass</span><span style="--swatch:#fd8a8a">Fail</span><span style="--swatch:#f3ca6b">Partial / needs criteria</span><span style="--swatch:#d5dfe3">Untested</span><span style="--swatch:#9dabaf">Excluded</span>
    </div>
    <div class="cs-work" style="margin-top:12px">
     <div class="cs-map-frame"><div class="cs-paper" id="csPaper"><div class="cs-placeholder"></div><div class="cs-overlay" id="csOverlay"></div></div></div>
     <aside class="cs-editor">
      <h3 id="csEditing">Cell A1</h3>
      <div class="cs-fields">
       <div class="cs-field full"><label for="csZone">Cell classification</label><select id="csZone"><option value="general">General coverage</option><option value="critical">Critical area (AHJ designated)</option><option value="excluded">Excluded (reason required)</option></select></div>
       <div class="cs-field"><label for="csCellDL">Downlink RSSI (dBm)</label><input type="number" step="0.1" id="csCellDL"></div>
       <div class="cs-field"><label for="csCellDLDAQ">Downlink DAQ (0–5)</label><input type="number" min="0" max="5" step=".1" id="csCellDLDAQ"></div>
       <div class="cs-field"><label for="csCellUL">Uplink tower RSSI (dBm)</label><input type="number" step=".1" id="csCellUL"></div>
       <div class="cs-field"><label for="csCellULDAQ">Uplink DAQ (0–5)</label><input type="number" min="0" max="5" step=".1" id="csCellULDAQ"></div>
       <div class="cs-field"><label for="csCellFrequency">Test frequency (MHz)</label><input type="number" min="30" max="12000" step="any" id="csCellFrequency" placeholder="Optional"></div>
       <div class="cs-field"><label for="csCellChannel">Channel / talkgroup</label><input type="text" id="csCellChannel" maxlength="90" placeholder="Optional"></div>
       <div class="cs-field full"><label for="csCellNotes">Field notes / exclusion reason</label><textarea id="csCellNotes" rows="2" maxlength="800" placeholder="Critical room, stairwell, test result, excluded space…"></textarea></div>
      </div>
      <div id="csCellStatus">Not tested</div>
      <div class="cs-actions"><button type="button" class="cs-btn primary" id="csSaveCell">Save reading</button>
       <button type="button" class="cs-btn primary" id="csSaveNext">Save &amp; next</button>
       <button type="button" class="cs-btn" id="csClearCell">Clear reading</button></div>
      <p class="cs-help" id="csCellStamp"></p>
     </aside>
    </div>
   </section>
   <section class="cs-section"><h3>5 · Acceptance summary</h3>
     <div class="cs-tiles">
      <div class="cs-tile"><small>Active grid cells</small><strong id="csTotal">—</strong></div>
      <div class="cs-tile"><small>Recorded pass</small><strong id="csPass">—</strong></div>
      <div class="cs-tile"><small>Failed</small><strong id="csFail">—</strong></div>
      <div class="cs-tile"><small>Untested / partial</small><strong id="csPending">—</strong></div>
      <div class="cs-tile"><small>Excluded with reason</small><strong id="csExcluded">—</strong></div>
     </div>
     <div id="csStatus" class="cs-status" style="margin:12px 0">Configure criteria and start recording readings.</div>
     <div id="csFloorSummary" class="cs-floor-summary"></div>
     <p class="cs-help">This is an engineering survey record, not an AHJ certificate. Coverage percentages count passing squares divided by <strong>all included squares</strong>, including untested squares in the denominator. A final “Meets configured criteria” label requires all included cells tested, applicable direction thresholds, and both target percentages where critical cells exist. Approval, channel sampling, test methods and interpretation belong to the AHJ.</p>
   </section>
   <section class="cs-section"><h3>6 · Save, export and acceptance report</h3>
     <div class="cs-actions">
      <button type="button" class="cs-btn primary" id="csExportJSON">⬇ Complete project JSON</button>
      <button type="button" class="cs-btn" id="csImportJSON">⬆ Import project JSON</button>
      <input type="file" id="csProjectFile" hidden accept=".json,application/json">
      <button type="button" class="cs-btn" id="csExportCSV">⬇ Reading grid CSV</button>
      <button type="button" class="cs-btn primary" id="csReportHTML">⬇ Acceptance report HTML</button>
      <button type="button" class="cs-btn" id="csPrint">Print / Save PDF</button>
      <button type="button" class="cs-btn danger" id="csReset">New blank survey</button>
     </div><p class="cs-help">The portable JSON includes compressed floor-plan images and all readings. The standalone report contains site information, grid maps, color-coded results and individual test values. Print the report from your browser to save a PDF. Keep confidential customer files locally; don't upload them to the public GitHub repository.</p>
     <p id="csSaveState" class="cs-help" role="status">Survey stored locally when browser storage is available.</p>
   </section>
  </div><footer class="cs-footer"><small>Field engineering aid · AHJ criteria override • No automatic compliance approval</small></footer>`;
  document.body.appendChild(dialog);
  function dbOpen(){
    return new Promise((resolve,reject)=>{
      if(!('indexedDB' in window)){reject(Error('IndexedDB unavailable'));return;}
      const r=indexedDB.open(KEY,1);
      r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains('projects'))r.result.createObjectStore('projects');};
      r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error||Error('Unable to open survey storage'));
    });
  }
  function dbPut(snapshot){
    return new Promise((resolve,reject)=>{
      if(!db){reject(Error('No local database'));return;}
      const tx=db.transaction('projects','readwrite');
      tx.objectStore('projects').put(snapshot,'active');
      tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error||Error('Save failed'));
    });
  }
  function dbGet(){
    return new Promise((resolve,reject)=>{
      const tx=db.transaction('projects','readonly'),req=tx.objectStore('projects').get('active');
      req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
    });
  }
  function queueSave(){
    if(!loadResolved)return;
    clearTimeout(saveTimer);
    saveTimer=setTimeout(async()=>{
      if(dbFailed){$('csSaveState').textContent='Automatic browser storage unavailable. Export your complete project JSON to prevent data loss.';return;}
      try{await dbPut(JSON.parse(JSON.stringify(st)));$('csSaveState').textContent='Automatically saved on this device · export JSON for backup.';}
      catch(e){dbFailed=true;$('csSaveState').textContent='Autosave failed ('+e.message+'). Export project JSON for backup.';}
    },450);
  }
  const cellName=(r,c)=>{let x=c+1,s='';do{x--;s=String.fromCharCode(65+x%26)+s;x=Math.floor(x/26);}while(x>0);return s+(r+1);};
  function current(){return st.floors[Math.min(st.current,st.floors.length-1)];}
  const cellKey=(r,c)=>r+','+c;
  function decodeKey(key){const [r,c]=String(key).split(',').map(Number);return {r,c};}
  function selectedCell(){const f=current();const {r,c}=decodeKey(st.selected);return r>=0&&r<f.rows&&c>=0&&c<f.cols?{r,c}:{r:0,c:0};}
  function savedCell(f,r,c){return f.cells[cellKey(r,c)]||{zone:'general',dlRssi:null,dlDaq:null,ulRssi:null,ulDaq:null,notes:'',technician:'',measuredAt:'',frequencyMHz:null,channel:''};}
  const metrics=['dlRssi','dlDaq','ulRssi','ulDaq'];
  const valueIds={dlRssi:'csCellDL',dlDaq:'csCellDLDAQ',ulRssi:'csCellUL',ulDaq:'csCellULDAQ'};
  const ruleIds={dlRssi:'csDL',dlDaq:'csDLDAQ',ulRssi:'csUL',ulDaq:'csULDAQ'};
  const reqIds={dlRssi:'csReqDL',dlDaq:'csReqDLDAQ',ulRssi:'csReqUL',ulDaq:'csReqULDAQ'};
  const spec={dlRssi:[-180,30],ulRssi:[-180,30],dlDaq:[0,5],ulDaq:[0,5]};
  function rulesValid(project){
    const keys=metrics.filter(k=>project.required[k]);
    return keys.length>0&&keys.every(k=>Number.isFinite(project.thresholds[k])&&project.thresholds[k]>=spec[k][0]&&project.thresholds[k]<=spec[k][1]);
  }
  function statusFor(rec,project){
    if(rec.zone==='excluded')return rec.notes.trim()?'excluded':'partial';
    if(!rulesValid(project))return 'unconfigured';
    const keys=metrics.filter(k=>project.required[k]);
    const missing=keys.filter(k=>!Number.isFinite(rec[k]));
    if(missing.length)return keys.some(k=>Number.isFinite(rec[k]))?'partial':'untested';
    return keys.every(k=>rec[k]>=project.thresholds[k])?'pass':'fail';
  }
  function statsFor(f,project){
    const data={total:f.rows*f.cols,pass:0,fail:0,pending:0,excluded:0,general:{pass:0,total:0},critical:{pass:0,total:0},unconfigured:0};
    for(let r=0;r<f.rows;r++)for(let c=0;c<f.cols;c++){
      const x=savedCell(f,r,c),state=statusFor(x,project);
      if(state==='excluded'){data.excluded++;continue;}
      const zone=x.zone==='critical'?'critical':'general';
      data[zone].total++;
      if(state==='pass'){data.pass++;data[zone].pass++;}
      else if(state==='fail')data.fail++;
      else{data.pending++;if(state==='unconfigured')data.unconfigured++;}
    }
    data.active=data.general.total+data.critical.total;
    data.general.rate=data.general.total?100*data.general.pass/data.general.total:null;
    data.critical.rate=data.critical.total?100*data.critical.pass/data.critical.total:null;
    data.complete=data.pending===0;
    const generalTarget=project.thresholds.generalPercent,criticalTarget=project.thresholds.criticalPercent;
    data.targetsReady=Number.isFinite(generalTarget)&&(data.critical.total===0||Number.isFinite(criticalTarget));
    data.meets=data.active>0&&data.complete&&rulesValid(project)&&data.targetsReady&&(data.general.total===0||data.general.rate>=generalTarget)&&(data.critical.total===0||data.critical.rate>=criticalTarget);
    return data;
  }
  function summarize(project){
    const floors=project.floors.map(f=>({...statsFor(f,project),name:f.name}));
    const sum={active:0,pass:0,fail:0,pending:0,excluded:0,general:{pass:0,total:0},critical:{pass:0,total:0}};
    for(const f of floors){
      for(const k of ['active','pass','fail','pending','excluded'])sum[k]+=f[k];
      for(const z of ['general','critical'])for(const k of ['total','pass'])sum[z][k]+=f[z][k];
    }
    for(const z of ['general','critical'])sum[z].rate=sum[z].total?100*sum[z].pass/sum[z].total:null;
    const valid=rulesValid(project),targetConfigured=Number.isFinite(project.thresholds.generalPercent)&&(sum.critical.total===0||Number.isFinite(project.thresholds.criticalPercent));
    const complete=sum.active>0&&sum.pending===0;
    const verdict=!valid?'CRITERIA NOT CONFIGURED':!complete?'INCOMPLETE — TESTING REQUIRED':!targetConfigured?'TARGET PERCENTAGES NOT CONFIGURED':floors.every(f=>f.meets)?'MEETS CONFIGURED GRID CRITERIA':'DOES NOT MEET CONFIGURED GRID CRITERIA';
    return {floors,sum,valid,complete,targetConfigured,verdict};
  }
  function renderHeader(){
    for(const [id,key] of [['csSite','site'],['csAddress','address'],['csAhj','ahj'],['csCriteriaRef','criteriaRef'],['csTechnician','technician'],['csEquipment','equipment'],['csRadio','radio'],['csChannel','channel'],['csDate','date']])$(id).value=st[key]||'';
    for(const k of metrics){$(ruleIds[k]).value=st.thresholds[k]??'';$(reqIds[k]).checked=Boolean(st.required[k]);}
    $('csGeneralTarget').value=st.thresholds.generalPercent??'';
    $('csCriticalTarget').value=st.thresholds.criticalPercent??'';
  }
  function renderFloorControls(){
    const s=$('csFloor');s.replaceChildren();
    st.floors.forEach((f,i)=>{const o=document.createElement('option');o.value=i;o.textContent=f.name;s.appendChild(o)});
    s.value=st.current;
    const f=current();
    $('csFloorName').value=f.name;$('csRows').value=f.rows;$('csCols').value=f.cols;
    for(const [id,k] of [['csLeft','l'],['csTop','t'],['csRight','r'],['csBottom','b']])$(id).value=f.inset[k]||0;
    $('csDeleteFloor').disabled=st.floors.length===1;
  }
  const stateText={pass:'PASS',fail:'FAIL',partial:'PARTIAL / EXCLUDED WITHOUT REASON',untested:'NOT TESTED',unconfigured:'SET AHJ CRITERIA FIRST',excluded:'EXCLUDED'};
  function renderGrid(){
    const f=current(),paper=$('csPaper'),overlay=$('csOverlay');
    const img=paper.querySelector('img'),placeholder=paper.querySelector('.cs-placeholder');
    if(img)img.remove();
    placeholder.style.display=f.image?'none':'block';
    if(f.image){const i=document.createElement('img');i.alt='Floor plan for '+f.name;i.src=f.image;paper.insertBefore(i,placeholder);}
    const {l,t,r,b}=f.inset;overlay.style.left=l+'%';overlay.style.right=r+'%';overlay.style.top=t+'%';overlay.style.bottom=b+'%';
    overlay.style.gridTemplateColumns='repeat('+f.cols+',minmax(0,1fr))';
    overlay.style.gridTemplateRows='repeat('+f.rows+',minmax(0,1fr))';
    overlay.replaceChildren();
    const selected=selectedCell();
    for(let row=0;row<f.rows;row++)for(let col=0;col<f.cols;col++){
      const rec=savedCell(f,row,col),s=statusFor(rec,st),button=document.createElement('button');
      button.type='button';button.className='cs-cell '+(s==='pass'||s==='fail'||s==='excluded'?s:s==='partial'||s==='unconfigured'?'partial':'')+(selected.r===row&&selected.c===col?' active':'');
      button.textContent=f.rows*f.cols>160?'·':cellName(row,col);
      button.title=cellName(row,col)+' · '+(rec.zone||'general')+' · '+stateText[s];
      button.setAttribute('aria-label',button.title);
      button.addEventListener('click',()=>{if(st.selected!==cellKey(row,col)&&!commitPendingCell())return;st.selected=cellKey(row,col);renderGrid();renderEditor();queueSave()});
      overlay.appendChild(button);
    }
  }
  function renderEditor(){
    const f=current(),{r,c}=selectedCell(),rec=savedCell(f,r,c);
    $('csEditing').textContent=f.name+' · Cell '+cellName(r,c);
    $('csZone').value=rec.zone||'general';
    for(const key of metrics)$(valueIds[key]).value=rec[key]??'';
    $('csCellNotes').value=rec.notes||'';
    $('csCellFrequency').value=rec.frequencyMHz??'';$('csCellChannel').value=rec.channel||'';
    const state=statusFor(rec,st);
    $('csCellStatus').textContent=stateText[state];
    $('csCellStamp').textContent=rec.measuredAt?'Last recorded: '+new Date(rec.measuredAt).toLocaleString()+(rec.technician?' · '+rec.technician:''):'No saved measurement for this square.';
    dirtyCell=false;
  }
  function renderSummary(){
    const summary=summarize(st),{sum}=summary;
    for(const [id,v] of [['csTotal',sum.active],['csPass',sum.pass],['csFail',sum.fail],['csPending',sum.pending],['csExcluded',sum.excluded]])$(id).textContent=v.toLocaleString();
    const fmtPct=r=>r===null?'N/A':r.toFixed(1)+'%';
    const label=$('csStatus');label.classList.toggle('warn',summary.verdict!=='MEETS CONFIGURED GRID CRITERIA');
    label.textContent=summary.verdict+' • General '+fmtPct(sum.general.rate)+' ('+sum.general.pass+'/'+sum.general.total+')'+
      ' • Critical '+fmtPct(sum.critical.rate)+' ('+sum.critical.pass+'/'+sum.critical.total+')'+
      ' • Exclusions '+sum.excluded+' • Coverage is evaluated independently on each floor.';
    const root=$('csFloorSummary');root.replaceChildren();
    const table=document.createElement('table');const h=document.createElement('tr');
    for(const x of ['Floor','Active cells','General pass','Critical pass','Fail','Pending','Excluded','Result']){const th=document.createElement('th');th.textContent=x;h.appendChild(th)}
    table.appendChild(h);
    for(const floorData of summary.floors){
      const tr=document.createElement('tr');
      const result=floorData.meets?'Meets target':floorData.pending?'Incomplete':!summary.valid?'Criteria missing':!floorData.targetsReady?'Targets missing':'Below target';
      for(const value of [floorData.name,floorData.active,fmtPct(floorData.general.rate),fmtPct(floorData.critical.rate),floorData.fail,floorData.pending,floorData.excluded,result]){
        const td=document.createElement('td');td.textContent=String(value);tr.appendChild(td);
      }table.appendChild(tr);
    }
    root.appendChild(table);
  }
  function renderAll(){renderHeader();renderFloorControls();renderGrid();renderEditor();renderSummary();}
  // Unsaved field readings are automatically recorded before navigating away.
  // Invalid entries or excluded squares without reasons prevent navigation.
  function commitPendingCell(){return !dirtyCell||saveCell();}
  for(const id of ['csZone','csCellNotes','csCellFrequency','csCellChannel',...Object.values(valueIds)]){
    $(id).addEventListener('input',()=>{dirtyCell=true;$('csCellStatus').textContent='UNSAVED MEASUREMENT — save before leaving';});
    $(id).addEventListener('change',()=>{dirtyCell=true;$('csCellStatus').textContent='UNSAVED MEASUREMENT — save before leaving';});
  }
  for(const [input,key] of [['csSite','site'],['csAddress','address'],['csAhj','ahj'],['csCriteriaRef','criteriaRef'],['csTechnician','technician'],['csEquipment','equipment'],['csRadio','radio'],['csChannel','channel'],['csDate','date']]){
    $(input).addEventListener('input',()=>{st[key]=safe($(input).value,key==='address'?220:180);queueSave()});
  }
  for(const key of metrics){
    $(ruleIds[key]).addEventListener('change',()=>{
      if(!commitPendingCell())return;
      const n=finite($(ruleIds[key]).value);st.thresholds[key]=n!==null&&n>=spec[key][0]&&n<=spec[key][1]?n:null;
      renderGrid();renderEditor();renderSummary();queueSave();
    });
    $(reqIds[key]).addEventListener('change',()=>{if(!commitPendingCell())return;st.required[key]=$(reqIds[key]).checked;renderGrid();renderEditor();renderSummary();queueSave()});
  }
  for(const [id,key] of [['csGeneralTarget','generalPercent'],['csCriticalTarget','criticalPercent']]){
    $(id).addEventListener('change',()=>{const n=finite($(id).value);st.thresholds[key]=n!==null&&n>=0&&n<=100?n:null;renderSummary();queueSave()});
  }
  $('csFloor').addEventListener('change',()=>{if(!commitPendingCell()){$('csFloor').value=st.current;return;}st.current=Number($('csFloor').value)||0;st.selected='0,0';renderFloorControls();renderGrid();renderEditor();queueSave()});
  $('csFloorName').addEventListener('change',()=>{if(!commitPendingCell())return;current().name=safe($('csFloorName').value,100)||'Unnamed floor';renderFloorControls();renderGrid();renderEditor();renderSummary();queueSave()});
  $('csAddFloor').addEventListener('click',()=>{
    if(!commitPendingCell())return;
    if(st.floors.length>=MAX_FLOORS){window.alert('Maximum 16 floors per survey.');return;}
    st.floors.push(floor('Floor '+(st.floors.length+1)));st.current=st.floors.length-1;st.selected='0,0';renderAll();queueSave();
  });
  $('csDeleteFloor').addEventListener('click',()=>{
    if(st.floors.length<=1)return;
    if(!commitPendingCell())return;
    if(!window.confirm('Delete this floor, floor-plan image and all its readings? Export project JSON first if needed.'))return;
    st.floors.splice(st.current,1);st.current=Math.min(st.current,st.floors.length-1);st.selected='0,0';renderAll();queueSave();
  });
  $('csApplyGrid').addEventListener('click',()=>{
    if(!commitPendingCell())return;
    const f=current(),rows=Number($('csRows').value),cols=Number($('csCols').value);
    if(!Number.isInteger(rows)||!Number.isInteger(cols)||rows<1||cols<1||rows>30||cols>30||rows*cols>MAX_CELLS){window.alert('Choose whole-number rows and columns from 1 to 30, up to 900 cells per floor.');return;}
    if(rows===f.rows&&cols===f.cols)return;
    if(Object.keys(f.cells).length&&!window.confirm('Change the grid? Existing readings at matching row/column positions will remain, but out-of-range readings will be deleted.'))return;
    const retained={};for(const [key,rec] of Object.entries(f.cells)){const {r,c}=decodeKey(key);if(r<rows&&c<cols)retained[key]=rec}
    f.rows=rows;f.cols=cols;f.cells=retained;st.selected='0,0';renderFloorControls();renderGrid();renderEditor();renderSummary();queueSave();
  });
  for(const [id,key] of [['csLeft','l'],['csTop','t'],['csRight','r'],['csBottom','b']]){
    $(id).addEventListener('change',()=>{
      const f=current(),next=clamp(finite($(id).value),0,80,0);
      f.inset[key]=next;
      if(f.inset.l+f.inset.r>90||f.inset.t+f.inset.b>90){window.alert('Grid margins cannot remove more than 90% of the plan width or height.');f.inset[key]=0;}
      renderFloorControls();renderGrid();queueSave();
    });
  }
  async function imageData(file){
    if(!/^image\/(png|jpeg|webp)$/.test(file.type)||file.size>15*1024*1024)throw Error('Choose a PNG, JPG or WebP image smaller than 15 MB. Convert PDF pages to an image first.');
    const url=URL.createObjectURL(file);
    try{
      const img=await new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=()=>reject(Error('The image could not be decoded.'));i.src=url;});
      const scale=Math.min(1,1800/Math.max(img.naturalWidth,img.naturalHeight));
      const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(img.naturalWidth*scale));canvas.height=Math.max(1,Math.round(img.naturalHeight*scale));
      const ctx=canvas.getContext('2d');if(!ctx)throw Error('Canvas image processing is unavailable.');
      ctx.fillStyle='#ffffff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,canvas.width,canvas.height);
      const out=canvas.toDataURL('image/jpeg',.83);
      if(out.length>4*1024*1024)throw Error('Floor plan is too detailed for embedded storage. Resize the image before import.');
      return out;
    }finally{URL.revokeObjectURL(url)}
  }
  $('csImage').addEventListener('change',async()=>{
    const file=$('csImage').files?.[0];if(!file)return;
    const targetId=current().id;
    try{
      $('csSaveState').textContent='Processing the floor plan locally…';
      const uri=await imageData(file),f=st.floors.find(x=>x.id===targetId);
      if(f){f.image=uri;renderGrid();queueSave();}
    }catch(e){window.alert('Floor plan import failed: '+e.message);}
    finally{$('csImage').value='';}
  });
  $('csClearImage').addEventListener('click',()=>{
    if(!current().image)return;
    if(!window.confirm('Remove the floor-plan image? Grid readings will be retained.'))return;
    current().image=null;renderGrid();queueSave();
  });
  function saveCell(){
    const f=current(),{r,c}=selectedCell(),zone=$('csZone').value;
    const rec={zone,notes:safe($('csCellNotes').value,800),technician:safe(st.technician,100),measuredAt:new Date().toISOString()};
    const freq=finite($('csCellFrequency').value);
    if(freq!==null&&(freq<30||freq>12000)){window.alert('Test frequency must be 30–12,000 MHz or blank.');return false;}
    rec.frequencyMHz=freq;rec.channel=safe($('csCellChannel').value,90);
    for(const key of metrics){
      const n=finite($(valueIds[key]).value);
      if(n!==null&&(n<spec[key][0]||n>spec[key][1])){window.alert(key+' must be between '+spec[key][0]+' and '+spec[key][1]+'.');return false;}
      rec[key]=n;
    }
    if(zone==='excluded'&&!rec.notes.trim()){window.alert('Enter a reason for excluding this cell from coverage.');return false;}
    f.cells[cellKey(r,c)]=rec;
    renderGrid();renderEditor();renderSummary();queueSave();return true;
  }
  $('csSaveCell').addEventListener('click',saveCell);
  $('csSaveNext').addEventListener('click',()=>{if(saveCell())$('csNext').click()});
  $('csClearCell').addEventListener('click',()=>{
    const {r,c}=selectedCell();delete current().cells[cellKey(r,c)];renderGrid();renderEditor();renderSummary();queueSave();
  });
  $('csNext').addEventListener('click',()=>{
    if(!commitPendingCell())return;
    const f=current(),{r,c}=selectedCell(),start=r*f.cols+c;
    for(let i=1;i<=f.rows*f.cols;i++){const n=(start+i)%(f.rows*f.cols),row=Math.floor(n/f.cols),col=n%f.cols,s=statusFor(savedCell(f,row,col),st);
      if(!['pass','fail','excluded'].includes(s)){st.selected=cellKey(row,col);renderGrid();renderEditor();queueSave();return;}
    }
    window.alert('Every square has a complete pass/fail result or an exclusion. Review failed readings and final criteria.');
  });
  $('csPrev').addEventListener('click',()=>{
    if(!commitPendingCell())return;
    const f=current(),{r,c}=selectedCell(),pos=(r*f.cols+c+f.rows*f.cols-1)%(f.rows*f.cols);
    st.selected=cellKey(Math.floor(pos/f.cols),pos%f.cols);renderGrid();renderEditor();queueSave();
  });
  btn.addEventListener('click',()=>{if(!commitPendingCell())return;renderAll();if(!dialog.open)dialog.showModal()});
  $('csClose').addEventListener('click',()=>{if(commitPendingCell())dialog.close()});
  dialog.addEventListener('click',e=>{if(e.target===dialog&&commitPendingCell())dialog.close()});
  function download(name,mime,data){
    const a=document.createElement('a'),url=URL.createObjectURL(new Blob([data],{type:mime}));
    a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1800);
  }
  const filename=()=>safe(st.site,55).replace(/[^A-Za-z0-9_-]+/g,'_')||'Coverage_Survey';
  const cellCSV=row=>row.map(v=>{
    let s=String(v??'');if(/^[\s]*[=+@-]/.test(s)&&!Number.isFinite(Number(s)))s="'"+s;
    return '"'+s.replace(/"/g,'""')+'"';
  }).join(',');
  function csvData(){
    const rows=[['Facility','Floor','Cell','Zone','Status','Frequency_MHz','Channel','DL_RSSI_dBm','DL_DAQ','UL_RSSI_dBm','UL_DAQ','Technician','Measured_at_UTC','Notes']];
    for(const f of st.floors)for(let r=0;r<f.rows;r++)for(let c=0;c<f.cols;c++){
      const rec=savedCell(f,r,c);rows.push([st.site,f.name,cellName(r,c),rec.zone,statusFor(rec,st),rec.frequencyMHz,rec.channel,rec.dlRssi,rec.dlDaq,rec.ulRssi,rec.ulDaq,rec.technician,rec.measuredAt,rec.notes]);
    }
    return rows.map(cellCSV).join('\r\n');
  }
  $('csExportCSV').addEventListener('click',()=>{if(!commitPendingCell())return;download('Batwing_Coverage_'+filename()+'.csv','text/csv;charset=utf-8',csvData());});
  $('csExportJSON').addEventListener('click',()=>{if(!commitPendingCell())return;download('Batwing_Coverage_'+filename()+'.json','application/json',JSON.stringify({...st,exportedAt:new Date().toISOString()},null,2));});
  function readProject(raw){
    if(!raw||raw.format!=='Batwing-Coverage-Survey'||!Array.isArray(raw.floors)||!raw.floors.length||raw.floors.length>MAX_FLOORS)throw Error('Not a compatible Batwing Coverage Survey JSON project.');
    const output=fresh();
    for(const key of ['site','address','ahj','criteriaRef','technician','equipment','radio','channel','date'])output[key]=safe(raw[key]??'',key==='address'?220:180);
    for(const key of metrics){output.required[key]=Boolean(raw.required?.[key]);const n=finite(raw.thresholds?.[key]);output.thresholds[key]=n!==null&&n>=spec[key][0]&&n<=spec[key][1]?n:null;}
    for(const key of ['generalPercent','criticalPercent']){const n=finite(raw.thresholds?.[key]);output.thresholds[key]=n!==null&&n>=0&&n<=100?n:null;}
    output.floors=raw.floors.map((f,i)=>{
      const rows=Number(f.rows),cols=Number(f.cols);
      if(!Number.isInteger(rows)||!Number.isInteger(cols)||rows<1||cols<1||rows>30||cols>30||rows*cols>MAX_CELLS)throw Error('Invalid grid dimensions on floor '+(i+1)+'.');
      const result=floor(safe(f.name,100)||'Floor '+(i+1),rows,cols);
      result.image=typeof f.image==='string'&&/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(f.image)&&f.image.length<4*1024*1024?f.image:null;
      for(const k of ['l','t','r','b'])result.inset[k]=clamp(f.inset?.[k],0,80,0);
      if(result.inset.l+result.inset.r>90||result.inset.t+result.inset.b>90)result.inset={l:0,t:0,r:0,b:0};
      for(const [key,v] of Object.entries(f.cells||{})){
        if(!/^\d{1,2},\d{1,2}$/.test(key)||!v||typeof v!=='object')continue;
        const {r,c}=decodeKey(key);if(r>=rows||c>=cols)continue;
        const rec={zone:['general','critical','excluded'].includes(v.zone)?v.zone:'general',notes:safe(v.notes,800),channel:safe(v.channel,90),frequencyMHz:(()=>{const n=finite(v.frequencyMHz);return n!==null&&n>=30&&n<=12000?n:null})(),technician:safe(v.technician,100),measuredAt:typeof v.measuredAt==='string'&&Number.isFinite(Date.parse(v.measuredAt))?v.measuredAt:''};
        for(const k of metrics){const n=finite(v[k]);rec[k]=n!==null&&n>=spec[k][0]&&n<=spec[k][1]?n:null;}
        result.cells[key]=rec;
      }
      return result;
    });
    output.current=0;output.selected='0,0';return output;
  }
  $('csImportJSON').addEventListener('click',()=>$('csProjectFile').click());
  $('csProjectFile').addEventListener('change',async()=>{
    if(!commitPendingCell()){$('csProjectFile').value='';return;}
    const file=$('csProjectFile').files?.[0];if(!file)return;
    try{
      if(file.size>35*1024*1024)throw Error('Project JSON exceeds 35 MB.');
      const imported=readProject(JSON.parse(await file.text()));
      if(!window.confirm('Load survey "'+imported.site+'"? It will replace the current browser survey. Export your current JSON first if needed.'))return;
      st=imported;renderAll();queueSave();
    }catch(e){window.alert('Project import failed: '+e.message);}
    finally{$('csProjectFile').value='';}
  });
  function reportMap(f){
    const {l,t,r,b}=f.inset,blocks=[];
    for(let row=0;row<f.rows;row++)for(let col=0;col<f.cols;col++){
      const rec=savedCell(f,row,col),state=statusFor(rec,st);
      const bg={pass:'#61ce9aa6',fail:'#fa8282a6',partial:'#f3c970a6',unconfigured:'#f3c970a6',untested:'#d3dfe3a8',excluded:'#a2aeb7b8'}[state]||'#d3dfe3a8';
      const left=l+col*(100-l-r)/f.cols,top=t+row*(100-t-b)/f.rows;
      blocks.push('<div title="'+esc(cellName(row,col)+' '+state)+'" style="position:absolute;left:'+left+'%;top:'+top+'%;width:'+((100-l-r)/f.cols)+'%;height:'+((100-t-b)/f.rows)+'%;border:1px solid #59717d88;box-sizing:border-box;background:'+bg+';display:flex;justify-content:center;align-items:center;font-size:clamp(6px,.9vw,13px);font-weight:800">'+esc(cellName(row,col))+'</div>');
    }
    const paper=f.image?'<img alt="Floor plan" style="width:100%;height:auto;display:block" src="'+f.image+'">':'<div style="aspect-ratio:1.5;background:#eef4f6"></div>';
    return '<div style="position:relative;width:100%;border:1px solid #bdcbd2">'+paper+blocks.join('')+'</div>';
  }
  function reportHtml(){
    const s=summarize(st),fmt=x=>x===null?'N/A':x.toFixed(1)+'%',metadata=[
      ['Facility',st.site],['Address',st.address],['AHJ',st.ahj],['Acceptance criteria / revision',st.criteriaRef],
      ['Technician',st.technician],['Date',st.date],['Instrument',st.equipment],['Radio',st.radio],['Frequency / channels',st.channel]];
    const rules=metrics.filter(k=>st.required[k]).map(k=>esc(k)+' ≥ '+esc(st.thresholds[k]??'NOT CONFIGURED')).join(' · ')||'NONE CONFIGURED';
    const metadataHtml=metadata.map(([k,v])=>'<tr><th>'+esc(k)+'</th><td>'+esc(v||'Not entered')+'</td></tr>').join('');
    let floors='';
    for(const f of st.floors){
      const sum=statsFor(f,st),rows=[];
      for(let r=0;r<f.rows;r++)for(let c=0;c<f.cols;c++){
        const x=savedCell(f,r,c),s=statusFor(x,st);
        rows.push('<tr><td>'+esc(cellName(r,c))+'</td><td>'+esc(x.zone)+'</td><td>'+esc(s.toUpperCase())+'</td><td>'+esc(x.frequencyMHz??'')+'</td><td>'+esc(x.channel||'')+'</td>'+
         [x.dlRssi,x.dlDaq,x.ulRssi,x.ulDaq].map(v=>'<td>'+esc(v??'')+'</td>').join('')+
         '<td>'+esc(x.technician||'')+'</td><td>'+esc(x.measuredAt||'')+'</td><td>'+esc(x.notes||'')+'</td></tr>');
      }
      floors+='<section class="floor"><h2>'+esc(f.name)+'</h2><p>Grid '+f.rows+' × '+f.cols+
       ' · General '+fmt(sum.general.rate)+' ('+sum.general.pass+'/'+sum.general.total+')'+
       ' · Critical '+fmt(sum.critical.rate)+' ('+sum.critical.pass+'/'+sum.critical.total+')'+
       ' · Failed '+sum.fail+' · Untested/partial '+sum.pending+' · Excluded '+sum.excluded+'</p>'+
       reportMap(f)+'<h3>Detailed readings</h3><table><thead><tr><th>Cell</th><th>Zone</th><th>Status</th><th>MHz</th><th>Channel</th><th>DL dBm</th><th>DL DAQ</th><th>UL dBm</th><th>UL DAQ</th><th>Tech</th><th>Recorded UTC</th><th>Notes</th></tr></thead><tbody>'+rows.join('')+'</tbody></table></section>';
    }
    return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Batwing Coverage Report — '+esc(st.site)+'</title><style>'+
    'body{font:13px Arial,sans-serif;color:#173748;margin:24px;line-height:1.45}h1{color:#0f4962;margin:0 0 8px}h2{margin:15px 0 8px;color:#18566b}h3{margin:16px 0 7px}p{margin:7px 0}table{width:100%;border-collapse:collapse;margin:9px 0 14px}th,td{border:1px solid #cbdde3;padding:5px;text-align:left;vertical-align:top;overflow-wrap:anywhere}th{background:#edf5f7}.meta{max-width:1000px}.meta th{width:240px}.verdict{font-weight:800;font-size:15px;padding:12px;border:1px solid #d6e4e9;background:#f1f8fa;margin:12px 0}.floor{break-before:page}.floor>div{max-width:1050px}.floor table{font-size:10px}footer{margin-top:20px;font-size:11px;color:#526f7e}@page{size:landscape;margin:12mm}@media print{body{margin:0}.floor{break-before:page}table{break-inside:auto}tr{break-inside:avoid}}</style></head><body>'+
    '<h1>🦇 Batwing RF Coverage Survey — Field Report</h1><p>Generated '+esc(new Date().toLocaleString())+' · Batwing v1.14</p>'+
    '<table class="meta">'+metadataHtml+'</table><div class="verdict">'+esc(s.verdict)+
    ' · General '+fmt(s.sum.general.rate)+' ('+s.sum.general.pass+'/'+s.sum.general.total+')'+
    ' · Critical '+fmt(s.sum.critical.rate)+' ('+s.sum.critical.pass+'/'+s.sum.critical.total+')'+
    ' · Pending '+s.sum.pending+' · Excluded '+s.sum.excluded+'</div>'+
    '<p><strong>Required metrics:</strong> '+rules+'</p><p><strong>Configured coverage thresholds:</strong> General '+esc(st.thresholds.generalPercent??'NOT CONFIGURED')+'% · Critical '+esc(st.thresholds.criticalPercent??'NOT CONFIGURED')+'%.</p>'+
    '<p><strong>IMPORTANT:</strong> This report is a configurable field-engineering survey record, not an AHJ approval or proof of code compliance. All included grid cells count toward the denominator; untested cells never pass. Equal-sized rectangles do not prove compliance with actual floor-area sampling. Confirm adopted code, actual measured signal, required methods, frequencies, instrument calibration, critical spaces and test locations with the AHJ.</p>'+
    floors+'<footer>Batwing RF Suite · Locally generated report · Customer data is not transmitted by this tool</footer></body></html>';
  }
  $('csReportHTML').addEventListener('click',()=>{if(!commitPendingCell())return;download('Batwing_Coverage_Report_'+filename()+'.html','text/html;charset=utf-8',reportHtml());});
  $('csPrint').addEventListener('click',()=>{
    if(!commitPendingCell())return;
    const tab=window.open('','_blank');
    if(!tab){window.alert('Your browser blocked the report tab. Download the HTML report and use Print → Save as PDF.');return;}
    tab.document.open();tab.document.write(reportHtml());tab.document.close();tab.focus();
    let printed=false;const launch=()=>{if(printed||tab.closed)return;printed=true;try{tab.focus();tab.print()}catch(e){}};
    tab.addEventListener('load',launch,{once:true});
    setTimeout(launch,900);
  });
  $('csReset').addEventListener('click',()=>{
    if(!commitPendingCell())return;
    if(!window.confirm('Start a completely new survey? This replaces the local current survey. Export your JSON first if needed.'))return;
    st=fresh();renderAll();queueSave();
  });
  window.BatwingCoverage=Object.freeze({version:'v1.14',statusFor,statsFor,summarize,commitPending:commitPendingCell,hasUnsavedEdits:()=>dirtyCell,read:()=>JSON.parse(JSON.stringify(st))});
  window.addEventListener('beforeunload',event=>{if(dirtyCell){event.preventDefault();event.returnValue='';}});
  (async()=>{
    try{db=await dbOpen();const old=await dbGet();if(old)st=readProject(old);}
    catch(e){dbFailed=true;}
    loadResolved=true;renderAll();
    $('csSaveState').textContent=dbFailed?'Local autosave unavailable; download JSON backups frequently.':'Offline local autosave ready. Images and readings stay on this device.';
  })();
})();