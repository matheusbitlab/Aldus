/** Pure presentation geometry. No timers, account data or authorization. */
export const bookStops = [0, .23, .43, .62, .81, 1] as const;
export const bookChapters = [
  { title: 'Uma nova história começa aqui.', description: 'Role para abrir o livro e conhecer o Aldus. A demonstração usa somente conteúdo ilustrativo.' },
  { title: 'Sua Biblioteca, do seu jeito.', description: 'Reúna EPUB e PDF, organize suas leituras e encontre o lugar de cada livro.' },
  { title: 'O Reader acompanha seu ritmo.', description: 'Tema Papel, tipografia, progresso e marcações: uma leitura que se adapta a você.' },
  { title: 'Estudo para revisitar ideias.', description: 'Retome anotações, reúna flashcards em um deck e revise com repetição espaçada.' },
  { title: 'Meu Plano. Espaço para continuar.', description: 'Sincronização e armazenamento privado fazem parte do Gratuito, sujeitos à franquia e à disponibilidade do ambiente. Pro sem contratação ativa.' },
  { title: 'Seu próximo capítulo espera.', description: 'Traga seus livros. Encontre seu ritmo. Continue para conhecer os recursos do Aldus.' },
] as const;
const clamp = (value: number) => Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;
const between = (value: number, start: number, end: number) => clamp((value - start) / (end - start));
const smooth = (value: number) => value * value * (3 - 2 * value);
const mix = (start: number, end: number, t: number) => start + (end - start) * t;

export function bookScrollProgress(scrollTop: number, start: number, height: number, stickyHeight: number): number {
  if (![scrollTop, start, height, stickyHeight].every(Number.isFinite) || height <= stickyHeight) return 0;
  return clamp((scrollTop - start) / (height - stickyHeight));
}
export function resolveBookPose(value: number) {
  const progress = clamp(value), open = smooth(between(progress, 0, .19));
  const chapter = progress < .19 ? 0 : progress < .4 ? 1 : progress < .59 ? 2 : progress < .78 ? 3 : progress < .97 ? 4 : 5;
  return {
    progress, open, chapter, coverAngle: -180 * open, coverZ: mix(20, -19, open),
    cameraX: mix(11, 5, open), cameraY: mix(-24, -7, open), cameraZ: mix(-5, -1, open),
    leaves: [.30, .49, .68, .87].map((start, index) => {
      const t = smooth(between(progress, start, start + .10));
      return { angle: -179.5 * t, curl: Math.sin(t * Math.PI) * 10, z: mix(14 - index * 3, -13 + index * 3, t) };
    }),
  };
}
