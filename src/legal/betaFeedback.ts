export type FeedbackCategory = 'Conta' | 'Sincronização' | 'Leitura' | 'Biblioteca' | 'Google Drive' | 'Outro';
export const feedbackCategories: readonly FeedbackCategory[] = ['Conta', 'Sincronização', 'Leitura', 'Biblioteca', 'Google Drive', 'Outro'];

/** Only explicitly entered text and non-personal build identity. Opening mail never sends it. */
export function feedbackMailto(input: { contact: string | null; version: string; build: string; platform: string; category: FeedbackCategory; description: string; reproduction: string }): string | null {
  if (!input.contact || !/^[^\s@?&#]+@[^\s@?&#]+\.[^\s@?&#]+$/.test(input.contact) || !input.description.trim()) return null;
  const body = [`Versão: ${input.version} · build ${input.build}`, `Plataforma: ${input.platform}`, `Categoria: ${input.category}`, '', 'Problema:', input.description.trim().slice(0, 4000), '', 'Como reproduzir:', input.reproduction.trim().slice(0, 4000) || 'Não informado', '', 'Não inclua senhas, códigos, links privados ou conteúdo dos seus livros.'].join('\n');
  return `mailto:${input.contact}?subject=${encodeURIComponent(`Aldus Beta — ${input.category}`)}&body=${encodeURIComponent(body)}`;
}
