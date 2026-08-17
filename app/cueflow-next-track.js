(()=>{
  if(window.__dawoCueNextTrackInstalled)return;
  window.__dawoCueNextTrackInstalled=true;
  const frame=document.getElementById('cueflow');
  if(!frame)return;

  function install(){
    try{
      const doc=frame.contentDocument;
      if(!doc||!doc.body)return;
      const actions=doc.querySelector('.cue-editor-actions');
      if(!actions)return;
      if(doc.getElementById('dawoCueTrackNav')){updateButtons();return;}

      const style=doc.createElement('style');
      style.id='dawoCueTrackNavStyle';
      style.textContent=`
        #dawoCueProgress{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 12px;border:1px solid #2a313a;border-radius:11px;background:#151a20;color:#98a3ae;font:700 10px system-ui,-apple-system,Segoe UI,sans-serif;margin-bottom:10px}
        #dawoCueProgress strong{color:#eef2f6;font-size:12px}#dawoCueProgress i{height:4px;flex:1;max-width:220px;background:#262d35;border-radius:99px;overflow:hidden}#dawoCueProgress i:after{content:"";display:block;width:var(--p,0%);height:100%;background:#65ad9a;border-radius:99px}
        #dawoCueTrackNav{display:grid;grid-template-columns:1fr 1.35fr;align-items:center;gap:10px;width:100%}
        #dawoCueTrackNav .cue-track-nav-btn{min-height:46px;padding:0 16px;border-radius:12px;border:1px solid #343b45;background:#171c22;color:#d5dce4;font:800 11px system-ui,-apple-system,Segoe UI,sans-serif;letter-spacing:.02em;cursor:pointer;transition:.18s ease;box-shadow:none}
        #dawoCueTrackNav .cue-track-nav-btn:hover:not(:disabled){transform:translateY(-1px);border-color:#66727e;color:#fff}
        #dawoCueTrackNav .cue-track-nav-btn.next{border-color:#456957;background:#20352d;color:#e2f4ea}
        #dawoCueTrackNav .cue-track-nav-btn.next:hover:not(:disabled){border-color:#65a788;background:#274239}
        #dawoCueTrackNav .cue-track-nav-btn:disabled{opacity:.32;cursor:not-allowed;transform:none}
        .cue-editor-actions{display:grid!important;grid-template-columns:minmax(0,1fr)!important;gap:10px!important}
        .cue-editor-actions #saveCues{width:100%}
        @media(max-width:520px){#dawoCueTrackNav{grid-template-columns:.8fr 1.2fr}#dawoCueTrackNav .cue-track-nav-btn{min-height:48px;padding:0 8px;font-size:10px}#dawoCueProgress{gap:8px}#dawoCueProgress i{max-width:100px}}
      `;
      doc.head.appendChild(style);

      const progress=doc.createElement('div');progress.id='dawoCueProgress';progress.innerHTML='<span>WORKFLOW</span><strong id="dawoCueProgressText">0 / 0</strong><i></i><span id="dawoCueReadyText">0 hotovo</span>';
      actions.prepend(progress);
      const nav=doc.createElement('div');
      nav.id='dawoCueTrackNav';
      nav.innerHTML='<button id="dawoCuePrevTrack" class="cue-track-nav-btn prev" type="button">← Předchozí</button><button id="dawoCueNextTrack" class="cue-track-nav-btn next" type="button">Uložit + Další →</button>';
      actions.appendChild(nav);

      nav.querySelector('#dawoCuePrevTrack').addEventListener('click',()=>move(-1,true));
      nav.querySelector('#dawoCueNextTrack').addEventListener('click',()=>move(1,true));

      const observer=new MutationObserver(()=>updateButtons());
      const list=doc.getElementById('trackList');
      if(list)observer.observe(list,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
      const editor=doc.getElementById('cueEditor');
      if(editor)observer.observe(editor,{attributes:true,attributeFilter:['hidden']});
      doc.__dawoCueTrackNavObserver=observer;
      if(!doc.__dawoCueKeyboard){doc.__dawoCueKeyboard=true;doc.addEventListener('keydown',keyboard,true)}
      updateButtons();
    }catch(e){console.warn('Cue next-track install failed',e)}
  }

  function cards(){const doc=frame.contentDocument;return doc?[...doc.querySelectorAll('#trackList .track-card[data-open]')]:[]}
  function currentIndex(){return cards().findIndex(card=>card.classList.contains('selected'))}
  function editorOpen(){const e=frame.contentDocument?.getElementById('cueEditor');return !!e&&!e.hidden}
  function readyCount(){return cards().filter(c=>{const dots=[...c.querySelectorAll('.cue-dots i')];return dots.length>=8&&dots.every(x=>x.classList.contains('on'))}).length}

  function updateButtons(){
    try{
      const doc=frame.contentDocument;if(!doc)return;
      const prev=doc.getElementById('dawoCuePrevTrack'),next=doc.getElementById('dawoCueNextTrack'),text=doc.getElementById('dawoCueProgressText'),ready=doc.getElementById('dawoCueReadyText'),bar=doc.querySelector('#dawoCueProgress i');
      if(!prev||!next)return;
      const list=cards(),index=currentIndex(),open=editorOpen();
      prev.disabled=!open||index<=0;next.disabled=!open||index<0||index>=list.length-1;
      if(text)text.textContent=index>=0?`${index+1} / ${list.length}`:`0 / ${list.length}`;
      if(ready)ready.textContent=`${readyCount()} hotovo`;
      if(bar)bar.style.setProperty('--p',`${list.length&&index>=0?((index+1)/list.length*100):0}%`);
      if(open&&index>=0){prev.title=index>0?`Předchozí: ${list[index-1].querySelector('.track-title')?.textContent||''}`:'Žádná předchozí skladba';next.title=index<list.length-1?`Uložit a otevřít: ${list[index+1].querySelector('.track-title')?.textContent||''}`:'Poslední skladba'}
    }catch(e){console.warn(e)}
  }

  function move(direction,save=true){
    try{
      const doc=frame.contentDocument;if(!doc)return;
      const list=cards(),index=currentIndex(),target=list[index+direction];if(!target)return;
      if(save)doc.getElementById('saveCues')?.click();
      const title=target.querySelector('.track-title')?.textContent||'další skladba';
      setTimeout(()=>{const edit=target.querySelector('button[data-action="edit"]');(edit||target).click();setTimeout(updateButtons,100);window.DawoMixStudio?.setStatus?.(`Cue Editor: ${title}`)},80);
    }catch(e){console.error('Cue next-track failed',e)}
  }

  function keyboard(e){
    try{
      const doc=frame.contentDocument;if(!editorOpen())return;
      const tag=e.target?.tagName?.toLowerCase();if(tag==='input'||tag==='textarea'||tag==='select')return;
      if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='s'){e.preventDefault();doc.getElementById('saveCues')?.click();return}
      if(e.altKey&&e.key==='ArrowRight'){e.preventDefault();move(1,true);return}
      if(e.altKey&&e.key==='ArrowLeft'){e.preventDefault();move(-1,true);return}
      if(/^[1-8]$/.test(e.key)){const b=doc.querySelector(`[data-cue="${Number(e.key)-1}"]`);if(b){e.preventDefault();b.click()}}
    }catch(err){console.warn(err)}
  }

  frame.addEventListener('load',()=>setTimeout(install,180));
  setTimeout(install,900);
})();