/* Batwing RF Suite v1.11 — persistent workspace pages.
   The three main tools are full inline pages, not dismissible modal dialogs.
   Small task-specific dialogs (antenna editor, elevation profile, mascot) remain modal. */
(() => {
 'use strict';
 if (document.getElementById('bwWorkspaceNav')) return;
 const $ = id => document.getElementById(id);
 const main = document.querySelector('main');
 const bar = document.querySelector('.topbar');
 const definitions = [
  {key:'planner', label:'Channel Planner', glyph:'▤', node:main, source:null},
  {key:'fcc', label:'P25 Site Finder', glyph:'⌕', node:$('fccDialog'), source:'fccOpenTop'},
  {key:'budget', label:'Link Budget', glyph:'⚡', node:$('linkBudgetDialog'), source:'linkBudgetTop'},
  {key:'siteplan', label:'Site Plan', glyph:'🗺', node:$('bdaSitePlanDialog'), source:'bdaSitePlanTop'}
 ];
 if (!bar || !main || definitions.some(x => !x.node)) {
  console.warn('Batwing workspace: one or more tools are missing; retaining original navigation.');
  return;
 }
 const css = document.createElement('style');
 css.textContent = `
 /* Page-based navigation with no modal backdrop or accidental outside-click close. */
 body[data-bw-page]:not([data-bw-page="planner"]) .topbar .top-actions{display:none!important}
 #bwWorkspaceNav{position:sticky;top:0;z-index:80;background:#183a51;border-bottom:2px solid #d7aa54;box-shadow:0 5px 14px #0d2b371f}
 #bwWorkspaceNav .bw-tabs{max-width:1460px;margin:auto;display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:9px 18px}
 #bwWorkspaceNav .bw-tab{display:flex;align-items:center;justify-content:center;gap:8px;border-radius:10px;min-height:44px;padding:9px 16px;border:1px solid #5b7381;background:#2b4d62;color:#e8f3f6;cursor:pointer;font-size:.9rem;font-weight:750;width:auto;white-space:nowrap;box-shadow:none}
 #bwWorkspaceNav .bw-tab:hover{background:#36667c;color:white}
 #bwWorkspaceNav .bw-tab[aria-selected="true"]{background:#f4bb52;border-color:#f4bb52;color:#1c3041;box-shadow:inset 0 -2px 0 #db8f25}
 #bwWorkspaceNav .bw-title{font-size:.70rem;color:#cbdde6;letter-spacing:.05em;font-weight:700;margin-right:6px;white-space:nowrap}
 #bwWorkspacePages{max-width:1480px;margin:auto;padding:16px 15px 42px;min-height:60vh}
 #bwWorkspacePages .bw-page[hidden]{display:none!important}
 #bwWorkspacePages .bw-page{width:100%;min-width:0}
 #bwWorkspacePages .bw-page main{max-width:1400px;padding:14px 8px 38px}
 #bwWorkspacePages .bw-page dialog.bw-inline-tool{display:flex!important;flex-direction:column!important;position:relative!important;inset:auto!important;margin:0!important;transform:none!important;width:100%!important;max-width:none!important;min-width:0!important;height:auto!important;max-height:none!important;min-height:500px!important;overflow:visible!important;padding:0!important;border:1px solid #c6dce6;border-radius:14px;background:#fff;box-shadow:0 3px 14px #1e455011}
 #bwWorkspacePages .bw-page dialog.bw-inline-tool::backdrop{display:none!important}
 #bwWorkspacePages #fccDialog .fcc-scroll{max-height:none!important;overflow:visible!important}
 #bwWorkspacePages #fccDialog .dialog-head{position:relative}
 #bwWorkspacePages #fccDialog .fcc-layout{padding:18px 20px}
 #bwWorkspacePages #linkBudgetDialog .lb-scroll{flex:1 1 auto!important;min-height:0!important;max-height:none!important;overflow:visible!important}
 #bwWorkspacePages #linkBudgetDialog .lb-head{position:relative}
 #bwWorkspacePages #linkBudgetDialog .lb-footer{position:sticky;bottom:0;z-index:5;box-shadow:0 -4px 11px #102d401c}
 #bwWorkspacePages #bdaSitePlanDialog{height:max(700px,calc(100dvh - 160px))!important;min-height:700px!important;max-height:none!important;overflow:hidden!important}
 #bwWorkspacePages #bdaSitePlanDialog .bsp-main{min-height:0}
 #bwWorkspacePages #bdaSitePlanDialog .bsp-footer{position:relative}
 .top-actions #fccOpenTop,.top-actions #linkBudgetTop,.top-actions #bdaSitePlanTop{display:none!important}
 #bwWorkspacePages #fccDialog :is(#fccClose),
 #bwWorkspacePages #linkBudgetDialog :is(#lbClose),
 #bwWorkspacePages #bdaSitePlanDialog :is(#bspClose){width:auto;white-space:nowrap}
 @media(max-width:640px){
  #bwWorkspaceNav .bw-tabs{padding:9px 10px;gap:6px}
  #bwWorkspaceNav .bw-title{display:none}
  #bwWorkspaceNav .bw-tab{flex:1 1 calc(50% - 6px);padding:9px 6px;font-size:.76rem;min-width:0}
  #bwWorkspacePages{padding:10px 6px 30px}
  #bwWorkspacePages .bw-page dialog.bw-inline-tool{border-radius:9px;min-height:420px!important}
  #bwWorkspacePages #fccDialog .fcc-layout{padding:10px 8px}
  #bwWorkspacePages #linkBudgetDialog .lb-head,#bwWorkspacePages #linkBudgetDialog .lb-footer{padding:12px 9px}
  #bwWorkspacePages #bdaSitePlanDialog{height:800px!important;min-height:800px!important}
 }
 @media print{#bwWorkspaceNav{display:none!important}#bwWorkspacePages{padding:0!important}.bw-page[hidden]{display:none!important}}
 `;
 document.head.appendChild(css);
 const nav=document.createElement('nav');nav.id='bwWorkspaceNav';nav.setAttribute('aria-label','Batwing RF Suite tools');
 const tabrow=document.createElement('div');tabrow.className='bw-tabs';
 const navTitle=document.createElement('span');navTitle.className='bw-title';navTitle.textContent='RF TOOLKIT';tabrow.appendChild(navTitle);
 nav.appendChild(tabrow);bar.insertAdjacentElement('afterend',nav);
 const pages=document.createElement('div');pages.id='bwWorkspacePages';nav.insertAdjacentElement('afterend',pages);
 let active='planner';
 const panels={};const tabs={};
 function activate(key,updateLocation=true){
  if(!panels[key])key='planner';active=key;document.body.dataset.bwPage=key;
  for(const [k,p] of Object.entries(panels)){
   p.hidden=k!==key;
   tabs[k].setAttribute('aria-selected',String(k===key));
   tabs[k].tabIndex=k===key?0:-1;
  }
  if(updateLocation){try {history.replaceState(history.state,'','#'+(key==='planner'?'planner':key));}catch(e){}}
  window.scrollTo({top:0,behavior:'instant'});
  if(key==='siteplan'){
   window.dispatchEvent(new Event('resize'));
   // Site Plan handles its own canvas fit when opened from its existing toolbar button.
  }
 }
 for(const item of definitions){
  const panel=document.createElement('section');panel.className='bw-page';panel.id='bwPage-'+item.key;panel.setAttribute('role','region');panel.setAttribute('aria-label',item.label);panel.hidden=item.key!=='planner';
  pages.appendChild(panel);panels[item.key]=panel;panel.appendChild(item.node);
  const tab=document.createElement('button');tab.type='button';tab.className='bw-tab';tab.id='bwTab-'+item.key;tab.setAttribute('aria-controls',panel.id);tab.setAttribute('aria-selected',String(item.key==='planner'));tab.textContent=item.glyph+' '+item.label;
  tabs[item.key]=tab;tabrow.appendChild(tab);
  tab.addEventListener('click',()=>{
   if(item.source && $(item.source))$(item.source).click();
   else activate(item.key);
  });
  if(item.key!=='planner'){
   // Existing business logic calls showModal/close to open a tool. Redirect those
   // calls into page navigation instead of opening dismissible overlays.
   const dialog=item.node;
   dialog.classList.add('bw-inline-tool');
   dialog.showModal=()=>activate(item.key);
   dialog.show=()=>activate(item.key);
   dialog.close=()=>activate('planner');
   // Do not let legacy 'click on dialog background to close' handlers fire.
   dialog.addEventListener('click',event=>{
    if(event.target===dialog)event.stopImmediatePropagation();
   },true);
  }
 }
 // Turn the old X buttons into explicit return navigation; nothing closes on outside clicks.
 for(const id of ['fccClose','lbClose','bspClose']){
  const btn=$(id);if(!btn)continue;
  btn.textContent='← Channel Planner';btn.title='Return to Channel Planner';btn.setAttribute('aria-label','Return to Channel Planner');
 }
 // Preserve the last page within this browser session; a direct page link can also specify it.
 const start=location.hash.replace('#','').toLowerCase();
 if(['fcc','budget','siteplan'].includes(start)){
  const target=definitions.find(x=>x.key===start);
  if(target?.source&&$(target.source))$(target.source).click();else activate(start,false);
 } else activate('planner',false);
 window.addEventListener('hashchange',()=>{
  const key=location.hash.slice(1).toLowerCase();
  if(panels[key]&&key!==active){const def=definitions.find(x=>x.key===key);if(def?.source&&$(def.source))$(def.source).click();else activate(key,false);}
 });
 window.BatwingWorkspace=Object.freeze({version:'v1.11',navigate:(key)=>{const d=definitions.find(x=>x.key===key);if(d?.source&&$(d.source))$(d.source).click();else activate(key)},active:()=>active});
})();
