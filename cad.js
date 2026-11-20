/* Meshes and copper come from the documented KiCad checkpoints. Colours on copper represent layers. */
window.makeCAD=function(data,soft){
const T=window.THREE, group=new T.Group(), parts={}, board=data.board,retro=data.name?.includes('Retro');
const longModule=board.size[0]<31&&board.size[1]>75;
const center=[0,1].map(d=>{const a=board.outline.map(p=>p[d]);return (Math.min(...a)+Math.max(...a))/2;});
const u=6.2/Math.max(board.size[0],board.size[1]),depth=board.size[2]*u;
const V=(x,y,z=0)=>new T.Vector3((x-center[0])*u,(center[1]-y)*u,z*u);
const mat=(color,opts={})=>new T.MeshStandardMaterial({color,metalness:.22,roughness:.46,...opts});
const add=(parent,g,m)=>{const a=new T.Mesh(g,m);parent.add(a);return a;};
const shell=mat(retro?0x124f45:0x171e25,{metalness:.11,transparent:true,opacity:1});
const smooth=(a,b,x)=>{const q=Math.max(0,Math.min(1,(x-a)/(b-a)));return q*q*(3-2*q);};
function path(points,Ctor=T.Path){
 const p=new Ctor();points.forEach((line,i)=>{const r=V(...line);i?p.lineTo(r.x,r.y):p.moveTo(r.x,r.y);});p.closePath();return p;
}
const outline=path(board.outline,T.Shape);
for(const h of board.holes||[]){
 if(h.diameter<.68)continue;
 const v=V(h.x,h.y), hole=new T.Path();
 hole.absellipse(v.x,v.y,u*(h.size?.[0]||h.diameter)/2,u*(h.size?.[1]||h.diameter)/2,0,Math.PI*2,true);outline.holes.push(hole);
}
function splitLaminate(geometry){
 if(!soft)return geometry;
 const xyz=geometry.attributes.position,faces=[];
 const mid=(a,b)=>a.map((n,i)=>(n+b[i])*.5);
 const len=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]);
 function triangulate(a,b,c,level){
  const ab=len(a,b),bc=len(b,c),ca=len(c,a);
  if(level===0||Math.max(ab,bc,ca)<.46){faces.push(...a,...b,...c);return;}
  if(ab>=bc&&ab>=ca){const j=mid(a,b);triangulate(a,j,c,level-1);triangulate(j,b,c,level-1);}
  else if(bc>=ca){const j=mid(b,c);triangulate(a,b,j,level-1);triangulate(a,j,c,level-1);}
  else{const j=mid(c,a);triangulate(a,b,j,level-1);triangulate(j,b,c,level-1);}
 }
 for(let i=0;i<xyz.count;i+=3){
  const v=j=>[xyz.getX(j),xyz.getY(j),xyz.getZ(j)];
  triangulate(v(i),v(i+1),v(i+2),8);
 }
 const fine=new T.BufferGeometry();fine.setAttribute('position',new T.Float32BufferAttribute(faces,3));fine.computeVertexNormals();geometry.dispose();return fine;
}
const pcb=add(group,splitLaminate(new T.ExtrudeGeometry(outline,{depth,bevelEnabled:false,curveSegments:soft?5:11})),shell);
pcb.position.z=-depth;parts.BOARD={mesh:pcb,point:new T.Vector3(.6,-1.15,depth)};
const tags=['F.Cu','In1.Cu','In2.Cu','B.Cu'];
const palette=[0xcdb780,0x57d7bd,0x7ea9ff,0xe183cf];
const metal=[0xdaab54,0x78ddc5,0x88b5ff,0xe6a6d4];
const copperGold={track:new T.Color(0xd5af62),pad:new T.Color(0xe9c780)};
const copperLayerTones=palette.map((p,i)=>({track:new T.Color(p),pad:new T.Color(metal[i])}));
const layers=tags.map((name,i)=>{
 const g=new T.Group();g.name=name;group.add(g);g.position.z=-depth*i/3;
 const opts={side:T.DoubleSide,metalness:.27,emissive:palette[i],emissiveIntensity:.13};
 const out={g,i,name,trace:mat(0xd5af62,{...opts,emissive:0xd5af62}),pad:mat(0xe9c780,{side:T.DoubleSide,metalness:.43}),zone:mat(palette[i],{side:T.DoubleSide,metalness:.26,transparent:true,opacity:retro?.55:.11,depthWrite:false}),verts:[],pads:[],bores:[],zones:[]};
 for(const face of [out.trace,out.pad,out.zone])face.userData.copper=true;
 return out;
});
const quad=(out,a,b,c,d)=>{for(const p of [a,b,c,a,c,d])out.push(p.x,p.y,p.z);};
function triangles(parent,pts,m){
 if(!pts.length)return null;
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pts,3));g.computeVertexNormals();return add(parent,g,m);
}
const layer=n=>layers[tags.indexOf(n)];
// Back copper must sit outside the negative-Z laminate face, not inside it.
const faceZ=(l,mm)=>l.i===3?-mm:mm;
for(const t of data.tracks||[]){
 const l=layer(t.layer);if(!l)continue;
 const a=V(...t.start,faceZ(l,.022)),b=V(...t.end,faceZ(l,.022)),dx=b.x-a.x,dy=b.y-a.y,L=Math.hypot(dx,dy);
 if(!L)continue;
 const off=new T.Vector3(-dy,dx,0).multiplyScalar(u*t.width*.5/L);
 quad(l.verts,a.clone().add(off),a.clone().sub(off),b.clone().sub(off),b.clone().add(off));
}
function disc(out,origin,r1,r2,angle,ring=0){
 const N=soft?7:12, C=Math.cos(angle),S=Math.sin(angle);
 const p=(a,s)=>{const x=r1*Math.cos(a)*s,y=r2*Math.sin(a)*s;return new T.Vector3(origin.x+C*x-S*y,origin.y+S*x+C*y,origin.z);};
 for(let k=0;k<N;k++){
  const a=k*Math.PI*2/N,b=(k+1)*Math.PI*2/N;
  if(ring)quad(out,p(a,ring),p(a,1),p(b,1),p(b,ring));
  else for(const p0 of [origin,p(a,1),p(b,1)])out.push(p0.x,p0.y,p0.z);
 }
}
for(const c of data.components)for(const q of c.pads||[]){
 if(!q.size?.[0])continue;
 const names=q.layers||[c.side==='bottom'?'B.Cu':'F.Cu'];
 for(const l of layers.filter(v=>names.includes(v.name)||(names.includes('*.Cu')&&(v.i===0||v.i===3)))){
  const o=V(...q.position,faceZ(l,.038)),[w,h]=q.size.map(k=>k*u*.5),th=-(q.rotationDeg||0)*Math.PI/180;
  const v=(x,y)=>new T.Vector3(o.x+x*Math.cos(th)-y*Math.sin(th),o.y+x*Math.sin(th)+y*Math.cos(th),o.z);
  if(q.drill?.[0]||q.shape===0)disc(l.pads,o,w,h,th,q.drill?.[0]?Math.min(.85,q.drill[0]/q.size[0]):0);
  else quad(l.pads,v(-w,-h),v(w,-h),v(w,h),v(-w,h));
 }
}
// Copper/drill inspection marks use exported dimensions only. They do not
// claim the solder mask is open: tenting is separately recorded in source data.
for(const v of data.vias||[]){
 const pos=v.position||v.at,diameter=v.diameter||v.width,drill=v.drill;
 if(!pos||!(diameter>0)||!(drill>0)||drill>=diameter)continue;
 const names=v.layers||v.span||[];
 // Legacy exports lack layer spans; show no guessed surface vias.
 for(const l of layers.filter(l=>(l.i===0||l.i===3)&&names.includes(l.name))){
  const r=diameter*u*.5;
  disc(l.pads,V(...pos,faceZ(l,.042)),r,r,0,drill/diameter);
  disc(l.bores,V(...pos,faceZ(l,.046)),drill*u*.5,drill*u*.5,0);
 }
}
function compact(a,gap){
 if(!gap)return a;
 return a.filter((p,i)=>{const before=a[(i+a.length-1)%a.length],after=a[(i+1)%a.length];const dx=after[0]-before[0],dy=after[1]-before[1],l=Math.hypot(dx,dy);
  if(l<1e-7)return false;
  return Math.abs(dx*(p[1]-before[1])-dy*(p[0]-before[0]))/l>gap;
 });
}
for(const z of [...(data.copperLayers||[]),...(data.zones||[])]){
 const l=layer(z.name||z.layer);if(!l)continue;
 for(const q of z.polygons||[]){
  if(q.outline.length<3)continue;
  const slim=soft?compact(q.outline,.017):q.outline;if(slim.length<3)continue;
  const contour=path(slim,T.Shape);for(const h of q.holes||[])if(h.length>2)contour.holes.push(path(h));
  const zone=add(l.g,new T.ShapeGeometry(contour,2),l.zone);zone.position.z=faceZ(l,.014);l.zones.push(zone);
 }
}
for(const l of layers){
 triangles(l.g,l.verts,l.trace);triangles(l.g,l.pads,l.pad);
 const bores=triangles(l.g,l.bores,mat(0x090b10,{side:T.DoubleSide,metalness:0,roughness:1}));
 if(bores)bores.name='Native drill inspection marks';
 l.g.visible=retro?l.i===0||l.i===3:l.i===0||l.i===3;
 l.zones.forEach(o=>o.visible=l.i===0&&retro);
}
const colors={chip:0x333039,metal:0xc0c6cf,capacitor:0xb27b4e,passive:0x9b6a48};
function makeMesh(m,anchor,scale,fallback){
 const source=m.vertices,faces=m.faces,field=m.faceColorsLinearRGB||null;
 const refs=new Map(),projected=source.map(a=>V(...a).sub(anchor));
 const palette=Array(faces.length).fill(null);
 for(const row of m.materialGroups||[]){
  const col=row.color;if(!col||col.length!==3)continue;
  const keyed=new T.Color().setRGB(...col,T.SRGBColorSpace);
  for(let i=row.firstFace;i<row.firstFace+row.faceCount;i++)palette[i]=keyed;
 }
 const positions=[],rgb=[],facet=[],seen=new Set();
 const vert=projected.map((p,n)=>{
  if(!scale)return n;
  const k=p.toArray().map(v=>Math.round(v/scale)).join();
  if(!refs.has(k))refs.set(k,n);return refs.get(k);
 });
 const base=new T.Color(fallback);

 faces.forEach((f,i)=>{
  const a=f.map(j=>vert[j]);if(new Set(a).size!==3)return;
  const key=a.slice().sort((x,y)=>x-y).join();
  if(scale&&seen.has(key))return;if(scale)seen.add(key);
  const b=field?.[i],col=b&&b.length===3?new T.Color().setRGB(...b):palette[i]||base;

  for(const ix of [a[0],a[2],a[1]]){const q=projected[ix];positions.push(q.x,q.y,q.z);rgb.push(col.r,col.g,col.b);}
  facet.push(col);
 });
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('color',new T.Float32BufferAttribute(rgb,3));g.computeVertexNormals();
 g.userData.facetColors=facet;
 return [g,mat(0xffffff,{vertexColors:true,metalness:.16,transparent:true,opacity:1}),Math.max(...projected.map(p=>p.z))];
}
for(const c of data.components){
 if(!c.bodyMesh?.faces?.length){
  // Edge contacts have no package body: a true footprint anchor, never a stand-in mesh.
  if(c.label){const anchor=new T.Object3D();anchor.position.copy(V(...c.position));layers[c.side==='bottom'?3:0].g.add(anchor);parts[c.ref]={mesh:anchor,point:new T.Vector3(0,0,.025),value:c.value,label:c.label,role:c.role||'',partNumber:c.partNumber||c.value};}
  continue;
 }
 const anchor=V(...c.position),type=c.ref==='C16'?'capacitor':c.ref.startsWith('U')?'chip':c.ref.startsWith('J')?'metal':'passive';
 const [g,m,hi]=makeMesh(c.bodyMesh,anchor,soft?u*(c.ref==='J1'?.25:c.ref.startsWith('U')?.28:.22):0,colors[type]);
 if(g.attributes.position.count===0)continue;
 const mesh=add(group,g,m);mesh.position.copy(anchor);
 const float=c.ref==='C16'?1.48:c.ref==='U1'?1.30:c.ref==='J1'?1.0:/^U(7|8|9|10)$/.test(c.ref)?1.05:(c.ref.startsWith('U')?.84:.43);
 parts[c.ref]={mesh,home:anchor,point:new T.Vector3(0,0,hi),float,dir:c.side==='bottom'?-1:1,value:c.value,label:c.label||c.value,role:c.role||'',partNumber:c.partNumber||c.value};
}
function componentOpacity(alpha){
 const a=Math.max(0,Math.min(1,alpha));
 for(const part of Object.values(parts))if(part.home){part.mesh.material.opacity=a;part.mesh.material.depthWrite=a>.98;part.mesh.visible=a>.005;}
}
return {group,parts,size:board.size,setLayers(p){
 const q=Math.max(0,Math.min(1,p)), separated=smooth(.015,.30,q);
 // The physical laminate vanishes in copper inspection; never hides the four real layers.
 shell.opacity=1-smooth(.04,.38,q);pcb.visible=shell.opacity>.005;shell.depthWrite=shell.opacity>.98;
 for(const l of layers){
  l.trace.color.copy(copperGold.track).lerp(copperLayerTones[l.i].track,separated);
  l.trace.emissive.copy(l.trace.color);
  l.pad.color.copy(copperGold.pad).lerp(copperLayerTones[l.i].pad,separated);
  l.zone.color.copy(copperGold.track).lerp(copperLayerTones[l.i].track,separated);
  l.g.visible=l.i===0||l.i===3||q>.015;
  l.g.position.z=-depth*l.i/3-q*l.i*.83;
  l.g.position.y=-q*l.i*.93;
  l.g.position.x=q*(l.i-1.5)*(longModule?1.64:.83);
  l.g.rotation.z=q*(l.i-1.5)*.035;
  l.trace.opacity=l.pad.opacity=l.i===0||l.i===3?1:smooth(.015,.12,q);
  for(const z of l.zones)z.visible=q>.03;
  l.zone.opacity=retro?.76:.34;
 }
 pcb.position.y=q*.19;
},setSpread(p){
 for(const part of Object.values(parts)){
  if(!part.home)continue;
  const x=part.home.x,y=part.home.y,side=x<0?-1:1;
  part.mesh.position.set(x*(1+p*.34)+side*p*.22,y*(1+p*.30),part.home.z+p*part.float*part.dir*1.85);
 }
},setComponentOpacity:componentOpacity,setComponentVisibility(yes){componentOpacity(yes?1:0);}};
};
