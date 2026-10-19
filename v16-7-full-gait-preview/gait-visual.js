/* HORSE RANCH V16.7 manual frame + camera rig regression controls.
 * Only runs when the preview iframe loads; not a biomechanical test.
 */
(function(){'use strict';let tries=0;
const timer=setInterval(()=>{
 if(!window.__horseV167?.ready||!window.__viewerReady){
  if(++tries>950){clearInterval(timer);window.__horseV167VisualError='Gaits unavailable';}return;
 }
 clearInterval(timer);
 try{
  const g=object3d;
  const view=side=>{
   const presets={right:[Math.PI/2,.12],left:[-Math.PI/2,.12],
    front:[0,.12],rear:[Math.PI,.12],quarter:[Math.PI/4,.16]};
   if(!presets[side])throw Error('Camera preset invalid');
   yaw=presets[side][0];pitch=presets[side][1];return {yaw,pitch};
  };
  function frame(mode,i,previous=false){
   const x=window.__horseV167,index=previous?x.sourceIndexes[mode]:x.clipIndexes[mode];
   if(index===undefined)throw Error('Missing gait '+mode);
   const clip=g.animations[index],n=((Math.round(i)%160)+160)%160;
   animSel.value=String(index);animSel.dispatchEvent(new Event('change'));
   window.__horseV15.mode=mode;window.__horseV14.mode=mode;
   play=false;animTime=n*clip.duration/160;setClip(g);updateWorld(g);
   return {mode,clip:clip.name,frame:n};
  }
  window.__horseV167Visual={ready:true,view,frame,capture:()=>canvas.toDataURL('image/png'),
   status:()=>({phase:animTime,playing:play,selected:g.animations[Number(animSel.value)]?.name,
    gpuAvailable:!ctx2d,visualVerified:false})};
 }catch(e){window.__horseV167VisualError=String(e?.message||e);}
},100);
})();