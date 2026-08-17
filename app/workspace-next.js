(() => {
  const sequence = {
    dawomix: ['library','Otevřít Library →'],
    analyzer: ['cueflow','Otevřít Cue Point Editor →'],
    cueflow: ['tag-editor','Otevřít Tag Editor →'],
    'tag-editor': ['traktor','Otevřít Traktor Tools →'],
    traktor: ['settings','Otevřít Settings →'],
    settings: ['home','Zpět na Home →']
  };

  function injectGlobalStyle(){
    if(document.getElementById('dawoNextStepStyle')) return;
    const s=document.createElement('style');
    s.id='dawoNextStepStyle';
    s.textContent=`
      .workspace-next-step{position:absolute;right:22px;bottom:22px;z-index:60;min-height:44px;padding:0 18px;border-radius:12px;border:1px solid #8758ff;background:linear-gradient(135deg,#402072,#6f40d7);color:#fff;font-weight:900;letter-spacing:.01em;box-shadow:0 8px 24px #25114388,0 0 18px #7a4cff25;cursor:pointer}
      .workspace-next-step:hover{filter:brightness(1.08);transform:translateY(-1px)}
      .native-panel{position:relative}
      #libraryMegaButton{border:1px solid #bf3b4f;background:linear-gradient(135deg,#7d1727,#b92842);color:#fff;font-weight:900;border-radius:10px;padding:10px 14px;cursor:pointer;box-shadow:0 0 16px #d72b4630}
      #libraryMegaButton:hover{filter:brightness(1.08)}
      @media(max-width:760px){.workspace-next-step{position:sticky;float:right;right:auto;bottom:10px;margin:18px 12px 12px;min-height:46px;width:calc(100% - 24px);float:none}}
    `;
    document.head.appendChild(s);
  }

  function addNativeButton(id,target,label){
    const panel=document.getElementById(id);
    if(!panel || panel.querySelector('.workspace-next-step')) return;
    const b=document.createElement('button');
    b.type='button';
    b.className='workspace-next-step';
    b.textContent=label;
    b.addEventListener('click',()=>window.DawoMixStudio?.showPanel?.(target));
    panel.appendChild(b);
  }

  function addIframeButton(frameId,target,label){
    const frame=document.getElementById(frameId);
    if(!frame) return;
    const install=()=>{
      try{
        const doc=frame.contentDocument;
        if(!doc || !doc.body || doc.getElementById('dawoIframeNextStep')) return;
        const s=doc.createElement('style');
        s.textContent=`#dawoIframeNextStep{position:fixed;right:16px;bottom:16px;z-index:2147483647;min-height:46px;padding:0 16px;border-radius:13px;border:1px solid #8758ff;background:linear-gradient(135deg,#402072,#6f40d7);color:white;font:900 13px system-ui,-apple-system,Segoe UI,sans-serif;box-shadow:0 8px 24px #25114399,0 0 18px #7a4cff33;cursor:pointer}#dawoIframeNextStep:hover{filter:brightness(1.08)}@media(max-width:760px){#dawoIframeNextStep{left:12px;right:12px;bottom:12px;width:calc(100% - 24px)}}`;
        doc.head.appendChild(s);
        const b=doc.createElement('button');
        b.id='dawoIframeNextStep';
        b.type='button';
        b.textContent=label;
        b.addEventListener('click',()=>window.DawoMixStudio?.showPanel?.(target));
        doc.body.appendChild(b);
      }catch(e){console.warn('Workspace next button failed',frameId,e)}
    };
    frame.addEventListener('load',()=>setTimeout(install,120));
    setTimeout(install,700);
  }

  function enhanceLibrary(){
    const panel=document.getElementById('library');
    const toolbar=panel?.querySelector('.library-module-toolbar');
    const addAudio=toolbar?.querySelector('.file-action');
    if(toolbar && addAudio && !document.getElementById('libraryMegaButton')){
      const mega=document.createElement('button');
      mega.id='libraryMegaButton';
      mega.type='button';
      mega.textContent='＋ Mega';
      mega.title='Otevřít MEGA';
      mega.addEventListener('click',()=>{
        window.open('https://mega.nz/','_blank','noopener,noreferrer');
        window.DawoMixStudio?.setStatus?.('MEGA otevřeno v nové kartě');
      });
      addAudio.insertAdjacentElement('afterend',mega);
    }

    const cleanRows=()=>{
      panel?.querySelectorAll('[data-library-analyze]').forEach(btn=>btn.remove());
      panel?.querySelectorAll('.library-module-actions').forEach(actions=>{
        if(!actions.querySelector('button')) actions.remove();
      });
    };
    cleanRows();
    if(panel && !panel.__dawoLibraryObserver){
      const observer=new MutationObserver(cleanRows);
      observer.observe(panel,{childList:true,subtree:true});
      panel.__dawoLibraryObserver=observer;
    }

    if(!window.__dawoLibraryCtrlAInstalled){
      window.addEventListener('keydown',async e=>{
        if(!(e.ctrlKey||e.metaKey) || String(e.key).toLowerCase()!=='a') return;
        const active=document.querySelector('#library.panel.active');
        if(!active) return;
        const target=e.target;
        if(target && (target.matches?.('input,textarea,select') || target.isContentEditable)) return;
        e.preventDefault();
        const all=document.getElementById('librarySelectAll');
        if(all){
          all.checked=true;
          all.dispatchEvent(new Event('change',{bubbles:true}));
          window.DawoMixStudio?.setStatus?.('Library: vybrány všechny skladby (Ctrl+A)');
        }
      });
      window.__dawoLibraryCtrlAInstalled=true;
    }
  }

  function boot(){
    injectGlobalStyle();
    enhanceLibrary();
    addIframeButton('dawomix',...sequence.dawomix);
    addNativeButton('analyzer',...sequence.analyzer);
    addIframeButton('cueflow',...sequence.cueflow);
    addNativeButton('tag-editor',...sequence['tag-editor']);
    addNativeButton('traktor',...sequence.traktor);
    addNativeButton('settings',...sequence.settings);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();