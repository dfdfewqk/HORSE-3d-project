/* HORSE RANCH V16 — Walk target trajectories and real-GLB sole discovery */
(function(root, factory){'use strict'; const api=factory();root.__horseV16Targets=api;if(typeof module==='object'&&module.exports)module.exports=api;})(typeof window!=='undefined'?window:globalThis,function(){'use strict';
const N=160,TAU=2*Math.PI,STANCE=.65;
const FEET={
 HindR:{node:'HindR_Fetlock',point:890,centre:.8625,stride:.265,lift:.082},
 ForeR:{node:'ForeR_Fetlock',point:984,centre:.1125,stride:.250,lift:.075},
 HindL:{node:'HindL_Fetlock',point:3696,centre:.3625,stride:.265,lift:.082},
 ForeL:{node:'ForeL_Fetlock',point:3790,centre:.6125,stride:.250,lift:.075}
};
const mod=x=>((x%1)+1)%1, smooth=x=>{const t=Math.max(0,Math.min(1,x));return t*t*t*(t*(t*6-15)+10);};
function state(name,frame){const p=FEET[name];if(!p)throw Error('Invalid V16 foot '+name);
 const phase=mod(frame/N-(p.centre-.825));
 if(phase<STANCE){const u=phase/STANCE;return {phase,stance:true,u,heelLift:0,z:p.stride*(.5-u)};}
 const u=(phase-STANCE)/(1-STANCE),v=smooth(u);
 return {phase,stance:false,u,heelLift:p.lift*Math.sin(Math.PI*u)**2,z:p.stride*(v-.5)};
}
function collect(g){
 const mesh=g.doc?.meshes?.[0]?.primitives?.[0],nodes=g.doc?.nodes,skin=g.skins?.[0];
 if(!mesh||!nodes||skin?.joints?.length!==19)throw Error('V16 requires the saved 19-joint body');
 const pos=readAccessor(g,mesh.attributes.POSITION),joints=readAccessor(g,mesh.attributes.JOINTS_0),weights=readAccessor(g,mesh.attributes.WEIGHTS_0);
 const groups={};const all=[];
 for(const [name,cfg] of Object.entries(FEET)){
  const index=cfg.point;if(index>=pos.length/3)throw Error('Foot reference vertex outside body');
  const soleNode=skin.joints.findIndex(id=>nodes[id].name===cfg.node);
  if(soleNode<0)throw Error('Distal joint not found: '+cfg.node);
  const ref=[pos[index*3],pos[index*3+1],pos[index*3+2]],pointSet=[];
  for(let i=0;i<pos.length/3;i++){
   let membership=0;for(let k=0;k<4;k++)if(joints[i*4+k]===soleNode)membership+=weights[i*4+k];
   if(membership<.82||Math.abs(pos[i*3]-ref[0])>.085||Math.abs(pos[i*3+2]-ref[2])>.155||
      Math.abs(pos[i*3+1]-ref[1])>.062)continue;
   pointSet.push(i);
  }
  if(!pointSet.includes(index))pointSet.push(index);
  const lowest=Math.min(...pointSet.map(i=>pos[3*i+1]));
  const sole=pointSet.filter(i=>pos[3*i+1]-lowest<.013);
  if(!sole.length)throw Error('Could not find sole vertices for '+name);
  const front=sole.reduce((a,b)=>pos[3*a+2]>pos[3*b+2]?a:b);
  const back=sole.reduce((a,b)=>pos[3*a+2]<pos[3*b+2]?a:b);
  const center=sole.reduce((a,b)=>Math.abs(pos[3*a+2]-ref[2])<Math.abs(pos[3*b+2]-ref[2])?a:b);
  const pts=[...new Set([index,front,back,center])];
  groups[name]={...cfg,name,ref,lowest,sole,points:pts,contactVertex:center,frontVertex:front,backVertex:back,
   side:ref[0],restZ:pos[center*3+2],restY:pos[center*3+1],soleCount:sole.length};
  all.push(lowest);
 }
 all.sort((a,b)=>a-b);
 const floor=(all[1]+all[2])*.5;
 return {floor,feet:groups,bodyVertexCount:pos.length/3};
}
return {N,STANCE,FEET,state,collect,smooth};
});