import { useEffect, useRef, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Modal, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { UserSource, SourceKind } from "@/src/domain/types/sources";
import { configuredCatalog, BUILTIN_CATALOG_NAMES } from "@/src/data/scraping/catalogPlugins";
import { useAppTheme } from "@/src/presentation/contexts/AppThemeContext";
import { appDependencies } from "@/src/presentation/services/dependencies";
import { useSourceStore } from "@/src/presentation/stores/sourceStore";
import { googleDrive } from "@/src/data/drive/driveDependencies";
import { parseDriveFolder } from "@/src/data/drive/driveFolder";

interface Props {
  visible: boolean;
  onClose: () => void;
}

interface ProbeResult {
  status: "active" | "error";
  error: string | null;
}

export function SourceManagerModal({ visible, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const { palette } = useAppTheme();
  const { sources, load, add, update, remove } = useSourceStore();
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [kind, setKind] = useState<SourceKind>("json");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [driveReady, setDriveReady] = useState(false);
  const operation = useRef<AbortController | null>(null);

  useEffect(() => {
    if (visible) {
      void load();
    }
    return () => { operation.current?.abort(); operation.current = null; setBusyId(null); };
  }, [visible, load]);

  useEffect(() => {
    // A saved Drive source also needs GIS ready for the row's reconnect gesture.
    if (visible && (kind === "google-drive" || sources.some(source => source.kind === "google-drive"))) void googleDrive.authorization.prepare().then(() => setDriveReady(true)).catch(() => setDriveReady(false));
  }, [visible, kind, sources]);

  const probe = async (source: UserSource, signal: AbortSignal): Promise<ProbeResult> => {
    setBusyId(source.id);
    try {
      if (source.kind === "google-drive") {
        await googleDrive.connect(source, signal);
        await googleDrive.list(source, signal, true);
        return { status: "active", error: null };
      }
      const response = await appDependencies.searchBooks.executeDetailed(
        "Dom Casmurro",
        [configuredCatalog(source)], {}, signal
      );
      const outcome = response.sources[0];
      if (!outcome || outcome.status === "error") {
        return { status: "error", error: outcome?.error ?? "A fonte não respondeu." };
      }
      return { status: "active", error: null };
    } catch (failure) {
      if (signal.aborted && source.kind === "google-drive") {
        googleDrive.authorization.invalidate(source.id);
        googleDrive.clearIndex(source.id);
      }
      return {
        status: "error",
        error: failure instanceof Error ? failure.message : "Não foi possível testar a fonte.",
      };
    } finally {
      if (operation.current?.signal === signal) setBusyId(null);
    }
  };

  const save = async () => {
    if (busyId) return;
    setFormError(null);
    let parsedUrl: URL | undefined;
    let folder: ReturnType<typeof parseDriveFolder> | undefined;
    try {
      if (kind === "google-drive") folder = parseDriveFolder(url);
      else parsedUrl = new URL(url.trim().replaceAll("{query}", "consulta"));
    } catch {
      setFormError(kind === "google-drive" ? "Informe o ID ou link de uma pasta do Google Drive." : "Informe uma URL de busca válida.");
      return;
    }
    if ((!folder && !/^https?:$/.test(parsedUrl?.protocol ?? "")) || !name.trim()) {
      setFormError("Informe o nome da fonte e uma URL HTTP ou HTTPS.");
      return;
    }
    if (["Todos", ...BUILTIN_CATALOG_NAMES, "BNDigital", "Minhas Fontes"].some(reserved => reserved.toLocaleLowerCase() === name.trim().toLocaleLowerCase()) || sources.some((source) => source.id !== editingId && source.name.toLocaleLowerCase() === name.trim().toLocaleLowerCase())) {
      setFormError("Escolha um nome único para a fonte.");
      return;
    }

    const sourceId = editingId ?? `source-draft-${Date.now()}`;
    const existing = sources.find((source) => source.id === editingId);
    const candidate: UserSource = {
      id: sourceId,
      name: name.trim(),
      url: url.trim(),
      kind,
      folderId: folder?.folderId,
      resourceKey: folder?.resourceKey,
      enabled: true,
      createdAt: existing?.createdAt ?? Date.now(),
    };
    const controller = operation.current = new AbortController();
    const result = await probe(candidate, controller.signal);
    if (controller.signal.aborted) return;
    if (existing?.kind === "google-drive" && kind !== "google-drive") await googleDrive.disconnect(sourceId);
    const verified: UserSource = {
      ...candidate,
      enabled: result.status === "active",
      status: result.status,
      lastError: result.error,
      lastCheckedAt: Date.now(),
    };

    if (editingId) await update(editingId, verified);
    else await add(verified);
    resetForm();
  };

  const resetForm = () => {
    setName("");
    setUrl("");
    setKind("json");
    setEditingId(null);
    setFormError(null);
  };

  const edit = (source: UserSource) => {
    setEditingId(source.id);
    setName(source.name);
    setUrl(source.url);
    setKind(source.kind === "google-drive" ? "google-drive" : source.kind === "json" ? "json" : source.kind === "opds" ? "opds" : "html");
    setFormError(null);
  };

  const refresh = async (source: UserSource) => {
    if (busyId) return;
    const controller = operation.current = new AbortController();
    const result = await probe(source, controller.signal);
    if (controller.signal.aborted) return;
    await update(source.id, {
      status: result.status,
      lastError: result.error,
      lastCheckedAt: Date.now(),
      enabled: result.status === "active" ? source.kind === "google-drive" || source.enabled : false,
    });
  };

  const toggle = async (source: UserSource, enabled: boolean) => {
    if (!enabled) {
      await update(source.id, { enabled: false });
      return;
    }
    const controller = operation.current = new AbortController();
    const result = await probe(source, controller.signal);
    if (controller.signal.aborted) return;
    await update(source.id, {
      enabled: result.status === "active",
      status: result.status,
      lastError: result.error,
      lastCheckedAt: Date.now(),
    });
  };

  const disconnect = async (source: UserSource) => {
    setBusyId(source.id);
    try {
      const revoked = await googleDrive.disconnect(source.id);
      await update(source.id, { enabled: false, status: "error", lastError: revoked ? "Drive desconectado. Livros importados preservados." : "Desconectado localmente. Revogação Google não confirmada; remova o acesso em myaccount.google.com/connections. Livros preservados." });
    } finally { setBusyId(null); }
  };
  const reportFailure = (failure: unknown) => setFormError(failure instanceof Error ? failure.message : "Não foi possível atualizar a fonte.");

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={[styles.backdrop, { backgroundColor: palette.overlay, paddingTop: Math.max(insets.top, 12), paddingBottom: Math.max(insets.bottom, 12) }]}>
        <View style={[styles.sheet, { backgroundColor: palette.panel }]}>
          <View style={styles.titleRow}>
            <Text style={[styles.title, { color: palette.text }]}>Minhas fontes</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Fechar fontes" onPress={onClose} style={styles.iconButton}>
              <Ionicons name="close" size={22} color={palette.text} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <Text style={[styles.sectionTitle, { color: palette.secondaryText }]}>{editingId ? "EDITAR FONTE" : "ADICIONAR FONTE"}</Text>
            <TextInput
              value={name}
              editable={!busyId}
              onChangeText={setName}
              placeholder="Nome da fonte"
              placeholderTextColor={palette.secondaryText}
              style={[styles.input, { color: palette.text, backgroundColor: palette.surface, borderColor: palette.separator }]}
            />
            <TextInput
              value={url}
              editable={!busyId}
              onChangeText={setUrl}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              placeholder={kind === "google-drive" ? "Link da pasta Drive ou folderId" : "https://catalogo.exemplo/busca?q={query}"}
              placeholderTextColor={palette.secondaryText}
              style={[styles.input, { color: palette.text, backgroundColor: palette.surface, borderColor: palette.separator }]}
            />
            <View style={[styles.segmented, { backgroundColor: palette.surfaceSecondary }]}>
              {(["json", "opds", "html", "google-drive"] as const).map((sourceKind) => (
                <Pressable
                  key={sourceKind}
                  disabled={Boolean(busyId)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: kind === sourceKind }}
                  onPress={() => setKind(sourceKind)}
                  style={[styles.segment, kind === sourceKind ? { backgroundColor: palette.accent } : null]}
                >
                  <Text style={{ color: kind === sourceKind ? "#FFFFFF" : palette.text, fontWeight: "600" }}>
                    {sourceKind === "json" ? "JSON" : sourceKind === "opds" ? "OPDS" : sourceKind === "google-drive" ? "Drive" : "HTML"}
                  </Text>
                </Pressable>
              ))}
            </View>
            {kind !== "google-drive" ? <Text style={[styles.helper, { color: palette.secondaryText }]}>{kind === "json" ? 'URL de catálogo com { "books": [{ "title": "Livro", "author": "Autor", "url": "https://…/livro.epub" }] }. A busca filtra título e autor. Na Web, o servidor precisa permitir CORS.' : 'O endereço será testado antes de ficar ativo. A URL pode usar {query}. Na Web, o servidor precisa permitir CORS.'}</Text> : null}
            {kind === "google-drive" ? <Text style={[styles.helper, { color: palette.secondaryText }]}>Autorização separada do login: solicita drive.readonly, que permite ler e baixar arquivos de todo o Drive. O Aldus consulta somente a pasta cadastrada e baixa apenas o livro escolhido. Índice de metadados em memória por 5 minutos; Atualizar reconecta e refaz o índice. Sem subpastas/atalhos. Tokens não são salvos pelo app. Revogar pode afetar outras fontes da mesma conta/projeto Google. {driveReady ? "" : "Autorização Web ainda não pronta ou configuração ausente; consulte GOOGLE_DRIVE_IMPLEMENTATION.md."}</Text> : null}
            {formError ? <Text accessibilityRole="alert" style={[styles.error, { color: palette.accent }]}>{formError}</Text> : null}
            <View style={styles.formActions}>
              {editingId ? (
                <Pressable accessibilityRole="button" onPress={resetForm} style={[styles.secondaryButton, { borderColor: palette.separator }]}>
                  <Text style={{ color: palette.text }}>Cancelar</Text>
                </Pressable>
              ) : null}
              <Pressable accessibilityRole="button" disabled={busyId !== null} onPress={() => void save().catch((error) => setFormError(error instanceof Error ? error.message : "Não foi possível salvar a fonte."))} style={[styles.primaryButton, { backgroundColor: palette.accent, opacity: busyId ? 0.6 : 1 }]}>
                <Text style={styles.primaryText}>{busyId ? "Conectando / indexando…" : kind === "google-drive" ? "Conectar e salvar pasta" : editingId ? "Salvar alterações" : "Adicionar fonte"}</Text>
              </Pressable>
            </View>

            <Text style={[styles.sectionTitle, { color: palette.secondaryText, marginTop: 24 }]}>FONTES CADASTRADAS</Text>
            {sources.length === 0 ? (
              <Text style={[styles.empty, { color: palette.secondaryText }]}>Nenhuma fonte adicionada.</Text>
            ) : sources.map((source) => {
              const status = source.status === "error" ? "Erro" : !source.enabled ? "Desativada" : "Ativa";
              const statusColor = status === "Erro" ? palette.accent : status === "Ativa" ? "#39836B" : palette.secondaryText;
              return (
                <View key={source.id} style={[styles.sourceRow, { borderBottomColor: palette.separator }]}>
                  <View style={styles.sourceDetails}>
                    <View style={styles.nameRow}>
                      <Text numberOfLines={1} style={[styles.sourceName, { color: palette.text }]}>{source.name}</Text>
                      <Text style={[styles.status, { color: statusColor }]}>{status}</Text>
                    </View>
                    <Text numberOfLines={1} style={[styles.sourceUrl, { color: palette.secondaryText }]}>{source.url}</Text>
                    {source.lastError && source.enabled === false ? <Text numberOfLines={2} style={[styles.errorHint, { color: palette.accent }]}>{source.lastError}</Text> : null}
                    <View style={styles.actions}>
                      <TextAction label="Editar" color={palette.accent} disabled={busyId !== null} onPress={() => edit(source)} />
                      <TextAction label={busyId === source.id ? "Testando…" : source.kind === "google-drive" ? "Conectar / Atualizar" : "Atualizar"} color={palette.accent} disabled={busyId !== null} onPress={() => void refresh(source).catch(reportFailure)} />
                      {source.kind === "google-drive" ? <TextAction label="Desconectar" color={palette.accent} disabled={busyId !== null} onPress={() => void disconnect(source).catch(reportFailure)} /> : null}
                      <TextAction label="Remover" color={palette.secondaryText} disabled={busyId !== null} onPress={() => void remove(source.id).catch(reportFailure)} />
                    </View>
                  </View>
                  <Switch
                    accessibilityLabel={`${source.enabled ? "Desativar" : "Ativar"} ${source.name}`}
                    value={source.enabled}
                    disabled={busyId !== null}
                    onValueChange={(enabled) => void toggle(source, enabled).catch(reportFailure)}
                    thumbColor={source.enabled ? palette.accent : palette.surface}
                    trackColor={{ false: palette.separator, true: palette.accent }}
                  />
                </View>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function TextAction({ label, color, disabled, onPress }: { label: string; color: string; disabled?: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} hitSlop={6}>
      <Text style={{ color, fontSize: 12, fontWeight: "600", opacity: disabled ? 0.5 : 1 }}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: "flex-end", paddingHorizontal: 10 },
  sheet: { width: "100%", maxWidth: 620, maxHeight: "94%", alignSelf: "center", borderTopLeftRadius: 12, borderTopRightRadius: 12, overflow: "hidden" },
  titleRow: { minHeight: 58, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "rgba(128,128,128,0.3)" },
  title: { fontSize: 20, fontWeight: "700" },
  iconButton: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  content: { padding: 20, paddingBottom: 36 },
  sectionTitle: { fontSize: 10, fontWeight: "700", marginBottom: 10 },
  input: { minHeight: 44, borderWidth: 1, borderRadius: 6, paddingHorizontal: 12, marginBottom: 9, fontSize: 14 },
  segmented: { flexDirection: "row", gap: 4, padding: 4, borderRadius: 6 },
  segment: { flex: 1, minHeight: 38, alignItems: "center", justifyContent: "center", borderRadius: 4 },
  helper: { fontSize: 12, lineHeight: 17, marginTop: 8 },
  error: { fontSize: 12, lineHeight: 17, marginTop: 8 },
  formActions: { flexDirection: "row", justifyContent: "flex-end", gap: 8, marginTop: 12 },
  primaryButton: { minHeight: 42, minWidth: 132, alignItems: "center", justifyContent: "center", paddingHorizontal: 14, borderRadius: 6 },
  primaryText: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },
  secondaryButton: { minHeight: 42, alignItems: "center", justifyContent: "center", paddingHorizontal: 14, borderWidth: 1, borderRadius: 6 },
  empty: { fontSize: 13, paddingVertical: 14 },
  sourceRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  sourceDetails: { flex: 1, gap: 3 },
  nameRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  sourceName: { flex: 1, fontSize: 14, fontWeight: "600" },
  status: { fontSize: 11, fontWeight: "700" },
  sourceUrl: { fontSize: 11 },
  errorHint: { fontSize: 11 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 14, marginTop: 7 },
});
