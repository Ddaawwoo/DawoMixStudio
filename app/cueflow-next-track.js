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
        #dawoCueTrackNav{display:flex;align-items:center;justify-content:space-between;gap:10px;width:100%}
        #dawoCueTrackNav .cue-track-nav-btn{min-height:46px;padding:0 16px;border-radius:12px;border:1px solid #2d394b;background:#101722;color:#dce8f3;font:800 11px system-ui,-apple-system,Segoe UI,sans-serif;letter-spacing:.02em;cursor:pointer;transition:.18s ease}
        #dawoCueTrackNav .cue-track-nav-btn:hover:not(:disabled){transform:translateY(-1px);border-color:#12e6f2;color:#12e6f2;box-shadow:0 0 16px #12e6f226}
        #dawoCueTrackNav .cue-track-nav-btn.next{border-color:#2b7d55;background:linear-gradient(135deg,#123e2a,#1d6b45);color:#dfffee;box-shadow:0 0 16px #2bd47f22}
        #dawoCueTrackNav .cue-track-nav-btn.next:hover:not(:disabled){border-color:#3ee6a8;color:#fff;box-shadow:0 0 18px #3ee6a833}
        #dawoCueTrackNav .cue-track-nav-btn:disabled{opacity:.35;cursor:not-allowed;transform:none}
        .cue-editor-actions{display:grid!important;grid-template-columns:minmax(0,1fr)!important;gap:10px!important}
        .cue-editor-actions #saveCues{width:100%}
        @media(max-width:520px){#dawoCueTrackNav{display:grid;grid-template-columns:1fr 1fr}#dawoCueTrackNav .cue-track-nav-btn{min-height:48px;padding:0 10px}}
      `;
      doc.head.appendChild(style);

      const nav=doc.createElement('div');
      nav.id='dawoCueTrackNav';
      nav.innerHTML='<button id="dawoCuePrevTrack" class="cue-track-nav-btn prev" type="button">← Předchozí skladba</button><button id="dawoCueNextTrack" class="cue-track-nav-btn next" type="button">Další skladba →</button>';
      actions.appendChild(nav);

      nav.querySelector('#dawoCuePrevTrack').addEventListener('click',()=>move(-1));
      nav.querySelector('#dawoCueNextTrack').addEventListener('click',()=>move(1));

      const observer=new MutationObserver(()=>updateButtons());
      const list=doc.getElementById('trackList');
      if(list)observer.observe(list,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
      const editor=doc.getElementById('cueEditor');
      if(editor)observer.observe(editor,{attributes:true,attributeFilter:['hidden']});
      doc.__dawoCueTrackNavObserver=observer;
      updateButtons();
    }catch(e){console.warn('Cue next-track install failed',e)}
  }

  function cards(){
    const doc=frame.contentDocument;
    return doc?[...doc.querySelectorAll('#trackList .track-card[data-open]')]:[];
  }

  function currentIndex(){
    return cards().findIndex(card=>card.classList.contains('selected'));
  }

  function updateButtons(){
    try{
      const doc=frame.contentDocument;
      if(!doc)return;
      const prev=doc.getElementById('dawoCuePrevTrack');
      const next=doc.getElementById('dawoCueNextTrack');
      if(!prev||!next)return;
      const list=cards();
      const index=currentIndex();
      const editor=doc.getElementById('cueEditor');
      const open=editor&&!editor.hidden;
      prev.disabled=!open||index<=0;
      next.disabled=!open||index<0||index>=list.length-1;
      if(open&&index>=0){
        prev.title=index>0?`Předchozí: ${list[index-1].querySelector('.track-title')?.textContent||''}`:'Žádná předchozí skladba';
        next.title=index<list.length-1?`Další: ${list[index+1].querySelector('.track-title')?.textContent||''}`:'Žádná další skladba';
      }
    }catch(e){console.warn(e)}
  }

  function move(direction){
    try{
      const doc=frame.contentDocument;
      if(!doc)return;
      const list=cards();
      const index=currentIndex();
      const target=list[index+direction];
      if(!target)return;
      doc.getElementById('saveCues')?.click();
      const title=target.querySelector('.track-title')?.textContent||'další skladba';
      setTimeout(()=>{
        const edit=target.querySelector('button[data-action="edit"]');
        (edit||target).click();
        setTimeout(updateButtons,80);
        window.DawoMixStudio?.setStatus?.(`Cue Editor: ${title}`);
      },80);
    }catch(e){console.error('Cue next-track failed',e)}
  }

  frame.addEventListener('load',()=>setTimeout(install,180));
  setTimeout(install,900);
})();
