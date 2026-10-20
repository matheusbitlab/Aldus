const palettes = [
  { paper: '#183D34', ink: '#F6F0DD', detail: '#BBA77A' },
  { paper: '#964D3D', ink: '#FFF2DC', detail: '#DAB491' },
  { paper: '#ECE3CF', ink: '#28453C', detail: '#93724B' },
  { paper: '#405765', ink: '#F4EDDD', detail: '#AAC1C2' },
  { paper: '#B7C3AA', ink: '#223F35', detail: '#5C735D' },
] as const;

/** Presentation only: never modifies book metadata or queries a cover service. */
export function editorialCover(identity: string, title: string, author?: string) {
  let hash = 2166136261;
  for (let index = 0; index < identity.length; index++) hash = Math.imul(hash ^ identity.charCodeAt(index), 16777619);
  return {
    ...palettes[(hash >>> 0) % palettes.length],
    title: title.replace(/\.(?:epub|pdf)\s*$/i, '').trim() || 'Sem título',
    author: author?.trim() || 'Autor não informado',
  };
}
