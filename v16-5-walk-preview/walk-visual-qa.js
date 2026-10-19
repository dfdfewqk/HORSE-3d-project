/* HORSE RANCH V16.5 manual visual QA controls; not loaded in normal play.
 * Runs inside the same-origin original viewer where animTime, play, yaw and
 * canvas are already defined. All controls affect the V16.5 preview only.
 */
(function(){'use strict';
let tries=0;
const wait=setInterval(()=>{
 if(!window.__horseV165?.ready||!window.__viewerReady){
  if(++tries>950){clearInterval(wait);window.__horseV165VisualError='Preview not ready';}return;
 }
 clearInterval(wait);
 try{
  const current=object3d,clip=current.animations.find(x=>x.name==='Walk_V16_5_PLANTED_WALK');
  if(!clip)throw Error('V16.5 Walk missing');
  function frameAt(i){
   if(!Number.isFinite(i))throw Error('Invalid frame number');
   const n=((Math.round(i)%160)+160)%160;
   const idx=current.animations.indexOf(clip);
   if(Number(animSel.value)!==idx){animSel.value=String(idx);animSel.dispatchEvent(new Event('change'));}
   play=false;animTime=n*clip.duration/160;setClip(current);updateWorld(current);return n;
  }
  function view(label){
   const cameras={right:[Math.PI/2,.12],left:[-Math.PI/2,.12],
    front:[0,.10],rear:[Math.PI,.10],quarter:[Math.PI/4,.16]};
   const camera=cameras[label];if(!camera)throw Error('Unknown camera');
   yaw=camera[0];pitch=camera[1];return label;
  }
  const api={ready:true,frames:160,view,frameAt,
   capture(){return canvas.toDataURL('image/png');},
   gait(){return window.__horseV165?.proxyMetrics;},
   report(){return {selectedClip:current.animations[Number(animSel.value)]?.name,
    currentFrame:Math.round((animTime%clip.duration)/clip.duration*160),
    camera:{yaw,pitch},cpuFallback:!!ctx2d,
    numericVerified:!!window.__horseV165.geometryQA,
    visualCheckedInThisSession:false};}
  };
  window.__horseV165VisualQA=api;
 }catch(error){window.__horseV165VisualError=String(error?.message||error);console.error('V16.5 visual QA',error);}
},100);
})();