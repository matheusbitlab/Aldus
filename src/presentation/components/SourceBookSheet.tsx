import { useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { SourceCatalogItem, sourceIdentity } from "@/src/domain/types/sourceCatalog";
import { UserSource } from "@/src/domain/types/sources";
import { useAppTheme } from "@/src/presentation/contexts/AppThemeContext";
import { useDownloadStore } from "@/src/presentation/stores/downloadStore";
import { useLibraryStore } from "@/src/presentation/stores/libraryStore";
import { appDependencies } from "@/src/presentation/services/dependencies";
import { sourceAcquisitionState, sourceDownloadId, sourceItemJob } from "@/src/presentation/services/sourceAcquisition";

export function SourceBookSheet({ source, item, importedBookId, onImported, onClose }: { source: UserSource; item: SourceCatalogItem; importedBookId?: string; onImported: () => Promise<void>; onClose: () => void }) {
  const { palette } = useAppTheme(), { jobs, enqueue, cancel } = useDownloadStore();
  const [message, setMessage] = useState<string | null>(null), [starting, setStarting] = useState(false);
  const job = sourceItemJob(item, jobs), state = sourceAcquisitionState(item, importedBookId, job), active = starting || state === "downloading";
  const acquire = async () => {
    if (active || importedBookId || item.availability === "unavailable") return;
    setStarting(true); setMessage(null);
    try {
      const format = item.format === "pdf" ? "pdf" : "epub", id = sourceDownloadId(source.id, item.remoteBookId);
      const fileName = `${item.title.replace(/\.(epub|pdf)$/i, "").replace(/[^\p{L}\p{N}_-]+/gu, "-").slice(0, 100) || "livro"}.${format}`;
      await enqueue({ id, url: item.url, fileName, format, source: { sourceId: source.id, remoteBookId: item.remoteBookId, sourceIdentity: sourceIdentity(source) }, drive: item.drive ? { sourceId: source.id, fileId: item.drive.fileId } : undefined, status: "queued", progress: 0, localUri: null, error: null, attempts: 0 });
      const completed = useDownloadStore.getState().jobs[id];
      if (completed?.status === "completed") {
        await onImported(); await useLibraryStore.getState().load();
        setMessage(completed.error ?? "Livro adicionado à Biblioteca. Agora você pode abri-lo.");
      }
    } catch { setMessage("Não foi possível concluir a ação. Confira a Biblioteca antes de tentar novamente."); }
    finally { setStarting(false); }
  };
  const open = async () => {
    if (!importedBookId) return;
    try {
      const local = await appDependencies.bookRepository.findById(importedBookId);
      if (!local) { await onImported(); setMessage("O livro local foi removido. Importe novamente para ler."); return; }
      onClose(); router.push({ pathname: "/reader/[bookId]", params: { bookId: local.id } } as never);
    } catch { setMessage("Não foi possível abrir o livro local."); }
  };
  const progress = job?.phase === "downloading" ? job.progressKnown ? `Baixando ${Math.round(job.progress * 100)}%` : "Baixando…" : job?.phase === "persisting" ? "Salvando na Biblioteca…" : job?.phase === "reading_metadata" ? "Lendo metadados…" : job?.phase === "validating" ? "Validando arquivo…" : "Preparando / importando…";
  return <Modal visible transparent onRequestClose={onClose}><View style={[styles.backdrop, { backgroundColor: palette.overlay }]}><View style={[styles.sheet, { backgroundColor: palette.panel }]}><ScrollView contentContainerStyle={{ gap: 16 }}>
    <Text style={{ color: palette.text, fontSize: 20, fontWeight: "600" }}>{item.title}</Text>
    <Text style={{ color: palette.secondaryText }}>{item.author ?? "Autor não informado"} · {item.format.toUpperCase()}{item.estimatedSize != null ? ` · ${(item.estimatedSize / 1048576).toFixed(1)} MB` : ""}</Text>
    {item.parentFolderId ? <Text style={{ color: palette.secondaryText, fontSize: 12 }}>{item.relativeFolderPath || "Raiz da fonte"}</Text> : null}
    <Text style={{ color: palette.secondaryText }}>{state === "imported" ? "Na biblioteca" : state === "unavailable" ? "Download indisponível nesta fonte." : "Arquivo remoto. Baixado somente quando você escolhe importar."}</Text>
    {active ? <View style={{ gap: 12 }}><ActivityIndicator color={palette.accent} /><Text accessibilityLiveRegion="polite" style={{ color: palette.secondaryText }}>{progress}</Text>{job?.cancellable ? <Pressable accessibilityRole="button" onPress={() => void cancel(job.id)}><Text style={{ color: palette.accent }}>Cancelar importação</Text></Pressable> : null}</View> : null}
    {message || job?.error ? <Text accessibilityRole="alert" style={{ color: palette.accent }}>{message ?? job?.error}</Text> : null}
    {job?.status === "cancelled" ? <Text style={{ color: palette.secondaryText }}>Importação cancelada.</Text> : null}
    {state === "imported" ? <Pressable accessibilityRole="button" onPress={() => void open()}><Text style={{ color: palette.accent }}>Abrir livro</Text></Pressable> : <Pressable accessibilityRole="button" disabled={active || state === "unavailable" || !source.enabled} onPress={() => void acquire()}><Text style={{ color: palette.accent, opacity: active || state === "unavailable" || !source.enabled ? 0.5 : 1 }}>Importar para a Biblioteca</Text></Pressable>}
    {!source.enabled && !importedBookId ? <Text style={{ color: palette.secondaryText }}>Ative ou reconecte a fonte para baixar; o catálogo continua pesquisável.</Text> : null}
    <Pressable accessibilityRole="button" onPress={onClose}><Text style={{ color: palette.accent }}>Fechar</Text></Pressable>
  </ScrollView></View></View></Modal>;
}
const styles = StyleSheet.create({ backdrop: { flex: 1, justifyContent: "center", padding: 20 }, sheet: { padding: 24, borderRadius: 12, maxHeight: "85%", maxWidth: 600, width: "100%", alignSelf: "center" } });
