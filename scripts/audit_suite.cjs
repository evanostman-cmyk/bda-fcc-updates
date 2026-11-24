(function batwingAuditSuite(){
 'use strict';
 const fs=require('node:fs'),assert=require('node:assert/strict'),zlib=require('node:zlib');
 const read=p=>fs.readFileSync(p,'utf8'),check=(ok,msg)=>assert.ok(ok,msg);
 const approx=(a,b,tol=1e-6)=>check(Number.isFinite(a)&&Math.abs(a-b)<tol,`Expected ${a} ≈ ${b}`);
 const source={
  index:read('index.html'),coverage:read('coverage_survey.js'),site:read('site_plan.js'),
  budget:read('link_budget.js'),uplink:read('uplink_gain.js'),
  path:read('rf_path.js'),smart:read('smart_site_plan.js'),
  kmz:read('kmz_import.js'),nav:read('workspace_pages.js'),
  workflow:read('.github/workflows/publish_fcc.yml')
 };
 let tests=0;
 const test=(name,fn)=>{try{fn();tests++;process.stdout.write('PASS '+name+'\n')}catch(e){process.stderr.write('FAIL '+name+': '+e.message+'\n');process.exitCode=1}};
 const extract=(source,start,end)=>{
   const i=source.indexOf(start),j=source.indexOf(end,i+start.length);
   assert.ok(i>=0&&j>i,'Source function boundaries not found: '+start);
   return source.slice(i,j);
 };
 // Pass one: all JavaScript and inline application scripts must compile.
 const names=['tower_distance.js','elevation_profile.js','link_budget.js','site_plan.js','uplink_gain.js','kmz_import.js','coverage_survey.js','workspace_pages.js','smart_site_plan.js','rf_path.js'];
 for(const name of names)test('Syntax '+name,()=>{new Function(read(name));check(source.index.includes('<script src="'+name+'"></script>'),'Missing HTML script '+name);check(source.workflow.includes('cp '+name+' site/'+name),'Missing deployment copy '+name)});
 test('Main application inline scripts syntax',()=>{
   for(const m of source.index.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)){
    if(/src\s*=/.test(m[1]))continue;
    new Function(m[2]);
   }
 });
 test('Site Finder and workspaces load order',()=>{
  check(source.index.indexOf('coverage_survey.js')<source.index.indexOf('workspace_pages.js'),'Coverage module must load before workspace');
  check(source.nav.includes("key:'coverage'"),'Coverage tab missing');
  check(source.nav.includes("key:'siteplan'"),'Site Plan tab missing');
  check(source.nav.includes("key:'uplink'"),'Uplink tab missing');
  check(source.index.includes('Batwing RF Suite v1.14'),'App version mismatch');
 });
 // Link Budget: independently confirm cascaded dBm/dBW/W math.
 const budgetFn=new Function(extract(source.budget,'function calculate(raw=st){','function save(){')+';return calculate;')();
 test('Link budget cascade and antenna EIRP',()=>{
   const b=budgetFn({sourceDbm:30,antennaGain:5,antennaUnit:'dBi',steps:[
    {id:'one',type:'loss',name:'Cable',db:3},{id:'two',type:'gain',name:'Gain',db:10}]});
   approx(b.finalConductedDbm,37);approx(b.finalEirpDbm,42);
   approx(b.net,7);approx(Math.pow(10,(b.finalConductedDbm-30)/10),5.0118723363,1e-5);
   check(b.rows.length===3,'Expected source+two checkpoints');
 });
 test('Link budget dBd conversion',()=>{
   const b=budgetFn({sourceDbm:30,antennaGain:3,antennaUnit:'dBd',steps:[]});
   approx(b.antennaDbi,5.15);approx(b.finalEirpDbm,35.15);
 });
 // Uplink: isolation ceiling and tower noise floor must override linear target.
 const valid=(x,min,max)=>x!==null&&Number.isFinite(x)&&x>=min&&x<=max;
 const uplinkFn=new Function('valid',extract(source.uplink,'function calculate(v){','const values=')+';return calculate;')(valid);
 const ulBase={current:60,rssi:-75,target:-65,isolation:90,margin:20,off:-120,on:-120,tolerance:0,input:-90,donorLoss:2,donorGain:8,maxOutput:0};
 test('Uplink gain RSSI and isolation',()=>{
   const r=uplinkFn(ulBase);approx(r.requested,70);approx(r.ceiling,70);approx(r.suggested,70);approx(r.predicted,-65);approx(r.headroom,20);
   approx(r.power.conducted,-20);approx(r.power.eirp,-14);
 });
 test('Uplink stops on tower noise increase',()=>{
   const r=uplinkFn({...ulBase,on:-119});
   check(r.noiseOk===false,'Noise rise must fail');check(r.suggested===null,'No suggested gain allowed');
   check(r.notes.some(s=>s.includes('STOP')),'Explicit STOP missing');
 });
 test('Uplink caps isolation and protects hardware',()=>{
   const r=uplinkFn({...ulBase,isolation:80,input:-20,maxOutput:0});
   approx(r.ceiling,60);approx(r.suggested,60);
   check(r.notes.some(s=>s.includes('limit')),'Expected limit warning');
 });
 test('Uplink does not silently validate missing noise readings',()=>{
   const r=uplinkFn({...ulBase,off:null,on:null});
   check(r.noiseOk===null&&r.notes.some(s=>s.includes('planning-only')),'Missing tower noise data must be a review');
 });
 // RF path: sample geometry, free-space loss and missing terrain.
 const rfFn=new Function('FT_PER_M','MI_TO_M','RE','C','inRange',extract(source.path,'function compute(profile,opt){','const fmt=')+';return compute;')(
   3.280839895,1609.344,6371000,299792458,valid);
 const rfOptions={siteAgl:80,towerAgl:80,freq:851,k:4/3,fraction:.6,txDbm:30,txGain:3,txLoss:2,rxGain:5,rxLoss:1,extraLoss:0,sensitivity:-100,direction:'site'};
 const rfProfile=feet=>({distanceMi:1,points:[{mi:0,ft:100},{mi:.5,ft:feet},{mi:1,ft:100}]});
 test('RF path clear terrain, FSPL and Fresnel',()=>{
   const r=rfFn(rfProfile(100),rfOptions);
   check(r.condition==='sampled-clear','Flat path should be sampled-clear');
   approx(r.fspl,95.18156890571927,1e-5);check(r.maxF1>35&&r.maxF1<45,'Unexpected first Fresnel radius');
   approx(r.rx,30+3-2-r.fspl+5-1);
 });
 test('RF path blocked terrain detected',()=>{
  const r=rfFn(rfProfile(400),rfOptions);
  check(r.condition==='terrain-obstructed','Hill must obstruct path');check(r.minClear<0,'Ground clearance expected negative');
 });
 test('RF path missing ground never marked clear',()=>{
  const r=rfFn(rfProfile(null),rfOptions);check(r.condition==='incomplete','Missing terrain must remain incomplete');
 });
 test('RF path zero distance rejected',()=>{
  const r=rfFn({distanceMi:0,points:[{mi:0,ft:0},{mi:0,ft:0}]},rfOptions);
  check(Boolean(r.error),'Coincident points should be rejected');
 });
 // Site Plan branch calculations from source, not hand-copied implementation.
 test('Site Plan balanced splitter and cable loss',()=>{
  const st={sourceDbm:30,referenceDbi:0,nodes:[
   {id:'tx',parent:null,type:'tx'},{id:'s',parent:'tx',type:'splitter',ports:2,excessDb:.4},
   {id:'p0',parent:'s',type:'port',portIndex:0},{id:'p1',parent:'s',type:'port',portIndex:1},
   {id:'c',parent:'p0',type:'cable',feet:100,lossPer100Ft:3},
   {id:'a',parent:'c',type:'antenna',gainDbi:5},
   {id:'b',parent:'p1',type:'antenna',gainDbi:3}]};
  const byId=id=>st.nodes.find(n=>n.id===id),children=id=>st.nodes.filter(n=>n.parent===id),num=(v,d=0)=>v!==''&&v!==null&&Number.isFinite(Number(v))?Number(v):d;
  const ev=new Function('st','byId','children','MAX','num',extract(source.site,'function evaluate(){','function nodePath(')+';return evaluate;')(st,byId,children,300,num);
  const results=ev().results;
  const portOutput=30-10*Math.log10(2)-.4;
  approx(results.get('p0').out,portOutput);
  approx(results.get('a').eirp,portOutput-3+5);
  approx(results.get('b').eirp,portOutput+3);
 });
 // Smart DAS: correct BOM grouping, critical warnings and user-entered limits.
 const safeNum=v=>v!==''&&v!==null&&v!==undefined&&Number.isFinite(Number(v))?Number(v):null;
 const review=new Function('safeNum',extract(source.smart,'function reviewData(plan,calc,settings){','let latest=')+';return reviewData;')(safeNum);
 test('Smart DAS catches branch, cable, equipment and EIRP errors',()=>{
   const plan={frequencyMHz:851,nodes:[
    {id:'tx',name:'TX',type:'tx',parent:null},
    {id:'s',name:'split',type:'splitter',parent:'tx',ports:2},
    {id:'p0',name:'Port 1',type:'port',parent:'s'},
    {id:'p1',name:'Port 2',type:'port',parent:'s'},
    {id:'c',name:'Coax',type:'cable',parent:'p0',feet:300,lossPer100Ft:6,specFrequencyMHz:450},
    {id:'a',name:'Antenna',type:'antenna',parent:'c',gainDbi:5,maxInputDbm:-10}]};
   const calc={tx:{input:30,out:30},s:{input:30,out:30},p0:{input:30,out:27},p1:{input:30,out:27},c:{input:27,out:9},a:{input:9,out:9,eirp:14}};
   const r=review(plan,calc,{minEirp:'10',maxEirp:'12',highCableLoss:'15'});
   check(r.antennaCount===1&&r.cableFt===300,'Wrong material counts');
   check(r.findings.some(f=>f.message.includes('unused')),'Unused port missed');
   check(r.findings.some(f=>f.message.includes('18.00 dB')),'Cable loss threshold missed');
   check(r.findings.some(f=>f.message.includes('exceeds rated input')),'Power rating violation missed');
   check(r.findings.some(f=>f.message.includes('exceeds user maximum')),'EIRP violation missed');
   check(r.findings.some(f=>f.message.includes('reference frequency')||f.message.includes('project frequency')),'Frequency mismatch missed');
 });
 // Coverage survey evaluation: untested and absent-AHJ-criteria can never pass.
 const metrics=['dlRssi','dlDaq','ulRssi','ulDaq'],
   spec={dlRssi:[-180,30],dlDaq:[0,5],ulRssi:[-180,30],ulDaq:[0,5]},
   savedCell=(f,r,c)=>f.cells[r+','+c]||{zone:'general',dlRssi:null,dlDaq:null,ulRssi:null,ulDaq:null,notes:''};
 const coverage=new Function('metrics','spec','savedCell',extract(source.coverage,'function rulesValid(project){','function renderHeader(){')+';return {rulesValid,statusFor,statsFor,summarize};')(metrics,spec,savedCell);
 const rec=(zone='general',dlRssi=-85,dlDaq=3.4,notes='')=>({zone,dlRssi,dlDaq,ulRssi:null,ulDaq:null,notes});
 const grid=(cells,rows=1,cols=3)=>({name:'Test floor',rows,cols,cells});
 const cov=(floors,thresholds={dlRssi:-95,dlDaq:3,ulRssi:null,ulDaq:null,generalPercent:95,criticalPercent:99},required={dlRssi:true,dlDaq:true,ulRssi:false,ulDaq:false})=>({floors,thresholds,required});
 const checkCov=(name,project,expected)=>test(name,()=>{const r=coverage.summarize(project);check(r.verdict===expected,`Expected ${expected}, got ${r.verdict}`);});
 checkCov('Coverage untested grids cannot pass',cov([grid({},1,3)]),'INCOMPLETE — TESTING REQUIRED');
 checkCov('Coverage complete general grids pass',cov([grid({'0,0':rec(),'0,1':rec(),'0,2':rec()})]),'MEETS CONFIGURED GRID CRITERIA');
 checkCov('Coverage failed readings lower pass fraction',cov([grid({'0,0':rec(),'0,1':rec('general',-103,3),'0,2':rec()})]),'DOES NOT MEET CONFIGURED GRID CRITERIA');
 checkCov('Coverage critical-only floor passes under critical criteria',cov([grid({'0,0':rec('critical'),'0,1':rec('critical'),'0,2':rec('critical')})]),'MEETS CONFIGURED GRID CRITERIA');
 checkCov('Coverage missing RSSI threshold never passes',cov([grid({'0,0':rec()},1,1)],{dlRssi:null,dlDaq:3,ulRssi:null,ulDaq:null,generalPercent:95,criticalPercent:99}),'CRITERIA NOT CONFIGURED');
 checkCov('Coverage documented exclusion is removed',cov([grid({'0,0':rec(),'0,1':rec('excluded',null,null,'Stairwell not in approved sampling'),'0,2':rec()})]),'MEETS CONFIGURED GRID CRITERIA');
 checkCov('Coverage undocumented exclusion remains incomplete',cov([grid({'0,0':rec(),'0,1':rec('excluded',null,null,''),'0,2':rec()})]),'INCOMPLETE — TESTING REQUIRED');
 checkCov('Coverage missing uplink sample remains incomplete',cov([grid({'0,0':rec()},1,1)],{dlRssi:-95,dlDaq:3,ulRssi:-85,ulDaq:null,generalPercent:95,criticalPercent:99},{dlRssi:true,dlDaq:true,ulRssi:true,ulDaq:false}),'INCOMPLETE — TESTING REQUIRED');
 checkCov('Coverage checks each floor independently',cov([grid({'0,0':rec()},1,1),grid({'0,0':rec('general',-115,3.5)},1,1)]),'DOES NOT MEET CONFIGURED GRID CRITERIA');
 test('Coverage autosaves before switching squares',()=>{check(source.coverage.includes('function commitPendingCell()'),'Field edit guard missing');check(source.coverage.includes("button.addEventListener('click',()=>{if(st.selected!==cellKey(row,col)&&!commitPendingCell())return;"),'Grid click should save unsaved readings');});
 // KMZ ZIP stored and deflated document extraction (no external library).
 const unzip=new Function('MAX_KML','MAX_FILE','TextDecoder','Blob','DecompressionStream',extract(source.kmz,'async function unzipKml(array){','function svgEl(')+';return unzipKml;')(
   16*1024*1024,25*1024*1024,TextDecoder,Blob,globalThis.DecompressionStream);
 function zipTest(data,method=0){
   const name=Buffer.from('doc.kml'),body=method===8?zlib.deflateRawSync(Buffer.from(data)):Buffer.from(data);
   const size=30+name.length+body.length,dir=46+name.length,buf=Buffer.alloc(size+dir+22);
   buf.writeUInt32LE(0x04034b50,0);buf.writeUInt16LE(20,4);buf.writeUInt16LE(method,8);buf.writeUInt32LE(body.length,18);
   buf.writeUInt32LE(Buffer.byteLength(data),22);buf.writeUInt16LE(name.length,26);
   name.copy(buf,30);body.copy(buf,30+name.length);
   let p=size;buf.writeUInt32LE(0x02014b50,p);buf.writeUInt16LE(20,p+4);buf.writeUInt16LE(20,p+6);
   buf.writeUInt16LE(method,p+10);buf.writeUInt32LE(body.length,p+20);buf.writeUInt32LE(Buffer.byteLength(data),p+24);
   buf.writeUInt16LE(name.length,p+28);name.copy(buf,p+46);
   p+=dir;buf.writeUInt32LE(0x06054b50,p);buf.writeUInt16LE(1,p+8);buf.writeUInt16LE(1,p+10);
   buf.writeUInt32LE(dir,p+12);buf.writeUInt32LE(size,p+16);
   return buf.buffer.slice(buf.byteOffset,buf.byteOffset+buf.byteLength);
 }
 const kml='<kml><Placemark><name>Test</name><Point><coordinates>-82.640,27.77,0</coordinates></Point></Placemark></kml>';
 const asyncTests=async()=>{
  for(const [label,method] of [['KMZ stored entry',0],['KMZ deflate entry',8]]){
   try{const decoded=await unzip(zipTest(kml,method));check(decoded.length===1&&decoded[0]===kml,'KMZ extraction mismatch');tests++;process.stdout.write('PASS '+label+'\n');}
   catch(e){process.exitCode=1;process.stderr.write('FAIL '+label+': '+e.stack+'\n');}
  }
  console.log('\nBatwing double audit: '+tests+' checks passed. '+(process.exitCode?'FAILURES DETECTED':'No test failures.'));
 };
 asyncTests().catch(e=>{process.stderr.write(e.stack+'\n');process.exitCode=1});
})();