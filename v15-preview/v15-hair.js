/* HORSE RANCH V15 optional hair tip secondary motion.
   Original GLB and existing bone skin weights remain unchanged.
   Deforms only existing saved HairKey ribbon mesh POSITION buffers, root UV=0 pinned.
   This is lightweight phase-based motion, NOT simulated Blender hair dynamics. */
(function(){'use strict';
const TAU=2*Math.PI,clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const amplitude={
 walk:{mane:.006,tail:.014},cruise:{mane:.014,tail:.028},
 fast:{mane:.021,tail:.041},sprint:{mane:.028,tail:.054},
 idle:{mane:0,tail:0}
};
let waits=0;
const poll=setInterval(()=>{
 if(!window.__horseV15?.ready||!window.__viewerReady){
  if(++waits>950){clearInterval(poll);window.__horseV15HairError='V15 gait not ready';}
  return;
 }
 clearInterval(poll);
 try{
  const g=object3d;
  if(g?.skins?.[0]?.joints?.length!==19)throw Error('Hair skin joint count changed');
  const prims=g.doc?.meshes?.[0]?.primitives||[];
  const resources=[];
  for(let index=0;index<prims.length;index++){
   const src=prims[index],label=(g.doc.materials?.[src.material]?.name||'').toLowerCase();
   const type=label.includes('horse.tail')?'tail':label.includes('hairkey_guides_mane')?'mane':null;
   if(!type)continue;
   if(src.attributes?.TEXCOORD_0===undefined||src.indices===undefined)
    throw Error('Hair UV or index not available');
   const part=g.meshes?.[0]?.[index];
   if(!part?.positions)throw Error('Hair mesh part missing '+index);
   const idx=readAccessor(g,src.indices),uv=readAccessor(g,src.attributes.TEXCOORD_0);
   if(!idx.length||uv.length!==part.positions.length/3*2)throw Error('Hair ribbon UV mismatch');
   let from=Infinity,to=-Infinity;
   for(const value of idx){from=Math.min(from,value);to=Math.max(to,value);}
   from=Math.floor(from);to=Math.floor(to);
   if(from<0||to>=part.positions.length/3||to<from)
    throw Error('Hair index bounds invalid');
   const base=new Float32Array(part.positions),work=new Float32Array(base);
   // Reuse the UV from original ribbon strips: V=0 attached root, V=1 tip.
   const tip=new Float32Array(to-from+1),seed=new Float32Array(to-from+1);
   for(let i=from;i<=to;i++){
    const v=clamp(uv[2*i+1],0,1);
    tip[i-from]=v*v*(3-2*v);
    const strand=Math.floor(i/(type==='tail'?22:12));
    seed[i-from]=Math.sin(strand*12.9898)*.36;
   }
   let buffer=null;
   if(!ctx2d){
    if(!gl||!part.vao||!program?.attr||program.attr.aPosition<0)
     throw Error('WebGL hair position buffer unavailable');
    const previous=gl.getParameter(gl.VERTEX_ARRAY_BINDING);
    gl.bindVertexArray(part.vao);
    buffer=gl.getVertexAttrib(program.attr.aPosition,gl.VERTEX_ATTRIB_ARRAY_BUFFER_BINDING);
    gl.bindVertexArray(previous);
    if(!buffer)throw Error('Hair GPU buffer missing');
   }
   resources.push({index,type,part,from,to,base,work,tip,seed,buffer});
  }
  if(resources.filter(x=>x.type==='mane').length<1||
     resources.filter(x=>x.type==='tail').length!==1)
   throw Error('Saved HairKey mane/tail geometry not detected');
  const previousSetClip=setClip;
  const diagnostics={ready:true,method:'original-HairKey-UV-tip-warp',rootPinned:true,
   procedural:true,usesExtraBones:false,segments:resources.map(x=>({material:x.type,index:x.index,
    vertexRange:[x.from,x.to]})),lastMode:null,maxLocalTipOffset:0,gpuUploaded:!ctx2d};
  let lastKey='';
  function update(){
   const v15=window.__horseV15;
   const choice=v15?.mode||'idle',m=amplitude[choice]||amplitude.idle;
   const clip=g.animations[Number(animSel.value)];
   const phase=clip?.duration?TAU*((animTime%clip.duration)/clip.duration):0;
   const key=choice+'|'+(choice==='idle'?'0':phase.toFixed(5));
   if(key===lastKey)return;lastKey=key;
   let maxDelta=0;
   const previousArray=!ctx2d?gl.getParameter(gl.ARRAY_BUFFER_BINDING):null;
   for(const x of resources){
    const amp=m[x.type];
    for(let i=x.from;i<=x.to;i++){
     const p=i-x.from,t=x.tip[p],angle=phase-1.05*t+x.seed[p],k=3*i;
     const fx=amp*t*(x.type==='tail'?.60:.38)*Math.sin(angle+1.4);
     const fy=amp*t*(x.type==='tail'?.67:.62)*Math.sin(angle-.4);
     const fz=-amp*t*(x.type==='tail'?.80:.62)*(.58+.18*Math.cos(angle+.8));
     x.work[k]=x.base[k]+fx;
     x.work[k+1]=x.base[k+1]+fy;
     x.work[k+2]=x.base[k+2]+fz;
     maxDelta=Math.max(maxDelta,Math.hypot(fx,fy,fz));
    }
    // CPU renderer uses part.positions, GPU renderer uses its existing VAO/VBO.
    x.part.positions=x.work;
    if(!ctx2d){
     gl.bindBuffer(gl.ARRAY_BUFFER,x.buffer);
     gl.bufferSubData(gl.ARRAY_BUFFER,x.from*12,
      x.work.subarray(x.from*3,(x.to+1)*3));
    }
   }
   if(!ctx2d)gl.bindBuffer(gl.ARRAY_BUFFER,previousArray);
   diagnostics.lastMode=choice;diagnostics.maxLocalTipOffset=maxDelta;
  }
  setClip=function(model){
   previousSetClip(model);
   if(model===g)update();
  };
  window.__horseV15Hair=diagnostics;
 }catch(e){
  window.__horseV15HairError=String(e?.message||e);
  console.error('V15 HairKey secondary motion',e);
 }
},100);
})();