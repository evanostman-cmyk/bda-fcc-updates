(function uplinkGainModule(){
  'use strict';
  if(document.getElementById('uplinkGainDialog'))return;
  const $=id=>document.getElementById(id), STORAGE='BATWING_UPLINK_GAIN_v1.12';
  const ids=['ugCurrent','ugRssi','ugTarget','ugIsolation','ugMargin','ugNoiseOff','ugNoiseOn','ugTolerance','ugInput','ugDonorLoss','ugDonorGain','ugMaxOutput'];
  const btn=document.createElement('button');
  btn.type='button';btn.className='btn';btn.id='uplinkGainTop';btn.textContent='⇧ Uplink Gain';
  const next=document.getElementById('linkBudgetTop')||document.getElementById('fccOpenTop');
  if(next)next.insertAdjacentElement('afterend',btn);else document.querySelector('.top-actions')?.appendChild(btn);
  const css=document.createElement('style');
  css.textContent=`
  #uplinkGainDialog{width:min(1180px,calc(100vw - 20px));max-height:94dvh;overflow-y:auto;padding:0;border-radius:15px}
  #uplinkGainDialog .ug-head{background:#ecf6fa;border-bottom:1px solid #d4e4eb;display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:17px 20px}
  #uplinkGainDialog .ug-head h2{font-size:1.34rem;color:#17455b;margin:0 0 5px}
  #uplinkGainDialog .ug-head p{font-size:.8rem;color:#5a7785;margin:0}
  #uplinkGainDialog .ug-head button{white-space:nowrap;width:auto}
  #uplinkGainDialog .ug-main{padding:16px;display:grid;gap:14px}
  #uplinkGainDialog .ug-card{border:1px solid #d2e1e8;background:white;border-radius:13px;padding:15px}
  #uplinkGainDialog .ug-card h3{font-size:1.05rem;margin:0 0 13px}
  #uplinkGainDialog .ug-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}
  #uplinkGainDialog label{font-size:.78rem;font-weight:700;color:#315b6d}
  #uplinkGainDialog input{display:block;width:100%;min-width:0;margin-top:5px;min-height:42px}
  #uplinkGainDialog .ug-hint{font-size:.76rem;line-height:1.55;color:#5d7987;margin:12px 0 0}
  #uplinkGainDialog .ug-results{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}
  #uplinkGainDialog .ug-metric{border:1px solid #cde0e8;border-radius:10px;padding:11px;background:#f0f8fb;min-width:0}
  #uplinkGainDialog .ug-metric small{display:block;font-size:.72rem;color:#517386}
  #uplinkGainDialog .ug-metric strong{display:block;font-size:1.23rem;color:#17495c;overflow-wrap:anywhere}
  #uplinkGainDialog #ugWarnings{margin-top:12px;padding:11px;border-radius:10px;white-space:pre-line;font-size:.82rem;line-height:1.55;background:#f4f8fa;border:1px solid #cfdee6}
  #uplinkGainDialog #ugWarnings.ug-alert{background:#fff3e6;border-color:#ebb57e;color:#704320}
  #uplinkGainDialog .ug-footer{background:#f0f7f9;padding:12px 19px;display:flex;gap:9px;flex-wrap:wrap;align-items:center}
  #uplinkGainDialog .ug-footer span{font-size:.76rem;color:#496f80;flex:1}
  .top-actions #uplinkGainTop{display:none!important}
  @media(max-width:820px){#uplinkGainDialog .ug-grid,#uplinkGainDialog .ug-results{grid-template-columns:repeat(2,minmax(0,1fr))}}
  @media(max-width:480px){#uplinkGainDialog .ug-main{padding:8px}#uplinkGainDialog .ug-card{padding:10px}#uplinkGainDialog .ug-head{padding:12px}#uplinkGainDialog .ug-grid{gap:8px}#uplinkGainDialog .ug-metric strong{font-size:1.06rem}}
  `;
  document.head.appendChild(css);
  const dialog=document.createElement('dialog');dialog.id='uplinkGainDialog';dialog.setAttribute('aria-labelledby','ugTitle');
  dialog.innerHTML=`
    <header class="ug-head"><div><h2 id="ugTitle">⇧ Uplink Gain Calculator · v1.12</h2><p>Measurement-based tower RSSI adjustment with isolation-margin and uplink noise safeguards.</p></div><button type="button" class="btn sm" id="ugClose">← Channel Planner</button></header>
    <div class="ug-main">
    <section class="ug-card"><h3>1 · Field readings</h3><div class="ug-grid">
      <label>Current uplink gain (dB)<input type="number" step="0.1" id="ugCurrent" placeholder="Configured gain"></label>
      <label>RSSI measured at tower (dBm)<input type="number" step="0.1" id="ugRssi" placeholder="Tower tech reading"></label>
      <label>Target tower RSSI (dBm)<input type="number" step="0.1" id="ugTarget" value="-65"></label>
      <label>Server-to-donor isolation (dB)<input type="number" step="0.1" id="ugIsolation" placeholder="Measured isolation"></label>
      <label>Required isolation margin (dB)<input type="number" step="0.1" id="ugMargin" value="20"></label>
      <label>Tower noise, BDA OFF (dBm)<input type="number" step="0.1" id="ugNoiseOff" placeholder="Tower tech reading"></label>
      <label>Tower noise, BDA ON (dBm)<input type="number" step="0.1" id="ugNoiseOn" placeholder="Tower tech reading"></label>
      <label>Permitted noise rise (dB)<input type="number" step="0.1" min="0" id="ugTolerance" value="0"></label>
    </div><p class="ug-hint">−65 dBm target, −75 to −50 dBm nominal reference range, and 20 dB isolation margin are starting references only; use AHJ, tower operator, and manufacturer requirements. By default the tower noise floor must remain unchanged.</p></section>
    <section class="ug-card"><h3>2 · Uplink gain planning results</h3><div class="ug-results">
       <div class="ug-metric"><small>Gain requested by RSSI target</small><strong id="ugOutRequired">—</strong></div>
       <div class="ug-metric"><small>Isolation-based gain ceiling</small><strong id="ugOutCeiling">—</strong></div>
       <div class="ug-metric"><small>Provisional gain to test</small><strong id="ugOutSuggested">—</strong></div>
       <div class="ug-metric"><small>Predicted tower RSSI</small><strong id="ugOutPredicted">—</strong></div>
       <div class="ug-metric"><small>Change from current gain</small><strong id="ugOutDelta">—</strong></div>
       <div class="ug-metric"><small>Isolation margin at test gain</small><strong id="ugOutHeadroom">—</strong></div>
       <div class="ug-metric"><small>Noise change: ON − OFF</small><strong id="ugOutNoise">—</strong></div>
       <div class="ug-metric"><small>Conducted output / donor EIRP</small><strong id="ugOutEirp">—</strong></div>
    </div><div id="ugPowerDetail" class="ug-hint" aria-live="polite"></div><div id="ugWarnings" role="status" aria-live="polite"></div></section>
    <section class="ug-card"><h3>3 · Optional conducted power and donor EIRP</h3><div class="ug-grid">
      <label>Measured BDA uplink input (dBm)<input type="number" step="0.1" id="ugInput" placeholder="Optional"></label>
      <label>Donor feeder loss (dB)<input type="number" step="0.1" min="0" id="ugDonorLoss" value="0"></label>
      <label>Donor antenna gain (dBi)<input type="number" step="0.1" id="ugDonorGain" value="0"></label>
      <label>Manufacturer max output (dBm)<input type="number" step="0.1" id="ugMaxOutput" placeholder="Optional equipment limit"></label>
    </div><p class="ug-hint">BDA conducted output = input + gain. Donor EIRP = output − feeder loss + donor antenna dBi. Valid only in a linear operating region; use measured powers to check clipping, ALC and hardware limits.</p></section>
    <p class="ug-hint"><strong>Field workflow:</strong> Have the tower technician measure receiver RSSI and noise floor; test with an approved portable per AHJ test plan (about 8 ft from first server antenna where required), check BDA OFF/ON tower noise, isolation, oscillation, and DAQ. This calculation cannot establish tower-receiver protection or regulatory acceptance by itself.</p>
    </div><footer class="ug-footer"><span id="ugState">Inputs saved in this browser.</span>
       <button type="button" class="btn sm" id="ugExample">Load example</button>
       <button type="button" class="btn sm" id="ugExport">Export CSV</button>
       <button type="button" class="btn sm danger" id="ugClear">Clear</button></footer>
  `;
  document.body.appendChild(dialog);
  const num=id=>{const t=$(id).value.trim();return t!==''&&Number.isFinite(Number(t))?Number(t):null;};
  const valid=(x,min,max)=>x!==null&&Number.isFinite(x)&&x>=min&&x<=max;
  const names=['current','rssi','target','isolation','margin','off','on','tolerance','input','donorLoss','donorGain','maxOutput'];
  function calculate(v){
    const {current,rssi,target,isolation,margin,off,on,tolerance,input,donorLoss,donorGain,maxOutput}=v;
    const notes=[];let requested=null,ceiling=null,suggested=null,predicted=null,delta=null,headroom=null,noiseRise=null,noiseOk=null,power=null;
    if(valid(isolation,0,200)&&valid(margin,0,80)){
      ceiling=isolation-margin;
      if(ceiling<0)notes.push('STOP: measured isolation is less than required margin; no permitted gain is available.');
    }else notes.push('Enter measured isolation and required margin.');
    if(valid(current,0,130)&&valid(rssi,-160,10)&&valid(target,-160,10)&&ceiling!==null){
      requested=current+target-rssi;
      if(ceiling>=0){
        suggested=Math.max(0,Math.min(requested,ceiling));
        predicted=rssi+suggested-current;
        delta=suggested-current;
        headroom=isolation-suggested;
        if(requested>ceiling)notes.push('Target RSSI needs more gain than allowed by isolation. Do not defeat the margin; improve isolation or change design.');
        if(current>ceiling)notes.push('Current BDA gain exceeds the isolation-based ceiling. Investigate and reduce gain.');
        if(requested<0)notes.push('RSSI target mathematically needs negative active gain. Reassess attenuation or test assumptions.');
        if(predicted<-75||predicted>-50)notes.push('Predicted tower RSSI is outside the nominal −75 to −50 dBm reference range; verify tower specifications and DAQ.');
      }
    }else notes.push('Enter current BDA gain, measured tower RSSI, target RSSI and isolation to calculate a test gain.');
    if(valid(off,-180,30)&&valid(on,-180,30)&&valid(tolerance,0,20)){
      noiseRise=on-off;noiseOk=noiseRise<=tolerance+1e-9;
      if(!noiseOk){notes.push('STOP: BDA ON increases tower noise beyond the allowed limit. Do not increase gain; troubleshoot and remeasure with the tower technician.');suggested=null;predicted=null;delta=null;headroom=null;notes.push('Provisional gain is withheld until tower receiver noise is acceptable.');}
    }else notes.push('Tower noise OFF/ON readings are missing or invalid. Gain result remains planning-only, not commissioned.');
    if(suggested!==null&&valid(input,-180,40)&&valid(donorLoss,0,150)&&valid(donorGain,-30,60)){
      const conducted=input+suggested, eirp=conducted-donorLoss+donorGain;
      power={conducted,eirp,conductedW:Math.pow(10,(conducted-30)/10),eirpW:Math.pow(10,(eirp-30)/10)};
      if(valid(maxOutput,-100,100)&&conducted>maxOutput)notes.push('Predicted conducted output exceeds the entered manufacturer limit; check ALC/compression and actual input levels.');
    }
    if(noiseOk===true&&suggested!==null)notes.push('Noise difference is within the entered allowance; verify stability, noise, DAQ and AHJ acceptance after changing gain.');
    return {requested,ceiling,suggested,predicted,delta,headroom,noiseRise,noiseOk,power,notes};
  }
  const values=()=>Object.fromEntries(names.map((n,i)=>[n,num(ids[i])]));
  let last=null;
  function render(){
    const r=calculate(values());last=r;
    const put=(id,n,unit=' dB')=>$(id).textContent=n===null?'—':n.toFixed(1)+unit;
    put('ugOutRequired',r.requested);put('ugOutCeiling',r.ceiling);
    put('ugOutSuggested',r.suggested);put('ugOutPredicted',r.predicted,' dBm');
    put('ugOutDelta',r.delta);put('ugOutHeadroom',r.headroom);put('ugOutNoise',r.noiseRise);
    $('ugOutEirp').textContent=r.power?r.power.conducted.toFixed(1)+' / '+r.power.eirp.toFixed(1)+' dBm':'—';
    const watts=n=>n<0.0001?n.toExponential(3):Number(n.toPrecision(6)).toString();
    $('ugPowerDetail').textContent=r.power?'Conducted: '+(r.power.conducted-30).toFixed(1)+' dBW / '+watts(r.power.conductedW)+' W. Donor EIRP: '+(r.power.eirp-30).toFixed(1)+' dBW / '+watts(r.power.eirpW)+' W.':'';
    $('ugWarnings').textContent=r.notes.join('\n');
    $('ugWarnings').classList.toggle('ug-alert',r.noiseOk!==true||r.notes.some(s=>s.includes('STOP')||s.includes('exceeds')||s.includes('needs more')));
    try{localStorage.setItem(STORAGE,JSON.stringify(Object.fromEntries(ids.map(id=>[id,$(id).value]))));$('ugState').textContent='Inputs saved in this browser.'}catch(e){$('ugState').textContent='Browser storage unavailable; export your results.'}
    return r;
  }
  try{const saved=JSON.parse(localStorage.getItem(STORAGE)||'null');if(saved&&typeof saved==='object')for(const id of ids)if(typeof saved[id]==='string')$(id).value=saved[id]}catch(e){}
  ids.forEach(id=>$(id).addEventListener('input',render));
  btn.addEventListener('click',()=>{render();if(!dialog.open)dialog.showModal()});
  $('ugClose').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close()});
  $('ugClear').addEventListener('click',()=>{
    ids.forEach(id=>$(id).value='');$('ugTarget').value='-65';$('ugMargin').value='20';$('ugTolerance').value='0';$('ugDonorLoss').value='0';$('ugDonorGain').value='0';render();
  });
  $('ugExample').addEventListener('click',()=>{
    const sample=['60','-75','-65','90','20','-120','-120','0','-90','2','8','0'];
    ids.forEach((id,i)=>$(id).value=sample[i]);render();$('ugState').textContent='EXAMPLE DATA — replace every reading before field use.';
  });
  $('ugExport').addEventListener('click',()=>{
    const r=render(),lines=[['Batwing Uplink Gain v1.12','Value'],...Object.entries(values()),...Object.entries(r).filter(([k])=>k!=='notes'&&k!=='power'),...(r.power?Object.entries(r.power).map(([k,v])=>['power.'+k,v]):[]),...r.notes.map(n=>['note',n])];
    const csv=lines.map(row=>row.map(x=>'"'+String(x??'').replace(/"/g,'""')+'"').join(',')).join('\r\n');
    const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');
    a.href=url;a.download='Batwing_uplink_gain.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  });
  window.BatwingUplinkGain=Object.freeze({version:'v1.12',calculate});
  render();
})();