/*
 * Pneu 3D do hero (Three.js).
 * Geometria 100% procedural: nenhum arquivo .glb para baixar.
 * A lateral mostra "NORONHA" e a medida escolhida no seletor, em letras brancas em relevo.
 */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const canvas = document.getElementById('pneu3d');
const palco = canvas && canvas.parentElement;
const reduz = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const mobile = window.matchMedia('(max-width: 820px)').matches;
const ponteiroFino = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

function semWebGL() {
  try {
    const c = document.createElement('canvas');
    return !(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch (e) { return true; }
}

if (canvas && !semWebGL()) {
  iniciar().catch((e) => { console.warn('[pneu3d]', e); palco.classList.add('sem-3d'); });
} else if (palco) {
  palco.classList.add('sem-3d');
}

async function iniciar() {
  try { await document.fonts.load('italic 900 120px "Archivo"'); } catch (e) { /* segue com fonte do sistema */ }

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.75 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const cena = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  cena.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 50);
  camera.position.set(0, 0.28, 6.4);
  camera.lookAt(0, 0, 0);

  /* ---------- luzes: chave branca, recorte vermelho e recorte frio ---------- */
  const chave = new THREE.DirectionalLight(0xffffff, 1.5); chave.position.set(2.5, 3.5, 5); cena.add(chave);
  const recorteVermelho = new THREE.DirectionalLight(0xff1f26, 5.5); recorteVermelho.position.set(-2.5, 0.6, -4.5); cena.add(recorteVermelho);
  const recorteFrio = new THREE.DirectionalLight(0xcfdcff, 1.6); recorteFrio.position.set(4, 2.5, -3); cena.add(recorteFrio);

  /* ---------- materiais ---------- */
  const borracha = new THREE.MeshStandardMaterial({ color: 0x18191c, roughness: 0.84, metalness: 0, envMapIntensity: 0.55, side: THREE.DoubleSide });
  const cravo = new THREE.MeshStandardMaterial({ color: 0x0f1012, roughness: 0.9, metalness: 0, envMapIntensity: 0.45 });
  const cromo = new THREE.MeshStandardMaterial({ color: 0xdfe2e6, roughness: 0.12, metalness: 1 });
  const usinado = new THREE.MeshStandardMaterial({ color: 0xd4d7db, roughness: 0.22, metalness: 0.8, envMapIntensity: 1.8 });
  const metalEscuro = new THREE.MeshStandardMaterial({ color: 0x1b1c1f, roughness: 0.38, metalness: 0.85, side: THREE.DoubleSide });
  const vermelho = new THREE.MeshStandardMaterial({ color: 0xe3141b, roughness: 0.3, metalness: 0.4, emissive: 0x3a0002 });

  const conjunto = new THREE.Group();   // inclinação e entrada
  const giro = new THREE.Group();       // rotação no eixo
  conjunto.add(giro);
  cena.add(conjunto);

  /* ---------- carcaça (torno de um perfil) ---------- */
  const perfil = [
    [0.66, -0.25], [0.68, -0.28], [0.75, -0.292], [0.85, -0.297], [0.92, -0.29], [0.962, -0.27],
    [0.988, -0.232], [0.998, -0.18], [1.0, 0], [0.998, 0.18], [0.988, 0.232], [0.962, 0.27],
    [0.92, 0.29], [0.85, 0.297], [0.75, 0.292], [0.68, 0.28], [0.66, 0.25], [0.66, -0.25]
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const carcacaGeo = new THREE.LatheGeometry(perfil, mobile ? 96 : 144);
  carcacaGeo.rotateX(Math.PI / 2);
  giro.add(new THREE.Mesh(carcacaGeo, borracha));

  /* ---------- banda de rodagem: cravos instanciados ---------- */
  const N = 58;
  const blocoCentral = new RoundedBoxGeometry(0.05, 0.075, 0.13, 2, 0.012);
  const blocoOmbro = new RoundedBoxGeometry(0.05, 0.085, 0.12, 2, 0.012);
  const blocoLateral = new RoundedBoxGeometry(0.06, 0.05, 0.04, 2, 0.01);
  const centrais = new THREE.InstancedMesh(blocoCentral, cravo, N);
  const ombros = new THREE.InstancedMesh(blocoOmbro, cravo, N * 2);
  const laterais = new THREE.InstancedMesh(blocoLateral, cravo, N * 2);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), pos = new THREE.Vector3(), esc = new THREE.Vector3(1, 1, 1), eu = new THREE.Euler();
  const passo = (Math.PI * 2) / N;
  for (let i = 0; i < N; i++) {
    const a = i * passo;
    const alterna = i % 2 ? 1 : -1;
    // central em zigue-zague
    eu.set(0, 0, a); q.setFromEuler(eu);
    pos.set(Math.cos(a) * 1.012, Math.sin(a) * 1.012, alterna * 0.05);
    centrais.setMatrixAt(i, m4.compose(pos, q, esc));
    // ombros defasados meio passo
    for (const lado of [-1, 1]) {
      const b = a + passo * 0.5 * lado * alterna;
      eu.set(0, 0, b); q.setFromEuler(eu);
      pos.set(Math.cos(b) * 1.008, Math.sin(b) * 1.008, lado * 0.185);
      ombros.setMatrixAt(i * 2 + (lado > 0 ? 1 : 0), m4.compose(pos, q, esc));
      const c = a + passo * 0.25 * lado;
      eu.set(0, 0, c); q.setFromEuler(eu);
      pos.set(Math.cos(c) * 0.958, Math.sin(c) * 0.958, lado * 0.278);
      laterais.setMatrixAt(i * 2 + (lado > 0 ? 1 : 0), m4.compose(pos, q, esc));
    }
  }
  giro.add(centrais, ombros, laterais);

  /* ---------- roda ---------- */
  const tambor = new THREE.CylinderGeometry(0.662, 0.662, 0.5, 96, 1, true); tambor.rotateX(Math.PI / 2);
  giro.add(new THREE.Mesh(tambor, metalEscuro));
  const fundo = new THREE.Mesh(new THREE.CircleGeometry(0.66, 64), metalEscuro); fundo.position.z = 0.02; giro.add(fundo);
  const aba = new THREE.Mesh(new THREE.TorusGeometry(0.652, 0.024, 16, 160), cromo); aba.position.z = 0.25; giro.add(aba);

  const formaRaio = new THREE.Shape();
  formaRaio.moveTo(0.15, -0.035); formaRaio.lineTo(0.63, -0.06); formaRaio.lineTo(0.63, 0.06); formaRaio.lineTo(0.15, 0.035); formaRaio.closePath();
  const raioGeo = new THREE.ExtrudeGeometry(formaRaio, { depth: 0.07, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.01, bevelSegments: 2, curveSegments: 4 });
  for (let k = 0; k < 6; k++) {
    for (const d of [-0.11, 0.11]) {
      const r = new THREE.Mesh(raioGeo, usinado);
      r.rotation.z = (k * Math.PI) / 3 + d;
      r.position.z = 0.15;
      giro.add(r);
    }
  }
  const cubo = new THREE.CylinderGeometry(0.17, 0.2, 0.12, 48); cubo.rotateX(Math.PI / 2);
  const cuboM = new THREE.Mesh(cubo, usinado); cuboM.position.z = 0.2; giro.add(cuboM);
  const calota = new THREE.CylinderGeometry(0.085, 0.085, 0.03, 48); calota.rotateX(Math.PI / 2);
  const calotaM = new THREE.Mesh(calota, vermelho); calotaM.position.z = 0.27; giro.add(calotaM);
  const porcaGeo = new THREE.CylinderGeometry(0.022, 0.022, 0.05, 6); porcaGeo.rotateX(Math.PI / 2);
  for (let k = 0; k < 6; k++) {
    const p = new THREE.Mesh(porcaGeo, cromo);
    const a = (k * Math.PI) / 3 + Math.PI / 6;
    p.position.set(Math.cos(a) * 0.13, Math.sin(a) * 0.13, 0.27);
    giro.add(p);
  }

  /* ---------- letras em relevo na lateral ---------- */
  const TEX = mobile ? 1024 : 2048;
  const tela = document.createElement('canvas'); tela.width = tela.height = TEX;
  const ctx = tela.getContext('2d');
  const texLateral = new THREE.CanvasTexture(tela);
  texLateral.colorSpace = THREE.SRGBColorSpace;
  texLateral.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const RAIO_EXT = 0.955;
  const anel = new THREE.Mesh(
    new THREE.RingGeometry(0.69, RAIO_EXT, 160, 1),
    new THREE.MeshStandardMaterial({ map: texLateral, transparent: true, roughness: 0.55, metalness: 0, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 })
  );
  anel.position.z = 0.299;
  giro.add(anel);

  function textoEmArco(texto, raio, tamanho, centro, emBaixo, espacamento) {
    const c = TEX / 2, escala = TEX / 2 / RAIO_EXT, R = raio * escala;
    ctx.font = `italic 900 ${tamanho * escala}px "Archivo", system-ui, sans-serif`;
    try { ctx.fontStretch = 'expanded'; } catch (e) {}
    const extra = (espacamento || 0) * tamanho * escala;
    const larguras = [...texto].map((ch) => ctx.measureText(ch).width + extra);
    const total = larguras.reduce((s, w) => s + w, 0);
    let acum = 0;
    [...texto].forEach((ch, i) => {
      const meio = acum + larguras[i] / 2;
      const ang = emBaixo ? centro + total / 2 / R - meio / R : centro - total / 2 / R + meio / R;
      ctx.save();
      ctx.translate(c + Math.cos(ang) * R, c + Math.sin(ang) * R);
      ctx.rotate(emBaixo ? ang - Math.PI / 2 : ang + Math.PI / 2);
      ctx.strokeText(ch, 0, 0);
      ctx.fillText(ch, 0, 0);
      ctx.restore();
      acum += larguras[i];
    });
  }

  function desenharLateral(medida) {
    ctx.clearRect(0, 0, TEX, TEX);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#f2f2ef';
    ctx.strokeStyle = 'rgba(0,0,0,0.55)';
    ctx.lineWidth = TEX / 700;
    textoEmArco('NORONHA', 0.83, 0.15, -Math.PI / 2, false, 0.12);
    ctx.fillStyle = '#e3141b';
    textoEmArco('PNEUS E RODAS', 0.83, 0.058, -Math.PI / 2 + 1.42, false, 0.2);
    textoEmArco('IMPORTADOS', 0.83, 0.058, -Math.PI / 2 - 1.36, false, 0.2);
    ctx.fillStyle = '#f2f2ef';
    textoEmArco(medida, 0.82, 0.12, Math.PI / 2, true, 0.08);
    // friso fino
    ctx.beginPath();
    ctx.arc(TEX / 2, TEX / 2, (0.715 * TEX) / 2 / RAIO_EXT, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(242,242,239,0.35)';
    ctx.lineWidth = TEX / 500;
    ctx.stroke();
    texLateral.needsUpdate = true;
  }
  desenharLateral('265/70 R16');

  /* ---------- sombra de contato ---------- */
  const telaSombra = document.createElement('canvas'); telaSombra.width = telaSombra.height = 256;
  const cs = telaSombra.getContext('2d');
  const gr = cs.createRadialGradient(128, 128, 0, 128, 128, 128);
  gr.addColorStop(0, 'rgba(0,0,0,0.85)'); gr.addColorStop(0.6, 'rgba(0,0,0,0.35)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  cs.fillStyle = gr; cs.fillRect(0, 0, 256, 256);
  const sombra = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 1.1), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(telaSombra), transparent: true, depthWrite: false }));
  sombra.rotation.x = -Math.PI / 2;
  sombra.position.y = -1.1;
  cena.add(sombra);

  /* ---------- pose ---------- */
  const POSE_Y = -0.62, POSE_X = 0.1, POS_X = mobile ? 0 : 0.3;
  conjunto.position.x = POS_X;
  conjunto.rotation.set(POSE_X, POSE_Y, 0);

  /* ---------- tamanho ---------- */
  function redimensionar() {
    const w = palco.clientWidth, h = palco.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // em telas estreitas, recua a câmera para o pneu caber inteiro
    camera.position.z = camera.aspect < 0.9 ? 6.4 / Math.max(camera.aspect, 0.55) * 0.82 : 6.4;
    camera.updateProjectionMatrix();
    if (!rodando) renderer.render(cena, camera);
  }
  new ResizeObserver(redimensionar).observe(palco);

  /* ---------- interação ---------- */
  let velocidade = reduz ? 0 : 0.18;      // rad/s em repouso
  let impulso = 0;
  let alvoX = 0, alvoY = 0;
  let ultimoScroll = window.scrollY;
  window.addEventListener('scroll', () => {
    const d = window.scrollY - ultimoScroll; ultimoScroll = window.scrollY;
    if (!reduz) impulso += d * 0.0045;
  }, { passive: true });
  if (ponteiroFino && !reduz) {
    window.addEventListener('pointermove', (e) => {
      alvoY = (e.clientX / window.innerWidth - 0.5) * 0.35;
      alvoX = (e.clientY / window.innerHeight - 0.5) * 0.18;
    }, { passive: true });
  }
  window.addEventListener('noronha:medida', (e) => {
    desenharLateral(e.detail.texto);
    if (!reduz) impulso += 1.2;
    if (!rodando) renderer.render(cena, camera);
  });

  /* ---------- entrada: o pneu rola da direita até a pose ---------- */
  const DUR_ENTRADA = 1.7;
  let tEntrada = reduz ? DUR_ENTRADA : 0;
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);

  const relogio = new THREE.Clock();
  let rodando = false, visivel = true;
  function quadro() {
    if (!rodando) return;
    const dt = Math.min(relogio.getDelta(), 0.05);
    if (tEntrada < DUR_ENTRADA) {
      tEntrada += dt;
      const k = easeOut(Math.min(tEntrada / DUR_ENTRADA, 1));
      const x = (1 - k) * 4.5;
      conjunto.position.x = POS_X + x;
      giro.rotation.z = x / 1.0; // rolamento sem deslizar
    } else {
      impulso *= Math.pow(0.04, dt);
      giro.rotation.z -= (velocidade + impulso) * dt;
    }
    conjunto.rotation.x += (POSE_X + alvoX - conjunto.rotation.x) * Math.min(1, dt * 4);
    conjunto.rotation.y += (POSE_Y + alvoY - conjunto.rotation.y) * Math.min(1, dt * 4);
    renderer.render(cena, camera);
    requestAnimationFrame(quadro);
  }
  function ligar() { if (rodando || reduz) return; rodando = true; relogio.getDelta(); requestAnimationFrame(quadro); }
  function desligar() { rodando = false; }

  new IntersectionObserver((es) => {
    visivel = es[0].isIntersecting;
    visivel && !document.hidden ? ligar() : desligar();
  }).observe(canvas);
  document.addEventListener('visibilitychange', () => { document.hidden ? desligar() : visivel && ligar(); });

  redimensionar();
  renderer.render(cena, camera);
  canvas.classList.add('is-pronto');
  ligar();
}
