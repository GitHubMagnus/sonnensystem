/* scene.js — Three.js-Aufbau: Renderer, Texturen, Sterne, Galaxien, Körper, Sonden
   Klassisches Script (kein ES-Modul): alle Top-Level-Deklarationen teilen sich
   einen gemeinsamen globalen Scope. Ladereihenfolge: siehe index.html. */

// ============================================================
//  Basis
// ============================================================
const container = document.getElementById('canvas-container');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, innerWidth/innerHeight, 0.05, 90000);
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputEncoding = THREE.sRGBEncoding;          // korrekte Farbwiedergabe der Texturen
renderer.toneMapping = THREE.ACESFilmicToneMapping;    // filmischer Kontrast, weiche Lichter
renderer.toneMappingExposure = 1.18;
container.appendChild(renderer.domElement);

// Textur-Basis-URLs: in data.js definiert (werden dort bereits beim Aufbau von BODIES gebraucht)
function neutralTex(css){ const c=document.createElement('canvas'); c.width=c.height=8; const x=c.getContext('2d'); x.fillStyle=css; x.fillRect(0,0,8,8); return new THREE.CanvasTexture(c); }
// Weiche runde Punkt-Textur (statt eckiger Standard-Pixel)
const dotTex = (function(){
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(32,32,0,32,32,32);
  g.addColorStop(0,'rgba(255,255,255,1)');
  g.addColorStop(0.4,'rgba(255,255,255,0.85)');
  g.addColorStop(0.75,'rgba(255,255,255,0.25)');
  g.addColorStop(1,'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0,0,64,64);
  return new THREE.CanvasTexture(c);
})();
const loader = new THREE.TextureLoader();
loader.crossOrigin = 'anonymous';
const MAX_ANISO = renderer.capabilities.getMaxAnisotropy();
const DEG = Math.PI/180;
const J2000 = Date.UTC(2000, 0, 1, 12);
const CTY_MS = 36525 * 86400000;
const REAL_AU = 150;          // Einheiten pro AE im realen Maßstab
let scaleMix = 0, scaleTarget = 0; // 0 = anschaulich, 1 = real

// ============================================================
//  Prozedurale Fallback-Texturen (falls Web-Texturen blockiert sind)
// ============================================================
function makeCanvas(w,h){ const c=document.createElement('canvas'); c.width=w; c.height=h; return [c,c.getContext('2d')]; }
function speckle(ctx,w,h,n,color,aMax){ for(let i=0;i<n;i++){ ctx.fillStyle=color; ctx.globalAlpha=Math.random()*aMax; const s=1+Math.random()*2.5; ctx.fillRect(Math.random()*w,Math.random()*h,s,s);} ctx.globalAlpha=1; }
function cratersFx(ctx,w,h,n,maxR){ for(let i=0;i<n;i++){ const x=Math.random()*w,y=h*0.06+Math.random()*h*0.88,r=2+Math.random()*maxR; ctx.globalAlpha=0.25+Math.random()*0.3; ctx.fillStyle='rgba(50,46,42,1)'; ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fill(); ctx.strokeStyle='rgba(210,200,185,1)'; ctx.lineWidth=Math.max(1,r*0.18); ctx.beginPath(); ctx.arc(x,y,r,Math.PI*0.9,Math.PI*1.9); ctx.stroke(); } ctx.globalAlpha=1; }
function bands(stops,w,h,turb){ const [c,ctx]=makeCanvas(w,h); const col=new THREE.Color(),a=new THREE.Color(),b=new THREE.Color();
  for(let y=0;y<h;y++){ let t=y/h*(stops.length-1)+Math.sin(y*0.12)*turb*(stops.length-1)/h*6; t=Math.max(0,Math.min(stops.length-1.001,t));
    const i=Math.floor(t),f=t-i; a.set(stops[i]); b.set(stops[i+1]); col.copy(a).lerp(b,f); ctx.fillStyle='#'+col.getHexString(); ctx.fillRect(0,y,w,1); }
  return [c,ctx]; }
function fbSolid(hexA, hexB, craterN){ return function(){ const [c,ctx]=bands([hexA,hexB,hexA],512,256,0); speckle(ctx,512,256,3000,'#444',0.25); if(craterN) cratersFx(ctx,512,256,craterN,8); return new THREE.CanvasTexture(c); }; }
const fallbacks = {
  sun(){ const [c,ctx]=makeCanvas(512,256); const g=ctx.createLinearGradient(0,0,0,256); g.addColorStop(0,'#ffb627'); g.addColorStop(.5,'#ffcf4d'); g.addColorStop(1,'#ffb627'); ctx.fillStyle=g; ctx.fillRect(0,0,512,256);
    for(let i=0;i<1500;i++){ ctx.globalAlpha=0.06+Math.random()*0.12; ctx.fillStyle=Math.random()>0.5?'#fff0b3':'#f08c1e'; ctx.beginPath(); ctx.arc(Math.random()*512,Math.random()*256,2+Math.random()*5,0,Math.PI*2); ctx.fill(); } ctx.globalAlpha=1; return new THREE.CanvasTexture(c); },
  mercury: fbSolid('#8c8174','#a89c8b',140),
  venus(){ const [c]=bands(['#d9b977','#ecd9a0','#dfc184','#f0e0ad','#d9b977'],512,256,12); return new THREE.CanvasTexture(c); },
  earth(){ const [c,ctx]=makeCanvas(512,256); ctx.fillStyle='#16498c'; ctx.fillRect(0,0,512,256); ctx.fillStyle='#557a3d';
    [[60,90,70,40],[150,170,45,55],[260,80,90,45],[300,170,40,28],[420,190,32,18],[256,18,256,14],[256,246,256,12]].forEach(b=>{ ctx.beginPath(); ctx.ellipse(b[0],b[1],b[2],b[3],0,0,Math.PI*2); ctx.fill(); ctx.fillStyle = b[2]>200 ? '#eef3f6' : '#557a3d'; });
    return new THREE.CanvasTexture(c); },
  mars(){ const [c,ctx]=bands(['#a44a2c','#c1603a','#b25232','#cb6c42','#a44a2c'],512,256,5); ctx.fillStyle='#f3ece4'; ctx.beginPath(); ctx.ellipse(256,3,280,16,0,0,Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.ellipse(256,253,280,13,0,0,Math.PI*2); ctx.fill(); return new THREE.CanvasTexture(c); },
  jupiter(){ const [c,ctx]=bands(['#c9b08c','#a8825e','#e3d4ba','#b07a52','#ead9bd','#9c6b47','#dec8a4','#c9b08c'],512,256,12); ctx.fillStyle='#c75a38'; ctx.beginPath(); ctx.ellipse(350,165,22,12,0,0,Math.PI*2); ctx.fill(); return new THREE.CanvasTexture(c); },
  saturn(){ const [c]=bands(['#cdb287','#e4d2a8','#d6bd90','#ecdcb4','#cfb68b','#cdb287'],512,256,8); return new THREE.CanvasTexture(c); },
  uranus(){ const [c]=bands(['#9ed6dc','#aadfe4','#97d0d8','#b2e4e8','#9ed6dc'],512,256,3); return new THREE.CanvasTexture(c); },
  neptune(){ const [c,ctx]=bands(['#3a5fc8','#4a73da','#3556b8','#5580e0','#3a5fc8'],512,256,8); ctx.globalAlpha=.5; ctx.fillStyle='#1d3070'; ctx.beginPath(); ctx.ellipse(190,150,21,11,0,0,Math.PI*2); ctx.fill(); ctx.globalAlpha=1; return new THREE.CanvasTexture(c); },
  pluto: fbSolid('#c4ab90','#8f7a64',50),
  ice: fbSolid('#cfd8de','#9aa6ae',60),
  rock: fbSolid('#9a8c7c','#6e6258',80),
  clouds(){ const [c,ctx]=makeCanvas(512,256); ctx.fillStyle='rgba(255,255,255,0.85)'; for(let i=0;i<120;i++){ ctx.globalAlpha=0.1+Math.random()*0.2; ctx.beginPath(); ctx.ellipse(Math.random()*512,30+Math.random()*196,10+Math.random()*30,3+Math.random()*8,Math.random()*.6-.3,0,Math.PI*2); ctx.fill(); } ctx.globalAlpha=1; return new THREE.CanvasTexture(c); }
};
function loadTex(url, fallbackFn, srgb){
  const tex = loader.load(url, undefined, undefined, () => {
    if (fallbackFn){ const fb = fallbackFn(); tex.image = fb.image; tex.needsUpdate = true; }
  });
  if (srgb !== false) tex.encoding = THREE.sRGBEncoding;
  tex.anisotropy = MAX_ANISO;
  return tex;
}

// ============================================================
//  Hintergrund: Milchstraße + Sterne
// ============================================================
let skyboxMat;
(function skybox(){
  const [c,ctx] = makeCanvas(2048,1024);
  ctx.fillStyle = '#000001'; ctx.fillRect(0,0,2048,1024);
  ctx.save(); ctx.translate(1024,512); ctx.rotate(-0.45);
  const g = ctx.createLinearGradient(0,-190,0,190);
  g.addColorStop(0,'rgba(20,24,48,0)'); g.addColorStop(0.35,'rgba(70,75,120,0.35)');
  g.addColorStop(0.5,'rgba(160,150,170,0.5)'); g.addColorStop(0.65,'rgba(70,75,120,0.35)'); g.addColorStop(1,'rgba(20,24,48,0)');
  ctx.fillStyle = g; ctx.fillRect(-1700,-190,3400,380);
  for (let i=0;i<900;i++){ // Sternenwolken im Band
    ctx.globalAlpha = 0.04+Math.random()*0.1;
    ctx.fillStyle = Math.random()>0.8 ? '#c9a8d8' : '#dfe4ff';
    const x=(Math.random()-0.5)*3200, y=(Math.random()-0.5)*300*Math.exp(-Math.abs(x)/1400);
    ctx.beginPath(); ctx.arc(x,y,1+Math.random()*14,0,Math.PI*2); ctx.fill();
  }
  for (let i=0;i<14;i++){ // Dunkelwolken
    ctx.globalAlpha = 0.25; ctx.fillStyle='#05060d';
    ctx.beginPath(); ctx.ellipse((Math.random()-0.5)*2400,(Math.random()-0.5)*120,60+Math.random()*180,10+Math.random()*30,Math.random(),0,Math.PI*2); ctx.fill();
  }
  ctx.restore(); ctx.globalAlpha=1;
  speckle(ctx,2048,1024,3500,'#ffffff',0.85);
  speckle(ctx,2048,1024,500,'#ffd9a8',0.7);
  speckle(ctx,2048,1024,400,'#a8c4ff',0.7);
  skyboxMat = new THREE.MeshBasicMaterial({ map:new THREE.CanvasTexture(c), side:THREE.BackSide, depthWrite:false, transparent:true, toneMapped:false });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(42000,32,32), skyboxMat);
  scene.add(sky);
})();
let starFieldMat;
(function stars(){
  const n=4500, pos=new Float32Array(n*3), col=new Float32Array(n*3), cc=new THREE.Color();
  for(let i=0;i<n;i++){ const r=6000+Math.random()*14000, t=Math.random()*Math.PI*2, p=Math.acos(2*Math.random()-1);
    pos[i*3]=r*Math.sin(p)*Math.cos(t); pos[i*3+1]=r*Math.cos(p); pos[i*3+2]=r*Math.sin(p)*Math.sin(t);
    const k=Math.random(); cc.setHSL(k<0.7?0.62:(k<0.9?0.1:0), 0.3, 0.7+Math.random()*0.3);
    col[i*3]=cc.r; col[i*3+1]=cc.g; col[i*3+2]=cc.b; }
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.BufferAttribute(pos,3));
  geo.setAttribute('color',new THREE.BufferAttribute(col,3));
  starFieldMat = new THREE.PointsMaterial({vertexColors:true,size:22,sizeAttenuation:true,transparent:true,opacity:0.9,map:dotTex,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false});
  scene.add(new THREE.Points(geo,starFieldMat));
})();

// ============================================================
//  Echte helle Sterne & Sternbilder (J2000-Positionen)
//  [Katalogname, RA in Stunden, Deklination °, Helligkeit mag, dt. Name]
// ============================================================
const STAR_DATA = [
  ['Sirius',6.752,-16.72,-1.46,'Sirius'],['Canopus',6.40,-52.70,-0.74,'Kanopus'],
  ['AlphaCen',14.66,-60.83,-0.27,'Alpha Centauri'],['Arcturus',14.26,19.18,-0.05,'Arktur'],
  ['Vega',18.62,38.78,0.03,'Wega'],['Capella',5.28,45.99,0.08,'Capella'],
  ['Rigel',5.24,-8.20,0.13,'Rigel'],['Procyon',7.65,5.22,0.34,'Prokyon'],
  ['Betelgeuse',5.92,7.41,0.50,'Beteigeuze'],['Achernar',1.63,-57.24,0.46,'Achernar'],
  ['Hadar',14.06,-60.37,0.61,null],['Altair',19.85,8.87,0.77,'Atair'],
  ['Acrux',12.44,-63.10,0.76,null],['Aldebaran',4.60,16.51,0.86,'Aldebaran'],
  ['Antares',16.49,-26.43,1.06,'Antares'],['Spica',13.42,-11.16,0.97,'Spica'],
  ['Pollux',7.76,28.03,1.14,'Pollux'],['Fomalhaut',22.96,-29.62,1.16,'Fomalhaut'],
  ['Deneb',20.69,45.28,1.25,'Deneb'],['Mimosa',12.80,-59.69,1.25,null],
  ['Regulus',10.14,11.97,1.35,'Regulus'],['Adhara',6.98,-28.97,1.50,null],
  ['Castor',7.58,31.89,1.58,'Kastor'],['Gacrux',12.52,-57.11,1.63,null],
  ['Shaula',17.56,-37.10,1.62,null],['Bellatrix',5.42,6.35,1.64,null],
  ['Elnath',5.44,28.61,1.65,null],['Alnilam',5.60,-1.20,1.69,null],
  ['Alnitak',5.68,-1.94,1.77,null],['Alioth',12.90,55.96,1.77,null],
  ['Dubhe',11.06,61.75,1.79,null],['Mirfak',3.41,49.86,1.80,null],
  ['KausAustralis',18.40,-34.38,1.85,null],['Alkaid',13.79,49.31,1.86,null],
  ['Sargas',17.62,-43.00,1.87,null],['Menkalinan',6.00,44.95,1.90,null],
  ['Alhena',6.63,16.40,1.92,null],['Polaris',2.53,89.26,1.98,'Polarstern'],
  ['Mizar',13.40,54.93,2.04,null],['Saiph',5.80,-9.67,2.09,null],
  ['Mintaka',5.53,-0.30,2.23,null],['Merak',11.03,56.38,2.37,null],
  ['Phecda',11.90,53.69,2.44,null],['Megrez',12.26,57.03,3.31,null],
  ['Schedar',0.675,56.54,2.24,null],['Caph',0.153,59.15,2.27,null],
  ['Tsih',0.945,60.72,2.39,null],['Ruchbah',1.43,60.24,2.68,null],
  ['Segin',1.91,63.67,3.38,null],['Denebola',11.82,14.57,2.13,null],
  ['Algieba',10.33,19.84,2.08,null],['Sadr',20.37,40.26,2.23,null],
  ['Albireo',19.51,27.96,3.18,null],['Dschubba',16.01,-22.62,2.29,null],
  ['GienahCyg',20.77,33.97,2.48,null],['DeltaCyg',19.75,45.13,2.87,null],
  ['Zosma',11.235,20.52,2.56,null],
  ['Markab',23.08,15.21,2.49,null],['Scheat',23.06,28.08,2.42,null],
  ['Alpheratz',0.14,29.09,2.06,null],['Algenib',0.22,15.18,2.83,null],
  ['DeltaCru',12.25,-58.75,2.79,null]
];
const CONST_DEFS = [
  ['Orion',[['Betelgeuse','Bellatrix'],['Bellatrix','Mintaka'],['Mintaka','Alnilam'],['Alnilam','Alnitak'],['Alnitak','Betelgeuse'],['Alnitak','Saiph'],['Saiph','Rigel'],['Rigel','Mintaka']]],
  ['Großer Wagen',[['Dubhe','Merak'],['Merak','Phecda'],['Phecda','Megrez'],['Megrez','Alioth'],['Alioth','Mizar'],['Mizar','Alkaid'],['Megrez','Dubhe']]],
  ['Kassiopeia',[['Caph','Schedar'],['Schedar','Tsih'],['Tsih','Ruchbah'],['Ruchbah','Segin']]],
  ['Kreuz des Südens',[['Acrux','Gacrux'],['Mimosa','DeltaCru']]],
  ['Zwillinge',[['Castor','Pollux'],['Pollux','Alhena']]],
  ['Löwe',[['Regulus','Algieba'],['Algieba','Zosma'],['Zosma','Denebola'],['Denebola','Regulus']]],
  ['Schwan',[['Deneb','Sadr'],['Sadr','Albireo'],['Sadr','GienahCyg'],['Sadr','DeltaCyg']]],
  ['Skorpion',[['Dschubba','Antares'],['Antares','Sargas'],['Sargas','Shaula']]],
  ['Stier',[['Aldebaran','Elnath']]],
  ['Pegasus',[['Markab','Scheat'],['Scheat','Alpheratz'],['Alpheratz','Algenib'],['Algenib','Markab']]]
];
const constGroup = new THREE.Group(); constGroup.visible = false; scene.add(constGroup);
const starSprites = [];
(function brightStars(){
  const EPSI = 23.439*DEG, R = 34000;
  function starVec(raH, dec){
    const a = raH*15*DEG, d = dec*DEG;
    const xe = Math.cos(d)*Math.cos(a), ye = Math.cos(d)*Math.sin(a), ze = Math.sin(d);
    const yE = Math.cos(EPSI)*ye + Math.sin(EPSI)*ze;   // äquatorial → ekliptikal
    const zE = -Math.sin(EPSI)*ye + Math.cos(EPSI)*ze;
    return new THREE.Vector3(xe, zE, -yE).multiplyScalar(R);
  }
  const [c,ctx] = makeCanvas(64,64);
  const g = ctx.createRadialGradient(32,32,0,32,32,32);
  g.addColorStop(0,'rgba(255,255,255,1)'); g.addColorStop(0.35,'rgba(235,240,255,0.7)'); g.addColorStop(1,'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.fillRect(0,0,64,64);
  const stex = new THREE.CanvasTexture(c);
  const starPos = {};
  STAR_DATA.forEach(s => {
    const v = starVec(s[1], s[2]); starPos[s[0]] = v;
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map:stex, transparent:true, depthWrite:false, blending:THREE.AdditiveBlending, toneMapped:false }));
    const sc = THREE.MathUtils.clamp(520 - s[3]*170, 170, 950);
    sp.scale.set(sc, sc, 1); sp.position.copy(v); scene.add(sp); starSprites.push(sp);
    if (s[4]){
      const l = makeLabel(s[4], false);
      l.scale.set(2600, 650, 1);
      l.position.copy(v).multiplyScalar(0.965); l.position.y += 750;
      constGroup.add(l); reg3D(l, s[4]);
    }
  });
  const segs = [];
  CONST_DEFS.forEach(cd => {
    const ctr = new THREE.Vector3(); let n = 0;
    cd[1].forEach(pr => { segs.push(starPos[pr[0]], starPos[pr[1]]); ctr.add(starPos[pr[0]]).add(starPos[pr[1]]); n += 2; });
    ctr.multiplyScalar(1/n).normalize().multiplyScalar(R*0.985);
    const cl = makeLabel(cd[0], true);
    cl.scale.set(4200, 1050, 1); cl.material.opacity = 0.7;
    cl.position.copy(ctr); cl.position.y += 1600;
    constGroup.add(cl); reg3D(cl, cd[0]);
  });
  constGroup.add(new THREE.LineSegments(
    new THREE.BufferGeometry().setFromPoints(segs),
    new THREE.LineBasicMaterial({ color:0x7a86c8, transparent:true, opacity:0.45 })));
})();

// ============================================================
//  Die Milchstraße: beim Herauszoomen wird die ganze Galaxie sichtbar
//  (Sonne ~26.000 Lj vom Zentrum, Richtung Zentrum = Sagittarius)
// ============================================================
let galaxyMat, galaxyBulge, hereMarker, hereLabel, galaxyToastShown = false;
(function galaxy(){
  const EPSI = 23.439*DEG;
  function dirOf(raH, dec){
    const a = raH*15*DEG, d = dec*DEG;
    const xe = Math.cos(d)*Math.cos(a), ye = Math.cos(d)*Math.sin(a), ze = Math.sin(d);
    const yE = Math.cos(EPSI)*ye + Math.sin(EPSI)*ze;
    const zE = -Math.sin(EPSI)*ye + Math.cos(EPSI)*ze;
    return new THREE.Vector3(xe, zE, -yE).normalize();
  }
  const dirCenter = dirOf(17.761, -28.94);   // Galaktisches Zentrum (Sgr A*)
  const dirPole   = dirOf(12.857, 27.13);    // Galaktischer Nordpol
  const GR = 380000;                          // Galaxienradius (~50.000 Lj)
  const SUN_OFF = GR * 0.55;                  // Sonne bei ~26.000 Lj
  const group = new THREE.Group();
  group.position.copy(dirCenter).multiplyScalar(SUN_OFF);
  group.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0), dirPole);
  scene.add(group);
  // Spiralarme als Partikel
  const N = 16000, pos = new Float32Array(N*3), col = new Float32Array(N*3);
  const cWarm = new THREE.Color(0xffe3b8), cMid = new THREE.Color(0xd8d2e8), cBlue = new THREE.Color(0x9ab8ff), cc = new THREE.Color();
  const gauss = () => (Math.random()+Math.random()+Math.random()-1.5)/1.5;
  for (let i=0; i<N; i++){
    let r, th;
    if (i < N*0.22){ // Zentraler Bulge
      r = Math.abs(gauss()) * GR * 0.13;
      th = Math.random()*Math.PI*2;
    } else {        // 4 Spiralarme (2 starke, 2 schwache)
      const t = Math.pow(Math.random(), 0.6);
      r = (0.12 + 0.88*t) * GR;
      const arm = i % 4;
      th = arm*Math.PI/2 + Math.log(1 + 7*r/GR) * 2.1 + gauss()*(0.16 + 0.22*t) * (arm%2 ? 1.4 : 1);
    }
    const y = gauss() * GR * 0.035 * (1.6 - r/GR);
    pos[i*3] = r*Math.cos(th); pos[i*3+1] = y; pos[i*3+2] = r*Math.sin(th);
    const t2 = r/GR;
    if (t2 < 0.18) cc.copy(cWarm); else cc.copy(cMid).lerp(cBlue, Math.min(1,(t2-0.18)/0.6));
    cc.offsetHSL(0, 0, (Math.random()-0.5)*0.15);
    col[i*3]=cc.r; col[i*3+1]=cc.g; col[i*3+2]=cc.b;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos,3));
  geo.setAttribute('color', new THREE.BufferAttribute(col,3));
  galaxyMat = new THREE.PointsMaterial({ vertexColors:true, size:2400, sizeAttenuation:true, map:dotTex, transparent:true, opacity:0, depthWrite:false, blending:THREE.AdditiveBlending, toneMapped:false });
  group.add(new THREE.Points(geo, galaxyMat));
  // Leuchtender Kern
  galaxyBulge = glowSprite('rgba(255,225,170,0.9)','rgba(255,190,110,0.35)', GR*0.34);
  galaxyBulge.material.opacity = 0;
  group.add(galaxyBulge);
  // „Du bist hier“-Markierung am Ort des Sonnensystems
  hereMarker = glowSprite('rgba(140,230,255,1)','rgba(80,180,255,0.5)', 14000);
  hereMarker.material.opacity = 0;
  scene.add(hereMarker);
  hereLabel = makeLabel('☀ Unser Sonnensystem', true);
  hereLabel.scale.set(62000, 15500, 1);
  hereLabel.position.y = 22000;
  hereLabel.material.opacity = 0;
  scene.add(hereLabel); reg3D(hereLabel, '☀ Unser Sonnensystem');
})();

// ============================================================
//  Die Lokale Gruppe: Nachbargalaxien (echte Himmelsrichtungen)
// ============================================================
const farMats = [], farLabels = [];
let localGroupToast = false;
(function localGroup(){
  const EPSI = 23.439*DEG;
  function dirOf(raH, dec){
    const a = raH*15*DEG, d = dec*DEG;
    const xe = Math.cos(d)*Math.cos(a), ye = Math.cos(d)*Math.sin(a), ze = Math.sin(d);
    const yE = Math.cos(EPSI)*ye + Math.sin(EPSI)*ze;
    const zE = -Math.sin(EPSI)*ye + Math.cos(EPSI)*ze;
    return new THREE.Vector3(xe, zE, -yE).normalize();
  }
  const gauss = () => (Math.random()+Math.random()+Math.random()-1.5)/1.5;
  function makeMiniGalaxy(R, N, core, edge, arms, twist){
    const pos = new Float32Array(N*3), col = new Float32Array(N*3);
    const cIn = new THREE.Color(core), cOut = new THREE.Color(edge), cc = new THREE.Color();
    for (let i=0; i<N; i++){
      let r, th;
      if (i < N*0.25){ r = Math.abs(gauss())*R*0.15; th = Math.random()*Math.PI*2; }
      else {
        const t = Math.pow(Math.random(), 0.6);
        r = (0.12 + 0.88*t)*R;
        th = (i%arms)*(Math.PI*2/arms) + Math.log(1 + 7*r/R)*twist + gauss()*(0.15 + 0.25*t);
      }
      pos[i*3] = r*Math.cos(th); pos[i*3+1] = gauss()*R*0.04*(1.5 - r/R); pos[i*3+2] = r*Math.sin(th);
      cc.copy(r/R < 0.2 ? cIn : cIn).lerp(cOut, Math.min(1, Math.max(0,(r/R-0.18)/0.6)));
      cc.offsetHSL(0, 0, (Math.random()-0.5)*0.14);
      col[i*3]=cc.r; col[i*3+1]=cc.g; col[i*3+2]=cc.b;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos,3));
    geo.setAttribute('color', new THREE.BufferAttribute(col,3));
    const mat = new THREE.PointsMaterial({ vertexColors:true, size:R*0.014, sizeAttenuation:true, map:dotTex, transparent:true, opacity:0, depthWrite:false, blending:THREE.AdditiveBlending, toneMapped:false });
    farMats.push(mat);
    return new THREE.Points(geo, mat);
  }
  function makeBlob(R, N, color){
    const pos = new Float32Array(N*3), sx = 0.7+Math.random()*0.6, sy = 0.4+Math.random()*0.3;
    for (let i=0; i<N; i++){
      pos[i*3] = gauss()*R*sx; pos[i*3+1] = gauss()*R*sy; pos[i*3+2] = gauss()*R;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos,3));
    const mat = new THREE.PointsMaterial({ color, size:R*0.05, sizeAttenuation:true, map:dotTex, transparent:true, opacity:0, depthWrite:false, blending:THREE.AdditiveBlending, toneMapped:false });
    farMats.push(mat);
    return new THREE.Points(geo, mat);
  }
  function addLabel(text, pos, w){
    const l = makeLabel(text, true);
    l.scale.set(w, w/4, 1);
    l.position.copy(pos); l.position.y += w*0.36;
    l.material.opacity = 0;
    scene.add(l); farLabels.push(l); reg3D(l, text);
  }
  // Andromeda (M31): größte Galaxie der Lokalen Gruppe – RA 0,71h / +41,3°
  const m31 = makeMiniGalaxy(520000, 5000, 0xffe0b0, 0x9ab4ff, 2, 2.3);
  m31.position.copy(dirOf(0.712, 41.27)).multiplyScalar(3400000);
  m31.rotation.set(1.0, 0.4, 0.5);
  scene.add(m31); addLabel('Andromeda (M31) · 2,5 Mio. Lj', m31.position, 700000);
  // Dreiecksgalaxie (M33) – RA 1,56h / +30,7°
  const m33 = makeMiniGalaxy(230000, 2600, 0xffeed0, 0xa8d0ff, 3, 2.6);
  m33.position.copy(dirOf(1.564, 30.66)).multiplyScalar(4100000);
  m33.rotation.set(0.5, 0.9, 0.2);
  scene.add(m33); addLabel('Dreiecksgalaxie (M33) · 2,7 Mio. Lj', m33.position, 560000);
  // Magellansche Wolken: Begleiter der Milchstraße – Südhimmel
  const lmc = makeBlob(95000, 1500, 0xd8e2ff);
  lmc.position.copy(dirOf(5.39, -69.76)).multiplyScalar(1150000);
  scene.add(lmc); addLabel('Große Magellansche Wolke', lmc.position, 420000);
  const smc = makeBlob(60000, 900, 0xcdd8f5);
  smc.position.copy(dirOf(0.88, -72.8)).multiplyScalar(1400000);
  scene.add(smc); addLabel('Kleine Magellansche Wolke', smc.position, 380000);
  // Ferne Hintergrund-Galaxien (stilisiert)
  for (let i=0; i<32; i++){
    const tint = ['rgba(255,225,180,','rgba(180,200,255,','rgba(230,210,255,'][i%3];
    const g = glowSprite(tint+'0.85)', tint+'0.25)', 45000 + Math.random()*120000);
    const t = Math.random()*Math.PI*2, p = Math.acos(2*Math.random()-1);
    const r = 3200000 + Math.random()*4300000;
    g.position.set(r*Math.sin(p)*Math.cos(t), r*Math.cos(p)*0.8, r*Math.sin(p)*Math.sin(t));
    g.material.userDataBase = 0.35 + Math.random()*0.45;
    g.material.opacity = 0;
    scene.add(g); farMats.push(g.material);
  }
})();

// ============================================================
//  Das kosmische Netz: Jeder Punkt ist eine ganze Galaxie
//  (Galaxienhaufen + Filamente + Leerräume/Voids)
// ============================================================
let cosmicMat, lgMarker, lgLabel, cosmicToast = false;
(function cosmicWeb(){
  const gauss = () => (Math.random()+Math.random()+Math.random()-1.5)/1.5;
  const CL = 130, perCl = 140, filaments = 170, perFil = 85;
  const N = CL*perCl + filaments*perFil;
  const pos = new Float32Array(N*3), col = new Float32Array(N*3);
  const cc = new THREE.Color();
  const tints = [0xfff0d8, 0xe8ecff, 0xd8e8ff, 0xffe8e0];
  let k = 0;
  function push(x, y, z){
    pos[k*3] = x; pos[k*3+1] = y; pos[k*3+2] = z;
    cc.set(tints[Math.floor(Math.random()*tints.length)]);
    cc.offsetHSL(0, 0, (Math.random()-0.5)*0.2);
    col[k*3] = cc.r; col[k*3+1] = cc.g; col[k*3+2] = cc.b;
    k++;
  }
  // Galaxienhaufen
  const centers = [];
  for (let c=0; c<CL; c++){
    const t = Math.random()*Math.PI*2, p = Math.acos(2*Math.random()-1);
    const r = 9e6 + Math.pow(Math.random(), 0.7)*1.55e8;
    const ctr = new THREE.Vector3(r*Math.sin(p)*Math.cos(t), r*Math.cos(p), r*Math.sin(p)*Math.sin(t));
    centers.push(ctr);
    const spread = 2e6 + Math.random()*4.5e6;
    for (let i=0; i<perCl; i++) push(ctr.x + gauss()*spread, ctr.y + gauss()*spread, ctr.z + gauss()*spread);
  }
  // Filamente zwischen benachbarten Haufen
  for (let f=0; f<filaments; f++){
    const a = centers[Math.floor(Math.random()*CL)];
    let b = null, best = Infinity;
    for (let j=0; j<8; j++){
      const cand = centers[Math.floor(Math.random()*CL)];
      const d = a.distanceToSquared(cand);
      if (d > 1 && d < best){ best = d; b = cand; }
    }
    if (!b) continue;
    for (let i=0; i<perFil; i++){
      const t = Math.random();
      push(a.x + (b.x-a.x)*t + gauss()*2.4e6,
           a.y + (b.y-a.y)*t + gauss()*2.4e6,
           a.z + (b.z-a.z)*t + gauss()*2.4e6);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos.slice(0, k*3), 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col.slice(0, k*3), 3));
  cosmicMat = new THREE.PointsMaterial({ vertexColors:true, size:6.8e5, sizeAttenuation:true, map:dotTex, transparent:true, opacity:0, depthWrite:false, blending:THREE.AdditiveBlending, toneMapped:false });
  scene.add(new THREE.Points(geo, cosmicMat));
  // „Du bist hier“ auf kosmischer Ebene
  lgMarker = glowSprite('rgba(140,230,255,1)','rgba(80,180,255,0.5)', 3.6e6);
  lgMarker.material.opacity = 0;
  scene.add(lgMarker);
  lgLabel = makeLabel('☀ Unsere Lokale Gruppe', true);
  lgLabel.scale.set(1.5e7, 3.75e6, 1);
  lgLabel.position.y = 5.5e6;
  lgLabel.material.opacity = 0;
  scene.add(lgLabel); reg3D(lgLabel, '☀ Unsere Lokale Gruppe');
})();

// ============================================================
//  Sonne + Licht + Korona
// ============================================================
const sun = new THREE.Mesh(new THREE.SphereGeometry(SUN_R,64,64), new THREE.MeshBasicMaterial({ map: loadTex(TEX+'sunmap.jpg', fallbacks.sun) }));
sun.userData = { name:'Sonne', ord:'Zentralstern (Gelber Zwerg, G2V)', isSun:true, visSize:SUN_R, diamKm:SUN_DIAM, g:274, temp:5500, dayH:600, yearD:0, moonCount:8, fromEarth:149.6,
  info:'Unser Stern – 99,8 % der Masse des Sonnensystems. Im Kern verschmilzt Wasserstoff zu Helium bei 15 Mio. °C. Steht im Brennpunkt aller Planetenbahnen.',
  distSun:'–', orbit:'–', rot:'≈ 25 Tage (Äquator)', tiltLabel:'7,25°', diam:'1.392.700 km', moons:'8 Planeten, 5+ Zwergplaneten' };
scene.add(sun);
function glowSprite(inner, mid, scale){
  const [c,ctx]=makeCanvas(256,256);
  const g=ctx.createRadialGradient(128,128,0,128,128,128);
  g.addColorStop(0,inner); g.addColorStop(0.3,mid); g.addColorStop(1,'rgba(255,140,40,0)');
  ctx.fillStyle=g; ctx.fillRect(0,0,256,256);
  const sp=new THREE.Sprite(new THREE.SpriteMaterial({ map:new THREE.CanvasTexture(c), transparent:true, depthWrite:false, blending:THREE.AdditiveBlending, toneMapped:false }));
  sp.scale.set(scale,scale,1); return sp;
}
const glow1 = glowSprite('rgba(255,210,120,0.85)','rgba(255,160,60,0.32)',42);
const glow2 = glowSprite('rgba(255,240,200,0.4)','rgba(255,120,40,0.12)',70);
scene.add(glow1); scene.add(glow2);
// Protuberanzen: rotierende Flare-Sprites
const flares = [];
for (let i=0;i<5;i++){
  const f = glowSprite('rgba(255,180,80,0.5)','rgba(255,120,30,0.18)', 6+Math.random()*5);
  f.userData = { ang: Math.random()*Math.PI*2, sp: 0.1+Math.random()*0.25, r: SUN_R*1.05 };
  scene.add(f); flares.push(f);
}
const sunLight = new THREE.PointLight(0xfff2cc, 2.1, 0, 2);
sunLight.shadow.mapSize.set(2048,2048);
sunLight.shadow.camera.near = 0.5;
sunLight.shadow.camera.far = 220;
sunLight.shadow.bias = -0.002;
scene.add(sunLight);
scene.add(new THREE.AmbientLight(0x232338, 0.85));

// ============================================================
//  Hilfen: Labels, Ringe
// ============================================================
function drawLabelCanvas(c, ctx, text){
  ctx.clearRect(0,0,1024,256);
  // Schriftgröße automatisch einpassen, damit lange Namen nicht abgeschnitten werden
  let fs = 104;
  ctx.font = '500 ' + fs + 'px Segoe UI, sans-serif';
  const tw = ctx.measureText(text).width;
  if (tw > 940){ fs = Math.floor(fs * 940 / tw); ctx.font = '500 ' + fs + 'px Segoe UI, sans-serif'; }
  ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.shadowColor='rgba(0,0,0,0.85)'; ctx.shadowBlur=18;
  ctx.lineWidth = Math.max(4, fs*0.12);
  ctx.strokeStyle = 'rgba(5,8,20,0.9)';
  ctx.strokeText(text,512,128);
  ctx.shadowBlur=0;
  ctx.fillStyle='rgba(235,235,255,0.97)';
  ctx.fillText(text,512,128);
}
function makeLabel(text, big){
  const [c,ctx]=makeCanvas(1024,256);
  drawLabelCanvas(c, ctx, text);
  const sp=new THREE.Sprite(new THREE.SpriteMaterial({ map:new THREE.CanvasTexture(c), transparent:true, depthWrite:false }));
  sp.scale.set(big?14:10, big?3.5:2.5, 1);
  sp.userData._canvas = c; sp.userData._ctx = ctx;
  return sp;
}
// Beschriftung eines bestehenden Sprites neu zeichnen (für Sprachwechsel)
function updateLabel(sp, text){
  if (!sp || !sp.userData._ctx) return;
  drawLabelCanvas(sp.userData._canvas, sp.userData._ctx, text);
  sp.material.map.needsUpdate = true;
}
function ringTexture(){
  const [c,ctx]=makeCanvas(512,8);
  for(let x=0;x<512;x++){ const t=x/512; let a=0.55, col=[205,187,138];
    if(t<0.06) a=t/0.06*0.3;
    else if(t<0.16){ a=0.3; col=[160,145,110]; }
    else if(t<0.55){ a=0.7+Math.sin(t*90)*0.1; }
    else if(t<0.62) a=0.06;
    else if(t<0.92){ a=0.5+Math.sin(t*70)*0.08; col=[214,196,150]; }
    else a=(1-t)/0.08*0.4;
    ctx.fillStyle=`rgba(${col[0]},${col[1]},${col[2]},${Math.max(0,a)})`;
    ctx.fillRect(x,0,1,8);
  }
  return new THREE.CanvasTexture(c);
}
function makeRing(inner, outer, opacity, useTexture){
  const geo = new THREE.RingGeometry(inner, outer, 128, 1);
  const pos = geo.attributes.position;
  for (let i=0;i<pos.count;i++){
    const r = Math.hypot(pos.getX(i), pos.getY(i));
    geo.attributes.uv.setXY(i, (r-inner)/(outer-inner), 0.5);
  }
  let mat;
  if (useTexture){
    const rt = ringTexture(); rt.encoding = THREE.sRGBEncoding; rt.anisotropy = MAX_ANISO;
    mat = new THREE.MeshStandardMaterial({ map:rt, side:THREE.DoubleSide, transparent:true, alphaTest:0.18, roughness:1, depthWrite:false });
  } else {
    mat = new THREE.MeshBasicMaterial({ color:0xa8c4c8, side:THREE.DoubleSide, transparent:true, opacity, depthWrite:false });
  }
  const ring = new THREE.Mesh(geo, mat);
  ring.rotation.x = Math.PI/2;
  if (useTexture){ ring.castShadow = true; ring.receiveShadow = true; }
  return ring;
}

// ============================================================
//  Körper erzeugen
// ============================================================
const orbitLines = [], labelSprites = [], axisLines = [], allMeshes = [sun];

BODIES.forEach(p => {
  p.el = EL[p.name];
  p.realSize = realSizeOf(p.diamKm);

  const holder = new THREE.Object3D(); scene.add(holder); p.holder = holder;
  const tiltGroup = new THREE.Object3D();
  if (p.seasonTilt){
    // Nordpol lehnt zur Ekliptik-Länge 90° (Richtung Sommersonnenwende) – fixe Raumrichtung
    tiltGroup.rotation.x = -THREE.MathUtils.degToRad(p.tilt || 0);
  } else {
    tiltGroup.rotation.z = THREE.MathUtils.degToRad(p.tilt || 0);
  }
  holder.add(tiltGroup); p.tiltGroup = tiltGroup;

  let mat;
  if (p.earthShader){
    // 4k-Tageskarte (NASA Blue Marble, wolkenfrei) → Fallback 1k → Fallback prozedural
    const dayTex = loader.load(TEXE+'2_no_clouds_4k.jpg', t => { t.anisotropy = MAX_ANISO; }, undefined, () => {
      const t2 = loader.load(TEX+'earthmap1k.jpg', undefined, undefined, () => {
        p.mesh.material = new THREE.MeshStandardMaterial({ map: fallbacks.earth(), roughness:0.85 });
      });
      if (p.mesh.material.uniforms) { p.mesh.material.uniforms.dayMap.value = t2; }
    });
    const nightTex = loadTex(TEX3+'earth_lights_2048.png', () => neutralTex('#000'), false);
    const elevTex  = loadTex(TEXE+'elev_bump_4k.jpg', () => neutralTex('#808080'), false);
    const waterTex = loadTex(TEXE+'water_4k.png', () => neutralTex('#000'), false);
    mat = new THREE.ShaderMaterial({
      uniforms: {
        dayMap:{value:dayTex}, nightMap:{value:nightTex},
        elevMap:{value:elevTex}, waterMap:{value:waterTex},
        bumpStrength:{value:7.0}
      },
      vertexShader: `
        varying vec2 vUv; varying vec3 vN; varying vec3 vWp;
        void main(){
          vUv = uv;
          vN = normalize(mat3(modelMatrix) * normal);
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWp = wp.xyz;
          gl_Position = projectionMatrix * viewMatrix * wp;
        }`,
      fragmentShader: `
        uniform sampler2D dayMap; uniform sampler2D nightMap;
        uniform sampler2D elevMap; uniform sampler2D waterMap;
        uniform float bumpStrength;
        varying vec2 vUv; varying vec3 vN; varying vec3 vWp;
        void main(){
          vec3 ld = normalize(-vWp); // Sonne im Ursprung
          // Reliefschattierung aus Höhenkarte (Gebirge werfen Mikro-Schatten)
          vec2 texel = vec2(1.0/4096.0, 1.0/2048.0);
          float h  = texture2D(elevMap, vUv).r;
          float hU = texture2D(elevMap, vUv + vec2(texel.x, 0.0)).r;
          float hV = texture2D(elevMap, vUv + vec2(0.0, texel.y)).r;
          vec3 N = normalize(vN);
          vec3 T = normalize(cross(vec3(0.0, 1.0, 0.0), N) + vec3(1e-4));
          vec3 B = cross(N, T);
          N = normalize(N - ((hU - h) * T + (hV - h) * B) * bumpStrength);
          float l = dot(N, ld);
          float k = smoothstep(-0.12, 0.25, l);
          vec3 day = texture2D(dayMap, vUv).rgb * (0.28 + 0.95 * max(l, 0.0));
          // Sonnen-Glanzlicht auf den Ozeanen
          float water = texture2D(waterMap, vUv).r;
          vec3 viewDir = normalize(cameraPosition - vWp);
          vec3 halfV = normalize(ld + viewDir);
          float spec = pow(max(dot(N, halfV), 0.0), 48.0) * water * max(l, 0.0);
          day += vec3(0.85, 0.92, 1.0) * spec * 0.8;
          vec3 night = texture2D(nightMap, vUv).rgb * 1.7;
          gl_FragColor = vec4(mix(night, day, k), 1.0);
        }`
    });
  } else {
    mat = new THREE.MeshStandardMaterial({ map: p.tex(), roughness: 0.92, metalness: 0.02 });
    if (p.bump){ mat.bumpMap = loadTex(p.bump, null, false); mat.bumpScale = 0.03; }
  }
  if (mat.map){ mat.map.encoding = THREE.sRGBEncoding; mat.map.anisotropy = MAX_ANISO; }
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(p.visSize, p.visSize > 3 ? 80 : 48, p.visSize > 3 ? 80 : 48), mat);
  if (p.elong) mesh.scale.set(p.elongScale ? p.elongScale[0] : 1.55, p.elongScale ? p.elongScale[1] : 0.85, p.elongScale ? p.elongScale[2] : 1);
  if (p.flatten) mesh.scale.set(1, p.flatten, 1); // echte Abplattung der Gasriesen
  mesh.castShadow = true;
  if (!p.earthShader) mesh.receiveShadow = true;
  mesh.userData = p;
  tiltGroup.add(mesh); p.mesh = mesh; allMeshes.push(mesh);

  if (p.clouds){
    // 4k-Wolkenkarte mit echter Transparenz → Fallback 1k-Alphamap → prozedural
    const cloudMat = new THREE.MeshLambertMaterial({ color:0xffffff, transparent:true, depthWrite:false, opacity:0.95 });
    cloudMat.map = loader.load(TEXE+'fair_clouds_4k.png', undefined, undefined, () => {
      cloudMat.map = null;
      cloudMat.alphaMap = loadTex(TEX+'earthcloudmap.jpg', fallbacks.clouds);
      cloudMat.needsUpdate = true;
    });
    const clouds = new THREE.Mesh(new THREE.SphereGeometry(p.visSize*1.015, 48, 48), cloudMat);
    tiltGroup.add(clouds); p.cloudMesh = clouds;
  }
  if (p.atmosphere){
    // Fresnel-Atmosphäre: leuchtender blauer Saum am Planetenrand
    const atm = new THREE.Mesh(new THREE.SphereGeometry(p.visSize*(p.atmoR || 1.12), 48, 48), new THREE.ShaderMaterial({
      uniforms: { glowColor: { value: new THREE.Color(p.atmosphere) }, kI: { value: p.atmoI !== undefined ? p.atmoI : 0.9 } },
      vertexShader: `
        varying float vI;
        void main(){
          vec3 n = normalize(normalMatrix * normal);
          vI = pow(max(0.62 - dot(n, vec3(0.0, 0.0, 1.0)), 0.0), 3.5);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: `
        uniform vec3 glowColor; uniform float kI; varying float vI;
        void main(){ gl_FragColor = vec4(glowColor, 1.0) * vI * kI; }`,
      side: THREE.BackSide, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false
    }));
    tiltGroup.add(atm);
  }

  const axis = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,-p.visSize*1.7,0), new THREE.Vector3(0,p.visSize*1.7,0)]),
    new THREE.LineBasicMaterial({ color:0xff8a8a, transparent:true, opacity:0.8 }));
  axis.visible = false; tiltGroup.add(axis); axisLines.push(axis);

  if (p.ring) tiltGroup.add(makeRing(p.visSize*1.35, p.visSize*2.35, 0.6, true));
  if (p.faintRing) tiltGroup.add(makeRing(p.visSize*1.7, p.visSize*1.82, 0.25, false));

  if (p.visMoons){
    p.moonObjs = [];
    p.visMoons.forEach(m => {
      const pivot = new THREE.Object3D();
      pivot.rotation.y = Math.random()*Math.PI*2;
      const moon = new THREE.Mesh(new THREE.SphereGeometry(m.size, 20, 20),
        new THREE.MeshStandardMaterial({ map: m.tex(), roughness:1 }));
      moon.material.map.encoding = THREE.sRGBEncoding;
      if (m.bump){ moon.material.bumpMap = loadTex(m.bump, null, false); moon.material.bumpScale = 0.02; }
      moon.castShadow = true; moon.receiveShadow = true;
      moon.position.x = m.dist;
      pivot.add(moon);
      holder.add(pivot);
      p.moonObjs.push({ pivot, moon, def:m });
    });
  }

  const line = new THREE.Line(new THREE.BufferGeometry(),
    new THREE.LineBasicMaterial({ color: p.dwarf ? 0x5a4a78 : 0x44486e, transparent:true, opacity:0.5 }));
  scene.add(line); orbitLines.push(line); p.orbitLine = line;

  const label = makeLabel(p.name, !p.dwarf);
  holder.add(label); labelSprites.push(label); p.label = label; reg3D(label, p.name);
});

const sunLabel = makeLabel('Sonne', true);
sunLabel.position.y = 10; sun.add(sunLabel); labelSprites.push(sunLabel); reg3D(sunLabel, 'Sonne');

// ============================================================
//  Komet Halley
// ============================================================
const halley = {
  name:'Halley', el: EL.Halley, holder: new THREE.Object3D(),
  userDataTpl: { name:'Halleyscher Komet', ord:'Komet', visSize:0.25,
    info:'Der berühmteste Komet – besucht das innere Sonnensystem alle ~76 Jahre (zuletzt 1986, wieder 2061). Sein Schweif aus Gas und Staub zeigt immer von der Sonne weg. Bahn retrograd und stark geneigt!',
    distSun:'0,59–35,1 AE (extrem elliptisch)', orbit:'~76 Jahre', rot:'2,2 Tage', tiltLabel:'–', diam:'~11 km', moons:'–' }
};
scene.add(halley.holder);
halley.mesh = new THREE.Mesh(new THREE.SphereGeometry(0.25, 16, 16), new THREE.MeshStandardMaterial({ map: fallbacks.ice(), roughness:1 }));
halley.mesh.material.map.encoding = THREE.sRGBEncoding;
halley.mesh.userData = Object.assign({ holder: halley.holder }, halley.userDataTpl);
halley.holder.add(halley.mesh); allMeshes.push(halley.mesh);
halley.coma = glowSprite('rgba(200,225,255,0.8)','rgba(150,190,255,0.25)', 2);
halley.holder.add(halley.coma);
halley.tail = new THREE.Mesh(
  new THREE.ConeGeometry(0.8, 1, 16, 1, true),
  new THREE.MeshBasicMaterial({ color:0xa8c8ff, transparent:true, opacity:0.22, blending:THREE.AdditiveBlending, depthWrite:false, side:THREE.DoubleSide }));
scene.add(halley.tail);
halley.line = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color:0x7a9ac8, transparent:true, opacity:0.4 }));
scene.add(halley.line); orbitLines.push(halley.line);
halley.label = makeLabel('Halley', false);
halley.holder.add(halley.label); labelSprites.push(halley.label); reg3D(halley.label, 'Halley');
halley.label.position.y = 1.4;

// ============================================================
//  Asteroidengürtel & Kuipergürtel
// ============================================================
function makeBelt(n, rMin, rMax, ySpread, color, size){
  const baseAU = new Float32Array(n*3);
  for(let i=0;i<n;i++){
    const r = rMin + Math.random()*(rMax-rMin);
    const t = Math.random()*Math.PI*2;
    baseAU[i*3] = r*Math.cos(t);
    baseAU[i*3+1] = (Math.random()+Math.random()+Math.random()-1.5)/1.5 * ySpread;
    baseAU[i*3+2] = r*Math.sin(t);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n*3), 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color, size, sizeAttenuation:true, transparent:true, opacity:0.85, map:dotTex, depthWrite:false, alphaTest:0.04 }));
  pts.userData.baseAU = baseAU;
  scene.add(pts);
  return pts;
}
const beltMain = makeBelt(3500, 2.1, 3.3, 0.12, 0x9a8f7c, 0.55);
const beltKuiper = makeBelt(2600, 32, 48, 1.6, 0x7e8dac, 0.9);
const beltGroupRot = { main:0, kuiper:0 };
function updateBeltPositions(){
  [beltMain, beltKuiper].forEach(pts => {
    const base = pts.userData.baseAU, attr = pts.geometry.attributes.position;
    const v = new THREE.Vector3(), o = new THREE.Vector3();
    for(let i=0;i<attr.count;i++){
      v.set(base[i*3], base[i*3+1], base[i*3+2]);
      mapAU(v, o);
      attr.setXYZ(i, o.x, o.y, o.z);
    }
    attr.needsUpdate = true;
    pts.geometry.computeBoundingSphere();
  });
}

// ============================================================
//  Voyager-Sonden (zeitgesteuert: echte Missions-Stationen)
// ============================================================
const probesGroup = new THREE.Group(); probesGroup.visible = false; scene.add(probesGroup);
function yms(y){ const yr = Math.floor(y); return Date.UTC(yr, 0, 1) + (y - yr) * 365.25 * 86400000; }
const GOLDEN_RECORD_IMG = 'https://commons.wikimedia.org/wiki/Special:FilePath/The%20Sounds%20of%20Earth%20Record%20Cover%20-%20GPN-2000-001978.jpg?width=640';
const GOLDEN_RECORD_CAP = 'Die Voyager Golden Record: eine vergoldete Kupfer-Datenplatte mit 116 Bildern, Grüßen in 55 Sprachen, Naturgeräuschen und 90 Minuten Musik – eine Botschaft der Erde an Außerirdische, an Bord beider Sonden. (Foto: NASA)';
const PROBE_DEFS = [
  { name:'Voyager 1', color:0x9ad0ff,
    wps:[ [1977.68,[0.9,0,0.45]], [1979.18,[5.0,0.1,1.5]], [1980.87,[9.2,0.5,-2.4]], [1990,[40,12,-14]],
          [2004.95,[83,28,-30]], [2012.6,[107,37,-39]], [2026.45,[146,50,-53]], [2126,[468,160,-170]] ],
    data:{ name:'Voyager 1', ord:'Raumsonde · NASA (seit 1977)', isProbe:true, probeIdx:0, visSize:0.8,
      info:'Das am weitesten entfernte menschengemachte Objekt! Start am 5. September 1977, Vorbeiflüge an Jupiter (1979) und Saturn samt Titan (1980). Seit August 2012 fliegt sie im interstellaren Raum – ihr Funksignal ist fast einen Tag zu uns unterwegs. 1990 schoss sie das berühmte Foto „Pale Blue Dot“. An Bord: die Golden Record.',
      distSun:'–', orbit:'verlässt das Sonnensystem für immer', rot:'17,0 km/s (≈ 61.000 km/h)',
      tiltLabel:'Kurs: 35° über der Ekliptik', diam:'825 kg · 3,7-m-Antenne', moons:'–' } },
  { name:'Voyager 2', color:0xffc89a,
    wps:[ [1977.63,[0.95,0,-0.3]], [1979.52,[5.0,0,2.2]], [1981.65,[9.4,-0.2,0.8]], [1986.07,[18.8,-0.5,-3.5]],
          [1989.65,[29.5,-1.2,-7.5]], [2000,[55,-18,-20]], [2018.85,[98,-46,-42]], [2026.45,[113,-53,-48]], [2126,[383,-180,-163]] ],
    data:{ name:'Voyager 2', ord:'Raumsonde · NASA (seit 1977)', isProbe:true, probeIdx:1, visSize:0.8,
      info:'Die einzige Sonde, die alle vier äußeren Planeten besucht hat – die „Grand Tour“: Jupiter (1979), Saturn (1981), Uranus (1986) und Neptun (1989). Startete 16 Tage VOR Voyager 1! Seit November 2018 im interstellaren Raum. Trägt ebenfalls eine Golden Record.',
      distSun:'–', orbit:'verlässt das Sonnensystem für immer', rot:'15,4 km/s (≈ 55.000 km/h)',
      tiltLabel:'Kurs: 48° unter der Ekliptik', diam:'825 kg · 3,7-m-Antenne', moons:'–' } }
];
const probes = PROBE_DEFS.map(def => {
  const curve = new THREE.CatmullRomCurve3(def.wps.map(w => new THREE.Vector3(w[1][0], w[1][1], w[1][2])));
  const times = def.wps.map(w => yms(w[0]));
  const holder = new THREE.Object3D(); probesGroup.add(holder);
  holder.add(glowSprite('rgba(255,255,255,0.95)','rgba(160,200,255,0.4)', 1.6));
  const click = new THREE.Mesh(new THREE.SphereGeometry(1.1, 8, 8), new THREE.MeshBasicMaterial({ transparent:true, opacity:0 }));
  click.userData = Object.assign({ holder, photo:GOLDEN_RECORD_IMG, photoCaption:GOLDEN_RECORD_CAP }, def.data);
  holder.add(click); allMeshes.push(click);
  const label = makeLabel(def.name, false);
  label.position.y = 2.0; holder.add(label); labelSprites.push(label); reg3D(label, def.name);
  const trail = new THREE.Line(new THREE.BufferGeometry(),
    new THREE.LineDashedMaterial({ color: def.color, dashSize: 1.6, gapSize: 1.0, transparent:true, opacity:0.75 }));
  probesGroup.add(trail);
  return { def, curve, times, holder, trail, click, curAU: 0 };
});
function probeU(pr, ms){
  const t = pr.times, n = t.length;
  if (ms <= t[0]) return 0;
  if (ms >= t[n-1]) return 1;
  let i = 0; while (i < n-2 && ms > t[i+1]) i++;
  return (i + (ms - t[i]) / (t[i+1] - t[i])) / (n - 1);
}
const tmpProbe = new THREE.Vector3();
function updateProbesFrame(){
  probes.forEach(pr => {
    const launched = simDate >= pr.times[0] - 86400000*20;
    pr.holder.visible = pr.trail.visible = launched;
    if (!launched) return;
    const u = probeU(pr, simDate);
    const pAU = pr.curve.getPoint(Math.max(u, 0.0005));
    pr.curAU = pAU.length();
    mapAU(pAU, tmpProbe);
    pr.holder.position.copy(tmpProbe);
    const steps = 90, pts = [];
    for (let s = 0; s <= steps; s++) pts.push(mapAU(pr.curve.getPoint(u * s / steps)));
    pr.trail.geometry.dispose();
    pr.trail.geometry = new THREE.BufferGeometry().setFromPoints(pts);
    pr.trail.computeLineDistances();
  });
}
// Flug-Wiedergabe: 1977 → heute im Zeitraffer, Kamera verfolgt die Sonde
let voyagerPlayback = null;
function startVoyagerFlight(idx){
  stopJourney();
  stopSeasons();
  voyagerPlayback = null;
  const pr = probes[idx];
  document.getElementById('probes').checked = true;
  if (document.getElementById('planetsOnly').checked) document.getElementById('planetsOnly').checked = false;
  applyVisibility();
  stopTour();
  if (timeMachine) closeTimeMachine();
  simDate = pr.times[0] - 86400000*5;
  voyagerPlayback = pr;
  followTarget = pr.holder;
  camDistGoal = 11;
  updateProbesFrame();
  toast('▶ ' + dn(pr.def.name) + t('voyager_flight'), 6000);
  syncTM();
}
window.startVoyagerFlight = startVoyagerFlight;

// ============================================================
//  Erdsatelliten: ISS, Hubble & JWST (Lagrange-Punkt L2)
// ============================================================
const earthBody = BODIES.find(b => b.name === 'Erde');
function makeSat(data){
  const anchor = new THREE.Object3D();
  anchor.add(glowSprite('rgba(255,255,255,0.95)','rgba(180,210,255,0.45)', 0.9));
  const click = new THREE.Mesh(new THREE.SphereGeometry(0.6, 8, 8), new THREE.MeshBasicMaterial({ transparent:true, opacity:0 }));
  click.userData = Object.assign({ holder: anchor, visSize:0.5, realSize:0.12 }, data);
  anchor.add(click); allMeshes.push(click);
  const label = makeLabel(data.shortName || data.name, false);
  label.scale.set(6, 1.5, 1); label.position.y = 0.9;
  anchor.add(label); labelSprites.push(label); reg3D(label, data.shortName || data.name);
  anchor.userData.click = click;
  return anchor;
}
const issPivot = new THREE.Object3D(); issPivot.rotation.y = 1.2; earthBody.holder.add(issPivot);
const issAnchor = makeSat({ name:'ISS', shortName:'ISS', ord:'Raumstation · seit 1998 im Orbit',
  info:'Die Internationale Raumstation: seit November 2000 ununterbrochen von Menschen bewohnt – das größte Bauwerk im All. Sie umrundet die Erde in 400 km Höhe alle 93 Minuten; die Crew erlebt 16 Sonnenauf- und -untergänge pro Tag. Bei klarem Himmel mit bloßem Auge sichtbar!',
  distSun:'≈ 1 AE (mit der Erde)', orbit:'92,9 min um die Erde (400 km Höhe)', rot:'28.800 km/h',
  tiltLabel:'Bahnneigung 51,6°', diam:'109 × 73 m · ~420 t', moons:'–' });
issPivot.add(issAnchor);
const hubPivot = new THREE.Object3D(); hubPivot.rotation.y = 3.6; earthBody.holder.add(hubPivot);
const hubAnchor = makeSat({ name:'Hubble-Weltraumteleskop', shortName:'Hubble', ord:'Weltraumteleskop · seit 1990',
  info:'Das berühmteste Teleskop der Welt: über 1,5 Millionen Beobachtungen, half das Alter des Universums zu bestimmen (13,8 Mrd. Jahre) und lieferte die tiefsten Blicke ins All. Wurde fünfmal von Astronauten im Orbit repariert und aufgerüstet.',
  distSun:'≈ 1 AE (mit der Erde)', orbit:'95 min um die Erde (540 km Höhe)', rot:'27.300 km/h',
  tiltLabel:'Bahnneigung 28,5°', diam:'13,2 m · 11 t · 2,4-m-Spiegel', moons:'–' });
hubPivot.add(hubAnchor);
const jwstAnchor = makeSat({ name:'James-Webb-Teleskop', shortName:'JWST', ord:'Weltraumteleskop · seit 2021 · am L2',
  info:'Das stärkste Weltraumteleskop: beobachtet im Infrarot die ersten Galaxien nach dem Urknall und untersucht Atmosphären von Exoplaneten. Es schwebt am Lagrange-Punkt L2, 1,5 Mio. km hinter der Erde – dort heben sich die Anziehungskräfte so auf, dass es mit der Erde um die Sonne wandert. Sein Sonnenschild ist tennisplatzgroß und kühlt die Optik auf −233 °C.',
  distSun:'≈ 1,01 AE (Lagrange-Punkt L2)', orbit:'umkreist L2, immer sonnenabgewandt', rot:'–',
  tiltLabel:'permanent im Erdschatten-Bereich', diam:'6,5-m-Spiegel · Schild 21 × 14 m', moons:'–' });
scene.add(jwstAnchor);
let satsEnabled = false;
const SAT_LAUNCH = { iss: Date.UTC(1998,10,20), hubble: Date.UTC(1990,3,24), jwst: Date.UTC(2021,11,25) };
function updateSatellites(dt, speed){
  // Satelliten existieren erst ab ihrem Startdatum (wichtig für Zeitmaschine & Voyager-Zeitraffer)
  issPivot.visible = satsEnabled && simDate >= SAT_LAUNCH.iss;
  hubPivot.visible = satsEnabled && simDate >= SAT_LAUNCH.hubble;
  jwstAnchor.visible = satsEnabled && simDate >= SAT_LAUNCH.jwst;
  const er = earthBody.realSize;
  issAnchor.position.x = 2.1*(1-scaleMix) + scaleMix*(er*1.18);
  hubAnchor.position.x = 2.45*(1-scaleMix) + scaleMix*(er*1.35);
  issPivot.rotation.y += dt * 2.6 * speed;
  hubPivot.rotation.y += dt * 2.2 * speed;
  // JWST: auf der Sonne-Erde-Linie, 1,5 Mio. km hinter der Erde (L2)
  const dir = earthBody.holder.position.clone().normalize();
  const off = 4.8*(1-scaleMix) + 1.5*scaleMix;
  jwstAnchor.position.copy(earthBody.holder.position).add(dir.multiplyScalar(off));
}

