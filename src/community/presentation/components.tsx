import type { PropsWithChildren } from "react";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppTheme } from "@/src/presentation/contexts/AppThemeContext";
import type { LiteraryProfile, ReadingActivity, ReadingStats } from "../domain/models";
import { activityText } from "../domain/progression";
import { useCommunity } from "./CommunityProvider";
import { noActivity } from "./content";

export function CommunityPage({ title, children }: PropsWithChildren<{ title: string }>) {
  const { palette } = useAppTheme(), insets = useSafeAreaInsets();
  return <View style={{ flex: 1, backgroundColor: palette.background }}>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.page, { paddingTop: Math.max(insets.top, 16), paddingBottom: Math.max(insets.bottom, 24) }]}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Voltar" style={styles.back} onPress={() => router.canGoBack() ? router.back() : router.replace("/(tabs)/settings")}>
          <Ionicons name="chevron-back" size={24} color={palette.text} />
        </Pressable>
        <Text accessibilityRole="header" style={[styles.title, { color: palette.text }]}>{title}</Text>
      </View>
      {children}
    </ScrollView>
  </View>;
}
export function Copy({ children, secondary = false }: PropsWithChildren<{ secondary?: boolean }>) {
  const { palette } = useAppTheme();
  return <Text style={[styles.copy, { color: secondary ? palette.secondaryText : palette.text }]}>{children}</Text>;
}
export function Card({ title, children }: PropsWithChildren<{ title?: string }>) {
  const { palette } = useAppTheme();
  return <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.border }]}>
    {title && <Text accessibilityRole="header" style={[styles.cardTitle, { color: palette.text }]}>{title}</Text>}{children}
  </View>;
}
export function Action({ label, onPress, disabled = false }: { label: string; onPress(): void; disabled?: boolean }) {
  const { palette } = useAppTheme();
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }} disabled={disabled} onPress={onPress}
    style={({ pressed }) => [styles.action, { backgroundColor: palette.surfaceSecondary, borderColor: palette.border, opacity: disabled ? .6 : pressed ? .75 : 1 }]}>
    <Text style={[styles.actionText, { color: palette.text }]}>{label}</Text>
  </Pressable>;
}
export function CommunityGate({ children }: PropsWithChildren) {
  const { view, loading, error, refresh } = useCommunity(), { palette } = useAppTheme();
  if (error) return <Card title="Comunidade indisponível"><Text accessibilityRole="alert" style={{ color: palette.text }}>{error}</Text><Action label="Tentar novamente" onPress={() => void refresh()} /></Card>;
  if (!view) return <View accessibilityLabel="Carregando comunidade" style={{ padding: 24 }}><ActivityIndicator color={palette.text} /></View>;
  return <>{loading && <Copy secondary>Atualizando sua jornada…</Copy>}{children}</>;
}
export function ProfileIdentity({ profile }: { profile: LiteraryProfile }) {
  const { palette } = useAppTheme();
  return <View style={styles.identity}>
    {profile.avatar ? <Image source={{ uri: profile.avatar }} accessibilityLabel={`Avatar de ${profile.displayName}`} style={styles.avatar} /> :
      <View style={[styles.avatar, { backgroundColor: palette.surfaceSecondary }]}><Text style={{ color: palette.text, fontSize: 24 }}>{profile.displayName[0]?.toUpperCase()}</Text></View>}
    <View style={{ flex: 1, gap: 4 }}><Text style={[styles.name, { color: palette.text }]}>{profile.displayName}</Text><Copy secondary>@{profile.username}</Copy></View>
  </View>;
}
export function Meter({ fraction, label }: { fraction: number; label: string }) {
  const { palette } = useAppTheme();
  return <View style={{ gap: 8 }}><Copy>{label}</Copy><View accessibilityRole="progressbar" accessibilityLabel={label}
    accessibilityValue={{ min: 0, max: 100, now: Math.round(fraction * 100) }} style={[styles.track, { backgroundColor: palette.surfaceSecondary }]}>
    <View style={{ height: 6, width: `${Math.round(fraction * 100)}%`, backgroundColor: palette.accent }} />
  </View></View>;
}
export function Stats({ stats }: { stats: ReadingStats }) {
  const { palette } = useAppTheme();
  const values: Array<[string, number | null]> = [["Iniciados", stats.started], ["Lendo agora", stats.reading], ["Concluídos", stats.completed], ["Interrompidos", stats.interrupted], ["Abandonados", stats.abandoned], ["Não iniciados", stats.unread], ["Páginas lidas", stats.pagesRead], ["Dias em sequência", stats.streak]];
  return <View style={styles.stats}>{values.map(([label, value]) => <View key={label} style={styles.stat}>
    <Text style={[styles.statValue, { color: palette.text }]}>{value ?? "—"}</Text><Copy secondary>{label}{value === null ? " · não disponível" : ""}</Copy>
  </View>)}<Copy secondary>Tempo de leitura: {stats.readingSeconds === null ? "não disponível" : `${Math.floor(stats.readingSeconds / 60)} min`}</Copy></View>;
}
export function Timeline({ activities }: { activities: ReadingActivity[] }) {
  return <Card title="Atividade recente">{activities.length ? [...activities].sort((a, b) => b.recordedAt - a.recordedAt || b.id.localeCompare(a.id)).slice(0, 20).map(a =>
    <View key={a.id} style={{ gap: 4, paddingVertical: 6 }}><Copy>{activityText(a)}</Copy><Copy secondary>{a.occurredAt === null ? "Registrado em " : ""}{new Date(a.occurredAt ?? a.recordedAt).toLocaleDateString("pt-BR")}</Copy></View>) : <Copy secondary>{noActivity}</Copy>}</Card>;
}
export const styles = StyleSheet.create({
  page: { alignSelf: "center", width: "100%", maxWidth: 680, paddingHorizontal: 18, gap: 16 },
  header: { flexDirection: "row", alignItems: "center", gap: 8 }, back: { minWidth: 48, minHeight: 48, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 27, fontWeight: "700", flex: 1 }, card: { borderWidth: 1, borderRadius: 8, padding: 18, gap: 12 },
  cardTitle: { fontSize: 18, fontWeight: "600" }, copy: { fontSize: 14, lineHeight: 21 },
  action: { borderWidth: 1, borderRadius: 6, minHeight: 48, padding: 12, alignItems: "center", justifyContent: "center" }, actionText: { fontSize: 14, fontWeight: "600" },
  identity: { flexDirection: "row", alignItems: "center", gap: 14 }, avatar: { height: 64, width: 64, borderRadius: 32, alignItems: "center", justifyContent: "center" },
  name: { fontSize: 21, fontWeight: "600" }, track: { height: 6, borderRadius: 3, overflow: "hidden" },
  stats: { flexDirection: "row", flexWrap: "wrap", gap: 14 }, stat: { width: "45%", minWidth: 110, gap: 4 }, statValue: { fontSize: 24, fontWeight: "600" },
});
