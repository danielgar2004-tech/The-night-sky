/* ═══════════════════════════════════════════════════════════════
   ESA PRIMERA VEZ… · Cielo 3D inmersivo
   Cusco, Perú · 16 de septiembre de 2025 · 22:00 (LST ≈ 22h)
   Cada posición estelar está calculada astronómicamente (alt/az)
   a partir del catálogo Hiparcos (mag ≤ 6) para esa toma exacta.
   ═══════════════════════════════════════════════════════════════ */
import * as THREE from "./three.module.min.js";
import SKYDATA from "./data.js";

const R = 100;                                  // radio de la esfera celeste
const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;
const $ = (id) => document.getElementById(id);

/* ── util: alt/az → vector (az 0°=N, 90°=E; mirando −Z = Norte) ── */
function vecFrom(az, alt, r = R) {
  const a = THREE.MathUtils.degToRad(alt), z = THREE.MathUtils.degToRad(az);
  return new THREE.Vector3(Math.sin(z) * Math.cos(a) * r, Math.sin(a) * r, -Math.cos(z) * Math.cos(a) * r);
}
/* color aproximado a partir del índice B−V, suavizado hacia blanco (estética híbrida) */
function bvColor(bv) {
  bv = Math.max(-0.4, Math.min(2.0, bv));
  let r, g, b, t;
  if (bv < 0.4) { t = (bv + 0.4) / 0.8; r = 0.62 + 0.38 * t; g = 0.75 + 0.25 * t; b = 1.0; }
  else if (bv < 1.5) { t = (bv - 0.4) / 1.1; r = 1.0; g = 1.0 - 0.32 * t; b = 1.0 - 0.6 * t; }
  else { t = (bv - 1.5) / 0.5; r = 1.0; g = 0.68 - 0.12 * t; b = 0.4 - 0.2 * t; }
  const MIX = 0.45; // acercar al blanco del póster
  return [r + (1 - r) * MIX, g + (1 - g) * MIX, b + (1 - b) * MIX];
}

/* ═══════════ ESCENA ═══════════ */
const canvas = $("sky");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x10141f);
const camera = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.1, 400);
camera.position.set(0, 0, 0);

/* degradado sutil del cielo (más profundo en el cénit, brumoso en el horizonte) */
{
  const g = new THREE.SphereGeometry(R * 1.6, 48, 32);
  const m = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false,
    uniforms: {},
    vertexShader: `varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `varying vec3 vP;
      void main(){
        float h = normalize(vP).y;
        vec3 zen = vec3(0.055,0.070,0.110);
        vec3 mid = vec3(0.075,0.093,0.145);
        vec3 hor = vec3(0.118,0.135,0.185);
        vec3 c = h > 0.0 ? mix(mid, zen, smoothstep(0.0,0.85,h)) : mix(mid, hor*0.35, smoothstep(0.0,0.5,-h));
        c = mix(c, hor, exp(-abs(h)*7.0)*0.55);
        gl_FragColor = vec4(c,1.0);
      }`
  });
  scene.add(new THREE.Mesh(g, m));
}

/* ── Vía Láctea (nube de puntos aditiva, calculada del plano galáctico) ── */
{
  const pts = SKYDATA.mw, n = pts.length;
  const pos = new Float32Array(n * 3), al = new Float32Array(n), sz = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const v = vecFrom(pts[i][0], pts[i][1], R * 1.18);
    pos.set([v.x, v.y, v.z], i * 3); al[i] = pts[i][2]; sz[i] = 26 + 34 * Math.random();
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("aA", new THREE.BufferAttribute(al, 1));
  geo.setAttribute("aS", new THREE.BufferAttribute(sz, 1));
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uPR: { value: renderer.getPixelRatio() } },
    vertexShader: `attribute float aA,aS; varying float vA; uniform float uPR;
      void main(){ vA=aA; vec4 mv=modelViewMatrix*vec4(position,1.);
        gl_PointSize = aS*uPR*(180.0/-mv.z); gl_Position = projectionMatrix*mv; }`,
    fragmentShader: `varying float vA;
      void main(){ float d = length(gl_PointCoord-.5);
        float a = smoothstep(.5,.0,d); a*=a;
        gl_FragColor = vec4(vec3(0.62,0.68,0.85), a*0.028*vA); }`
  });
  scene.add(new THREE.Points(geo, mat));
}

/* ── ESTRELLAS (shader: tamaño por magnitud, color B−V, titileo sutil) ── */
let starU;
{
  const st = SKYDATA.stars, n = st.length;
  const pos = new Float32Array(n * 3), col = new Float32Array(n * 3),
        siz = new Float32Array(n), ph = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const [az, alt, mag, bv] = st[i];
    const v = vecFrom(az, alt);
    pos.set([v.x, v.y, v.z], i * 3);
    col.set(bvColor(bv), i * 3);
    siz[i] = Math.max(1.5, 10.5 - 1.62 * mag);
    ph[i] = Math.random() * 6.283;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("aColor", new THREE.BufferAttribute(col, 3));
  geo.setAttribute("aSize", new THREE.BufferAttribute(siz, 1));
  geo.setAttribute("aPhase", new THREE.BufferAttribute(ph, 1));
  starU = { uT: { value: 0 }, uPR: { value: renderer.getPixelRatio() }, uZ: { value: 1 } };
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: starU,
    vertexShader: `attribute vec3 aColor; attribute float aSize,aPhase;
      varying vec3 vC; varying float vB,vS;
      uniform float uT,uPR,uZ;
      void main(){
        vC=aColor; vS=aSize;
        float tw = aSize<5.0 ? (0.86+0.14*sin(uT*2.1+aPhase)) : 1.0;
        vB = tw;
        vec4 mv = modelViewMatrix*vec4(position,1.);
        gl_PointSize = aSize*uPR*uZ*tw;
        gl_Position = projectionMatrix*mv;
      }`,
    fragmentShader: `varying vec3 vC; varying float vB,vS;
      void main(){
        vec2 p = gl_PointCoord-.5; float d = length(p)*2.0;
        float core = smoothstep(0.5,0.0,d);
        float halo = exp(-d*3.2)*0.55;
        float a = clamp(core+halo,0.0,1.0)*vB;
        if(a<0.015) discard;
        gl_FragColor = vec4(mix(vC,vec3(1.0),core*0.6), a);
      }`
  });
  scene.add(new THREE.Points(geo, mat));
}

/* ── LÍNEAS DE CONSTELACIÓN (blanco tenue / oro para las destacadas) ── */
function buildLines(featured) {
  const verts = [];
  for (const c of SKYDATA.cons) {
    if (!!c.f !== featured) continue;
    for (const seg of c.seg)
      for (let i = 0; i < seg.length - 1; i++) {
        const a = vecFrom(seg[i][0], seg[i][1], R * 0.995);
        const b = vecFrom(seg[i + 1][0], seg[i + 1][1], R * 0.995);
        verts.push(a.x, a.y, a.z, b.x, b.y, b.z);
      }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(verts), 3));
  const mat = new THREE.LineBasicMaterial({
    color: featured ? 0xd8b464 : 0xbfc8e6,
    transparent: true, opacity: featured ? 0.85 : 0.28,
    blending: THREE.AdditiveBlending, depthWrite: false
  });
  return new THREE.LineSegments(geo, mat);
}
scene.add(buildLines(false));
scene.add(buildLines(true));

/* ── HORIZONTE: línea fina + tierra oscura ── */
{
  const pts = [];
  for (let i = 0; i <= 240; i++) { const az = i * 1.5; pts.push(vecFrom(az, 0, R * 0.99)); }
  const geo = new THREE.BufferGeometry().setFromPoints(pts);
  scene.add(new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xeef2ff, transparent: true, opacity: 0.22 })));
}

/* ═══════════ ETIQUETAS HTML PROYECTADAS ═══════════ */
const labelRoot = $("labels");
const labels = [];
function addLabel(text, az, alt, cls, minShow = 0) {
  const el = document.createElement("div");
  el.className = "lbl " + cls; el.textContent = text;
  labelRoot.appendChild(el);
  labels.push({ el, v: vecFrom(az, alt).normalize(), minShow });
}
for (const c of SKYDATA.cons) addLabel(c.name, c.c[0], Math.min(c.c[1] + 1.2, 88), c.f ? "lbl-con featured" : "lbl-con");
for (const s of SKYDATA.names) addLabel(s.n, s.az, s.alt - 1.4, "lbl-star", s.mag <= 1.7 ? 0 : 1);
[["N", 0], ["E", 90], ["S", 180], ["O", 270]].forEach(([t, az]) => addLabel(t, az, 1.6, "lbl-card"));

const proj = new THREE.Vector3();
function updateLabels() {
  const w = innerWidth, h = innerHeight;
  const dense = camera.fov > 52; // al alejar, oculta nombres de estrellas secundarias
  camera.getWorldDirection(proj); const viewDir = proj.clone();
  for (const L of labels) {
    const dot = L.v.dot(viewDir);
    if (dot < 0.25 || (L.minShow === 1 && dense)) { L.el.style.opacity = 0; continue; }
    proj.copy(L.v).multiplyScalar(R).project(camera);
    if (proj.z > 1) { L.el.style.opacity = 0; continue; }
    const x = (proj.x * 0.5 + 0.5) * w, y = (-proj.y * 0.5 + 0.5) * h;
    L.el.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) translate(-50%,-50%)`;
    L.el.style.opacity = Math.min(1, (dot - 0.25) * 3).toFixed(2);
  }
}

/* ═══════════ CONTROLES (arrastrar · inercia · pellizco/rueda) ═══════════ */
const view = { yaw: 178, pitch: 24, fov: 62, vyaw: 0, vpitch: 0 }; // arranca mirando al sur
let dragging = false, px = 0, py = 0, moved = 0, downT = 0;
const pointers = new Map(); let pinchD = 0;

function applyCam() {
  view.pitch = Math.max(-8, Math.min(89, view.pitch));
  view.yaw = ((view.yaw % 360) + 360) % 360;
  camera.fov = view.fov; camera.updateProjectionMatrix();
  starU.uZ.value = Math.pow(62 / view.fov, 0.55);
  const d = vecFrom(view.yaw, view.pitch, 1);
  camera.lookAt(d);
  const dirs = ["N", "NE", "E", "SE", "S", "SO", "O", "NO"];
  $("compassDir").textContent = dirs[Math.round(view.yaw / 45) % 8];
}
canvas.addEventListener("pointerdown", (e) => {
  canvas.setPointerCapture(e.pointerId);
  pointers.set(e.pointerId, [e.clientX, e.clientY]);
  if (pointers.size === 1) { dragging = true; px = e.clientX; py = e.clientY; moved = 0; downT = performance.now(); view.vyaw = view.vpitch = 0; }
  if (pointers.size === 2) { const p = [...pointers.values()]; pinchD = Math.hypot(p[0][0] - p[1][0], p[0][1] - p[1][1]); }
});
canvas.addEventListener("pointermove", (e) => {
  if (!pointers.has(e.pointerId)) return;
  pointers.set(e.pointerId, [e.clientX, e.clientY]);
  if (pointers.size === 2) {
    const p = [...pointers.values()];
    const d = Math.hypot(p[0][0] - p[1][0], p[0][1] - p[1][1]);
    if (pinchD) { view.fov = Math.max(26, Math.min(95, view.fov * pinchD / d)); }
    pinchD = d; applyCam(); return;
  }
  if (!dragging) return;
  const dx = e.clientX - px, dy = e.clientY - py;
  moved += Math.abs(dx) + Math.abs(dy);
  const k = view.fov / 620;
  view.yaw -= dx * k; view.pitch += dy * k;
  view.vyaw = -dx * k; view.vpitch = dy * k;
  px = e.clientX; py = e.clientY; applyCam();
});
function endPointer(e) {
  pointers.delete(e.pointerId); pinchD = 0;
  if (pointers.size === 0) {
    dragging = false;
    if (moved < 9 && performance.now() - downT < 450) pick(e.clientX, e.clientY);
  }
}
canvas.addEventListener("pointerup", endPointer);
canvas.addEventListener("pointercancel", endPointer);
canvas.addEventListener("wheel", (e) => {
  e.preventDefault();
  view.fov = Math.max(26, Math.min(95, view.fov + e.deltaY * 0.045));
  applyCam();
}, { passive: false });

/* ── teclado: ↑ / + acerca · ↓ / − aleja · ← → giran ── */
let entered = false;
addEventListener("keydown", (e) => {
  if (!entered) return;
  if (![panel, booklet, help].every(p => p.classList.contains("hidden"))) return; // no interferir con paneles
  const zoomStep = 3.2, panStep = 4 * view.fov / 62;
  switch (e.key) {
    case "ArrowUp": case "+": case "=": view.fov = Math.max(26, view.fov - zoomStep); break;
    case "ArrowDown": case "-": case "_": view.fov = Math.min(95, view.fov + zoomStep); break;
    case "ArrowLeft": view.yaw -= panStep; break;
    case "ArrowRight": view.yaw += panStep; break;
    default: return;
  }
  e.preventDefault(); fly = null; applyCam();
});

/* ═══════════ SELECCIÓN DE CONSTELACIONES ═══════════ */
const conVecs = SKYDATA.cons.map(c => ({
  c, pts: c.seg.flat().map(p => vecFrom(p[0], p[1]).normalize())
}));
const ray = new THREE.Raycaster();
function pick(x, y) {
  ray.setFromCamera(new THREE.Vector2((x / innerWidth) * 2 - 1, -(y / innerHeight) * 2 + 1), camera);
  const dir = ray.ray.direction;
  let best = null, bd = Math.cos(THREE.MathUtils.degToRad(6.5));
  for (const { c, pts } of conVecs)
    for (const p of pts) { const d = p.dot(dir); if (d > bd) { bd = d; best = c; } }
  if (best) openConstellation(best.id);
}

/* ═══════════ CONTENIDO · Los nueve capítulos (adaptación al español del cuaderno) ═══════════ */
const CH = {
  Vir: { num: "I", latin: "Virgo", es: "La doncella de la justicia", story: [
    "Hace mucho tiempo, el mundo era un lugar sereno. Entre la gente caminaba una doncella bondadosa llamada Astrea: escuchaba, aconsejaba y procuraba siempre lo justo. Todos confiaban en su corazón tranquilo.",
    "Pero el mundo cambió: creció la codicia y se apagó la paz. Con el corazón roto, Astrea miró al cielo y se marchó en silencio, deseando que la gente recordara la bondad de antes. Los dioses, conmovidos, la colocaron entre las estrellas. Así Virgo brilla cada noche, recordándonos ser justos, ayudarnos unos a otros y no dejar de creer que la bondad mejora el mundo." ],
    astro: "Su estrella principal es Spica, a unos 250 años luz." },
  Cru: { num: "II", latin: "Crux", es: "La cruz que guía", story: [
    "Cuando la humanidad empezó a navegar océanos inmensos, buscó guía en las estrellas. En el hemisferio sur, cuatro luces brillantes dibujaron una pequeña cruz resplandeciente, como una brújula mágica pintada en el cielo.",
    "Muchos creyeron que era un regalo de los dioses para los viajeros: mientras otras estrellas parecían moverse, la cruz señalaba siempre el sur. Marineros y exploradores la siguieron por los mares, confiando en ella como en un faro celeste. Aun en las noches más oscuras, la Cruz del Sur permaneció firme, brillando con fuerza serena." ],
    astro: "Es la constelación más pequeña de las 88, y la más emblemática del cielo austral." },
  Cen: { num: "III", latin: "Centaurus", es: "El centauro noble", story: [
    "En tiempos de dioses y monstruos vivía un centauro distinto a todos: Quirón, sabio, gentil e inmortal. Mientras otros centauros cedían a la furia, él eligió enseñar a los hijos de los reyes bajo los árboles del monte Pelión. Sus alumnos fueron leyenda —Aquiles, Jasón, Hércules— y de él aprendieron no solo el combate, sino la medicina, la música y a leer las estrellas.",
    "El destino fue cruel: una flecha envenenada lo hirió sin remedio y, al no poder morir, quedó condenado al dolor eterno. Quirón tomó entonces una decisión generosa: entregó su inmortalidad para liberar a Prometeo. Conmovido, Zeus lo colocó entre las estrellas, inmortal de otra manera." ],
    astro: "Alberga a Alfa Centauri, el sistema estelar más cercano al Sol: 4,37 años luz." },
  Car: { num: "IV", latin: "Carina", es: "La nave estelar", story: [
    "Hace mucho, la nave más grandiosa jamás construida se llamó Argo, y surcó los mares en busca de un vellocino de oro. Su tripulación estaba llena de héroes y soñadores, pero fue la propia nave la que los llevó a salvo entre tormentas y luz de estrellas.",
    "Terminado el viaje, los dioses la honraron dividiéndola en tres partes celestes. La más fuerte fue la popa —la quilla, Carina—, que guardaba el corazón de la nave y el timón que la mantuvo firme. Los dioses la fijaron en lo alto del cielo austral y le regalaron a Canopus, una de las luces más brillantes de todas. Hoy Carina navega en silencio por los cielos, guiando aún a los viajeros." ],
    astro: "Canopus es la segunda estrella más brillante de todo el cielo nocturno." },
  Pav: { num: "V", latin: "Pavo", es: "El danzante del cielo", story: [
    "Hubo un tiempo en que el cielo era solo plata y oscuridad. Los dioses desearon color: algo brillante, audaz y hermoso. Llamaron entonces a un pavo real, el ave más deslumbrante de todas. Su nombre era Pavo, y sus plumas destellaban con todos los colores del mundo.",
    "A Pavo le encantaba danzar: abría su cola como un abanico de luz, giraba bajo la luna y esparcía estrellas como chispas. Cuando danzaba, el cielo se llenaba de azules, verdes y dorados. Maravillados, los dioses lo colocaron en el firmamento para que sus plumas colorearan la noche por siempre. En las noches claras, dicen, Pavo vuelve a danzar, sembrando belleza con cada paso." ],
    astro: "Esta noche brilla al sur de Cusco; su estrella principal se llama, precisamente, Peacock." },
  Tuc: { num: "VI", latin: "Tucana", es: "El ave silenciosa", story: [
    "En lo alto del tranquilo cielo austral vive un ave pequeña y secreta. No canta fuerte ni vuela en bandadas: se desliza con suavidad, con plumas como gemas y un pico con forma de flor. Su nombre es Tucana, el tucán, un ave tímida y vigilante hecha de estrellas.",
    "En los días de la creación del cielo, Tucana vivía en un bosque enjoyado donde los colores danzaban como lluvia. Amaba la paz y volaba al crepúsculo, cuando el mundo era suave y calmo. Cuando los dioses buscaron una criatura que trajera belleza al cielo silencioso, la eligieron a ella por su espíritu sereno. Desde entonces, Tucana observa desde lo alto, sin aletear jamás demasiado fuerte." ],
    astro: "Junto a ella se observa la Pequeña Nube de Magallanes, una galaxia vecina." },
  Dor: { num: "VII", latin: "Dorado", es: "El pez dorado", story: [
    "Bajo las olas del cielo nada un pez centelleante llamado Dorado, el Dorado. Hace mucho vivía en un mar de estrellas, cruzando la luz de la luna y el polvo estelar, con escamas que brillaban como monedas al sol.",
    "No era el pez más grande, pero sí el más veloz: perseguía cometas y danzaba con olas hechas de viento. Dicen que una vez guio a una estrella perdida de regreso a su lugar, nadando a su lado por lo más oscuro del cielo. Encantados por su rapidez y su brillo, los dioses la elevaron y la dejaron nadar por siempre en el espacio. Cuando la veas en el cielo del sur, sabrás que sigue nadando: brillante, veloz y libre." ],
    astro: "Esta noche asoma apenas sobre el horizonte sureste; alberga la Gran Nube de Magallanes." },
  CMa: { num: "VIII", latin: "Canis Major", es: "El gran perro", story: [
    "Hace mucho vivió un cazador poderoso llamado Orión, fuerte y sin miedo. Pero Orión nunca cazaba solo: a su lado iba un perro leal, el Gran Perro, veloz como el viento y de ojos agudos como el águila. Más que un ayudante, era su amigo más fiel; juntos cruzaron bosques, desiertos y montañas, enfrentando cada peligro lado a lado.",
    "Cuando Orión dormía bajo las estrellas, el Gran Perro velaba su sueño. Nunca pidió elogios: le bastaba estar junto a él. Su vínculo era de esos que no se rompen. Cuando el tiempo de Orión en la Tierra llegó a su fin, los dioses vieron la fuerza de esa amistad y supieron que un corazón tan leal no pertenecía a las sombras: los colocaron a ambos entre las estrellas." ],
    astro: "Su estrella Sirio es la más brillante de todo el cielo nocturno." },
  TrA: { num: "IX", latin: "Triangulum Australe", es: "El triángulo austral", story: [
    "Hace mucho, cuando el cielo nocturno aún tomaba forma, las estrellas necesitaban ayuda para encontrar su lugar. Algunas eran brillantes y audaces; otras danzaban en figuras de cisnes y osos. Pero en el profundo cielo del sur quedaba un rincón oscuro y silencioso, vacío y a la espera. Los dioses crearon entonces un pequeño triángulo perfecto de estrellas para señalar el camino.",
    "Aunque pequeño, tenía una labor importante: fue marca y faro donde pocos podían llegar. Los marineros lejos de casa lo usaron para gobernar sus naves, y los caminantes, para sentirse seguros bajo las estrellas. No ruge como un león ni corre como un perro: simplemente permanece firme, brillando con luz serena. Una figura diminuta con un propósito inmenso." ],
    astro: "Sus tres vértices —encabezados por Atria— se ven esta noche hacia el sur de Cusco." }
};
/* notas breves para otras constelaciones notables (solo astronomía) */
const NOTES = {
  Sgr: "El Arquero apunta hacia el corazón de la Vía Láctea: en esta zona se concentra el centro de nuestra galaxia, a unos 26 000 años luz.",
  Sco: "El Escorpión despliega su aguijón sobre el suroeste. Su corazón rojizo es Antares, una supergigante unas 700 veces más grande que el Sol.",
  Lyr: "La Lira porta a Vega, una de las estrellas más brillantes del cielo boreal, a solo 25 años luz.",
  Aql: "El Águila vuela por la Vía Láctea con Altair, una estrella que gira tan rápido que se achata en los polos.",
  Cyg: "El Cisne planea a lo largo de la Vía Láctea; su cola es Deneb, una supergigante lejana y luminosísima.",
  Cas: "Casiopea, la reina, roza esta noche el horizonte norte de Cusco con su inconfundible figura en W.",
  Peg: "El Caballo Alado galopa alto: su Gran Cuadrado es una de las figuras más fáciles de reconocer.",
  Aqr: "El Aguador cruza el cénit de Cusco esta noche, en la región del cielo llamada «el Mar».",
  Cap: "La Cabra Marina, mitad cabra y mitad pez, pasa casi exactamente sobre tu cabeza a esta hora.",
  Gru: "La Grulla extiende su cuello elegante por el sureste, con Alnair como su estrella principal.",
  PsA: "El Pez Austral bebe del agua del Aguador; su ojo solitario es Fomalhaut, a 25 años luz.",
  Oph: "El Portador de la Serpiente sostiene a Serpens, la única constelación dividida en dos partes.",
  Phe: "El Fénix, el ave que renace de sus cenizas, se eleva por el sureste del cielo cusqueño.",
  Eri: "El Río nace junto a Orión y serpentea hasta la brillante Achernar, «el fin del río».",
  Her: "Hércules se despide por el noroeste; en él habita el gran cúmulo globular M13.",
  And: "Andrómeda asoma al norte; en su figura se esconde la galaxia espiral más cercana a la nuestra."
};
const conById = {}; SKYDATA.cons.forEach(c => conById[c.id] = c);

/* ═══════════ PANELES ═══════════ */
const panel = $("panel"), booklet = $("booklet"), help = $("help");
function closeAll() { [panel, booklet, help].forEach(p => p.classList.add("hidden")); }
function openConstellation(id, fromBooklet = false) {
  const ch = CH[id], c = conById[id];
  closeAll();
  $("panelKicker").textContent = ch ? `Capítulo ${ch.num} · The Night Sky` : "Constelación";
  $("panelTitle").textContent = ch ? ch.latin : (c ? c.name : id);
  $("panelSub").textContent = ch ? ch.es : (c && c.es ? c.es : "");
  let html = "";
  if (ch) {
    html += c ? `<span class="panel-tag">En el cielo esta noche</span>`
              : `<span class="panel-tag">Bajo el horizonte a las 22:00</span>`;
    html += ch.story.map(p => `<p>${p}</p>`).join("");
    html += `<p class="fine">${ch.astro}${c ? "" : " Aunque no se ve en esta toma, forma parte del cuaderno que acompaña al cuadro."}</p>`;
  } else {
    html += `<p>${NOTES[id] || "Una de las 88 constelaciones oficiales, visible sobre Cusco en esta toma del cielo."}</p>`;
    html += `<p class="fine">Sobre el horizonte de Cusco · 16 SEP 2025 · 22:00</p>`;
  }
  $("panelBody").innerHTML = html;
  panel.classList.remove("hidden");
  if (c && fromBooklet) flyTo(c.c[0], c.c[1], 46);
}
$("panelClose").onclick = () => panel.classList.add("hidden");
$("helpBtn").onclick = () => { closeAll(); help.classList.remove("hidden"); };
$("helpClose").onclick = () => help.classList.add("hidden");
$("bookletBtn").onclick = () => { closeAll(); booklet.classList.remove("hidden"); };
$("bookletClose").onclick = () => booklet.classList.add("hidden");
/* lista del cuaderno */
{
  const ul = $("bookletList");
  for (const id of ["Vir", "Cru", "Cen", "Car", "Pav", "Tuc", "Dor", "CMa", "TrA"]) {
    const ch = CH[id], up = !!conById[id];
    const li = document.createElement("li");
    li.innerHTML = `<button aria-label="Capítulo ${ch.num}: ${ch.latin}">
      <span class="booklet-num">${ch.num}</span>
      <span class="booklet-name">${ch.latin} · <em>${ch.es}</em></span>
      <span class="booklet-state ${up ? "up" : ""}">${up ? "En el cielo" : "Bajo el horizonte"}</span></button>`;
    li.querySelector("button").onclick = () => openConstellation(id, true);
    ul.appendChild(li);
  }
}

/* ═══════════ VUELO DE CÁMARA (easing) ═══════════ */
let fly = null;
function flyTo(az, alt, fov = 50, dur = 2200) {
  let dy = ((az - view.yaw + 540) % 360) - 180; // camino más corto
  fly = { t: 0, dur: REDUCED ? 1 : dur, y0: view.yaw, y1: view.yaw + dy, p0: view.pitch, p1: Math.min(alt, 86), f0: view.fov, f1: fov };
}
const easeIO = (t) => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

/* ═══════════ TOUR GUIADO ═══════════ */
const tourBtn = $("tourBtn"), tourPanel = $("tourPanel");
function conC(id) { const c = conById[id]; return c ? c.c : [180, 30]; }
function starC(n) { const s = SKYDATA.names.find(s => s.n === n); return s ? [s.az, s.alt] : [180, 30]; }
const TOUR = [
  { t: "Esa primera vez…", x: () => conC("Cap"), fov: 72, txt: "Bienvenido al cielo de Cusco tal como lucía el 16 de septiembre de 2025 a las 22:00. Cada estrella está en el lugar exacto de esa noche: la misma toma del cuadro. Mira hacia arriba: la Cabra Marina y el Aguador cruzan el cénit." },
  { t: "El corazón de la galaxia", x: () => conC("Sgr"), fov: 48, txt: "Hacia el oeste, Sagittarius —el Arquero— señala el centro de la Vía Láctea. Esa franja luminosa que atraviesa el cielo es el disco de nuestra propia galaxia, visto desde dentro." },
  { t: "Antares, el corazón rojo", x: () => starC("Antares"), fov: 42, txt: "El Escorpión desciende con su aguijón curvado. Su corazón es Antares, una supergigante roja tan enorme que, puesta en el lugar del Sol, engulliría la órbita de Marte." },
  { t: "Pavo, el danzante", x: () => conC("Pav"), fov: 44, txt: "Capítulo V del cuaderno: el pavo real que coloreó la noche. Su estrella principal se llama Peacock y brilla plenamente sobre el sur de Cusco. Toca sus líneas doradas para leer su historia completa." },
  { t: "Tucana, el ave silenciosa", x: () => conC("Tuc"), fov: 44, txt: "Capítulo VI: el tucán tímido y vigilante. Muy cerca de sus estrellas se encuentra la Pequeña Nube de Magallanes, una galaxia satélite de la nuestra." },
  { t: "El Triángulo Austral", x: () => conC("TrA"), fov: 42, txt: "Capítulo IX: tres estrellas firmes que guiaron a marineros lejos de casa. Atria, la más brillante, encabeza esta figura diminuta de propósito inmenso." },
  { t: "Dorado asoma", x: () => conC("Dor"), fov: 46, txt: "Capítulo VII: el pez dorado apenas asoma sobre el horizonte sureste, nadando hacia lo alto conforme avanza la noche. En su territorio vive la Gran Nube de Magallanes." },
  { t: "Fomalhaut y la Grulla", x: () => starC("Fomalhaut"), fov: 46, txt: "Muy alto hacia el sureste brilla Fomalhaut, el ojo solitario del Pez Austral, a solo 25 años luz. Bajo él, la Grulla estira su cuello elegante con Alnair al frente." },
  { t: "Tres luces del noroeste", x: () => starC("Altair"), fov: 62, txt: "Hacia el noroeste, tres estrellas brillantes forman un gran triángulo: Vega, Deneb y Altair. Desde Perú se observan invertidas respecto al hemisferio norte: el mismo cielo, otro punto de vista." },
  { t: "Un cielo para recordar", x: () => conC("Aqr"), fov: 68, txt: "Este es el cielo de esa primera vez: 13.5320° S, 71.9675° W. Las estrellas seguirán girando, pero esta toma queda guardada aquí — y en el cuadro — para siempre. Sigue explorando: cada línea tiene una historia." }
];
let tourI = -1;
function tourShow(i) {
  tourI = i;
  const s = TOUR[i], [az, alt] = s.x();
  $("tourStep").textContent = `${i + 1} / ${TOUR.length}`;
  $("tourTitle").textContent = s.t;
  $("tourText").textContent = s.txt;
  $("tourProgress").style.width = ((i + 1) / TOUR.length * 100) + "%";
  $("tourPrev").style.visibility = i === 0 ? "hidden" : "visible";
  $("tourNext").textContent = i === TOUR.length - 1 ? "Finalizar" : "Siguiente ›";
  flyTo(az, Math.max(alt, 6), s.fov);
}
tourBtn.onclick = () => { closeAll(); tourBtn.classList.add("hidden"); tourPanel.classList.remove("hidden"); tourShow(0); };
$("tourNext").onclick = () => tourI < TOUR.length - 1 ? tourShow(tourI + 1) : endTour();
$("tourPrev").onclick = () => tourI > 0 && tourShow(tourI - 1);
$("tourExit").onclick = endTour;
function endTour() { tourPanel.classList.add("hidden"); tourBtn.classList.remove("hidden"); tourI = -1; }

/* ═══════════ INTRO ═══════════ */
{
  const holder = document.querySelector(".intro-stars");
  for (let i = 0; i < 44; i++) {
    const s = document.createElement("i");
    s.style.left = Math.random() * 100 + "%"; s.style.top = Math.random() * 100 + "%";
    s.style.animationDelay = (Math.random() * 3.4) + "s";
    s.style.width = s.style.height = (Math.random() * 1.6 + 1) + "px";
    holder.appendChild(s);
  }
}
$("enterBtn").onclick = () => {
  entered = true;
  $("intro").classList.add("away");
  ["topbar", "compass", "tourBtn"].forEach(id => $(id).classList.remove("hidden"));
  flyTo(184, 38, 62, 3400); // panorámica inicial hacia el sur
};

/* ═══════════ BUCLE ═══════════ */
function resize() {
  renderer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
}
addEventListener("resize", resize); resize(); applyCam();

let paused = false;
document.addEventListener("visibilitychange", () => paused = document.hidden);
const clock = new THREE.Clock();
function frame() {
  requestAnimationFrame(frame);
  if (paused) return;
  const dt = Math.min(clock.getDelta(), 0.05);
  if (!REDUCED) starU.uT.value += dt;
  if (fly) {
    fly.t += dt * 1000;
    const k = easeIO(Math.min(1, fly.t / fly.dur));
    view.yaw = fly.y0 + (fly.y1 - fly.y0) * k;
    view.pitch = fly.p0 + (fly.p1 - fly.p0) * k;
    view.fov = fly.f0 + (fly.f1 - fly.f0) * k;
    if (fly.t >= fly.dur) fly = null;
    applyCam();
  } else if (!dragging && !REDUCED && (Math.abs(view.vyaw) > 0.002 || Math.abs(view.vpitch) > 0.002)) {
    view.yaw += view.vyaw; view.pitch += view.vpitch;
    view.vyaw *= 0.94; view.vpitch *= 0.94;
    applyCam();
  }
  updateLabels();
  renderer.render(scene, camera);
}
frame();
