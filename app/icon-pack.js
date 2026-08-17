(() => {
  if (window.__dawoIconPackLoaded) return;
  window.__dawoIconPackLoaded = true;
  const icons={
    home:'<svg viewBox="0 0 24 24"><path d="M4 11.2 12 4l8 7.2V20a1 1 0 0 1-1 1h-4.8v-5.4H9.8V21H5a1 1 0 0 1-1-1z"/></svg>',
    dawomix:'<svg viewBox="0 0 24 24"><path d="M5 6h8M5 10h8M5 14h5M17 5v11.3a2.8 2.8 0 1 1-1.4-2.4V7.4l4.8-1.2v7.1a2.8 2.8 0 1 1-1.4-2.4V5z"/></svg>',
    library:'<svg viewBox="0 0 24 24"><path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H10l1.6 1.8H17.5A2.5 2.5 0 0 1 20 9.3V17a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/></svg>',
    analyzer:'<svg viewBox="0 0 24 24"><path d="M4 18V11M8 18V8M12 18V4M16 18V9M20 18V12M3 20h18"/></svg>',
    cueflow:'<svg viewBox="0 0 24 24"><path d="M3 12h4l1.2-3.5L10.5 16l1.8-6 1.6 3H21"/><rect x="9" y="3" width="6" height="3.5" rx="1"/></svg>',
    'tag-editor':'<svg viewBox="0 0 24 24"><path d="M11 4H5v6l8.8 8.8a1.8 1.8 0 0 0 2.5 0l2.5-2.5a1.8 1.8 0 0 0 0-2.5z"/><circle cx="7.5" cy="7.5" r="1.3"/><path d="m12.8 15.2 3.8 3.8"/></svg>',
    traktor:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3.8"/><path d="M12 4a8 8 0 0 1 7.7 6M4.3 14A8 8 0 0 0 12 20m-7.7-6A8 8 0 0 1 12 4m7.7 6A8 8 0 0 1 12 20"/></svg>',
    settings:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3.3"/><path d="M20 12l-1.9-.7a6.5 6.5 0 0 0-.5-1.3l.9-1.8-1.9-1.9-1.8.9a6.5 6.5 0 0 0-1.3-.5L12.8 5h-1.6l-.7 1.7a6.5 6.5 0 0 0-1.3.5l-1.8-.9-1.9 1.9.9 1.8a6.5 6.5 0 0 0-.5 1.3L4 12v1.6l1.9.7c.1.5.3.9.5 1.3l-.9 1.8 1.9 1.9 1.8-.9c.4.2.8.4 1.3.5l.7 1.7h1.6l.7-1.7c.5-.1.9-.3 1.3-.5l1.8.9 1.9-1.9-.9-1.8c.2-.4.4-.8.5-1.3l1.9-.7z"/></svg>'
  };
  const colors={home:'#20dfff',dawomix:'#6cff5f',library:'#d05bff',analyzer:'#ffd23b',cueflow:'#ff9b2f','tag-editor':'#20dfff',traktor:'#ff4fa6',settings:'#ff5f57'};
  function style(){if(document.getElementById('dawoIconPackStyle'))return;const s=document.createElement('style');s.id='dawoIconPackStyle';s.textContent=`
    .dawo-module-icon{width:18px;height:18px;display:inline-flex;align-items:center;justify-content:center;color:var(--icon-color);filter:drop-shadow(0 0 5px color-mix(in srgb,var(--icon-color) 45%,transparent));flex:0 0 auto}.dawo-module-icon svg{width:100%;height:100%;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}.tab.active .dawo-module-icon,.side-item.active .dawo-module-icon{filter:drop-shadow(0 0 8px var(--icon-color))}.plugin-nav .tab{gap:7px}.side-item .dawo-module-icon{width:22px;height:22px;margin:auto}.module-card .dawo-module-icon{width:34px;height:34px;margin-bottom:12px}.module-card{--module-color:#20dfff}.module-card .dawo-module-icon{color:var(--module-color);filter:drop-shadow(0 0 8px color-mix(in srgb,var(--module-color) 55%,transparent))}.module-card:hover .dawo-module-icon{transform:scale(1.05)}
    @media(max-width:760px){.plugin-nav .dawo-module-icon{width:19px;height:19px}.plugin-nav .tab>span:last-child{display:none}.plugin-nav .tab{min-width:38px;justify-content:center;padding-left:8px!important;padding-right:8px!important}}
  `;document.head.appendChild(s)}
  function iconNode(target,sizeClass=''){const span=document.createElement('span');span.className=`dawo-module-icon ${sizeClass}`;span.style.setProperty('--icon-color',colors[target]||'#20dfff');span.innerHTML=icons[target]||icons.home;return span}
  function applyTabs(){document.querySelectorAll('.tab[data-target]').forEach(el=>{const target=el.dataset.target;if(!icons[target]||el.querySelector('.dawo-module-icon'))return;el.querySelector('.tab-icon')?.remove();el.prepend(iconNode(target))})}
  function applySide(){document.querySelectorAll('.side-item[data-target]').forEach(el=>{const target=el.dataset.target;if(!icons[target]||el.querySelector('.dawo-module-icon'))return;const first=el.querySelector(':scope > span');if(first)first.replaceWith(iconNode(target));else el.prepend(iconNode(target))})}
  function applyCards(){document.querySelectorAll('.module-card[data-target]').forEach(el=>{const target=el.dataset.target;if(!icons[target]||el.querySelector('.dawo-module-icon'))return;el.style.setProperty('--module-color',colors[target]||'#20dfff');const old=el.querySelector('.module-icon');const node=iconNode(target);old?old.replaceWith(node):el.prepend(node)})}
  function boot(){style();applyTabs();applySide();applyCards();new MutationObserver(()=>{applyTabs();applySide();applyCards()}).observe(document.body,{childList:true,subtree:true})}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();