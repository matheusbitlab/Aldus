/** Deterministic, stable GPU buffers. No account data, timers or Three.js import. */
const W = 1.9, H = 2.7;
const fract = (v: number) => v - Math.floor(v);
const noise = (i: number, seed: number) => fract(Math.sin(i * 127.1 + seed * 311.7) * 43758.5453);
export const communityNodes = [
  [-1.65, .9, .05], [-.6, 1.5, -.45], [.8, 1.05, .25], [1.65, .25, -.4],
  [1.05, -.8, .35], [-.3, -.4, .75], [-1.65, -.75, -.2], [.1, .55, -.8],
] as const;
export const communityEdges = [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 0], [0, 7], [1, 7], [2, 7], [4, 7], [5, 7], [5, 0]] as const;
export const libraryBooks = [
  { x: -1.22, y: .36, z: .1, angle: -.18, color: '#b16b4b', title: 'ENTRE\nPÁGINAS' },
  { x: 0, y: .56, z: .35, angle: .04, color: '#244d3c', title: 'O TEMPO\nDE LER' },
  { x: 1.2, y: .23, z: -.05, angle: .2, color: '#87724d', title: 'NOVAS\nHISTÓRIAS' },
] as const;
export function createParticleTargets(count: number) {
  if (!Number.isInteger(count) || count < 1 || count > 8192) throw new Error('Invalid particle budget');
  const targets = Array.from({ length: 7 }, () => new Float32Array(count * 3)), seeds = new Float32Array(count);
  const put = (target: number, i: number, x: number, y: number, z: number) => targets[target].set([x, y, z], i * 3);
  for (let i = 0; i < count; i++) {
    const a = noise(i, 1), b = noise(i, 2), c = noise(i, 3), face = i % 6;
    seeds[i] = noise(i, 9);
    put(0, i, face < 2 ? (a - .5) * W : face < 4 ? (face === 2 ? -.5 : .5) * W : (a - .5) * W,
      face < 4 ? (b - .5) * H : (face === 4 ? -.5 : .5) * H,
      face < 2 ? (face === 0 ? -.16 : .16) : (c - .5) * .32);
    put(1, i, (a - .5) * W * 1.9, (b - .5) * H, .05 + Math.sin(a * Math.PI) * .12);
    const book = libraryBooks[i % 3], bx = (a - .5) * .94, bz = face < 3 ? .07 : -.07;
    put(2, i, book.x + bx * Math.cos(book.angle) + bz * Math.sin(book.angle), book.y + (b - .5) * 1.45,
      1 + book.z - bx * Math.sin(book.angle) + bz * Math.cos(book.angle));
    const line = i % 20, textX = (a - .5) * (line < 3 ? 1.25 : 1.8);
    put(3, i, textX + .95, 1.14 - line * .125 + (b - .5) * .018, .12 + Math.sin(a * Math.PI) * .035);
    const card = i % 3, angle = (card - 1) * -.17, cx = (a - .5) * 1.7, cy = (b - .5) * 1.03;
    put(4, i, (card - 1) * .65 + cx * Math.cos(angle) - cy * Math.sin(angle), .3 - card * .28 + cx * Math.sin(angle) + cy * Math.cos(angle), 1.25 - card * .28);
    const node = communityNodes[i % communityNodes.length], theta = a * Math.PI * 2, phi = Math.acos(2 * b - 1), radius = .12 + c * .10;
    if ((i % communityNodes.length) % 2 === 0) put(5, i, node[0] + (a - .5) * .25, node[1] + (b - .5) * .35, node[2] + (c - .5) * .08);
    else put(5, i, node[0] + radius * Math.sin(phi) * Math.cos(theta), node[1] + radius * Math.cos(phi), node[2] + radius * Math.sin(phi) * Math.sin(theta));
    const spread = 1.2 + c * 1.7;
    put(6, i, Math.cos(a * Math.PI * 2) * spread, (b - .5) * 3.1, Math.sin(a * Math.PI * 2) * spread * .45);
  }
  return { targets, seeds };
}
