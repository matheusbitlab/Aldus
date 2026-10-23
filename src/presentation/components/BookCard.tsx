import React from "react";
import { View, Text, StyleSheet, Pressable, Platform } from "react-native";
import { Book } from "@/src/constants/mockBooks";
import { getBookCover } from "@/src/utils/coverHelper";
import { BookCover } from './BookCover';
import { THEMES } from "@/src/constants/theme";

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

  return (
    <Pressable
      accessibilityRole={selection === undefined ? "button" : "checkbox"}
      accessibilityState={selection === undefined ? undefined : { checked: selection }}
      aria-checked={selection}
      {...(Platform.OS === 'web' && selection !== undefined ? { onKeyDown: (event: { key: string; repeat?: boolean; preventDefault(): void }) => {
        if (event.key === ' ' || event.key === 'Enter') { event.preventDefault(); if (!event.repeat) onPress(book); }
      } } : {})}
      accessibilityLabel={selection === undefined ? `Abrir ${book.title}, de ${book.author}` : `Selecionar ${book.title}`}
      style={[styles.card, layout === "list" && styles.listCard, { backgroundColor: theme.uiBackground, borderColor: selection ? theme.accent : theme.border, borderWidth: selection ? 2 : 1 }]}
      onPress={() => onPress(book)}
    >
      <View style={[styles.cover, layout === "list" && styles.listCover, { backgroundColor: theme.accent }]}>
        <BookCover identity={book.id} title={book.title} author={book.author} format={book.format} source={coverSource} compact={layout === 'list'} />
      </View>
      <View style={[styles.infoContainer, layout === "list" && { flex: 1 }]}>
        {selection === undefined ? null : <Text style={{ color: theme.text, fontWeight: '600' }}>{selection ? '✓ Selecionado' : 'Selecionar livro'}</Text>}
        <Text style={[styles.title, { color: theme.text }]} numberOfLines={2}>
          {book.title}
        </Text>
        <Text style={[styles.author, { color: theme.uiText }]} numberOfLines={1}>
          {book.author}
        </Text>
        <View style={[styles.formatBadge, colors && { backgroundColor: colors.accent }]}>
          <Text style={styles.formatText}>{book.format.toUpperCase()}</Text>
        </View>
        {statusLabel ? <Text style={{ color: theme.uiText, fontSize: 11 }} numberOfLines={1}>{statusLabel}</Text> : null}
        {showProgress ? <View style={styles.progressTrack}>
          <View style={[styles.progressValue, { width: `${Math.round(progress * 100)}%`, backgroundColor: theme.accent }]} />
        </View> : null}
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  listCard: { flexDirection: "row", alignItems: "center", minHeight: 108 },
  listCover: { width: 72, height: 108 },
  card: {
    flex: 1,
    minWidth: 0,
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cover: {
    width: '100%',
    aspectRatio: 2 / 3,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  infoContainer: {
    padding: 8,
    gap: 5,
  },
  title: {
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  author: {
    fontSize: 11,
    opacity: 0.8,
    marginBottom: 6,
  },
  formatBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#0066CC',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  formatText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: 'bold',
  },
  progressTrack: {
    height: 3,
    backgroundColor: '#D8D8D8',
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 2,
  },
  progressValue: {
    height: '100%',
  },
});
