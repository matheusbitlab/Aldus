// This module is dynamically imported by the public Web story only.
import {
  ACESFilmicToneMapping, BoxGeometry, BufferAttribute, BufferGeometry, CanvasTexture, DirectionalLight,
  CylinderGeometry, DoubleSide, Group, HemisphereLight, InstancedMesh, LineBasicMaterial, LineSegments, Matrix4, Mesh,
  MeshStandardMaterial, PCFSoftShadowMap, PerspectiveCamera, PlaneGeometry, Points,
  Scene, ShaderMaterial, ShadowMaterial, SphereGeometry, SRGBColorSpace, Vector3, WebGLRenderer,
  type Material, type Texture,
} from 'three';
import { assessBookPerformance, initialBookPerformance, chooseBookQuality, mix, resolveBookPose, smooth, type BookPose } from '../bookMotion';
import { communityEdges, communityNodes, createParticleTargets, libraryBooks } from './particleTargets';

export interface BookSceneHandle {
  render(pose: BookPose): void;
  resize(width: number, height: number): void;
  dispose(): void;
  needsBudgetFrame(): boolean;
}
type MetricsHost = HTMLElement & { aldusBookMetrics?: Record<string, number | string | boolean> };

const radians = (v: number) => v * Math.PI / 180;
const paperVertex = `
  uniform float uTurn, uCurl; varying vec2 vUv; varying float vLight;
  void main(){
    vUv=uv; float u=position.x/1.9; float theta=uTurn+uCurl*u;
    vec3 p=position;
    if(abs(uCurl)>.0001){float radius=1.9/uCurl;p.x=radius*(sin(theta)-sin(uTurn));p.z+=radius*(cos(theta)-cos(uTurn));}
    else{p.x=position.x*cos(uTurn);p.z-=position.x*sin(uTurn);}
    vLight=.77+.23*abs(cos(theta-.28));
    gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);
  }`;
const paperFragment = `
  uniform sampler2D uMap; uniform float uDissolve; varying vec2 vUv; varying float vLight;
  float grain(vec2 p){return fract(sin(dot(floor(p*145.),vec2(127.1,311.7)))*43758.5453);}
  void main(){
    if(uDissolve>0.){
      float edge=vUv.x+.055*sin(vUv.y*17.)+.04*grain(vUv);
      if(edge<uDissolve*1.3-.07)discard;
    }
    vec2 uv=gl_FrontFacing?vUv:vec2(1.-vUv.x,vUv.y);
    vec3 color=gl_FrontFacing?texture2D(uMap,uv).rgb:vec3(.94,.90,.82);
    float gutter=.83+.17*smoothstep(0.,.12,vUv.x);
    gl_FragColor=vec4(color*vLight*gutter,1.);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`;
const particleVertex = `
  attribute vec3 aTarget0,aTarget1,aTarget2,aTarget3,aTarget4,aTarget5,aTarget6;
  attribute float aSeed;
  uniform float uFrom,uTo,uMorph,uProgress,uDpr;
  varying float vSeed;
  vec3 target(float n){if(n<.5)return aTarget0;if(n<1.5)return aTarget1;if(n<2.5)return aTarget2;if(n<3.5)return aTarget3;if(n<4.5)return aTarget4;if(n<5.5)return aTarget5;return aTarget6;}
  void main(){
    vSeed=aSeed;float pulse=sin(uMorph*3.14159265);
    vec3 arc=vec3(sin(aSeed*31.4),cos(aSeed*19.3),sin(aSeed*43.7))*.64;
    vec3 p=mix(target(uFrom),target(uTo),uMorph)+arc*pulse;
    p+=vec3(sin(aSeed*53.+uProgress*7.),cos(aSeed*37.+uProgress*8.),0.)*pulse*.065;
    vec4 mv=modelViewMatrix*vec4(p,1.);
    gl_PointSize=min(5.,uDpr*(1.9+aSeed*1.4)*5.8/max(2.,-mv.z));
    gl_Position=projectionMatrix*mv;
  }`;
const particleFragment = `
  uniform float uOpacity,uDark; varying float vSeed;
  void main(){vec2 p=gl_PointCoord-.5;float a=1.-smoothstep(.09,.25,dot(p,p));if(a<.02)discard;
    vec3 ink=mix(vec3(.13,.30,.23),vec3(.65,.39,.22),step(.7,vSeed));
    vec3 gold=mix(vec3(.69,.57,.33),vec3(.93,.82,.59),vSeed);
    gl_FragColor=vec4(mix(ink,gold,uDark),a*uOpacity);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`;

/** No models, network assets, frame timers, account data or React objects per particle. */
export function mountBookScene(host: HTMLElement, onFailure: (reason: string) => void, inspectGeometry = false): BookSceneHandle {
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  const viewportWidth = host.closest<HTMLElement>('[data-landing-scroll]')?.clientWidth ?? host.clientWidth;
  const quality = chooseBookQuality(viewportWidth, nav.deviceMemory ?? 8, nav.hardwareConcurrency, nav.connection?.saveData);
  const renderer = new WebGLRenderer({ alpha: true, antialias: quality.name === 'desktop', powerPreference: 'low-power' });
  renderer.setClearColor(0x000000, 0); renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping; renderer.toneMappingExposure = 1;
  renderer.debug.onShaderError = () => { throw new Error('Book shader initialization failed'); };
  renderer.shadowMap.enabled = quality.shadows; renderer.shadowMap.type = PCFSoftShadowMap;
  // Scroll poses are deterministic. Budget probes of the same pose can reuse
  // the shadow map instead of redrawing every caster into it again.
  renderer.shadowMap.autoUpdate = false; renderer.shadowMap.needsUpdate = true;
  const canvas = renderer.domElement; canvas.setAttribute('aria-hidden', 'true'); canvas.setAttribute('data-cinematic-canvas', '');
  canvas.style.cssText = 'width:100%;height:100%;display:block;pointer-events:none';
  host.appendChild(canvas);
  const geometries = new Set<BufferGeometry>(), materials = new Set<Material>(), textures = new Set<Texture>();
  const instances = new Set<InstancedMesh>();
  let lostHandler: ((event: Event) => void) | undefined;
  try {
  const scene = new Scene(), world = new Group(), book = new Group(), coverHinge = new Group();
  const camera = new PerspectiveCamera(35, 1, .1, 40);
  scene.add(world); world.add(book); book.add(coverHinge);
  book.name = 'Aldus principal book';
  scene.add(new HemisphereLight(0xfff9e7, 0x59654a, 3));
  const key = new DirectionalLight(0xfff5dc, 2.4); key.position.set(-3, 5, 6); key.castShadow = quality.shadows;
  key.shadow.mapSize.set(512, 512); key.shadow.camera.left = key.shadow.camera.bottom = -4;
  key.shadow.camera.right = key.shadow.camera.top = 4; key.shadow.camera.far = 16; key.shadow.bias = -.0004;
  scene.add(key); scene.add(key.target);
  const rim = new DirectionalLight(0xc2decf, 1.4); rim.position.set(4, 1, -2); scene.add(rim);
  const keepGeometry = <T extends BufferGeometry>(g: T) => { geometries.add(g); return g; };
  const keepMaterial = <T extends Material>(m: T) => { materials.add(m); return m; };
  const solid = (color: string, map?: Texture) => keepMaterial(new MeshStandardMaterial({ color, map, roughness: .9, metalness: .02 }));
  const boxGeometries = new Map<string, BoxGeometry>();
  const cube = (parent: Group, w: number, h: number, d: number, material: Material | Material[], x = 0, y = 0, z = 0) => {
    const key = `${w}:${h}:${d}`;
    let geometry = boxGeometries.get(key);
    if (!geometry) { geometry = keepGeometry(new BoxGeometry(w, h, d)); boxGeometries.set(key, geometry); }
    const mesh = new Mesh(geometry, material);
    mesh.position.set(x, y, z); mesh.castShadow = true; mesh.receiveShadow = false; parent.add(mesh); return mesh;
  };
  const makeTexture = (kind: string, title = '', background = '#f4ecda') => {
    const wide = kind === 'card' || kind === 'answer';
    const textureHeight = wide ? 311 : kind === 'mini' ? 790 : 717;
    const c = document.createElement('canvas'); c.width = quality.name === 'desktop' ? 512 : 256; c.height = c.width * textureHeight / 512;
    const ctx = c.getContext('2d'); if (!ctx) throw new Error('Canvas textures unavailable');
    const s = c.width / 512; ctx.scale(s, s); ctx.fillStyle = background; ctx.fillRect(0, 0, 512, textureHeight);
    const cover = kind === 'cover' || kind === 'mini';
    ctx.fillStyle = cover ? '#ecdfbb' : '#244632'; ctx.strokeStyle = cover ? '#d7c18c' : '#b8b19a';
    ctx.lineWidth = 1.5; ctx.strokeRect(wide ? 20 : 34, wide ? 20 : 35, wide ? 472 : 444, wide ? 271 : textureHeight - 70);
    ctx.font = wide ? '11px sans-serif' : '15px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(cover ? 'SUA LEITURA. SEU TEMPO.' : 'ALDUS READER · ILUSTRAÇÃO', 256, wide ? 48 : 80);
    if (cover) {
      ctx.font = '56px Georgia'; ctx.fillText(kind === 'cover' ? 'A' : '✦', 256, 220);
      ctx.font = kind === 'cover' ? '78px Georgia' : '44px Georgia';
      (kind === 'cover' ? ['Aldus', 'Reader'] : title.split('\n')).forEach((line, i) => ctx.fillText(line, 256, 342 + i * 78));
      ctx.beginPath(); ctx.moveTo(120, 548); ctx.lineTo(392, 548); ctx.stroke();
      ctx.font = '14px sans-serif'; ctx.fillText(kind === 'cover' ? 'LEIA · ORGANIZE · DESCUBRA' : 'TÍTULO ILUSTRATIVO', 256, 610);
      ctx.fillStyle = '#ffffff08'; for (let i = 0; i < 1300; i++) ctx.fillRect((i * 79) % 512, (i * 113) % 717, 1, 1);
    } else if (kind === 'card' || kind === 'answer') {
      ctx.fillStyle = '#10281e';
      ctx.textAlign = 'left'; ctx.font = '12px sans-serif'; ctx.fillText(kind === 'card' ? 'FLASHCARD · SEU DECK' : 'REVISITAR UMA IDEIA', 45, 84);
      ctx.font = '37px Georgia'; const lines = kind === 'card' ? ['O que fica depois', 'da última página?'] : ['Uma pergunta.', 'Novas conexões.'];
      lines.forEach((line, i) => ctx.fillText(line, 45, 145 + i * 44));
      ctx.font = '13px sans-serif'; ctx.fillText('Revisão no seu ritmo', 45, 256);
    } else if (kind === 'inside') {
      ctx.font = '58px Georgia'; ['Todo livro', 'abre um', 'universo.'].forEach((line, i) => ctx.fillText(line, 256, 290 + i * 78));
      ctx.font = '15px sans-serif'; ctx.fillText('ALDUS READER', 256, 610);
    } else {
      ctx.textAlign = 'left'; ctx.font = '44px Georgia'; ctx.fillText('Um tempo', 58, 167); ctx.fillText('só seu.', 58, 225);
      ctx.font = '23px Georgia';
      ['Há um espaço entre a pressa', 'do dia e a próxima linha.', '', 'Um lugar para imaginar,', 'descobrir e voltar a uma', 'ideia com outro olhar.', '', 'A leitura encontra', 'o seu próprio ritmo.'].forEach((line, i) => {
        if (i === 7 || i === 8) { ctx.fillStyle = '#e4d59c'; ctx.fillRect(54, 276 + i * 32, 350, 31); }
        ctx.fillStyle = '#31483a'; ctx.fillText(line, 58, 300 + i * 32);
      });
      ctx.font = '13px sans-serif'; ctx.fillText('TEMA PAPEL     ·     TEXTO ILUSTRATIVO', 58, 651);
    }
    const texture = new CanvasTexture(c); texture.colorSpace = SRGBColorSpace; texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy()); textures.add(texture); return texture;
  };
  const coverTexture = makeTexture('cover', '', '#173e30'), pageTexture = makeTexture('reader');
  const forest = solid('#173e30'), paper = solid('#e8ddc5'), inside = solid('#ffffff', makeTexture('inside')), front = solid('#ffffff', coverTexture);
  cube(book, 1.94, 2.76, .055, forest, .95, 0, -.18);
  cube(book, 1.85, 2.64, .24, paper, .96, 0, -.035);
  // Fine, solid fore-edge lines use one draw call and one shared geometry.
  const edgeGeometry = keepGeometry(new BoxGeometry(.008, 2.60, .0015)), edgeMaterial = solid('#c2b497');
  const bookMaterials = [forest, paper, inside, front, edgeMaterial];
  bookMaterials.forEach(material => { material.transparent = true; });
  const foreEdges = new InstancedMesh(edgeGeometry, edgeMaterial, 14), instanceTransform = new Matrix4();
  instances.add(foreEdges);
  for (let i = 0; i < 14; i++) { instanceTransform.makeTranslation(1.89, 0, -.14 + i * .017); foreEdges.setMatrixAt(i, instanceTransform); }
  foreEdges.instanceMatrix.needsUpdate = true; book.add(foreEdges);
  cube(book, .07, 2.76, .34, forest, -.015, 0, -.02);
  cube(coverHinge, 1.94, 2.76, .055, [forest, forest, forest, forest, front, inside], .95);
  coverHinge.position.z = .175;
  const ribbon = solid('#b56c4d'); cube(book, .13, .58, .012, ribbon, 1.38, -1.47, -.01);
  const leaves: { mesh: Mesh; material: ShaderMaterial }[] = [];
  for (let i = 0; i < 4; i++) {
    const geometry = keepGeometry(new PlaneGeometry(1.9, 2.65, 24, 2)); geometry.translate(.95, 0, 0);
    const material = keepMaterial(new ShaderMaterial({ vertexShader: paperVertex, fragmentShader: paperFragment, side: DoubleSide,
      uniforms: { uMap: { value: pageTexture }, uTurn: { value: 0 }, uCurl: { value: 0 }, uDissolve: { value: 0 } } }));
    const mesh = new Mesh(geometry, material); mesh.frustumCulled = false; mesh.userData.pageIndex = i; book.add(mesh); leaves.push({ mesh, material });
  }

  const library = new Group(), study = new Group(), community = new Group(); world.add(library, study, community);
  const fading: { group: Group; materials: MeshStandardMaterial[]; kind: 'library' | 'study' | 'community' }[] = [];
  const libraryMaterials: MeshStandardMaterial[] = [];
  libraryBooks.forEach(info => {
    const group = new Group(); group.position.set(info.x, info.y, info.z); group.rotation.y = info.angle; group.rotation.z = info.angle * .35; library.add(group);
    const coverMat = solid('#ffffff', makeTexture('mini', info.title, info.color)), edge = solid(info.color), pages = solid('#e9dfca');
    libraryMaterials.push(coverMat, edge, pages);
    cube(group, .9, 1.39, .12, pages); cube(group, .94, 1.45, .025, [edge, edge, edge, edge, coverMat, edge], 0, 0, .075);
    cube(group, .94, 1.45, .022, edge, 0, 0, -.075);
  });
  const shelf = solid('#c4aa7f'); libraryMaterials.push(shelf); cube(library, 3.6, .04, .65, shelf, 0, -.62, -.05);
  fading.push({ group: library, materials: libraryMaterials, kind: 'library' });
  const studyMaterials: MeshStandardMaterial[] = [], cards: Group[] = [];
  const face = makeTexture('card'), answer = makeTexture('answer');
  for (let i = 2; i >= 0; i--) {
    const group = new Group(); group.position.set((i - 1) * .65, .3 - i * .28, .7 - i * .28); group.rotation.z = (i - 1) * -.17;
    const edge = solid(i === 0 ? '#c2a57c' : '#254a38'), a = solid('#ffffff', face), b = solid('#ffffff', answer);
    studyMaterials.push(edge, a, b); cube(group, 1.7, 1.03, .045, [edge, edge, edge, edge, a, b]); study.add(group); cards.push(group);
  }
  fading.push({ group: study, materials: studyMaterials, kind: 'study' });
  const communityMaterials: MeshStandardMaterial[] = [], sphereGeometry = keepGeometry(new SphereGeometry(.10, 14, 10));
  const bodyGeometry = keepGeometry(new CylinderGeometry(.055, .085, .20, 12));
  communityNodes.forEach((position, i) => {
    const mat = solid(i % 2 ? '#c0a679' : '#e9ddbb'); communityMaterials.push(mat);
    const sphere = new Mesh(sphereGeometry, mat); sphere.position.set(position[0], position[1], position[2]); sphere.visible = i % 2 === 1; community.add(sphere);
    if (i % 2) { const body = new Mesh(bodyGeometry, mat); body.position.set(position[0], position[1] - .22, position[2]); community.add(body); }
    else { const glyph = cube(community, .23, .32, .055, mat, position[0], position[1], position[2]); glyph.rotation.z = (i - 3) * .07; }
  });
  const links = new Float32Array(communityEdges.length * 6);
  communityEdges.forEach(([a, b], i) => { links.set(communityNodes[a], i * 6); links.set(communityNodes[b], i * 6 + 3); });
  const linkGeometry = keepGeometry(new BufferGeometry()); linkGeometry.setAttribute('position', new BufferAttribute(links, 3));
  const linkMaterial = keepMaterial(new LineBasicMaterial({ color: '#c6ad7a', transparent: true, opacity: 0 }));
  community.add(new LineSegments(linkGeometry, linkMaterial)); fading.push({ group: community, materials: communityMaterials, kind: 'community' });
  fading.forEach(item => item.materials.forEach(material => { material.transparent = true; material.depthWrite = false; }));

  const data = createParticleTargets(quality.particles), geometry = keepGeometry(new BufferGeometry());
  geometry.setAttribute('position', new BufferAttribute(data.targets[0], 3));
  data.targets.forEach((target, index) => geometry.setAttribute(`aTarget${index}`, new BufferAttribute(target, 3)));
  geometry.setAttribute('aSeed', new BufferAttribute(data.seeds, 1));
  const particleMaterial = keepMaterial(new ShaderMaterial({ vertexShader: particleVertex, fragmentShader: particleFragment,
    transparent: true, depthWrite: false, uniforms: { uFrom: { value: 6 }, uTo: { value: 0 }, uMorph: { value: 0 }, uProgress: { value: 0 },
      uOpacity: { value: .2 }, uDpr: { value: 1 }, uDark: { value: 0 } } }));
  const particles = new Points(geometry, particleMaterial); particles.frustumCulled = false; world.add(particles);
  const ground = new Mesh(keepGeometry(new PlaneGeometry(18, 18)), keepMaterial(new ShadowMaterial({ color: '#183d2c', opacity: .055 })));
  ground.rotation.x = -Math.PI / 2; ground.position.set(0, -1.72, -1); ground.receiveShadow = true; scene.add(ground);
  const contactMaterial = keepMaterial(new ShaderMaterial({ transparent: true, depthWrite: false,
    vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: 'varying vec2 vUv;void main(){vec2 p=(vUv-.5)*vec2(1.,1.5);float a=exp(-dot(p,p)*22.)*.12;gl_FragColor=vec4(.12,.20,.15,a);}' }));
  const contact = new Mesh(keepGeometry(new PlaneGeometry(4.6, 2.2)), contactMaterial); contact.rotation.x = -Math.PI / 2; contact.position.set(0, -1.70, 0); scene.add(contact);
  let disposed = false, frames = 0, width = 1, height = 1, downgraded = false;
  let performanceState = { ...initialBookPerformance };
  let qualitySamples = 0, budgetChapter = -1;
  let lastShadowProgress = NaN, shadowUpdates = 0;
  let dpr = Math.min(devicePixelRatio || 1, quality.dpr), current = resolveBookPose(0), budget: number = quality.particles;
  let effectiveQuality: string = quality.name;
  let resized = false;
  const metricsHost = host as MetricsHost;
  const projected = new Vector3(), bounds: Record<string, number> = {};
  const contextLost = (event: Event) => { event.preventDefault(); if (!disposed) onFailure('context-lost'); };
  lostHandler = contextLost;
  canvas.addEventListener('webglcontextlost', contextLost, false);
  const resize = (w: number, h: number) => {
    if (disposed || !Number.isFinite(w) || !Number.isFinite(h) || w < 1 || h < 1) return;
    const next = chooseBookQuality(w, nav.deviceMemory ?? 8, nav.hardwareConcurrency, nav.connection?.saveData);
    const nextBudget = Math.min(quality.particles, downgraded ? 900 : next.particles);
    const nextQuality = downgraded ? 'adaptive-low' : next.name;
    const nextDpr = Math.min(devicePixelRatio || 1, downgraded ? 1 : next.dpr);
    const nextShadows = !downgraded && next.shadows && quality.shadows;
    if (resized && w === width && h === height && nextDpr === dpr && nextBudget === budget &&
      nextShadows === renderer.shadowMap.enabled && nextQuality === effectiveQuality) return;
    const bufferChanged = !resized || w !== width || h !== height || nextDpr !== dpr;
    if (w !== width || h !== height) { qualitySamples = 0; budgetChapter = -1; }
    width = w; height = h;
    budget = nextBudget; geometry.setDrawRange(0, budget);
    effectiveQuality = nextQuality; dpr = nextDpr;
    renderer.shadowMap.enabled = nextShadows;
    renderer.shadowMap.needsUpdate = true;
    // Without shadow maps this large transparent plane would only shade alpha=0.
    // The inexpensive contact shadow remains visible in every quality tier.
    ground.visible = renderer.shadowMap.enabled;
    // Apply dimensions and DPR together; separate calls allocate twice when both
    // change. A shadow/particle-tier change alone does not resize the buffer.
    if (bufferChanged) { renderer.setDrawingBufferSize(w, h, dpr); camera.aspect = w / h; camera.updateProjectionMatrix(); }
    resized = true;
  };
  const render = (pose: BookPose) => {
    if (disposed) return;
    // A bounded consecutive-frame probe measures rendering, not how slowly a
    // person turns their wheel. Its frames draw the exact scroll pose unchanged.
    // Geometry QA may force software WebGL; production probes are tested separately.
    if (!inspectGeometry) {
      if (budgetChapter !== pose.chapter) {
        budgetChapter = pose.chapter; qualitySamples = 0;
        performanceState = { ...initialBookPerformance, reduced: downgraded };
      }
      if (qualitySamples < 24) {
        performanceState = assessBookPerformance(performanceState, qualitySamples * .005, performance.now()); qualitySamples++;
        if (performanceState.fallback) { onFailure('performance-limited'); return; }
        if (performanceState.reduced && !downgraded) {
          downgraded = true; resize(width, height);
        }
      }
    }
    current = pose;
    const small = width <= 850;
    const topInset = small ? 0 : Math.min(height * .35, 190) * smooth(Math.max(0, Math.min(1, (pose.progress - .06) / .13)));
    const activeHeight = Math.max(1, height - topInset), aspect = width / activeHeight;
    if (Math.abs(camera.aspect - aspect) > .00001) { camera.aspect = aspect; camera.updateProjectionMatrix(); }
    renderer.setViewport(0, 0, width, activeHeight);
    const entry = 1 - smooth(Math.min(1, pose.progress / .15));
    const compactWide = small && width > 600 && height < 250;
    world.position.set(compactWide ? 3 * entry : small ? 0 : 1.12 * entry, -.02, 0);
    world.rotation.set(radians(pose.cameraX), radians(pose.cameraY), radians(pose.cameraZ));
    const transformed = Math.max(pose.library, pose.study, pose.community);
    book.position.set(-.95 + .95 * pose.open - 1.05 * pose.community, -.45 * pose.community, -.7 * transformed);
    book.scale.setScalar(pose.bookScale);
    bookMaterials.forEach(material => { material.opacity = 1 - .72 * transformed; material.depthWrite = transformed < .1; });
    library.position.z = pose.library; study.position.z = .55 * pose.study;
    coverHinge.rotation.y = radians(pose.coverAngle);
    leaves.forEach((leaf, i) => {
      leaf.mesh.position.z = pose.leaves[i].z; leaf.material.uniforms.uTurn.value = radians(pose.leaves[i].angle);
      leaf.material.uniforms.uCurl.value = pose.leaves[i].curl;
      leaf.material.uniforms.uDissolve.value = Math.min(.94, pose.library * .87 + pose.study * .88 + pose.community * .94);
    });
    fading.forEach(item => {
      const opacity = pose[item.kind]; item.group.visible = opacity > .005;
      item.group.scale.setScalar(.92 + .08 * opacity); item.materials.forEach(material => { material.opacity = opacity; });
    });
    cards[2].rotation.y = radians(180 * smooth(Math.max(0, Math.min(1, (pose.progress - .705) / .05))));
    linkMaterial.opacity = pose.community * .55;
    const uniforms = particleMaterial.uniforms;
    particles.visible = pose.particleOpacity > .001;
    uniforms.uFrom.value = pose.from; uniforms.uTo.value = pose.to; uniforms.uMorph.value = pose.morph;
    uniforms.uProgress.value = pose.progress; uniforms.uOpacity.value = pose.particleOpacity; uniforms.uDpr.value = dpr; uniforms.uDark.value = pose.atmosphere;
    // Fit the same physical proportions in portrait, without stretching a model.
    const fitWidth = mix(3.2, 4.5, pose.open);
    // A curved sheet comes closer to the lens mid-turn. Leave room for that
    // physical depth so its lower edge stays inside the stage as it passes.
    let turningDepth = 0;
    for (const leaf of pose.leaves) turningDepth = Math.max(turningDepth, leaf.curl);
    const distance = Math.max(pose.cameraDistance, fitWidth / (2 * Math.tan(radians(17.5)) * aspect)) + turningDepth * .55;
    camera.position.set(Math.sin(pose.progress * Math.PI * 1.4) * .3, .45, distance);
    camera.lookAt(0, .02, 0);
    ground.position.x = contact.position.x = world.position.x;
    if (pose.progress !== lastShadowProgress) { renderer.shadowMap.needsUpdate = true; lastShadowProgress = pose.progress; }
    if (renderer.shadowMap.enabled && renderer.shadowMap.needsUpdate) shadowUpdates++;
    renderer.render(scene, camera); frames++;
    // Accurate projected vertices are for local visual QA, not a production frame cost.
    if (inspectGeometry) {
      let left = Infinity, right = -Infinity, top = Infinity, bottom = -Infinity;
      book.traverse(object => {
        if (!(object instanceof Mesh) || !object.visible) return;
        const positions = object.geometry.getAttribute('position'), pageIndex = object.userData.pageIndex;
        const leaf = typeof pageIndex === 'number' ? pose.leaves[pageIndex] : undefined;
        const instanceCount = object instanceof InstancedMesh ? object.count : 1;
        for (let instance = 0; instance < instanceCount; instance++) {
          if (object instanceof InstancedMesh) object.getMatrixAt(instance, instanceTransform);
          for (let i = 0; i < positions.count; i++) {
            projected.set(positions.getX(i), positions.getY(i), positions.getZ(i));
            if (leaf) {
              const turn = radians(leaf.angle), theta = turn + leaf.curl * projected.x / 1.9;
              if (Math.abs(leaf.curl) > .0001) { const radius = 1.9 / leaf.curl; projected.x = radius * (Math.sin(theta) - Math.sin(turn)); projected.z += radius * (Math.cos(theta) - Math.cos(turn)); }
              else { const x = projected.x; projected.x = x * Math.cos(turn); projected.z -= x * Math.sin(turn); }
            }
            if (object instanceof InstancedMesh) projected.applyMatrix4(instanceTransform);
            projected.applyMatrix4(object.matrixWorld).project(camera);
            const x = (projected.x + 1) * width / 2, y = topInset + (1 - projected.y) * activeHeight / 2;
            left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y);
          }
        }
      });
      bounds.left = left; bounds.right = right; bounds.top = top; bounds.bottom = bottom;
    }
    metricsHost.aldusBookMetrics = { frames, particles: budget, dpr, drawCalls: renderer.info.render.calls,
      triangles: renderer.info.render.triangles, textures: renderer.info.memory.textures, geometries: renderer.info.memory.geometries,
      quality: effectiveQuality, progress: current.progress, disposed: false, shadowUpdates,
      particlesVisible: particles.visible, particleOpacity: pose.particleOpacity, ...bounds,
      coverAngle: pose.coverAngle, leafAngle0: pose.leaves[0].angle, leafAngle1: pose.leaves[1].angle,
      particleFrom: pose.from, particleTo: pose.to, particleMorph: pose.morph, cameraDistance: distance, particleGeometryId: geometry.id };
  };
  resize(host.clientWidth, host.clientHeight);
  return { render, resize, needsBudgetFrame: () => !disposed && !inspectGeometry && qualitySamples < 24, dispose() {
    if (disposed) return; disposed = true; canvas.removeEventListener('webglcontextlost', contextLost);
    instances.forEach(mesh => mesh.dispose());
    geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); textures.forEach(t => t.dispose());
    key.shadow.dispose(); renderer.dispose(); renderer.forceContextLoss(); canvas.remove(); scene.clear();
    metricsHost.aldusBookMetrics = { frames, disposed: true, quality: effectiveQuality, particles: budget, geometriesDisposed: geometries.size, materialsDisposed: materials.size, texturesDisposed: textures.size };
  } };
  } catch (failure) {
    if (lostHandler) canvas.removeEventListener('webglcontextlost', lostHandler);
    instances.forEach(mesh => mesh.dispose());
    geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); textures.forEach(t => t.dispose());
    renderer.dispose(); renderer.forceContextLoss(); canvas.remove(); throw failure;
  }
}
