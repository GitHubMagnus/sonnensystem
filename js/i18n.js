/* i18n.js — Sprachen, Übersetzungen, Anzeige- und Körpernamen
   Klassisches Script (kein ES-Modul): alle Top-Level-Deklarationen teilen sich
   einen gemeinsamen globalen Scope. Ladereihenfolge: siehe index.html. */

// ============================================================
//  Mehrsprachigkeit (Deutsch / English)
// ============================================================
let lang = (function(){ try { return localStorage.getItem('lang') || 'de'; } catch(e){ return 'de'; } })();
function locale(){ return lang === 'en' ? 'en-US' : 'de-DE'; }
function numL(n, opts){ return Number(n).toLocaleString(locale(), opts); }
// Dezimaltrennzeichen passend zur Sprache (DE: Komma, EN: Punkt)
function dec(str){ return lang === 'en' ? String(str) : String(str).replace('.', ','); }

// Anzeigenamen der Himmelskörper
const NAMES_EN = {
  'Sonne':'Sun','Merkur':'Mercury','Venus':'Venus','Erde':'Earth','Mars':'Mars',
  'Jupiter':'Jupiter','Saturn':'Saturn','Uranus':'Uranus','Neptun':'Neptune',
  'Pluto':'Pluto','Ceres':'Ceres','Haumea':'Haumea','Makemake':'Makemake','Eris':'Eris',
  'Mond':'Moon','Halley':'Halley','Halleyscher Komet':"Halley's Comet",
  'Voyager 1':'Voyager 1','Voyager 2':'Voyager 2','ISS':'ISS',
  'Hubble':'Hubble','Hubble-Weltraumteleskop':'Hubble Space Telescope',
  'JWST':'JWST','James-Webb-Teleskop':'James Webb Telescope'
};
function dn(name){ return lang === 'en' ? (NAMES_EN[name] || name) : name; }

// Übersetzung der 3D-Beschriftungen (Sternbilder, Galaxien, Sterne …)
const TR3D = Object.assign({}, NAMES_EN, {
  // Sternbilder
  'Orion':'Orion','Großer Wagen':'Big Dipper','Kassiopeia':'Cassiopeia',
  'Kreuz des Südens':'Southern Cross','Zwillinge':'Gemini','Löwe':'Leo',
  'Schwan':'Cygnus','Skorpion':'Scorpius','Stier':'Taurus','Pegasus':'Pegasus',
  // deutsche Sternnamen → international
  'Wega':'Vega','Beteigeuze':'Betelgeuse','Atair':'Altair','Prokyon':'Procyon',
  'Kastor':'Castor','Polarstern':'Polaris','Kanopus':'Canopus','Arktur':'Arcturus',
  // Galaxien-Beschriftungen
  '☀ Unser Sonnensystem':'☀ Our Solar System','☀ Unsere Lokale Gruppe':'☀ Our Local Group',
  'Andromeda (M31) · 2,5 Mio. Lj':'Andromeda (M31) · 2.5M ly',
  'Dreiecksgalaxie (M33) · 2,7 Mio. Lj':'Triangulum Galaxy (M33) · 2.7M ly',
  'Große Magellansche Wolke':'Large Magellanic Cloud',
  'Kleine Magellansche Wolke':'Small Magellanic Cloud'
});
// Registry aller umschaltbaren 3D-Labels: { sp, de }
const label3D = [];
function reg3D(sp, de){ if (sp) label3D.push({ sp, de }); return sp; }
function refreshLabels3D(){
  label3D.forEach(o => updateLabel(o.sp, lang === 'en' ? (TR3D[o.de] || o.de) : o.de));
}

// Englische Texte der Himmelskörper (Felder: ord, info, distSun, orbit, rot, diam, moons, tiltLabel)
const EN_BODIES = {
  'Merkur': { ord:'1st planet', info:'The smallest planet, covered in impact craters like our Moon. Its orbit is the most eccentric and most inclined of all the planets (7°).', distSun:'57.9 million km (0.39 AU)', orbit:'88 days', rot:'59 days', diam:'4,879 km', moons:'none' },
  'Venus': { ord:'2nd planet', info:'Completely shrouded in dense sulfuric-acid clouds – at 465 °C the hottest planet. Rotates retrograde and slower than it orbits the Sun.', distSun:'108.2 million km (0.72 AU)', orbit:'225 days', rot:'243 days ⟲', diam:'12,104 km', moons:'none' },
  'Erde': { ord:'3rd planet', info:'The blue planet with a real NASA satellite map: continents, ice caps, clouds – and on the night side the city lights glow!', distSun:'149.6 million km (1 AU)', orbit:'365.25 days', rot:'23 h 56 min', diam:'12,742 km', moons:'1 – the Moon' },
  'Mars': { ord:'4th planet', info:'The red planet with iron-oxide dust, the giant volcano Olympus Mons and the Valles Marineris canyon system – shown here with a real elevation map.', distSun:'227.9 million km (1.52 AU)', orbit:'687 days', rot:'24 h 37 min', diam:'6,779 km', moons:'2 – Phobos & Deimos' },
  'Jupiter': { ord:'5th planet', info:'The gas giant with cloud bands and the Great Red Spot – a storm larger than Earth. The fastest rotator in the Solar System.', distSun:'778.5 million km (5.20 AU)', orbit:'11.9 years', rot:'9 h 56 min', diam:'139,820 km', moons:'95 known – the largest: Io, Europa, Ganymede, Callisto (the Galilean moons)' },
  'Saturn': { ord:'6th planet', info:'Its ring system of ice and rock is over 270,000 km wide but only metres thick – with the Cassini Division as a gap. It casts real shadows!', distSun:'1,434 million km (9.58 AU)', orbit:'29.5 years', rot:'10 h 42 min', diam:'116,460 km', moons:'274 known (a record!) – the largest: Titan, Rhea, Iapetus, Enceladus, Mimas' },
  'Uranus': { ord:'7th planet', info:'The sideways-tipped ice giant: its axis is tilted by 97.8°, so it rolls around the Sun lying on its side. Methane gives it a blue-green colour.', distSun:'2,871 million km (19.2 AU)', orbit:'84 years', rot:'17 h 14 min ⟲', diam:'50,724 km', moons:'29 known – the largest: Titania, Oberon, Umbriel, Ariel, Miranda' },
  'Neptun': { ord:'8th planet', info:'The outermost planet: deep blue from methane, with the fastest winds in the Solar System (up to 2,100 km/h).', distSun:'4,495 million km (30.1 AU)', orbit:'165 years', rot:'16 h 7 min', diam:'49,244 km', moons:'16 known – the largest: Triton (orbits Neptune backwards), plus Proteus & Nereid' },
  'Pluto': { ord:'Dwarf planet (Kuiper belt)', info:'The 9th planet until 2006. Its steeply inclined (17°), eccentric orbit sometimes crosses Neptune’s. Heart-shaped nitrogen-ice plain Sputnik Planitia.', distSun:'5,906 million km (39.5 AU)', orbit:'248 years', rot:'6.4 days ⟲', diam:'2,377 km', moons:'5 – Charon, Styx, Nix, Kerberos, Hydra' },
  'Ceres': { ord:'Dwarf planet (asteroid belt)', info:'The largest body in the asteroid belt and the only dwarf planet in the inner Solar System. Thought to contain a lot of water ice.', distSun:'414 million km (2.77 AU)', orbit:'4.6 years', rot:'9 h', diam:'940 km', moons:'none' },
  'Haumea': { ord:'Dwarf planet (Kuiper belt)', info:'Spins so fast (3.9 h – a record!) that it is deformed into an egg shape. It even has its own ring.', distSun:'6,450 million km (43.1 AU)', orbit:'284 years', rot:'3.9 hours', diam:'≈ 1,632 km', moons:'2 – Hiʻiaka & Namaka', tiltLabel:'≈ steeply inclined' },
  'Makemake': { ord:'Dwarf planet (Kuiper belt)', info:'A reddish ice dwarf in the Kuiper belt, covered in frozen methane. Discovered in 2005, shortly after Easter – hence its internal nickname “Easterbunny”.', distSun:'6,850 million km (45.8 AU)', orbit:'306 years', rot:'22.8 hours', diam:'≈ 1,430 km', moons:'1 – MK2', tiltLabel:'unknown' },
  'Eris': { ord:'Dwarf planet (scattered disc)', info:'Almost as large as Pluto and more massive – its discovery in 2005 triggered the debate that cost Pluto its planet status. Extremely inclined orbit (44°!).', distSun:'10,139 million km (67.8 AU)', orbit:'559 years', rot:'25.9 hours', diam:'2,326 km', moons:'1 – Dysnomia' },
  'Sonne': { ord:'Central star (yellow dwarf, G2V)', info:'Our star – 99.8 % of the Solar System’s mass. In its core hydrogen fuses into helium at 15 million °C. It sits at the focus of every planet’s orbit.', distSun:'–', orbit:'–', rot:'≈ 25 days (equator)', tiltLabel:'7.25°', diam:'1,392,700 km', moons:'8 planets, 5+ dwarf planets' },
  'Halleyscher Komet': { ord:'Comet', info:'The most famous comet – it visits the inner Solar System every ~76 years (last in 1986, next in 2061). Its tail of gas and dust always points away from the Sun. Retrograde and steeply inclined orbit!', distSun:'0.59–35.1 AU (extremely elliptical)', orbit:'~76 years', rot:'2.2 days', tiltLabel:'–', diam:'~11 km', moons:'–' },
  'Voyager 1': { ord:'Space probe · NASA (since 1977)', info:'The most distant human-made object! Launched on 5 September 1977, with flybys of Jupiter (1979) and Saturn including Titan (1980). Since August 2012 it has flown through interstellar space – its radio signal takes almost a day to reach us. In 1990 it took the famous “Pale Blue Dot” photo. On board: the Golden Record.', distSun:'–', orbit:'leaving the Solar System forever', rot:'17.0 km/s (≈ 61,000 km/h)', tiltLabel:'Course: 35° above the ecliptic', diam:'825 kg · 3.7 m antenna', moons:'–' },
  'Voyager 2': { ord:'Space probe · NASA (since 1977)', info:'The only probe to have visited all four outer planets – the “Grand Tour”: Jupiter (1979), Saturn (1981), Uranus (1986) and Neptune (1989). It launched 16 days BEFORE Voyager 1! In interstellar space since November 2018. It also carries a Golden Record.', distSun:'–', orbit:'leaving the Solar System forever', rot:'15.4 km/s (≈ 55,000 km/h)', tiltLabel:'Course: 48° below the ecliptic', diam:'825 kg · 3.7 m antenna', moons:'–' },
  'ISS': { ord:'Space station · in orbit since 1998', info:'The International Space Station: continuously inhabited since November 2000 – the largest structure in space. It circles Earth at 400 km altitude every 93 minutes; the crew sees 16 sunrises and sunsets a day. Visible to the naked eye on a clear night!', distSun:'≈ 1 AU (with Earth)', orbit:'92.9 min around Earth (400 km altitude)', rot:'28,800 km/h', tiltLabel:'Orbital inclination 51.6°', diam:'109 × 73 m · ~420 t', moons:'–' },
  'Hubble-Weltraumteleskop': { ord:'Space telescope · since 1990', info:'The most famous telescope in the world: over 1.5 million observations, it helped determine the age of the universe (13.8 billion years) and delivered the deepest views into space. Repaired and upgraded five times by astronauts in orbit.', distSun:'≈ 1 AU (with Earth)', orbit:'95 min around Earth (540 km altitude)', rot:'27,300 km/h', tiltLabel:'Orbital inclination 28.5°', diam:'13.2 m · 11 t · 2.4 m mirror', moons:'–' },
  'James-Webb-Teleskop': { ord:'Space telescope · since 2021 · at L2', info:'The most powerful space telescope: it observes the first galaxies after the Big Bang in infrared and studies the atmospheres of exoplanets. It hovers at Lagrange point L2, 1.5 million km behind Earth – where gravitational forces balance out so it travels around the Sun together with Earth. Its sunshield is the size of a tennis court and cools the optics to −233 °C.', distSun:'≈ 1.01 AU (Lagrange point L2)', orbit:'orbits L2, always facing away from the Sun', rot:'–', tiltLabel:'permanently in Earth’s shadow region', diam:'6.5 m mirror · shield 21 × 14 m', moons:'–' }
};
// Liefert ein Feld eines Körpers in der aktuellen Sprache
function bf(d, field){
  if (lang === 'en' && EN_BODIES[d.name] && EN_BODIES[d.name][field] !== undefined) return EN_BODIES[d.name][field];
  return d[field];
}

// Mondphasen
const MOON_PHASES = {
  de:['Neumond','Zunehmende Sichel','Erstes Viertel','Zunehmender Mond','Vollmond','Abnehmender Mond','Letztes Viertel','Abnehmende Sichel'],
  en:['New Moon','Waxing Crescent','First Quarter','Waxing Gibbous','Full Moon','Waning Gibbous','Last Quarter','Waning Crescent']
};

// UI- und dynamische Texte
const I18N = {
  de: {
    title:'Unser Sonnensystem',
    f_dist:'Abstand zur Sonne', f_orbit:'Umlaufzeit', f_rot:'Eigenrotation', f_tilt:'Achsneigung', f_diam:'Durchmesser', f_moons:'Monde',
    c_speed:'Geschwindigkeit', c_display:'Anzeige', c_orbits:'Umlaufbahnen', c_labels:'Namen', c_axes:'Rotationsachsen',
    c_belts:'Asteroiden- & Kuipergürtel', c_dwarfs:'Zwergplaneten & Halley', c_sats:'Satelliten (ISS, Hubble, JWST)',
    c_probes:'Voyager-Sonden', c_constellations:'Sternbilder & Sternnamen', c_planetsOnly:'🪐 Nur Planeten & Monde',
    c_shadows:'Schatten & Finsternisse', c_realScale:'Realer Maßstab', c_sfx:'Klang-Effekte', c_tools:'Werkzeuge',
    b_tour:'🚀 Tour', b_journey:'🎬 Reise', b_compare:'⚖️ Vergleich', b_calc:'🧮 Rechner', b_photon:'💡 Lichtstrahl',
    b_time:'🕰️ Zeitreise', b_seasons:'🍂 Jahreszeiten', b_sky:'🌃 Himmel', b_shot:'📷 Foto', b_full:'⛶ Vollbild',
    tm_title:'🕰️ Zeitmaschine', tm_today:'Heute', tm_note:'Echte Planetenpositionen (JPL-Näherung). Schieberegler: ±100 Jahre.',
    ph_title:'💡 Reise mit Lichtgeschwindigkeit', tour_title:'🚀 Geführte Tour', se_title:'🍂 Jahreszeiten der Erde',
    se_where:'Wo steht die Sonne senkrecht?', se_south:'❄ 23,4° Süd', se_equator:'Äquator', se_north:'23,4° Nord ☀',
    se_anglewhy:'Warum der Winkel entscheidet – gleiches Lichtbündel, andere Fläche:',
    se_svg_summer:'☀ Sommer: steil → kleine Fläche, HEISS', se_svg_winter:'❄ Winter: flach → große Fläche, kalt',
    se_anglenote:'Dieselbe Energiemenge verteilt sich im Winter auf die 2–3-fache Fläche – darum heizt die tiefe Wintersonne kaum. Dazu kommt die kürzere Scheindauer pro Tag.',
    se_overview:'Bahn-Übersicht (alle 4 Stationen)',
    subtitle_default:'Echte Ephemeriden · NASA-Texturen · Keplersche Bahnen',
    subtitle_sim:'Simuliertes Datum: ', illuminated:'beleuchtet',
    home:'🧭 Zurück zur Übersicht',
    planetsOnly_on:'🪐 Nur-Planeten-Modus: die 8 Planeten mit ihren Monden – alles andere ist ausgeblendet',
    realScale_on:'Realer Maßstab: Größen wahrheitsgetreu zur Sonne, Abstände echt – das All ist fast leer! (Körper 10× vergrößert, sonst unsichtbar)',
    music_on:'🎵 Generative Weltraum-Musik – jede Note wird live erzeugt (lizenzfrei)',
    screenshot:'📷 Screenshot gespeichert!',
    galaxy:'🌌 Die Milchstraße! ~200 Mrd. Sterne, 100.000 Lichtjahre breit – unser Sonnensystem liegt im Orion-Arm, ~26.000 Lj vom Zentrum. Zoome weiter raus…',
    localgroup:'🌌🌌 Die Lokale Gruppe: Andromeda rast mit 110 km/s auf uns zu – in ~4,5 Mrd. Jahren verschmilzt sie mit der Milchstraße! (Abstände stark gestaucht)',
    cosmic:'✨ Das kosmische Netz: Jeder Lichtpunkt ist eine ganze Galaxie mit Milliarden Sternen. Galaxien sammeln sich in Haufen und Filamenten um riesige Leerräume – die größte Struktur des Universums.',
    journey_start:'🎬 Weltraumreise: ein durchgehender Flug von Planet zu Planet – lehn dich zurück! (Tipp: 🔊 Musik dazu · Klick auf 🎬 beendet)',
    journey_zoom:'🎬 …und jetzt ganz hinaus: vorbei an der Milchstraße bis zum kosmischen Netz – und wieder zurück.',
    tour_end:'🚀 Tour beendet – viel Spaß beim weiteren Erkunden!',
    seasons_start:'🍂 Jahreszeiten-Demo: Ein Jahr läuft jetzt im Zeitraffer ab – einfach zuschauen!',
    voyager_play:'▶ Flug 1977 → heute abspielen',
    photon_time:'⏱ Lichtlaufzeit: ', photon_orbit_a:'→ ', photon_orbit_b:'-Bahn: ',
    jt_universe:'Hinaus ins Universum', jt_universe_sub:'Milchstraße · Lokale Gruppe · kosmisches Netz',
    jt_web:'Das kosmische Netz', jt_web_sub:'jeder Lichtpunkt ist eine ganze Galaxie',
    jt_back:'Zurück zur Sonne',
    cmp_title:'⚖️ Planetenvergleich', cmp_diam:'Durchmesser', cmp_g:'Schwerkraft', cmp_temp:'Ø-Temperatur',
    cmp_day:'Tageslänge', cmp_year:'Jahreslänge', cmp_moons:'Monde', cmp_h:' h', cmp_days:' Tage',
    calc_title:'🧮 Weltraum-Rechner', calc_weight:'Dein Gewicht auf anderen Welten:', calc_kg:' kg auf der Erde',
    calc_travel:'🛣️ Reisezeit von der Erde', calc_dist:'Distanz (kürzeste)', calc_mio:' Mio. km',
    calc_car:'🚗 Auto (100 km/h)', calc_plane:'✈️ Flugzeug (900 km/h)', calc_probe:'🚀 Raumsonde (58.000 km/h)', calc_light:'💡 Licht',
    u_years:' Jahre', u_days:' Tage', u_hours:' Stunden',
    sky_title:'🌃 Der Himmel am ', sky_moon:' Mond: ', sky_calc:'Berechnet aus den simulierten Planetenpositionen – ändere das Datum in der Zeitmaschine, um andere Tage zu sehen.',
    sky_conj:'🔭 Konjunktions-Finder', sky_conj_note:'Wann stehen zwei Planeten – von der Erde aus gesehen – das nächste Mal eng beieinander (&lt; 2,5°)?',
    sky_search:'🔍 Suchen', sky_pickdiff:'Bitte zwei verschiedene Planeten wählen.', sky_searching:'Suche in den nächsten 30 Jahren…',
    sky_none:'In den nächsten 30 Jahren keine enge Begegnung gefunden.', sky_sep:' – Abstand nur ',
    sky_invis:'unsichtbar – zu nah an der Sonne', sky_oppo:'<b>Opposition!</b> Die ganze Nacht sichtbar – beste Beobachtungszeit',
    sky_evening:'am Abendhimmel (Westen, nach Sonnenuntergang)', sky_morning:'am Morgenhimmel (Osten, vor Sonnenaufgang)',
    sky_scope:' · nur mit Fernglas/Teleskop', sky_fromsun:'° von der Sonne – ',
    tour_station:'Station ', tour_of:' / ',
    voyager_flight:' · Flug von 1977 bis heute im Zeitraffer – beobachte die Vorbeiflüge!',
    voyager_arrived:' hat ihre heutige Position erreicht: ~', voyager_arrived2:' AE von der Sonne',
    se_pause:'⏸ ', se_continue:'…gleich geht es weiter.',
    se_play:'▶ Weiter', se_pausebtn:'⏸ Pause',
    se_intro:'▶ <b>Ein Jahr im Zeitraffer (~1 Minute).</b> Der blaue N-Pfeil ist die Erdachse – sie zeigt das ganze Jahr in dieselbe Richtung (zum Polarstern). Beobachte die Tag/Nacht-Grenze und die blauen Polarkreise: Mal liegt der Nordpol im Dauerlicht, mal im Dauerschatten. An den vier Stationen hält die Demo kurz an.',
    se_sun_over:'Sonne senkrecht über ', se_morelight:' · mehr Licht: ',
    se_nh:'Nordhalbkugel ☀', se_sh:'Südhalbkugel ☀', se_equinox:'beide gleich (Äquinoktium)',
    se_dist:'Abstand zur Sonne: ', se_au:' AE', se_farther:' – weiter weg als im Mittel!', se_closer:' – näher als im Mittel',
    se_north_w:'Nord', se_south_w:'Süd'
  },
  en: {
    title:'Our Solar System',
    f_dist:'Distance to Sun', f_orbit:'Orbital period', f_rot:'Rotation', f_tilt:'Axial tilt', f_diam:'Diameter', f_moons:'Moons',
    c_speed:'Speed', c_display:'Display', c_orbits:'Orbits', c_labels:'Labels', c_axes:'Rotation axes',
    c_belts:'Asteroid & Kuiper belt', c_dwarfs:'Dwarf planets & Halley', c_sats:'Satellites (ISS, Hubble, JWST)',
    c_probes:'Voyager probes', c_constellations:'Constellations & star names', c_planetsOnly:'🪐 Planets & moons only',
    c_shadows:'Shadows & eclipses', c_realScale:'Real scale', c_sfx:'Sound effects', c_tools:'Tools',
    b_tour:'🚀 Tour', b_journey:'🎬 Journey', b_compare:'⚖️ Compare', b_calc:'🧮 Calculator', b_photon:'💡 Light ray',
    b_time:'🕰️ Time travel', b_seasons:'🍂 Seasons', b_sky:'🌃 Sky', b_shot:'📷 Photo', b_full:'⛶ Fullscreen',
    tm_title:'🕰️ Time machine', tm_today:'Today', tm_note:'Real planet positions (JPL approximation). Slider: ±100 years.',
    ph_title:'💡 Travelling at light speed', tour_title:'🚀 Guided tour', se_title:"🍂 Earth's seasons",
    se_where:'Where is the Sun directly overhead?', se_south:'❄ 23.4° South', se_equator:'Equator', se_north:'23.4° North ☀',
    se_anglewhy:'Why the angle matters – same beam of light, different area:',
    se_svg_summer:'☀ Summer: steep → small area, HOT', se_svg_winter:'❄ Winter: shallow → large area, cold',
    se_anglenote:'In winter the same amount of energy is spread over 2–3× the area – that’s why the low winter Sun barely warms anything. Add to that the shorter time it is up each day.',
    se_overview:'Orbit overview (all 4 stations)',
    subtitle_default:'Real ephemerides · NASA textures · Keplerian orbits',
    subtitle_sim:'Simulated date: ', illuminated:'illuminated',
    home:'🧭 Back to overview',
    planetsOnly_on:'🪐 Planets-only mode: the 8 planets with their moons – everything else is hidden',
    realScale_on:'Real scale: sizes true to the Sun, distances real – space is almost empty! (bodies enlarged 10×, otherwise invisible)',
    music_on:'🎵 Generative space music – every note is created live (royalty-free)',
    screenshot:'📷 Screenshot saved!',
    galaxy:'🌌 The Milky Way! ~200 billion stars, 100,000 light-years across – our Solar System lies in the Orion Arm, ~26,000 ly from the centre. Keep zooming out…',
    localgroup:'🌌🌌 The Local Group: Andromeda is racing toward us at 110 km/s – in ~4.5 billion years it will merge with the Milky Way! (distances heavily compressed)',
    cosmic:'✨ The cosmic web: every point of light is an entire galaxy with billions of stars. Galaxies gather in clusters and filaments around huge voids – the largest structure in the universe.',
    journey_start:'🎬 Space journey: one continuous flight from planet to planet – sit back! (Tip: 🔊 add music · click 🎬 to stop)',
    journey_zoom:'🎬 …and now all the way out: past the Milky Way to the cosmic web – and back again.',
    tour_end:'🚀 Tour finished – enjoy exploring further!',
    seasons_start:'🍂 Seasons demo: a year now plays in fast-forward – just watch!',
    voyager_play:'▶ Play flight 1977 → today',
    photon_time:'⏱ Light travel time: ', photon_orbit_a:'→ ', photon_orbit_b:' orbit: ',
    jt_universe:'Out into the universe', jt_universe_sub:'Milky Way · Local Group · cosmic web',
    jt_web:'The cosmic web', jt_web_sub:'every point of light is an entire galaxy',
    jt_back:'Back to the Sun',
    cmp_title:'⚖️ Planet comparison', cmp_diam:'Diameter', cmp_g:'Gravity', cmp_temp:'Avg. temperature',
    cmp_day:'Day length', cmp_year:'Year length', cmp_moons:'Moons', cmp_h:' h', cmp_days:' days',
    calc_title:'🧮 Space calculator', calc_weight:'Your weight on other worlds:', calc_kg:' kg on Earth',
    calc_travel:'🛣️ Travel time from Earth', calc_dist:'Distance (shortest)', calc_mio:' million km',
    calc_car:'🚗 Car (100 km/h)', calc_plane:'✈️ Aeroplane (900 km/h)', calc_probe:'🚀 Space probe (58,000 km/h)', calc_light:'💡 Light',
    u_years:' years', u_days:' days', u_hours:' hours',
    sky_title:'🌃 The sky on ', sky_moon:' Moon: ', sky_calc:'Calculated from the simulated planet positions – change the date in the time machine to see other days.',
    sky_conj:'🔭 Conjunction finder', sky_conj_note:'When will two planets – seen from Earth – next appear close together (&lt; 2.5°)?',
    sky_search:'🔍 Search', sky_pickdiff:'Please choose two different planets.', sky_searching:'Searching the next 30 years…',
    sky_none:'No close encounter found in the next 30 years.', sky_sep:' – separation only ',
    sky_invis:'invisible – too close to the Sun', sky_oppo:'<b>Opposition!</b> Visible all night – the best time to observe',
    sky_evening:'in the evening sky (west, after sunset)', sky_morning:'in the morning sky (east, before sunrise)',
    sky_scope:' · only with binoculars/telescope', sky_fromsun:'° from the Sun – ',
    tour_station:'Stop ', tour_of:' / ',
    voyager_flight:' · flight from 1977 to today in fast-forward – watch the flybys!',
    voyager_arrived:' has reached its present-day position: ~', voyager_arrived2:' AU from the Sun',
    se_pause:'⏸ ', se_continue:'…continuing shortly.',
    se_play:'▶ Continue', se_pausebtn:'⏸ Pause',
    se_intro:'▶ <b>A year in fast-forward (~1 minute).</b> The blue N arrow is Earth’s axis – it points the same way all year (toward Polaris). Watch the day/night boundary and the blue polar circles: sometimes the North Pole is in constant daylight, sometimes in constant darkness. The demo pauses briefly at the four stations.',
    se_sun_over:'Sun directly over ', se_morelight:' · more light: ',
    se_nh:'Northern Hemisphere ☀', se_sh:'Southern Hemisphere ☀', se_equinox:'both equal (equinox)',
    se_dist:'Distance to Sun: ', se_au:' AU', se_farther:' – farther than average!', se_closer:' – closer than average',
    se_north_w:'North', se_south_w:'South'
  }
};
function t(key){ return (I18N[lang] && I18N[lang][key] !== undefined) ? I18N[lang][key] : (I18N.de[key] || key); }

