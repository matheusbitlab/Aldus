import { Platform, TextStyle } from "react-native";

/**
 * Aldus design system — fundação "editorial calmo".
 *
 * Escalas únicas para espaço, raio, tipografia e elevação. As cores continuam em
 * `src/theme/tokens.ts` (`AppThemePalette`), consumidas via `useAppTheme()`.
 * Geometria do documento do Reader NÃO usa estes tokens: ela tem contratos próprios.
 */

/** Espaçamento em múltiplos de 4. Use as chaves, nunca números soltos. */
export const space = {
  none: 0,
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  section: 40,
  page: 56,
} as const;

export const radius = {
  none: 0,
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  pill: 999,
} as const;

/** Alvo mínimo de toque (WCAG 2.5.5 / Material 48dp ~ iOS 44pt). */
export const touchTarget = 44;

/** Larguras máximas de conteúdo para leitura confortável no desktop. */
export const layout = {
  /** Listas e formulários. */
  narrow: 640,
  /** Telas de conteúdo com grade. */
  content: 1120,
  /** Margem lateral da página por largura de janela. */
  gutter: (width: number) => (width < 360 ? space.lg : width < 768 ? space.xl : space.xxxl),
  /** Abaixo disso a navegação é inferior; acima, lateral (Web). */
  sidebarBreakpoint: 768,
} as const;

const serif = Platform.select<string | undefined>({
  web: 'Literata, Georgia, "Times New Roman", serif',
  android: "serif",
  ios: "Georgia",
  default: undefined,
});

const sans = Platform.select<string | undefined>({
  web: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  default: undefined,
});

export const fontFamily = { serif, sans } as const;

export type TextRole =
  | "display"
  | "title"
  | "heading"
  | "subheading"
  | "body"
  | "bodySmall"
  | "label"
  | "caption"
  | "overline";

/**
 * Nove papéis tipográficos substituem os ~25 tamanhos soltos. Títulos são serifados
 * (identidade editorial, igual à landing); texto de interface é sem serifa.
 * Tamanhos respeitam a ampliação de fonte do sistema (allowFontScaling padrão).
 */
export const typography: Record<TextRole, TextStyle> = {
  display: { fontFamily: serif, fontSize: 32, lineHeight: 40, fontWeight: "600", letterSpacing: -0.5 },
  title: { fontFamily: serif, fontSize: 26, lineHeight: 34, fontWeight: "600", letterSpacing: -0.3 },
  heading: { fontFamily: serif, fontSize: 20, lineHeight: 28, fontWeight: "600" },
  subheading: { fontFamily: sans, fontSize: 17, lineHeight: 24, fontWeight: "600" },
  body: { fontFamily: sans, fontSize: 16, lineHeight: 24, fontWeight: "400" },
  bodySmall: { fontFamily: sans, fontSize: 14, lineHeight: 21, fontWeight: "400" },
  label: { fontFamily: sans, fontSize: 14, lineHeight: 20, fontWeight: "600" },
  caption: { fontFamily: sans, fontSize: 12, lineHeight: 17, fontWeight: "400" },
  overline: { fontFamily: sans, fontSize: 12, lineHeight: 16, fontWeight: "600", letterSpacing: 0.4 },
};

/** Papéis que anunciam cabeçalho a leitores de tela. */
export const headingRoles: ReadonlySet<TextRole> = new Set(["display", "title", "heading"]);

/** Elevação discreta: sombra só em superfícies flutuantes (menus, folhas). */
export const elevation = {
  flat: {},
  floating: Platform.select({
    web: { boxShadow: "0 8px 28px rgba(20, 28, 24, 0.16)" } as object,
    default: { elevation: 8, shadowColor: "#000", shadowOpacity: 0.16, shadowRadius: 18, shadowOffset: { width: 0, height: 8 } },
  }),
} as const;

export const motion = {
  /** Duração padrão de transições de interface (não do Reader). */
  fast: 120,
  normal: 200,
} as const;
