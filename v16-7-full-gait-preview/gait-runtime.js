/* HORSE RANCH V16.7: adds only candidate full-gait clips;
 * keeps previous 19-channel clips, source GLB and idle untouched.
 */
(function(){'use strict';let attempts=0;
const poll=setInterval(()=>{
 if(!window.__viewerReady||!window.__horseV166?.ready||!window.__horseV167Builder){
  if(++attempts>950){clearInterval(poll);window.__horseV167Error='Prior viewer / V16.7 builder not ready';}
  return;
 }
 clearInterval(poll);
 try{
 const g=object3d,E=window.__horseV167Builder,v15=window.__horseV15,v14=window.__horseV14,
   sel=document.getElementById('animations'),speed=document.getElementById('speed');
 if(g.skins?.[0]?.joints?.length!==19||window.__horseGaitV12?.belly?.corrected!==440||!sel||!speed)
  throw Error('Original GLB, 19 joints, 440 belly correction or controls unavailable');
 const labels=[...sel.options].map(x=>x.textContent.trim());
 if(labels.join('|')!=='정지 자세|Walk|Gallop Cruise|Gallop Fast|Gallop Sprint')
  throw Error('Original 5 UI modes unexpectedly changed');
 const before=g.animations.slice(),prepared={};
 for(const mode of ['walk','cruise','fast','sprint']){
  const build=E.build(g,mode);if(g.animations.some(x=>x.name===build.clip.name))
   throw Error('Duplicate V16.7 clip '+mode);
  if(build.metrics.changedLegs.length!==4||build.metrics.jointChannels!==14)throw Error('Limb drive failed '+mode);
  prepared[mode]=build;
 }
 // Validate existing GLB 14 joint influence counts before inserting any clip.
 const skin=g.skins[0],prim=g.doc.meshes?.[0]?.primitives?.[0];
 if(!prim?.attributes||!g.doc.nodes)throw Error('Body mesh unavailable');
 const indices=readAccessor(g,prim.attributes.JOINTS_0),
   weights=readAccessor(g,prim.attributes.WEIGHTS_0);
 if(indices.length!==weights.length||weights.length!==24314*4)throw Error('Original GLB skin size mismatch');
 const skinMap=new Map(skin.joints.map((idx,k)=>[g.doc.nodes[idx].name,k]));
 const weightsByJoint={};
 for(const bone of Object.values(E.chains).flat()){
  const idx=skinMap.get(bone);if(idx===undefined)throw Error('Missing skinned joint '+bone);
  let n=0;for(let p=0;p<weights.length;p+=4)
   if((indices[p]===idx?weights[p]:0)+(indices[p+1]===idx?weights[p+1]:0)+
      (indices[p+2]===idx?weights[p+2]:0)+(indices[p+3]===idx?weights[p+3]:0)>.12)n++;
  weightsByJoint[bone]=n;
 }
 if(Object.values(weightsByJoint).some(x=>x===0))throw Error('A joint has no skinned vertices');
 const created={},options=[...sel.options];
 for(const [mode,result]of Object.entries(prepared)){
  const index=g.animations.length;g.animations.push(result.clip);created[mode]=index;
  const label={walk:'Walk',cruise:'Gallop Cruise',fast:'Gallop Fast',sprint:'Gallop Sprint'}[mode];
  options.find(x=>x.textContent.trim()===label).value=String(index);
 }
 if(before.some((clip,i)=>g.animations[i]!==clip)||g.animations.length!==before.length+4)
  throw Error('Existing animation clip was modified');
 const previousMode=v15.setMode,previousSpeed=v15.setSpeed;
 const ids=['walk','cruise','fast','sprint'];
 function selectMode(id){
  const idx=created[id];if(idx===undefined)return;
  const current=g.animations[Number(sel.value)],phase=current?.duration?
   ((animTime%current.duration)+current.duration)%current.duration/current.duration:0;
  const target=g.animations[idx];
  sel.value=String(idx);sel.dispatchEvent(new Event('change'));
  Promise.resolve().then(()=>{animTime=phase*target.duration;});
  v15.mode=id;v15.selectedClip=target.name;v14.mode=id;v14.selectedClip=target.name;
 }
 function setMode(id){
  const response=previousMode(id);
  if(ids.includes(id)){selectMode(id);return {...response,clip:prepared[id].clip.name,period:prepared[id].clip.duration};}
  return response;
 }
 function setSpeed(kmh){
  const response=previousSpeed(kmh),id=response?.mode;
  if(ids.includes(id)){selectMode(id);return {...response,clip:prepared[id].clip.name,period:prepared[id].clip.duration};}
  return response;
 }
 v15.setMode=v14.setMode=setMode;v15.setSpeed=v14.setSpeed=setSpeed;
 sel.addEventListener('change',()=>{
  const hit=ids.find(id=>String(created[id])===String(sel.value));
  if(hit){v15.mode=hit;v14.mode=hit;v15.selectedClip=prepared[hit].clip.name;v14.selectedClip=prepared[hit].clip.name;}
 });
 const state={ready:true,version:'V16.7',modes:ids,clipIndexes:created,
  sourceIndexes:Object.fromEntries(ids.map(id=>[id,g.animations.findIndex(x=>x.name===E.configs[id].source)])),
  metrics:Object.fromEntries(ids.map(id=>[id,prepared[id].metrics])),
  skinInfluence:weightsByJoint,changedLegCount:4,addedClips:4,skinJoints:19,
  originalGlbPreserved:true,originalGaitsPreserved:true,
  actualGlbJointInfluenceChecked:true,contactVerified:false,visualVerified:false,
  biomechanicsValidated:false,transitionInterpolated:false,
  caveat:'Phase retained at mode switches; instantaneous pose crossfade is NOT implemented.'};
 window.__horseV167=state;selectMode('walk');
 }catch(e){window.__horseV167Error=String(e?.message||e);console.error('V16.7 candidate',e);}
},100);
})();