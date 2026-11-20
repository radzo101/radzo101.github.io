(() => {
 const reel=[
  {id:'echo', name:'Realistic sound physics', text:'The direct shot is followed by a delayed reflection from the far wall. The game models the extra distance the reflected sound travels.'},
  {id:'cloak', name:'Cloak and locomotion', text:'A third-person camera test shows movement physics and simulated cloak fabric.'},
  {id:'rig', name:'Procedural player motion', text:'The player rig uses procedural motion for the torso and legs.'},
  {id:'scout', name:'Scout drone', text:'A player-controlled FPV drone for exploring the bunker.'},
  {id:'mount', name:'Mounted drone', text:'Recoil from the mounted weapon changes the drone’s motion.'},
  {id:'impact', name:'Impact drone', text:'An FPV drone variant that triggers on impact.'},
  {id:'dual', name:'Twin-barrel drone', text:'A twin-barrel variant with different recoil behaviour from the standard mounted drone.'},
  {id:'skins-a', name:'Weapon finishes, first pass', text:'A set of weapon finishes applied to the in-game models.'},
  {id:'skins-b', name:'Weapon finishes, second pass', text:'Additional weapon skins in the development build.'}
 ];
 // Neutral tube transmission. Apply to the picture, not scene lights or the full reel.
 const tubeGain=.56;
 // The primary TV is an independent Three scene; no software-projected cabinet.
 function makeCRT(surface,buffers,poster){
  const T=window.THREE;if(!T)return null;
  let renderer;
  try{renderer=new T.WebGLRenderer({canvas:surface,alpha:true,antialias:true,powerPreference:'low-power'});}catch{return null;}
  renderer.setClearColor(0,0);renderer.outputColorSpace=T.SRGBColorSpace;
  renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
  const scene=new T.Scene(),body=new T.Group(),camera=new T.PerspectiveCamera(32,1,.1,60);
  scene.add(body);camera.position.set(0,.24,6.45);camera.lookAt(0,.23,0);
  scene.add(new T.HemisphereLight(0xf3edf0,0x4f4346,2.1));
  for(const [color,power,x,y,z] of [[0xffdcc2,3.1,-3,5,5],[0xc7d4f3,1.9,4,2,1],[0xffd1a6,1.5,-2,2,-4]]){
   const l=new T.DirectionalLight(color,power);l.position.set(x,y,z);scene.add(l);
  }
  const material=(color,roughness=.63,metalness=.06)=>new T.MeshStandardMaterial({color,roughness,metalness,side:T.DoubleSide});
  function add(geo,mat,x=0,y=0,z=0,into=body){
   const mesh=new T.Mesh(geo,mat);mesh.position.set(x,y,z);into.add(mesh);return mesh;
  }
  const cabinet=material(0x2b2b2e,.66),face=material(0x353435,.59),recess=material(0x141417,.45),
   trim=material(0x161619,.57),dark=material(0x08090c,.82),dial=material(0x3b3a3e,.44),
   anodized=material(0x777980,.34,.68),marker=material(0xc3beb8,.55);
  const N=48;
  function rounded(x,y,r,z,cx=0,cy=0){
   const points=[];
   for(let k=0;k<4;k++)for(let i=0;i<N/4;i++){
    const theta=(k+i/(N/4-1))*Math.PI/2,c=Math.cos(theta),s=Math.sin(theta);
    points.push([cx+(k===0||k===3?x-r:-x+r)+c*r,cy+(k<2?y-r:-y+r)+s*r,z]);
   }
   return points;
  }
  function loft(rings,mat){
   const points=rings.flat(2),indices=[];
   for(let k=0;k<rings.length-1;k++)for(let i=0;i<N;i++){
    const a=k*N+i,b=k*N+(i+1)%N,c=a+N,d=b+N;
    indices.push(a,c,b,b,c,d);
   }
   const geo=new T.BufferGeometry();
   geo.setAttribute('position',new T.Float32BufferAttribute(points,3));geo.setIndex(indices);geo.computeVertexNormals();
   return add(geo,mat);
  }
  const front=rounded(1.86,1.08,.155,.43),back=rounded(1.04,.72,.28,-1.20);
  loft([front,rounded(1.92,1.13,.168,.34),rounded(1.92,1.13,.17,.20),rounded(1.83,1.08,.19,-.34),
   rounded(1.54,.93,.24,-.78),rounded(1.23,.79,.27,-1.09),back],cabinet);
  loft([back,rounded(.95,.66,.23,-1.25),rounded(.0001,.0001,.00002,-1.25)],cabinet);
  const sx=-.305,sy=.033;
  const lip=rounded(1.355,.781,.13,.454,sx,sy);
  const edge=rounded(1.295,.728,.112,.377,sx,sy);
  loft([front,rounded(1.815,1.034,.145,.468),lip],face);
  loft([lip,rounded(1.33,.751,.124,.433,sx,sy),edge],recess);
  const glassPoint=(u,v,zOffset=0)=>{
   const xx=(u-.5)*2.590, yy=(v-.5)*1.456, dx=Math.abs(xx),dy=Math.abs(yy),r=.117;
   const ix=Math.max(0,dx-(1.295-r)),iy=Math.max(0,dy-(.728-r)),diam=Math.hypot(ix,iy);
   const corner=diam>r?r/diam:1;
   // The edge stays in the bezel at z=.378; the centre of the tube bows forward.
   const bulge=Math.max(0,Math.cos(Math.PI*(u-.5))*Math.cos(Math.PI*(v-.5)));
   return [sx+Math.sign(xx)*(dx-ix+ix*corner),sy+Math.sign(yy)*(dy-iy+iy*corner),
    .378+.192*Math.pow(bulge,1.12)+zOffset];
  };
  function screenGeometry(zOffset=0){
   const xyz=[],uv=[],ix=[],cols=32,rows=20;
   for(let j=0;j<=rows;j++)for(let i=0;i<=cols;i++){
    const u=i/cols,v=j/rows;xyz.push(...glassPoint(u,v,zOffset));uv.push(u,v);
    if(i<cols&&j<rows){const a=j*(cols+1)+i;ix.push(a,a+1,a+cols+1,a+1,a+cols+2,a+cols+1);}
   }
   const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(xyz,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));
   g.setIndex(ix);g.computeVertexNormals();return g;
  }
  const posterTexture=new T.Texture(poster);
  const configure=tx=>{tx.colorSpace=T.SRGBColorSpace;tx.minFilter=T.LinearFilter;tx.magFilter=T.LinearFilter;tx.generateMipmaps=false;return tx;};
  configure(posterTexture);
  poster.addEventListener('load',()=>{posterTexture.needsUpdate=true;});
  if(poster.complete&&poster.naturalWidth)posterTexture.needsUpdate=true;
  const videoTextures=new Map(buffers.map(item=>[item,configure(new T.VideoTexture(item))]));
  const picture=new T.MeshBasicMaterial({map:posterTexture,toneMapped:false});
  // The native player delivers display-referred pixels. Use the same gain in Three and CSS:
  // dim after output colour conversion so low-light footage is not crushed twice.
  picture.onBeforeCompile=shader=>{
   shader.uniforms.tubeGain={value:tubeGain};
   shader.fragmentShader='uniform float tubeGain;\n'+shader.fragmentShader.replace(
    '#include <colorspace_fragment>','#include <colorspace_fragment>\n gl_FragColor.rgb *= tubeGain;');
  };
  add(screenGeometry(),picture);
  const physicalGlass=new T.MeshPhysicalMaterial({color:0x5b6375,transparent:true,opacity:.047,roughness:.12,metalness:.13,clearcoat:.75,
   clearcoatRoughness:.20,depthWrite:false});
  add(screenGeometry(.003),physicalGlass).renderOrder=2;
  const noise=document.createElement('canvas');noise.width=96;noise.height=60;const nctx=noise.getContext('2d'),noisePixels=nctx.createImageData(96,60);
  const noiseTexture=configure(new T.CanvasTexture(noise)),snow=new T.MeshBasicMaterial({map:noiseTexture,transparent:true,opacity:0,depthWrite:false,toneMapped:false});
  const snowMesh=add(screenGeometry(.005),snow);snowMesh.renderOrder=3;
  function rectangular(w,h,d,r,mat,x,y,z){
   const sh=new T.Shape(),X=w/2,Y=h/2;
   sh.moveTo(-X+r,-Y);sh.lineTo(X-r,-Y);sh.quadraticCurveTo(X,-Y,X,-Y+r);sh.lineTo(X,Y-r);sh.quadraticCurveTo(X,Y,X-r,Y);
   sh.lineTo(-X+r,Y);sh.quadraticCurveTo(-X,Y,-X,Y-r);sh.lineTo(-X,-Y+r);sh.quadraticCurveTo(-X,-Y,-X+r,-Y);
   return add(new T.ExtrudeGeometry(sh,{depth:d,curveSegments:8,bevelEnabled:false}),mat,x,y,z);
  }
  rectangular(.55,1.59,.008,.083,trim,1.515,.036,.465);
  const knobGroups=[];
  for(const [row,r] of [[.59,.148],[.174,.115]]){
   const axis=new T.Group();body.add(axis);axis.position.set(1.52,row,.465);
   const surround=add(new T.CylinderGeometry(r*1.11,r*1.11,.023,40),dark,0,0,.012,axis);surround.rotation.x=Math.PI/2;
   const control=add(new T.CylinderGeometry(r*.91,r,.066,48,1,false),dial,0,0,.053,axis);control.rotation.x=Math.PI/2;
   const highlight=add(new T.CylinderGeometry(r*.82,r*.90,.010,48),material(0x3e3e43,.43),0,0,.09,axis);highlight.rotation.x=Math.PI/2;
   add(new T.BoxGeometry(.011,r*.34,.005),marker,0,r*.61,.097,axis);
   knobGroups.push(axis);
  }
  for(let i=0;i<12;i++)rectangular(.356,.015,.003,.006,dark,1.51,-.108-i*.043,.477);
  const ledSeat=add(new T.CylinderGeometry(.042,.044,.011,28),dark,1.620,-.880,.469);ledSeat.rotation.x=Math.PI/2;
  const led=add(new T.CylinderGeometry(.023,.024,.013,28),new T.MeshStandardMaterial({color:0x632327,emissive:0xaa121a,emissiveIntensity:.64,roughness:.45}),1.620,-.88,.477);
  led.rotation.x=Math.PI/2;
  const rod=(a,b,r1,r2,mat)=>{
   const A=new T.Vector3(...a),B=new T.Vector3(...b),delta=B.clone().sub(A);
   const mesh=add(new T.CylinderGeometry(r2,r1,delta.length(),12),mat);
   mesh.position.copy(A).addScaledVector(delta,.5);mesh.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize());
  };
  const aerialBase=[.10,1.068,-.43];add(new T.SphereGeometry(.085,20,12),trim,...aerialBase).scale.y=.62;
  for(const tip of [[-.455,1.65,-.54],[.70,1.62,-.34]]){
   const mid=aerialBase.map((x,i)=>(x+tip[i])*.5);rod(aerialBase,mid,.019,.015,anodized);rod(mid,tip,.011,.009,anodized);
   add(new T.SphereGeometry(.023,12,8),trim,...tip);
  }
  let W=0,H=0,lastNoise=0;
  const mapPoint=(p,w,h)=>{
   const v=new T.Vector3(...p).applyMatrix4(body.matrixWorld).project(camera);
   return [(v.x+1)*w*.5,(1-v.y)*h*.5];
  };
  function draw({yaw,pitch,drift,source,staticLevel,dial}){
   const w=surface.clientWidth,h=surface.clientHeight;if(w<10||h<10)return null;
   if(W!==w||H!==h){W=w;H=h;renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio||1,1.55));renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
   body.rotation.set(pitch,yaw,drift*.012-.015);
   knobGroups[0].rotation.z=dial;knobGroups[1].rotation.z=-dial*.62;
   picture.map=videoTextures.get(source)||posterTexture;picture.color.setHex((poster.naturalWidth||videoTextures.has(source))?0xffffff:0x201d24);
   const now=performance.now();
   snowMesh.visible=staticLevel>.01;snow.opacity=staticLevel*.46;
   if(snowMesh.visible&&now-lastNoise>52){
    for(let i=0;i<noisePixels.data.length;i+=4){const v=Math.random()*100+28;noisePixels.data[i]=v;noisePixels.data[i+1]=v;noisePixels.data[i+2]=v+7;noisePixels.data[i+3]=255;}
    nctx.putImageData(noisePixels,0,0);noiseTexture.needsUpdate=true;lastNoise=now;
   }
   renderer.render(scene,camera);
   const corners=[[0,0],[1,0],[0,1],[1,1]].map(([u,v])=>mapPoint(glassPoint(u,v),w,h));
   return {glassRect:{left:Math.min(...corners.map(p=>p[0])),top:Math.min(...corners.map(p=>p[1])),
    right:Math.max(...corners.map(p=>p[0])),bottom:Math.max(...corners.map(p=>p[1]))},labelPin:mapPoint(glassPoint(.18,.63),w,h)};
  }
  return {draw};
 }
 // Native DOM media remains the fallback if the optional tube mapping cannot run.
 function makeCurvedPreview(canvas){
  if(!canvas)return null;
  try{
   const ctx=canvas.getContext('2d');if(!ctx)return null;
   let width=0,height=0,previous=null,previousTime=-1;
   return source=>{
    const sw=source?.videoWidth||source?.naturalWidth,sh=source?.videoHeight||source?.naturalHeight;
    const w=Math.round(Math.min(760,canvas.clientWidth*1.4)),h=Math.round(w*canvas.clientHeight/(canvas.clientWidth||1));
    if(!sw||!sh||w<12||h<10){if(source!==previous)canvas.classList.remove('live');return;}
    if(w===width&&h===height&&previous===source&&previousTime===(source.currentTime||0))return;
    if(w!==width||h!==height){canvas.width=width=w;canvas.height=height=h;}
    const fit=Math.min(w/sw,h/sh),y=(h-sh*fit)*.5;
    ctx.clearRect(0,0,w,h);ctx.fillStyle='#101014';ctx.fillRect(0,0,w,h);
    try{
     const strips=27;
     const bowed=v=>v+.035*Math.sin(Math.PI*2*v);
     for(let j=0;j<strips;j++){
      const v0=j/strips,v1=(j+1)/strips,vm=(v0+v1)*.5;
      const scale=.986+.076*Math.sin(Math.PI*vm);
      const dw=sw*fit*scale, dy=y+bowed(v0)*sh*fit, yh=(bowed(v1)-bowed(v0))*sh*fit;
      ctx.drawImage(source,0,sh*v0,sw,sh/strips,(w-dw)*.5,dy,dw,yh+.5);
     }
     canvas.classList.add('live');previous=source;previousTime=source.currentTime||0;
    }catch{canvas.classList.remove('live');}
   };
  }catch{return null;}
 }
 const $=id=>document.getElementById(id), d=$('film-dialog'), vid=$('film-player'), listing=$('film-list');
 const tv=$('bunker-tv'), button=$('tv-float'), glass=$('tv-glass'), poster=$('tv-poster'), surface=$('tv-model');
 const label=$('tv-label'), name=$('tv-name'), leader=$('tv-leader');
 if(![d,vid,listing,tv,button,glass,poster,label,name,leader,surface].every(Boolean))return;
 let model=null,triedThree=false;
 const fallbackTube=makeCurvedPreview($('tv-curved-preview'));
 const buffers=[...glass.querySelectorAll('video')],line=leader.querySelector('polyline'),pin=leader.querySelector('circle');
 const starts=[3.10,5.00,7.10,3.50,6.40,5.20,3.20,4.10,6.50];
 const reduce=matchMedia('(prefers-reduced-motion: reduce)');
 const path=(item,ext)=>'assets/films/'+item.id+'.'+ext;
 const clamp=x=>Math.min(1,Math.max(0,x)),ease=x=>{const q=clamp(x);return q*q*(3-2*q);};
 const mix=(a,b,p)=>a+(b-a)*p;
 let idx=0,active=0,front=0,activatable=false,running=false,closing=false;
 let nextTimer=0,staticTimer=0,finishTimer=0,tunerRotation=0,switchAt=-Infinity;
 let dial=0,frameAt=0,lastRender=-Infinity,lastFrame=null;
 for(const item of reel){
  const opt=document.createElement('option');opt.value=item.id;opt.textContent=item.name;listing.append(opt);
 }
 for(const buf of buffers){
  buf.muted=true;buf.defaultMuted=true;
  buf.addEventListener('loadedmetadata',()=>{
   const excerpt=Number(buf.dataset.clip);
   const mark=Math.min(starts[excerpt]||0,Math.max(0,buf.duration-3.15));
   if(Number.isFinite(mark)&&Math.abs(buf.currentTime-mark)>.06){try{buf.currentTime=mark;return;}catch{}}
   if(buf.readyState>=2)ready(buf);
  });
  buf.addEventListener('loadeddata',()=>{if(!buf.seeking)ready(buf);});
  buf.addEventListener('seeked',()=>ready(buf));
  buf.addEventListener('error',()=>{buf.classList.remove('live');});
 }
 function ready(buf){
  buf.dataset.ready='yes';
  if(running&&buf===buffers[front]&&Number(buf.dataset.clip)===active)play(buf);
 }
 function play(buf){
  const expected=active;
  buf.play().then(()=>{
   if(running&&buf===buffers[front]&&active===expected)buf.classList.add('live');
  }).catch(()=>{});
 }
 function preload(buf,i){
  if(Number(buf.dataset.clip)===i){
   if(running&&buf===buffers[front]&&buf.dataset.ready==='yes')play(buf);
   return;
  }
  buf.pause();buf.classList.remove('live');delete buf.dataset.ready;buf.dataset.clip=String(i);
  buf.preload='auto';buf.src=path(reel[i],'mp4');buf.load();
 }
 function identify(i){
  active=i;const item=reel[i];
  tv.dataset.channel=String(i+1);
  name.textContent=item.name;poster.src=path(item,'webp');
  button.setAttribute('aria-label','Watch '+item.name+' and the full Bunker Bound development reel');
 }
 function cueNext(){clearTimeout(nextTimer);nextTimer=setTimeout(tune,3080);}
 function tune(){
  if(!running)return;
  tv.classList.add('switching');
  tunerRotation+=112*Math.PI/180;switchAt=performance.now();
  tv.style.setProperty('--tuner-turn',tunerRotation+'rad');tv.style.setProperty('--fine-turn',(-tunerRotation*.62)+'rad');
  staticTimer=setTimeout(()=>{
   if(!running)return;
   const next=(active+1)%reel.length,old=buffers[front];
   old.pause();old.classList.remove('live');front=1-front;
   identify(next);preload(buffers[front],next);
   preload(old,(next+1)%reel.length);
   finishTimer=setTimeout(()=>tv.classList.remove('switching'),250);
   cueNext();
  },232);
 }
 function refreshPlayback(){
  const enabled=activatable&&!d.open&&!document.hidden&&!reduce.matches;
  if(enabled===running)return;
  running=enabled;
  if(enabled){
   preload(buffers[front],active);
   // Load a single next excerpt in advance; never play from the hidden buffer.
   preload(buffers[1-front],(active+1)%reel.length);
   cueNext();
  }else{
   clearTimeout(nextTimer);clearTimeout(staticTimer);clearTimeout(finishTimer);
   tv.classList.remove('switching');buffers.forEach(b=>b.pause());
  }
 }
 identify(0);
 document.addEventListener('visibilitychange',refreshPlayback);reduce.addEventListener?.('change',refreshPlayback);
 window.drawBunkerTV=function(relative,t,W,H,narrow,selected){
  const arrival=ease((relative-2.32)/.63),departure=ease((relative-3.12)/.48),alpha=arrival*(1-departure);
  tv.hidden=alpha<.003;
  const canPlay=selected&&alpha>.63;
  if(canPlay!==activatable){
   activatable=canPlay;tv.setAttribute('aria-hidden',String(!canPlay));button.tabIndex=canPlay?0:-1;
   button.disabled=!canPlay;refreshPlayback();
  }
  if(tv.hidden)return;
  if(!triedThree){
   triedThree=true;
   try{model=makeCRT(surface,buffers,poster);}catch{model=null;}
   tv.classList.toggle('three-tv',!!model);
  }
  const drift=reduce.matches?0:Math.sin(t*.81),spread=reduce.matches?0:Math.sin(t*.53+.7);
  const f=reduce.matches?0:1-arrival, q=reduce.matches?0:departure;
  const mobileLandscape=W<=1024&&H<=520&&W>H;
  const portrait=narrow&&!mobileLandscape;
  const x=W*(portrait?.50:mobileLandscape?.744:.717)+W*(f*.17+q*.15)+spread*5;
  const y=H*(portrait?(H<675?.266:.259):mobileLandscape?.415:.458)+H*(f*.12-q*.095)+drift*5;
  tv.style.opacity=String(alpha);
  button.style.transform=`translate3d(${x}px,${y}px,0) translate(-50%,-50%) scale(${1-.19*f-.15*q})`;
  const bounds=surface.getBoundingClientRect(),stage=tv.getBoundingClientRect(),scaleX=bounds.width/(surface.clientWidth||1),scaleY=bounds.height/(surface.clientHeight||1);
  const left=bounds.left-stage.left,top=bounds.top-stage.top;
  const now=performance.now(),dt=Math.min(.08,(now-frameAt)/1000);
  if(now-lastRender>29||!Number.isFinite(lastRender)){
   frameAt=now;lastRender=now;
   dial=mix(dial,tunerRotation,1-Math.exp(-dt*13));
   const yaw=-.235+spread*.05-f*.24+q*.24;
   const pitch=-.04+drift*.024;
   const elapsed=now-switchAt,staticLevel=running&&elapsed>=0&&elapsed<480?Math.sin(Math.PI*elapsed/480)**1.2:0;
   const video=buffers[front],source=video.classList.contains('live')&&video.readyState>=2?video:poster;
   try{lastFrame=model?.draw({yaw,pitch,drift,source,staticLevel,dial})||null;}catch{model=null;lastFrame=null;tv.classList.remove('three-tv');}
   if(!model)fallbackTube?.(source);
  }
  const g=lastFrame?.glassRect,labelWidth=label.offsetWidth||112;
  const fallback=glass.getBoundingClientRect();
  const gx=g?left+g.left*scaleX:fallback.left-stage.left,gy=g?top+g.top*scaleY:fallback.top-stage.top;
  const gh=g?(g.bottom-g.top)*scaleY:fallback.height;
  const pinAt=lastFrame?.labelPin;
  const sx=pinAt?left+pinAt[0]*scaleX:gx+fallback.width*.18,sy=pinAt?top+pinAt[1]*scaleY:gy+gh*.37;
  const lx=portrait?W*.035:Math.max(W*.27,gx-labelWidth-(mobileLandscape?13:26));
  const ly=portrait?Math.max(5,gy-29):Math.min(H*.64,gy+gh*.47+spread*5);
  label.style.transform=`translate(${lx}px,${ly}px)`;
  const ex=lx+labelWidth+7,ey=ly+(portrait?6:7);
  leader.setAttribute('viewBox',`0 0 ${W} ${H}`);
  line.setAttribute('points',`${sx},${sy} ${mix(sx,ex,.62)},${ey} ${ex},${ey}`);
  pin.setAttribute('cx',sx);pin.setAttribute('cy',sy);
 };
 function select(i){
  idx=(i+reel.length)%reel.length;
  const item=reel[idx];
  listing.value=item.id;
  $('film-heading').textContent=item.name;
  $('film-caption').textContent=item.text;
  $('film-error').hidden=true;vid.pause();vid.poster=path(item,'webp');vid.src=path(item,'mp4');vid.load();
  vid.play().catch(()=>{});
 }
 function fly(rect,reverse){
  const target=vid.getBoundingClientRect();
  if(!rect||!target.width||!rect.width||reduce.matches||!vid.animate)return Promise.resolve();
  const embedded={transform:'translate('+((rect.left+rect.width/2)-(target.left+target.width/2))+'px,'+((rect.top+rect.height/2)-(target.top+target.height/2))+'px) scale('+(rect.width/target.width)+','+(rect.height/target.height)+')',opacity:.93};
  const full={transform:'translate(0,0) scale(1)',opacity:1};
  return vid.animate(reverse?[full,embedded]:[embedded,full],{duration:reverse?320:530,easing:'cubic-bezier(.2,.72,.25,1)',fill:'both'}).finished.catch(()=>{});
 }
 function projectedGlassRect(){
  const g=lastFrame?.glassRect,b=surface.getBoundingClientRect();
  if(!g)return glass.getBoundingClientRect();
  const sx=b.width/(surface.clientWidth||1),sy=b.height/(surface.clientHeight||1);
  return {left:b.left+g.left*sx,top:b.top+g.top*sy,width:(g.right-g.left)*sx,height:(g.bottom-g.top)*sy};
 }
 function open(){
  if(!activatable||d.open)return;
  const rect=projectedGlassRect();vid.muted=true;d.showModal();refreshPlayback();select(active);
  fly(rect,false);$('film-close').focus({preventScroll:true});
 }
 async function dismiss(){
  if(!d.open||closing)return;
  closing=true;vid.pause();d.dataset.closing='';
  await fly(tv.hidden?null:projectedGlassRect(),true);
  vid.getAnimations?.().forEach(a=>a.cancel());
  d.close();delete d.dataset.closing;closing=false;
  if(!button.disabled)button.focus({preventScroll:true});
 }
 button.addEventListener('click',open);
 $('film-close').addEventListener('click',dismiss);
 $('film-prev').addEventListener('click',()=>select(idx-1));
 $('film-next').addEventListener('click',()=>select(idx+1));
 listing.addEventListener('change',()=>select(reel.findIndex(r=>r.id===listing.value)));
 d.addEventListener('cancel',e=>{e.preventDefault();dismiss();});
 d.addEventListener('close',()=>{
  vid.pause();vid.removeAttribute('src');vid.load();refreshPlayback();
 });
 vid.addEventListener('error',()=>{if(d.open&&vid.hasAttribute('src'))$('film-error').hidden=false;});
})();
