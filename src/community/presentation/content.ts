export const communityDestinations = {
  clubs: { title: "Clubes", description: "Encontros em torno de obras e gêneros.", empty: "Os clubes estão em construção. Aqui você poderá acompanhar uma leitura conjunta e conversar sobre cada obra." },
  forums: { title: "Fóruns", description: "Espaço para ideias e interpretações.", empty: "As discussões estão em construção. Obras, teorias e capítulos terão espaço para conversa, com indicação de spoilers." },
  people: { title: "Pessoas", description: "Outras jornadas de leitura.", empty: "A conexão entre leitores está em construção. Perfis públicos e seguidores chegarão em uma próxima etapa." },
} as const;
export type CommunityDestination = keyof typeof communityDestinations;
export function destination(value: unknown) { return typeof value === "string" && Object.hasOwn(communityDestinations, value) ? communityDestinations[value as CommunityDestination] : null; }
export const noActivity = "Nenhuma atividade ainda. Comece um livro para construir sua jornada literária.";
