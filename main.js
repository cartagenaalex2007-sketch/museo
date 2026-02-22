import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

// ---- Configuración Principal ----
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050508);
scene.fog = new THREE.FogExp2(0x050508, 0.008);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);

// REUBICACIÓN DE CÁMARA (Lobby Seguro y Orientado)
camera.position.set(-13, 1.7, 50); // Mantenemos el punto inicial estricto que pidió el usuario
camera.lookAt(new THREE.Vector3(-30, 1.7, 0)); // Mirar hacia la galería principal (Mesopotamia) para no ver una pared

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
document.body.appendChild(renderer.domElement);

const controls = new PointerLockControls(camera, document.body);
const startButton = document.getElementById('startButton');
const menu = document.getElementById('menu');
const crosshair = document.getElementById('crosshair');
const backButton = document.getElementById('backButton');
const infoPanel = document.getElementById('infoPanel');
const infoTitle = document.getElementById('infoTitle');
const infoAuthor = document.getElementById('infoAuthor');
const infoYear = document.getElementById('infoYear');
const infoDesc = document.getElementById('infoDesc');

let isZooming = false;
let cameraTargetPos = new THREE.Vector3();
let cameraTargetQuat = new THREE.Quaternion();
let cameraPreZoomPos = new THREE.Vector3();
let cameraPreZoomQuat = new THREE.Quaternion();

startButton.addEventListener('click', () => { controls.lock(); });

controls.addEventListener('lock', () => {
    menu.style.display = 'none';
    if (!isZooming) crosshair.style.display = 'block';
});
controls.addEventListener('unlock', () => {
    if (!isZooming && isZooming !== 'out') {
        menu.style.display = 'flex';
        crosshair.style.display = 'none';
        infoPanel.style.display = 'none';
    }
});

// ---- Texturas Procedurales ----
function createMarbleTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 1024; canvas.height = 1024;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#f0f0f0'; ctx.fillRect(0, 0, 1024, 1024);
    ctx.strokeStyle = '#e0e0e0'; ctx.lineWidth = 4; ctx.lineCap = 'round';
    for (let i = 0; i < 50; i++) {
        ctx.beginPath(); ctx.moveTo(Math.random() * 1024, Math.random() * 1024);
        ctx.bezierCurveTo(Math.random() * 1024, Math.random() * 1024, Math.random() * 1024, Math.random() * 1024, Math.random() * 1024, Math.random() * 1024);
        ctx.stroke();
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(15, 15);
    return tex;
}

function createStoneTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 512;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#dcd5c9'; ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 5000; i++) {
        ctx.fillStyle = Math.random() > 0.5 ? '#cfc7ba' : '#e3dcd1';
        ctx.fillRect(Math.random() * 512, Math.random() * 512, 3, 3);
    }
    ctx.strokeStyle = '#bbaea0'; ctx.lineWidth = 2;
    for (let i = 0; i <= 512; i += 64) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 512); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(512, i); ctx.stroke();
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(8, 8);
    return tex;
}

function createWoodTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 512;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#3a2318'; ctx.fillRect(0, 0, 512, 512);
    ctx.fillStyle = '#2a150e';
    for (let i = 0; i < 300; i++) {
        ctx.globalAlpha = Math.random() * 0.5 + 0.1;
        ctx.fillRect(0, Math.random() * 512, 512, Math.random() * 4);
    }
    return new THREE.CanvasTexture(canvas);
}

function createGoldTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 256;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createLinearGradient(0, 0, 256, 256);
    grad.addColorStop(0, '#bf953f'); grad.addColorStop(0.5, '#fcf6ba'); grad.addColorStop(1, '#b38728');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, 256, 256);
    return new THREE.CanvasTexture(canvas);
}

// ==== ILUMINACIÓN GLOBAL (Evitar pantalla negra) ====
// Intensidad subida sustancialmente
const ambientLight = new THREE.AmbientLight(0xfff5e6, 1.5);
scene.add(ambientLight);

const sunLight = new THREE.DirectionalLight(0xfffff0, 1.5);
sunLight.position.set(-10, 20, 10);
sunLight.target.position.set(0, 0, 0);
sunLight.castShadow = true;
sunLight.shadow.mapSize.width = 2048; sunLight.shadow.mapSize.height = 2048;
sunLight.shadow.camera.left = -30; sunLight.shadow.camera.right = 30;
sunLight.shadow.camera.top = 30; sunLight.shadow.camera.bottom = -30;
scene.add(sunLight); scene.add(sunLight.target);

// ---- Materiales y Suelo Mate ----
const colliders = [];
const cameraLEDs = [];
const ceilingHeight = 7;

// Suelo del Museo (Mármol Mate absoluto, CERO reflexiones)
const floorGeo = new THREE.PlaneGeometry(120, 120);
const floorMat = new THREE.MeshStandardMaterial({
    map: createMarbleTexture(),
    color: 0xffffff,
    roughness: 0.85,
    metalness: 0.0
});
const floorMesh = new THREE.Mesh(floorGeo, floorMat);
floorMesh.rotation.x = -Math.PI / 2; floorMesh.position.y = 0.0;
floorMesh.position.z = 5.0; // Centrado exacto alineado con las paredes
floorMesh.receiveShadow = true;
scene.add(floorMesh);

// Suelo del Courtyard (Piedra Clara)
const yardGeo = new THREE.PlaneGeometry(28, 28);
const yardMat = new THREE.MeshStandardMaterial({ map: createStoneTexture(), roughness: 0.9, metalness: 0.0 });
const yardMesh = new THREE.Mesh(yardGeo, yardMat);
yardMesh.rotation.x = -Math.PI / 2; yardMesh.position.set(0, 0.01, 0);
yardMesh.receiveShadow = true;
scene.add(yardMesh);

// Techo General
const ceilGeo = new THREE.PlaneGeometry(120, 120);
const ceilMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 1.0 });
const ceilMesh = new THREE.Mesh(ceilGeo, ceilMat);
ceilMesh.rotation.x = Math.PI / 2; ceilMesh.position.y = ceilingHeight;
ceilMesh.position.z = 5.0; // Centrado exacto alineado con las paredes
scene.add(ceilMesh);

// ---- Constructores de Arquitectura ----
const wallMat = new THREE.MeshStandardMaterial({ color: 0xeae6df, roughness: 0.9 });
const baseMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.8 });

function buildWall(x, z, w, d) {
    const h = ceilingHeight + 0.2; // Estirado para tapar huecos en techo/suelo
    const wall = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
    wall.position.set(x, ceilingHeight / 2, z);
    wall.receiveShadow = true; wall.castShadow = true;
    scene.add(wall);
    colliders.push(new THREE.Box3().setFromObject(wall));

    const baseW = w > d ? w : w + 0.1;
    const baseD = d > w ? d : d + 0.1;
    const base = new THREE.Mesh(new THREE.BoxGeometry(baseW, 0.2, baseD), baseMat);
    base.position.set(x, 0.1, z);
    scene.add(base);
}

// Vidrio Transparente Perfecto 
// ELIMINADO REFLECTOR, SIMPLICIDAD GARANTIZADA
function buildGlass(x, z, w, d) {
    const glassMat = new THREE.MeshStandardMaterial({
        color: 0xffffff, transparent: true, opacity: 0.2,
        roughness: 0.1, metalness: 0.1, side: THREE.DoubleSide, depthWrite: false
    });
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.7, metalness: 0.8 });

    const group = new THREE.Group();
    const glassH = ceilingHeight - 0.4 + 0.1; // Estirado hacia el techo
    const glass = new THREE.Mesh(new THREE.BoxGeometry(w, glassH, d), glassMat);
    glass.position.y = (ceilingHeight - 0.4) / 2 + 0.45; group.add(glass);

    const frameBase = new THREE.Mesh(new THREE.BoxGeometry(w + 0.1, 0.4, d + 0.1), frameMat);
    frameBase.position.y = 0.2; group.add(frameBase);

    const frameH = ceilingHeight + 0.2;
    if (w > d) {
        for (let px = -w / 2; px <= w / 2; px += 4) {
            const m = new THREE.Mesh(new THREE.BoxGeometry(0.2, frameH, d + 0.15), frameMat);
            m.position.set(px, ceilingHeight / 2, 0); group.add(m);
        }
    } else {
        for (let pz = -d / 2; pz <= d / 2; pz += 4) {
            const m = new THREE.Mesh(new THREE.BoxGeometry(w + 0.15, frameH, 0.2), frameMat);
            m.position.set(0, ceilingHeight / 2, pz); group.add(m);
        }
    }

    group.position.set(x, 0, z); scene.add(group);
    colliders.push(new THREE.Box3().setFromObject(glass));
}

function createDoorwayWall(x, z, length, thickness, isHorizontal) {
    const gap = 8;
    const sideLen = (length - gap) / 2;

    if (isHorizontal) {
        buildWall(x - length / 2 + sideLen / 2, z, sideLen, thickness);
        buildWall(x + length / 2 - sideLen / 2, z, sideLen, thickness);
        const lintel = new THREE.Mesh(new THREE.BoxGeometry(gap, 1.5 + 0.1, thickness), wallMat);
        lintel.position.set(x, ceilingHeight - 0.75 + 0.05, z); scene.add(lintel);
    } else {
        buildWall(x, z - length / 2 + sideLen / 2, thickness, sideLen);
        buildWall(x, z + length / 2 - sideLen / 2, thickness, sideLen);
        const lintel = new THREE.Mesh(new THREE.BoxGeometry(thickness, 1.5 + 0.1, gap), wallMat);
        lintel.position.set(x, ceilingHeight - 0.75 + 0.05, z); scene.add(lintel);
    }
}

// Planta del Oriental Institute
buildGlass(0, -14, 28, 0.5); buildGlass(0, 14, 28, 0.5); buildGlass(14, 0, 0.5, 28); buildGlass(-14, 0, 0.5, 28);

// Muros exteriores perfectamente sellados en las esquinas (-45 a 45)
buildWall(0, -45, 92, 2); buildWall(0, 55, 92, 2);
buildWall(-45, 5, 2, 102); buildWall(45, 5, 2, 102);

// ---- NUEVA PARED DIVISORIA LONGITUDINAL ----
// Construida perpendicular en X: -12 (para no dejar atrapada a la cámara en X: -13).
// Se extiende a lo largo de Z desde 50 (donde inicia la cámara) hasta Z: 25 (el final del pasillo/patio).
const paredGeo = new THREE.BoxGeometry(0.5, 7, 25); // Grosor 0.5, Altura 7, Largo 25 en Z
const paredDivisoria = new THREE.Mesh(paredGeo, wallMat);
paredDivisoria.position.set(-12, 3.5, 37.5); // Centro entre Z=25 y Z=50
paredDivisoria.receiveShadow = true;
paredDivisoria.castShadow = true;
scene.add(paredDivisoria);
colliders.push(new THREE.Box3().setFromObject(paredDivisoria));

// ---- REUBICACIÓN MANUAL DE CARTELES LÓGICOS ----
function createExplicitSign(text, bgColor, x, y, z, rotY) {
    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = bgColor; ctx.fillRect(0, 0, 512, 128);
    ctx.fillStyle = '#ffffff'; ctx.font = 'bold 80px sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(text, 256, 64);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    const mat = new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: 0.8, roughness: 0.2 });
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(3, 0.75), mat);
    sign.position.set(x, y, z);
    sign.rotation.y = rotY;
    scene.add(sign);
}

// INGRESO centrado sobre el arco de entrada al patio (Z: 26)
createExplicitSign('INGRESO', '#0b1bf7ff', 0, 4.5, 26 + 1.01, 0);

// SALIDA centrado sobre el arco superior del patio mirando hacia las galerías (Z: 20)
createExplicitSign('SALIDA', '#f8070767', 0, 4.5, 20 - 1.01, Math.PI);

// Pasillos norte verticales (Z=-14 a -45)
createDoorwayWall(-14, -29.5, 31, 2, false);
createDoorwayWall(14, -29.5, 31, 2, false);

// Divisiones horizontales en Z=20 que enmarcan las galerías
createDoorwayWall(-29.5, 20, 31, 2, true);
createDoorwayWall(29.5, 20, 31, 2, true);

// Muros verticales cortos para cerrar el centro interior (del patio a las puertas traseras)
buildWall(-14, 20, 2, 12);
buildWall(14, 20, 2, 12);

// Puerta central de ingreso al Patio
createDoorwayWall(0, 26, 28, 2, true);

// ---- Equipamiento de Seguridad y Decoración ----
function createSecurityCamera(x, y, z, rotY) {
    const group = new THREE.Group();
    const bodyM = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 });
    const lensM = new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.1 });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.4, 16), bodyM);
    body.rotation.x = Math.PI / 2;
    const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.1, 16), lensM);
    lens.position.y = 0.2; body.add(lens);

    const ledMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const led = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 8), ledMat);
    led.position.set(0, 0.25, 0.08); body.add(led);
    cameraLEDs.push(ledMat);

    body.rotation.x = Math.PI / 6; group.add(body);
    group.position.set(x, y, z); group.rotation.y = rotY; scene.add(group);
}
createSecurityCamera(-33, 6.5, 43, -Math.PI / 4);
createSecurityCamera(-33, 6.5, 10, -Math.PI / 4);
createSecurityCamera(33, 6.5, 43, Math.PI / 4);

const fountain = new THREE.Mesh(new THREE.CylinderGeometry(4, 4, 1.2, 8), new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.8 }));
fountain.position.set(0, 0.6, 0); fountain.castShadow = true; scene.add(fountain);
colliders.push(new THREE.Box3().setFromObject(fountain));
const water = new THREE.Mesh(new THREE.CylinderGeometry(3.6, 3.6, 0.1, 8), new THREE.MeshStandardMaterial({ color: 0x2266aa, transparent: true, opacity: 0.8, roughness: 0.1 }));
water.position.set(0, 1.1, 0); scene.add(water);

// ---- Stanchions (Cuerdas de Seguridad) para todas las obras ----
function createStanchionSystem(p1, p2) {
    const stMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.8, roughness: 0.2 });
    function makePost(pos) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.9, 16), stMat); post.position.copy(pos); post.position.y = 0.45; post.castShadow = true; scene.add(post);
        const base = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.05, 32), stMat); base.position.copy(pos); base.position.y = 0.025; base.castShadow = true; scene.add(base);
    }
    makePost(p1); makePost(p2);
    const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(p1.x, 0.85, p1.z), new THREE.Vector3((p1.x + p2.x) / 2, 0.4, (p1.z + p2.z) / 2), new THREE.Vector3(p2.x, 0.85, p2.z)]);
    const ropeMat = new THREE.MeshStandardMaterial({ color: 0xaa0000, roughness: 0.9 });
    const rope = new THREE.Mesh(new THREE.TubeGeometry(curve, 20, 0.04, 8, false), ropeMat);
    rope.castShadow = true; scene.add(rope);
    const ropeBox = new THREE.Box3().setFromPoints([p1, p2]); ropeBox.expandByScalar(0.2); ropeBox.max.y = 1.0;
    colliders.push(ropeBox);
}

// ==== ESCULTURAS Y OBJETOS 3D COMPUESTOS ====
const stoneMat = new THREE.MeshStandardMaterial({ color: 0xbdb9a6, roughness: 0.9 });
const darkStoneMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.8 });
const goldM = new THREE.MeshStandardMaterial({ map: createGoldTexture(), metalness: 0.8, roughness: 0.3 });

// 1. Lamassu Artificial (Mesopotamia)
function buildLamassu() {
    const group = new THREE.Group();
    const base = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.5, 2.5), stoneMat); base.position.y = 0.25; group.add(base);
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.5, 2.0), stoneMat); body.position.y = 1.25; group.add(body);
    const wingLeft = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.6, 1.8), stoneMat); wingLeft.position.set(-0.7, 1.5, 0); group.add(wingLeft);
    const wingRight = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.6, 1.8), stoneMat); wingRight.position.set(0.7, 1.5, 0); group.add(wingRight);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.4, 16, 16), stoneMat); head.position.set(0, 2.3, 1.0); group.add(head);

    group.position.set(-29, 0, -18); group.rotation.y = Math.PI / 2; scene.add(group);

    group.castShadow = true; colliders.push(new THREE.Box3().setFromObject(group));
    createStanchionSystem(new THREE.Vector3(-27, 0, -21), new THREE.Vector3(-27, 0, -15));
}
buildLamassu();

// 2. Coloso de Tutankamón Artificial (Egipto)
function buildTutankhamun() {
    const group = new THREE.Group();
    const pedestal = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.0, 1.5), darkStoneMat); pedestal.position.y = 0.5; group.add(pedestal);
    const legs = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.8, 0.6), darkStoneMat); legs.position.y = 1.9; group.add(legs);
    const torso = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.4, 0.6), darkStoneMat); torso.position.y = 3.5; group.add(torso);
    const head = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.45, 0.8, 16), darkStoneMat); head.position.y = 4.6; group.add(head);
    const crown = new THREE.Mesh(new THREE.ConeGeometry(0.6, 0.8, 16), goldM); crown.position.y = 5.2; group.add(crown);

    group.position.set(29, 0, -30); scene.add(group);

    colliders.push(new THREE.Box3().setFromObject(group));
    createStanchionSystem(new THREE.Vector3(26, 0, -27), new THREE.Vector3(32, 0, -27));
}
buildTutankhamun();

// 3. Vitrinas de Cristal puramente transparente con Reliquias
function buildDisplayCases() {
    const caseGlassMat = new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.2, roughness: 0.1, side: THREE.DoubleSide, depthWrite: false });
    const caseBaseMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
    const positions = [[-29, 0], [-29, -10]];

    positions.forEach(pos => {
        const group = new THREE.Group();
        const base = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.0, 1.5), caseBaseMat); base.position.y = 0.5; group.add(base);
        const glass = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.0, 1.4), caseGlassMat); glass.position.y = 1.5; group.add(glass);
        const pot = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 16), new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 1.0 }));
        pot.position.set(-0.2, 1.2, 0); pot.scale.y = 1.5; group.add(pot);
        const tablet = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.05, 0.4), new THREE.MeshStandardMaterial({ color: 0x6e6e6e, roughness: 0.9 }));
        tablet.position.set(0.3, 1.025, 0.2); tablet.rotation.y = 0.4; group.add(tablet);
        const pLight = new THREE.PointLight(0xffeedd, 0.8, 2); pLight.position.set(0, 1.8, 0); group.add(pLight);
        group.position.set(pos[0], 0, pos[1]); scene.add(group); colliders.push(new THREE.Box3().setFromObject(base));
    });
}
buildDisplayCases();

// ==== CARGAR MIS FOTOS AQUÍ ====
const myArtworks = [
    // MESOPOTAMIA (Pasillo Oeste) - Pared está en X: -45. Moviendo el cuadro a X: -43.8 para que sobresalga.
    { id: 1, desc: "Collar artesanal dorado de múltiples hilos con detalles en coral.", title: "Collar Dorado", author: "Bordados Clarita", year: "2024", file: "assets/accesorio_n.jpg", w: 2.2, h: 3.0, pos: [-43.8, 2.8, -10], rotY: Math.PI / 2, norm: [1, 0, 0] },
    { id: 2, desc: "Elegantes alpargatas negras con cintas ajustables y suela de yute.", title: "Alpargatas Negras", author: "Bordados Clarita", year: "2024", file: "assets/calzado_n.jpg", w: 3.0, h: 3.0, pos: [-43.8, 2.8, 5], rotY: Math.PI / 2, norm: [1, 0, 0] },

    // EGIPTO (Pasillo Este) - Pared está en X: 45. Moviendo a X: 43.8
    { id: 3, desc: "Conjunto tradicional con falda y blusa bordada a mano con motivos florales.", title: "Conjunto Floral Azul", author: "Bordados Clarita", year: "2024", file: "assets/azul_n.jpg", w: 3.3, h: 2.8, pos: [43.8, 2.8, -10], rotY: -Math.PI / 2, norm: [-1, 0, 0] },
    { id: 4, desc: "Conjunto coral tradicional con falda naranja y detalles bordados decorativos.", title: "Conjunto Floral Naranja", author: "Bordados Clarita", year: "2024", file: "assets/anaranjado_n.jpg", w: 3.2, h: 2.8, pos: [43.8, 2.8, 5], rotY: -Math.PI / 2, norm: [-1, 0, 0] },

    // LOBBY PRINCIPAL (Fondo) - Pared está en Z: 55. Moviendo a Z: 53.8
    { id: 5, desc: "Promoción especial de Black Days para camisas bordadas exclusivas.", title: "Black Days Promo", author: "Bordados Clarita", year: "2024", file: "assets/camisa_n.jpg", w: 2.5, h: 3.0, pos: [0, 2.8, 53.8], rotY: Math.PI, norm: [0, 0, -1] }
];

const woodTex = createWoodTexture();
const textureLoader = new THREE.TextureLoader();

myArtworks.forEach(conf => {
    // ==== Carga de Textura con Fallback ====
    const solidFallbackMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.6 });
    const canvasMesh = new THREE.Mesh(new THREE.BoxGeometry(conf.w, conf.h, 0.05), solidFallbackMat);
    canvasMesh.position.z = 0.05; // Ajuste para que sobresalga del paspartú

    // Carga real de imágenes activada
    textureLoader.load(
        conf.file,
        (loadedTex) => {
            loadedTex.colorSpace = THREE.SRGBColorSpace;
            canvasMesh.material = new THREE.MeshStandardMaterial({ map: loadedTex, roughness: 0.4 });
            canvasMesh.material.needsUpdate = true;
        },
        undefined,
        (err) => { console.warn(`Imágen no encontrada: ${conf.file}. Asegúrese de guardarla en la carpeta assets.`); }
    );

    // ==== MARCO ELEGANTE DEFINITIVO (Paspartú + Oro) ====
    const frameMat = goldM; // Marco exterior dorado de lujo
    const passMat = new THREE.MeshStandardMaterial({ color: 0xfdfdfd, roughness: 1.0 }); // Paspartú blanco mate
    const frameThick = 0.15; // Grosor del marco
    const passThick = 0.25; // Ancho del paspartú blanco
    const depth = 0.15;
    const passDepth = 0.04;

    const frameGrp = new THREE.Group();

    // 1. Paspartú (Borde Blanco interior estilo galería)
    const pt = new THREE.Mesh(new THREE.BoxGeometry(conf.w + passThick * 2, passThick, passDepth), passMat); pt.position.set(0, conf.h / 2 + passThick / 2, 0); frameGrp.add(pt);
    const pb = new THREE.Mesh(new THREE.BoxGeometry(conf.w + passThick * 2, passThick, passDepth), passMat); pb.position.set(0, -conf.h / 2 - passThick / 2, 0); frameGrp.add(pb);
    const pl = new THREE.Mesh(new THREE.BoxGeometry(passThick, conf.h, passDepth), passMat); pl.position.set(-conf.w / 2 - passThick / 2, 0, 0); frameGrp.add(pl);
    const pr = new THREE.Mesh(new THREE.BoxGeometry(passThick, conf.h, passDepth), passMat); pr.position.set(conf.w / 2 + passThick / 2, 0, 0); frameGrp.add(pr);

    // 2. Marco Exterior (Oro macizo)
    const outW = conf.w + (passThick * 2);
    const outH = conf.h + (passThick * 2);
    const t = new THREE.Mesh(new THREE.BoxGeometry(outW + frameThick * 2, frameThick, depth), frameMat); t.position.set(0, outH / 2 + frameThick / 2, depth / 2 - passDepth / 2); frameGrp.add(t);
    const b = new THREE.Mesh(new THREE.BoxGeometry(outW + frameThick * 2, frameThick, depth), frameMat); b.position.set(0, -outH / 2 - frameThick / 2, depth / 2 - passDepth / 2); frameGrp.add(b);
    const l = new THREE.Mesh(new THREE.BoxGeometry(frameThick, outH, depth), frameMat); l.position.set(-outW / 2 - frameThick / 2, 0, depth / 2 - passDepth / 2); frameGrp.add(l);
    const r = new THREE.Mesh(new THREE.BoxGeometry(frameThick, outH, depth), frameMat); r.position.set(outW / 2 + frameThick / 2, 0, depth / 2 - passDepth / 2); frameGrp.add(r);

    const artGrp = new THREE.Group();
    artGrp.add(canvasMesh, frameGrp);
    artGrp.position.set(...conf.pos); artGrp.rotation.y = conf.rotY;

    artGrp.userData = { isArtwork: true, normal: new THREE.Vector3(...conf.norm), bounds: conf, desc: conf.desc, title: conf.title, author: conf.author, year: conf.year };
    canvasMesh.userData = artGrp.userData;
    scene.add(artGrp);

    const spot = new THREE.SpotLight(0xfffaec, 3.0);
    const offset = new THREE.Vector3(...conf.norm).multiplyScalar(2.0);
    spot.position.set(conf.pos[0] + offset.x, ceilingHeight - 0.5, conf.pos[2] + offset.z);
    spot.target = canvasMesh; spot.angle = Math.PI / 6; spot.penumbra = 0.5; spot.castShadow = true;
    scene.add(spot);

    const stX = conf.pos[0] + offset.x * 0.9; const stZ = conf.pos[2] + offset.z * 0.9;
    let p1, p2;
    if (conf.norm[0] !== 0) { p1 = new THREE.Vector3(stX, 0, stZ - 2); p2 = new THREE.Vector3(stX, 0, stZ + 2); }
    else { p1 = new THREE.Vector3(stX - 2, 0, stZ); p2 = new THREE.Vector3(stX + 2, 0, stZ); }
    createStanchionSystem(p1, p2);
});
// ===============================================

// ---- Raycast (Click & Hover) ----
const raycaster = new THREE.Raycaster();
document.addEventListener('mousedown', (e) => {
    if (controls.isLocked && !isZooming && menu.style.display === 'none') {
        raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
        const intersects = raycaster.intersectObjects(scene.children, true);
        const art = intersects.find(i => i.object.userData.isArtwork);
        if (art && art.distance < 12) zoomToArtwork(art.object);
    }
});

function zoomToArtwork(mesh) {
    if (isZooming) return;
    isZooming = true;
    const data = mesh.userData;
    cameraPreZoomPos.copy(camera.position); cameraPreZoomQuat.copy(camera.quaternion);
    const norm = data.normal;
    cameraTargetPos.copy(mesh.parent.position).addScaledVector(norm, 2.5);
    cameraTargetPos.y = mesh.parent.position.y;
    cameraTargetQuat.setFromRotationMatrix(new THREE.Matrix4().lookAt(cameraTargetPos, mesh.parent.position, new THREE.Vector3(0, 1, 0)));

    infoTitle.innerText = data.title;
    infoAuthor.innerText = data.author;
    infoYear.innerText = data.year;
    infoDesc.innerText = data.desc;

    controls.unlock(); crosshair.style.display = 'none'; backButton.style.display = 'block';
    setTimeout(() => { infoPanel.style.display = 'block'; }, 400);
}

backButton.addEventListener('click', () => {
    if (isZooming === true) {
        isZooming = "out"; backButton.style.display = 'none'; infoPanel.style.display = 'none';
    }
});

document.addEventListener('mousemove', (e) => {
    if (controls.isLocked && !isZooming) {
        raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
        const intersects = raycaster.intersectObjects(scene.children, true);
        const art = intersects.find(i => i.object.userData.isArtwork);
        crosshair.classList.toggle('crosshair-active', !!(art && art.distance < 12));
    }
});

// ---- Lógica Movimiento WASD ----
let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false;
document.addEventListener('keydown', (e) => {
    switch (e.code) { case 'KeyW': moveForward = true; break; case 'KeyA': moveLeft = true; break; case 'KeyS': moveBackward = true; break; case 'KeyD': moveRight = true; break; }
});
document.addEventListener('keyup', (e) => {
    switch (e.code) { case 'KeyW': moveForward = false; break; case 'KeyA': moveLeft = false; break; case 'KeyS': moveBackward = false; break; case 'KeyD': moveRight = false; break; }
});

const clock = new THREE.Clock();
const velocity = new THREE.Vector3(), direction = new THREE.Vector3(), targetVelocity = new THREE.Vector3();

function checkCollision(pos) {
    const playerBox = new THREE.Box3().setFromCenterAndSize(pos, new THREE.Vector3(0.6, 1.8, 0.6));
    for (let box of colliders) { if (box.intersectsBox(playerBox)) return true; }
    return false;
}

function animate() {
    requestAnimationFrame(animate);
    const delta = Math.min(clock.getDelta(), 0.1);

    // Parpadeo de Cámaras
    const time = clock.getElapsedTime();
    const isLedOn = Math.floor(time * 0.5) % 2 === 0;
    cameraLEDs.forEach(led => { led.color.setHex(isLedOn ? 0xff0000 : 0x220000); });

    if (isZooming === true) {
        camera.position.lerp(cameraTargetPos, 4 * delta);
        camera.quaternion.slerp(cameraTargetQuat, 4 * delta);
    } else if (isZooming === "out") {
        camera.position.lerp(cameraPreZoomPos, 4 * delta);
        camera.quaternion.slerp(cameraPreZoomQuat, 4 * delta);
        if (camera.position.distanceTo(cameraPreZoomPos) < 0.05) {
            isZooming = false; camera.position.copy(cameraPreZoomPos); camera.quaternion.copy(cameraPreZoomQuat);
            controls.lock(); crosshair.style.display = 'block';
        }
    } else if (controls.isLocked) {
        direction.z = Number(moveForward) - Number(moveBackward);
        direction.x = Number(moveRight) - Number(moveLeft);
        direction.normalize();

        const speed = 7.0;
        targetVelocity.z = direction.z * speed; targetVelocity.x = direction.x * speed;
        velocity.lerp(targetVelocity, 10 * delta);

        const oldX = camera.position.x;
        controls.moveRight(velocity.x * delta);
        if (checkCollision(camera.position)) camera.position.x = oldX;

        const oldZ = camera.position.z;
        controls.moveForward(velocity.z * delta);
        if (checkCollision(camera.position)) camera.position.z = oldZ;
    }
    renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// START
animate();
