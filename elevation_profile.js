/* BDA Channel Planner v1.4 — interactive FCC tower terrain-elevation profiles.
 * No location data is sent until the user requests a profile.
 * Sources: Open Topo Data (USGS NED ~10 m where covered, 80 samples)
 * and fallback official USGS EPQS/3DEP point service (21 samples).
 * Terrain is NOT RF line-of-sight, Fresnel, vegetation, or obstruction clearance.
 */
(() => {
  'use strict';
  if (typeof fccRenderSiteCards !== 'function' || typeof fccSiteGroups !== 'function' || !document.getElementById('fccSiteCards')) return;
  const $ = id => document.getElementById(id);
  const KM_TO_MI = 0.6213711922373;
  const FT_PER_M = 3.280839895;
  const TAU = Math.PI * 2;
  const CACHE_KEY = 'BDA_TERRAIN_PROFILE_CACHE_v1.4';
  const MAX_CACHE = 24;
  let current = null;
  let activeRequest = null;
  let requestSeq = 0;
  const style = document.createElement('style');
  style.textContent = `
    .bda-elev-action{border:1px solid #b7cfda!important;background:#f2f9fd!important;color:#135270!important;white-space:nowrap}
    .bda-elev-action:hover{background:#e1f2fa!important}
    .bda-elev-chip{background:transparent;border:1px solid #bad0dd;border-radius:6px;font-size:.7rem;padding:2px 6px;color:#174e66;cursor:pointer;white-space:nowrap}
    #fccElevationDialog{box-sizing:border-box;width:min(980px,calc(100vw - 30px));max-width:980px;max-height:min(92vh,1000px);padding:0;border:0;border-radius:18px;background:#fff;color:#173b4d;box-shadow:0 25px 90px #001b309c;overflow:auto}
    #fccElevationDialog::backdrop{background:#00192cd6}
    .bda-elev-head{background:linear-gradient(110deg,#103751,#175b73);color:#fff;display:flex;align-items:flex-start;justify-content:space-between;gap:16px;padding:19px 23px}
    .bda-elev-head h3{color:#fff;margin:0 0 5px;font-size:1.25rem;line-height:1.25}
    .bda-elev-head small{font-size:.82rem;color:#c4e4ed;line-height:1.4}
    .bda-elev-close{border:1px solid #a4ceda!important;border-radius:8px;padding:5px 10px;background:transparent!important;color:#fff!important;cursor:pointer;font-size:1rem}
    .bda-elev-body{padding:20px 23px;display:grid;gap:15px}
    .bda-elev-status{font-size:.89rem;color:#20516a;min-height:1.5em;line-height:1.5}
    .bda-elev-status.bda-elev-error{color:#b02127}
    .bda-elev-summary{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px}
    .bda-elev-metric{border:1px solid #d5e5eb;border-radius:10px;background:#f4fafc;padding:12px 14px}
    .bda-elev-metric small{font-size:.68rem;color:#516b79;display:block;margin-bottom:4px;letter-spacing:.02em}
    .bda-elev-metric strong{font-size:1.19rem;font-variant-numeric:tabular-nums}
    .bda-elev-chart-box{border:1px solid #d2e3e9;border-radius:13px;padding:8px;background:#fcfeff;min-height:280px}
    .bda-elev-chart-box svg{width:100%;max-height:370px;display:block}
    .bda-elev-hover{font-size:.85rem;font-weight:650;min-height:1.4em;color:#1f5e7d;margin:4px 12px}
    .bda-elev-buttons{display:flex;gap:9px;flex-wrap:wrap}
    .bda-elev-buttons button{padding:9px 14px;border-radius:7px;cursor:pointer;border:1px solid #b7cfdc;background:#eaf3f8;color:#14516b;font-weight:700}
    .bda-elev-buttons button:disabled{opacity:.5;cursor:not-allowed}
    .bda-elev-note{font-size:.78rem;line-height:1.55;color:#526c78;margin:0}
    .bda-elev-note strong{color:#254c5e}
    @media(max-width:670px){.bda-elev-summary{grid-template-columns:repeat(2,minmax(0,1fr))}.bda-elev-head{padding:13px 15px}.bda-elev-body{padding:13px}.bda-elev-metric{padding:8px}.bda-elev-metric strong{font-size:1.05rem}}
  `;
  document.head.appendChild(style);
  const dlg = document.createElement('dialog');
  dlg.id = 'fccElevationDialog';
  dlg.setAttribute('aria-label', 'Terrain elevation between site and FCC tower');
  dlg.innerHTML = `<div class="bda-elev-head"><div><h3>⛰ Terrain Elevation Profile <span style="font-size:.72em;opacity:.7">v1.4</span></h3>
    <small id="bdaElevSubtitle">Site address → FCC licensed transmitter location</small></div>
    <button type="button" class="bda-elev-close" id="bdaElevClose" aria-label="Close elevation profile">✕</button></div>
    <div class="bda-elev-body">
      <div id="bdaElevStatus" class="bda-elev-status" role="status" aria-live="polite">Choose a mapped tower and site address.</div>
      <div id="bdaElevMetrics" class="bda-elev-summary" hidden>
        <div class="bda-elev-metric"><small>STRAIGHT-LINE DISTANCE</small><strong id="bdaElevDistance">—</strong></div>
        <div class="bda-elev-metric"><small>SITE GROUND ELEVATION</small><strong id="bdaElevSite">—</strong></div>
        <div class="bda-elev-metric"><small>TOWER GROUND ELEVATION</small><strong id="bdaElevTower">—</strong></div>
        <div class="bda-elev-metric"><small>HIGHEST SAMPLED GROUND</small><strong id="bdaElevMax">—</strong></div>
      </div>
      <div id="bdaElevChart" class="bda-elev-chart-box" aria-label="Terrain elevation chart">Terrain data is requested only when you click a tower profile.</div>
      <div id="bdaElevHover" class="bda-elev-hover" aria-live="off"></div>
      <div class="bda-elev-buttons">
        <button type="button" id="bdaElevKML" disabled>🌎 Export path KML</button>
        <button type="button" id="bdaElevCSV" disabled>⬇ Export profile CSV</button>
        <button type="button" id="bdaElevReload" disabled>↻ Refresh elevations</button>
      </div>
      <p class="bda-elev-note" id="bdaElevSource">Source and sample count will appear when terrain data loads.</p>
      <p class="bda-elev-note"><strong>Engineering note:</strong> This chart shows sampled <em>ground terrain</em> only. It does not include the transmitter antenna AGL, building receiver antenna height, trees, buildings, Earth-curvature effects, Fresnel-zone clearance or actual RF propagation. FCC coordinates indicate a licensed location, not guaranteed active P25 transmission. Internet is required for new profiles; previously loaded profiles may work offline from this browser's cache.</p>
    </div>`;
  document.body.appendChild(dlg);
  const status = (msg, isError = false) => { $('bdaElevStatus').textContent = msg; $('bdaElevStatus').classList.toggle('bda-elev-error', isError); };
  $('bdaElevClose').addEventListener('click', () => dlg.close());
  dlg.addEventListener('click', evt => { if (evt.target === dlg) dlg.close(); });
  dlg.addEventListener('close', () => { if (activeRequest) activeRequest.abort(); ++requestSeq; });
  const clean = x => String(x || '').replace(/[^A-Za-z0-9_\-]+/g, '_').slice(0,65) || 'Tower';
  const xml = x => String(x ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
  const valid = (lat, lon) => Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180 && !(lat === 0 && lon === 0);
  const degrees = Math.PI / 180;
  const toVector = (lat, lon) => [Math.cos(lat * degrees) * Math.cos(lon * degrees), Math.cos(lat * degrees) * Math.sin(lon * degrees), Math.sin(lat * degrees)];
  function greatCircleSamples(start, end, count) {
    const v = toVector(start.lat, start.lon), w = toVector(end.lat, end.lon);
    const cos = Math.max(-1, Math.min(1, v.reduce((sum, x, i) => sum + x * w[i], 0)));
    const angle = Math.acos(cos), sin = Math.sin(angle);
    return Array.from({length: count}, (_, i) => {
      const t = i / (count - 1), a = angle < 1e-8 || Math.abs(sin) < 1e-10 ? 1 - t : Math.sin((1 - t) * angle) / sin;
      const b = angle < 1e-8 || Math.abs(sin) < 1e-10 ? t : Math.sin(t * angle) / sin;
      const p = v.map((x, j) => a * x + b * w[j]);
      return {lat: Math.atan2(p[2], Math.hypot(p[0], p[1])) / degrees,
        lon: Math.atan2(p[1], p[0]) / degrees, mi: 0, ft: null};
    });
  }
  function pathMiles(a, b) {
    const dot = toVector(a.lat, a.lon).reduce((v, x, i) => v + x * toVector(b.lat, b.lon)[i], 0);
    return 3958.7613 * Math.acos(Math.max(-1, Math.min(1, dot)));
  }
  function loadCache() { try {return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}') || {};} catch (_) {return {};} }
  function cacheKey(a, b) { return [a.lat, a.lon, b.lat, b.lon].map(x => Number(x).toFixed(4)).join('|'); }
  function saveCache(key, value) {
    try {
      const cache = loadCache(); cache[key] = {...value, savedAt: Date.now()};
      const entries = Object.entries(cache).sort((a,b) => (b[1].savedAt||0) - (a[1].savedAt||0)).slice(0, MAX_CACHE);
      localStorage.setItem(CACHE_KEY, JSON.stringify(Object.fromEntries(entries)));
    } catch (_) { /* Browser storage is optional; online profile still works. */ }
  }
  function ref() {return typeof window.BDA_TowerDistance?.getReference === 'function' ? window.BDA_TowerDistance.getReference() : null;}
  function attachButton(parent, dest, chip = false) {
    if (!dest || !valid(Number(dest.lat), Number(dest.lon))) return;
    const btn = document.createElement('button'); btn.type = 'button';
    btn.className = chip ? 'bda-elev-chip' : 'btn sm bda-elev-action';
    btn.textContent = chip ? '⛰ Profile' : '⛰ Elevation profile';
    btn.title = 'Show the terrain elevation between your selected site address and this FCC licensed tower';
    btn.addEventListener('click', e => { e.stopPropagation(); openProfile(dest); });
    parent.appendChild(btn);
  }
  const priorCards = fccRenderSiteCards;
  fccRenderSiteCards = function (...args) {
    const result = priorCards.apply(this, args);
    const root = $('fccSiteCards'); if (!root) return result;
    const groups = fccSiteGroups();
    const display = $('fccMapOnly')?.checked ? groups.filter(g => g.records.some(rec => fccCoordinates(rec))) : groups;
    const cards = root.querySelectorAll('.fcc-site-card');
    cards.forEach((card, i) => {
      const g = display[i]; if (!g) return;
      const mapped = typeof fccMappedTower === 'function' ? fccMappedTower(g) : null;
      const actions = card.querySelector('.fcc-site-actions');
      if (actions && mapped) attachButton(actions, mapped);
    });
    return result;
  };
  const priorSelection = fccRenderTowerSelection;
  fccRenderTowerSelection = function (...args) {
    const result = priorSelection.apply(this, args);
    const chips = [...document.querySelectorAll('#fccSelectedTowerList .fcc-tower-chip')];
    [...fccTowerSelection.values()].slice(0, 75).forEach((tower, i) => {if (chips[i]) attachButton(chips[i], tower, true);});
    return result;
  };
  async function fetchWithTimeout(url, signal, timeout = 25000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    const handleAbort = () => controller.abort();
    signal.addEventListener('abort', handleAbort, {once: true});
    try {const response = await fetch(url, {signal: controller.signal, cache: 'no-store', mode: 'cors'});
      if (!response.ok) throw Error(`Elevation service returned HTTP ${response.status}`);
      return await response.json();
    } finally {clearTimeout(timer);signal.removeEventListener('abort', handleAbort);}
  }
  async function topoData(start, end, distanceMi, signal) {
    const url = new URL('https://api.opentopodata.org/v1/ned10m,srtm90m');
    url.searchParams.set('locations', `${start.lat.toFixed(6)},${start.lon.toFixed(6)}|${end.lat.toFixed(6)},${end.lon.toFixed(6)}`);
    url.searchParams.set('samples', '80');
    url.searchParams.set('interpolation', 'bilinear');
    const result = await fetchWithTimeout(url.href, signal, 13000);
    if (result.status !== 'OK' || !Array.isArray(result.results) || result.results.length !== 80) throw Error('Terrain sampling unavailable from Open Topo Data');
    const points = result.results.map((row, i) => ({
      lat: Number(row.location?.lat), lon: Number(row.location?.lng), mi: distanceMi * i/79,
      ft: Number.isFinite(Number(row.elevation)) && row.elevation !== null ? Number(row.elevation)*FT_PER_M : null
    }));
    if (points.filter(x => Number.isFinite(x.ft)).length < 8 || points.some(x => !valid(x.lat, x.lon))) throw Error('Incomplete terrain coverage');
    return {points, source: 'Open Topo Data · USGS NED ~10 m / SRTM ~90 m fallback', resolution: '80 evenly spaced samples'};
  }
  async function usgsFallback(start, end, distanceMi, signal, seq) {
    const points = greatCircleSamples(start, end, 21);
    points.forEach((p, i) => {p.mi = distanceMi * i / 20;});
    let completed = 0, next = 0;
    const workers = Array.from({length: 3}, async () => {
      while(next < points.length && !signal.aborted) {
        const i = next++, p = points[i];
        const url = new URL('https://epqs.nationalmap.gov/v1/json');
        url.searchParams.set('x', p.lon.toFixed(6)); url.searchParams.set('y', p.lat.toFixed(6));
        url.searchParams.set('wkid', '4326'); url.searchParams.set('units', 'Feet'); url.searchParams.set('includeDate', 'false');
        try {
          const data = await fetchWithTimeout(url.href, signal, 20000);
          const val = Number(data.value);
          if (data.value !== null && data.value !== undefined && data.value !== '' && Number.isFinite(val)) p.ft = val;
        } catch (error) {if (signal.aborted) break;}
        completed++;
        if (seq === requestSeq && dlg.open) status(`Loading USGS 3DEP ground elevations… ${completed}/${points.length} samples`);
      }
    });
    await Promise.all(workers);
    if (signal.aborted) throw Error('Request cancelled');
    if (points.filter(p => Number.isFinite(p.ft)).length < 6) throw Error('USGS elevation service could not return enough terrain samples. Check internet access or try again.');
    return {points, source: 'USGS 3DEP / The National Map (EPQS)', resolution: '21 points along great-circle path'};
  }
  function ftLabel(x) {return Number.isFinite(x) ? `${Math.round(x).toLocaleString()} ft` : 'Not available';}
  function drawProfile(data, distanceMi) {
    const chart = $('bdaElevChart'); chart.replaceChildren();
    const points = data.points, vals = points.map(p => p.ft).filter(Number.isFinite);
    let low = Math.min(...vals), high = Math.max(...vals);
    const span = Math.max(60, high - low);
    low = Math.floor((low - span*.11)/25)*25;high = Math.ceil((high + span*.11)/25)*25;
    if (high <= low) high = low + 100;
    const W = 900, H = 310, L = 64, R = 16, T = 26, B = 45, plotW = W-L-R, plotH = H-T-B;
    const x = i => L + (i/(points.length - 1))*plotW;
    const y = ft => T + (high-ft)/(high-low)*plotH;
    const segments = []; let segment=[];
    points.forEach((p,i) => {if(Number.isFinite(p.ft)) segment.push({x:x(i), y:y(p.ft)});else if(segment.length){segments.push(segment);segment=[];}});
    if(segment.length)segments.push(segment);
    let drawing = `<defs><linearGradient id="bdaTerrainFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#79b6c9" stop-opacity=".55"/><stop offset="1" stop-color="#d4e7ec" stop-opacity=".3"/></linearGradient></defs>`;
    for(let tick=0;tick<=4;tick++){
      const val=low+(high-low)*tick/4, yy=y(val);
      drawing+=`<line x1="${L}" y1="${yy.toFixed(2)}" x2="${(W-R)}" y2="${yy.toFixed(2)}" stroke="#e3ebef" stroke-width="1"/><text x="${L-9}" y="${(yy+4).toFixed(2)}" text-anchor="end" fill="#566e79" font-size="14">${Math.round(val).toLocaleString()}</text>`;
    }
    for(let i=0;i<=4;i++){
      const xx=L+plotW*i/4;
      drawing+=`<text x="${xx.toFixed(2)}" y="${H-15}" text-anchor="${i===0?'start':i===4?'end':'middle'}" fill="#526b79" font-size="14">${(distanceMi*i/4).toFixed(distanceMi<10?2:1)} mi</text>`;
    }
    for(const seg of segments){
      const path = seg.map((p,i)=>(i?'L':'M')+p.x.toFixed(2)+','+p.y.toFixed(2)).join(' ');
      if(seg.length>1)drawing+=`<path d="${path} L ${seg.at(-1).x.toFixed(2)},${(H-B).toFixed(2)} L ${seg[0].x.toFixed(2)},${(H-B).toFixed(2)} Z" fill="url(#bdaTerrainFill)"/>`;
      drawing+=`<path d="${path}" fill="none" stroke="#1575a1" stroke-width="3.6" stroke-linejoin="round" stroke-linecap="round"/>`;
    }
    if(points.length){for(const i of [0,points.length-1]){if(Number.isFinite(points[i].ft))drawing+=`<circle cx="${x(i)}" cy="${y(points[i].ft)}" r="5" fill="${i===0?'#f1aa40':'#1a81ae'}" stroke="#fff" stroke-width="2"/>`;}}
    drawing+=`<text x="${L}" y="15" fill="#476272" font-size="13" font-weight="700">GROUND ELEVATION (FT)</text>`;
    drawing+=`<line id="bdaElevCursor" x1="0" x2="0" y1="${T}" y2="${H-B}" stroke="#b88316" stroke-width="1.5" stroke-dasharray="5 4" visibility="hidden"/>`;
    const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
    svg.setAttribute('viewBox',`0 0 ${W} ${H}`);svg.setAttribute('role','img');
    svg.setAttribute('aria-label',`Terrain elevation profile for ${distanceMi.toFixed(2)} miles. Site ${ftLabel(points[0]?.ft)}; tower ${ftLabel(points.at(-1)?.ft)}. ${data.source}.`);
    svg.innerHTML=drawing;chart.appendChild(svg);
    const info=$('bdaElevHover');
    svg.addEventListener('pointermove',e=>{
      const rect=svg.getBoundingClientRect();const pos=(e.clientX-rect.left)/Math.max(1,rect.width)*W;
      const i=Math.max(0,Math.min(points.length-1,Math.round((pos-L)/plotW*(points.length-1))));const p=points[i];
      info.textContent=`${p.mi.toFixed(2)} mi from site · terrain: ${ftLabel(p.ft)} · ${p.lat.toFixed(5)}, ${p.lon.toFixed(5)}`;
      const line=svg.querySelector('#bdaElevCursor'); line.setAttribute('x1',x(i));line.setAttribute('x2',x(i));line.setAttribute('visibility','visible');
    });
    svg.addEventListener('pointerleave',()=>{info.textContent='Move over the terrain curve to inspect a sampled point.';svg.querySelector('#bdaElevCursor').setAttribute('visibility','hidden');});
    info.textContent='Move over the terrain curve to inspect a sampled point.';
  }
  function updateView(profile, cached = false) {
    if(!profile) return;
    const vals=profile.points.map(x=>x.ft).filter(Number.isFinite);
    if(!vals.length)return;
    const first=profile.points[0],last=profile.points.at(-1);
    $('bdaElevMetrics').hidden=false;
    $('bdaElevDistance').textContent=`${profile.distanceMi.toFixed(2)} mi`;
    $('bdaElevSite').textContent=ftLabel(first.ft);$('bdaElevTower').textContent=ftLabel(last.ft);
    $('bdaElevMax').textContent=ftLabel(Math.max(...vals));
    $('bdaElevSource').textContent=`Terrain source: ${profile.source} · ${profile.resolution} · ${vals.length}/${profile.points.length} samples with elevations. ${cached?'Previously saved profile loaded from your browser cache.':''} Samples approximate ground elevation; gaps indicate missing data. Credit: U.S. Geological Survey / Open Topo Data as applicable.`;
    drawProfile(profile, profile.distanceMi);
    for(const name of ['bdaElevKML','bdaElevCSV','bdaElevReload'])$(name).disabled=false;
    status(cached?'Cached terrain profile loaded (works offline).':'Terrain profile loaded. Use the chart or export the route.');
  }
  async function openProfile(tower, reload=false) {
    if (!tower || !valid(Number(tower.lat), Number(tower.lon))) return;
    const a=ref();
    if (!a || !valid(Number(a.lat),Number(a.lon))) {
      alert('First enter a job-site address or latitude, longitude in “Distance from a site address to FCC towers”, then click Find towers.');
      $('fccGeoInput')?.focus();return;
    }
    if(activeRequest)activeRequest.abort();
    const controller=new AbortController();activeRequest=controller;const seq=++requestSeq;
    const start={lat:Number(a.lat),lon:Number(a.lon)},end={lat:Number(tower.lat),lon:Number(tower.lon)};
    const distanceMi=pathMiles(start,end);
    const key=cacheKey(start,end);
    current={start,end,siteLabel:String(a.label||'Job site'),tower:{...tower},key,profile:null,distanceMi};
    $('bdaElevSubtitle').textContent=`${current.siteLabel} → ${tower.callsign||'Tower'} · ${tower.site||tower.city||''} · ${distanceMi.toFixed(2)} mi`;
    $('bdaElevMetrics').hidden=true;for(const name of ['bdaElevKML','bdaElevCSV','bdaElevReload'])$(name).disabled=true;
    $('bdaElevChart').textContent='Loading terrain elevations…';$('bdaElevHover').textContent='';
    $('bdaElevSource').textContent='Open Topo Data / USGS. Terrain sampling requires internet unless this route is already cached.';
    if(!dlg.open)dlg.showModal();
    const cached= !reload ? loadCache()[key] : null;
    if(cached?.points?.length>5){current.profile=cached; updateView(cached,true);return;}
    status('Fetching terrain profile…');
    try {
      let result;
      try {result = await topoData(start,end,distanceMi,controller.signal);}
      catch(err) {
        if(controller.signal.aborted)return;
        status('Detailed terrain service unavailable; using official USGS 3DEP fallback (21 samples)…');
        result = await usgsFallback(start,end,distanceMi,controller.signal,seq);
      }
      if(controller.signal.aborted || seq!==requestSeq || !dlg.open)return;
      const profile={...result,distanceMi};
      current.profile=profile; saveCache(key,profile);updateView(profile);
    }catch(err){if(controller.signal.aborted || seq!==requestSeq)return;
      $('bdaElevChart').textContent='Terrain profile unavailable for this route. Your existing tower distance and map links still work.';
      status(`Elevation lookup failed: ${err.message||'Unknown network error'}. Internet access is required for new routes.`,true);
      $('bdaElevReload').disabled=false;
    }
  }
  const download=(name,type,body)=>{
    const blob=new Blob([body],{type}),url=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=url;a.download=name;a.style.display='none';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),3000);
  };
  $('bdaElevReload').addEventListener('click',()=>{if(current)openProfile(current.tower,true);});
  $('bdaElevCSV').addEventListener('click',()=>{
    const c=current;if(!c?.profile)return;
    const rows=['distance_miles,latitude,longitude,terrain_elevation_ft,source'];
    const source=JSON.stringify(c.profile.source);
    for(const p of c.profile.points)rows.push(`${p.mi.toFixed(4)},${p.lat.toFixed(7)},${p.lon.toFixed(7)},${Number.isFinite(p.ft)?p.ft.toFixed(2):''},${source}`);
    download(`FCC_Terrain_${clean(c.tower.callsign)}_v1.4.csv`,'text/csv;charset=utf-8',rows.join('\r\n'));
  });
  $('bdaElevKML').addEventListener('click',()=>{
    const c=current;if(!c?.profile)return;
    const coords=c.profile.points.map(p=>`${p.lon.toFixed(7)},${p.lat.toFixed(7)},0`).join(' ');
    const placemarks=`<Placemark><name>${xml('Job site: '+c.siteLabel)}</name><Point><coordinates>${c.start.lon},${c.start.lat},0</coordinates></Point></Placemark>`+
      `<Placemark><name>${xml('FCC transmitter: '+c.tower.callsign)}</name><description>${xml(c.tower.licensee||'')}</description><Point><coordinates>${c.end.lon},${c.end.lat},0</coordinates></Point></Placemark>`+
      `<Placemark><name>Site-to-tower terrain path</name><description>Great-circle ground path. Not an RF path or Fresnel clearance model.</description><Style><LineStyle><color>ff00b0fb</color><width>3</width></LineStyle></Style><LineString><tessellate>1</tessellate><altitudeMode>clampToGround</altitudeMode><coordinates>${coords}</coordinates></LineString></Placemark>`;
    const kml=`<?xml version="1.0" encoding="UTF-8"?><kml xmlns="http://www.opengis.net/kml/2.2"><Document><name>${xml('Elevation route to '+c.tower.callsign)}</name>${placemarks}</Document></kml>`;
    download(`FCC_Path_${clean(c.tower.callsign)}_v1.4.kml`,'application/vnd.google-earth.kml+xml;charset=utf-8',kml);
  });
  // Public diagnostic interface: does not reveal or persist current job-site address.
  window.BDA_ElevationProfile = Object.freeze({openTower:openProfile,version:'v1.4'});
})();
