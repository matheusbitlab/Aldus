import React, { useEffect, useRef, useState } from "react";
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  Pressable,
  View,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  Flashcard,
  FlashcardDeck,
  FlashcardDrawing,
  newFlashcardSource,
} from "@/src/domain/types/flashcards";
import { createFlashcardId } from "@/src/data/local/FlashcardRepository";
import { FlashcardCardView } from "./FlashcardCardView";
import { AppThemePalette } from "@/src/theme/tokens";
import { DrawingEditor, FlashcardVisual } from "./FlashcardVisual";

interface FlashcardCreateModalProps {
  visible: boolean;
  decks: FlashcardDeck[];
  initialDeckId?: string;
  initialCard?: Flashcard | null;
  onClose: () => void;
  onSave: (card: Flashcard) => Promise<void>;
  palette: AppThemePalette;
}

export function FlashcardCreateModal({
  visible,
  decks,
  initialDeckId,
  initialCard,
  onClose,
  onSave,
  palette,
}: FlashcardCreateModalProps) {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const saving = useRef(false);
  const draftId = useRef("");
  const pendingNavigation = useRef<(() => void) | null>(null);
  const allowNavigation = useRef(false);
  const [selectedDeckId, setSelectedDeckId] = useState(
    initialDeckId || decks[0]?.id || "",
  );
  const [title, setTitle] = useState("");
  const [statement, setStatement] = useState("");
  const [isTrue, setIsTrue] = useState<boolean | null>(null);
  const [explanation, setExplanation] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [drawing, setDrawing] = useState<FlashcardDrawing | null>(null);
  const [drawingOpen, setDrawingOpen] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  useEffect(() => {
    if (!visible) return;
    draftId.current = initialCard?.id ?? createFlashcardId();
    setSelectedDeckId(
      initialCard?.deckId ?? initialDeckId ?? decks[0]?.id ?? "",
    );
    setTitle(initialCard?.title ?? "");
    setStatement(initialCard?.statement ?? initialCard?.front ?? "");
    setIsTrue(
      typeof initialCard?.isTrue === "boolean" ? initialCard.isTrue : null,
    );
    setExplanation(initialCard?.explanation ?? initialCard?.back ?? "");
    setImageUrl(initialCard?.imageUrl ?? "");
    setDrawing(initialCard?.drawing ?? null);
    setDrawingOpen(false);
    setDiscardOpen(false);
    setPreviewTab("edit");
    setError(null);
  }, [visible, initialCard?.id, initialDeckId]);
  const [previewTab, setPreviewTab] = useState<
    "edit" | "preview-front" | "preview-back"
  >("edit");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const changed =
    title !== (initialCard?.title ?? "") ||
    statement !== (initialCard?.statement ?? initialCard?.front ?? "") ||
    explanation !== (initialCard?.explanation ?? initialCard?.back ?? "") ||
    isTrue !== (initialCard?.isTrue ?? null) ||
    imageUrl !== (initialCard?.imageUrl ?? "") ||
    JSON.stringify(drawing) !== JSON.stringify(initialCard?.drawing ?? null) ||
    selectedDeckId !==
      (initialCard?.deckId ?? initialDeckId ?? decks[0]?.id ?? "");
  useEffect(() => {
    if (!visible) return;
    allowNavigation.current = false;
    const remove = navigation.addListener("beforeRemove", (event) => {
      if (
        allowNavigation.current ||
        (!changed && !drawingOpen && !saving.current)
      )
        return;
      event.preventDefault();
      if (saving.current) return;
      pendingNavigation.current = () => navigation.dispatch(event.data.action);
      setDiscardOpen(true);
    });
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (changed || drawingOpen || saving.current) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    if (Platform.OS === "web")
      window.addEventListener("beforeunload", beforeUnload);
    return () => {
      remove();
      if (Platform.OS === "web")
        window.removeEventListener("beforeunload", beforeUnload);
    };
  }, [visible, changed, drawingOpen, navigation]);

  const resetForm = () => {
    setTitle("");
    setStatement("");
    setIsTrue(null);
    setExplanation("");
    setImageUrl("");
    setDrawing(null);
    setPreviewTab("edit");
    setError(null);
  };

  const handleClose = () => {
    if (saving.current) return;
    if (drawingOpen) {
      setDrawingOpen(false);
      return;
    }
    if (changed) setDiscardOpen(true);
    else onClose();
  };

  const attachImage = async () => {
    if (saving.current) return;
    saving.current = true;
    setBusy(true);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["image/png", "image/jpeg", "image/webp"],
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      if (!asset.size || asset.size > 3 * 1024 * 1024)
        throw new Error("Escolha uma imagem PNG, JPEG ou WebP de até 3 MB.");
      const mime = asset.mimeType;
      if (!mime || !["image/png", "image/jpeg", "image/webp"].includes(mime))
        throw new Error("Formato de imagem não suportado.");
      let data: string;
      if (Platform.OS === "web") {
        const blob = asset.file ?? (await (await fetch(asset.uri)).blob());
        data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = () =>
            reject(new Error("Não foi possível ler a imagem."));
          reader.readAsDataURL(blob);
        });
      } else
        data = `data:${mime};base64,${await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.Base64 })}`;
      setImageUrl(data);
      setDrawing(null);
      setError(null);
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Não foi possível anexar a imagem.",
      );
    } finally {
      saving.current = false;
      setBusy(false);
    }
  };

  const validate = (): string | null => {
    if (!decks.some((d) => d.id === selectedDeckId))
      return "Selecione um deck de destino.";
    if (!title.trim()) return "O título é obrigatório.";
    if (title.trim().length > 240) return "Use até 240 caracteres no título.";
    if (!statement.trim()) return "A pergunta ou afirmação é obrigatória.";
    if (statement.trim().length > 20000)
      return "Use até 20.000 caracteres na afirmação.";
    if (isTrue === null)
      return "Selecione conscientemente o gabarito (Verdadeiro ou Falso).";
    if (!explanation.trim()) return "A explicação no verso é obrigatória.";
    if (explanation.trim().length > 30000)
      return "Use até 30.000 caracteres na explicação.";
    return null;
  };

  const handleSave = async () => {
    if (saving.current) return;
    const err = validate();
    if (err) {
      setError(err);
      return;
    }

    saving.current = true;
    setBusy(true);
    setError(null);
    try {
      const now = Date.now();
      const newCard: Flashcard = {
        ...initialCard,
        id: draftId.current,
        deckId: selectedDeckId,
        title: title.trim(),
        statement: statement.trim(),
        isTrue: isTrue!,
        explanation: explanation.trim(),
        imageUrl: imageUrl.trim() || null,
        drawing,
        front: statement.trim(),
        back: explanation.trim(),
        difficulty: initialCard?.difficulty ?? "MEDIUM",
        tags: initialCard?.tags ?? ["manual"],
        status: "approved",
        interval: initialCard?.interval ?? 1,
        repetition: initialCard?.repetition ?? 0,
        easeFactor: initialCard?.easeFactor ?? 2.5,
        dueAt: initialCard?.dueAt ?? now,
        source: initialCard?.source ?? newFlashcardSource({ kind: "manual" }),
        createdAt: initialCard?.createdAt ?? now,
        updatedAt: now,
      };

      await onSave(newCard);
      resetForm();
      onClose();
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Não foi possível salvar o flashcard.",
      );
    } finally {
      saving.current = false;
      setBusy(false);
    }
  };

  const previewCard: Flashcard = {
    id: "preview-card",
    deckId: selectedDeckId,
    title: title.trim() || "Título de exemplo",
    statement:
      statement.trim() ||
      "Esta é uma afirmação de exemplo para visualizar como o flashcard ficará.",
    isTrue: isTrue ?? undefined,
    explanation:
      explanation.trim() || "Aqui aparecerá a explicação detalhada do verso.",
    imageUrl: imageUrl.trim() || null,
    drawing,
    front: statement.trim() || "Afirmação",
    back: explanation.trim() || "Explicação",
    difficulty: "MEDIUM",
    tags: [],
    status: "draft",
    interval: 1,
    repetition: 0,
    easeFactor: 2.5,
    dueAt: Date.now(),
    source: newFlashcardSource({ kind: "manual" }),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={[
          styles.screen,
          {
            backgroundColor: palette.background,
            paddingTop: insets.top,
            paddingBottom: insets.bottom,
          },
        ]}
      >
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: palette.separator }]}>
          <Pressable
            accessibilityRole="button"
            onPress={handleClose}
            style={styles.headerButton}
          >
            <Ionicons name="close" size={24} color={palette.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: palette.text }]}>
            {initialCard ? "Editar flashcard" : "Novo flashcard"}
          </Text>
          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={() => void handleSave()}
            style={[styles.saveButton, { backgroundColor: palette.accent }]}
          >
            {busy ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.saveButtonText}>Salvar</Text>
            )}
          </Pressable>
        </View>

        {/* Abas: Edição / Prévia Frente / Prévia Verso */}
        <View
          style={[styles.tabBar, { backgroundColor: palette.surfaceSecondary }]}
        >
          <Pressable
            onPress={() => setPreviewTab("edit")}
            style={[
              styles.tabButton,
              previewTab === "edit" && {
                backgroundColor: palette.panel,
                borderColor: palette.separator,
                borderWidth: 1,
              },
            ]}
          >
            <Text
              style={[
                styles.tabText,
                {
                  color:
                    previewTab === "edit"
                      ? palette.text
                      : palette.secondaryText,
                },
              ]}
            >
              Edição
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setPreviewTab("preview-front")}
            style={[
              styles.tabButton,
              previewTab === "preview-front" && {
                backgroundColor: palette.panel,
                borderColor: palette.separator,
                borderWidth: 1,
              },
            ]}
          >
            <Text
              style={[
                styles.tabText,
                {
                  color:
                    previewTab === "preview-front"
                      ? palette.text
                      : palette.secondaryText,
                },
              ]}
            >
              Prévia (Frente)
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setPreviewTab("preview-back")}
            style={[
              styles.tabButton,
              previewTab === "preview-back" && {
                backgroundColor: palette.panel,
                borderColor: palette.separator,
                borderWidth: 1,
              },
            ]}
          >
            <Text
              style={[
                styles.tabText,
                {
                  color:
                    previewTab === "preview-back"
                      ? palette.text
                      : palette.secondaryText,
                },
              ]}
            >
              Prévia (Verso)
            </Text>
          </Pressable>
        </View>

        {error ? (
          <View
            style={[
              styles.errorBox,
              { backgroundColor: "rgba(220, 38, 38, 0.1)" },
            ]}
          >
            <Ionicons name="alert-circle" size={18} color="#DC2626" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Conteúdo principal */}
        {discardOpen ? (
          <View style={{ padding: 20, gap: 12 }}>
            <Text style={{ color: palette.text }}>
              Descartar as alterações não salvas?
            </Text>
            <Pressable
              onPress={() => {
                pendingNavigation.current = null;
                setDiscardOpen(false);
              }}
              style={{ minHeight: 48 }}
            >
              <Text style={{ color: palette.accent }}>Continuar editando</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                allowNavigation.current = true;
                resetForm();
                setDiscardOpen(false);
                onClose();
                pendingNavigation.current?.();
                pendingNavigation.current = null;
              }}
              style={{ minHeight: 48 }}
            >
              <Text style={{ color: palette.text }}>Descartar e sair</Text>
            </Pressable>
          </View>
        ) : drawingOpen ? (
          <View style={{ padding: 16 }}>
            <DrawingEditor
              initial={drawing}
              palette={palette}
              onCancel={() => setDrawingOpen(false)}
              onSave={(value) => {
                setDrawing(value.strokes.length ? value : null);
                setImageUrl("");
                setDrawingOpen(false);
              }}
            />
          </View>
        ) : previewTab === "edit" ? (
          <ScrollView
            contentContainerStyle={styles.formContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* Seleção do Deck */}
            <Text style={[styles.fieldLabel, { color: palette.text }]}>
              Deck de destino *
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.deckList}
            >
              {decks.map((deck) => {
                const isSelected = selectedDeckId === deck.id;
                return (
                  <Pressable
                    key={deck.id}
                    onPress={() => setSelectedDeckId(deck.id)}
                    style={[
                      styles.deckChip,
                      {
                        backgroundColor: isSelected
                          ? palette.accent
                          : palette.surface,
                        borderColor: isSelected
                          ? palette.accent
                          : palette.separator,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.deckChipText,
                        { color: isSelected ? "#FFFFFF" : palette.text },
                      ]}
                    >
                      {deck.title}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* Título */}
            <Text style={[styles.fieldLabel, { color: palette.text }]}>
              Título *
            </Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Ex: Revolução Industrial, Lei de Newton..."
              placeholderTextColor={palette.secondaryText}
              style={[
                styles.input,
                {
                  color: palette.text,
                  borderColor: palette.separator,
                  backgroundColor: palette.surface,
                },
              ]}
            />

            {/* Afirmação / Pergunta */}
            <Text style={[styles.fieldLabel, { color: palette.text }]}>
              Afirmação (Verdadeiro ou Falso) *
            </Text>
            <TextInput
              value={statement}
              onChangeText={setStatement}
              placeholder="Escreva a afirmação que o estudante irá julgar..."
              placeholderTextColor={palette.secondaryText}
              multiline
              numberOfLines={3}
              style={[
                styles.textArea,
                {
                  color: palette.text,
                  borderColor: palette.separator,
                  backgroundColor: palette.surface,
                },
              ]}
            />

            {/* Gabarito Consciente */}
            <Text style={[styles.fieldLabel, { color: palette.text }]}>
              Gabarito oficial *
            </Text>
            <View style={styles.truthButtonGroup}>
              <Pressable
                onPress={() => setIsTrue(true)}
                style={[
                  styles.truthButton,
                  {
                    backgroundColor:
                      isTrue === true ? palette.accent : palette.surface,
                    borderColor:
                      isTrue === true ? palette.accent : palette.separator,
                  },
                ]}
              >
                <Ionicons
                  name="checkmark-circle"
                  size={20}
                  color={isTrue === true ? "#171A1D" : palette.accent}
                />
                <Text
                  style={[
                    styles.truthButtonText,
                    { color: isTrue === true ? "#171A1D" : palette.text },
                  ]}
                >
                  Verdadeiro
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setIsTrue(false)}
                style={[
                  styles.truthButton,
                  {
                    backgroundColor:
                      isTrue === false ? palette.accent : palette.surface,
                    borderColor:
                      isTrue === false ? palette.accent : palette.separator,
                  },
                ]}
              >
                <Ionicons
                  name="close-circle"
                  size={20}
                  color={isTrue === false ? "#171A1D" : palette.accent}
                />
                <Text
                  style={[
                    styles.truthButtonText,
                    { color: isTrue === false ? "#171A1D" : palette.text },
                  ]}
                >
                  Falso
                </Text>
              </Pressable>
            </View>

            {/* Explicação no verso */}
            <View style={styles.explanationHeader}>
              <Text style={[styles.fieldLabel, { color: palette.text }]}>
                Explicação no verso *
              </Text>
              {isTrue === false ? (
                <Text style={[styles.hintText, { color: palette.accent }]}>
                  Dica: apresente também a informação correta!
                </Text>
              ) : null}
            </View>
            <TextInput
              value={explanation}
              onChangeText={setExplanation}
              placeholder="Explique detalhadamente por que a afirmação é verdadeira ou falsa..."
              placeholderTextColor={palette.secondaryText}
              multiline
              numberOfLines={4}
              style={[
                styles.textArea,
                {
                  color: palette.text,
                  borderColor: palette.separator,
                  backgroundColor: palette.surface,
                },
              ]}
            />

            {/* Imagem / anexo opcional */}
            <Text style={[styles.fieldLabel, { color: palette.text }]}>
              Imagem ou desenho (opcional)
            </Text>
            <FlashcardVisual imageUrl={imageUrl} drawing={drawing} />
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              <Pressable
                onPress={() => void attachImage()}
                style={[
                  styles.truthButton,
                  { backgroundColor: palette.surface },
                ]}
              >
                <Text style={{ color: palette.text }}>
                  {imageUrl || drawing ? "Substituir imagem" : "Anexar imagem"}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setDrawingOpen(true)}
                style={[
                  styles.truthButton,
                  { backgroundColor: palette.surface },
                ]}
              >
                <Text style={{ color: palette.text }}>
                  {drawing ? "Editar desenho" : "Desenhar"}
                </Text>
              </Pressable>
              {imageUrl || drawing ? (
                <Pressable
                  onPress={() => {
                    setImageUrl("");
                    setDrawing(null);
                  }}
                  style={{ padding: 12, minHeight: 48 }}
                >
                  <Text style={{ color: palette.text }}>
                    Remover imagem/desenho
                  </Text>
                </Pressable>
              ) : null}
            </View>
          </ScrollView>
        ) : (
          <View style={styles.previewContainer}>
            <FlashcardCardView
              card={previewCard}
              isFlipped={previewTab === "preview-back"}
              evaluation={null}
              palette={palette}
            />
          </View>
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  headerButton: {
    padding: 6,
    minWidth: 48,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  saveButton: {
    minHeight: 48,
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveButtonText: {
    color: "#171A1D",
    fontWeight: "700",
    fontSize: 14,
  },
  tabBar: {
    flexDirection: "row",
    padding: 6,
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 10,
    gap: 6,
  },
  tabButton: {
    minHeight: 48,
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  tabText: {
    fontSize: 13,
    fontWeight: "600",
  },
  formContent: {
    padding: 16,
    gap: 12,
    paddingBottom: 40,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: "700",
    marginTop: 6,
  },
  explanationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
  },
  hintText: {
    fontSize: 12,
    fontWeight: "600",
  },
  input: {
    minHeight: 46,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 15,
  },
  textArea: {
    minHeight: 88,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    textAlignVertical: "top",
  },
  deckList: {
    flexDirection: "row",
    gap: 8,
    paddingVertical: 4,
  },
  deckChip: {
    minHeight: 48,
    justifyContent: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  deckChipText: {
    fontSize: 13,
    fontWeight: "600",
  },
  truthButtonGroup: {
    flexDirection: "row",
    gap: 12,
  },
  truthButton: {
    flex: 1,
    minHeight: 50,
    borderRadius: 10,
    borderWidth: 1.5,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  truthButtonText: {
    fontSize: 15,
    fontWeight: "700",
  },
  previewContainer: {
    flex: 1,
    padding: 16,
    paddingBottom: 24,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    marginTop: 10,
    padding: 10,
    borderRadius: 8,
  },
  errorText: {
    color: "#DC2626",
    fontSize: 13,
    fontWeight: "600",
  },
});
