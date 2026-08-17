(() => {
  const palette=value=>{const v=Math.max(0,Math.min(100,Number(value)||0));if(v<28)return'#35d7ff';if(v<45)return'#725cff';if(v<62)return'#a64ce3';if(v<74)return'#e0bd45';if(v<86)return'#e36635';return'#cf3d50'};
  function smooth(values){return values.map((_,i)=>{let s=0,n=0;for(let j=Math.max(0,i-3);j<=Math.min(values.length-1,i+3);j++){s+=values[j];n++}return s/Math.max(1,n)})}
  function recolor(container){if(!container)return;const bars=[...container.querySelectorAll(':scope > i')];if(!bars.length)return;const raw=bars.map(b=>Math.max(0,Math.min(100,parseFloat(b.style.height)||20))),vals=smooth(raw);container.classList.add('energy-spectrum');bars.forEach((bar,i)=>{const c=palette(vals[i]);bar.style.setProperty('--energy-color',c);bar.style.background=c;bar.style.boxShadow=`0 0 3px ${c}33`;bar.style.borderRadius='1px';bar.style.opacity='.9'})}
  function mainStyle(){if(document.getElementById('dawoEnergyStyle'))return;const s=document.createElement('style');s.id='dawoEnergyStyle';s.textContent=`
.brand{min-width:128px;width:128px;padding:5px 10px!important;display:flex!important;align-items:center;justify-content:flex-start;overflow:visible}
.brand .dawo-brand-logo{display:block;width:108px;max-height:54px;object-fit:contain;object-position:left center;filter:drop-shadow(0 3px 8px #0008);transition:opacity .16s ease,transform .16s ease}
.brand:hover .dawo-brand-logo{opacity:.96;transform:translateY(-1px)}
.analysis-waveform.energy-spectrum{position:relative;gap:2px!important;background:linear-gradient(180deg,#0d1117,#10151b)!important;overflow:hidden}
.analysis-waveform.energy-spectrum:after{content:"";position:absolute;left:0;right:0;top:50%;height:1px;background:#29323a88;pointer-events:none}
.analysis-waveform.energy-spectrum i{min-width:2px!important;max-width:5px;flex:1!important;background:var(--energy-color)!important;box-shadow:0 0 3px color-mix(in srgb,var(--energy-color) 28%,transparent)!important;opacity:.9!important}
@media(max-width:760px){.brand{min-width:86px;width:86px;padding-left:6px!important}.brand .dawo-brand-logo{width:76px;max-height:44px}}
`;document.head.appendChild(s)}
  function brand(){const b=document.querySelector('.brand');if(!b)return;b.innerHTML='<img class="dawo-brand-logo" src="dawo-logo.svg" alt="Dawo">';b.dataset.logoInstalled='1'}
  function addScript(src,key){if(document.querySelector(`script[data-${key}]`))return;const script=document.createElement('script');script.src=src;script.setAttribute(`data-${key}`,'1');document.body.appendChild(script)}
  function loadIconPack(){addScript('icon-pack.js','dawo-icon-pack')}
  function loadCueTrackNav(){addScript('cueflow-next-track.js','dawo-cue-track-nav')}
  function loadWorkflow(){addScript('workflow-pro.js','dawo-workflow-pro')}
  function loadSettingsCenter(){addScript('settings-control-center.js','dawo-settings-center')}
  function loadDesktopIntegration(){addScript('desktop-integration.js','dawo-desktop-integration')}
  function loadLibraryHealth(){addScript('library-health.js','dawo-library-health')}
  function loadAutosave(){addScript('autosave-status.js','dawo-autosave-status')}
  function loadCueUndo(){addScript('cue-undo-redo.js','dawo-cue-undo-redo')}
  function loadTagUndo(){addScript('tag-undo-redo.js','dawo-tag-undo-redo')}
  function loadAutoMatch(){addScript('auto-match.js','dawo-auto-match')}
  function loadAutoBuild(){addScript('auto-build-playlist.js','dawo-auto-build-playlist')}
  function loadSetAnalyzer(){addScript('set-analyzer.js','dawo-set-analyzer')}
  function loadMegaConnect(){addScript('mega-connect.js','dawo-mega-connect')}
  function mainWave(){const w=document.getElementById('analysisWaveform');if(!w)return;recolor(w);new MutationObserver(()=>recolor(w)).observe(w,{childList:true})}
  function cueStyle(doc){if(doc.getElementById('dawoCueEnergyStyle'))return;const s=doc.createElement('style');s.id='dawoCueEnergyStyle';s.textContent='#waveform,#playerWaveform{align-items:center!important;gap:2px!important}#waveform.energy-spectrum,#playerWaveform.energy-spectrum{background:linear-gradient(180deg,#0d1117,#10151b)!important}#waveform.energy-spectrum i,#playerWaveform.energy-spectrum i{background:var(--energy-color)!important;box-shadow:0 0 2px color-mix(in srgb,var(--energy-color) 24%,transparent)!important;border-radius:1px!important;opacity:.9!important;min-width:2px}#waveform.energy-spectrum i.past,#playerWaveform.energy-spectrum i.past{filter:brightness(.6) saturate(.75)!important;opacity:.72!important;min-width:2px}';doc.head.appendChild(s)}
  function cueFrame(){const frame=document.getElementById('cueflow');if(!frame)return;const setup=()=>{try{const doc=frame.contentDocument;if(!doc)return;cueStyle(doc);const apply=()=>{recolor(doc.getElementById('waveform'));recolor(doc.getElementById('playerWaveform'))};apply();if(!doc.__dawoEnergyObserver){const o=new MutationObserver(apply);o.observe(doc.body,{childList:true,subtree:true});doc.__dawoEnergyObserver=o}}catch(e){console.warn('CueFlow energy spectrum style failed',e)}};frame.addEventListener('load',()=>setTimeout(setup,100));setTimeout(setup,700)}
  function playlistFrame(){const frame=document.getElementById('dawomix');if(!frame)return;const setup=()=>{try{const doc=frame.contentDocument;if(!doc||!doc.body)return;const add=(src,key)=>{if(doc.querySelector(`script[data-${key}]`))return;const script=doc.createElement('script');script.src=src;script.setAttribute(`data-${key}`,'1');doc.body.appendChild(script)};add('../playlist-modern.js','dawo-playlist-modern');setTimeout(()=>add('../playlist-download.js','dawo-playlist-download'),80)}catch(e){console.warn('Playlist modern UI failed',e)}};frame.addEventListener('load',()=>setTimeout(setup,120));setTimeout(setup,800)}
  function boot(){mainStyle();brand();loadIconPack();loadCueTrackNav();setTimeout(loadWorkflow,80);setTimeout(loadSettingsCenter,120);setTimeout(loadDesktopIntegration,160);setTimeout(loadLibraryHealth,210);setTimeout(loadAutosave,250);setTimeout(loadCueUndo,290);setTimeout(loadTagUndo,320);setTimeout(loadAutoMatch,350);setTimeout(loadAutoBuild,410);setTimeout(loadSetAnalyzer,450);setTimeout(loadMegaConnect,490);mainWave();cueFrame();playlistFrame();window.addEventListener('dawo-library-change',()=>setTimeout(()=>recolor(document.getElementById('analysisWaveform')),0))}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();