(()=>{
  if(window.__dawoCueUndoRedo)return;window.__dawoCueUndoRedo=true;
  const frame=document.getElementById('cueflow');if(!frame)return;
  function inject(){
    try{
      const d=frame.contentDocument;if(!d?.body||d.getElementById('dawoCueUndoScript'))return;
      const s=d.createElement('script');s.id='dawoCueUndoScript';s.textContent=`(()=>{
        if(window.__cueUndoLocal)return;window.__cueUndoLocal=true;
        let undo=[],redo=[],last='',applying=false;
        const snap=()=>state?.selected?JSON.stringify({id:state.selected.id,cues:[...(state.selected.cues||[])]}):'';
        const push=()=>{if(applying)return;const s=snap();if(!s||s===last)return;if(last)undo.push(last);if(undo.length>60)undo.shift();last=s;redo=[];update()};
        const apply=async raw=>{if(!raw)return;const v=JSON.parse(raw),t=tracks.find(x=>String(x.id)===String(v.id));if(!t)return;applying=true;t.cues=[...v.cues];t.ready=t.cues.every(x=>x!=null);state.selected=t;renderCues();renderTracks();await saveTrack(t);last=snap();applying=false;update();};
        const update=()=>{const u=document.getElementById('dawoCueUndo'),r=document.getElementById('dawoCueRedo');if(u)u.disabled=!undo.length;if(r)r.disabled=!redo.length};
        const doUndo=async()=>{if(!undo.length)return;const cur=snap();if(cur)redo.push(cur);await apply(undo.pop())};
        const doRedo=async()=>{if(!redo.length)return;const cur=snap();if(cur)undo.push(cur);await apply(redo.pop())};
        function install(){const a=document.querySelector('.cue-editor-actions');if(!a||document.getElementById('dawoCueHistory'))return;const box=document.createElement('div');box.id='dawoCueHistory';box.style.cssText='display:flex;gap:8px;align-items:center';box.innerHTML='<button id="dawoCueUndo" type="button" class="cue-track-nav-btn" style="flex:1">↶ Undo</button><button id="dawoCueRedo" type="button" class="cue-track-nav-btn" style="flex:1">↷ Redo</button>';a.prepend(box);box.querySelector('#dawoCueUndo').onclick=doUndo;box.querySelector('#dawoCueRedo').onclick=doRedo;update();}
        document.addEventListener('click',e=>{if(e.target.closest('[data-cue],[data-delete-cue],#autoCues'))setTimeout(push,0)},true);
        document.addEventListener('keydown',e=>{if(!(e.ctrlKey||e.metaKey))return;const k=e.key.toLowerCase();if(k==='z'&&!e.shiftKey){e.preventDefault();doUndo()}else if(k==='y'||(k==='z'&&e.shiftKey)){e.preventDefault();doRedo()}},true);
        new MutationObserver(()=>{install();const s=snap();if(s&&s!==last){last=s;undo=[];redo=[];update()}}).observe(document.body,{childList:true,subtree:true,attributes:true});
        setTimeout(install,100);setTimeout(()=>{last=snap()},250);
      })();`;
      d.body.appendChild(s);
    }catch(e){console.warn('Cue undo injection failed',e)}
  }
  frame.addEventListener('load',()=>setTimeout(inject,220));setTimeout(inject,1100);
})();