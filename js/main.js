/* main.js — Animationsschleife, Sprachanwendung (applyLang), Programmstart
   Klassisches Script (kein ES-Modul): alle Top-Level-Deklarationen teilen sich
   einen gemeinsamen globalen Scope. Ladereihenfolge: siehe index.html. */

const clock = new THREE.Clock();
const ROT_BASE = 1.6;
let needGeoRebuild = true;

function animate(){
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  const speed = effSpeed();

  // Maßstabs-Übergang
  if (Math.abs(scaleTarget - scaleMix) > 0.0006){
    scaleMix += (scaleTarget - scaleMix) * Math.min(1, dt*2.2);
    needGeoRebuild = true;
    applyShadows();
    if (selectedObj && followTarget) camDistGoal = desiredCamDist(selectedObj.userData);
  } else if (scaleMix !== scaleTarget){
    scaleMix = scaleTarget; needGeoRebuild = true; applyShadows();
    if (selectedObj && followTarget) camDistGoal = desiredCamDist(selectedObj.userData);
  }
  if (needGeoRebuild){
    rebuildOrbitLines();
    updateBeltPositions();
    updateBodyScales();
    needGeoRebuild = false;
  }

  // Zeit: 1 Erdjahr ≈ 18 s bei Tempo 1 · Voyager-Playback: 2,2 Jahre/s
  if (voyagerPlayback){
    simDate += dt * YEAR_MS * 2.2;
    if (simDate >= Date.now()){
      simDate = Date.now();
      toast('🏁 ' + dn(voyagerPlayback.def.name) + t('voyager_arrived') + Math.round(voyagerPlayback.curAU) + t('voyager_arrived2'));
      voyagerPlayback = null;
    }
    if (Math.random() < 0.1) syncTM();
  } else if (!timeMachine){
    simDate += dt * speed * YEAR_MS / 18;
    if (Math.random() < 0.02) syncTM();
  }
  placeBodies();
  if (probesGroup.visible) updateProbesFrame();
  updateSatellites(dt, speed);
  if (seasonState){
    const sz = sizeNow(earthBody);
    npArrow.position.copy(earthBody.holder.position);
    npArrow.scale.setScalar(Math.max(0.5, sz/1.5));
    if (seasonState._lastMix !== scaleMix){ placeSeasonMarkers(); seasonState._lastMix = scaleMix; }
    if (seasonState.playing){
      if (seasonState.dwell > 0){
        seasonState.dwell -= dt;     // an der Station verweilen
      } else {
        simDate += dt * YEAR_MS / 52; // ein Jahr ≈ 52 Sekunden
        const ev = seasonState.evs[seasonState.nextEv];
        if (ev && simDate >= ev.ms){
          simDate = ev.ms;
          seasonState.dwell = 6;
          seasonState.nextEv++;
          showSeasonEvent(ev.idx);
          Audio2.select();
        } else {
          // Live-Erklärung für den aktuellen Abschnitt
          const next = seasonState.evs[seasonState.nextEv];
          const segKey = next ? next.key : (seasonState.evs[0] ? seasonState.evs[0].key : 'summer');
          if (segKey !== seasonState.seg){
            seasonState.seg = segKey;
            $('seasonInfo').innerHTML = segText(segKey);
            highlightSeason(-1);
          }
        }
        // Jahr vorbei → nahtlos ins nächste Jahr weiterlaufen
        if (simDate >= seasonState.endMs){
          const built = buildSeasonEvents(simDate);
          seasonState.dates = built.dates;
          seasonState.evs = built.evs;
          seasonState.nextEv = 0;
          seasonState.endMs = simDate + YEAR_MS;
          placeSeasonMarkers();
        }
        if (Math.random() < 0.03) syncTM();
      }
      // Kamera sanft mitführen, damit die Tag/Nacht-Grenze immer sichtbar bleibt
      if (followTarget && !dragging){
        const ep = earthBody.holder.position;
        const want = Math.atan2(ep.z, ep.x) + 1.05;
        let dth = want - camTheta;
        while (dth > Math.PI) dth -= Math.PI*2;
        while (dth < -Math.PI) dth += Math.PI*2;
        camTheta += dth * Math.min(1, dt*1.2);
      }
    }
    updateSeasonHud();
  }

  // Eigenrotation (echte Perioden, retrograd = negativ)
  sun.rotation.y += dt * (ROT_BASE/25) * speed;
  BODIES.forEach(p => {
    const rot = dt * (ROT_BASE / p.rotPeriod) * speed;
    p.mesh.rotation.y += rot;
    if (p.cloudMesh) p.cloudMesh.rotation.y += rot * 1.18;
    if (p.moonObjs) p.moonObjs.forEach(mo => {
      if (p.name === 'Erde' && mo.def.name === 'Mond'){
        // Position phasengenau: bei Neumond steht der Mond Richtung Sonne
        const sunAng = Math.atan2(p.holder.position.z, -p.holder.position.x);
        mo.pivot.rotation.y = sunAng + (moonAge(simDate) / SYNODIC) * Math.PI * 2;
      } else {
        mo.pivot.rotation.y += dt * (ROT_BASE / mo.def.period) * speed;
      }
    });
  });
  halley.mesh.rotation.y += dt * (ROT_BASE/2.2) * speed;
  halley.mesh.rotation.x += dt * 0.3 * speed;

  // Gürtel-Drift
  beltMain.rotation.y += dt * 0.012 * speed;
  beltKuiper.rotation.y += dt * 0.004 * speed;

  // Sonnen-Protuberanzen
  flares.forEach(f => {
    f.userData.ang += dt * f.userData.sp;
    f.position.set(Math.cos(f.userData.ang)*f.userData.r, Math.sin(f.userData.ang*1.7)*2, Math.sin(f.userData.ang)*f.userData.r);
    f.material.opacity = 0.35 + Math.sin(f.userData.ang*3)*0.2;
  });
  glow1.material.rotation += dt*0.02;
  glow2.material.rotation -= dt*0.013;

  updatePhoton(dt);

  // Weltraumreise
  if (journey) journeyFrame(dt);

  updateCamera(dt);

  // Galaxie-Überblendung beim Herauszoomen
  const gf = THREE.MathUtils.smoothstep(camDist, 45000, 240000);
  if (galaxyMat){
    galaxyMat.opacity = gf * 0.9;
    galaxyBulge.material.opacity = gf * 0.85;
    hereMarker.material.opacity = gf;
    hereLabel.material.opacity = gf * ($('labels').checked ? 1 : 0);
    starFieldMat.opacity = 0.9 * (1 - gf);
    skyboxMat.opacity = 1 - gf;            // Panorama-Hintergrund nur in der Sonnensystem-Ansicht
    starSprites.forEach(s => s.material.opacity = 1 - gf);
    constGroup.visible = $('constellations').checked && gf < 0.5;
    if (gf > 0.45 && !galaxyToastShown){
      galaxyToastShown = true;
      toast(t('galaxy'), 7000);
    }
    // Zweite Stufe: die Lokale Gruppe erscheint
    const gf2 = THREE.MathUtils.smoothstep(camDist, 650000, 3200000);
    // Dritte Stufe: das kosmische Netz – jede Galaxie nur noch ein Punkt
    const gf3 = THREE.MathUtils.smoothstep(camDist, 7000000, 60000000);
    farMats.forEach(m => m.opacity = gf2 * (m.userDataBase || 0.95));
    farLabels.forEach(l => l.material.opacity = gf2 * (1 - gf3) * 0.9 * ($('labels').checked ? 1 : 0));
    if (cosmicMat){
      cosmicMat.opacity = gf3 * 0.95;
      lgMarker.material.opacity = gf3;
      lgLabel.material.opacity = gf3 * ($('labels').checked ? 1 : 0);
      hereMarker.material.opacity = gf * (1 - gf3);
      hereLabel.material.opacity = gf * (1 - gf3) * ($('labels').checked ? 1 : 0);
    }
    if (gf2 > 0.5 && !localGroupToast){
      localGroupToast = true;
      toast(t('localgroup'), 8000);
    }
    if (gf3 > 0.5 && !cosmicToast){
      cosmicToast = true;
      toast(t('cosmic'), 9000);
    }
  }

  renderer.render(scene, camera);
}
// ============================================================
//  Sprache anwenden / umschalten
// ============================================================
function applyLang(){
  document.documentElement.lang = lang;
  document.title = lang === 'en' ? 'Our Solar System – 3D Model' : 'Unser Sonnensystem – 3D-Modell';
  // statische UI-Texte
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const val = t(key);
    if (val !== undefined) el.textContent = val;
  });
  // Umschalt-Knopf zeigt die jeweils ANDERE Sprache
  $('langBtn').textContent = lang === 'en' ? 'DE' : 'EN';
  // Chips
  document.querySelectorAll('.chip').forEach(c => { if (c.dataset.disp) c.textContent = dn(c.dataset.disp); });
  // 3D-Beschriftungen (Planeten, Sterne, Galaxien …)
  refreshLabels3D();
  // Jahreszeiten-Marker im 3D
  if (typeof seasonMarkers !== 'undefined') seasonMarkers.forEach((m, i) => {
    const lbl = m.group.children[1];
    if (lbl) updateLabel(lbl, SEASONS[i].emoji + ' ' + seasonShort(i));
  });
  updateSpeedLabel();
  syncTM();
  // offene Infokarte neu rendern
  if (document.getElementById('info').style.display === 'block' && selectedObj) selectBody(selectedObj, true);
}
$('langBtn').addEventListener('click', () => {
  lang = lang === 'en' ? 'de' : 'en';
  try { localStorage.setItem('lang', lang); } catch(e) {}
  Audio2.toggle();
  applyLang();
});

applyLang();
syncTM();
animate();

addEventListener('resize', () => {
  camera.aspect = innerWidth/innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
