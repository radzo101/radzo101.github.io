(() => {
const T=window.THREE, parent=document.querySelector('#stage'), c=document.querySelector('#space');
if(!T||!parent||!c)return;
let renderer,soft=false;
const opts={alpha:true,antialias:true,powerPreference:'high-performance'};
const gl=c.getContext('webgl2',opts)||c.getContext('webgl',opts);
if(gl) try{renderer=new T.WebGLRenderer({canvas:c,context:gl,...opts});}catch{}
if(renderer){
 renderer.setClearColor(0,0);renderer.outputColorSpace=T.SRGBColorSpace;
 renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.11;
}else{
 const surface=gl?c.cloneNode():c;
 if(gl){surface.removeAttribute('id');surface.className='software';parent.append(surface)}
 const g=surface.getContext('2d');
 if(!g)return;
 soft=true;
 let sw=1,sh=1,ratio=1;
 const a=new T.Vector3(), b=new T.Vector3(), d=new T.Vector3(), mvp=new T.Matrix4(), vp=new T.Matrix4();
 const normal=new T.Vector3(), edge=new T.Vector3(), edge2=new T.Vector3();
 const pointPalette=new Array(32768);
 const toHue=n=>Math.round(31*Math.sqrt(Math.max(0,Math.min(1,n))));
 const key=new T.Vector3(.64,.8,1.1).normalize(), rim=new T.Vector3(-.7,.25,-1).normalize();
 const makeColor=(material,n,facet)=>{
  const col=facet||material.color,l=.32+Math.max(0,n.dot(key))*.66,r=Math.max(0,n.dot(rim))*.35;
  const mix=(x,y)=>Math.min(255,Math.round(255*Math.pow(Math.max(0,x*l+y*r),.66)));
  if(material.userData?.copper){
   // Neutral light on copper so the purple scene rim doesn't recolor gold when flipped.
   const tone=x=>Math.min(255,Math.round(255*Math.pow(Math.max(0,x*(l+.36+r*.34)),.55)));
   return 'rgb('+tone(col.r)+','+tone(col.g)+','+tone(col.b)+')';
  }
  return 'rgb('+mix(col.r,.43)+','+mix(col.g,.24)+','+mix(col.b,1)+')';
 };
 renderer={
  setPixelRatio(x){ratio=x},
  setSize(w,h){sw=w;sh=h;surface.width=w*ratio;surface.height=h*ratio;g.setTransform(ratio,0,0,ratio,0,0)},
  render(sc,camera){
   sc.updateMatrixWorld();camera.updateMatrixWorld();vp.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);
   g.clearRect(0,0,sw,sh);
   const faces=[];
   sc.traverseVisible(o=>{
    if(!o.isMesh&&!o.isPoints)return;
    const xyz=o.geometry.attributes.position, ix=o.geometry.index;
    mvp.multiplyMatrices(vp,o.matrixWorld);
    if(o.isPoints){
     const sculpt=o.userData.sculpture,color=o.geometry.attributes.color,mat=o.material;
     g.globalAlpha=mat.opacity??.46;g.globalCompositeOperation=sculpt?'lighter':'source-over';
     for(let i=0;i<xyz.count;i+=sculpt?1:2){
      a.fromBufferAttribute(xyz,i).applyMatrix4(mvp);if(a.z<-1||a.z>1)continue;
      if(sculpt){
       const R=toHue(color?color.getX(i):mat.color.r),G=toHue(color?color.getY(i):mat.color.g),B=toHue(color?color.getZ(i):mat.color.b);
       const id=R*1024+G*32+B;
       g.fillStyle=pointPalette[id]??(pointPalette[id]='rgb('+(R*8)+','+(G*8)+','+(B*8)+')');
      }else g.fillStyle='#b994ba';
      const dim=sculpt?(o.name==='Hot traveling particles'?2.28:i%11===0?2.0:1.43):(a.z>.991?.8:1.5);
      g.fillRect((a.x+1)*sw/2,(1-a.y)*sh/2,dim,dim);
     }
     g.globalCompositeOperation='source-over';
     g.globalAlpha=1;return;
    }
    const N=ix?ix.count:xyz.count, material=o.material;
    for(let i=0;i<N;i+=3){
     const ia=ix?ix.getX(i):i, ib=ix?ix.getX(i+1):i+1,ic=ix?ix.getX(i+2):i+2;
     a.fromBufferAttribute(xyz,ia).applyMatrix4(mvp);b.fromBufferAttribute(xyz,ib).applyMatrix4(mvp);d.fromBufferAttribute(xyz,ic).applyMatrix4(mvp);
     const area=(b.x-a.x)*(d.y-a.y)-(b.y-a.y)*(d.x-a.x);
     if(area<.000001&&material.side!==T.DoubleSide)continue;
     if(Math.abs(area)<.000001||Math.min(a.z,b.z,d.z)>1)continue;
     faces.push([(a.z+b.z+d.z)/3,(a.x+1)*sw/2,(1-a.y)*sh/2,(b.x+1)*sw/2,(1-b.y)*sh/2,(d.x+1)*sw/2,(1-d.y)*sh/2,makeColor(material,normal.crossVectors(edge.subVectors(b.fromBufferAttribute(xyz,ib).applyMatrix4(o.matrixWorld),a.fromBufferAttribute(xyz,ia).applyMatrix4(o.matrixWorld)),edge2.subVectors(d.fromBufferAttribute(xyz,ic).applyMatrix4(o.matrixWorld),a)).normalize(),o.geometry.userData.facetColors?.[i/3]),material.opacity??1]);
    }
   });
   faces.sort((a,b)=>b[0]-a[0]);
   for(const [,x,y,X,Y,p,q,col,op] of faces){g.globalAlpha=op;g.beginPath();g.moveTo(x,y);g.lineTo(X,Y);g.lineTo(p,q);g.closePath();g.fillStyle=col;g.strokeStyle=col;g.lineWidth=.42;g.fill();g.stroke();}g.globalAlpha=1;
  }
 };
}
parent.classList.add('has-3d');c.dataset.renderer=soft?'canvas':'webgl';
const scene=new T.Scene(), cam=new T.PerspectiveCamera(36,1,.1,100);
cam.position.set(0,0,18);
scene.add(new T.HemisphereLight(0xe9f1ff,0x383d50,2.35));
function light(color,strength,x,y,z){const l=new T.DirectionalLight(color,strength);l.position.set(x,y,z);scene.add(l);}
light(0xf3f7ff,3.45,4,5,5);light(0xa8b9fb,2.8,-4,2,-6);light(0x8dadeb,1.5,-5,-3,5);
const reduce=matchMedia('(prefers-reduced-motion: reduce)');
const root=new T.Group();scene.add(root);
let ram,retro,storage;
const stations=['home','ram','bunker','retro','radllm','xp','end'];
const titleByRef={U1:'USB controller',U7:'PSRAM chip 1',U8:'PSRAM chip 2',U9:'PSRAM chip 3',U10:'PSRAM chip 4',C16:'Hold-up capacitor',J1:'USB connector',BOARD:'64 × 38 mm PCB'};
const ramSteps=[
 {label:'Board',text:['RAD-RAM is a USB drive for temporary files. It stores them in self-refreshing PSRAM, which loses its contents when power runs out. The KiCad design has not been tested on a physical board.'],refs:['J1','J2','BOARD']},
 {label:'Memory',text:['Four 8 MiB PSRAM chips connect to the USB controller for a target capacity of 32 MiB.'],refs:['U1','U7','U8','U9','U10']},
 {label:'Hold-up',text:['A capacitor is designed to keep the memory powered briefly after unplugging. Retention time has not been measured.'],refs:['C16','U12','J2']}
];
titleByRef.U12='Retained RAM supply';
const story={...window.STORY,ram:{title:'RAD-RAM',steps:ramSteps}};
if(!stations.slice(1,-1).every(k=>story[k]?.steps?.length>=3))return;
const tone=[[0x282135,0x14101f],[0x38242b,0x1c1425],[0x30282a,0x161719],[0x213030,0x121822],[0x252640,0x111422],[0x3a2620,0x18121d],[0x382536,0x17101d]];
const PI=Math.PI;let seed=917;
function rand(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;}
const sculpture=window.makeIntroSculpture(T,{soft});root.add(sculpture.group);
const coords=[],brightness=[];
for(let i=0;i<1150;i++){
 const z=2*rand()-1,a=2*PI*rand(),r=3+Math.pow(rand(),1.6)*7,d=Math.sqrt(1-z*z);coords.push(r*d*Math.cos(a),r*d*Math.sin(a),r*z);
 const b=rand();brightness.push(.47+b*.5,.33+b*.35,.42+b*.34);
}
const dustGeo=new T.BufferGeometry();dustGeo.setAttribute('position',new T.Float32BufferAttribute(coords,3));dustGeo.setAttribute('color',new T.Float32BufferAttribute(brightness,3));
const dust=new T.Points(dustGeo,new T.PointsMaterial({size:.032,vertexColors:true,transparent:true,depthWrite:false,opacity:.58,blending:T.AdditiveBlending}));scene.add(dust);
const qs=id=>document.getElementById(id), intro=qs('intro'),project=qs('project'),ending=qs('ending'),jump=qs('jump'),live=qs('live'),slider=document.querySelector('#timeline i'),detail=qs('detail-text'),steps=qs('steps'),imageField=qs('bunker-field'),photos=[...imageField.children];
const mobileJump=qs('mobile-jump'),terminalView=qs('radllm-view');
const terminalPanes=[...terminalView.querySelectorAll('[data-terminal-pane]')];
for(const link of jump.querySelectorAll('button')){const item=document.createElement('option');item.value=link.dataset.go;item.textContent=link.textContent;mobileJump.append(item);}
const photoOverlay=qs('photo-leaders'),photoLabels=qs('photo-labels');
const photoTags=['Character and first-person hands','Firing range and reload','Muzzle flash and ejected casing','Bunker room and creatures'].map(title=>{
 const ns='http://www.w3.org/2000/svg',line=document.createElementNS(ns,'polyline'),pin=document.createElementNS(ns,'circle'),tag=document.createElement('span');
 line.setAttribute('class','annotation-line');pin.setAttribute('class','annotation-pin');pin.setAttribute('r','2.1');tag.className='scene-annotation gallery-annotation';tag.textContent=title;
 photoOverlay.append(line,pin);photoLabels.append(tag);return {tag,line,pin};
});
const styleTint=tone.map(([a,b])=>['#'+a.toString(16).padStart(6,'0'),'#'+b.toString(16).padStart(6,'0')]);
const clamp=(n,a=0,b=1)=>Math.min(b,Math.max(a,n)), ease=n=>{const a=clamp(n);return a*a*(3-2*a);};
const lerp=(a,b,p)=>a+(b-a)*p;
const starts=stations.reduce((acc,scene,i)=>[...acc,i?acc[i-1]+(story[stations[i-1]]?.steps.length??1):0],[]);
const max=starts.at(-1),endIndex=stations.length-1;
const ramIndex=stations.indexOf('ram'),bunkerIndex=stations.indexOf('bunker'),retroIndex=stations.indexOf('retro'),xpIndex=stations.indexOf('xp');
const rStart=starts[retroIndex],xpStart=starts[xpIndex];
const indexAt=n=>starts.reduce((i,start,j)=>Math.round(n)>=start?j:i,0);
const first=i=>starts[i];
function parseHash(){const hash=location.hash.slice(1);const [key,step]=hash.split('-');const index=stations.indexOf(key);return index>=0?first(index)+clamp(Number(step)||0,0,index&&index<endIndex?story[stations[index]].steps.length-1:0):0;}
let target=parseHash(),pos=reduce.matches?target:target===0?0:Math.max(0,target-1.7),section=-1,step=-1,started=false, last=0,lastDraw=0,frame=0, W=0,H=0, narrow=false,mouseX=0,mouseY=0,touchY=null,touchX=null,touchDrag=false,touchTravel=0,touchStartAt=0,newWheel=0;
let labelSet=[],currentPhoto=0,crossing=null,clipVisibleMotion=0;
const evidence=qs('xp-evidence'), closeUpButton=qs('xp-enlarge');
const shots=[qs('xp-detection'),qs('xp-review')];
function closeUp(active){
 if(parent.classList.contains('evidence-open')===active)return;
 parent.classList.toggle('evidence-open',active);
 closeUpButton.setAttribute('aria-expanded',String(active));closeUpButton.textContent=active?'Back to the scene':'Read close-up';
}
closeUpButton.addEventListener('click',()=>closeUp(!parent.classList.contains('evidence-open')));
const projectTitle=qs('project-title'), game=qs('game-link');
function add(cls,tag='div'){const e=document.createElement(tag);e.className=cls;return e;}
function writeMotion(el,copy,stagger=0){
 el.replaceChildren();
 if(reduce.matches){el.textContent=copy;return;}
 const visible=add('sr','span');visible.textContent=copy;el.append(visible);
 const ink=add('phrase-ink','span');ink.setAttribute('aria-hidden','true');
 copy.split(/(\s+)/).forEach((word,i)=>{
  if(!word.trim()){ink.append(document.createTextNode(word));return;}
  const clip=add('phrase-clip','span'),glyph=add('phrase-word','span');
  glyph.textContent=word;glyph.style.setProperty('--wait',Math.min(stagger+i*12,240)+'ms');
  clip.append(glyph);ink.append(clip);
 });
 el.append(ink);
}
function clearLabels(){labelSet=[];qs('leaders').replaceChildren();qs('callouts').replaceChildren();}
function buildLabels(refs,names=titleByRef){
 clearLabels();
 for(const ref of refs){
  const line=document.createElementNS('http://www.w3.org/2000/svg','polyline'),pin=document.createElementNS('http://www.w3.org/2000/svg','circle'), caption=add('scene-annotation callout');
  line.setAttribute('class','annotation-line');pin.setAttribute('class','annotation-pin');pin.setAttribute('r','2.1');
  const component=(section===retroIndex?(step>=3?storage:retro):ram)?.parts[ref];
  if(component?.partNumber&&component?.role){
   const role=add('callout-role','span'),part=add('callout-part','span');
   role.textContent=component.role;part.textContent=component.partNumber+(ref.startsWith('U')?' · '+ref:'');
   caption.append(role,part);
  }else caption.textContent=component?.label||names[ref]||ref;
  caption.dataset.ref=ref;
  qs('leaders').append(line,pin);qs('callouts').append(caption);labelSet.push({line,pin,caption,ref});
 }
}
const layerKey=document.createElement('div');layerKey.id='layer-key';layerKey.hidden=true;layerKey.innerHTML='<span>Front</span><span>Inner 1</span><span>Inner 2</span><span>Back</span>';project.append(layerKey);
// Optional hardware inspection is independent of narrative timing.
const hardwareView={ram:0,retro:0,storage:0},hardwareTurn={ram:0,retro:0,storage:0};
const viewControls=document.createElement('div'),viewButton=document.createElement('button');
viewControls.id='hardware-view-controls';viewControls.hidden=true;
viewButton.type='button';viewButton.setAttribute('aria-pressed','false');
viewControls.append(viewButton);project.append(viewControls);
const hardwareKey=()=>section===ramIndex?'ram':section===retroIndex?(step>=3?'storage':'retro'):null;
function updateHardwareControl(){
 const key=hardwareKey();viewControls.hidden=!key;
 if(!key)return;
 viewButton.textContent=hardwareView[key]?'View component side':'View underside';
 viewButton.setAttribute('aria-label',(hardwareView[key]?'View component side of ':'View underside of ')+({ram:'RAD-RAM',retro:'RetroPC memory module',storage:'RetroPC storage module'}[key]));
 viewButton.setAttribute('aria-pressed',String(!!hardwareView[key]));
}
viewButton.addEventListener('click',()=>{
 const key=hardwareKey();if(!key)return;hardwareView[key]=1-hardwareView[key];
 updateHardwareControl();live.textContent=(hardwareView[key]?'Underside':'Component side')+' copper inspection';start();
});

function setLandscape(s,k){
 const chapter=story[stations[s]],data=chapter?.steps[k];
 intro.hidden=!!s; ending.hidden=s!==endIndex;project.hidden=!data;
 parent.dataset.chapter=stations[s];parent.dataset.step=String(k);
 terminalView.setAttribute('aria-hidden',String(stations[s]!=='radllm'));
 terminalPanes.forEach((pane,i)=>pane.setAttribute('aria-hidden',String(i!==k)));
 mobileJump.value=String(s);
 project.scrollTop=0;
 updateHardwareControl();
 if(s!==xpIndex||k===2)closeUp(false);
 evidence.inert=s!==xpIndex||k===2;
 evidence.setAttribute('aria-hidden',String(evidence.inert));
 qs('xp-video').hidden=s!==xpIndex||k!==2;
 const xpClip=qs('xp-gameplay');xpClip.inert=s!==xpIndex||k!==2;xpClip.setAttribute('aria-hidden',String(xpClip.inert));
 shots.forEach((img,i)=>img.setAttribute('aria-hidden',String(i!==k)));
 game.hidden=s!==bunkerIndex;
 layerKey.hidden=!(s===retroIndex&&((k===2&&retro)||(k===4&&storage)));
 jump.querySelectorAll('button').forEach(b=>{if(Number(b.dataset.go)===s)b.setAttribute('aria-current','true');else b.removeAttribute('aria-current')});
 if(data){
  if(projectTitle.dataset.chapter!==String(s)){writeMotion(projectTitle,chapter.title);projectTitle.dataset.chapter=String(s);}
  const old=steps.children.length===chapter.steps.length&&Number(steps.dataset.section)===s;
  if(!old){
   steps.replaceChildren(...chapter.steps.map((a,i)=>{const b=add('','button');b.type='button';b.dataset.step=i;b.textContent=a.label;return b}));
   steps.dataset.section=s;
  }
  Array.from(steps.children).forEach((b,i)=>b.setAttribute('aria-pressed',String(i===k)));
  detail.replaceChildren(...data.text.map((line,i)=>{const p=add('','p');writeMotion(p,line,58+i*60);return p}));
  currentPhoto=k;
  if(s===ramIndex&&ram)buildLabels(data.refs);
  else if(s===retroIndex&&k>=3&&storage)buildLabels(storage.labelRefs,storage.labelNames);
  else if(s===retroIndex&&k>=1&&k<3&&retro){const refs=retro.labelRefs||[];buildLabels(refs,retro.labelNames);}
  else clearLabels();
 }else clearLabels();
 live.textContent=data?chapter.title+': '+data.label:s===endIndex?'End':'Home';
}
function choose(n,save=false){
 target=clamp(n,0,max);
 crossing=save&&Math.abs(pos-target)>2.4&&!reduce.matches?{from:pos,to:target,showXp:clipVisibleMotion>.003||Math.abs(target-(xpStart+2))<.51}:null;
 if(reduce.matches)pos=target;
 if(save){
  const i=indexAt(target), k=i?clamp(Math.round(target)-first(i),0,i===endIndex?0:story[stations[i]].steps.length-1):0;
  const h=i?'#'+stations[i]+(k?'-'+k:''):'#home';
  if(location.hash!==h) history.replaceState(null,'',h);
 }
 start();
}
function nearest(dir){const eps=.04;return dir>0?Math.floor(target+eps)+1:Math.ceil(target-eps)-1;}
window.addEventListener('wheel',e=>{
 if(e.ctrlKey||document.querySelector('dialog[open]')||parent.classList.contains('evidence-open'))return;
 e.preventDefault();
 const px=(e.deltaMode===1?e.deltaY*16:e.deltaMode===2?e.deltaY*H:e.deltaY);
 if(Math.abs(px)<.5)return;
 newWheel+=Math.abs(px);
 choose(target+clamp(px,-116,116)/465);
},{passive:false});
parent.addEventListener('touchstart',e=>{
 const point=e.touches[0],el=e.target;
 const native=el.closest('button,a,input,select,video,dialog')||(el.closest('#project')&&project.scrollHeight>project.clientHeight+1);
 touchX=touchY=null;touchDrag=false;
 if(native||e.touches.length!==1||!point)return;
 touchX=point.clientX;touchY=point.clientY;touchStartAt=target;touchTravel=0;
},{passive:true});
parent.addEventListener('touchmove',e=>{
 if(touchY===null||e.touches.length!==1||document.querySelector('dialog[open]')||parent.classList.contains('evidence-open'))return;
 const {clientY:y,clientX:x}=e.touches[0],dy=touchY-y;
 if(!touchDrag){
  if(Math.abs(dy)<8&&Math.abs(touchX-x)<8)return;
  if(Math.abs(dy)<=Math.abs(touchX-x)){touchY=null;return;}
  touchDrag=true;
 }
 if(e.cancelable)e.preventDefault();
 touchTravel+=dy;choose(target+clamp(dy,-80,80)/218);touchY=y;
},{passive:false});
function endSwipe(){
 touchY=touchX=null;if(!touchDrag)return;
 touchDrag=false;
 const base=Math.round(touchStartAt),step=Math.round(target);
 choose(step===base&&Math.abs(touchTravel)>=32?base+Math.sign(touchTravel):step,true);
}
parent.addEventListener('touchend',endSwipe,{passive:true});
parent.addEventListener('touchcancel',endSwipe,{passive:true});
mobileJump.addEventListener('change',()=>choose(first(Number(mobileJump.value)),true));
window.addEventListener('keydown',e=>{
 if(parent.classList.contains('evidence-open')){if(e.key==='Escape'){closeUp(false);e.preventDefault();}return;}
 if(e.target?.closest?.('select,input,textarea')||document.querySelector('dialog[open]')||e.altKey||e.ctrlKey||e.metaKey||e.shiftKey)return;
 const forward=['ArrowDown','ArrowRight','PageDown'].includes(e.key),back=['ArrowUp','ArrowLeft','PageUp'].includes(e.key);
 if(forward||back){e.preventDefault();choose(nearest(forward?1:-1),true);}
 else if(e.key==='Home'||e.key==='End'){e.preventDefault();choose(e.key==='Home'?0:max,true);}
});
document.addEventListener('click',e=>{const g=e.target.closest('[data-go]');if(g){choose(first(+g.dataset.go),true);return;}
 const b=e.target.closest('#steps button');if(b&&section>0){choose(first(section)+Number(b.dataset.step),true);}});
window.addEventListener('hashchange',()=>choose(parseHash()));
window.addEventListener('pointermove',e=>{mouseX=e.clientX/W-.5;mouseY=e.clientY/H-.5;},{passive:true});
function resize(){
 const w=parent.clientWidth,h=parent.clientHeight;if(!w||!h||(W===w&&H===h))return;
 W=w;H=h;narrow=W<=780&&H>W;
 renderer.setPixelRatio(Math.min(devicePixelRatio||1,soft?1.3:1.65));renderer.setSize(W,H,false);cam.aspect=W/H;cam.updateProjectionMatrix();
 qs('leaders').setAttribute('viewBox',`0 0 ${W} ${H}`);photoOverlay.setAttribute('viewBox',`0 0 ${W} ${H}`);
}
function fromWorld(vector){const p=vector.project(cam);return [(p.x+1)*W/2,(1-p.y)*H/2,p.z]}
function updateLabels(){
 const asset=section===retroIndex?(step>=3?storage:retro):ram;
 if(!asset||!labelSet.length)return;
 const backside=hardwareTurn[hardwareKey()]>.25;
 for(const o of labelSet)for(const node of [o.caption,o.line,o.pin])node.style.visibility=backside?'hidden':'';
 if(backside)return;
 const bands=[[],[]];
 labelSet.forEach(o=>{
  const p=asset.parts[o.ref];
  if(!p){o.caption.style.visibility='hidden';o.line.style.visibility='hidden';o.pin.style.visibility='hidden';return;}
  const world=p.mesh.localToWorld(p.point.clone()),[x,y]=fromWorld(world);
  const side = narrow ? (x>W*.52?1:0) : (x>W*.73?1:0);
  bands[side].push({o,x,y});
 });
 bands.forEach((band,side)=>{
  band.sort((a,b)=>a.y-b.y);
  const top=narrow?36:H*.12,bottom=narrow?Math.min(H*.47,330):H*.83,sep=narrow?31:46;
  let lastY=top-sep;
  band.forEach(({o,x,y},i)=>{
   const ay=clamp(Math.max(y,lastY+sep),top,Math.max(top,bottom-(band.length-i-1)*sep));lastY=ay;
   const ix=side?(W-(narrow?131:168)):(narrow?11:Math.max(W*.51,28));
   const end=side?ix-8:ix+(narrow?111:138);
   const knee=end+(side?-12:12);
   const sx=clamp(x,6,W-6),sy=clamp(y,4,H-4);
   o.line.setAttribute('points',`${sx.toFixed(1)},${sy.toFixed(1)} ${knee.toFixed(1)},${ay.toFixed(1)} ${end.toFixed(1)},${ay.toFixed(1)}`);
   o.pin.setAttribute('cx',sx.toFixed(1));o.pin.setAttribute('cy',sy.toFixed(1));
   const stay=section!==retroIndex?1:step>=3?ease((pos-rStart-2.54)/.39)*(1-ease((pos-rStart-3.30)/.65)):1-.68*ease((pos-rStart-1.24)/.71);
   for(const node of [o.line,o.pin,o.caption])node.style.opacity=String(stay);
   o.caption.style.transform=`translate(${ix}px,${ay-7}px)`;
  });
 });
}
function gallery(t){
 const relative=pos-first(bunkerIndex);
 const arrive=ease((relative+.55)/.56), leave=1-ease((relative-2.19)/.64), vis=arrive*leave;
 window.drawBunkerTV?.(relative,t,W,H,narrow,section===bunkerIndex&&step===3);
 imageField.classList.toggle('active',vis>.01);
 photoOverlay.style.opacity=photoLabels.style.opacity=String(vis); if(vis<.01)return;
 const mx=narrow?W*.5:W*.735,my=narrow?H*.265:H*.46;
 const startX=narrow?W*.55:W*.72,startY=narrow?H*.30:H*.46;
 photos.forEach((el,i)=>{
  const angle=i*PI/2+(pos-first(bunkerIndex))*.52 + (reduce.matches?0:t*.105);
  const pulse=Math.cos(angle);
  const bx=mx+Math.sin(angle)*W*(narrow?.23:.155), by=my+Math.cos(angle)*H*(narrow?.145:.235);
  const focus=ease(1-Math.abs((pos-first(bunkerIndex))-i));
  const z=(pulse*.65+focus*.45)*86;
  const depth=clamp(.66+pulse*.23+focus*.16,.45,1.03);
  el.style.opacity=String(vis*(.57+pulse*.19+focus*.23));
  el.style.zIndex=String(5+Math.round(z));
  const fx=lerp(startX,bx,arrive),fy=lerp(startY,by,arrive);
  el.style.transform=`translate3d(${fx}px,${fy}px,${z}px) translate(-50%,-50%) rotateY(${Math.sin(angle)*(-28)}deg) rotateX(${Math.cos(angle)*14}deg) rotateZ(${Math.sin(angle)*8}deg) scale(${Math.max(.05,depth*arrive)})`;
  const {tag,line,pin}=photoTags[i], labelWidth=tag.offsetWidth;
  const baseX=(narrow?[W*.045,W*.65,W*.055,W*.64]:[W*.51,W*.79,W*.55,W*.85])[i]+(fx-mx)*.12;
  const tx=clamp(baseX,8,Math.max(8,W-labelWidth-12));
  const ty=(narrow?[H*.08,H*.12,H*.37,H*.33]:[H*.13,H*.19,H*.77,H*.83])[i]+(fy-my)*.11;
  const sx=clamp(fx,8,W-8),sy=clamp(fy,8,H-8);
  const fromRight=sx>=tx+labelWidth/2,ex=fromRight?tx+labelWidth+7:tx-7,ey=ty+(narrow?6:7);
  const elbow=ex+(fromRight?10:-10);
  tag.style.transform=`translate(${tx}px,${ty}px)`;
  line.setAttribute('points',`${sx},${sy} ${elbow},${ey} ${ex},${ey}`);
  pin.setAttribute('cx',sx);pin.setAttribute('cy',sy);
 });
}
// Smoke-tinted accents chosen alongside each scene's dark background.
const accentAnchors=[
 [192,181,207], // Home / lavender-grey
 [208,183,192], // RAD-RAM / mauve-grey
 [197,184,189], // Bunker Bound / ash rose
 [174,199,197], // RetroPC / mineral grey
 [181,189,215], // RAD LLM / slate-blue
 [208,186,182], // XP Rust / warm ash
 [192,182,201]  // End / violet-grey
];
const shadeA=new T.Color(),shadeB=new T.Color(),nextShade=new T.Color();
function atmosphere(pos){
 const lo=Math.floor(pos),f=pos-lo,a=indexAt(lo),b=indexAt(Math.min(max,lo+1));
 const blend=ease(f);
 shadeA.setHex(tone[a][0]).lerp(nextShade.setHex(tone[b][0]),blend);
 shadeB.setHex(tone[a][1]).lerp(nextShade.setHex(tone[b][1]),blend);
 parent.style.setProperty('--tint','#'+shadeA.getHexString());parent.style.setProperty('--light','#'+shadeB.getHexString());
 const accent=accentAnchors[a].map((v,i)=>Math.round(lerp(v,accentAnchors[b][i],blend)));
 parent.style.setProperty('--accent','rgb('+accent.join(' ')+')');
 parent.style.setProperty('--shade',String(.85*ease(pos/.85)*(1-.75*ease((pos-max+1)/.86))));
}
function draw(now){
 frame=0;if(soft&&lastDraw&&now-lastDraw<31){start();return;}lastDraw=now;resize();
 const dt=last?Math.min(.065,(now-last)/1000):1/60;last=now;
 if(reduce.matches)pos=target;else{pos=lerp(pos,target,1-Math.exp(-dt*4.35));if(Math.abs(pos-target)<.002)pos=target;}
 let textAt=pos;
 if(crossing){
  const progress=clamp((pos-crossing.from)/(crossing.to-crossing.from));
  textAt=progress<.53?crossing.from:crossing.to;
  if(progress>.996)crossing=null;
 }
 const s=indexAt(textAt),k=s?clamp(Math.round(textAt)-first(s),0,s===endIndex?0:story[stations[s]].steps.length-1):0;
 if(s!==section||k!==step){section=s;step=k;setLandscape(s,k);}
 parent.dataset.position=pos.toFixed(3);
 slider.style.transform='scaleX('+(pos/max)+')';
 const t=reduce.matches?0:now*.001;
 for(const key of Object.keys(hardwareTurn))hardwareTurn[key]=reduce.matches?hardwareView[key]:lerp(hardwareTurn[key],hardwareView[key],1-Math.exp(-dt*8));
 const open=ease(pos/.91);
 root.position.set(narrow?0:2.76,narrow?lerp(2.50,2.3,open):lerp(.65,.39,open),0);
 root.scale.setScalar(narrow?Math.min(.76,cam.aspect*1.54):1);
 sculpture.update(pos,t,narrow,max,reduce.matches);
 dust.rotation.set(t*.014+pos*.022,t*.023+pos*.077,pos*.038);dust.position.set(narrow?0:1.3,narrow?1.15:.11,-1);
 atmosphere(pos);
 if(ram){
  const show=ease((pos-.48)/.64)*(1-ease((pos-3.20)/.62));
  ram.group.visible=show>.002;
  const expand=ease((pos-1.05)/1.25), spin=ease((pos-.28)/1.72);
  ram.group.position.set(narrow?.04:lerp(2.76,3.30,open),narrow?lerp(2.4,2.25,open):lerp(.48,.28,open),-5*(1-show));
  const sc=(narrow?Math.min(.88,cam.aspect*1.30):W/H<1.35?.82:.96)*Math.max(.001,show)*(1-.15*expand);
  ram.group.scale.setScalar(sc);
  ram.group.rotation.set(-.26-expand*.25+(reduce.matches?0:mouseY)*.16,(-.58+2*PI*spin)+ease(pos-2)*.69+(reduce.matches?0:mouseX)*.22,.17-expand*.2+Math.sin(t*.52)*.027);
  ram.group.rotation.y+=PI*hardwareTurn.ram;
  ram.setSpread(expand);
 }
 const r=pos-rStart;
 if(retro){
  const v=ease((r+.80)/.77)*(1-ease((r-2.15)/.78));retro.group.visible=v>.004;
  retro.group.scale.setScalar((narrow?Math.min(.82,cam.aspect*1.34):.91)*Math.max(.001,v));
  retro.group.position.set(narrow?-.08:3.38,narrow?2.21:.46,-(1-v)*2.5);
  const split=ease((r-1.12)/.83),bodies=ease((r-.20)/.76)*(1+.12*split);
  retro.group.position.y+=(narrow?.29:.40)*split;
  retro.group.scale.multiplyScalar(1-split*(narrow?.15:.08));
  retro.group.rotation.set(-.28+split*.18,.14+ease(r/2)*.30+(reduce.matches?0:Math.sin(t*.56)*.13*split),.08-.15*split);
  retro.group.rotation.y+=PI*hardwareTurn.retro;
  retro.setLayers(split);retro.setSpread(bodies);
  retro.setComponentOpacity?.(1-.76*ease((split-.18)/.82));
  parent.dataset.layerSpread=split.toFixed(2);
 }
 project.style.opacity='1';intro.style.opacity=String(1-ease(pos/.50));
 if(storage){
  const entryStart=2.12, entryEnd=2.96;
  const pre=ease((r+.55)/.91), appear=ease((r-entryStart)/(entryEnd-entryStart)), depart=ease((r-4.20)/.62);
  // Keep the storage card fully assembled through its arrival and the Storage stop.
  const chipLift=ease((r-entryEnd-.10)/.45);
  const active=pre*(1-depart);
  storage.group.visible=active>.005;
  const split=ease((r-3.11)/.87);
  storage.group.scale.setScalar((narrow?Math.min(.80,cam.aspect*1.35):.96)*Math.max(.001,active*lerp(.60,1,appear)*(1-.13*split)));
  storage.group.position.set(narrow?lerp(1.42,0,appear):lerp(6.68,3.64,appear),narrow?lerp(3.68,2.44,appear):lerp(2.51,.56,appear),lerp(-3.65,.20,appear)-depart*4.4);
  storage.group.rotation.set(lerp(-.25,-.26,appear)-split*.1,lerp(.20,.32,appear)+(reduce.matches?0:Math.sin(t*.51)*lerp(.06,.19,appear)),lerp(1.21,1.12,appear)-split*.27);
  storage.group.rotation.y+=PI*hardwareTurn.storage;
  storage.setLayers(split);storage.setSpread(.16*chipLift+.56*split);
  storage.setComponentOpacity?.(1-.78*ease((split-.22)/.76));
  parent.dataset.storageSpread=split.toFixed(2);
  parent.dataset.storageArrival=appear.toFixed(3);
  parent.dataset.storageChipLift=(.16*chipLift+.56*split).toFixed(3);
 }
 const clip=qs('xp-gameplay'), clipCenter=xpStart+2;
 const inScope=!crossing||crossing.showXp;
 const clipPresence=inScope?(ease((pos-clipCenter+.79)/.79)*(1-ease((pos-clipCenter-.16)/.78))):0;
 clipVisibleMotion=clipPresence;
 clip.style.setProperty('--clip-show',String(clipPresence));
 clip.style.setProperty('--clip-x',String((1-clipPresence)*Math.min(W*.60,510))+'px');
 clip.style.setProperty('--clip-spin',String(-8-(1-clipPresence)*46)+'deg');
 clip.style.setProperty('--clip-scale',String(.71+.29*clipPresence));
 clip.dataset.motion=clipPresence.toFixed(3);
 const reveal=ease((pos-xpStart+.48)/.48)*(1-ease((pos-xpStart-1.42)/.53));
 const reviewBlend=ease((pos-xpStart-.18)/.75);
 evidence.style.setProperty('--xp-arrive',String(reveal));
 evidence.style.setProperty('--xp-turn',String((1-reveal)*37)+'deg');
 evidence.style.setProperty('--xp-flight',String((1-reveal)*.92*W)+'px');
 evidence.style.setProperty('--review',String(reviewBlend));
 evidence.style.setProperty('--evidence-y',`${reduce.matches?0:Math.sin(t*.68)*5}px`);
 ending.style.opacity=String(ease((pos-max+.56)/.52));
 gallery(t);renderer.render(scene,cam);
 if(s===ramIndex||s===retroIndex)updateLabels();
 c.dataset.rendered=soft?'canvas':'webgl';
 if(!reduce.matches||Math.abs(pos-target)>.001)start();
}
function start(){if(!frame&&!document.hidden)frame=requestAnimationFrame(draw);}
window.addEventListener('resize',()=>{W=0;start()});document.addEventListener('visibilitychange',()=>{if(!document.hidden){last=0;start()}});reduce.addEventListener('change',start);
const load=(name,inline)=>inline?Promise.resolve(inline):fetch(name).then(r=>{if(!r.ok)throw Error('CAD asset unavailable');return r.json()});
load('assets/radram.json',window.RADRAM_CAD).then(data=>{ram=window.makeCAD(data,soft);ram.group.visible=false;scene.add(ram.group);if(section===ramIndex)buildLabels(ramSteps[step].refs);parent.dataset.cad='ready';start();}).catch(e=>{parent.dataset.cad='unavailable';console.error(e.message)});
if(window.RETRO_CAD||document.documentElement.dataset.retroCad==='true')load('assets/retro.json',window.RETRO_CAD).then(data=>{retro=window.makeCAD(data,soft);retro.group.visible=false;
 const entries=Object.entries(retro.parts).filter(([k,p])=>p.home);
 retro.labelRefs=[];retro.labelNames={};
 for(const [prefix,title] of [['U','Memory package'],['R','Resistor'],['C','Decoupling capacitor']]){
  const found=entries.find(([k])=>k.startsWith(prefix));
  if(found){retro.labelRefs.push(found[0]);retro.labelNames[found[0]]=title+' '+found[0];}
 }scene.add(retro.group);parent.dataset.retro='ready';section=-1;start();}).catch(e=>console.warn(e.message));
if(window.STORAGE_CAD||document.documentElement.dataset.storageCad==='true')load('assets/storage.json',window.STORAGE_CAD).then(data=>{
 storage=window.makeCAD(data,soft);storage.group.visible=false;scene.add(storage.group);
 storage.labelRefs=['BOARD', ...Object.keys(storage.parts).filter(k=>storage.parts[k].partNumber==='GD25Q128ESIGR').slice(0,2), 'J1'].filter(k=>storage.parts[k]);
 storage.labelNames={BOARD:'22 × 80 mm custom SPI PCB',J1:'M-key edge connector'};
 if(section===retroIndex&&step>=3)buildLabels(storage.labelRefs,storage.labelNames);
 parent.dataset.storage='ready';start();
}).catch(e=>{parent.dataset.storage='unavailable';console.warn(e.message)});
start();
})();
