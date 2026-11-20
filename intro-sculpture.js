/* A luminous, hollow globe drawn entirely with particles. No core or surface. */
window.makeIntroSculpture=function(T,{soft=false}={}){
 const TAU=2*Math.PI, group=new T.Group(), radius=2.72;
 group.name='Aurora Particle Sphere';
 const clamp=x=>Math.max(0,Math.min(1,x));
 const ease=(n,a,b)=>{const v=clamp((n-a)/(b-a));return v*v*(3-2*v)};
 const mix=(a,b,p)=>a+(b-a)*p;
 let seed=927831;
 const rand=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
 const make=({name,size,opacity,geometry})=>{
  const n=geometry.length, g=new T.BufferGeometry(), xyz=new Float32Array(n*3), rgb=new Float32Array(n*3);
  g.setAttribute('position',new T.BufferAttribute(xyz,3).setUsage(T.DynamicDrawUsage));
  g.setAttribute('color',new T.BufferAttribute(rgb,3).setUsage(T.DynamicDrawUsage));
  const mat=new T.PointsMaterial({size,color:0xffffff,vertexColors:true,transparent:true,opacity,
   depthWrite:false,blending:T.AdditiveBlending,toneMapped:false});
  const body=new T.Points(g,mat);body.userData.sculpture=true;body.name=name;body.frustumCulled=false;group.add(body);
  return {g,xyz,rgb,mat,geometry,size,opacity};
 };
 const field=[], streams=[], flares=[];
 function bead(list,u,lat,r,weight){
  const c=Math.cos(lat);
  list.push([c*Math.cos(u),Math.sin(lat),c*Math.sin(u),u,lat,r,weight,rand(),rand(),rand()]);
 }
 // The original winding longitude/latitude weave, without its opaque center.
 const meridians=soft?44:58, slices=soft?90:132;
 for(let l=0;l<meridians;l++)for(let j=1;j<slices;j++){
  const v=j*Math.PI/slices, u=l*TAU/meridians+(l%2?1:-1)*v*.7;
  if(Math.sin(v)>.16||l%3===0)bead(field,u,Math.PI/2-v,.985+rand()*.018,.43+rand()*.29);
 }
 const rings=soft?9:13,dots=soft?185:310;
 for(let l=0;l<rings;l++)for(let j=0;j<dots;j++){
  const u=j*TAU/dots,v=Math.PI*(.15+l*.70/(rings-1))+.063*Math.sin(u*3+l*.53);
  bead(streams,u,Math.PI/2-v,.975+rand()*.024,.70+rand()*.26);
 }
 for(let j=0;j<(soft?220:385);j++){
  const u=rand()*TAU,lat=Math.asin(2*rand()-1);
  bead(flares,u,lat,.90+rand()*.153,.97+rand()*.55);
 }
 const layers=[
  make({name:'Dense particle perimeter',size:.028,opacity:.78,geometry:field}),
  make({name:'Aurora currents',size:.036,opacity:.85,geometry:streams}),
  make({name:'Hot traveling particles',size:.047,opacity:.91,geometry:flares})
 ];
 const blue=new T.Color('#446fff'), violet=new T.Color('#9f59fa'), ice=new T.Color('#53deff'),
  gold=new T.Color('#ffaf57'), pink=new T.Color('#ff6bae'), mint=new T.Color('#68f5d5');
 function update(progress,t,narrow=false,max=23,reduced=false){
  if(reduced)t=0;
  const closing=ease(progress,max-.99,max);
  const release=clamp((progress-.05)/1.20)*(1-closing);
  const settle=ease(release,.5,.99);
  const tA=t*.26, tB=t*.53;
  // Drifting Y-axis turn visibly carries aurora hotspots into and out of view.
  const turn=.21+tA+progress*.14, ct=Math.cos(turn),st=Math.sin(turn);
  const pitch=.15+Math.sin(t*.31)*.12,cp=Math.cos(pitch),sp=Math.sin(pitch);
  group.position.set(narrow?0:-settle*1.44,settle*.05,-settle*1.9);
  group.rotation.z=.10+Math.sin(t*.22)*.045;
  for(let k=0;k<layers.length;k++){
   const {g,xyz,rgb,mat,geometry,size,opacity}=layers[k];
   mat.size=mix(size,.018,settle);mat.opacity=mix(opacity,.34,settle);
   for(let i=0;i<geometry.length;i++){
    const [x,y,z,u,lat,r,weight,q,w,v]=geometry[i], j=i*3;
    const a=x*ct-z*st,b=x*st+z*ct,Y=y*cp-b*sp,Z=b*cp+y*sp;
    const front=ease(Z,-.47,.88), rim=1-Math.abs(Z);
    const current=.5+.5*Math.sin(u*3-lat*5+tB+Math.sin(u*2+lat*4-tA)*1.67);
    const wave=.5+.5*Math.sin(u*6+lat*7-t*2.37+q*.62);
    const punch=wave*wave*wave*wave;
    const wobble=.014*Math.sin(lat*14-u*5+t*1.29+q*.32)+.006*current;
    const R=(r+wobble)*radius;
    // Release sweeps across the weave; fast sparks lead slower fragments.
    // Every point travels outward from the globe, never towards a frame.
    const seam=.055+.095*(.5+.5*Math.sin(u*1.6-lat*3.7))+.09*v;
    const age=clamp((release-seam)/(.77-seam));
    const out=1-Math.pow(1-age,2.4);
    const swirl=out*(w-.28)*(.46+.24*Math.sin(u*3+lat*6));
    const c=Math.cos(swirl), h=Math.sin(swirl);
    const kick=(1.25+6.55*q*q+3.0*v+(k===2?1.75:0))*(narrow?.81:1);
    const flung=R+kick*out;
    const wing=narrow?1:1.59, buoy=narrow?1.12:1.02;
    xyz[j]=(a*c-Y*h)*flung*(1+(wing-1)*out)+(w-.5)*1.32*out;
    xyz[j+1]=(Y*c+a*h)*flung*(1+(buoy-1)*out)-out*out*(.16+v*.92);
    xyz[j+2]=Z*(R+kick*out*.48)-out*(2.0+w*2.9);
    // Distinct blue/purple/cyan regions plus localized warm and turquoise hotspots.
    const hue=.5+.5*Math.sin(u*1.9+lat*2.9+tA+current*.66);
    const cyan=ease(Math.sin(u*2.4-lat*5.4+tB),.12,.95);
    const warmZone=ease(Math.sin(u*1.6+lat*7-tA*1.2),.48,1);
    const warm=warmZone*(.16+.84*punch)*(.31+.69*current);
    const pinkZone=ease(Math.sin(u*3.9+lat*2.6+tA),.38,.99)*(.1+.3*current);
    const from=cyan>.47?ice:blue,to=cyan>.64?mint:violet;
    const twinkle=Math.pow(.5+.5*Math.sin(t*3.31+v*44.4+w*16),5);
    const energy=weight*(.022+front*.137+rim*.065+current*current*.14+
     punch*(.16+front*.27)+twinkle*(k===2?.56:.085));
    const shock=Math.sin(Math.PI*age)*(1-settle);
    const glint=shock*(.25+.75*q)*(k===2?1.30:.47);
    const power=mix(energy*2.65+glint,.048+.062*punch,settle);
    rgb[j]=mix(mix(mix(from.r,to.r,hue),pink.r,pinkZone),gold.r,warm)*power;
    rgb[j+1]=mix(mix(mix(from.g,to.g,hue),pink.g,pinkZone),gold.g,warm)*power;
    rgb[j+2]=mix(mix(mix(from.b,to.b,hue),pink.b,pinkZone),gold.b,warm)*power;
   }
   g.attributes.position.needsUpdate=g.attributes.color.needsUpdate=true;
  }
 }
 update(0,0);
 return {group,update};
};
