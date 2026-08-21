(() => {
  if (window.__dawoIconPackLoaded) return;
  window.__dawoIconPackLoaded = true;

  const icons = {
    home:'<svg viewBox="0 0 24 24"><path d="M4 11.2 12 4l8 7.2V20a1 1 0 0 1-1 1h-4.8v-5.4H9.8V21H5a1 1 0 0 1-1-1z"/></svg>',
    dawomix:'<svg viewBox="0 0 24 24"><path d="M5 6h8M5 10h8M5 14h5M17 5v11.3a2.8 2.8 0 1 1-1.4-2.4V7.4l4.8-1.2v7.1a2.8 2.8 0 1 1-1.4-2.4V5z"/></svg>',
    library:'<svg viewBox="0 0 24 24"><path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H10l1.6 1.8H17.5A2.5 2.5 0 0 1 20 9.3V17a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/></svg>',
    analyzer:'<svg viewBox="0 0 24 24"><path d="M4 18V11M8 18V8M12 18V4M16 18V9M20 18V12M3 20h18"/></svg>',
    cueflow:'<svg viewBox="0 0 24 24"><path d="M3 12h4l1.2-3.5L10.5 16l1.8-6 1.6 3H21"/><rect x="9" y="3" width="6" height="3.5" rx="1"/></svg>',
    'tag-editor':'<svg viewBox="0 0 24 24"><path d="M11 4H5v6l8.8 8.8a1.8 1.8 0 0 0 2.5 0l2.5-2.5a1.8 1.8 0 0 0 0-2.5z"/><circle cx="7.5" cy="7.5" r="1.3"/><path d="m12.8 15.2 3.8 3.8"/></svg>',
    traktor:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3.8"/><path d="M12 4a8 8 0 0 1 7.7 6M4.3 14A8 8 0 0 0 12 20m-7.7-6A8 8 0 0 1 12 4m7.7 6A8 8 0 0 1 12 20"/></svg>',
    settings:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3.3"/><path d="M20 12l-1.9-.7a6.5 6.5 0 0 0-.5-1.3l.9-1.8-1.9-1.9-1.8.9a6.5 6.5 0 0 0-1.3-.5L12.8 5h-1.6l-.7 1.7a6.5 6.5 0 0 0-1.3.5l-1.8-.9-1.9 1.9.9 1.8a6.5 6.5 0 0 0-.5 1.3L4 12v1.6l1.9.7c.1.5.3.9.5 1.3l-.9 1.8 1.9 1.9 1.8-.9c.4.2.8.4 1.3.5l.7 1.7h1.6l.7-1.7c.5-.1.9-.3 1.3-.5l1.8.9 1.9-1.9-.9-1.8c.2-.4.4-.8.5-1.3l1.9-.7z"/></svg>'
  };

  const colors = {
    home:'#20dfff', dawomix:'#6cff5f', library:'#c86cff', analyzer:'#ffd23b',
    cueflow:'#ff9b2f', 'tag-editor':'#20dfff', traktor:'#ff4fa6', settings:'#ff5f57'
  };

  function style(){
    if(document.getElementById('dawoIconPackStyle')) return;
    const s=document.createElement('style');
    s.id='dawoIconPackStyle';
    s.textContent=`
      /* DawoMixStudio navigation / Library visual system */
      :root{
        --dawo-panel:#0b1019;
        --dawo-panel-2:#0e141f;
        --dawo-panel-3:#121925;
        --dawo-line:#202b3a;
        --dawo-muted:#718096;
        --dawo-cyan:#20dfff;
        --dawo-green:#62d66f;
      }

      .topbar{
        height:72px!important;
        min-height:72px!important;
        background:rgba(6,9,15,.96)!important;
        border-bottom:1px solid #172130!important;
        box-shadow:0 6px 24px rgba(0,0,0,.22)!important;
      }
      .topbar .brand{
        height:72px!important;
        display:flex!important;
        align-items:center!important;
        justify-content:center!important;
        border-right:1px solid #172130!important;
      }
      .topbar .brand img,.topbar .brand svg{max-height:52px!important;max-width:108px!important}

      .plugin-nav{
        height:72px!important;
        gap:2px!important;
        align-items:stretch!important;
      }
      .plugin-nav .tab{
        position:relative!important;
        min-height:72px!important;
        padding:0 16px!important;
        color:#8793a5!important;
        background:transparent!important;
        border:0!important;
        border-bottom:2px solid transparent!important;
        transition:background .18s ease,color .18s ease,border-color .18s ease!important;
      }
      .plugin-nav .tab:hover{background:#0d141f!important;color:#d7e0ea!important}
      .plugin-nav .tab.active{
        color:#e8f0f7!important;
        background:#0c131d!important;
        border-bottom-color:var(--icon-color,var(--dawo-cyan))!important;
      }
      .plugin-nav .tab.active:after{
        content:"";position:absolute;left:18px;right:18px;bottom:-1px;height:1px;
        background:var(--icon-color,var(--dawo-cyan));opacity:.55;
      }
      .plugin-nav .tab>span:not(.dawo-module-icon):not(#transferBadge){font-size:11px!important;font-weight:650!important;letter-spacing:.02em!important}
      .dawo-module-icon{width:17px;height:17px;display:inline-flex!important;align-items:center;justify-content:center;color:var(--icon-color);flex:0 0 auto;filter:drop-shadow(0 0 4px color-mix(in srgb,var(--icon-color) 28%,transparent))}
      .dawo-module-icon svg{width:100%;height:100%;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
      .plugin-nav .tab{gap:7px!important}
      .plugin-nav .tab.active .dawo-module-icon{filter:drop-shadow(0 0 7px color-mix(in srgb,var(--icon-color) 55%,transparent))}

      .side-item{
        min-height:58px!important;
        margin:2px 8px!important;
        padding:7px 5px!important;
        color:#66758b!important;
        border:1px solid transparent!important;
        border-radius:9px!important;
        transition:background .18s ease,color .18s ease,border-color .18s ease!important;
      }
      .side-item:hover{background:#0d141f!important;color:#c9d4df!important}
      .side-item.active{
        background:#111a27!important;
        color:#edf5fb!important;
        border-color:#1d3043!important;
        box-shadow:inset 2px 0 0 var(--icon-color,var(--dawo-cyan))!important;
      }
      .side-item .dawo-module-icon{width:21px;height:21px;margin:auto}
      .side-item span:not(.dawo-module-icon){font-size:8px!important;font-weight:650!important;letter-spacing:.03em!important}

      /* Library workspace: match the supplied reference layout */
      #libraryContainer{
        background:linear-gradient(180deg,rgba(10,15,23,.94),rgba(7,10,16,.94))!important;
        border:1px solid #1c2938!important;
        border-radius:12px!important;
        box-shadow:0 16px 40px rgba(0,0,0,.18)!important;
        overflow:hidden!important;
      }
      #libraryContainer .track-row{
        background:#0b1119!important;
        border-color:#1b2634!important;
      }
      #libraryContainer .track-row:hover{background:#101823!important}
      #libraryContainer thead,
      #libraryContainer [role="row"]:first-child{background:#0d141e!important}

      #bulkLibraryActions{
        display:grid!important;
        grid-template-columns:repeat(6,minmax(0,1fr))!important;
        gap:6px!important;
        background:transparent!important;
        border:0!important;
        padding:0!important;
        margin-top:8px!important;
      }
      #bulkLibraryActions.hidden{display:none!important}
      #bulkLibraryActions button,
      #deleteSelectedButton{
        min-height:38px!important;
        width:100%!important;
        padding:8px 10px!important;
        border-radius:7px!important;
        border:1px solid #273447!important;
        background:#111824!important;
        color:#aab7c7!important;
        box-shadow:none!important;
        font-size:10px!important;
        font-weight:700!important;
        letter-spacing:.01em!important;
      }
      #bulkLibraryActions button:hover,
      #deleteSelectedButton:hover{border-color:#38516b!important;background:#151f2c!important;color:#e7eef5!important}
      #bulkLibraryActions button:disabled{opacity:.38!important}
      #bulkLibraryActions #openInAnalyzerButton,
      #bulkLibraryActions button[id*="Analyzer"]{
        background:#1b7b46!important;border-color:#269a59!important;color:#effff5!important;
      }
      #bulkLibraryActions #openInAnalyzerButton:hover,
      #bulkLibraryActions button[id*="Analyzer"]:hover{background:#229454!important}
      #bulkLibraryActions #deleteSelectedButton,
      #deleteSelectedButton{background:#17141b!important;border-color:#553044!important;color:#df9bb2!important}
      #bulkLibraryActions #deleteSelectedButton:hover,
      #deleteSelectedButton:hover{background:#25151d!important;border-color:#7a3b54!important;color:#ffb6c9!important}
      #selectedTracksCount{font-size:9px!important;color:#65758b!important}

      /* Search / primary library controls */
      #libraryContainer input[type="search"],
      #libraryContainer input[placeholder*="Hledat"],
      #libraryContainer select{
        background:#0c121b!important;
        border-color:#202c3b!important;
        color:#dbe5ef!important;
        border-radius:7px!important;
      }
      #libraryContainer button{box-shadow:none!important}

      /* Compact desktop proportions */
      @media(min-width:761px){
        main{background:transparent!important}
        .side-nav,.sidebar{background:#080c13!important;border-right:1px solid #172130!important}
      }

      @media(max-width:760px){
        .topbar{height:58px!important;min-height:58px!important;grid-template-columns:76px minmax(0,1fr)!important;padding:0 5px!important}
        .topbar .brand{height:58px!important;width:76px!important;min-width:76px!important}
        .topbar .brand img,.topbar .brand svg{max-height:42px!important;max-width:70px!important}
        .plugin-nav{height:58px!important;min-height:58px!important;overflow-x:auto!important}
        .plugin-nav .tab{height:58px!important;min-height:58px!important;min-width:48px!important;width:48px!important;flex:0 0 48px!important;padding:0!important}
        .plugin-nav .tab>span:not(.dawo-module-icon):not(#transferBadge){display:none!important}
        .plugin-nav .dawo-module-icon{width:20px!important;height:20px!important}
        .side-item{min-height:50px!important;margin:2px 5px!important}
        #bulkLibraryActions{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:6px!important}
        #bulkLibraryActions button,#deleteSelectedButton{min-height:40px!important;font-size:9px!important;padding:8px 6px!important}
      }
    `;
    document.head.appendChild(s);
  }

  function iconNode(target,sizeClass=''){
    const span=document.createElement('span');
    span.className=`dawo-module-icon ${sizeClass}`;
    span.style.setProperty('--icon-color',colors[target]||'#20dfff');
    span.innerHTML=icons[target]||icons.home;
    return span;
  }

  function applyTabs(){
    document.querySelectorAll('.tab[data-target]').forEach(el=>{
      const target=el.dataset.target;
      if(!icons[target]||el.querySelector('.dawo-module-icon')) return;
      el.querySelector('.tab-icon')?.remove();
      el.prepend(iconNode(target));
      el.style.setProperty('--icon-color',colors[target]||'#20dfff');
    });
  }

  function applySide(){
    document.querySelectorAll('.side-item[data-target]').forEach(el=>{
      const target=el.dataset.target;
      if(!icons[target]||el.querySelector('.dawo-module-icon')) return;
      const first=el.querySelector(':scope > span');
      if(first) first.replaceWith(iconNode(target)); else el.prepend(iconNode(target));
      el.style.setProperty('--icon-color',colors[target]||'#20dfff');
    });
  }

  function applyCards(){
    document.querySelectorAll('.module-card[data-target]').forEach(el=>{
      const target=el.dataset.target;
      if(!icons[target]||el.querySelector('.dawo-module-icon')) return;
      el.style.setProperty('--module-color',colors[target]||'#20dfff');
      const old=el.querySelector('.module-icon');
      const node=iconNode(target);
      old?old.replaceWith(node):el.prepend(node);
    });
  }

  function boot(){
    style();
    applyTabs();
    applySide();
    applyCards();
    new MutationObserver(()=>{applyTabs();applySide();applyCards()}).observe(document.body,{childList:true,subtree:true});
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot); else boot();
})();