/** Scroll is the only clock. Shared by the WebGL renderer and deterministic tests. */
/** Each completed scene gets its own reading interval, measured in real scroll.
 * Only the gaps between these intervals move the camera, paper and objects. */
export const bookBeats = [
  { start: 0, end: .045, pose: 0 },
  { start: .155, end: .235, pose: .215 },
  { start: .305, end: .415, pose: .37 },
  { start: .465, end: .575, pose: .535 },
  { start: .635, end: .745, pose: .695 },
  { start: .795, end: .905, pose: .865 },
  { start: .975, end: 1, pose: 1 },
] as const;
export const bookStops = bookBeats.map((beat, i) => i === 0 ? 0 : i === bookBeats.length - 1 ? 1 : (beat.start + beat.end) / 2);
export const bookChapters = [
  { title: 'Sua leitura. Seu tempo.', description: 'Um livro. Histórias, ideias e possibilidades. Role para conhecer o Aldus.', label: 'O nascimento do Aldus' },
  { title: 'Todo livro abre um universo.', description: 'Abra espaço para a próxima página. EPUB e PDF, com o seu jeito de ler.', label: 'Abra o livro' },
  { title: 'Todos os seus livros. Um só lugar.', description: 'Importe EPUB e PDF, organize coleções e continue de onde parou.', label: 'Sua Biblioteca' },
  { title: 'A leitura no seu próprio ritmo.', description: 'Tema Papel, tipografia, grifos e progresso. Conforto para ficar mais uma página.', label: 'Reader' },
  { title: 'Leia. Aprenda. Relembre.', description: 'Anotações, marcadores, deck e flashcards. Ferramentas de estudo já presentes no aplicativo.', label: 'Estudo' },
  { title: 'Toda leitura pode abrir uma conversa.', description: 'Uma visão para conectar leitores e ideias. Comunidade em desenvolvimento e homologação.', label: 'Comunidade · visão em evolução' },
  { title: 'Seu próximo capítulo começa aqui.', description: 'Traga seus livros. Encontre seu ritmo. O resto começa na primeira página.', label: 'Um novo capítulo' },
] as const;
export const clamp = (value: number) => Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;
export const ramp = (value: number, start: number, end: number) => clamp((value - start) / (end - start));
export const smooth = (value: number) => { const t = clamp(value); return t * t * t * (t * (t * 6 - 15) + 10); };
export const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const envelope = (p: number, a: number, b: number, c: number, d: number) => smooth(ramp(p, a, b)) * (1 - smooth(ramp(p, c, d)));

/** Feather acceleration and deceleration, then cruise through the middle.
 * Position, velocity, acceleration and jerk meet the stationary holds at zero;
 * the maximum speed stays below a conventional cubic/quintic ease-in-out. */
export function bookTransitionEase(value: number): number {
  const t = clamp(value), feather = .24;
  const enter = (x: number) => { const u = x / feather; return feather * u ** 4 * (u * u - 3 * u + 2.5) / (1 - feather); };
  return t < feather ? enter(t) : t > 1 - feather ? 1 - enter(1 - t) : (t - feather / 2) / (1 - feather);
}

export function bookVisualProgress(value: number): number {
  const progress = clamp(value);
  for (let i = 0; i < bookBeats.length; i++) {
    const beat = bookBeats[i], next = bookBeats[i + 1];
    if (progress <= beat.end) return beat.pose;
    if (next && progress < next.start) return mix(beat.pose, next.pose, bookTransitionEase(ramp(progress, beat.end, next.start)));
  }
  return 1;
}

export function bookScrollProgress(scrollTop: number, start: number, height: number, stickyHeight: number): number {
  if (![scrollTop, start, height, stickyHeight].every(Number.isFinite) || height <= stickyHeight) return 0;
  return clamp((scrollTop - start) / (height - stickyHeight));
}
export type BookScrollState = { progress: number; velocity: number };
/** Analytic critical damping preserves velocity between same-direction wheel
 * impulses. Two 32ms stages retain the previous 64ms mean response delay.
 * Reversal and closer targets brake explicitly so the pose cannot overshoot. */
export function followBookScroll(current: BookScrollState, target: number, elapsedMs: number): BookScrollState {
  const end = clamp(target);
  if (!Number.isFinite(current.progress)) return { progress: end, velocity: 0 };
  const start = clamp(current.progress), gap = end - start;
  if (Math.abs(gap) <= .00001) return { progress: end, velocity: 0 };
  const elapsed = Number.isFinite(elapsedMs) ? Math.max(0, Math.min(64, elapsedMs)) : 0;
  const direction = Math.sign(gap), rate = 1 / 32;
  const velocity = direction * Math.min(Math.max(0, direction * (Number.isFinite(current.velocity) ? current.velocity : 0)), Math.abs(gap) * rate);
  if (!elapsed) return { progress: start, velocity };
  const coefficient = velocity - gap * rate, decay = Math.exp(-elapsed * rate);
  const next = end + (-gap + coefficient * elapsed) * decay;
  if (Math.abs(end - next) <= .00001) return { progress: end, velocity: 0 };
  return { progress: Math.min(Math.max(next, Math.min(start, end)), Math.max(start, end)), velocity: (velocity - rate * coefficient * elapsed) * decay };
}
/** 0 book, 1 open paper, 2 library, 3 Reader, 4 study, 5 community, 6 dispersed paper. */
const particleKeys = [[0, 6], [.075, 0], [.19, 1], [.36, 2], [.52, 3], [.69, 4], [.85, 5], [1, 0]] as const;
export function resolveBookPose(value: number) {
  const scroll = clamp(value), progress = bookVisualProgress(scroll);
  const open = smooth(ramp(progress, .065, .20)) * (1 - smooth(ramp(progress, .88, 1)));
  let chapter = 0, captionOpacity = 1;
  for (let i = 1; i < bookBeats.length; i++) {
    const boundary = (bookBeats[i - 1].end + bookBeats[i].start) / 2;
    if (scroll >= boundary) chapter = i;
    captionOpacity = Math.min(captionOpacity, smooth(Math.abs(scroll - boundary) / .012));
  }
  let key = 0;
  while (key < particleKeys.length - 2 && progress > particleKeys[key + 1][0]) key++;
  const [start, from] = particleKeys[key], [end, to] = particleKeys[key + 1];
  const morph = smooth(ramp(progress, start, end)), pulse = Math.sin(morph * Math.PI);
  const library = envelope(progress, .23, .33, .38, .45), reader = envelope(progress, .40, .49, .55, .61);
  const study = envelope(progress, .56, .65, .72, .79), community = envelope(progress, .74, .82, .88, .96);
  const closing = smooth(ramp(progress, .88, 1));
  return {
    progress: scroll, visualProgress: progress, chapter, open, coverAngle: -174 * open,
    cameraX: mix(8, 3, open), cameraY: -22 + 26 * Math.sin(progress * Math.PI * 1.1),
    cameraZ: -5 + 5 * open, cameraDistance: 7 - .75 * open + .6 * community,
    bookScale: 1 - .29 * library - .26 * study - .48 * community,
    library, reader, study, community, closing,
    // A little atmosphere belongs to the closed-book introduction only.
    // Opening, page turns and closing keep the printed paper completely clean.
    from, to, morph, pulse, particleOpacity: (.10 + pulse * .74) * (1 - smooth(ramp(progress, .025, .065))),
    atmosphere: community * .94,
    captionOpacity,
    leaves: Array.from({ length: 4 }, (_, index) => {
      // Use the full gap between completed scenes for the turn. The scroll
      // mapping already eases this movement; easing twice would rush its middle.
      const t = ramp(progress, bookBeats[index + 1].pose, bookBeats[index + 2].pose);
      return { angle: -171 * t * (1 - closing), curl: Math.sin(t * Math.PI) * .6 * (1 - closing), z: mix(.14 - index * .013, -.085 + index * .014, t) };
    }),
  };
}
export type BookPose = ReturnType<typeof resolveBookPose>;

export const initialBookPerformance = { at: 0, progress: 0, slow: 0, severe: 0, averageGap: 0, reduced: false, fallback: false };
/** Quality uses observed cadence, never the pose clock. Idle and chapter jumps
 * do not count; sustained small scroll steps work in either direction. */
export function assessBookPerformance(previous: typeof initialBookPerformance, progress: number, at: number) {
  const gap = at - previous.at, delta = Math.abs(progress - previous.progress);
  const moving = previous.at > 0 && Number.isFinite(gap) && gap > 0 && gap < 1000 && delta > .0001 && delta < .08;
  const averageGap = moving ? previous.averageGap ? previous.averageGap * .85 + gap * .15 : gap : 0;
  const slow = moving ? averageGap > 36 && gap > 36 ? previous.slow + 1 : Math.max(0, previous.slow - .25) : 0;
  const severe = previous.reduced && moving ? averageGap > 50 && gap > 50 ? previous.severe + 1 : Math.max(0, previous.severe - .25) : 0;
  const requiredFrames = averageGap > 180 ? 4 : 12;
  return { at, progress, slow, severe, averageGap, reduced: previous.reduced || slow >= requiredFrames, fallback: severe >= requiredFrames };
}

export function chooseBookQuality(width: number, memory = 8, cores = 8, saveData = false) {
  const low = saveData || (memory > 0 && memory < 4) || (cores > 0 && cores <= 2);
  return low ? { name: 'low', particles: 900, dpr: 1, shadows: false } as const
    : width <= 850 ? { name: 'mobile', particles: 1600, dpr: 1.25, shadows: false } as const
      : { name: 'desktop', particles: 4096, dpr: 1.5, shadows: true } as const;
}
