import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, SafeAreaView, StatusBar, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { router } from "expo-router";
import { estimateCharactersPerPage, estimatePageNumber, estimateTotalPages } from "@/src/core/utils/pagination";
import { useReaderSettings } from "@/src/presentation/contexts/ReaderSettingsContext";
import { useReaderStore } from "@/src/presentation/stores/readerStore";
import { ReaderContent } from "@/src/presentation/components/ReaderContent";
import { ReaderControls } from "@/src/presentation/components/ReaderControls";
import { ReaderSettingsPanel } from "@/src/presentation/components/ReaderSettingsPanel";
import { appDependencies } from "@/src/presentation/services/dependencies";
import { StoredChapter } from "@/src/domain/entities/LibraryBook";

interface Props { bookId: string; }
export function ReaderScreen({ bookId }: Props) {
  const settings = useReaderSettings();
  const { width, height } = useWindowDimensions();
  const { progress, controlsVisible, setProgress, toggleControls } = useReaderStore();
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [chapters, setChapters] = useState<StoredChapter[]>([]);
  const [bookTitle, setBookTitle] = useState("The Quiet Hour");
  const [chapterTitle, setChapterTitle] = useState("Loading book...");
  const [bookStatus, setBookStatus] = useState<"loading" | "ready" | "error">("loading");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => { let active = true; void appDependencies.openBook.execute(bookId).then((result) => { if (!active) return; if (!result) { setBookStatus("error"); return; } setBookTitle(result.book.title); setChapters(result.chapters); setChapterTitle(result.chapters[0]?.title ?? "Empty book"); if (result.progress) setProgress(result.progress.percentage); setBookStatus("ready"); }).catch(() => { if (active) setBookStatus("error"); }); return () => { active = false; }; }, [bookId, setProgress]);
  const totalCharacters = useMemo(() => chapters.reduce((total, chapter) => total + chapter.characterCount, 0), [chapters]);
  const charactersPerPage = estimateCharactersPerPage({ totalCharacters, width, height, fontSize: settings.fontSize, lineHeight: settings.fontSize * 1.65, margin: settings.marginSize });
  const totalPages = estimateTotalPages(totalCharacters, charactersPerPage);
  const pageNumber = estimatePageNumber(progress * totalCharacters, totalCharacters, totalPages);

  useEffect(() => () => { if (saveTimer.current) clearTimeout(saveTimer.current); }, []);
  const handleProgress = (nextProgress: number) => {
    setProgress(nextProgress);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => { void appDependencies.updateReadingProgress.execute({ bookId, currentChapterId: chapters[0]?.id ?? null, percentage: nextProgress, pageNumber: estimatePageNumber(nextProgress * totalCharacters, totalCharacters, totalPages) }); }, 500);
  };

  if (bookStatus === "loading") return <SafeAreaView style={[styles.center, { backgroundColor: settings.palette.background }]}><ActivityIndicator color={settings.palette.accent} /><Text style={{ color: settings.palette.secondaryText, marginTop: 12 }}>Opening book...</Text></SafeAreaView>;
  if (bookStatus === "error") return <SafeAreaView style={[styles.center, { backgroundColor: settings.palette.background }]}><Text style={{ color: settings.palette.text }}>Book not found.</Text><Pressable onPress={() => router.push("/(tabs)/library")}><Text style={{ color: settings.palette.accent, marginTop: 16 }}>Back to library</Text></Pressable></SafeAreaView>;
  return <SafeAreaView style={[styles.screen, { backgroundColor: settings.palette.background }]}><StatusBar barStyle={settings.theme === "dark" ? "light-content" : "dark-content"} /><View style={styles.reader}><ReaderContent chapters={chapters} onProgressChange={handleProgress} /><Pressable accessibilityLabel="Toggle reading controls" onPress={toggleControls} style={styles.tapTarget} /><ReaderControls visible={controlsVisible} title={bookTitle} chapterTitle={chapterTitle} progress={progress} pageNumber={pageNumber} totalPages={totalPages} accent={settings.palette.accent} text={settings.palette.text} secondaryText={settings.palette.secondaryText} onBack={() => router.push("/(tabs)/library")} onSettings={() => setSettingsVisible(true)} onProgressChange={handleProgress} /><ReaderSettingsPanel visible={settingsVisible} onClose={() => setSettingsVisible(false)} /></View></SafeAreaView>;
}
const styles = StyleSheet.create({ screen: { flex: 1 }, center: { flex: 1, alignItems: "center", justifyContent: "center" }, reader: { flex: 1 }, tapTarget: { ...StyleSheet.absoluteFillObject, zIndex: 1 } });
