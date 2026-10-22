/** Scroll is the only clock. Shared by the WebGL renderer and deterministic tests. */
export const bookStops = [0, .19, .36, .52, .69, .85, 1] as const;
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
export const smooth = (value: number) => { const t = clamp(value); return t * t * (3 - 2 * t); };
export const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const envelope = (p: number, a: number, b: number, c: number, d: number) => smooth(ramp(p, a, b)) * (1 - smooth(ramp(p, c, d)));

export function bookScrollProgress(scrollTop: number, start: number, height: number, stickyHeight: number): number {
  if (![scrollTop, start, height, stickyHeight].every(Number.isFinite) || height <= stickyHeight) return 0;
  return clamp((scrollTop - start) / (height - stickyHeight));
}
/** Brief, frame-rate independent catch-up for discrete wheel events. It never
 * overshoots and converges to the exact scroll pose, so an idle story can sleep. */
export function followBookScroll(current: number, target: number, elapsedMs: number): number {
  const end = clamp(target);
  if (!Number.isFinite(current)) return end;
  const start = clamp(current), gap = end - start;
  if (Math.abs(gap) <= .00015) return end;
  const elapsed = Number.isFinite(elapsedMs) ? Math.max(0, Math.min(64, elapsedMs)) : 0;
  const next = start + gap * (1 - Math.exp(-elapsed / 48));
  return Math.abs(end - next) <= .00015 ? end : next;
}
/** 0 book, 1 open paper, 2 library, 3 Reader, 4 study, 5 community, 6 dispersed paper. */
const particleKeys = [[0, 6], [.075, 0], [.19, 1], [.36, 2], [.52, 3], [.69, 4], [.85, 5], [1, 0]] as const;
export function resolveBookPose(value: number) {
  const progress = clamp(value), open = smooth(ramp(progress, .065, .20)) * (1 - smooth(ramp(progress, .88, 1)));
  let chapter = 0;
  for (let i = 1; i < bookStops.length; i++) if (progress >= (bookStops[i - 1] + bookStops[i]) / 2) chapter = i;
  let key = 0;
  while (key < particleKeys.length - 2 && progress > particleKeys[key + 1][0]) key++;
  const [start, from] = particleKeys[key], [end, to] = particleKeys[key + 1];
  const morph = smooth(ramp(progress, start, end)), pulse = Math.sin(morph * Math.PI);
  const library = envelope(progress, .23, .33, .38, .45), reader = envelope(progress, .40, .49, .55, .61);
  const study = envelope(progress, .56, .65, .72, .79), community = envelope(progress, .74, .82, .88, .96);
  const closing = smooth(ramp(progress, .88, 1));
  return {
    progress, chapter, open, coverAngle: -174 * open,
    cameraX: mix(8, 3, open), cameraY: -22 + 26 * Math.sin(progress * Math.PI * 1.1),
    cameraZ: -5 + 5 * open, cameraDistance: 7 - .75 * open + .6 * community,
    bookScale: 1 - .29 * library - .26 * study - .48 * community,
    library, reader, study, community, closing,
    // A little atmosphere belongs to the closed-book introduction only.
    // Opening, page turns and closing keep the printed paper completely clean.
    from, to, morph, pulse, particleOpacity: (.10 + pulse * .74) * (1 - smooth(ramp(progress, .025, .065))),
    atmosphere: community * .94,
    captionOpacity: 1 - Math.pow(pulse, 4),
    leaves: [.27, .43, .59, .76].map((start, index) => {
      const t = smooth(ramp(progress, start, start + .095));
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
