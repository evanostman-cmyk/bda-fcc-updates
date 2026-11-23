(function kmzImportModule(){
 'use strict';
 if(document.getElementById('bwKmzPanel')||!document.getElementById('fccDialog'))return;
 const $=id=>document.getElementById(id);
 const MAX_FILE=25*1024*1024, MAX_KML=16*1024*1024, MAX_ITEMS=1500, MAX_VERTICES=40000;
 const section=document.createElement('section');section.id='bwKmzPanel';section.className='bw-kmz-panel';
 section.setAttribute('aria-label','Import Google Earth KMZ and KML placemarks');
 section.innerHTML=`
  <div class="bw-kmz-header"><div><strong>🌎 Import Google Earth KMZ / KML</strong>
   <p>Load a KMZ or KML to inspect point placemarks, routes and boundaries. Select an imported point as the reference site to find nearby FCC towers.</p></div><span class="fcc-pill">Local file · offline</span></div>
  <div class="bw-kmz-actions"><label for="bwKmzFile">Choose .kmz or .kml file</label>
    <input id="bwKmzFile" type="file" accept=".kmz,.kml,application/vnd.google-earth.kmz,application/vnd.google-earth.kml+xml"/>
    <button class="btn sm" type="button" id="bwKmzClear">Clear imported layer</button></div>
  <div id="bwKmzStatus" class="bw-kmz-status" role="status" aria-live="polite">No imported layer. Choose a KMZ or KML created by Google Earth or another GIS tool.</div>
  <div id="bwKmzView" class="bw-kmz-view" hidden>
   <div class="bw-kmz-caption">Coordinate overview (north up; no satellite imagery or basemap)</div>
   <svg id="bwKmzMap" viewBox="0 0 900 330" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Imported placemark coordinate overview"></svg>
   <div class="bw-kmz-summary" id="bwKmzSummary"></div>
   <div id="bwKmzList" class="bw-kmz-list"></div>
  </div>
  <p class="bw-kmz-caveat">Imported features are reference geography, not verified FCC transmitter records. Only KML coordinates and names are read locally; KMZ photos, 3D models and network-linked overlays are not loaded. Imported layers are cleared on refresh, and no file is uploaded.</p>`;
 const style=document.createElement('style');
 style.textContent=`
 .bw-kmz-panel{background:#f7faf5;border:1px solid #bedabf;border-radius:13px;padding:15px;display:grid;gap:11px;min-width:0}
 .bw-kmz-header{display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap}
 .bw-kmz-header strong{font-size:.96rem;color:#235b40}
 .bw-kmz-header p{font-size:.8rem;color:#52746a;margin:4px 0 0}
 .bw-kmz-actions{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
 .bw-kmz-actions label{font-size:.8rem;font-weight:700;color:#315f50}
 .bw-kmz-actions input{width:min(420px,100%);max-width:100%;background:white}
 .bw-kmz-status{font-size:.83rem;color:#355c53;font-weight:650;overflow-wrap:anywhere}
 .bw-kmz-status.error{color:#9b3429}
 .bw-kmz-caption{font-size:.76rem;color:#5d746b;margin:0 0 5px}
 .bw-kmz-view{min-width:0}
 #bwKmzMap{display:block;width:100%;height:auto;background:#eef5f2;border:1px solid #d2e1d8;border-radius:10px;max-height:360px}
 .bw-kmz-summary{font-size:.78rem;color:#315b4a;margin:9px 0}
 .bw-kmz-list{max-height:350px;overflow:auto;display:grid;gap:7px}
 .bw-kmz-item{border:1px solid #d6e6db;border-radius:9px;padding:9px;display:flex;gap:9px;justify-content:space-between;align-items:center;flex-wrap:wrap;background:white;min-width:0}
 .bw-kmz-item .name{font-size:.84rem;font-weight:750;color:#224d3b;overflow-wrap:anywhere;max-width:100%}
 .bw-kmz-item .meta{font-size:.72rem;color:#577a66}
 .bw-kmz-item .actions{display:flex;flex-wrap:wrap;gap:6px;align-items:center}
 .bw-kmz-item a{display:inline-flex;padding:8px 9px;border:1px solid #bed5c7;border-radius:8px;text-decoration:none;font-size:.76rem;font-weight:700;color:#175b48;background:#f0f8f3}
 .bw-kmz-caveat{font-size:.73rem;color:#58756a;line-height:1.45;margin:0}
 @media(max-width:640px){.bw-kmz-panel{padding:10px}.bw-kmz-actions input{flex:1 1 100%}.bw-kmz-item .actions{width:100%}}
 @media print{.bw-kmz-panel{display:none!important}}
 `;
 document.head.appendChild(style);
 ($('fccGeoPanel')||document.querySelector('.fcc-sitefinder-note'))?.insertAdjacentElement('afterend',section);
 const fileInput=$('bwKmzFile'),status=$('bwKmzStatus'),view=$('bwKmzView'),map=$('bwKmzMap'),list=$('bwKmzList');
 const NS='http://www.w3.org/2000/svg';
 let features=[];
 const setStatus=(s,err=false)=>{status.textContent=s;status.classList.toggle('error',err);};
 function textOf(el,tag){return el.getElementsByTagNameNS('*',tag)[0]?.textContent?.trim()||'';}
 function coordinates(value){
   const result=[];
   for(const token of String(value||'').trim().split(/\s+/)){
     const parts=token.split(',');if(parts.length<2)continue;
     const lon=Number(parts[0]),lat=Number(parts[1]);
     if(Number.isFinite(lon)&&Number.isFinite(lat)&&Math.abs(lon)<=180&&Math.abs(lat)<=90)result.push([lon,lat]);
     if(result.length>MAX_VERTICES)throw Error('Geometry has more than 40,000 vertices; simplify the source file before importing.');
   }
   return result;
 }
 function parseKml(raw){
   if(raw.length>MAX_KML)throw Error('KML exceeds the 16 MB text limit.');
   if(/<!\s*(?:DOCTYPE|ENTITY)\b/i.test(raw))throw Error('KML with document type or entity declarations is not supported.');
   const xml=new DOMParser().parseFromString(raw,'application/xml');
   if(xml.getElementsByTagName('parsererror').length)throw Error('KML is not well-formed XML.');
   const places=Array.from(xml.getElementsByTagNameNS('*','Placemark'));
   const parsed=[];let total=0;
   for(const p of places){
     const name=textOf(p,'name')||'Unnamed placemark';
     const geometries=[
       ...Array.from(p.getElementsByTagNameNS('*','Point')).map(g=>({kind:'Point',g})),
       ...Array.from(p.getElementsByTagNameNS('*','LineString')).map(g=>({kind:'Line',g})),
       ...Array.from(p.getElementsByTagNameNS('*','Polygon')).map(g=>({kind:'Polygon',g}))
     ];
     for(const {kind,g} of geometries){
       const line=textOf(g,'coordinates');const pts=coordinates(line);
       if((kind==='Point'&&pts.length<1)||(kind!=='Point'&&pts.length<2))continue;
       total+=pts.length;
       if(total>MAX_VERTICES)throw Error('Imported geometry exceeds the 40,000-vertex limit. Simplify it before importing.');
       parsed.push({name,kind,points:kind==='Point'?[pts[0]]:pts});
       if(parsed.length>=MAX_ITEMS)throw Error('KMZ has more than 1,500 placemark geometries. Split it into smaller files.');
     }
   }
   return parsed;
 }
 async function unzipKml(array){
   const bytes=new Uint8Array(array),dv=new DataView(array);
   if(bytes.length<22)throw Error('KMZ ZIP archive is incomplete.');
   let end=-1;
   for(let i=bytes.length-22;i>=Math.max(0,bytes.length-65557);i--){
     if(dv.getUint32(i,true)===0x06054b50){end=i;break;}
   }
   if(end<0)throw Error('Not a valid KMZ/ZIP archive (missing ZIP end record).');
   const count=dv.getUint16(end+10,true),cdSize=dv.getUint32(end+12,true),cdOffset=dv.getUint32(end+16,true);
   if(count===0xffff||cdOffset===0xffffffff||cdSize===0xffffffff)throw Error('ZIP64 KMZ archives are not supported.');
   if(count>2000||cdOffset+cdSize>bytes.length)throw Error('KMZ archive directory is invalid or too large.');
   let offset=cdOffset;const entries=[];
   for(let i=0;i<count;i++){
     if(offset+46>bytes.length||dv.getUint32(offset,true)!==0x02014b50)throw Error('Invalid KMZ ZIP directory entry.');
     const flags=dv.getUint16(offset+8,true),method=dv.getUint16(offset+10,true);
     const size=dv.getUint32(offset+20,true),expanded=dv.getUint32(offset+24,true);
     const nameLength=dv.getUint16(offset+28,true),extraLength=dv.getUint16(offset+30,true),commentLength=dv.getUint16(offset+32,true);
     const localOffset=dv.getUint32(offset+42,true),next=offset+46+nameLength+extraLength+commentLength;
     if(next>bytes.length)throw Error('KMZ directory filename extends past archive.');
     const name=new TextDecoder('utf-8',{fatal:false}).decode(bytes.subarray(offset+46,offset+46+nameLength));
     if(/\.kml$/i.test(name))entries.push({name,flags,method,size,expanded,localOffset});
     offset=next;
   }
   if(!entries.length)throw Error('The KMZ has no .kml document.');
   entries.sort((a,b)=>(/(^|\/)doc\.kml$/i.test(a.name)?0:1)-( /(^|\/)doc\.kml$/i.test(b.name)?0:1));
   let remaining=MAX_KML,documents=[];
   for(const e of entries.slice(0,5)){
     if(e.flags&1)throw Error('Encrypted KMZ entries are not supported.');
     if(e.size>MAX_FILE||e.expanded>remaining||e.expanded===0xffffffff)throw Error('KMZ KML exceeds the 16 MB decompressed limit.');
     const h=e.localOffset;
     if(h+30>bytes.length||dv.getUint32(h,true)!==0x04034b50)throw Error('Invalid KMZ local file record.');
     const start=h+30+dv.getUint16(h+26,true)+dv.getUint16(h+28,true);
     if(start+e.size>bytes.length)throw Error('KMZ KML entry is truncated.');
     const compressed=bytes.slice(start,start+e.size);
     let data;
     if(e.method===0)data=compressed;
     else if(e.method===8){
       if(typeof DecompressionStream!=='function')throw Error('This browser cannot decompress KMZ offline. Try current Chrome/Edge, or export plain KML.');
       let stream;
       try{stream=new Blob([compressed]).stream().pipeThrough(new DecompressionStream('deflate-raw'));}
       catch(e){throw Error('KMZ decompression unavailable. Try exporting as plain .kml.');}
       const reader=stream.getReader(),chunks=[];let length=0;
       while(true){
         const {done,value}=await reader.read();if(done)break;
         length+=value.byteLength;
         if(length>remaining){await reader.cancel();throw Error('KMZ decompressed KML exceeds size limit.');}
         chunks.push(value);
       }
       data=new Uint8Array(length);let at=0;for(const chunk of chunks){data.set(chunk,at);at+=chunk.length;}
     }else throw Error('Unsupported KMZ ZIP compression method '+e.method+'.');
     remaining-=data.length;
     documents.push(new TextDecoder('utf-8',{fatal:false}).decode(data));
   }
   return documents;
 }
 function svgEl(name,attrs){
   const el=document.createElementNS(NS,name);
   for(const [k,v] of Object.entries(attrs||{}))el.setAttribute(k,String(v));
   return el;
 }
 function showFeatures(){
   view.hidden=features.length===0;map.replaceChildren();list.replaceChildren();
   if(!features.length)return;
   const pts=features.flatMap(f=>f.points),lon=pts.map(p=>p[0]),lat=pts.map(p=>p[1]);
   const x0=Math.min(...lon),x1=Math.max(...lon),y0=Math.min(...lat),y1=Math.max(...lat);
   const cx=(x0+x1)/2,cy=(y0+y1)/2,sx=Math.max(x1-x0,0.00002),sy=Math.max(y1-y0,0.00002);
   const k=Math.min(820/sx,275/sy);
   const project=p=>[450+(p[0]-cx)*k,165-(p[1]-cy)*k];
   map.appendChild(svgEl('rect',{x:0,y:0,width:900,height:330,fill:'#eff7f1'}));
   for(let x=1;x<5;x++)map.appendChild(svgEl('line',{x1:x*180,y1:0,x2:x*180,y2:330,stroke:'#d6e5de','stroke-width':1}));
   for(let y=1;y<3;y++)map.appendChild(svgEl('line',{x1:0,y1:y*110,x2:900,y2:y*110,stroke:'#d6e5de','stroke-width':1}));
   for(const f of features){
     if(f.kind==='Point'){
       const [x,y]=project(f.points[0]);map.appendChild(svgEl('circle',{cx:x,cy:y,r:5,fill:'#0a7255',stroke:'white','stroke-width':1.7}));
     }else{
       const el=svgEl(f.kind==='Polygon'?'polygon':'polyline',{
         points:f.points.map(p=>project(p).map(n=>n.toFixed(2)).join(',')).join(' '),
         fill:f.kind==='Polygon'?'#69b28a40':'none',stroke:'#0b775e','stroke-width':2,'stroke-linejoin':'round'
       });map.appendChild(el);
     }
   }
   map.appendChild(svgEl('text',{x:850,y:22,fill:'#2b6150','font-size':16,'font-weight':700})).textContent='N ↑';
   const number=features.length,shown=Math.min(number,250);
   $('bwKmzSummary').textContent=number.toLocaleString()+' imported features • '+features.filter(f=>f.kind==='Point').length.toLocaleString()+' points • '+(number>shown?'Showing first '+shown+' entries below. ':'')+'Coordinates are shown without terrain or imagery.';
   for(const [i,f] of features.slice(0,250).entries()){
     const row=document.createElement('div');row.className='bw-kmz-item';
     const info=document.createElement('div'),name=document.createElement('div'),meta=document.createElement('div');
     name.className='name';name.textContent=f.name;meta.className='meta';
     const first=f.points[0];
     meta.textContent=f.kind+' · '+f.points.length+' vertices · '+first[1].toFixed(6)+', '+first[0].toFixed(6);
     info.append(name,meta);row.appendChild(info);
     const acts=document.createElement('div');acts.className='actions';
     const link=document.createElement('a');link.target='_blank';link.rel='noopener noreferrer';link.textContent='Map location';
     link.href='https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(first[1]+','+first[0]);
     acts.appendChild(link);
     if(f.kind==='Point'){
       const use=document.createElement('button');use.type='button';use.className='btn sm';use.textContent='📍 Use as site';
       use.addEventListener('click',()=>{
         const input=$('fccGeoInput'),find=$('fccGeoFind');
         if(!input||!find){setStatus('Site distance finder is unavailable.',true);return;}
         input.value=first[1].toFixed(7)+', '+first[0].toFixed(7);
         find.click();
         setStatus('Using “'+f.name+'” as the site reference. FCC tower distances and bearings will update.');
       });
       acts.appendChild(use);
     }
     row.appendChild(acts);list.appendChild(row);
   }
 }
 async function importFile(file){
   if(!file)return;
   if(file.size>MAX_FILE)throw Error('File is above the 25 MB upload limit. Simplify or split the KMZ.');
   setStatus('Reading '+file.name+' locally…');
   const kml=/\.kmz$/i.test(file.name)?await unzipKml(await file.arrayBuffer()):[/\.kml$/i.test(file.name)?await file.text():(()=>{throw Error('Choose a .kmz or .kml file.');})()];
   let all=[];
   for(const doc of kml)all.push(...parseKml(doc));
   if(all.length>MAX_ITEMS)throw Error('Too many imported placemarks; split the KMZ into smaller files.');
   if(!all.length)throw Error('No Point, LineString or Polygon coordinates found in this KMZ/KML.');
   features=all;showFeatures();
   setStatus('Loaded '+all.length.toLocaleString()+' features from '+file.name+'. Nothing has been uploaded.');
 }
 fileInput.addEventListener('change',async()=>{
   try{await importFile(fileInput.files?.[0]);}
   catch(e){features=[];showFeatures();setStatus('Import failed: '+e.message,true);}
   finally{fileInput.value='';}
 });
 $('bwKmzClear').addEventListener('click',()=>{features=[];showFeatures();setStatus('Imported KMZ layer cleared. FCC tower records are unchanged.');});
 window.BatwingKMZ=Object.freeze({version:'v1.12',getSummary:()=>({features:features.length,points:features.filter(f=>f.kind==='Point').length})});
})();