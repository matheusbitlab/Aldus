import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { UserSource } from "@/src/domain/types/sources";
import { sourceCapabilities, sourceTypeLabel } from "@/src/domain/types/sourceCatalog";
import { sourceCatalogs } from "@/src/data/sources/sourceCatalogDependencies";
import { useSourceCatalog } from "@/src/presentation/hooks/useSourceCatalog";
import { useAppTheme } from "@/src/presentation/contexts/AppThemeContext";
import { useSearchStore } from "@/src/presentation/stores/searchStore";

export function SourceSummaryRow({ source, onManage }: { source: UserSource; onManage: () => void }) {
  const { palette } = useAppTheme(), view = useSourceCatalog(source), capabilities = sourceCapabilities(source);
  const open = () => {
    if (capabilities.supportsCatalog) router.push({ pathname: "/sources/[sourceId]", params: { sourceId: source.id } } as never);
    else if (capabilities.supportsSearch) { useSearchStore.getState().selectSource(source.name); router.push("/(tabs)/search" as never); }
    else onManage();
  };
  return <View style={[styles.row, { backgroundColor: palette.surface, borderColor: palette.border }]}>
    <Pressable accessibilityRole="button" accessibilityLabel={`${capabilities.supportsCatalog ? "Abrir biblioteca" : "Pesquisar"}: ${source.name}`} onPress={open} style={{ gap: 6 }}>
      <Text style={{ color: palette.text, fontSize: 17, fontWeight: "600" }}>{source.name}</Text>
      <Text style={{ color: palette.secondaryText }}>{sourceTypeLabel(source.kind)} · {capabilities.supportsCatalog ? view.catalog ? `${view.catalog.items.length} ${view.catalog.items.length === 1 ? "livro" : "livros"}` : "Ainda não indexada" : "Somente pesquisa"}</Text>
      {capabilities.supportsCatalog && view.catalog ? <Text style={{ color: palette.secondaryText, fontSize: 12 }}>Última atualização: {new Date(view.catalog.lastUpdated).toLocaleString("pt-BR")}</Text> : null}
      <Text style={{ color: palette.secondaryText, fontSize: 12 }}>{view.error ?? (view.status === "auth_required" ? "Reconectar para atualizar; catálogo local preservado" : !source.enabled ? "Desativada" : view.status === "refreshing" || view.status === "loading" && capabilities.supportsCatalog ? "Carregando…" : capabilities.requiresAuthorization ? "Conectado" : "Fonte cadastrada")}</Text>
    </Pressable>
    <View style={styles.actions}>
      {capabilities.supportsRefresh ? <Pressable accessibilityRole="button" disabled={view.status === "refreshing" || view.status === "loading"} onPress={() => view.status === "auth_required" || !source.enabled ? onManage() : void sourceCatalogs.refresh(source)}><Text style={{ color: palette.accent }}>{view.status === "auth_required" ? "Reconectar" : "Atualizar"}</Text></Pressable> : null}
      <Pressable accessibilityRole="button" onPress={onManage}><Text style={{ color: palette.accent }}>Gerenciar</Text></Pressable>
    </View>
  </View>;
}
const styles = StyleSheet.create({ row: { padding: 16, gap: 12, borderWidth: 1, borderRadius: 8, marginBottom: 12 }, actions: { flexDirection: "row", gap: 24 } });
