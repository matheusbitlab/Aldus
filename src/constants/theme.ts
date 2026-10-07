export type ReaderThemeMode = 'light' | 'dark' | 'sepia';

export interface ThemeColors {
  background: string;
  text: string;
  uiBackground: string;
  uiText: string;
  accent: string;
  border: string;
}

export const THEMES: Record<ReaderThemeMode, ThemeColors> = {
  light: {
    background: '#FFFFFF',
    text: '#1A1A1A',
    uiBackground: '#F8F9FA',
    uiText: '#212529',
    accent: '#0066CC',
    border: '#E9ECEF',
  },
  sepia: {
    background: '#F4ECD8',
    text: '#5F4B32',
    uiBackground: '#E8DFC8',
    uiText: '#4A3B27',
    accent: '#8C6D46',
    border: '#D8CEB9',
  },
  dark: {
    background: '#121212',
    text: '#E0E0E0',
    uiBackground: '#1E1E1E',
    uiText: '#F5F5F5',
    accent: '#4D9FEC',
    border: '#2C2C2C',
  },
};