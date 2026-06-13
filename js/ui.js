/* ui.js — Bedienung: Kamera, Auswahl, Werkzeuge, Modals, Jahreszeiten, Audio
   Klassisches Script (kein ES-Modul): alle Top-Level-Deklarationen teilen sich
   einen gemeinsamen globalen Scope. Ladereihenfolge: siehe index.html. */

// ============================================================
//  Mondphase (synodischer Monat, Referenz-Neumond 6.1.2000)
// ============================================================
const SYNODIC = 29.530588853;
const NEWMOON0 = Date.UTC(2000, 0, 6, 18, 14);
function moonAge(ms){
  let a = ((ms - NEWMOON0) / 86400000) % SYNODIC;
  if (a < 0) a += SYNODIC;
  return a;
}
function moonPhaseInfo(ms){
  const a = moonAge(ms);
  const ill = Math.round((1 - Math.cos(a / SYNODIC * 2 * Math.PI)) / 2 * 100);
  const idx = Math.round(a / SYNODIC * 8) % 8;
  const em = ['🌑','🌒','🌓','🌔','🌕','🌖','🌗','🌘'][idx];
  const nm = MOON_PHASES[lang==='en'?'en':'de'][idx];
  return { age:a, ill, em, nm };
}

// ============================================================
//  Zeit & Positionen
// ============================================================
let simDate = Date.now();
let timeMachine = false;
const YEAR_MS = 365.25*86400000;
function centuries(ms){ return (ms - J2000) / CTY_MS; }

const tmpAU = new THREE.Vector3();
function placeBodies(){
  const T = centuries(simDate);
  BODIES.forEach(p => {
    const v = helioAU(p.el, T);
    p.rAU = v.length();
    mapAU(v, tmpAU);
    p.holder.position.copy(tmpAU);
  });
  // Halley
  const hv = helioAU(halley.el, T);
  halley.rAU = hv.length();
  mapAU(hv, tmpAU);
  halley.holder.position.copy(tmpAU);
  // Schweif: zeigt von der Sonne weg, Länge ~ Sonnennähe
  const dir = tmpAU.clone().normalize();
  const L = Math.max(0, Math.min(26, 16/Math.max(halley.rAU,0.3) - 0.4));
  halley.tail.visible = L > 0.6 && scaleMix < 0.7 && halley.holder.visible;
  halley.coma.material.opacity = Math.min(0.9, 1.6/Math.max(halley.rAU,0.4));
  if (halley.tail.visible){
    halley.tail.scale.set(Math.min(2,L*0.14)+0.3, L, Math.min(2,L*0.14)+0.3);
    halley.tail.position.copy(halley.holder.position).add(dir.clone().multiplyScalar(L/2));
    halley.tail.quaternion.setFromUnitVectors(new THREE.Vector3(0,-1,0), dir);
  }
}
function rebuildOrbitLines(){
  const all = BODIES.map(p => ({el:p.el, line:p.orbitLine})).concat([{el:halley.el, line:halley.line}]);
  all.forEach(o => {
    const pts = [];
    for (let i=0;i<=180;i++){
      const E = i/180*Math.PI*2;
      const v = planeToEcl(o.el, o.el.a*(Math.cos(E)-o.el.e), o.el.a*Math.sqrt(1-o.el.e*o.el.e)*Math.sin(E));
      pts.push(mapAU(v));
    }
    o.line.geometry.dispose();
    o.line.geometry = new THREE.BufferGeometry().setFromPoints(pts);
  });
}
function sizeNow(p){ return p.visSize + (p.realSize - p.visSize)*scaleMix; }
function updateBodyScales(){
  BODIES.forEach(p => {
    const s = sizeNow(p)/p.visSize;
    p.tiltGroup.scale.setScalar(s);
    const sz = sizeNow(p);
    const ls = Math.max(1.4, Math.min(p.dwarf?10:14, sz*5+2.5));
    p.label.scale.set(ls, ls/4, 1);
    p.label.position.y = sz + ls/4 + 0.3;
    if (p.moonObjs) p.moonObjs.forEach(mo => {
      const realD = Math.max(REAL_AU*mo.def.distKm/1.496e8, p.realSize*2.0 + 0.1);
      mo.moon.position.x = mo.def.dist + (realD - mo.def.dist)*scaleMix;
      // Monde: echte Größe, aber sichtbar klein gehalten (max. ~1/8 des Planeten, min. 0,008)
      const realS = Math.max(SUN_R * mo.def.diamKm / SUN_DIAM, p.realSize * 0.12, 0.008);
      mo.moon.scale.setScalar(1 + (realS/mo.def.size - 1)*scaleMix);
    });
  });
}

// ============================================================
//  Kamera (weich) + Eingabe
// ============================================================
let camDistGoal = 130, camDist = 130, camTheta = Math.PI/4, camPhi = Math.PI/3.2;
let followTarget = null, lastFollow = null, camSnapped = false;
const camTargetCur = new THREE.Vector3();
const camTargetGoal = new THREE.Vector3();
function updateCamera(dt){
  camPhi = Math.max(0.12, Math.min(Math.PI-0.12, camPhi));
  const maxD = 200000000; // bis hinaus zum kosmischen Netz
  camDistGoal = Math.max(0.08, Math.min(maxD, camDistGoal));
  camDist += (camDistGoal - camDist) * Math.min(1, dt*4);
  // Clipping-Ebenen dynamisch: nah heranzoomen UND ganze Galaxie sehen
  camera.near = Math.max(0.05, Math.min(60, camDist*0.0015));
  camera.far = Math.max(90000, camDist*6);
  camera.updateProjectionMatrix();
  // Während der Weltraumreise (Kino-Phasen) setzt journeyFrame die Kamera selbst
  if (journey && journey.cinema){
    camTargetCur.copy(journey.lookPt);
    return;
  }
  if (followTarget) followTarget.getWorldPosition(camTargetGoal); else camTargetGoal.set(0,0,0);
  // Wechsel des Verfolgungsziels → Einrasten zurücksetzen
  if (followTarget !== lastFollow){ camSnapped = false; lastFollow = followTarget; }
  if (followTarget){
    const gap = camTargetCur.distanceTo(camTargetGoal);
    // Anflug weich; sobald nah genug: hart einrasten, damit die Kamera
    // dem Planeten auch bei hoher Bahngeschwindigkeit exakt folgt
    if (camSnapped || gap < Math.max(0.4, camDist)){
      camSnapped = true;
      camTargetCur.copy(camTargetGoal);
    } else {
      camTargetCur.lerp(camTargetGoal, Math.min(1, dt*6));
    }
  } else {
    camSnapped = false;
    camTargetCur.lerp(camTargetGoal, Math.min(1, dt*5));
  }
  camera.position.set(
    camTargetCur.x + camDist*Math.sin(camPhi)*Math.cos(camTheta),
    camTargetCur.y + camDist*Math.cos(camPhi),
    camTargetCur.z + camDist*Math.sin(camPhi)*Math.sin(camTheta)
  );
  camera.lookAt(camTargetCur);
}
const el = renderer.domElement;
let dragging=false, px=0, py=0, downX=0, downY=0;
el.addEventListener('pointerdown', e => { dragging=true; px=downX=e.clientX; py=downY=e.clientY; });
addEventListener('pointerup', () => dragging=false);
addEventListener('pointermove', e => {
  if(!dragging) return;
  camTheta += (e.clientX-px)*0.005; camPhi -= (e.clientY-py)*0.005;
  px=e.clientX; py=e.clientY;
});
el.addEventListener('wheel', e => { e.preventDefault(); camDistGoal *= (1+Math.sign(e.deltaY)*0.1); }, { passive:false });
let pinchD=0;
el.addEventListener('touchstart', e => { if(e.touches.length===2) pinchD=Math.hypot(e.touches[0].clientX-e.touches[1].clientX, e.touches[0].clientY-e.touches[1].clientY); }, {passive:true});
el.addEventListener('touchmove', e => {
  if(e.touches.length===2){ const d=Math.hypot(e.touches[0].clientX-e.touches[1].clientX, e.touches[0].clientY-e.touches[1].clientY); camDistGoal*=pinchD/d; pinchD=d; dragging=false; }
}, {passive:true});

const raycaster = new THREE.Raycaster();
const mouseV = new THREE.Vector2();
function pick(e){
  mouseV.x = (e.clientX/innerWidth)*2-1; mouseV.y = -(e.clientY/innerHeight)*2+1;
  raycaster.setFromCamera(mouseV, camera);
  const hits = raycaster.intersectObjects(allMeshes).filter(h => isWorldVisible(h.object));
  return hits.length ? hits[0].object : null;
}
el.addEventListener('pointerup', e => {
  if (Math.hypot(e.clientX-downX, e.clientY-downY) > 6) return;
  const hit = pick(e);
  if (hit) selectBody(hit);
});
el.addEventListener('dblclick', e => { const hit = pick(e); if (hit) selectBody(hit); });

// ============================================================
//  Auswahl & Info
// ============================================================
let selectedObj = null;
function desiredCamDist(d){
  if (d.isSun) return Math.max(40, SUN_R*6);
  const sz = d.visSize + ((d.realSize || d.visSize) - d.visSize) * scaleMix;
  // Im realen Maßstab etwas weiter raus (12 statt 7 Radien), damit man Kontext sieht
  return Math.max(0.12, sz * (7 + 5*scaleMix));
}
function flyTo(obj){
  const d = obj.userData;
  selectedObj = obj;
  followTarget = d.isSun ? null : (d.holder || obj.parent);
  camDistGoal = desiredCamDist(d);
}
function selectBody(obj, quiet){
  const d = obj.userData;
  stopJourney();
  if (!quiet) Audio2.select();
  if (voyagerPlayback && d.name !== voyagerPlayback.def.name) voyagerPlayback = null;
  if (d.isProbe){
    document.getElementById('probes').checked = true;
    if ($('planetsOnly').checked) $('planetsOnly').checked = false;
    applyVisibility();
    updateProbesFrame();
  }
  if (!quiet) flyTo(obj); else selectedObj = obj;
  document.getElementById('info-ord').textContent = bf(d, 'ord') || '';
  document.getElementById('info-name').textContent = dn(d.name);
  document.getElementById('info-text').textContent = bf(d, 'info');
  document.getElementById('info-dist').textContent = bf(d, 'distSun');
  document.getElementById('info-orbit').textContent = bf(d, 'orbit');
  document.getElementById('info-rot').textContent = bf(d, 'rot');
  document.getElementById('info-tilt').textContent = bf(d, 'tiltLabel') || ((d.tilt!==undefined? numL(d.tilt):'–') + '°');
  document.getElementById('info-diam').textContent = bf(d, 'diam');
  document.getElementById('info-moons').textContent = bf(d, 'moons');
  // Foto (z. B. Golden Record)
  const img = document.getElementById('info-img'), cap = document.getElementById('info-imgcap');
  if (d.photo){
    img.src = d.photo; img.style.display = 'block';
    img.onerror = () => { img.style.display = 'none'; cap.style.display = 'none'; };
    cap.textContent = d.photoCaption || ''; cap.style.display = 'block';
  } else {
    img.style.display = 'none'; cap.style.display = 'none'; img.removeAttribute('src');
  }
  // Aktionen & Live-Daten für Sonden
  const act = document.getElementById('info-actions');
  act.innerHTML = '';
  if (d.isProbe){
    const pr = probes[d.probeIdx];
    document.getElementById('info-dist').textContent = '~' + Math.round(pr.curAU) + (lang==='en'?' AU (':' AE (') + dec((pr.curAU*0.1496).toFixed(1)) + (lang==='en'?' bn km)':' Mrd. km)');
    const b = document.createElement('div');
    b.className = 'btn'; b.textContent = t('voyager_play');
    b.onclick = () => startVoyagerFlight(d.probeIdx);
    act.appendChild(b);
  }
  document.getElementById('info').style.display = 'block';
  document.querySelectorAll('.chip').forEach(c => c.classList.toggle('active', c.dataset.name === d.name));
}
function goHome(){
  stopJourney();
  Audio2.whoosh();
  hideInfo();
  voyagerPlayback = null;
  followTarget = null;
  camTheta = Math.PI/4; camPhi = Math.PI/3.2;
  camDistGoal = 130 + (5200 - 130) * scaleMix;
  toast(t('home'));
}
function hideInfo(){
  document.getElementById('info').style.display = 'none';
  voyagerPlayback = null;
  followTarget = null;
  selectedObj = null;
  document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
}
window.hideInfo = hideInfo;

// Chips
const panel = document.getElementById('panel');
const chipDefs = [{name:'Sonne', mesh:()=>sun, dwarf:false}]
  .concat(BODIES.map(p => ({name:p.name, mesh:()=>p.mesh, dwarf:!!p.dwarf})))
  .concat([{name:'Halley', mesh:()=>halley.mesh, dwarf:true},
           {name:'Voyager 1', mesh:()=>probes[0].click, dwarf:true},
           {name:'Voyager 2', mesh:()=>probes[1].click, dwarf:true},
           {name:'ISS', mesh:()=>issAnchor.userData.click, dwarf:true},
           {name:'Hubble', mesh:()=>hubAnchor.userData.click, dwarf:true},
           {name:'JWST', mesh:()=>jwstAnchor.userData.click, dwarf:true}]);
chipDefs.forEach(item => {
  const b = document.createElement('div');
  b.className = 'chip' + (item.dwarf ? ' dwarf' : '');
  const nameMap = { 'Halley':'Halleyscher Komet', 'Hubble':'Hubble-Weltraumteleskop', 'JWST':'James-Webb-Teleskop' };
  b.dataset.disp = item.name; b.textContent = dn(item.name); b.dataset.name = nameMap[item.name] || item.name;
  b.onclick = () => selectBody(item.mesh());
  panel.appendChild(b);
});

// ============================================================
//  UI: Toggles & Buttons
// ============================================================
const $ = id => document.getElementById(id);
const speedSlider = $('speed');
// Kubische Kennlinie: unten sehr fein (schöne langsame Tempi), oben bis ×5 Zeitraffer
function effSpeed(){ return 5 * Math.pow(parseFloat(speedSlider.value), 3); }
function updateSpeedLabel(){
  const s = effSpeed();
  $('speedVal').textContent = '×' + dec(s < 0.1 ? s.toFixed(2) : s.toFixed(1));
}
speedSlider.addEventListener('input', updateSpeedLabel);
updateSpeedLabel();
function isWorldVisible(o){ while (o){ if (!o.visible) return false; o = o.parent; } return true; }
const DWARF_CHIPS = ['Pluto','Ceres','Haumea','Makemake','Eris','Halleyscher Komet'];
const SAT_CHIPS = ['ISS','Hubble-Weltraumteleskop','James-Webb-Teleskop'];
function applyVisibility(){
  const only = $('planetsOnly').checked;
  const showDwarfs = !only && $('dwarfs').checked;
  const showSats   = !only && $('sats').checked;
  const showProbes = !only && $('probes').checked;
  const showBelts  = !only && $('belts').checked;
  const orbitsOn   = $('orbits').checked;
  BODIES.forEach(p => {
    const v = p.dwarf ? showDwarfs : true;
    p.holder.visible = v;
    p.orbitLine.visible = orbitsOn && v;
  });
  halley.holder.visible = showDwarfs;
  halley.line.visible = orbitsOn && showDwarfs;
  if (!showDwarfs) halley.tail.visible = false;
  satsEnabled = showSats;
  issPivot.visible = hubPivot.visible = jwstAnchor.visible = showSats;
  probesGroup.visible = showProbes;
  beltMain.visible = beltKuiper.visible = showBelts;
  document.querySelectorAll('.chip').forEach(c => {
    const n = c.dataset.name;
    const hide = (DWARF_CHIPS.includes(n) && !showDwarfs)
              || (SAT_CHIPS.includes(n) && !showSats)
              || ((n === 'Voyager 1' || n === 'Voyager 2') && !showProbes);
    c.style.display = hide ? 'none' : '';
  });
  // Falls das verfolgte Objekt gerade ausgeblendet wurde: zurück zur Übersicht
  if (followTarget && !isWorldVisible(followTarget)) hideInfo();
}
['orbits','labels','axes','belts','dwarfs','sats','probes','constellations','planetsOnly','shadows','realScale'].forEach(id => {
  const elx = document.getElementById(id);
  if (elx) elx.addEventListener('change', () => Audio2.toggle());
});
$('orbits').addEventListener('change', applyVisibility);
$('labels').addEventListener('change', e => labelSprites.forEach(l => l.visible = e.target.checked));
$('axes').addEventListener('change', e => axisLines.forEach(l => l.visible = e.target.checked));
$('belts').addEventListener('change', applyVisibility);
$('dwarfs').addEventListener('change', applyVisibility);
$('sats').addEventListener('change', applyVisibility);
$('probes').addEventListener('change', applyVisibility);
$('planetsOnly').addEventListener('change', e => {
  applyVisibility();
  if (e.target.checked) toast(t('planetsOnly_on'));
});
$('constellations').addEventListener('change', e => constGroup.visible = e.target.checked);
applyVisibility();
$('shadows').checked = innerWidth > 700;
function applyShadows(){ sunLight.castShadow = $('shadows').checked && scaleMix < 0.5; }
$('shadows').addEventListener('change', applyShadows);
$('realScale').addEventListener('change', e => {
  if (e.target.checked) stopJourney();
  scaleTarget = e.target.checked ? 1 : 0;
  if (e.target.checked) toast(t('realScale_on'));
});
$('gear').addEventListener('click', () => $('controls').classList.toggle('show'));
$('homeBtn').addEventListener('click', goHome);
$('musicBtn').addEventListener('click', () => {
  const on = Audio2.toggleMusic();
  $('musicBtn').textContent = on ? '🔊' : '🔇';
  $('musicBtn').classList.toggle('on', on);
  if (on) toast(t('music_on'));
});
$('sfx').addEventListener('change', e => { Audio2.setSfx(e.target.checked); if (e.target.checked) Audio2.toggle(); });
function toast(msg, ms){
  const t = $('toast'); t.textContent = msg; t.style.display = 'block';
  clearTimeout(t._h); t._h = setTimeout(() => t.style.display='none', ms || 4200);
}

// Screenshot & Vollbild
$('btnShot').addEventListener('click', () => {
  Audio2.toggle();
  renderer.render(scene, camera);
  const a = document.createElement('a');
  a.download = 'sonnensystem.png';
  a.href = renderer.domElement.toDataURL('image/png');
  a.click();
  toast(t('screenshot'));
});
$('btnFull').addEventListener('click', () => {
  if (document.fullscreenElement) document.exitFullscreen();
  else document.documentElement.requestFullscreen();
});

// ============================================================
//  Zeitmaschine
// ============================================================
let tmBase = Date.now();
function fmtDate(ms){ return new Date(ms).toLocaleDateString(locale(), { day:'numeric', month:'long', year:'numeric' }); }
function syncTM(){
  $('tmLabel').textContent = '📅 ' + fmtDate(simDate);
  const mp = moonPhaseInfo(simDate);
  $('moonPhase').textContent = mp.em + ' ' + mp.nm + ' (' + mp.ill + (lang==='en'?'% ':' % ') + t('illuminated') + ')';
  const d = new Date(simDate);
  try { $('tmDate').value = d.toISOString().slice(0,10); } catch(e) {}
  $('subtitle').textContent = timeMachine ? (t('subtitle_sim') + fmtDate(simDate)) : t('subtitle_default');
}
$('btnTime').addEventListener('click', () => {
  stopSeasons();
  timeMachine = !timeMachine;
  $('timePanel').style.display = timeMachine ? 'block' : 'none';
  $('btnTime').classList.toggle('activeBtn', timeMachine);
  if (timeMachine){ tmBase = simDate; $('tmSlider').value = 0; syncTM(); }
  else closeTimeMachine();
});
function closeTimeMachine(){
  timeMachine = false;
  $('timePanel').style.display = 'none';
  $('btnTime').classList.remove('activeBtn');
  syncTM();
}
window.closeTimeMachine = closeTimeMachine;
$('tmSlider').addEventListener('input', e => { simDate = tmBase + parseInt(e.target.value)*86400000; syncTM(); });
$('tmDate').addEventListener('change', e => {
  const v = e.target.value; if (!v) return;
  simDate = new Date(v + 'T12:00:00Z').getTime();
  tmBase = simDate; $('tmSlider').value = 0; syncTM();
});
$('tmToday').addEventListener('click', () => { simDate = Date.now(); tmBase = simDate; $('tmSlider').value = 0; syncTM(); });

// ============================================================
//  Lichtstrahl-Demo
// ============================================================
let photon = null;
const LIGHT_MIN_PER_AU = 8.317; // Minuten Lichtlaufzeit pro AE
$('btnPhoton').addEventListener('click', () => photon ? stopPhoton() : startPhoton());
function startPhoton(){
  const earth = BODIES.find(b => b.name === 'Erde');
  const dir = earth.holder.position.clone().normalize();
  photon = { au: 0.05, dir, crossed: {} , sprite: glowSprite('rgba(255,255,180,1)','rgba(255,230,120,0.4)', 1.4) };
  scene.add(photon.sprite);
  $('photonLog').style.display = 'block';
  $('photonEvents').innerHTML = '';
  $('btnPhoton').classList.add('activeBtn');
}
function stopPhoton(){
  if (photon){ scene.remove(photon.sprite); photon = null; }
  $('photonLog').style.display = 'none';
  $('btnPhoton').classList.remove('activeBtn');
}
window.stopPhoton = stopPhoton;
function fmtLightTime(min){
  if (min < 1) return Math.round(min*60) + ' s';
  if (min < 90) return dec(min.toFixed(1)) + ' min';
  return dec((min/60).toFixed(1)) + ' h';
}
function updatePhoton(dt){
  if (!photon) return;
  photon.au += dt * 0.8; // Demo-Tempo: 0,8 AE pro Sekunde
  const v = photon.dir.clone().multiplyScalar(photon.au);
  mapAU(v, tmpAU);
  photon.sprite.position.copy(tmpAU);
  $('photonTime').textContent = t('photon_time') + fmtLightTime(photon.au * LIGHT_MIN_PER_AU);
  BODIES.filter(b => !b.dwarf || b.name === 'Pluto').forEach(b => {
    const orbAU = b.el.a;
    if (!photon.crossed[b.name] && photon.au >= orbAU){
      photon.crossed[b.name] = true;
      const div = document.createElement('div');
      div.textContent = t('photon_orbit_a') + dn(b.name) + t('photon_orbit_b') + fmtLightTime(orbAU * LIGHT_MIN_PER_AU);
      $('photonEvents').appendChild(div);
    }
  });
  if (photon.au > 44) stopPhoton();
}

// ============================================================
//  Geführte Tour
// ============================================================
let tourState = null;
const TOUR_ORDER = ['Sonne','Merkur','Venus','Erde','Mars','Ceres','Jupiter','Saturn','Uranus','Neptun','Pluto','Halleyscher Komet'];
$('btnTour').addEventListener('click', () => tourState ? stopTour() : startTour());
function meshByName(n){
  if (n === 'Sonne') return sun;
  if (n === 'Halleyscher Komet') return halley.mesh;
  const b = BODIES.find(x => x.name === n);
  return b ? b.mesh : null;
}
function startTour(){
  stopJourney();
  voyagerPlayback = null;
  Audio2.whoosh();
  tourState = { i: 0 };
  $('tourPanel').style.display = 'block';
  $('btnTour').classList.add('activeBtn');
  tourStep();
}
function tourStep(){
  if (!tourState) return;
  while (tourState.i < TOUR_ORDER.length){
    const m = meshByName(TOUR_ORDER[tourState.i]);
    const h = (m.userData && m.userData.holder) || m;
    if (isWorldVisible(h)) break;
    tourState.i++;
  }
  if (tourState.i >= TOUR_ORDER.length){ stopTour(); toast(t('tour_end')); return; }
  const name = TOUR_ORDER[tourState.i];
  selectBody(meshByName(name));
  $('tourStatus').textContent = t('tour_station') + (tourState.i+1) + t('tour_of') + TOUR_ORDER.length + ': ' + dn(name);
  tourState.i++;
  tourState.timer = setTimeout(tourStep, 9000);
}
function stopTour(){
  if (tourState && tourState.timer) clearTimeout(tourState.timer);
  tourState = null;
  $('tourPanel').style.display = 'none';
  $('btnTour').classList.remove('activeBtn');
}
window.stopTour = stopTour;

// ============================================================
//  Weltraumreise: filmische Kamerafahrt in Endlos-Schleife
// ============================================================
// ============================================================
//  Weltraumreise: durchgehender Flug mit Kurven um die Planeten
// ============================================================
const JOURNEY_BODIES = [
  { name:'Merkur',  R:4.5,  h:0.26 },
  { name:'Venus',   R:6.2,  h:0.22 },
  { name:'Erde',    R:5.6,  h:0.30 },
  { name:'Mars',    R:4.6,  h:0.26 },
  { name:'Jupiter', R:15.5, h:0.20 },
  { name:'Saturn',  R:14.5, h:0.40 }, // höher: Blick über die Ringe
  { name:'Uranus',  R:9.5,  h:0.24 },
  { name:'Neptun',  R:8.8,  h:0.26 }
];
let journey = null;
const JV = { A:new THREE.Vector3(), B:new THREE.Vector3(), P1:new THREE.Vector3(),
             D:new THREE.Vector3(), S:new THREE.Vector3(), POS:new THREE.Vector3(),
             LOOK:new THREE.Vector3(), UP:new THREE.Vector3(0,1,0) };
function bodyByName2(n){ return BODIES.find(p => p.name === n); }
function easeIO(k){ return k < 0.5 ? 2*k*k : 1 - Math.pow(-2*k + 2, 2) / 2; }
function setJourneyTitle(t, sub){
  const el = $('journeyTitle');
  if (t){ el.innerHTML = t + (sub ? '<small>' + sub + '</small>' : ''); el.classList.add('show'); }
  else el.classList.remove('show');
}
function journeyEnterApproach(idx){
  const j = journey;
  j.mode = 'approach'; j.t = 0; j.dur = 5; j.idx = idx; j.cinema = true;
  j.toBody = bodyByName2(JOURNEY_BODIES[idx].name);
  j.lookStart = j.lookPt.clone(); // Blick nahtlos vom letzten Bild aus weiterführen
  const d = j.toBody.mesh.userData;
  setJourneyTitle(dn(d.name), bf(d, 'ord') || '');
  // Einschwenkwinkel: auf der dem Anflug zugewandten Seite ankommen
  const Bp = j.toBody.holder.position;
  const from = j.fromBody
    ? JV.A.copy(j.fromBody.holder.position).add(j.fromOffset)
    : JV.A.copy(j.fromAbs);
  j.entryAng = Math.atan2(from.z - Bp.z, from.x - Bp.x) + 0.55;
}
function journeyEnterOrbit(){
  const j = journey, def = JOURNEY_BODIES[j.idx];
  j.mode = 'orbit'; j.t = 0; j.dur = 6.5; j.cinema = true;
  j.body = j.toBody; j.R = def.R; j.h = def.h;
  j.ang0 = j.entryAng; j.angSpan = Math.PI * 1.3; // 234°-Kurve um den Planeten
}
function journeyAfterOrbit(){
  const j = journey;
  const angE = j.ang0 + j.angSpan;
  j.fromBody = j.body;
  j.fromOffset = new THREE.Vector3(Math.cos(angE)*j.R, j.h*j.R, Math.sin(angE)*j.R);
  if (j.idx + 1 < JOURNEY_BODIES.length){
    journeyEnterApproach(j.idx + 1);
  } else {
    // Zoom-Finale: Kugel-Koordinaten nahtlos aus aktueller Kameralage übernehmen
    j.mode = 'zoomout'; j.t = 0; j.dur = 16; j.cinema = false;
    const p = camera.position;
    camDist = p.length(); camDistGoal = camDist;
    camPhi = Math.acos(THREE.MathUtils.clamp(p.y / Math.max(camDist, 1e-6), -1, 1));
    camTheta = Math.atan2(p.z, p.x);
    followTarget = null; selectedObj = null;
    j.d0 = Math.max(60, camDist); j.d1 = 55000000;
    setJourneyTitle(t('jt_universe'), t('jt_universe_sub'));
    if (!j.zoomToastShown){
      j.zoomToastShown = true;
      toast(t('journey_zoom'), 6000);
    }
  }
}
function journeyFrame(dt){
  const j = journey;
  j.t += dt;
  if (j.mode === 'approach'){
    const def = JOURNEY_BODIES[j.idx];
    const k = easeIO(Math.min(1, j.t / j.dur));
    const Bp = j.toBody.holder.position;
    const A = j.fromBody
      ? JV.A.copy(j.fromBody.holder.position).add(j.fromOffset)
      : JV.A.copy(j.fromAbs);
    const B = JV.B.set(Bp.x + Math.cos(j.entryAng)*def.R, Bp.y + def.h*def.R, Bp.z + Math.sin(j.entryAng)*def.R);
    // geschwungene Bahn: Bézier mit seitlich + nach oben versetztem Kontrollpunkt
    JV.D.copy(B).sub(A);
    const dl = JV.D.length();
    if (dl > 1e-4) JV.S.copy(JV.D).divideScalar(dl).cross(JV.UP);
    else JV.S.set(0, 0, 0);
    JV.P1.copy(A).add(B).multiplyScalar(0.5)
        .addScaledVector(JV.S, dl*0.30)
        .addScaledVector(JV.UP, dl*0.16);
    const u = 1 - k;
    JV.POS.set(0,0,0).addScaledVector(A, u*u).addScaledVector(JV.P1, 2*u*k).addScaledVector(B, k*k);
    // Blick schwenkt kontinuierlich vom letzten Blickpunkt zum neuen Planeten (kein Ruck)
    const m = THREE.MathUtils.smoothstep(k, 0.0, 0.55);
    JV.LOOK.lerpVectors(j.lookStart, Bp, m);
    camera.position.copy(JV.POS);
    camera.lookAt(JV.LOOK);
    j.lookPt.copy(JV.LOOK);
    camDist = camera.position.distanceTo(JV.LOOK); camDistGoal = camDist;
    if (j.t >= j.dur) journeyEnterOrbit();
  } else if (j.mode === 'orbit'){
    const k = Math.min(1, j.t / j.dur);
    const ke = easeIO(k); // Umkreisung sanft beschleunigen und abbremsen → nahtlos zu An-/Abflug
    const ang = j.ang0 + j.angSpan * ke;
    const Bp = j.body.holder.position;
    const sp = Math.sin(k * Math.PI);
    const Rk = j.R * (1 + 0.10 * sp * sp);                                 // ruckfrei (Ableitung 0 an den Enden)
    const y  = j.h * j.R * (1 + 0.28 * (1 - Math.cos(k * Math.PI * 2)));   // weicher Höhenbogen, Start/Ende glatt
    camera.position.set(Bp.x + Math.cos(ang)*Rk, Bp.y + y, Bp.z + Math.sin(ang)*Rk);
    JV.LOOK.copy(Bp);
    // gegen Ende den Blick schon zum nächsten Ziel heben
    if (k > 0.78 && j.idx + 1 < JOURNEY_BODIES.length){
      const nb = bodyByName2(JOURNEY_BODIES[j.idx + 1].name).holder.position;
      JV.LOOK.lerp(nb, (k - 0.78) / 0.22 * 0.4);
    }
    camera.lookAt(JV.LOOK);
    j.lookPt.copy(JV.LOOK);
    camDist = camera.position.distanceTo(Bp); camDistGoal = camDist;
    if (j.t >= j.dur) journeyAfterOrbit();
  } else {
    if (j.mode === 'zoomout' || j.mode === 'zoomin'){
      const k = Math.min(1, j.t / j.dur), e = easeIO(k);
      camDistGoal = j.d0 * Math.pow(j.d1 / j.d0, e);
      camTheta += dt * 0.1;
    } else if (j.mode === 'hold1'){
      // Panorama-Schwenk durchs kosmische Netz: zeigt die schiere Menge an Galaxien
      camTheta += dt * 0.3;
      camPhi += Math.sin(j.t * 0.55) * dt * 0.06;
    }
    if (j.t >= j.dur){
      if (j.mode === 'zoomout'){ j.mode = 'hold1'; j.t = 0; j.dur = 9; setJourneyTitle(t('jt_web'), t('jt_web_sub')); }
      else if (j.mode === 'hold1'){ j.mode = 'zoomin'; j.t = 0; j.dur = 13; j.d0 = camDist; j.d1 = 130; setJourneyTitle(t('jt_back'), ''); }
      else if (j.mode === 'zoomin'){ j.mode = 'hold2'; j.t = 0; j.dur = 1.2; }
      else { // Schleife: neuer Anflug auf Merkur von der aktuellen Position aus
        j.fromBody = null;
        j.fromAbs = camera.position.clone();
        j.lookPt.copy(camTargetCur); // Blick nahtlos von der aktuellen Sicht aus starten
        journeyEnterApproach(0);
      }
    }
  }
}
function startJourney(){
  stopTour(); stopSeasons();
  voyagerPlayback = null;
  hideInfo();
  if (timeMachine) closeTimeMachine();
  if (scaleTarget === 1){ $('realScale').checked = false; scaleTarget = 0; }
  Audio2.whoosh();
  journey = { zoomToastShown:false, fromBody:null, fromAbs:camera.position.clone(), lookPt:new THREE.Vector3(), cinema:false };
  journeyEnterApproach(0);
  followTarget = null; selectedObj = null;
  $('btnJourney').classList.add('activeBtn');
  toast(t('journey_start'), 6500);
}
function stopJourney(){
  if (!journey) return;
  // Kamera-Kugelkoordinaten aus der aktuellen Lage übernehmen → kein Sprung beim Aussteigen
  if (journey.cinema){
    const p = camera.position, rel = p.clone().sub(journey.lookPt);
    camDist = rel.length(); camDistGoal = camDist;
    camPhi = Math.acos(THREE.MathUtils.clamp(rel.y / Math.max(camDist, 1e-6), -1, 1));
    camTheta = Math.atan2(rel.z, rel.x);
    camTargetCur.copy(journey.lookPt);
  }
  journey = null;
  setJourneyTitle(null);
  $('btnJourney').classList.remove('activeBtn');
}
$('btnJourney').addEventListener('click', () => journey ? (stopJourney(), goHome()) : startJourney());

// ============================================================
//  Jahreszeiten-Demo
// ============================================================
const EARTH_TILT = 23.4;
const earthAxisN = new THREE.Vector3(0, Math.cos(EARTH_TILT*DEG), -Math.sin(EARTH_TILT*DEG)); // Nordpol-Richtung (fix im Raum)
function subSolarLat(ms){
  const e = helioAU(EL.Erde, centuries(ms));
  const s = e.clone().negate().normalize(); // Erde → Sonne
  return Math.asin(THREE.MathUtils.clamp(earthAxisN.dot(s), -1, 1)) / DEG;
}
function earthSunAU(ms){ return helioAU(EL.Erde, centuries(ms)).length(); }
// Die vier Ereignisse im kommenden Jahr suchen (robust per Sub-Solar-Breite)
function findSeasonDates(fromMs){
  let maxV=-99,minV=99,maxMs=fromMs,minMs=fromMs;
  const lat=[];
  for (let d=0; d<=370; d++){
    const ms=fromMs+d*86400000, v=subSolarLat(ms);
    lat.push([ms,v]);
    if (v>maxV){maxV=v;maxMs=ms;} if (v<minV){minV=v;minMs=ms;}
  }
  // Nulldurchgänge (Äquinoktien)
  let asc=fromMs, desc=fromMs;
  for (let i=1;i<lat.length;i++){
    if (lat[i-1][1]<0 && lat[i][1]>=0) asc=lat[i][0];   // aufsteigend → Frühling
    if (lat[i-1][1]>0 && lat[i][1]<=0) desc=lat[i][0];  // absteigend → Herbst
  }
  return { spring:asc, summer:maxMs, autumn:desc, winter:minMs };
}
const SEASONS = [
  { key:'spring', emoji:'🌱', name:'Frühlings-Tagundnachtgleiche', short:'Frühling',
    txt:'Die Sonne steht senkrecht über dem Äquator – <b>Tag und Nacht sind weltweit gleich lang</b>, beide Halbkugeln bekommen gleich viel Energie. Auf der Nordhalbkugel beginnt der Frühling: Die Strahlen treffen von nun an täglich steiler auf und die Tage werden länger – es wird stetig wärmer.' },
  { key:'summer', emoji:'☀️', name:'Sommersonnenwende', short:'Sommer',
    txt:'Der Nordpol ist <b>maximal zur Sonne geneigt</b> (23,4°).<br><b>Warum ist es jetzt warm?</b> Zwei Gründe: <b>1) Steile Strahlen</b> – die Sonne steht mittags hoch, ihre Energie konzentriert sich auf eine kleine Fläche (siehe Skizze unten). <b>2) Lange Tage</b> – in Deutschland scheint die Sonne ~17 Stunden, nördlich des Polarkreises sogar 24 Stunden. Viel Energie × viel Zeit = Sommer.<br><b>Wo ist es am wärmsten?</b> Nicht am Pol (dort treffen die Strahlen trotz Dauerlicht flach auf), sondern in den Subtropen und mittleren Breiten. Und: Am heißesten wird es erst Wochen <i>nach</i> der Sonnenwende, weil sich Land und Meer erst aufheizen müssen.' },
  { key:'autumn', emoji:'🍂', name:'Herbst-Tagundnachtgleiche', short:'Herbst',
    txt:'Wieder steht die Sonne senkrecht über dem Äquator, Tag und Nacht sind überall gleich lang. Im Norden sinkt die Mittagssonne nun von Tag zu Tag: <b>flachere Strahlen + kürzere Tage = weniger Energie</b> – es kühlt spürbar ab. Auf der Südhalbkugel beginnt zeitgleich der Frühling.' },
  { key:'winter', emoji:'❄️', name:'Wintersonnenwende', short:'Winter',
    txt:'Der Nordpol ist <b>maximal von der Sonne weggeneigt</b>.<br><b>Warum ist es jetzt kalt?</b> Die Sonne steht selbst mittags tief: <b>1) Flache Strahlen</b> – dieselbe Energie verteilt sich auf eine viel größere Fläche und durchquert mehr Atmosphäre, pro Quadratmeter kommt wenig an (Skizze unten). <b>2) Kurze Tage</b> – in Deutschland nur ~8 Stunden Sonne, nördlich des Polarkreises gar keine (Polarnacht). Wenig Energie × wenig Zeit = Winter.<br><b>Wo merkt man es am stärksten?</b> In mittleren und hohen Breiten. Die <b>Tropen am Äquator merken fast nichts</b> – dort treffen die Strahlen das ganze Jahr steil auf, deshalb gibt es dort keine Temperatur-Jahreszeiten. Die Südhalbkugel hat jetzt Hochsommer.' }
];
const SEASONS_EN = {
  spring:{ name:'Spring equinox', short:'Spring', txt:'The Sun is directly over the equator – <b>day and night are equally long worldwide</b>, both hemispheres receive the same amount of energy. In the Northern Hemisphere spring begins: from now on the rays strike a little more steeply each day and the days grow longer – it keeps getting warmer.' },
  summer:{ name:'Summer solstice', short:'Summer', txt:'The North Pole is <b>tilted maximally toward the Sun</b> (23.4°).<br><b>Why is it warm now?</b> Two reasons: <b>1) Steep rays</b> – at noon the Sun is high, so its energy is concentrated on a small area (see the sketch below). <b>2) Long days</b> – in Germany the Sun shines for ~17 hours, north of the Arctic Circle even 24 hours. Lots of energy × lots of time = summer.<br><b>Where is it hottest?</b> Not at the pole (where the rays hit shallowly despite constant daylight), but in the subtropics and mid-latitudes. And: it gets hottest only weeks <i>after</i> the solstice, because land and sea have to heat up first.' },
  autumn:{ name:'Autumn equinox', short:'Autumn', txt:'Again the Sun stands directly over the equator, day and night are equally long everywhere. In the north the midday Sun now sinks day by day: <b>shallower rays + shorter days = less energy</b> – it cools noticeably. In the Southern Hemisphere spring begins at the same time.' },
  winter:{ name:'Winter solstice', short:'Winter', txt:'The North Pole is <b>tilted maximally away from the Sun</b>.<br><b>Why is it cold now?</b> Even at noon the Sun stays low: <b>1) Shallow rays</b> – the same energy spreads over a much larger area and passes through more atmosphere, so little reaches each square metre (sketch below). <b>2) Short days</b> – in Germany only ~8 hours of Sun, north of the Arctic Circle none at all (polar night). Little energy × little time = winter.<br><b>Where is it felt most?</b> In the mid and high latitudes. The <b>tropics at the equator barely notice it</b> – there the rays strike steeply all year, which is why there are no temperature seasons. The Southern Hemisphere now has high summer.' }
};
const SEG_TEXTS_EN = {
  summer:'🌱→☀️ <b>On the way to summer (north):</b> the blue N arrow tips ever further toward the Sun. As a result the Sun climbs higher in the north each day – <b>steeper rays heat each square metre more strongly</b> – and the days grow longer. Together these push temperatures up week by week. Watch the upper Arctic Circle: it is just moving fully into the light – polar day.',
  autumn:'☀️→🍂 <b>From summer to autumn:</b> the axis keeps pointing in the same direction, but Earth moves on along its orbit – so the north now tilts away again. The midday Sun sinks, <b>the rays strike more shallowly and lose heating power</b>, the days get shorter: it cools down, even though the distance to the Sun barely changes!',
  winter:'🍂→❄️ <b>On the way to winter (north):</b> now the Southern Hemisphere gets the steep rays and long days – summer begins there! In the north the low winter Sun barely clears the horizon: <b>little energy per area + short days = it turns cold.</b> The upper Arctic Circle slides fully into shadow – polar night.',
  spring:'❄️→🌱 <b>From winter to spring:</b> the Sun moves from the south back to the equator. In the north it rises higher each day – <b>the rays strike more steeply again and every day brings more sunshine hours</b>: the air warms up, snow melts, the polar night ends.'
};
function seasonName(i){ return lang==='en' ? SEASONS_EN[SEASONS[i].key].name : SEASONS[i].name; }
function seasonShort(i){ return lang==='en' ? SEASONS_EN[SEASONS[i].key].short : SEASONS[i].short; }
function seasonTxt(i){ return lang==='en' ? SEASONS_EN[SEASONS[i].key].txt : SEASONS[i].txt; }
function segText(key){ return lang==='en' ? (SEG_TEXTS_EN[key]||SEG_TEXTS[key]) : SEG_TEXTS[key]; }
let seasonState = null;
// Bahnmarker + Nordpol-Pfeil (nur in der Demo sichtbar)
const seasonGroup = new THREE.Group(); seasonGroup.visible = false; scene.add(seasonGroup);
const seasonMarkers = SEASONS.map(s => {
  const ring = new THREE.Mesh(new THREE.RingGeometry(1.3, 1.7, 32),
    new THREE.MeshBasicMaterial({ color:0xffd27f, transparent:true, opacity:0.9, side:THREE.DoubleSide, depthWrite:false }));
  ring.rotation.x = Math.PI/2;
  const lbl = makeLabel(s.emoji + ' ' + s.short, false);
  lbl.scale.set(9, 2.25, 1); lbl.position.y = 2.4;
  const g = new THREE.Group(); g.add(ring); g.add(lbl);
  seasonGroup.add(g);
  return { def:s, group:g };
});
// Nordpol-Pfeil auf der Erde
const npArrow = new THREE.Group();
(function(){
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.05,3.4,8),
    new THREE.MeshBasicMaterial({ color:0x6ad0ff }));
  shaft.position.y = 1.7;
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.22,0.5,12),
    new THREE.MeshBasicMaterial({ color:0x6ad0ff }));
  tip.position.y = 3.6;
  const nlbl = makeLabel('N', false); nlbl.scale.set(1.6,1.6,1); nlbl.position.y = 4.3;
  npArrow.add(shaft); npArrow.add(tip); npArrow.add(nlbl);
  npArrow.rotation.x = -EARTH_TILT*DEG; // gleiche feste Neigung wie die Erdachse
  npArrow.visible = false;
  scene.add(npArrow);
})();
function placeSeasonMarkers(){
  if (!seasonState) return;
  SEASONS.forEach((s,i) => {
    const v = helioAU(EL.Erde, centuries(seasonState.dates[s.key]));
    seasonMarkers[i].group.position.copy(mapAU(v));
  });
}
// Breitengrad-Hilfslinien auf der Erde (Äquator, Wendekreise, Polarkreise)
let earthGuides = null;
function buildEarthGuides(){
  if (earthGuides) return;
  earthGuides = new THREE.Group();
  function latCircle(latDeg, color, opacity){
    const r = earthBody.visSize * 1.012, la = latDeg * DEG;
    const rr = Math.cos(la) * r, y = Math.sin(la) * r, pts = [];
    for (let i = 0; i <= 72; i++){
      const a = i / 72 * Math.PI * 2;
      pts.push(new THREE.Vector3(rr * Math.cos(a), y, rr * Math.sin(a)));
    }
    return new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts),
      new THREE.LineBasicMaterial({ color, transparent: true, opacity }));
  }
  earthGuides.add(latCircle(0, 0xffb45a, 0.95));     // Äquator
  earthGuides.add(latCircle(23.4, 0xffe08a, 0.55));  // nördl. Wendekreis
  earthGuides.add(latCircle(-23.4, 0xffe08a, 0.55)); // südl. Wendekreis
  earthGuides.add(latCircle(66.6, 0x8ad8ff, 0.5));   // Polarkreis Nord
  earthGuides.add(latCircle(-66.6, 0x8ad8ff, 0.5));  // Polarkreis Süd
  earthBody.tiltGroup.add(earthGuides);
}
// Live-Erklärungen für die Abschnitte ZWISCHEN den Stationen
const SEG_TEXTS = {
  summer:'🌱→☀️ <b>Auf dem Weg zum Sommer (Nord):</b> Der blaue N-Pfeil kippt der Sonne immer weiter entgegen. Dadurch steht die Sonne im Norden täglich höher – <b>steilere Strahlen heizen pro Quadratmeter stärker</b> – und die Tage werden länger. Beides zusammen lässt die Temperaturen Woche für Woche steigen. Schau auf den oberen Polarkreis: Er wandert gerade ganz ins Licht – Polartag.',
  autumn:'☀️→🍂 <b>Vom Sommer zum Herbst:</b> Die Achse zeigt stur in dieselbe Richtung, aber die Erde wandert auf ihrer Bahn weiter – der Norden neigt sich nun wieder weg. Die Mittagssonne sinkt, <b>die Strahlen treffen flacher auf und verlieren Heizkraft</b>, die Tage werden kürzer: Es kühlt ab, obwohl sich am Sonnenabstand fast nichts ändert!',
  winter:'🍂→❄️ <b>Auf dem Weg zum Winter (Nord):</b> Jetzt bekommt die Südhalbkugel die steilen Strahlen und langen Tage – dort beginnt der Sommer! Im Norden kommt die flache Wintersonne kaum noch über den Horizont: <b>wenig Energie pro Fläche + kurze Tage = es wird kalt.</b> Der obere Polarkreis rutscht ganz in den Schatten – Polarnacht.',
  spring:'❄️→🌱 <b>Vom Winter zum Frühling:</b> Die Sonne wandert vom Süden zurück zum Äquator. Im Norden steigt sie täglich höher – <b>die Strahlen treffen wieder steiler auf und jeder Tag bringt mehr Sonnenstunden</b>: Die Luft erwärmt sich, Schnee schmilzt, die Polarnacht endet.'
};
function highlightSeason(i){
  seasonMarkers.forEach((m,k) => {
    m.group.children[0].material.color.setHex(k===i ? 0x6ad0ff : 0xffd27f);
    m.group.children[0].material.opacity = k===i ? 1 : 0.7;
  });
  Array.from($('seasonBtns').children).forEach((b,k) => {
    if (b.id !== 'seasonPlay') b.classList.toggle('activeBtn', k===i);
  });
}
function showSeasonEvent(i){
  const s = SEASONS[i];
  $('seasonInfo').innerHTML = '<b style="font-size:13px">⏸ ' + s.emoji + ' ' + seasonName(i) + '</b><br>' + seasonTxt(i) + '<br><span style="color:#8a8ab8;font-size:10px">' + t('se_continue') + '</span>';
  highlightSeason(i);
}
function buildSeasonEvents(fromMs){
  const dates = findSeasonDates(fromMs);
  return { dates, evs: SEASONS.map((s,i) => ({ key:s.key, ms:dates[s.key], idx:i })).sort((a,b) => a.ms - b.ms) };
}
function updateSeasonHud(){
  const lat = subSolarLat(simDate), au = earthSunAU(simDate);
  $('ssDate').textContent = '📅 ' + fmtDate(simDate);
  $('ssNeedle').style.left = 'calc(' + ((lat + 23.4) / 46.8 * 100).toFixed(1) + '% - 2px)';
  $('ssHemi').innerHTML = t('se_sun_over') + '<b>' + dec(Math.abs(lat).toFixed(1)) + '° ' + (lat >= 0 ? t('se_north_w') : t('se_south_w')) + '</b>' + t('se_morelight') + '<b>' + (lat > 0.5 ? t('se_nh') : (lat < -0.5 ? t('se_sh') : t('se_equinox'))) + '</b>';
  $('ssAU').textContent = t('se_dist') + dec(au.toFixed(4)) + t('se_au') + (au > 1.008 ? t('se_farther') : (au < 0.992 ? t('se_closer') : ''));
}
function startSeasons(){
  stopJourney();
  voyagerPlayback = null;
  if (timeMachine) closeTimeMachine();
  stopTour();
  Audio2.whoosh();
  buildEarthGuides();
  earthGuides.visible = true;
  const start = Date.now();
  const built = buildSeasonEvents(start);
  seasonState = { dates: built.dates, evs: built.evs, nextEv: 0, playing: true, dwell: 0,
                  endMs: start + YEAR_MS, seg: '', _lastMix: -1 };
  timeMachine = true; // eigene Zeitsteuerung
  simDate = start;
  // UI-Buttons aufbauen
  const wrap = $('seasonBtns'); wrap.innerHTML = '';
  SEASONS.forEach((s,i) => {
    const b = document.createElement('div');
    b.className = 'btn'; b.style.fontSize = '10.5px'; b.textContent = s.emoji + ' ' + seasonShort(i);
    b.onclick = () => gotoSeason(i);
    wrap.appendChild(b);
  });
  const pp = document.createElement('div');
  pp.className = 'btn activeBtn'; pp.id = 'seasonPlay'; pp.style.gridColumn = '1 / 3';
  pp.textContent = t('se_pausebtn');
  pp.onclick = toggleSeasonPlay;
  wrap.appendChild(pp);
  $('seasonPanel').style.display = 'block';
  $('btnSeasons').classList.add('activeBtn');
  $('orbits').checked = true; applyVisibility();
  seasonGroup.visible = true;
  npArrow.visible = true;
  placeSeasonMarkers();
  followTarget = earthBody.holder; selectedObj = earthBody.mesh;
  camDistGoal = 11; camPhi = 1.1;
  $('seasonInfo').innerHTML = t('se_intro');
  toast(t('seasons_start'), 5500);
  syncTM();
}
function toggleSeasonPlay(){
  if (!seasonState) return;
  seasonState.playing = !seasonState.playing;
  const pp = $('seasonPlay');
  pp.textContent = seasonState.playing ? t('se_pausebtn') : t('se_play');
  pp.classList.toggle('activeBtn', seasonState.playing);
  Audio2.toggle();
}
function gotoSeason(i){
  if (!seasonState) return;
  const s = SEASONS[i];
  const ms = seasonState.dates[s.key];
  simDate = ms;
  seasonState.dwell = 6;
  seasonState.seg = '';
  seasonState.nextEv = seasonState.evs.findIndex(e => e.ms > ms + 86400000);
  if (seasonState.nextEv < 0) seasonState.nextEv = seasonState.evs.length;
  seasonState.endMs = ms + YEAR_MS;
  showSeasonEvent(i);
  Audio2.select();
  placeBodies();
  updateSeasonHud();
  syncTM();
}
function seasonOverview(on){
  if (on){ followTarget = null; selectedObj = null; camDistGoal = 95; camPhi = 0.62; camTheta = Math.PI/2; }
  else { followTarget = earthBody.holder; selectedObj = earthBody.mesh; camDistGoal = 11; camPhi = 1.1; }
}
function stopSeasons(){
  if (!seasonState) return;
  seasonState = null;
  timeMachine = false;
  $('seasonPanel').style.display = 'none';
  $('btnSeasons').classList.remove('activeBtn');
  $('seasonOverview').checked = false;
  seasonGroup.visible = false;
  npArrow.visible = false;
  if (earthGuides) earthGuides.visible = false;
  syncTM();
}
window.stopSeasons = stopSeasons;
// ============================================================
//  Modals: Vergleich & Rechner
// ============================================================
function openModal(html){ $('modal-body').innerHTML = html; $('modal').style.display = 'flex'; }
function closeModal(){ $('modal').style.display = 'none'; }
window.closeModal = closeModal;
$('modal').addEventListener('click', e => { if (e.target.id === 'modal') closeModal(); });

const CMP_BODIES = BODIES.filter(b => !b.dwarf || b.name === 'Pluto');
const CMP_METRICS = [
  { key:'diamKm', lkey:'cmp_diam', unit:' km', color:'#8a96ff' },
  { key:'g', lkey:'cmp_g', unit:' m/s²', color:'#7fd0a0' },
  { key:'temp', lkey:'cmp_temp', unit:' °C', color:'#ff9a6e', signed:true },
  { key:'dayH', lkey:'cmp_day', ukey:'cmp_h', color:'#e0c068' },
  { key:'yearD', lkey:'cmp_year', ukey:'cmp_days', color:'#c89aff' },
  { key:'moonCount', lkey:'cmp_moons', unit:'', color:'#9ad0ff' }
];
$('btnCompare').addEventListener('click', () => {
  const opts = n => CMP_BODIES.map(b => `<option value="${b.name}" ${b.name===n?'selected':''}>${dn(b.name)}</option>`).join('');
  openModal(`
    <h3>${t('cmp_title')}</h3>
    <div style="display:flex;gap:10px;align-items:center">
      <select id="cmpA">${opts('Erde')}</select>
      <span style="color:#8a8ab8">vs.</span>
      <select id="cmpB">${opts('Jupiter')}</select>
    </div>
    <div id="cmpOut"></div>`);
  const render = () => {
    const A = CMP_BODIES.find(b => b.name === $('cmpA').value);
    const B = CMP_BODIES.find(b => b.name === $('cmpB').value);
    let html = `<div class="barrow" style="font-weight:600;color:#fff"><span></span><span>${dn(A.name)}</span><span>${dn(B.name)}</span></div>`;
    CMP_METRICS.forEach(m => {
      const va = A[m.key], vb = B[m.key];
      const max = Math.max(Math.abs(va), Math.abs(vb)) || 1;
      const u = m.ukey ? t(m.ukey) : m.unit;
      const fmt = v => numL(v) + u;
      html += `<div class="barrow"><span style="color:#8a8ab8">${t(m.lkey)}</span>
        <div class="bar"><i style="width:${Math.abs(va)/max*100}%;background:${m.color}"></i><span>${fmt(va)}</span></div>
        <div class="bar"><i style="width:${Math.abs(vb)/max*100}%;background:${m.color}99"></i><span>${fmt(vb)}</span></div></div>`;
    });
    const ratio = Math.max(A.diamKm,B.diamKm)/Math.min(A.diamKm,B.diamKm);
    const vol = Math.round(Math.pow(ratio,3));
    const big = A.diamKm>=B.diamKm ? A.name : B.name, small = A.diamKm<B.diamKm ? A.name : B.name;
    const ratioTxt = lang==='en'
      ? `Size ratio: ${ratio.toFixed(1)}× the diameter. ${dn(small)} fits into ${dn(big)} about ${numL(vol)} times (by volume).`
      : `Größenverhältnis: ${dec(ratio.toFixed(1))}-facher Durchmesser. In ${dn(big)} passt ${dn(small)} ca. ${numL(vol)}-mal hinein (Volumen).`;
    html += `<div style="margin-top:12px;font-size:10.5px;color:#8a8ab8">${ratioTxt}</div>`;
    $('cmpOut').innerHTML = html;
  };
  $('cmpA').addEventListener('change', render);
  $('cmpB').addEventListener('change', render);
  render();
});

const WEIGHT_BODIES = [['Sonne',274],['Merkur',3.7],['Venus',8.87],['Erde',9.81],['Mond',1.62],['Mars',3.71],['Jupiter',24.79],['Saturn',10.44],['Uranus',8.87],['Neptun',11.15],['Pluto',0.62]];
$('btnCalc').addEventListener('click', () => {
  openModal(`
    <h3>${t('calc_title')}</h3>
    <div style="font-size:12px;margin-bottom:6px;color:#b8b8d8">${t('calc_weight')}</div>
    <input type="number" id="wIn" value="70" min="1" max="500" style="width:80px">${t('calc_kg')}
    <div id="wOut"></div>
    <h3 style="margin-top:18px">${t('calc_travel')}</h3>
    <select id="tDest">${CMP_BODIES.filter(b=>b.name!=='Erde').map(b=>`<option value="${b.name}" ${b.name==='Mars'?'selected':''}>${dn(b.name)}</option>`).join('')}<option value="Sonne">${dn('Sonne')}</option></select>
    <div id="tOut"></div>`);
  const renderW = () => {
    const w = parseFloat($('wIn').value) || 70;
    $('wOut').innerHTML = '<table class="simple">' + WEIGHT_BODIES.map(([n,g]) =>
      `<tr><td>${dn(n)}</td><td>${numL(w*g/9.81,{maximumFractionDigits:1})} kg</td></tr>`).join('') + '</table>';
  };
  const renderT = () => {
    const name = $('tDest').value;
    const d = name === 'Sonne' ? 149.6 : CMP_BODIES.find(b => b.name === name).fromEarth;
    const km = d * 1e6;
    const fmt = h => { const y = h/8766; if (y >= 1) return numL(y,{maximumFractionDigits:0}) + t('u_years'); const dd = h/24; return dd >= 2 ? Math.round(dd)+t('u_days') : Math.round(h)+t('u_hours'); };
    $('tOut').innerHTML = `<table class="simple">
      <tr><td>${t('calc_dist')}</td><td>${numL(d)}${t('calc_mio')}</td></tr>
      <tr><td>${t('calc_car')}</td><td>${fmt(km/100)}</td></tr>
      <tr><td>${t('calc_plane')}</td><td>${fmt(km/900)}</td></tr>
      <tr><td>${t('calc_probe')}</td><td>${fmt(km/58000)}</td></tr>
      <tr><td>${t('calc_light')}</td><td>${fmtLightTime(km/1.496e8 * LIGHT_MIN_PER_AU * 1)}</td></tr>
    </table>`;
  };
  $('wIn').addEventListener('input', renderW);
  $('tDest').addEventListener('change', renderT);
  renderW(); renderT();
});

// ============================================================
//  Blick von der Erde: Himmel heute + Konjunktions-Finder
// ============================================================
function lonOf(v){ return Math.atan2(-v.z, v.x); }
function geoDirAU(name, T){
  const e = helioAU(EL.Erde, T);
  if (name === 'Sonne') return e.clone().negate().normalize();
  return helioAU(EL[name], T).sub(e).normalize();
}
function findConjunctions(A, B){
  const out = [];
  let prev = 999, prev2 = 999, lastMs = 0;
  for (let d = 0; d <= 365*30; d++){
    const ms = simDate + d*86400000;
    const T = centuries(ms);
    const sep = Math.acos(THREE.MathUtils.clamp(geoDirAU(A,T).dot(geoDirAU(B,T)), -1, 1)) / DEG;
    if (prev < 2.5 && prev <= sep && prev <= prev2 && (ms - lastMs) > 60*86400000){
      out.push({ ms: ms - 86400000, sep: prev });
      lastMs = ms;
      if (out.length >= 3) break;
    }
    prev2 = prev; prev = sep;
  }
  return out;
}
$('btnSeasons').addEventListener('click', () => seasonState ? stopSeasons() : startSeasons());
$('seasonOverview').addEventListener('change', e => seasonOverview(e.target.checked));
$('btnSky').addEventListener('click', () => {
  const T = centuries(simDate);
  const sunD = geoDirAU('Sonne', T);
  const list = ['Merkur','Venus','Mars','Jupiter','Saturn','Uranus','Neptun'];
  let rows = '';
  list.forEach(n => {
    const d2 = geoDirAU(n, T);
    const sep = Math.acos(THREE.MathUtils.clamp(sunD.dot(d2), -1, 1)) / DEG;
    let dl = lonOf(d2) - lonOf(sunD);
    while (dl > Math.PI) dl -= 2*Math.PI;
    while (dl < -Math.PI) dl += 2*Math.PI;
    const outer = n !== 'Merkur' && n !== 'Venus';
    let em, txt;
    if (sep < 12){ em='🚫'; txt=t('sky_invis'); }
    else if (outer && sep > 155){ em='🌟'; txt=t('sky_oppo'); }
    else if (dl > 0){ em='🌆'; txt=t('sky_evening'); }
    else { em='🌅'; txt=t('sky_morning'); }
    const extra = (n==='Uranus'||n==='Neptun') ? t('sky_scope') : '';
    rows += `<tr><td style="white-space:nowrap">${em} ${dn(n)}</td><td style="text-align:left">${Math.round(sep)}${t('sky_fromsun')}${txt}${extra}</td></tr>`;
  });
  const mp = moonPhaseInfo(simDate);
  openModal(`
    <h3>${t('sky_title')}${fmtDate(simDate)}</h3>
    <div style="font-size:12.5px;color:#fff;margin-bottom:6px">${mp.em}${t('sky_moon')}${mp.nm} (${mp.ill}${lang==='en'?'% ':' % '}${t('illuminated')})</div>
    <table class="simple">${rows}</table>
    <div style="font-size:10px;color:#8a8ab8;margin-top:6px">${t('sky_calc')}</div>
    <h3 style="margin-top:18px">${t('sky_conj')}</h3>
    <div style="font-size:11px;color:#8a8ab8;margin-bottom:6px">${t('sky_conj_note')}</div>
    <select id="cjA">${list.map(n=>`<option value="${n}" ${n==='Jupiter'?'selected':''}>${dn(n)}</option>`).join('')}</select>
    <span style="color:#8a8ab8">&amp;</span>
    <select id="cjB">${list.map(n=>`<option value="${n}" ${n==='Saturn'?'selected':''}>${dn(n)}</option>`).join('')}</select>
    <span class="mini" id="cjGo" style="margin-left:6px">${t('sky_search')}</span>
    <div id="cjOut" style="margin-top:9px;font-size:11.5px;line-height:1.7"></div>`);
  $('cjGo').addEventListener('click', () => {
    const A = $('cjA').value, B = $('cjB').value;
    if (A === B){ $('cjOut').textContent = t('sky_pickdiff'); return; }
    $('cjOut').textContent = t('sky_searching');
    setTimeout(() => {
      const found = findConjunctions(A, B);
      $('cjOut').innerHTML = found.length
        ? found.map(f => '✨ ' + fmtDate(f.ms) + t('sky_sep') + dec(f.sep.toFixed(1)) + '°').join('<br>')
        : t('sky_none');
    }, 30);
  });
});

// ============================================================
//  Animation
// ============================================================
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
if (reducedMotion){ speedSlider.value = 0.3; updateSpeedLabel(); }

// ============================================================
//  Audio: prozedural synthetisiert (lizenzfrei, offline, ohne Dateien)
// ============================================================
const Audio2 = (function(){
  let ctx = null, master = null, musicGain = null, sfxGain = null, reverb = null;
  let musicOn = false, sfxOn = true, musicTimer = null, droneNodes = [];
  const PENT = [0, 3, 5, 7, 10]; // Moll-Pentatonik – schwebend, nie dissonant
  function hz(semi){ return 220 * Math.pow(2, semi/12); }
  function ensure(){
    if (ctx) return;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain(); master.gain.value = 0.9; master.connect(ctx.destination);
    // einfacher Faltungshall aus prozeduralem Rauschen
    reverb = ctx.createConvolver();
    const len = ctx.sampleRate * 3.2, buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch=0; ch<2; ch++){
      const d = buf.getChannelData(ch);
      for (let i=0; i<len; i++) d[i] = (Math.random()*2-1) * Math.pow(1 - i/len, 2.6);
    }
    reverb.buffer = buf;
    const revGain = ctx.createGain(); revGain.gain.value = 0.32;
    reverb.connect(revGain); revGain.connect(master);
    musicGain = ctx.createGain(); musicGain.gain.value = 0;
    musicGain.connect(master); musicGain.connect(reverb);
    sfxGain = ctx.createGain(); sfxGain.gain.value = 0.9;
    sfxGain.connect(master); sfxGain.connect(reverb);
  }
  function startDrone(){
    // weicher, atmender Klangteppich: Dreieckswellen ohne Resonanzspitze, leise & langsam pulsierend
    [0, 7].forEach((semi, i) => {
      const o1 = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter();
      o1.type = o2.type = 'triangle';
      o1.frequency.value = hz(semi - 24); o2.frequency.value = hz(semi - 24) * 1.004;
      f.type = 'lowpass'; f.frequency.value = 230; f.Q.value = 0.5; // keine schrille Filterspitze
      g.gain.value = 0.07;
      o1.connect(f); o2.connect(f); f.connect(g); g.connect(musicGain);
      // sehr langsame Filter-Schwebung
      const lfo = ctx.createOscillator(), lfoG = ctx.createGain();
      lfo.frequency.value = 0.025 + i*0.014; lfoG.gain.value = 70;
      lfo.connect(lfoG); lfoG.connect(f.frequency);
      // Atmen: Lautstärke schwillt langsam an und ab, statt konstant zu drücken
      const breath = ctx.createOscillator(), breathG = ctx.createGain();
      breath.frequency.value = 0.045 + i*0.018; breathG.gain.value = 0.028;
      breath.connect(breathG); breathG.connect(g.gain);
      o1.start(); o2.start(); lfo.start(); breath.start();
      droneNodes.push(o1, o2, lfo, breath);
    });
  }
  function scheduleBell(){
    if (!musicOn) return;
    const semi = PENT[Math.floor(Math.random()*PENT.length)] + (Math.random()<0.3?12:0);
    const osc = ctx.createOscillator(), g = ctx.createGain();
    osc.type = 'sine'; osc.frequency.value = hz(semi);
    const t = ctx.currentTime;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.18, t + 0.04);
    g.gain.exponentialRampToValueAtTime(0.0008, t + 3.5);
    osc.connect(g); g.connect(musicGain); g.connect(reverb);
    osc.start(t); osc.stop(t + 3.6);
    // gelegentlich eine Quinte darüber
    if (Math.random() < 0.4){
      const osc2 = ctx.createOscillator(), g2 = ctx.createGain();
      osc2.type = 'sine'; osc2.frequency.value = hz(semi + 7);
      g2.gain.setValueAtTime(0, t); g2.gain.linearRampToValueAtTime(0.09, t + 0.05);
      g2.gain.exponentialRampToValueAtTime(0.0008, t + 3.0);
      osc2.connect(g2); g2.connect(musicGain); g2.connect(reverb);
      osc2.start(t + 0.08); osc2.stop(t + 3.2);
    }
    musicTimer = setTimeout(scheduleBell, 2600 + Math.random()*3400);
  }
  function setMusic(on){
    ensure(); if (ctx.state === 'suspended') ctx.resume();
    musicOn = on;
    if (on){
      if (!droneNodes.length) startDrone();
      musicGain.gain.cancelScheduledValues(ctx.currentTime);
      musicGain.gain.setValueAtTime(musicGain.gain.value, ctx.currentTime);
      musicGain.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 2.5);
      clearTimeout(musicTimer); musicTimer = setTimeout(scheduleBell, 1200);
    } else {
      musicGain.gain.cancelScheduledValues(ctx.currentTime);
      musicGain.gain.setValueAtTime(musicGain.gain.value, ctx.currentTime);
      musicGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.5);
      clearTimeout(musicTimer);
    }
    return musicOn;
  }
  // ---- Klangeffekte ----
  function blip(freq, dur, type, vol, slideTo){
    if (!sfxOn) return;
    ensure(); // Audio-System bei Bedarf selbst starten (Klick ist eine gültige Nutzer-Geste)
    if (ctx.state === 'suspended') ctx.resume();
    const o = ctx.createOscillator(), g = ctx.createGain();
    const t = ctx.currentTime;
    o.type = type || 'sine'; o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol || 0.25, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0006, t + dur);
    o.connect(g); g.connect(sfxGain);
    o.start(t); o.stop(t + dur + 0.02);
  }
  function noiseWhoosh(dur, vol){
    if (!sfxOn) return;
    ensure(); // Audio-System bei Bedarf selbst starten (Klick ist eine gültige Nutzer-Geste)
    if (ctx.state === 'suspended') ctx.resume();
    const len = ctx.sampleRate * dur, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    for (let i=0; i<len; i++) d[i] = (Math.random()*2-1) * Math.pow(1 - i/len, 1.5);
    const src = ctx.createBufferSource(); src.buffer = buf;
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 0.8;
    const t = ctx.currentTime;
    f.frequency.setValueAtTime(300, t); f.frequency.exponentialRampToValueAtTime(2400, t + dur);
    const g = ctx.createGain(); g.gain.value = vol || 0.12;
    src.connect(f); f.connect(g); g.connect(sfxGain);
    src.start(t); src.stop(t + dur);
  }
  function deepSwell(){
    if (!sfxOn) return;
    ensure(); // Audio-System bei Bedarf selbst starten (Klick ist eine gültige Nutzer-Geste)
    if (ctx.state === 'suspended') ctx.resume();
    const t = ctx.currentTime;
    // weicher Weltraum-Klang: Grundton + Quinte + Oktave, sanft anschwellend, im Hall verklingend
    // (Grundton 196 Hz: tief genug für Atmosphäre, hoch genug für Laptop-Lautsprecher)
    [[196, 0.30, 0], [294, 0.16, 0.04], [392, 0.10, 0.08]].forEach(([fq, vol, del]) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(fq * 0.96, t + del);
      o.frequency.exponentialRampToValueAtTime(fq, t + del + 0.35);
      g.gain.setValueAtTime(0, t + del);
      g.gain.linearRampToValueAtTime(vol, t + del + 0.12);
      g.gain.exponentialRampToValueAtTime(0.0008, t + del + 1.6);
      o.connect(g); g.connect(sfxGain); g.connect(reverb);
      o.start(t + del); o.stop(t + del + 1.7);
    });
    // luftiger Hauch obendrauf (gefiltertes Rauschen) für den „Weltraum-Atem“
    const len = ctx.sampleRate * 0.8, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random()*2 - 1) * Math.pow(1 - i/len, 2);
    const src = ctx.createBufferSource(); src.buffer = buf;
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1100; f.Q.value = 0.7;
    const ng = ctx.createGain(); ng.gain.setValueAtTime(0, t);
    ng.gain.linearRampToValueAtTime(0.06, t + 0.1);
    ng.gain.exponentialRampToValueAtTime(0.0008, t + 0.8);
    src.connect(f); f.connect(ng); ng.connect(sfxGain); ng.connect(reverb);
    src.start(t); src.stop(t + 0.85);
  }
  return {
    toggleMusic(){ return setMusic(!musicOn); },
    isMusicOn(){ return musicOn; },
    setSfx(v){ sfxOn = v; },
    select(){ deepSwell(); },                                    // weiches Weltraum-Anschwellen
    toggle(){ blip(330, 0.12, 'triangle', 0.16); },              // kurzer Tick
    whoosh(){ noiseWhoosh(0.7, 0.13); },                         // Kamerafahrt
    galaxyWhoosh(){ noiseWhoosh(2.2, 0.55); },                   // Rauszoomen in Galaxie
    correct(){ blip(659, 0.15, 'sine', 0.2); setTimeout(()=>blip(988, 0.3, 'sine', 0.2), 130); },
    wrong(){ blip(220, 0.35, 'sawtooth', 0.16, 160); },
    cosmic(){ blip(180, 2.2, 'sine', 0.2, 620); setTimeout(()=>blip(270, 1.8, 'sine', 0.13), 180); }
  };
})();
