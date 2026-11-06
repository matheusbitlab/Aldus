import React from "react";
import { View, Text, StyleSheet, Pressable, Platform } from "react-native";
import { Book } from "@/src/constants/mockBooks";
import { getBookCover } from "@/src/utils/coverHelper";
import { BookCover } from './BookCover';
import { THEMES } from "@/src/constants/theme";
import { radius, space, typography } from "@/src/ui/tokens";

interface BookCardProps {
  book: Book;
  onPress: (book: Book) => void;
  themeMode?: 'light' | 'dark' | 'sepia';
  showProgress?: boolean;
  statusLabel?: string;
  layout?: "grid" | "list";
  selection?: boolean;
  colors?: { panel: string; text: string; secondaryText: string; separator: string; accent: string };
}

/**
 * Card de livro (Biblioteca e bibliotecas de fontes). A capa é a protagonista; texto em
 * hierarquia editorial (título, autor, formato · progresso) sem caixas extras.
 */
export const BookCard: React.FC<BookCardProps> = ({
  book,
  onPress,
  themeMode = 'light',
  showProgress = true,
  statusLabel,
  layout = "grid",
  selection,
  colors,
}) => {
  const theme = colors ? { ...THEMES[themeMode], uiBackground: colors.panel, text: colors.text, uiText: colors.secondaryText, border: colors.separator, accent: colors.accent } : THEMES[themeMode];
  const coverSource = getBookCover(book);
  const progress = Math.max(0, Math.min(1, book.progress));
  const percent = Math.round(progress * 100);
  const meta = [book.format.toUpperCase(), showProgress && percent > 0 ? `${percent}%` : null].filter(Boolean).join(" · ");

  return (
    <Pressable
      accessibilityRole={selection === undefined ? "button" : "checkbox"}
      accessibilityState={selection === undefined ? undefined : { checked: selection }}
      aria-checked={selection}
      {...(Platform.OS === 'web' && selection !== undefined ? { onKeyDown: (event: { key: string; repeat?: boolean; preventDefault(): void }) => {
        if (event.key === ' ' || event.key === 'Enter') { event.preventDefault(); if (!event.repeat) onPress(book); }
      } } : {})}
      accessibilityLabel={selection === undefined ? `Abrir ${book.title}, de ${book.author}` : `Selecionar ${book.title}`}
      style={({ pressed }) => [
        styles.card,
        layout === "list" && styles.listCard,
        { borderColor: selection ? theme.accent : 'transparent', opacity: pressed ? 0.88 : 1 },
      ]}
      onPress={() => onPress(book)}
    >
      <View style={[styles.cover, layout === "list" && styles.listCover, { backgroundColor: theme.border }]}>
        <BookCover identity={book.id} title={book.title} author={book.author} format={book.format} source={coverSource} compact={layout === 'list'} />
        {selection === undefined ? null : (
          <View style={[styles.check, { backgroundColor: selection ? theme.accent : 'rgba(0,0,0,0.35)', borderColor: '#FFFFFF' }]}>
            <Text style={styles.checkMark}>{selection ? '✓' : ''}</Text>
          </View>
        )}
      </View>
      <View style={[styles.infoContainer, layout === "list" && styles.listInfo]}>
        {selection === undefined ? null : <Text style={[typography.caption, { color: theme.text, fontWeight: '600' }]}>{selection ? '✓ Selecionado' : 'Selecionar livro'}</Text>}
        <Text style={[styles.title, { color: theme.text }]} numberOfLines={2}>
          {book.title}
        </Text>
        <Text style={[styles.author, { color: theme.uiText }]} numberOfLines={1}>
          {book.author}
        </Text>
        <Text style={[styles.meta, { color: theme.uiText }]} numberOfLines={1}>{meta}</Text>
        {statusLabel ? <Text style={[typography.caption, { color: theme.uiText }]} numberOfLines={1}>{statusLabel}</Text> : null}
        {showProgress && percent > 0 ? <View style={[styles.progressTrack, { backgroundColor: theme.border }]}>
          <View style={[styles.progressValue, { width: `${percent}%`, backgroundColor: theme.accent }]} />
        </View> : null}
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 0,
    borderRadius: radius.lg,
    borderWidth: 2,
    padding: 2,
  },
  listCard: { flexDirection: "row", alignItems: "center", gap: space.md, minHeight: 112 },
  cover: {
    width: '100%',
    aspectRatio: 2 / 3,
    justifyContent: 'center',
    overflow: 'hidden',
    borderRadius: radius.md,
  },
  listCover: { width: 72, height: 108, aspectRatio: undefined },
  check: {
    position: 'absolute',
    top: space.sm,
    right: space.sm,
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkMark: { color: '#FFFFFF', fontSize: 14, fontWeight: '700', lineHeight: 18 },
  infoContainer: {
    paddingTop: space.sm,
    paddingHorizontal: space.xxs,
    gap: space.xxs,
  },
  listInfo: { flex: 1, paddingTop: 0 },
  title: { ...typography.label, fontSize: 15, lineHeight: 20 },
  author: { ...typography.caption, fontSize: 13, lineHeight: 18 },
  meta: { ...typography.overline, letterSpacing: 0.6 },
  progressTrack: {
    height: 3,
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: space.xs,
  },
  progressValue: {
    height: '100%',
  },
});
