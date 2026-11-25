const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict'),{webcrypto,createHash}=require('node:crypto');
const html=fs.readFileSync(process.argv[2]||'site/index.html','utf8');
const full=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script\s*>/gi)].map(x=>x[1]).find(x=>x.includes("const FCC_HOSTED_DB="));
assert.ok(full,'Standalone FCC script not found');
const part=(a,b)=>{const start=full.indexOf(a),end=full.indexOf(b,start);assert.ok(start>=0&&end>start,'Missing FCC test boundary '+a);return full.slice(start,end)};
const nodes=new Map(),store=new Map(),requests=[];let active={};const byId=id=>{if(!nodes.has(id))nodes.set(id,{value:'',textContent:'',checked:true,style:{},addEventListener(){}});return nodes.get(id)};
const url='https://example.test/fcc/manifest.json';byId('fccHostedURL').value=url;
const c=vm.createContext({console,Date,URL,TextDecoder,Uint8Array,AbortController,crypto:webcrypto,setTimeout,clearTimeout,window:{},fetch:async(u,opt)=>{requests.push(u);if(active.fail)throw Error('network unavailable');const b=u.includes('manifest.json')?JSON.stringify(active.manifest):active.body;return new Response(b)},byId,location:{href:url,hostname:'example.test',pathname:'/fcc/'},localStorage:{setItem(){},getItem(){return null}},fccRefreshFilters(){},fccRender(){},fccNationOpen(){},fccNationTransaction(){},fccManualNationLoadState:async()=>{},fccNationStateRows:[],fccLoadedSource:null,fccNationLoadToken:0,fccFilter:{state:'FL'},fccNationMeta:null,fccPersistMode:'loading',FCC_STARTER:[{state:'FL',callsign:'STARTER'},{state:'GA',callsign:'STARTER'}],fccImported:[]});
// Coverage rendering now depends on the application's jurisdiction declaration.
// Read it from the exact HTML, rather than duplicating the list or disabling rendering.
const coverageGlobals=full.includes('const FCC_US_JURISDICTIONS=')?part('const FCC_US_JURISDICTIONS=','const FCC_DEFAULT_MANIFEST='):'';
vm.runInContext(coverageGlobals+part('function fccKey(r)','function fccFromStore()')+part("const FCC_HOSTED_DB=",'async function fccManualNationLoadState')+'\nfccHostedDBGet=async(store,key)=>__store.get(store+"|"+key);fccHostedDBPut=async(store,key,v)=>__store.set(store+"|"+key,v);fccHostedOpenDB=async()=>({close(){}});',Object.assign(c,{__store:store}));
const run=code=>vm.runInContext(code,c);const day=d=>new Date(Date.now()-d*864e5).toISOString();
function fixture(n,d=1,st='FL'){const body=JSON.stringify({format:'BDA-FCC-State-v1',state:st,records:Array.from({length:n},(_,i)=>({state:st,callsign:'TEST'+i,mhz:851.2+i*.0125,station:'FB2',county:'Pinellas'}))});return {body,manifest:{format:'BDA-FCC-Hosted-v1',generatedAt:day(d),recordCount:n,states:{FL:{file:'states/FL.json',records:n,bytes:Buffer.byteLength(body),sha256:createHash('sha256').update(body).digest('hex')}}}}}
let n=0;function check(name,value){assert.ok(value,name);console.log('PASS',++n,name)}
(async()=>{
 active=fixture(3,2);await run('fccHostedCheckNow()');check('fresh manifest and state download',run('fccNationStateRows.length===3 && fccHostedManifest.recordCount===3'));check('verified cache written',store.get('states|FL').rows.length===3);check('starter filtered for loaded state',run('fccAll().filter(r=>r.state==="FL").every(r=>r.callsign.startsWith("TEST"))'));
 if(coverageGlobals){
  check('real jurisdiction list and partial coverage warning',run('FCC_US_JURISDICTIONS.length===57')&&byId('fccNationwideStatus').textContent.includes('Missing required states:')&&byId('fccNationwideStatus').textContent.includes('GA'));
  check('coverage display reflects verified state records',byId('fccCoverageTitle').textContent.includes('FL: 3 state records loaded'));
 }
 const requestCount=requests.length;await run('fccNationLoadState("FL",false)');check('offline restore without network request',requests.length===requestCount&&run('fccNationStateRows.length===3'));
 active=fixture(4,1);active.body=active.body.slice(0,-1)+'!';await run('fccHostedCheckNow()');check('tampered bytes rejected; old state retained',run('fccNationStateRows.length===3 && fccLoadedSource.label.includes("Earlier")')&&byId('fccHostedStatus').textContent.includes('checksum'));
 active=fixture(4,1);await run('fccHostedCheckNow()');check('valid new state replaces prior state',run('fccNationStateRows.length===4')&&store.get('states|FL').rows.length===4);
 active=fixture(2,3);await run('fccHostedCheckNow()');check('older manifest rejected',byId('fccHostedStatus').textContent.includes('Older manifest')&&run('fccNationStateRows.length===4'));
 active=fixture(4,0);active.fail=true;await run('fccHostedCheckNow()');check('network failure keeps loaded records',run('fccNationStateRows.length===4'));
 active=fixture(4,0);active.manifest.states.FL.file='https://elsewhere.test/FL.json';await run('fccHostedCheckNow()');check('cross-origin state link rejected',byId('fccHostedStatus').textContent.includes('hosted with the manifest'));
 active=fixture(4,0);active.manifest.generatedAt='bad';await run('fccHostedCheckNow()');check('invalid timestamp rejected',byId('fccHostedStatus').textContent.includes('timestamp'));
 active=fixture(6,0);active.manifest.states.FL.bytes++;await run('fccHostedCheckNow()');check('wrong byte count rejected',byId('fccHostedStatus').textContent.includes('byte count')&&run('fccNationStateRows.length===4'));
 active=fixture(2,0,'GA');await run('fccHostedCheckNow()');check('wrong state payload rejected',byId('fccHostedStatus').textContent.includes('validation')&&run('fccNationStateRows.length===4'));
 active=fixture(5,0);await run('fccHostedCheckNow()');check('successful retry after bad updates',run('fccNationStateRows.length===5'));
 await run('fccHostedCacheAllStates()');check('bulk cache retains selected state and skips current file',byId('fccHostedCacheStatus').textContent.includes('1 already current')&&run('fccNationStateRows.length===5'));
 c.fetch=async(u,opt)=>new Response(new ReadableStream({start(controller){opt.signal.addEventListener('abort',()=>controller.error(new DOMException('aborted','AbortError')))}}));let timeout=false;try{await run('fccHostedFetch("https://example.test/slow",30)')}catch(e){timeout=e.message.includes('timed out')}check('body-stream timeout after headers',timeout);
 c.fetch=async()=>new Response('abcd');let tooBig=false;try{await run('fccHostedFetch("https://example.test/large",1000,3)')}catch(e){tooBig=e.message.includes('size limit')}check('stream size limit enforced',tooBig);
 console.log(n+' controlled tests passed');
})().catch(e=>{console.error(e);process.exitCode=1});
