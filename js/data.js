/* data.js — Bahnelemente (JPL-Näherung) und Planeten-/Körperdaten
   Klassisches Script (kein ES-Modul): alle Top-Level-Deklarationen teilen sich
   einen gemeinsamen globalen Scope. Ladereihenfolge: siehe index.html. */

// ============================================================
//  Textur-Basis-URLs (von BODIES weiter unten direkt verwendet)
// ============================================================
const TEX = 'https://raw.githubusercontent.com/jeromeetienne/threex.planets/master/images/';
const TEX3 = 'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/';
const TEXE = 'https://raw.githubusercontent.com/turban/webgl-earth/master/images/'; // 4k-Erdkarten (NASA Blue Marble)

// ============================================================
//  Bahnelemente (JPL-Näherung, J2000 + Raten pro Jahrhundert)
//  a [AE], e, i/O/w/L [Grad]; w = Länge des Perihels (ϖ)
// ============================================================
const EL = {
  Merkur:  { a:0.38710, e:0.20564, i:7.005,  O:48.331,  w:77.456,  L:252.251, Ldot:149472.674 },
  Venus:   { a:0.72333, e:0.00678, i:3.395,  O:76.680,  w:131.564, L:181.980, Ldot:58517.816 },
  Erde:    { a:1.00000, e:0.01671, i:0.0,    O:0.0,     w:102.937, L:100.464, Ldot:35999.372 },
  Mars:    { a:1.52371, e:0.09339, i:1.850,  O:49.560,  w:-23.944, L:-4.553,  Ldot:19140.303 },
  Jupiter: { a:5.20289, e:0.04839, i:1.304,  O:100.474, w:14.728,  L:34.396,  Ldot:3034.746 },
  Saturn:  { a:9.53668, e:0.05386, i:2.486,  O:113.662, w:92.599,  L:49.954,  Ldot:1222.494 },
  Uranus:  { a:19.18916,e:0.04726, i:0.773,  O:74.017,  w:170.954, L:313.238, Ldot:428.482 },
  Neptun:  { a:30.06992,e:0.00859, i:1.770,  O:131.784, w:44.965,  L:-55.120, Ldot:218.459 },
  Pluto:   { a:39.48211,e:0.24883, i:17.140, O:110.305, w:224.069, L:238.929, Ldot:145.208 },
  Ceres:   { a:2.7675,  e:0.0758,  i:10.59,  O:80.31,   w:153.9,   L:95.0,    Ldot:7818 },
  Eris:    { a:67.78,   e:0.4361,  i:44.04,  O:35.95,   w:187.2,   L:205.0,   Ldot:64.5 },
  Makemake:{ a:45.79,   e:0.159,   i:28.98,  O:79.36,   w:14.2,    L:150.0,   Ldot:116.2 },
  Haumea:  { a:43.18,   e:0.191,   i:28.21,  O:122.16,  w:1.2,     L:240.0,   Ldot:126.8 },
  Halley:  { a:17.83,   e:0.967,   i:162.26, O:58.42,   w:169.75,  L:236.2,   Ldot:478.2 }
};
function helioAU(el, T){
  const e = el.e;
  let M = ((el.L + el.Ldot*T - el.w) % 360 + 360) % 360;
  if (M > 180) M -= 360;
  M *= DEG;
  let E = M + e*Math.sin(M);
  for (let k=0; k<12; k++){
    const dE = (E - e*Math.sin(E) - M) / (1 - e*Math.cos(E));
    E -= dE; if (Math.abs(dE) < 1e-8) break;
  }
  return planeToEcl(el, el.a*(Math.cos(E)-e), el.a*Math.sqrt(1-e*e)*Math.sin(E));
}
function planeToEcl(el, xp, yp){
  const w = (el.w - el.O)*DEG, O = el.O*DEG, i = el.i*DEG;
  const co=Math.cos(w), so=Math.sin(w), cO=Math.cos(O), sO=Math.sin(O), ci=Math.cos(i), si=Math.sin(i);
  const x = (co*cO - so*sO*ci)*xp + (-so*cO - co*sO*ci)*yp;
  const y = (co*sO + so*cO*ci)*xp + (-so*sO + co*cO*ci)*yp;
  const z = (so*si)*xp + (co*si)*yp;
  return new THREE.Vector3(x, z, -y); // Ekliptik → Szene
}

// Anschaulicher Maßstab: AE → Einheiten (gestauchte Abstände)
const VIS_ANCHORS = [[0,0],[0.39,14],[0.72,20],[1,27],[1.52,34],[2.77,41],[5.2,48],[9.58,64],[19.2,78],[30.07,90],[39.5,104],[45.8,116],[67.8,140]];
function AUtoVis(r){
  const A = VIS_ANCHORS;
  if (r <= 0) return 0;
  for (let i=1;i<A.length;i++){
    if (r <= A[i][0]){
      const [r0,v0]=A[i-1],[r1,v1]=A[i];
      return v0 + (v1-v0)*(r-r0)/(r1-r0);
    }
  }
  const [r0,v0]=A[A.length-2],[r1,v1]=A[A.length-1];
  return v1 + (r-r1)*(v1-v0)/(r1-r0);
}
function mapAU(vAU, out){
  const r = vAU.length(); out = out || new THREE.Vector3();
  if (r < 1e-9) return out.set(0,0,0);
  const kVis = AUtoVis(r)/r;
  const k = kVis + (REAL_AU - kVis)*scaleMix;
  return out.copy(vAU).multiplyScalar(k);
}

// ============================================================
//  Himmelskörper-Daten
// ============================================================
const SUN_R = 7, SUN_DIAM = 1392700;
function realSizeOf(diamKm){ return Math.max(0.012, SUN_R * diamKm / SUN_DIAM); }

const BODIES = [
  { name:'Merkur', ord:'1. Planet', visSize:0.9, tex:()=>loadTex(TEX+'mercurymap.jpg',fallbacks.mercury), bump:TEX+'mercurybump.jpg',
    rotPeriod:58.6, tilt:0.03, diamKm:4879, g:3.7, temp:167, dayH:1407.5, yearD:88, moonCount:0, fromEarth:91.7,
    info:'Der kleinste Planet, übersät mit Einschlagkratern wie unser Mond. Seine Bahn ist die exzentrischste und am stärksten geneigte aller Planeten (7°).',
    distSun:'57,9 Mio. km (0,39 AE)', orbit:'88 Tage', rot:'59 Tage', diam:'4.879 km', moons:'keine' },
  { name:'Venus', ord:'2. Planet', visSize:1.4, tex:()=>loadTex(TEX+'venusmap.jpg',fallbacks.venus), atmosphere:0xe8d9a0, atmoI:1.0, atmoR:1.16,
    rotPeriod:243, tilt:177.4, diamKm:12104, g:8.87, temp:464, dayH:5832.5, yearD:224.7, moonCount:0, fromEarth:41.4,
    info:'Komplett in dichte Schwefelsäure-Wolken gehüllt – mit 465 °C der heißeste Planet. Rotiert retrograd und langsamer als ihr Sonnenumlauf.',
    distSun:'108,2 Mio. km (0,72 AE)', orbit:'225 Tage', rot:'243 Tage ⟲', diam:'12.104 km', moons:'keine' },
  { name:'Erde', ord:'3. Planet', visSize:1.5, earthShader:true, clouds:true, atmosphere:0x4d9ef2, seasonTilt:true,
    rotPeriod:1, tilt:23.4, diamKm:12742, g:9.81, temp:15, dayH:23.93, yearD:365.25, moonCount:1, fromEarth:0,
    visMoons:[{ name:'Mond', size:0.4, dist:2.9, period:27.3, diamKm:3474, distKm:384400, tex:()=>loadTex(TEX+'moonmap1k.jpg',fallbacks.rock), bump:TEX+'moonbump1k.jpg' }],
    info:'Der blaue Planet mit echter NASA-Satellitenkarte: Kontinente, Polkappen, Wolken – und auf der Nachtseite leuchten die Lichter der Städte!',
    distSun:'149,6 Mio. km (1 AE)', orbit:'365,25 Tage', rot:'23 h 56 min', diam:'12.742 km', moons:'1 – der Mond' },
  { name:'Mars', ord:'4. Planet', visSize:1.1, tex:()=>loadTex(TEX+'marsmap1k.jpg',fallbacks.mars), bump:TEX+'marsbump1k.jpg', atmosphere:0xd8916a, atmoI:0.4, atmoR:1.06,
    rotPeriod:1.03, tilt:25.2, diamKm:6779, g:3.71, temp:-65, dayH:24.62, yearD:687, moonCount:2, fromEarth:78.3,
    visMoons:[{ name:'Phobos', size:0.13, dist:1.8, period:0.32, diamKm:22, distKm:9376, tex:()=>fallbacks.rock() },
              { name:'Deimos', size:0.1, dist:2.5, period:1.26, diamKm:12, distKm:23463, tex:()=>fallbacks.rock() }],
    info:'Der rote Planet mit Eisenoxid-Staub, dem Riesenvulkan Olympus Mons und dem Canyon-System Valles Marineris – hier mit echter Höhenkarte.',
    distSun:'227,9 Mio. km (1,52 AE)', orbit:'687 Tage', rot:'24 h 37 min', diam:'6.779 km', moons:'2 – Phobos & Deimos' },
  { name:'Jupiter', ord:'5. Planet', visSize:4.5, tex:()=>loadTex(TEX+'jupitermap.jpg',fallbacks.jupiter), flatten:0.935, atmosphere:0xe0c8a0, atmoI:0.5, atmoR:1.08,
    rotPeriod:0.41, tilt:3.1, diamKm:139820, g:24.79, temp:-110, dayH:9.93, yearD:4333, moonCount:95, fromEarth:628.9,
    visMoons:[{ name:'Io', size:0.3, dist:6.4, period:1.77, diamKm:3643, distKm:421700, tex:()=>fbSolid('#d8b860','#b08c3a',30)() },
              { name:'Europa', size:0.26, dist:7.4, period:3.55, diamKm:3122, distKm:670900, tex:()=>fallbacks.ice() },
              { name:'Ganymed', size:0.36, dist:8.5, period:7.15, diamKm:5268, distKm:1070400, tex:()=>fallbacks.rock() },
              { name:'Kallisto', size:0.33, dist:9.7, period:16.7, diamKm:4821, distKm:1882700, tex:()=>fbSolid('#6e6258','#4e453d',60)() }],
    info:'Der Gasriese mit Wolkenbändern und dem Großen Roten Fleck – ein Sturm, größer als die Erde. Schnellster Rotierer des Sonnensystems.',
    distSun:'778,5 Mio. km (5,20 AE)', orbit:'11,9 Jahre', rot:'9 h 56 min', diam:'139.820 km',
    moons:'95 bekannte – die größten: Io, Europa, Ganymed, Kallisto (Galileische Monde)' },
  { name:'Saturn', ord:'6. Planet', visSize:3.8, tex:()=>loadTex(TEX+'saturnmap.jpg',fallbacks.saturn), ring:true, flatten:0.902, atmosphere:0xe8dcae, atmoI:0.45, atmoR:1.08,
    rotPeriod:0.45, tilt:26.7, diamKm:116460, g:10.44, temp:-140, dayH:10.7, yearD:10759, moonCount:274, fromEarth:1284.4,
    visMoons:[{ name:'Titan', size:0.38, dist:10.4, period:15.9, diamKm:5150, distKm:1221870, tex:()=>fbSolid('#d2a45a','#b58238',10)() }],
    info:'Sein Ringsystem aus Eis- und Gesteinsbrocken ist über 270.000 km breit, aber nur Meter dick – mit der Cassini-Teilung als Lücke. Wirft echte Schatten!',
    distSun:'1.434 Mio. km (9,58 AE)', orbit:'29,5 Jahre', rot:'10 h 42 min', diam:'116.460 km',
    moons:'274 bekannte (Rekord!) – die größten: Titan, Rhea, Iapetus, Enceladus, Mimas' },
  { name:'Uranus', ord:'7. Planet', visSize:2.4, tex:()=>loadTex(TEX+'uranusmap.jpg',fallbacks.uranus), faintRing:true, atmosphere:0x9adfe8, atmoI:0.75, atmoR:1.12,
    rotPeriod:0.72, tilt:97.8, diamKm:50724, g:8.87, temp:-195, dayH:17.24, yearD:30687, moonCount:29, fromEarth:2721.4,
    info:'Der seitlich gekippte Eisriese: Achse um 97,8° geneigt, rollt quasi liegend um die Sonne. Methan färbt ihn blaugrün.',
    distSun:'2.871 Mio. km (19,2 AE)', orbit:'84 Jahre', rot:'17 h 14 min ⟲', diam:'50.724 km',
    moons:'29 bekannte – die größten: Titania, Oberon, Umbriel, Ariel, Miranda' },
  { name:'Neptun', ord:'8. Planet', visSize:2.3, tex:()=>loadTex(TEX+'neptunemap.jpg',fallbacks.neptune), atmosphere:0x5a86ff, atmoI:0.85, atmoR:1.12,
    rotPeriod:0.67, tilt:28.3, diamKm:49244, g:11.15, temp:-200, dayH:16.11, yearD:60190, moonCount:16, fromEarth:4345.4,
    info:'Der äußerste Planet: tiefblau durch Methan, mit den schnellsten Winden des Sonnensystems (bis 2.100 km/h).',
    distSun:'4.495 Mio. km (30,1 AE)', orbit:'165 Jahre', rot:'16 h 7 min', diam:'49.244 km',
    moons:'16 bekannte – der größte: Triton (umkreist Neptun rückwärts), dazu Proteus & Nereid' },
  // ---- Zwergplaneten ----
  { name:'Pluto', ord:'Zwergplanet (Kuipergürtel)', dwarf:true, visSize:0.55, tex:()=>loadTex(TEX+'plutomap1k.jpg',fallbacks.pluto),
    rotPeriod:6.39, tilt:119.6, diamKm:2377, g:0.62, temp:-230, dayH:153.3, yearD:90560, moonCount:5, fromEarth:5756.4,
    info:'Bis 2006 der 9. Planet. Seine stark geneigte (17°), exzentrische Bahn kreuzt zeitweise die Neptunbahn. Herzförmige Stickstoff-Eisebene Sputnik Planitia.',
    distSun:'5.906 Mio. km (39,5 AE)', orbit:'248 Jahre', rot:'6,4 Tage ⟲', diam:'2.377 km', moons:'5 – Charon, Styx, Nix, Kerberos, Hydra' },
  { name:'Ceres', ord:'Zwergplanet (Asteroidengürtel)', dwarf:true, visSize:0.35, tex:()=>fallbacks.rock(),
    rotPeriod:0.378, tilt:4, diamKm:940, g:0.28, temp:-105, dayH:9.07, yearD:1680, moonCount:0, fromEarth:264.4,
    info:'Der größte Körper im Asteroidengürtel und der einzige Zwergplanet im inneren Sonnensystem. Enthält vermutlich viel Wassereis.',
    distSun:'414 Mio. km (2,77 AE)', orbit:'4,6 Jahre', rot:'9 h', diam:'940 km', moons:'keine' },
  { name:'Haumea', ord:'Zwergplanet (Kuipergürtel)', dwarf:true, visSize:0.5, elong:true, elongScale:[1.5, 0.66, 0.92], tex:()=>fallbacks.ice(),
    rotPeriod:0.163, tilt:35, tiltLabel:'≈ stark geneigt', diamKm:1632, g:0.4, temp:-240, dayH:3.92, yearD:103730, moonCount:2, fromEarth:6300,
    info:'Rotiert so schnell (3,9 h – Rekord!), dass er zu einem Ei verformt ist. Hat sogar einen eigenen Ring.',
    distSun:'6.450 Mio. km (43,1 AE)', orbit:'284 Jahre', rot:'3,9 Stunden', diam:'≈ 1.632 km', moons:'2 – Hiʻiaka & Namaka' },
  { name:'Makemake', ord:'Zwergplanet (Kuipergürtel)', dwarf:true, visSize:0.4, tex:()=>fbSolid('#c49a78','#9a7456',20)(),
    rotPeriod:0.95, tilt:0, tiltLabel:'unbekannt', diamKm:1430, g:0.5, temp:-240, dayH:22.83, yearD:111800, moonCount:1, fromEarth:6700,
    info:'Rötlicher Eiszwerg im Kuipergürtel, bedeckt mit gefrorenem Methan. Entdeckt 2005, kurz nach Ostern – daher intern „Easterbunny“ genannt.',
    distSun:'6.850 Mio. km (45,8 AE)', orbit:'306 Jahre', rot:'22,8 Stunden', diam:'≈ 1.430 km', moons:'1 – MK2' },
  { name:'Eris', ord:'Zwergplanet (Streuscheibe)', dwarf:true, visSize:0.5, tex:()=>fallbacks.ice(),
    rotPeriod:1.08, tilt:78, diamKm:2326, g:0.82, temp:-240, dayH:25.9, yearD:204200, moonCount:1, fromEarth:10000,
    info:'Fast so groß wie Pluto und massereicher – ihre Entdeckung 2005 löste die Debatte aus, die Pluto den Planetenstatus kostete. Extrem geneigte Bahn (44°!).',
    distSun:'10.139 Mio. km (67,8 AE)', orbit:'559 Jahre', rot:'25,9 Stunden', diam:'2.326 km', moons:'1 – Dysnomia' }
];

