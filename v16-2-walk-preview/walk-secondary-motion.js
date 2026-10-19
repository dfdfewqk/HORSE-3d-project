/* V16.2 Walk-only second-order HairKey response (existing V15 data preserved).
   Adds small root-pinned differential after the original V15 HairKey update.
   Does NOT replace the existing hair geometry or affect other gaits.
*/
(function(){'use strict';let polls=0;
const wait=setInterval(()=>{
 if(!window.__horseV162?.ready||!window.__horseV15Hair?.ready||!window.__viewerReady){
  if(++polls>950){clearInterval(wait);window.__horseV162HairError='Walk or HairKey missing';}return;
 }
 clearInterval(wait);
 try{
  const g=object3d,parts=g.doc.meshes[0].primitives,resources=[];
  for(const seg of window.__horseV15Hair.segments){
   const prim=parts[seg.index],mesh=g.meshes?.[0]?.[seg.index],v=readAccessor(g,prim.attributes.TEXCOORD_0);
   if(!mesh?.positions||!v)throw Error('Missing original HairKey segment');
   const [start,end]=seg.vertexRange,weights=new Float32Array(end-start+1);
   for(let i=start;i<=end;i++){const u=Math.max(0,Math.min(1,v[2*i+1]));weights[i-start]=u*u*(3-2*u);}
   let buffer=null;
   if(!ctx2d){
    const old=gl.getParameter(gl.VERTEX_ARRAY_BINDING);gl.bindVertexArray(mesh.vao);
    buffer=gl.getVertexAttrib(program.attr.aPosition,gl.VERTEX_ATTRIB_ARRAY_BUFFER_BINDING);
    gl.bindVertexArray(old);if(!buffer)throw Error('HairKey GPU buffer missing');
   }
   resources.push({seg,mesh,from:start,to:end,weights,buffer});
  }
  const prevSet=setClip;
  const api={ready:true,walkOnly:true,rootPinned:true,originalHairKeyPreserved:true,extraModeAmplitude:0,active:false};
  let last='';
  setClip=function(model){
   prevSet(model);
   if(model!==g)return;
   const v15=window.__horseV15,clip=g.animations[Number(animSel.value)],
    on=v15?.mode==='walk'&&clip?.name==='Walk_V16_2_FULL_BODY_CANDIDATE';
   if(!on){api.active=false;last='';return;}
   const phase=2*Math.PI*((animTime%clip.duration)/clip.duration),key=phase.toFixed(5);
   if(key===last)return;last=key;
   const originalBinding=!ctx2d?gl.getParameter(gl.ARRAY_BUFFER_BINDING):null;
   for(const obj of resources){
    const amp=obj.seg.material==='mane'?.0018:.0028,arr=obj.mesh.positions;
    for(let i=obj.from;i<=obj.to;i++){
     const k=i*3,t=obj.weights[i-obj.from],lag=phase-(obj.seg.material==='mane'?.28:.52)*t;
     arr[k]+=.38*amp*t*Math.sin(lag-.32);
     arr[k+1]+=.46*amp*t*Math.sin(2*lag-.55);
     arr[k+2]+=.20*amp*t*Math.cos(lag-.8);
    }
    if(!ctx2d){gl.bindBuffer(gl.ARRAY_BUFFER,obj.buffer);
      gl.bufferSubData(gl.ARRAY_BUFFER,obj.from*12,arr.subarray(obj.from*3,(obj.to+1)*3));}
   }
   if(!ctx2d)gl.bindBuffer(gl.ARRAY_BUFFER,originalBinding);
   api.active=true;api.extraModeAmplitude=.0028;
  };
  window.__horseV162Hair=api;
 }catch(e){window.__horseV162HairError=String(e?.message||e);console.error('V16.2 hair',e);}
},100);
})();