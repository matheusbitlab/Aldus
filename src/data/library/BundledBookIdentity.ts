import entries from './bundledBookManifest.json';
export const bundledBookManifest = entries;
export function findBundledAsset(id: string) {
  const base = id.split('--')[0];
  return entries.find(entry => entry.id === base || entry.legacyId === base);
}
