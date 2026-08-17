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

  function boot(){
    injectGlobalStyle();
    addIframeButton('dawomix',...sequence.dawomix);
    addNativeButton('analyzer',...sequence.analyzer);
    addIframeButton('cueflow',...sequence.cueflow);
    addNativeButton('tag-editor',...sequence['tag-editor']);
    addNativeButton('traktor',...sequence.traktor);
    addNativeButton('settings',...sequence.settings);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();