/* BDA Channel Planner add-on: site address / GPS to FCC transmitter distance.
   No location service is used without an explicit Find towers click.
   Distances are geodesic straight-line estimates (not RF path or drive distance).
*/
(() => {
  'use strict';
  if (!document.getElementById('fccDialog') || document.getElementById('fccGeoPanel')) return;

  const section = document.createElement('section');
  section.id = 'fccGeoPanel';
  section.className = 'fcc-geo-panel';
  section.setAttribute('aria-label', 'Find FCC transmitter towers near an address');
  section.innerHTML = `
    <div class="fcc-geo-heading">
      <div><strong>📏 Distance from a site address to FCC towers</strong>
        <p>Enter a US street address or GPS coordinates. Towers with FCC GPS data will show their straight-line distance and sort nearest first.</p>
      </div><span class="fcc-pill">Site distance finder</span>
    </div>
    <div class="fcc-geo-fields">
      <div class="field fcc-geo-address-field">
        <label for="fccGeoInput">Site address or latitude, longitude</label>
        <input id="fccGeoInput" type="text" maxlength="250" autocomplete="off" spellcheck="false"
          placeholder="123 Main St, Tampa, FL 33602  or  27.9506, -82.4572" />
      </div>
      <button id="fccGeoFind" class="btn primary" type="button">📍 Find towers</button>
      <button id="fccGeoClear" class="btn" type="button">Clear</button>
      <div class="field fcc-geo-radius-field">
        <label for="fccGeoRadius">Distance filter</label>
        <select id="fccGeoRadius">
          <option value="all">All distances</option>
          <option value="5">5 miles</option>
          <option value="10">10 miles</option>
          <option value="25" selected>25 miles</option>
          <option value="50">50 miles</option>
          <option value="100">100 miles</option>
          <option value="250">250 miles</option>
          <option value="500">500 miles</option>
        </select>
      </div>
    </div>
    <label class="fcc-geo-nearby"><input type="checkbox" id="fccGeoNearby" checked />
      Include towers in other counties within the distance radius (recommended near county lines)
    </label>
    <p id="fccGeoStatus" class="fcc-geo-status" role="status" aria-live="polite">Enter a complete address while online, or enter GPS coordinates to calculate distances entirely offline.</p>
    <p class="fcc-geo-caveat">US addresses are looked up with the US Census Geocoder (internet required; address is sent to Census). GPS entry works without internet. Census address points are approximate; FCC coordinates represent licensed locations. Distances are straight-line miles, not driving distance, signal range, or confirmed active P25 towers. Distance searches use the currently selected state. Address lookup automatically selects the matched state and county; with the nearby-counties option checked, tower cards also search other counties in that state. FCC sites across state borders require loading that neighboring state.</p>`;
  const css = document.createElement('style');
  css.textContent = `
    .fcc-geo-panel{border:1px solid #afd6dc;border-radius:13px;padding:15px 17px;background:#f2fbfc;display:grid;gap:11px}
    .fcc-geo-heading{display:flex;justify-content:space-between;align-items:flex-start;gap:9px;flex-wrap:wrap}
    .fcc-geo-heading strong{font-size:.96rem;color:#184a60}
    .fcc-geo-heading p{font-size:.79rem;color:#537583;margin:4px 0 0;line-height:1.45}
    .fcc-geo-fields{display:flex;align-items:flex-end;gap:9px;flex-wrap:wrap}
    .fcc-geo-fields .field{min-width:140px}.fcc-geo-address-field{flex:1 1 260px}
    .fcc-geo-address-field input{width:100%}.fcc-geo-radius-field{flex:0 1 180px}
    .fcc-geo-fields button{min-height:42px;white-space:nowrap}
    .fcc-geo-nearby{display:flex;align-items:center;gap:9px;font-size:.82rem;color:#264d61;font-weight:650;cursor:pointer}
    .fcc-geo-nearby input{accent-color:#1681a0;width:17px;height:17px;flex-shrink:0}
    .fcc-geo-status{font-size:.84rem;font-weight:700;color:#18546d;margin:0;line-height:1.55}
    .fcc-geo-status.fcc-geo-error{color:#a33b2d}
    .fcc-geo-caveat{font-size:.73rem;color:#5c7681;margin:0;line-height:1.5}
    .fcc-site-tag.fcc-distance-chip{background:#dff5eb;border-color:#9bd6b7;color:#096241;font-size:.78rem}
    .fcc-site-tag.fcc-distance-unavailable{background:#f6f6f7;color:#777;border-color:#ddd}
    .fcc-geo-closest{border-color:#58b99d;box-shadow:0 0 0 1px #c2e9db}
    .bda-site-azimuth{margin:4px 0 7px;font-size:.83rem;font-weight:750;color:#175b76;line-height:1.4}
    @media(max-width:640px){.fcc-geo-fields .btn{flex:1}.fcc-geo-radius-field{flex:1 1 140px}}
    @media print{.fcc-geo-panel{display:none!important}}
  `;
  document.head.appendChild(css);
  const target=document.querySelector('.fcc-sitefinder-note');
  if(!target) return;
  target.insertAdjacentElement('afterend', section);

  const $=(id)=>document.getElementById(id);
  let reference=null; // {lat, lon, label, state, county} - intentionally not persisted
  window.BDA_TowerDistance = Object.freeze({getReference:()=>reference?{...reference}:null});
  let isLocating=false;
  let lookupCount=0;
  let latestGroups=[];
  const status=$('fccGeoStatus');
  function validCoords(lat,lon){
    return Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat)<=90 && Math.abs(lon)<=180 && !(lat===0&&lon===0);
  }
  function readGps(value){
    const m=String(value).trim().match(/^\s*([+-]?(?:\d+(?:\.\d*)?|\.\d+))\s*[,;]\s*([+-]?(?:\d+(?:\.\d*)?|\.\d+))\s*$/);
    if(!m) return null;
    const lat=Number(m[1]),lon=Number(m[2]);
    if(!validCoords(lat,lon))throw Error('GPS coordinates must be valid decimal latitude and longitude, e.g. 27.9506, -82.4572.');
    return {lat,lon,label:`GPS ${lat.toFixed(6)}, ${lon.toFixed(6)}`,state:''};
  }
  function distMiles(lat1,lon1,lat2,lon2){
    const rad=Math.PI/180;
    const dlat=(lat2-lat1)*rad,dlon=(lon2-lon1)*rad;
    const a=Math.sin(dlat/2)**2+Math.cos(lat1*rad)*Math.cos(lat2*rad)*Math.sin(dlon/2)**2;
    return 3958.7613*2*Math.atan2(Math.sqrt(a),Math.sqrt(Math.max(0,1-a)));
  }

  // v1.5 — initial true-north azimuth from job site to the FCC tower.
  function azimuthTrue(a,b){
    const rad=Math.PI/180;
    const p1=Number(a.lat)*rad,p2=Number(b.lat)*rad;
    const dlon=(Number(b.lon)-Number(a.lon))*rad;
    const y=Math.sin(dlon)*Math.cos(p2);
    const x=Math.cos(p1)*Math.sin(p2)-Math.sin(p1)*Math.cos(p2)*Math.cos(dlon);
    if(Math.hypot(x,y)<1e-12)return null;
    return (Math.atan2(y,x)*180/Math.PI+360)%360;
  }
  const directions=['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
  const bearingText=angle=>angle.toFixed(1)+'°T ('+directions[Math.round(angle/22.5)%16]+')';
  function distanceTo(record){
    if(!reference)return null;
    const c=fccCoordinates(record);
    return c?distMiles(reference.lat,reference.lon,c.lat,c.lon):null;
  }
  function radius(){return $('fccGeoRadius').value==='all'?Infinity:Number($('fccGeoRadius').value)}
  function radiusLabel(){return Number.isFinite(radius())?`within ${radius()} miles`:'at any distance'}
  function setStatus(message,error=false){status.textContent=message;status.classList.toggle('fcc-geo-error',error)}

  // Keep the actual address county visible in the FCC dropdown, while the
  // nearby-towers option searches other counties within the same selected state.
  // Frequency-table filters still follow the visible county selector.
  const originalBrowseRecords=fccSiteBrowseRecords;
  fccSiteBrowseRecords=function(){
    if(!reference || !$('fccGeoNearby').checked || fccFilter.state==='All' || fccFilter.county==='All'){
      return originalBrowseRecords();
    }
    const county=fccFilter.county;
    try{fccFilter.county='All';return originalBrowseRecords()}
    finally{fccFilter.county=county}
  };

  const originalSiteGroups=fccSiteGroups;
  fccSiteGroups=function(){
    let groups=originalSiteGroups();
    if(!reference){latestGroups=groups;return groups;}
    const rmax=radius();
    groups=groups.map(g=>{
      const mapped=g.records.find(rec=>fccCoordinates(rec));
      return {g,mi:mapped?distanceTo(mapped):null};
    }).filter(x=>!Number.isFinite(rmax)||(x.mi!==null&&x.mi<=rmax));
    groups.sort((a,b)=>(a.mi===null?Infinity:a.mi)-(b.mi===null?Infinity:b.mi)
      || a.g.first.callsign.localeCompare(b.g.first.callsign));
    latestGroups=groups.map(x=>x.g);
    return latestGroups;
  };

  // Let address-based nearest searches work across a selected state's full data,
  // instead of forcing a county selection for >12,000 records.
  const originalNarrowingNeeded=fccNarrowingNeeded;
  fccNarrowingNeeded=function(){
    if(reference && fccFilter.state!=='All')return '';
    return originalNarrowingNeeded();
  };

  const originalRenderSiteCards=fccRenderSiteCards;
  fccRenderSiteCards=function(){
    originalRenderSiteCards();
    if(!reference)return;
    const displayGroups=$('fccMapOnly').checked
      ?latestGroups.filter(g=>g.records.some(rec=>fccCoordinates(rec))):latestGroups;
    const cards=[...$('fccSiteCards').querySelectorAll('.fcc-site-card')];
    for(let i=0;i<cards.length;i++){
      const g=displayGroups[i];if(!g)break;
      const mapped=g.records.find(rec=>fccCoordinates(rec));
      const mi=mapped?distanceTo(mapped):null;
      const tags=cards[i].querySelector('.fcc-site-tags');if(!tags)continue;
      const badge=document.createElement('span');
      badge.className='fcc-site-tag '+(mi===null?'fcc-distance-unavailable':'fcc-distance-chip');
      badge.textContent=mi===null?'Distance unavailable':`${mi<10?mi.toFixed(2):mi.toFixed(1)} mi from site`;
      badge.title=mi===null?'This FCC entry has no usable tower coordinates.':
        `${mi.toFixed(3)} straight-line miles from ${reference.label}`;
      tags.prepend(badge);
      // Display the bearing with each tower's GPS/site information.
      if(mapped){
        const gps=cards[i].querySelector('.fcc-coordinates');
        const c=fccCoordinates(mapped);
        if(gps&&c){
          const a=azimuthTrue(reference,c),line=document.createElement('div');
          line.className='bda-site-azimuth';
          line.textContent='Azimuth from site → tower: '+(a===null?'undefined (same coordinates)':bearingText(a));
          line.title='True-north initial great-circle bearing; magnetic headings need declination adjustment.';
          gps.insertAdjacentElement('afterend',line);
        }
      }

      if(i===0&&mi!==null)cards[i].classList.add('fcc-geo-closest');
    }
    const mappedCount=displayGroups.filter(g=>g.records.some(rec=>fccCoordinates(rec))).length;
    $('fccSitesFoot').textContent=`Tower cards are sorted by straight-line distance from your site, closest first. ${mappedCount.toLocaleString()} mapped tower${mappedCount===1?'':'s'} ${radiusLabel()} in the current search. ${displayGroups.length>60?'Showing the first 60; narrow with the county, licensee or distance filter.':''} P25 indication does not prove on-air operation.`;
  };

  const originalRenderSelection=fccRenderTowerSelection;
  fccRenderTowerSelection=function(){
    originalRenderSelection();
    if(!reference)return;
    const chips=[...$('fccSelectedTowerList').querySelectorAll('.fcc-tower-chip')];
    let i=0;
    for(const tower of fccTowerSelection.values()){
      if(i>=chips.length)break;
      const mi=validCoords(Number(tower.lat),Number(tower.lon))?
        distMiles(reference.lat,reference.lon,Number(tower.lat),Number(tower.lon)):null;
      const span=chips[i++].querySelector('span');
      if(span&&mi!==null)span.textContent+=` · ${mi<10?mi.toFixed(2):mi.toFixed(1)} mi`;
      if(span&&mi!==null){const angle=azimuthTrue(reference,tower);if(angle!==null)span.textContent+=' · Az '+angle.toFixed(1)+'°T';}
    }
  };

  // Honor the active distance filter on the existing Map all sites KML export.
  const originalMapSiteRecords=fccMapSiteRecords;
  fccMapSiteRecords=function(){
    const records=originalMapSiteRecords();
    if(!reference||!Number.isFinite(radius()))return records;
    return records.filter(r=>{const mi=distanceTo(r);return mi!==null&&mi<=radius()});
  };

  function normalizedCounty(value){
    return String(value||'').trim().replace(/\b(CITY AND BOROUGH|COUNTY|PARISH|MUNICIPIO|CENSUS AREA|BOROUGH)\b/gi,'')
      .replace(/\bSAINT\b/gi,'ST').replace(/[^A-Za-z0-9]/g,'').toUpperCase();
  }
  function selectAddressCounty(county){
    const possibilities=[...$('fccCounty').options].map(x=>x.value).filter(x=>x!=='All');
    const wanted=normalizedCounty(county);
    if(!wanted)return '';
    const match=possibilities.find(x=>normalizedCounty(x)===wanted);
    return match||'';
  }
  // Starter directory rows are not evidence that a state database was loaded.
  function stateSnapshot(state){
    const match=r=>state==='All'||r.state===state;
    const stateRows=fccNationStateRows.filter(match);
    const imported=fccImported.filter(match);
    const all=fccAll().filter(match);
    return {stateRows:stateRows.length,imported:imported.length,
      counties:new Set(all.map(r=>r.county).filter(Boolean)).size,
      mapped:all.filter(r=>fccCoordinates(r)).length};
  }
  function refreshDistanceView(note=''){
    fccRenderSiteCards();fccRenderTowerSelection();
    if(reference){
      const shown=latestGroups.length;
      const selected=fccFilter.state;
      const requested=reference.state||selected;
      const mismatch=Boolean(reference.state&&reference.state!==selected);
      const data=stateSnapshot(requested);
      const scope=$('fccGeoNearby').checked?'all counties in the selected state':'the selected FCC county';
      const countyLabel=reference.county?' · Address county: '+reference.county:'';
      const prefix=reference.label+' ('+reference.lat.toFixed(6)+', '+reference.lon.toFixed(6)+')'+countyLabel;
      const diag=' FCC '+requested+': '+data.stateRows.toLocaleString()+' state records, '+data.imported.toLocaleString()+' local import records, '+data.counties+' counties, '+data.mapped.toLocaleString()+' records with GPS.';
      if(mismatch||!data.mapped||(!data.stateRows&&!data.imported)){
        const issue=mismatch?'The address is in '+requested+' but the selected FCC state is '+selected+'.':
          !data.mapped?'No usable FCC GPS records are loaded for '+requested+'.':
          'Only starter records are available for '+requested+'.';
        setStatus(prefix+' · '+issue+diag+' Tower search is incomplete; use Check for updates or import FCC data, then retry. '+note,true);
        return;
      }
      const hostedMissing=Boolean(fccHostedManifest?.states?.[requested]&&!data.stateRows);
      const limited=hostedMissing?' Hosted state data could not be loaded; results use local imports only.':'';
      const filters=shown===0?' No towers match the current band, site mode, base-station and radius filters; try broader filters.':'';
      setStatus(prefix+' · '+shown.toLocaleString()+' towers '+radiusLabel()+' from '+scope+'. Sorted nearest first.'+diag+limited+filters+(note?' '+note:''),hostedMissing);
    }
  }
  async function useReference(ref){
    reference=ref;
    const targetState=/^[A-Z]{2}$/.test(ref.state||'')?ref.state:'';
    let note='';
    // Wait for initial IndexedDB restoration and manifest loading before deciding
    // whether the default state is actually ready. This matters on a fresh browser.
    setStatus('Preparing FCC state data for the site search…');
    if(typeof fccStartupReady!=='undefined')await fccStartupReady;
    // A new geographic search must not inherit old county/licensee/site/text filters.
    fccFilter.county='All';fccFilter.licensee='All';fccFilter.site='All';fccFilter.text='';
    $('fccText').value='';
    const requested=targetState||fccFilter.state;
    if(requested!=='All'){
      let data=stateSnapshot(requested);
      // A failed initial manifest download should not leave the search stuck on starter rows.
      if(!fccHostedManifest?.states?.[requested]&&!data.stateRows&&!data.imported&&$('fccHostedURL')?.value.trim()){
        setStatus('Connecting to the FCC database for '+requested+'…');
        await fccHostedCheckNow(false);
        data=stateSnapshot(requested);
      }
      const available=[...$('fccState').options].some(x=>x.value===requested)
        ||Boolean(fccHostedManifest?.states?.[requested])
        ||Boolean(fccNationMeta?.stateCounts?.[requested])
        ||Boolean(data.stateRows||data.imported);
      if(available){
        const changed=requested!==fccFilter.state;
        fccFilter.state=requested;
        const canLoad=Boolean(fccHostedManifest?.states?.[requested]||fccNationMeta?.stateCounts?.[requested]);
        // The selected dropdown alone is NOT proof of loaded data.
        if(canLoad&&(changed||!data.stateRows||!data.mapped)){
          setStatus('Loading '+requested+' FCC records before searching…');
          await fccNationLoadState(requested);
          data=stateSnapshot(requested);
          // One automatic retry on a failed/empty state load; the core loader
          // validates current cache entries and preserves usable older data.
          if(!data.stateRows||!data.mapped){
            setStatus('Retrying '+requested+' FCC state data…');
            await fccNationLoadState(requested);
          }
        }
      }else note='FCC state '+requested+' is not available in the loaded database.';
    }
    // A loader can render intermediate data. Reapply the new search scope.
    fccFilter.county='All';fccFilter.licensee='All';fccFilter.site='All';fccFilter.text='';
    fccRefreshFilters();
    if(targetState&&fccFilter.state===targetState&&ref.county){
      const matchedCounty=selectAddressCounty(ref.county);
      if(matchedCounty){
        fccFilter.county=matchedCounty;
        fccRefreshFilters();
      }else if(stateSnapshot(targetState).mapped){
        note='The Census identified '+ref.county+', but no matching county label is in the loaded FCC records. Showing all counties.';
      }
    }else if(!targetState)note='For GPS searches, select the matching FCC state; the county is now set to All.';
    fccRender();
    refreshDistanceView(note);
  }
  // Census explicitly supports JSONP for browser-side calls; its endpoint does not
  // currently permit browser CORS fetches. No third-party proxy or API key needed.
  function censusGeocode(address){
    return new Promise((resolve,reject)=>{
      const callback='__bdaFCCGeoLookup_'+Date.now()+'_'+(++lookupCount);
      const script=document.createElement('script');let complete=false;
      const finish=(err,data)=>{
        if(complete)return;complete=true;
        clearTimeout(timer);script.remove();delete window[callback];
        if(err)reject(err);else resolve(data);
      };
      const timer=setTimeout(()=>finish(Error('Census address lookup timed out')),18000);
      window[callback]=(data)=>finish(null,data);
      script.onerror=()=>finish(Error('Census address lookup could not be loaded'));
      const url=new URL('https://geocoding.geo.census.gov/geocoder/geographies/onelineaddress');
      url.search=new URLSearchParams({address,benchmark:'Public_AR_Current',vintage:'Current_Current',format:'jsonp',callback}).toString();
      script.src=url.href;script.async=true;
      document.head.appendChild(script);
    });
  }
  async function findAddress(){
    if(isLocating)return;
    const value=$('fccGeoInput').value.trim();
    if(!value){setStatus('Enter a full US address (street, city, state) or decimal GPS coordinates.',true);return;}
    let gps;
    try{gps=readGps(value)}catch(e){setStatus(e.message,true);return;}
    if(gps){
      isLocating=true;$('fccGeoFind').disabled=true;$('fccGeoClear').disabled=true;
      try{await useReference(gps)}catch(e){setStatus(`GPS was accepted but FCC state loading failed: ${e.message}. Select a state or use your cached FCC data.`,true)}
      finally{isLocating=false;$('fccGeoFind').disabled=false;$('fccGeoClear').disabled=false}
      return;
    }
    if(!/[a-z]/i.test(value)){setStatus('For GPS use decimal latitude, longitude (e.g. 27.9506, -82.4572); otherwise enter a complete US street address.',true);return;}
    isLocating=true;$('fccGeoFind').disabled=true;$('fccGeoClear').disabled=true;
    setStatus('Finding the address through the US Census Geocoder…');
    try{
      const json=await censusGeocode(value);
      const match=json?.result?.addressMatches?.[0];
      if(!match?.coordinates)throw Error('No matching street address. Include street number, city and state, or enter GPS coordinates instead.');
      const lat=Number(match.coordinates.y),lon=Number(match.coordinates.x);
      if(!validCoords(lat,lon))throw Error('Census did not return valid coordinates.');
      const label=String(match.matchedAddress||value);
      const st=String(match.addressComponents?.state||'').trim().toUpperCase();
      const geo=match.geographies||{};
      const countyRecord=geo.Counties?.[0]||geo.counties?.[0]||Object.entries(geo)
        .find(([key,items])=>/counties/i.test(key)&&Array.isArray(items)&&items.length)?.[1]?.[0];
      const county=String(countyRecord?.BASENAME||countyRecord?.NAME||'').trim();
      await useReference({lat,lon,label,state:/^[A-Z]{2}$/.test(st)?st:'',county});
    }catch(e){
      setStatus(`Address lookup unavailable: ${e.message}. Check your connection or enter GPS coordinates directly; saved FCC tower data still works offline.`,true);
    }finally{isLocating=false;$('fccGeoFind').disabled=false;$('fccGeoClear').disabled=false;}
  }
  $('fccGeoFind').addEventListener('click',findAddress);
  $('fccGeoInput').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();findAddress()}});
  $('fccGeoNearby').addEventListener('change',()=>{
    if(reference){fccRender();refreshDistanceView()}
  });
  $('fccCounty').addEventListener('change',()=>{
    // A manual county change means the operator is intentionally narrowing scope.
    if(reference&&$('fccGeoNearby').checked){
      $('fccGeoNearby').checked=false;
      fccRender();refreshDistanceView();
    }
  });
  $('fccGeoRadius').addEventListener('change',()=>{
    if(reference){fccRender();refreshDistanceView()}
    else setStatus('Enter an address or GPS coordinates, then click Find towers.');
  });
  $('fccGeoClear').addEventListener('click',()=>{
    reference=null;$('fccGeoInput').value='';$('fccGeoRadius').value='25';
    fccRender();fccRenderTowerSelection();
    setStatus('Distance comparison cleared. Enter another US address or GPS coordinates.');
  });
})();