import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSourceStore } from "@/src/presentation/stores/sourceStore";
import { useAppTheme } from "@/src/presentation/contexts/AppThemeContext";
import { SourceManagerModal } from "@/src/presentation/components/SourceManagerModal";
import { SourceSummaryRow } from "@/src/presentation/components/SourceSummaryRow";

export default function Sources() {
  const { palette } = useAppTheme(), insets = useSafeAreaInsets();
  const { sources, load } = useSourceStore();
  const [managing, setManaging] = useState(false), [loading, setLoading] = useState(true), [error, setError] = useState<string | null>(null);
  useEffect(() => { void load().catch(() => setError("Não foi possível carregar as fontes.")).finally(() => setLoading(false)); }, [load]);
  return <View style={{ flex: 1, backgroundColor: palette.background, paddingTop: Math.max(insets.top, 16), paddingBottom: insets.bottom }}>
    <View style={{ padding: 16, gap: 12 }}>
      <Pressable accessibilityRole="button" onPress={() => router.back()}><Text style={{ color: palette.accent }}>← Voltar</Text></Pressable>
      <Text style={{ color: palette.text, fontSize: 28, fontWeight: "700" }}>Fontes</Text>
      <Text style={{ color: palette.secondaryText }}>Bibliotecas das fontes e catálogos de pesquisa. Livros são baixados somente quando você escolhe importar.</Text>
      <Pressable accessibilityRole="button" onPress={() => setManaging(true)}><Text style={{ color: palette.accent }}>Adicionar / gerenciar fontes</Text></Pressable>
      <Pressable accessibilityRole="button" onPress={() => router.push("/(tabs)/search" as never)}><Text style={{ color: palette.accent }}>Pesquisar em fontes públicas</Text></Pressable>
    </View>
    {loading ? <ActivityIndicator color={palette.accent} /> : <FlatList data={sources} keyExtractor={source => source.id} contentContainerStyle={{ padding: 16 }} renderItem={({ item }) => <SourceSummaryRow source={item} onManage={() => setManaging(true)} />} ListEmptyComponent={<Text style={{ color: palette.secondaryText }}>{error ?? "Nenhuma fonte cadastrada. Adicione uma pasta Drive ou um catálogo."}</Text>} />}
    <SourceManagerModal visible={managing} onClose={() => setManaging(false)} />
  </View>;
}
