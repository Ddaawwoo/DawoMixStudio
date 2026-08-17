(()=>{
  if(!window.DawoDesktop||window.__dawoDesktopIntegration)return;
  window.__dawoDesktopIntegration=true;
  const $=s=>document.querySelector(s);

  function style(){if($('#dawoDesktopStyle'))return;const s=document.createElement('style');s.id='dawoDesktopStyle';s.textContent=`.desktop-badge{padding:5px 8px;border:1px solid #365145;border-radius:999px;background:#18251f;color:#9acbb3;font-size:9px;font-weight:800}.desktop-drop-active{outline:2px dashed #668577!important;outline-offset:-8px!important;background:#101a16!important}`;document.head.appendChild(s)}

  function installLibrary(){
    const bar=document.querySelector('.library-module-toolbar');if(!bar||$('#desktopFolderImport'))return;
    const label=document.createElement('label');label.id='desktopFolderImport';label.className='file-action';label.innerHTML='＋ Složka<input id="desktopFolderInput" type="file" webkitdirectory directory multiple hidden>';
    const first=bar.querySelector('.file-action');first?.after(label);
    $('#desktopFolderInput').addEventListener('change',async e=>{const files=[...(e.target.files||[])].filter(f=>f.type.startsWith('audio/')||/\.(mp3|wav|aiff?|flac|m4a|ogg)$/i.test(f.name));if(files.length){await DawoLibrary.addFiles(files);DawoMixStudio?.setStatus?.(`Desktop: importováno ${files.length} audio souborů ze složky`)}e.target.value=''});
    const panel=$('#library');if(panel&&!panel.dataset.desktopDrop){panel.dataset.desktopDrop='1';['dragenter','dragover'].forEach(type=>panel.addEventListener(type,e=>{e.preventDefault();panel.classList.add('desktop-drop-active')}));['dragleave','drop'].forEach(type=>panel.addEventListener(type,e=>{e.preventDefault();panel.classList.remove('desktop-drop-active')}));panel.addEventListener('drop',async e=>{const files=[...e.dataTransfer.files].filter(f=>f.type.startsWith('audio/')||/\.(mp3|wav|aiff?|flac|m4a|ogg)$/i.test(f.name));if(files.length){await DawoLibrary.addFiles(files);DawoMixStudio?.setStatus?.(`Desktop drag & drop: ${files.length} audio souborů`)}})}
  }

  function installTraktor(){
    const input=$('#traktorCollectionInput');if(!input||$('#desktopOpenNml'))return;
    const label=input.closest('label');const b=document.createElement('button');b.id='desktopOpenNml';b.type='button';b.className='secondary-action';b.textContent='Windows: otevřít collection.nml';label?.after(b);
    b.onclick=async()=>{try{const path=await DawoDesktop.pickTraktorNml();if(!path)return;const text=await DawoDesktop.readTextFile(path);const name=String(path).split(/[\\/]/).pop()||'collection.nml';const file=new File([text],name,{type:'application/xml'}),dt=new DataTransfer();dt.items.add(file);input.files=dt.files;input.dispatchEvent(new Event('change',{bubbles:true}))}catch(e){console.error(e);alert(`NML se nepodařilo otevřít: ${e.message}`)}};
  }

  function badge(){const actions=document.querySelector('.top-actions');if(actions&&!$('#desktopModeBadge')){const b=document.createElement('span');b.id='desktopModeBadge';b.className='desktop-badge';b.textContent='DESKTOP';actions.prepend(b)}}
  function boot(){style();badge();installLibrary();installTraktor();new MutationObserver(()=>{installLibrary();installTraktor()}).observe(document.body,{childList:true,subtree:true})}
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',boot):boot();
})();