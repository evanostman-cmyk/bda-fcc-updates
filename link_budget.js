/* BDA Channel Planner v1.7 — RF Link Budget / Power Chain
 * Local, offline-first: calculate cascade power and prospective EIRP at every stage.
 * Conducted power is not actual EIRP until an antenna (gain in dBi) is connected.
 */
(() => {
  'use strict';
  const OPEN_ID='linkBudgetTop';
  if(document.getElementById(OPEN_ID))return;
  const KEY='BDA_LINK_BUDGET_v1.6';
  const MAX_ROWS=250;
  const id=x=>document.getElementById(x);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const number=(v, fallback=0)=>Number.isFinite(Number(v))&&String(v).trim()!==''?Number(v):fallback;
  const rounded=(n,d=2)=>Number.isFinite(n)?n.toFixed(d):'—';
  const formatDbm=n=>`${rounded(n)} dBm`;
  const formatDbw=n=>`${rounded(n-30)} dBW`;
  const fmtW=n=>{if(!Number.isFinite(n))return '—';if(n===0)return '0 W';if(n<0.000001)return `${(n*1e9).toPrecision(3)} nW`;if(n<0.001)return `${(n*1e6).toPrecision(4)} µW`;if(n<1)return `${(n*1000).toPrecision(4)} mW`;if(n<100000)return `${n.toPrecision(5)} W`;return `${n.toExponential(3)} W`};
  const dBmToW=dbm=>Math.pow(10,(dbm-30)/10);
  // Display watts explicitly (rather than switching to mW/µW). Use adaptive
  // precision for small and large powers, and avoid rounding nonzero W to zero.
  const formatWattDbm=dbm=>{
    const watts=dBmToW(dbm);
    if(!Number.isFinite(watts))return '—';
    if(watts===0)return '0 W';
    if(watts>=0.0001 && watts<1000000){
      return `${Number(watts.toPrecision(7)).toLocaleString('en-US',{maximumFractionDigits:9})} W`;
    }
    return `${watts.toExponential(4)} W`;
  };
  const wattsToDbm=w=>10*Math.log10(w)+30;
  const dbmFromDisplay=(value,unit)=>unit==='dBW'?value+30:unit==='W'?wattsToDbm(value):value;
  const displayFromDbm=(dbm,unit)=>unit==='dBW'?dbm-30:unit==='W'?dBmToW(dbm):dbm;
  const compactVal=(n,unit)=>unit==='W'?Number(n.toPrecision(7)).toString():rounded(n,4);
  const defaultState=()=>({sourceDbm:30,sourceUnit:'dBm',antennaGain:0,antennaUnit:'dBi',steps:[],checkpoint:'final'});
  let serial=0;
  function newStep(type='loss',name='',db=0){return {id:`s${Date.now().toString(36)}_${++serial}`,type,name,db};}
  function scrub(raw){
    const d=defaultState();if(!raw||typeof raw!=='object')return d;
    if(Number.isFinite(Number(raw.sourceDbm))&&Number(raw.sourceDbm)>=-200&&Number(raw.sourceDbm)<=200)d.sourceDbm=Number(raw.sourceDbm);
    if(['dBm','dBW','W'].includes(raw.sourceUnit))d.sourceUnit=raw.sourceUnit;
    if(Number.isFinite(Number(raw.antennaGain))&&Math.abs(Number(raw.antennaGain))<=100)d.antennaGain=Number(raw.antennaGain);
    if(['dBi','dBd'].includes(raw.antennaUnit))d.antennaUnit=raw.antennaUnit;
    if(Array.isArray(raw.steps))d.steps=raw.steps.slice(0,MAX_ROWS).filter(x=>x&&typeof x==='object').map(x=>newStep(x.type==='gain'?'gain':'loss',String(x.name||'').slice(0,90),Math.min(Math.abs(number(x.db,0)),200)));
    // Checkpoint IDs are ephemeral, so imported budgets default to the final point.
    return d;
  }
  let st=defaultState();
  try{st=scrub(JSON.parse(localStorage.getItem(KEY)||'null'))}catch(_){st=defaultState()}
  function effectiveAntenna(){return st.antennaGain+(st.antennaUnit==='dBd'?2.15:0)}
  function calculate(raw=st){
    const anten=Number(raw.antennaGain)+(raw.antennaUnit==='dBd'?2.15:0);
    let p=Number(raw.sourceDbm),gains=0,losses=0;
    const rows=[{id:'source',name:'TX output / source',type:'source',db:0,delta:0,conductedDbm:p,ifAntennaDbm:p+anten}];
    for(const x of raw.steps){
      const db=Math.abs(Number(x.db)||0),delta=x.type==='gain'?db:-db;
      if(x.type==='gain')gains+=db;else losses+=db;
      p+=delta;
      rows.push({id:x.id,name:x.name||((x.type==='gain')?'Gain component':'Loss component'),type:x.type,db,delta,conductedDbm:p,ifAntennaDbm:p+anten});
    }
    return {rows,gains,losses,net:gains-losses,finalConductedDbm:p,finalEirpDbm:p+anten,antennaDbi:anten};
  }
  function save(){try{localStorage.setItem(KEY,JSON.stringify(st));id('lbStored').textContent='Saved in this browser';}catch(_){id('lbStored').textContent='Browser storage unavailable — export JSON to keep this budget';}}
  const style=document.createElement('style');
  style.textContent=`
    .lb-top-btn{border-color:#d0af63!important;background:#304958!important;color:#ffecb2!important}
    .lb-top-btn:hover{background:#3d5d70!important}
    dialog#linkBudgetDialog{width:min(1340px,calc(100vw - 22px));max-height:95vh;overflow:hidden;border-radius:18px;color:#173145}
    #linkBudgetDialog .lb-head{padding:16px 22px;background:#edf6fa;display:flex;align-items:center;justify-content:space-between;gap:16px;border-bottom:1px solid #cfdee5}
    #linkBudgetDialog .lb-head h2{font-size:1.38rem;line-height:1.2;margin:0;color:#123f54}
    #linkBudgetDialog .lb-head p{font-size:.79rem;margin:5px 0 0;color:#597684;max-width:750px}
    #linkBudgetDialog .lb-head-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
    #linkBudgetDialog .lb-scroll{overflow:auto;max-height:calc(95vh - 133px);padding:18px 22px 22px}
    #linkBudgetDialog .lb-inputs{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-bottom:14px}
    #linkBudgetDialog .lb-card{background:#fff;border:1px solid #cbdde5;border-radius:12px;padding:14px}
    #linkBudgetDialog .lb-card h3{font-size:.92rem;margin:0 0 10px;color:#244f63}
    #linkBudgetDialog .lb-two{display:grid;grid-template-columns: minmax(0,1fr) minmax(110px,.48fr);gap:8px}
    #linkBudgetDialog label{display:block;font-size:.78rem;font-weight:700;color:#3d5968;margin-bottom:5px}
    #linkBudgetDialog input:not([type=file]),#linkBudgetDialog select{width:100%;min-height:38px;border:1px solid #b8ccd6;border-radius:8px;background:#fff;padding:8px 10px;color:#173749;font-size:.9rem;min-width:0}
    #linkBudgetDialog input:focus,#linkBudgetDialog select:focus{outline:2px solid #77bec9;outline-offset:1px}
    #linkBudgetDialog .lb-help{font-size:.75rem;color:#627c88;line-height:1.45;margin:8px 0 0}
    #linkBudgetDialog .lb-muted{color:#657d88;font-size:.77rem}
    #linkBudgetDialog .lb-mini{font-size:.73rem;color:#4c7180}
    #linkBudgetDialog .lb-section-heading{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin:12px 0 9px}
    #linkBudgetDialog .lb-section-heading h3{font-size:1rem;margin:0}
    #linkBudgetDialog .lb-action-group{display:flex;gap:6px;flex-wrap:wrap}
    #linkBudgetDialog .lb-preset{background:#f5fbfd;border:1px solid #bfd4dc;color:#315a6c;border-radius:8px;padding:7px 10px;font-size:.79rem;font-weight:650;cursor:pointer}
    #linkBudgetDialog .lb-preset:hover{background:#e7f4f8}
    #linkBudgetDialog .lb-preset.lb-add{background:#137d87;color:white;border-color:#137d87}
    #linkBudgetDialog .lb-table-scroll{width:100%;overflow-x:auto;border:1px solid #cbdde4;border-radius:10px;background:white}
    #linkBudgetDialog .lb-parts-table{width:100%;border-collapse:collapse;font-size:.82rem;table-layout:auto;min-width:600px}
    #linkBudgetDialog .lb-parts-table th{font-size:.74rem;color:#496574;background:#edf5f7;padding:10px;text-align:left}
    #linkBudgetDialog .lb-parts-table td{padding:7px 8px;border-top:1px solid #e4ecef;vertical-align:middle}
    #linkBudgetDialog .lb-parts-table th:nth-child(1){width:41px}
    #linkBudgetDialog .lb-parts-table th:nth-child(3){width:140px}
    #linkBudgetDialog .lb-parts-table th:nth-child(4){width:130px}
    #linkBudgetDialog .lb-parts-table th:nth-child(5){width:122px}
    #linkBudgetDialog .lb-parts-table input.lb-name{min-width:175px}
    #linkBudgetDialog .lb-parts-table .lb-small-btn{background:#fff;border:1px solid #c7d9df;padding:6px 8px;border-radius:7px;font-weight:800;color:#325a6b;cursor:pointer}
    #linkBudgetDialog .lb-parts-table .lb-small-btn:hover{background:#e4f1f5}
    #linkBudgetDialog .lb-parts-table .lb-tools{white-space:nowrap}
    #linkBudgetDialog .lb-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px;margin:13px 0 10px}
    #linkBudgetDialog .lb-metric{background:#f0f7f9;border:1px solid #cadee5;border-radius:11px;padding:12px;min-width:0}
    #linkBudgetDialog .lb-metric.emphasis{background:#eaf8f1;border-color:#a7d4bd}
    #linkBudgetDialog .lb-metric .k{font-size:.68rem;text-transform:uppercase;letter-spacing:.035em;color:#4b6877;font-weight:800}
    #linkBudgetDialog .lb-metric .v{font-size:1.3rem;line-height:1.23;color:#13465c;font-weight:850;margin-top:4px;white-space:nowrap}
    #linkBudgetDialog .lb-metric.emphasis .v{color:#137051}
    #linkBudgetDialog .lb-metric .s{font-size:.77rem;color:#476975;margin-top:4px}
    #linkBudgetDialog .lb-checkpoint{background:#fffaf0;border:1px solid #e7ce91;border-radius:11px;padding:13px 15px;display:grid;grid-template-columns:1.4fr repeat(2,minmax(0,1fr));gap:8px;align-items:center;margin:10px 0 13px}
    #linkBudgetDialog .lb-checkpoint strong{color:#78581d}
    #linkBudgetDialog .lb-checkpoint .num{font-size:1.11rem;font-weight:850;color:#63491a}
    #linkBudgetDialog .lb-checkpoint .lb-watts{font-size:.88rem;font-weight:800;color:#72531c;margin-top:3px}
    #linkBudgetDialog .lb-checkpoint small{display:block;color:#947b47;font-weight:700;text-transform:uppercase;font-size:.68rem}
    #linkBudgetDialog .lb-results{margin-top:12px}
    #linkBudgetDialog .lb-chart{background:#fff;border:1px solid #cfdfe6;border-radius:12px;padding:12px;overflow-x:auto}
    #linkBudgetDialog .lb-chart svg{display:block;min-width:540px;width:100%;height:auto;max-height:245px}
    #linkBudgetDialog .lb-legend{display:flex;flex-wrap:wrap;gap:13px;font-size:.75rem;color:#567383;margin-top:8px}
    #linkBudgetDialog .lb-legend span:before{content:'';display:inline-block;width:15px;height:3px;vertical-align:middle;margin-right:5px;background:#1a8294}
    #linkBudgetDialog .lb-legend span.gold:before{background:#d9a02d}
    #linkBudgetDialog .lb-results-table{width:100%;border-collapse:collapse;min-width:1140px;font-size:.8rem}
    #linkBudgetDialog .lb-results-table th{position:sticky;top:0;background:#e9f3f6;text-align:left;font-size:.72rem;padding:9px 9px;color:#375767}
    #linkBudgetDialog .lb-results-table td{border-top:1px solid #e4ecef;padding:9px;color:#244b5b}
    #linkBudgetDialog .lb-results-table tbody tr:hover{background:#f4fafb}
    #linkBudgetDialog .lb-results-table tr.lb-selected{background:#fff4d8}
    #linkBudgetDialog .lb-results-table tr.lb-final{background:#eaf8ef;font-weight:800}
    #linkBudgetDialog .lb-results-table button{padding:6px 8px;border-radius:7px;background:#fff;border:1px solid #c2d5dd;font-size:.73rem;color:#275769;font-weight:750;cursor:pointer}
    #linkBudgetDialog .lb-results-table tr.lb-selected button{background:#ffe19b}
    #linkBudgetDialog .lb-results-table td.lb-power{white-space:nowrap;font-variant-numeric:tabular-nums;font-weight:700}
    #linkBudgetDialog .lb-results-table small{display:block;font-size:.70rem;font-weight:450;color:#758995}
    #linkBudgetDialog .lb-footer{padding:10px 22px;background:#f7fbfc;border-top:1px solid #dce8eb;display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap}
    #linkBudgetDialog .lb-disclaimer{background:#fffaf0;border:1px solid #e8d6b2;border-radius:9px;padding:10px 13px;margin-top:12px;font-size:.76rem;color:#65563d;line-height:1.55}
    #linkBudgetDialog .lb-error{color:#9f392e!important}
    #linkBudgetDialog .lb-empty{text-align:center;padding:20px;background:#f6f9fa;color:#69808b;font-size:.82rem}
    #linkBudgetDialog .lb-section-label{font-size:.82rem;margin:13px 0 7px;color:#436374;font-weight:750}
    #linkBudgetDialog .lb-alert{margin:10px 0;color:#9b5d18;background:#fff4dd;border:1px solid #eed6a5;border-radius:8px;padding:8px 12px;font-size:.79rem}
    @media(max-width:860px){#linkBudgetDialog .lb-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}#linkBudgetDialog .lb-checkpoint{grid-template-columns:1fr 1fr}#linkBudgetDialog .lb-checkpoint>div:first-child{grid-column:1/-1}}
    @media(max-width:650px){dialog#linkBudgetDialog{width:calc(100vw - 10px);max-height:98vh;border-radius:10px}#linkBudgetDialog .lb-head,#linkBudgetDialog .lb-scroll,#linkBudgetDialog .lb-footer{padding:12px}#linkBudgetDialog .lb-inputs{grid-template-columns:1fr}#linkBudgetDialog .lb-metric .v{font-size:1.12rem}#linkBudgetDialog .lb-head h2{font-size:1.18rem}}
    @media print{#linkBudgetDialog{display:none!important}}
  `;
  document.head.appendChild(style);

  const openBtn=document.createElement('button');openBtn.type='button';openBtn.className='btn lb-top-btn';openBtn.id=OPEN_ID;openBtn.textContent='⚡ Link Budget';openBtn.title='RF power-chain gains, losses, conducted power and EIRP at any point';
  const siteBtn=id('fccOpenTop');if(siteBtn)siteBtn.insertAdjacentElement('afterend',openBtn);else document.querySelector('.top-actions')?.appendChild(openBtn);
  // Optional switching between the P25 Site Finder and the power chain from either dialog.
  const fccHeader=document.querySelector('#fccDialog .fcc-header-actions');
  if(fccHeader){const b=document.createElement('button');b.type='button';b.id='lbFromFCC';b.className='btn sm';b.textContent='⚡ Link Budget';b.style.fontSize='.8rem';fccHeader.prepend(b);b.addEventListener('click',()=>{id('fccDialog')?.close?.();open();});}

  const dialog=document.createElement('dialog');dialog.id='linkBudgetDialog';dialog.setAttribute('aria-labelledby','lbTitle');
  dialog.innerHTML=`
    <div class="lb-head"><div><h2 id="lbTitle">⚡ RF Link Budget <span style="font-size:.60em;color:#6b8793">v1.7</span></h2><p>Build a cascaded TX power chain with unlimited editable components (up to 250). Every stage shows conducted power and the EIRP <em>if your reference antenna were connected there</em>.</p></div><div class="lb-head-actions"><button type="button" class="btn sm" id="lbToFCC">⌕ P25 Site Finder</button><button type="button" class="btn sm" id="lbClose" aria-label="Close Link Budget">✕</button></div></div>
    <div class="lb-scroll">
      <div class="lb-inputs">
        <section class="lb-card"><h3>1 · Transmitter / source power</h3><div class="lb-two"><div><label for="lbTxPower">TX output power</label><input id="lbTxPower" type="number" step="any" inputmode="decimal"/></div><div><label for="lbTxUnit">Input unit</label><select id="lbTxUnit"><option value="dBm">dBm</option><option value="dBW">dBW</option><option value="W">Watts (W)</option></select></div></div><p class="lb-help">Enter the known <strong>conducted power</strong> at the chain input. The initial 30 dBm (1 W) is a <strong>placeholder, not measured site data</strong>. Use per-channel power when budgeting one channel.</p><div class="lb-mini" id="lbTxConvert"></div></section>
        <section class="lb-card"><h3>2 · Reference antenna gain</h3><div class="lb-two"><div><label for="lbAntGain">Antenna gain (may be negative)</label><input id="lbAntGain" type="number" step="any" inputmode="decimal"/></div><div><label for="lbAntUnit">Antenna unit</label><select id="lbAntUnit"><option value="dBi">dBi</option><option value="dBd">dBd</option></select></div></div><p class="lb-help">Used to calculate <strong>EIRP at each checkpoint</strong> if this antenna were attached at that point. The initial 0 dBi is a placeholder; antenna gain in dBd is converted to dBi by adding 2.15 dB.</p><div class="lb-mini" id="lbAntConvert"></div></section>
      </div>
      <div class="lb-section-heading"><h3>3 · Add gains and losses in signal-path order</h3><div class="lb-action-group"><button type="button" class="lb-preset lb-add" data-lb-add="gain">+ Gain</button><button type="button" class="lb-preset lb-add" data-lb-add="loss">− Loss</button><button type="button" class="lb-preset" data-lb-preset="cable">Coax</button><button type="button" class="lb-preset" data-lb-preset="connector">Connector</button><button type="button" class="lb-preset" data-lb-preset="coupler">Coupler</button><button type="button" class="lb-preset" data-lb-preset="splitter">Splitter</button><button type="button" class="lb-preset" data-lb-preset="amp">Amplifier</button></div></div>
      <p class="lb-mini" style="margin:0 0 8px">Preset components begin at 0 dB, not a manufacturer-specified value. Enter your measured or specified loss/gain for each component.</p>
      <div class="lb-table-scroll"><table class="lb-parts-table"><thead><tr><th>#</th><th>Component / description</th><th>Type</th><th>dB magnitude</th><th>Move / copy / remove</th></tr></thead><tbody id="lbComponents"></tbody></table><div class="lb-empty" id="lbEmpty">No losses or gains added yet. Add an amplifier, cable, splitter, coupler, or another component to start your signal chain.</div></div>
      <div class="lb-metrics" aria-live="polite"><div class="lb-metric"><div class="k">Total gain / loss</div><div class="v" id="lbNet">+0.00 dB</div><div class="s" id="lbTotals">Gain 0.00 dB · Loss 0.00 dB</div></div><div class="lb-metric"><div class="k">Output conducted power</div><div class="v" id="lbOutputDbm">30.00 dBm</div><div class="s" id="lbOutputDbw">0.00 dBW</div></div><div class="lb-metric emphasis"><div class="k">Final EIRP at reference antenna</div><div class="v" id="lbEirpDbm">30.00 dBm</div><div class="s" id="lbEirpDbw">0.00 dBW</div></div><div class="lb-metric"><div class="k">Equivalent final watts</div><div class="v" id="lbWatts">1 W</div><div class="s" id="lbEirpWatts">Radiated EIRP: 1 W</div></div></div>
      <div id="lbCheckpoint" class="lb-checkpoint" aria-live="polite"></div>
      <div class="lb-section-heading"><h3>Power along the chain</h3><span class="lb-muted">Blue = conducted power · Gold = EIRP if reference antenna connected here</span></div>
      <div class="lb-chart" id="lbChart" aria-label="Conducted power and prospective EIRP chart"></div>
      <div class="lb-section-heading"><h3>4 · Inspect EIRP at any point</h3><span class="lb-muted">Choose a checkpoint to pin its power and potential EIRP above</span></div>
      <div class="lb-table-scroll"><table class="lb-results-table"><thead><tr><th>Checkpoint</th><th>Stage</th><th>Gain / loss</th><th>Conducted dBm</th><th>Conducted dBW</th><th>Conducted W</th><th>EIRP dBm</th><th>EIRP dBW</th><th>EIRP W</th></tr></thead><tbody id="lbResults"></tbody></table></div>
      <div class="lb-disclaimer"><strong>RF engineering distinction:</strong> Conducted power is measured inside the cable/equipment. The EIRP values in each intermediate row are <em>hypothetical</em>—the calculated EIRP <em>if the specified antenna were connected at that point</em>. The final green antenna row is the estimated EIRP for the complete chain. Antenna pattern, mismatch, per-channel vs aggregate power, hardware ratings, intermodulation, and field measurements are not modeled. All component inputs are <strong>dB</strong>; power results are <strong>dBm / dBW / watts (W)</strong>.</div>
      <div id="lbWarning" class="lb-alert" hidden></div>
    </div>
    <div class="lb-footer"><div class="lb-action-group"><button type="button" class="btn sm" id="lbExportCSV">⬇ CSV</button><button type="button" class="btn sm" id="lbExportJSON">⬇ Save budget JSON</button><button type="button" class="btn sm" id="lbImportJSON">⬆ Load budget JSON</button><input type="file" hidden id="lbFile" accept=".json,application/json"/></div><div class="lb-action-group"><span class="lb-muted" id="lbStored">Stored locally</span><button type="button" class="btn sm" id="lbExample">Load example</button><button type="button" class="btn sm" id="lbReset">Clear</button></div></div>
  `;
  document.body.appendChild(dialog);
  const show=()=>{if(typeof dialog.showModal==='function'){if(!dialog.open)dialog.showModal()}else dialog.setAttribute('open','');};
  const close=()=>{if(dialog.close)dialog.close();else dialog.removeAttribute('open')};
  function open(){renderAll();show()}
  openBtn.addEventListener('click',open);
  id('lbClose').addEventListener('click',close);
  id('lbToFCC').addEventListener('click',()=>{close();const fcc=id('fccDialog');if(fcc){if(typeof fcc.showModal==='function')fcc.showModal();else fcc.setAttribute('open','');}});
  dialog.addEventListener('click',e=>{if(e.target===dialog)close()});

  function renderTop(){
    const current=displayFromDbm(st.sourceDbm,st.sourceUnit);
    id('lbTxPower').value=compactVal(current,st.sourceUnit);
    id('lbTxUnit').value=st.sourceUnit;
    id('lbAntGain').value=String(st.antennaGain);
    id('lbAntUnit').value=st.antennaUnit;
    id('lbTxConvert').textContent=`Equivalent: ${formatDbm(st.sourceDbm)} · ${formatDbw(st.sourceDbm)} · ${fmtW(dBmToW(st.sourceDbm))}`;
    id('lbAntConvert').textContent=`Effective gain used in EIRP: ${rounded(effectiveAntenna())} dBi`;
  }
  function add(type,name='',db=0){if(st.steps.length>=MAX_ROWS){window.alert('This budget already has the maximum of 250 components.');return}st.steps.push(newStep(type,name,db));renderComponents();renderCalc();save()}
  const presets={cable:['loss','Coaxial feedline loss',0],connector:['loss','Connector / adapter loss',0],coupler:['loss','Directional coupler insertion / tap loss',0],splitter:['loss','Splitter / distribution loss',0],amp:['gain','Amplifier gain',0]};
  dialog.addEventListener('click',e=>{const addBtn=e.target.closest('[data-lb-add]');if(addBtn){add(addBtn.dataset.lbAdd);return}const p=e.target.closest('[data-lb-preset]');if(p){const v=presets[p.dataset.lbPreset];if(v)add(...v);return}});
  function renderComponents(){
    const body=id('lbComponents');body.innerHTML=st.steps.map((x,i)=>`<tr data-id="${esc(x.id)}"><td>${i+1}</td><td><input class="lb-name" type="text" maxlength="90" data-field="name" value="${esc(x.name)}" aria-label="Component ${i+1} name" placeholder="e.g. LDF4-50A cable"/></td><td><select data-field="type" aria-label="Component ${i+1} type"><option value="loss" ${x.type==='loss'?'selected':''}>− Loss</option><option value="gain" ${x.type==='gain'?'selected':''}>+ Gain</option></select></td><td><input type="number" data-field="db" step="any" min="0" max="200" inputmode="decimal" value="${esc(x.db)}" aria-label="Component ${i+1} dB magnitude"/></td><td class="lb-tools"><button class="lb-small-btn" type="button" data-op="up" title="Move up" ${i===0?'disabled':''}>↑</button><button class="lb-small-btn" type="button" data-op="down" title="Move down" ${i===st.steps.length-1?'disabled':''}>↓</button><button class="lb-small-btn" type="button" data-op="copy" title="Duplicate component">⧉</button><button class="lb-small-btn" type="button" data-op="delete" title="Delete component">×</button></td></tr>`).join('');
    id('lbEmpty').hidden=st.steps.length>0;
  }
  const comp=id('lbComponents');
  function getPart(el){return st.steps.find(x=>x.id===el.closest('tr')?.dataset.id)}
  comp.addEventListener('input',e=>{
    const input=e.target;if(!input?.dataset?.field)return;
    const x=getPart(input);if(!x)return;
    if(input.dataset.field==='name')x.name=input.value.slice(0,90);
    if(input.dataset.field==='db'){const v=Number(input.value);if(!Number.isFinite(v)||v<0||v>200||input.value===''){input.setCustomValidity('Enter a number from 0 to 200 dB');return}input.setCustomValidity('');x.db=v;}
    if(input.dataset.field==='type')x.type=input.value==='gain'?'gain':'loss';
    renderCalc();save();
  });
  comp.addEventListener('change',e=>{if(e.target?.dataset?.field==='type'){const x=getPart(e.target);if(x){x.type=e.target.value;renderCalc();save()}}});
  comp.addEventListener('click',e=>{
    const btn=e.target.closest('[data-op]');if(!btn)return;
    const item=getPart(btn);const i=st.steps.indexOf(item);if(i<0)return;
    switch(btn.dataset.op){
      case 'up': if(i>0)[st.steps[i-1],st.steps[i]]=[st.steps[i],st.steps[i-1]];break;
      case 'down': if(i<st.steps.length-1)[st.steps[i+1],st.steps[i]]=[st.steps[i],st.steps[i+1]];break;
      case 'copy': if(st.steps.length<MAX_ROWS){const row=newStep(item.type,item.name,item.db);st.steps.splice(i+1,0,row)}break;
      case 'delete': st.steps.splice(i,1);if(st.checkpoint===item.id)st.checkpoint='final';break;
    }
    renderComponents();renderCalc();save();
  });
  id('lbTxPower').addEventListener('input',e=>{
    const n=Number(e.target.value);const valid=Number.isFinite(n)&&e.target.value.trim()!==''&&(st.sourceUnit!=='W'||n>0);
    if(!valid){e.target.setCustomValidity(st.sourceUnit==='W'?'Enter a value greater than zero watts':'Enter a valid power');return}
    const dbm=dbmFromDisplay(n,st.sourceUnit);
    if(dbm < -200||dbm > 200){e.target.setCustomValidity('Power must be between -200 and +200 dBm');return}
    e.target.setCustomValidity('');st.sourceDbm=dbm;renderCalc();save();
  });
  id('lbTxUnit').addEventListener('change',e=>{st.sourceUnit=e.target.value;renderTop();renderCalc();save()});
  id('lbAntGain').addEventListener('input',e=>{
    const v=Number(e.target.value);if(!Number.isFinite(v)||Math.abs(v)>100||e.target.value.trim()===''){e.target.setCustomValidity('Antenna gain must be between -100 and 100 dB');return}
    e.target.setCustomValidity('');st.antennaGain=v;renderCalc();save();
  });
  id('lbAntUnit').addEventListener('change',e=>{
    // Preserve the physical antenna gain when switching dBi <-> dBd.
    const dBi=effectiveAntenna();st.antennaUnit=e.target.value;st.antennaGain=Number((dBi-(st.antennaUnit==='dBd'?2.15:0)).toFixed(5));renderTop();renderCalc();save();
  });
  function onPointChange(e){const b=e.target.closest('[data-checkpoint]');if(!b)return;st.checkpoint=b.dataset.checkpoint;renderCalc();save();}
  id('lbResults').addEventListener('click',onPointChange);
  function displayRow(r,label){return `<tr class="${st.checkpoint===r.id?'lb-selected':''} ${r.id==='final'?'lb-final':''}"><td><button type="button" data-checkpoint="${esc(r.id)}" aria-pressed="${st.checkpoint===r.id}">${st.checkpoint===r.id?'● Selected':'◎ Inspect'}</button></td><td>${esc(label)}<small>${r.type==='final'?'Reference antenna connected':r.type==='source'?'TX output':r.type==='gain'?'+ Gain stage':'− Loss stage'}</small></td><td>${r.type==='gain'?'+':r.type==='loss'?'−':'—'}${r.type==='gain'||r.type==='loss'?`${rounded(r.db)} dB`:''}</td><td class="lb-power">${formatDbm(r.conductedDbm)}</td><td class="lb-power">${formatDbw(r.conductedDbm)}</td><td class="lb-power">${formatWattDbm(r.conductedDbm)}</td><td class="lb-power">${formatDbm(r.ifAntennaDbm)}</td><td class="lb-power">${formatDbw(r.ifAntennaDbm)}</td><td class="lb-power">${formatWattDbm(r.ifAntennaDbm)}</td></tr>`}
  function buildChart(rows){
    const w=980,h=235,L=70,R=30,T=23,B=48;
    const all=[...rows.flatMap(r=>[r.conductedDbm,r.ifAntennaDbm])];const min=Math.floor((Math.min(...all)-5)/10)*10,max=Math.ceil((Math.max(...all)+5)/10)*10;
    const range=Math.max(10,max-min),n=rows.length;
    const x=i=>L+(i/Math.max(1,n-1))*(w-L-R);
    const y=v=>T+(max-v)/range*(h-T-B);
    const points=field=>rows.map((r,i)=>`${x(i).toFixed(2)},${y(r[field]).toFixed(2)}`).join(' ');
    const grid=Array.from({length:5},(_,i)=>{const val=min+(range*i/4),yy=y(val);return `<line x1="${L}" x2="${w-R}" y1="${yy}" y2="${yy}" stroke="#e3edf1"/><text x="${L-9}" y="${yy+4}" font-size="11" fill="#577384" text-anchor="end">${rounded(val,0)}</text>`}).join('');
    const markers=rows.map((r,i)=>`<circle cx="${x(i)}" cy="${y(r.conductedDbm)}" r="4.1" fill="#1c8395"><title>${esc(r.name)}: ${formatDbm(r.conductedDbm)} / ${formatWattDbm(r.conductedDbm)}</title></circle><circle cx="${x(i)}" cy="${y(r.ifAntennaDbm)}" r="3.8" fill="#d49b27"><title>${esc(r.name)}: prospective ${formatDbm(r.ifAntennaDbm)} / ${formatWattDbm(r.ifAntennaDbm)}</title></circle>`).join('');
    const ticks=rows.length>14?[0,Math.round((n-1)/4),Math.round((n-1)/2),Math.round(3*(n-1)/4),n-1]:rows.map((_,i)=>i);
    const labels=[...new Set(ticks)].map(i=>`<text x="${x(i)}" y="${h-B+21}" fill="#6b8390" font-size="11" text-anchor="middle">${i===0?'TX':i===n-1?'ANT':i}</text>`).join('');
    const html=`<svg xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Power chain from ${rounded(min,0)} to ${rounded(max,0)} dBm" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid meet"><rect width="${w}" height="${h}" fill="white"/><text x="${L}" y="14" fill="#4c6c7a" font-size="12" font-weight="700">Power (dBm)</text>${grid}<polyline points="${points('conductedDbm')}" fill="none" stroke="#147d90" stroke-width="3" stroke-linejoin="round"/><polyline points="${points('ifAntennaDbm')}" fill="none" stroke="#d4a02f" stroke-width="2.8" stroke-dasharray="7 4" stroke-linejoin="round"/>${markers}${labels}<text x="${w-R}" y="${h-8}" text-anchor="end" fill="#718996" font-size="11">Stage / checkpoint →</text></svg><div class="lb-legend"><span>Conducted power (dBm)</span><span class="gold">EIRP if reference antenna attached here (dBm)</span></div>`;
    return html;
  }
  function renderCalc(){
    const res=calculate();const rows=[...res.rows,{id:'final',name:'At reference antenna',type:'final',db:0,conductedDbm:res.finalConductedDbm,ifAntennaDbm:res.finalEirpDbm}];
    if(!rows.some(x=>x.id===st.checkpoint))st.checkpoint='final';
    const curr=rows.find(x=>x.id===st.checkpoint);
    id('lbTxConvert').textContent=`Equivalent: ${formatDbm(st.sourceDbm)} · ${formatDbw(st.sourceDbm)} · ${fmtW(dBmToW(st.sourceDbm))}`;
    id('lbAntConvert').textContent=`Effective gain used in EIRP: ${rounded(res.antennaDbi)} dBi`;
    id('lbNet').textContent=`${res.net>=0?'+':''}${rounded(res.net)} dB`;
    id('lbTotals').textContent=`Gain ${rounded(res.gains)} dB · Loss ${rounded(res.losses)} dB`;
    id('lbOutputDbm').textContent=formatDbm(res.finalConductedDbm);id('lbOutputDbw').textContent=formatDbw(res.finalConductedDbm);
    id('lbEirpDbm').textContent=formatDbm(res.finalEirpDbm);id('lbEirpDbw').textContent=formatDbw(res.finalEirpDbm);
    id('lbWatts').textContent=fmtW(dBmToW(res.finalConductedDbm));id('lbEirpWatts').textContent='EIRP equivalent: '+fmtW(dBmToW(res.finalEirpDbm));
    id('lbCheckpoint').innerHTML=`<div><strong>${curr.id==='final'?'At final reference antenna':'Checkpoint: '+esc(curr.name)}</strong><div class="lb-mini">${curr.id==='final'?'Estimated radiated EIRP at antenna':'Prospective EIRP with reference antenna connected here'}</div></div><div><small>Conducted here</small><div class="num">${formatDbm(curr.conductedDbm)}</div><div class="lb-mini">${formatDbw(curr.conductedDbm)}</div><div class="lb-watts">${formatWattDbm(curr.conductedDbm)}</div></div><div><small>${curr.id==='final'?'Final EIRP':'EIRP if antenna here'}</small><div class="num">${formatDbm(curr.ifAntennaDbm)}</div><div class="lb-mini">${formatDbw(curr.ifAntennaDbm)}</div><div class="lb-watts">${formatWattDbm(curr.ifAntennaDbm)}</div></div>`;
    id('lbResults').innerHTML=rows.map(r=>displayRow(r,r.name)).join('');
    id('lbChart').innerHTML=buildChart(rows);
    const warns=[];
    if(Math.max(...rows.map(r=>r.conductedDbm))>80)warns.push('Calculated conducted power exceeds +80 dBm (100 kW) at a stage; verify that the entered gain and source power are correct.');
    if(!st.steps.length)warns.push('No path components entered: output power equals source power.');
    id('lbWarning').hidden=!warns.length;id('lbWarning').textContent=warns.join(' ');
  }
  function renderAll(){renderTop();renderComponents();renderCalc()}
  function download(name,content,mime){const blob=new Blob([content],{type:mime});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),3000)}
  function csvCell(x){let v=String(x??'');if(/^[\s]*[=+@\-]/.test(v))v="'"+v;return '"'+v.replace(/"/g,'""')+'"'}
  function exportCSV(){
    const res=calculate();
    const rows=[...res.rows,{id:'final',name:'At reference antenna',type:'final',db:0,conductedDbm:res.finalConductedDbm,ifAntennaDbm:res.finalEirpDbm}];
    const toCsvWatts=dbm=>Number(dBmToW(dbm).toPrecision(12));
    const lines=[['Stage','Type','Component','Gain_or_Loss_dB','Conducted_dBm','Conducted_dBW','Conducted_W','EIRP_if_antenna_here_dBm','EIRP_if_antenna_here_dBW','EIRP_if_antenna_here_W']];
    rows.forEach((r,i)=>lines.push([i,r.type,r.name,r.delta??'',rounded(r.conductedDbm,4),rounded(r.conductedDbm-30,4),toCsvWatts(r.conductedDbm),rounded(r.ifAntennaDbm,4),rounded(r.ifAntennaDbm-30,4),toCsvWatts(r.ifAntennaDbm)]));
    lines.push(['','','Reference antenna gain (dBi)',rounded(res.antennaDbi,4),'','','','','','']);
    download('BDA_Link_Budget_v1.7.csv',lines.map(line=>line.map(csvCell).join(',')).join('\r\n'),'text/csv;charset=utf-8');
  }
  id('lbExportCSV').addEventListener('click',exportCSV);
  id('lbExportJSON').addEventListener('click',()=>download('BDA_Link_Budget_v1.7.json',JSON.stringify({format:'BDA-Link-Budget',version:'1.7',exportedAt:new Date().toISOString(),...st},null,2),'application/json'));
  id('lbImportJSON').addEventListener('click',()=>id('lbFile').click());
  id('lbFile').addEventListener('change',async e=>{
    const file=e.target.files?.[0];if(!file)return;
    if(file.size>4_000_000){window.alert('Link budget file is too large.');e.target.value='';return}
    try{const d=JSON.parse(await file.text());if(d.format!=='BDA-Link-Budget'||!Array.isArray(d.steps))throw new Error('Not a BDA link budget JSON file');st=scrub(d);renderAll();save()}
    catch(err){window.alert('Unable to load budget: '+err.message)}finally{e.target.value=''}
  });
  id('lbReset').addEventListener('click',()=>{if(st.steps.length&&!window.confirm('Clear all link-budget components and restore default power settings?'))return;st=defaultState();renderAll();save()});
  id('lbExample').addEventListener('click',()=>{if(st.steps.length&&!window.confirm('Replace current budget with a sample RF chain? Export JSON first if you want to keep it.'))return;st=defaultState();st.sourceDbm=30;st.antennaGain=6;st.steps=[newStep('loss','Feedline',3),newStep('gain','Amplifier',20),newStep('loss','Coupler / distribution',10)];renderAll();save()});
  // Allow read-only engineering verification without opening the dialog.
  window.BDA_LinkBudget=Object.freeze({version:'v1.7',open,calculate,dbmFromDisplay,displayFromDbm,effectiveAntenna,read:()=>JSON.parse(JSON.stringify(st))});
})();
