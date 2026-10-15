/* HORSE RANCH V13.5 — hind swing bend correction, 19-bone existing GLB.
 * Restricted edits: L/R Stifle and Hock only, swing phase; no body/fore/skin/bind changes.
 * Angle corrections are a modeled candidate, NOT veterinary reference measurements.
 * NOT loaded by production index.html.
 */
(function(){'use strict';
const NAME='Gallop_V13_5_HOCK_FLEX',N=160;
const JOINTS=['HindR_Stifle','HindR_Hock','HindL_Stifle','HindL_Hock'];
const DATA='EAvRCpoKawpECiUKEAoDCv8JDwpNCsYKdAtLDDsNOA4xDxoQ6BCQEQoSUBJeEjQS0xE/EX4Qmg+cDo8NggyAC5gK2AlNCfsI1gjFCL4IwAjLCOAI/QgkCVMJignKCREKYQq4ChULegvlC1cMzgxKDcwNUg7dDmsP/Q+TECsRxhFjEgEToBM+FNsUdxURFqgWPRfPF18Y6xh1GfoZexr5GnIb5htXHMMcKR2KHecdPh6QHtseIh9iH5wf0R8AICkgSyBoIH0gjSCYIJsgmiCTIIcgdCBcIEAgHSD2H8ofmB9jHygf6B6kHl0eEB7AHWsdEx23HFcc9RuOGyUbuRpKGtgZYxntGHMY+Bd7F/wWehb5FXYV8RRrFOcTYxPeElsS2BFVEdUQVhDZD14P5Q5wDvwNjQ0hDbkMVwz6C6ULVwt9BZMFpQW1BcIFywXSBdUF1QXRBckFvAWvBaUFpQWyBdAFBAZNBq4GJQewB0sI8gihCVIK/wqmC0IM0QxPDbwNFQ5ZDoUOmw6hDqEOng6aDpMOiw6BDnUOZw5XDkYOMw4eDgcO7w3WDbsNng2BDWENQQ0fDfwM2AyzDIwMZQw8DBIM5gu1C3kLMAvfCoAKGQqmCSkJoggSCHkH1QYqBnYFvAT7AzIDZQKTAbwA4v8F/yf+R/1o/In7rPrS+fv4Kvhf95727/Vd9fD0mPRK9AT0x/OT82fzRvMt8x/zGvMf8y3zRvNn85Pzx/ME9Er0mPTu9Ev1sPUb9oz2Avd99/33gPgG+Y/5Gfqk+jD7u/tF/M78VP3Y/V7+6f53/wQAjgAWAZgBFAKJAvcCXQO5AwwEVASTBMYE7gQPBS4FSwVlBb4XIxeHFuoVSxWsFA0UbhPREjQSmRH/EGgQ1A9BD7IOJg6eDRsNngwoDLoLUwv0Cp0KTgoICswJmAluCVEJTwmBCewJhwpECxcM8gzJDY8OOQ/ADxsQRRA7EPwPiw/pDh0OLw0mDA8L9AnhCOQHCgdfBu0FrwWPBXwFdgV8BYwFqQXQBQMGQAaHBtkGNQeaBwgIfwj+CIUJEwqoCkML5AuLDDcN5w2bDlMPDxDMEI0RThIOE84TjRRKFQUWvhZ0FygY2BiFGS8a1Bp1GxIcqhw+Hc0dVh7ZHlgf0R9DIK8gFiF0Ic0hHyJqIq4i6iIfI0wjcyOTI6sjviPJI84jyyPCI7MjnSOAI14jNSMGI9EiliJWIhAixSF0IR0hwyBjIP4flh8oH7ceQh7IHUodyhxGHL4bNBumGhYagxnvGFgY1/1X/tL+SP+5/yYAkwAEAXYB5QFQArQCEgNpA7YD+wM1BGYEkAS5BOEEBwUqBUsFaQWFBZ0FsgXFBdMF3gXlBeUF4wXfBeAF6QX/BSUGXwasBg4HhAcMCKIIQgnpCZIKOQvaC3MMAA1/De8NTQ6YDs8O7w77Dv8O/w79DvkO8g7pDt4O0A7ADq4Omg6DDmsOUQ41DhcO9w3XDbQNkQ1sDUYNHg32DM0Mogx3DEoMHAzoC6oLYAsMC6wKQwrOCU8JxggzCJcH8QZCBosFzAQFBDYDYgKHAacAw//c/vD9BP0W/Cb7OfpN+Wb4i/fH9if2sfVL9e70mPRK9AT0x/OT82fzRvMt8x/zGvMf8y3zRvNn85Pzx/ME9Er0mPTu9Ev1sPUb9oz2Avd99/33gPgG+Y/5Gfqk+jD7u/tF/M78VP0=';
let counter=0;const timer=setInterval(()=>{
 if(!window.__horseGaitV13_2?.ready||!window.__horseGaitV12?.hindRegionProtectedV134){
   if(++counter>650){clearInterval(timer);window.__horseV13_5Error='V13.4 base not ready';}
   return;
 }
 clearInterval(timer);
 try{
  const g=object3d,base=g.animations.find(a=>a.name==='Gallop_V13_2_HIND_BOUNDED');
  if(!base||!g.skins?.length||g.skins[0].joints.length!==19)throw Error('Expected V13.4 19-bone model');
  if(g.animations.some(a=>a.name===NAME))throw Error('Duplicate V13.5 clip');
  const raw=atob(DATA);if(raw.length!==JOINTS.length*N*2)throw Error('Bend curve length mismatch');
  const bytes=new Uint8Array(raw.length);for(let i=0;i<bytes.length;i++)bytes[i]=raw.charCodeAt(i);
  const dv=new DataView(bytes.buffer),updates=new Map();
  JOINTS.forEach((name,k)=>{
    const curve=new Float32Array(N*4);
    for(let i=0;i<N;i++){let angle=dv.getInt16((k*N+i)*2,true)/10000;
      curve[i*4]=Math.sin(angle/2);curve[i*4+3]=Math.cos(angle/2);
    }updates.set(name+'|rotation',curve);
  });
  let count=0;const channels=base.channels.map(ch=>{
    const name=g.doc.nodes[ch.node]?.name||'',replacement=updates.get(name+'|'+ch.path);
    if(!replacement)return ch;
    if(ch.sam.times.length!==N)throw Error('Unexpected sample count on '+name);
    count++;return {node:ch.node,path:ch.path,sam:{times:ch.sam.times,data:replacement,interpolation:'LINEAR'}};
  });
  if(count!==4||channels.length!==base.channels.length)throw Error('Only four joint tracks should be patched: '+count);
  for(let i=0;i<channels.length;i++){
    const name=g.doc.nodes[channels[i].node]?.name||'';
    if(!updates.has(name+'|'+channels[i].path)&&channels[i]!==base.channels[i])
      throw Error('A non-target track was modified: '+name);
  }
  g.animations.push({name:NAME,duration:base.duration,channels});
  const selector=document.getElementById('animations'),option=document.createElement('option');
  option.value=String(g.animations.length-1);option.textContent='★ Gallop V13.5 — 뒷비절 접힘 보정';selector.appendChild(option);
  selector.value=option.value;selector.dispatchEvent(new Event('change'));
  window.__horseGaitV13_5={ready:true,name:NAME,changedTracks:count,skinUntouched:true,foreUntouched:true,otherGaitsUntouched:true,verifiedOnUserGPU:false};
 }catch(e){window.__horseV13_5Error=e.message||String(e);console.error(e);}
},100);
})();