import { Platform } from 'react-native';

/** Editorial titles use installed platform fonts; no download or native font dependency. */
export const appUi = {
  title: { fontFamily: Platform?.OS === 'web' ? 'Georgia' : Platform?.OS === 'android' ? 'serif' : undefined, fontSize: 28, fontWeight: '600' as const, lineHeight: 36 },
  sectionTitle: { fontSize: 19, fontWeight: '600' as const, lineHeight: 27 },
  space: { small: 8, medium: 16, large: 24 },
  radius: { small: 6, medium: 10, large: 16 },
  touchTarget: 44,
} as const;
