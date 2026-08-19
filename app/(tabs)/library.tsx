import { useState } from "react";
import { ActivityIndicator, FlatList, Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import * as DocumentPicker from "expo-document-picker";
import { useLibrary } from "@/src/presentation/hooks/useLibrary";
import { useReaderSettings } from "@/src/presentation/contexts/ReaderSettingsContext";
import { appDependencies } from "@/src/presentation/services/dependencies";

export default function Library() {
  const { books, status, error, reload } = useLibrary();
  const { palette } = useReaderSettings();
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const importBook = async () => { setImportError(null); setImporting(true); try { const result = await DocumentPicker.getDocumentAsync({ type: ["application/epub+zip", "application/epub", "application/octet-stream"], copyToCacheDirectory: true }); if (!result.canceled && result.assets[0]) { await appDependencies.epubImporter.importFromUri(result.assets[0].uri, result.assets[0].name); await reload(); } } catch (importFailure) { setImportError(importFailure instanceof Error ? importFailure.message : "Arquivo EPUB inválido ou corrompido."); } finally { setImporting(false); } };
  if (status === "loading" || status === "idle") return <SafeAreaView style={[styles.center, { backgroundColor: palette.background }]}><ActivityIndicator color={palette.accent} /><Text style={{ color: palette.secondaryText, marginTop: 12 }}>Loading library...</Text></SafeAreaView>;
  if (status === "error") return <SafeAreaView style={[styles.center, { backgroundColor: palette.background }]}><Text style={{ color: palette.text }}>Could not load your library.</Text><Pressable onPress={() => void reload()}><Text style={{ color: palette.accent, marginTop: 16 }}>Try again</Text></Pressable></SafeAreaView>;
  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: palette.background }]}>
      <Text style={[styles.eyebrow, { color: palette.accent }]}>YOUR SHELF</Text>
      <Text style={[styles.title, { color: palette.text }]}>Library</Text>
      <Pressable accessibilityLabel="Import EPUB" style={[styles.importButton, { borderColor: palette.accent }]} onPress={() => void importBook()} disabled={importing}><Text style={{ color: palette.accent }}>{importing ? "Importing..." : "Import EPUB"}</Text></Pressable>
      {importError ? <Text style={[styles.error, { color: palette.accent }]}>{importError}</Text> : null}
      {books.length === 0 ? <Text style={{ color: palette.secondaryText }}>Your library is empty.</Text> : <FlatList data={books} keyExtractor={(book) => book.id} renderItem={({ item: book }) => <Pressable style={styles.book} onPress={() => router.push({ pathname: "/reader/[bookId]", params: { bookId: book.id } })}><View style={styles.cover}><Text style={styles.coverLabel}>{book.title.toUpperCase().split(" ").slice(0, 3).join("\n")}</Text></View><View><Text style={[styles.bookTitle, { color: palette.text }]}>{book.title}</Text><Text style={[styles.author, { color: palette.secondaryText }]}>{book.author}</Text><Text style={[styles.progress, { color: palette.accent }]}>{Math.round(book.progress * 100)}% read</Text></View></Pressable>} contentContainerStyle={styles.list} showsVerticalScrollIndicator={false} />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 28 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  eyebrow: { color: "#D97757", fontSize: 11, fontWeight: "700", letterSpacing: 2 },
  title: { color: "#1F2D2B", fontSize: 36, fontWeight: "700", marginTop: 8, marginBottom: 28 },
  importButton: { alignSelf: "flex-start", borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 24 },
  error: { marginBottom: 18 },
  list: { gap: 22, paddingBottom: 28 },
  book: { flexDirection: "row", gap: 18, alignItems: "center" },
  cover: { width: 104, height: 150, backgroundColor: "#1F4544", justifyContent: "center", padding: 14 },
  coverLabel: { color: "#F1D6A8", fontSize: 17, fontWeight: "700", lineHeight: 21 },
  bookTitle: { color: "#1F2D2B", fontSize: 18, fontWeight: "700" },
  author: { color: "#68716D", marginTop: 5 },
  progress: { color: "#D97757", marginTop: 20, fontWeight: "700" }
});
