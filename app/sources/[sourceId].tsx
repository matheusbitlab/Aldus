import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSourceStore } from "@/src/presentation/stores/sourceStore";
import { useAppTheme } from "@/src/presentation/contexts/AppThemeContext";
import { sourceCapabilities } from "@/src/domain/types/sourceCatalog";
import { SourceLibraryScreen } from "@/src/presentation/components/SourceLibraryScreen";

export default function SourceLibraryRoute() {
  const { sourceId } = useLocalSearchParams<{ sourceId: string }>();
  const { sources, load } = useSourceStore(), { palette } = useAppTheme();
  const [ready, setReady] = useState(false), [error, setError] = useState<string | null>(null);
  useEffect(() => { void load().catch(() => setError("Não foi possível ler as fontes.")).finally(() => setReady(true)); }, [load]);
  const source = sources.find(item => item.id === sourceId);
  if (!ready) return <ActivityIndicator color={palette.accent} />;
  if (!source || !sourceCapabilities(source).supportsCatalog) return <View style={{ flex: 1, padding: 24, gap: 16, backgroundColor: palette.background }}><Text style={{ color: palette.text }}>{error ?? (!source ? "Fonte removida ou não encontrada. Os livros importados permanecem na sua biblioteca." : "Esta fonte oferece somente pesquisa, não uma biblioteca completa.")}</Text><Pressable accessibilityRole="button" onPress={() => router.replace("/sources" as never)}><Text style={{ color: palette.accent }}>Voltar às fontes</Text></Pressable></View>;
  return <SourceLibraryScreen source={source} />;
}
