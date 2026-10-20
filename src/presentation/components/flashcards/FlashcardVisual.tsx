import { useMemo, useRef, useState } from "react";
import {
  Image,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  Text,
  View,
  ViewStyle,
} from "react-native";
import { FlashcardDrawing } from "@/src/domain/types/flashcards";
import { AppThemePalette } from "@/src/theme/tokens";

// React Native Web supports this CSS property; Android's ViewStyle does not.
const drawingTouchStyle: ViewStyle & { touchAction?: 'none' } =
  Platform.OS === 'web' ? { touchAction: 'none' } : {};

export function DrawingView({
  drawing,
  width,
}: {
  drawing: FlashcardDrawing;
  width: number;
}) {
  const scale = width / drawing.width;
  return (
    <View
      accessibilityLabel="Desenho do flashcard"
      style={{
        width,
        height: drawing.height * scale,
        backgroundColor: "#fff",
        overflow: "hidden",
        borderRadius: 12,
      }}
      pointerEvents="none"
    >
      {drawing.strokes.flatMap((stroke, s) =>
        stroke.map((p, i) => {
          const previous = stroke[Math.max(0, i - 1)];
          const dx = (p.x - previous.x) * scale,
            dy = (p.y - previous.y) * scale;
          const length = Math.max(3, Math.hypot(dx, dy));
          return (
            <View
              key={`${s}:${i}`}
              style={{
                position: "absolute",
                left: ((p.x + previous.x) * scale) / 2 - length / 2,
                top: ((p.y + previous.y) * scale) / 2 - 1.5,
                width: length,
                height: 3,
                borderRadius: 2,
                backgroundColor: "#111",
                transform: [{ rotate: `${Math.atan2(dy, dx)}rad` }],
              }}
            />
          );
        }),
      )}
    </View>
  );
}

export function FlashcardVisual({
  imageUrl,
  drawing,
}: {
  imageUrl?: string | null;
  drawing?: FlashcardDrawing | null;
}) {
  const [width, setWidth] = useState(300),
    [expanded, setExpanded] = useState(false);
  if (!imageUrl && !drawing) return null;
  const content = (w: number) =>
    drawing ? (
      <DrawingView drawing={drawing} width={w} />
    ) : (
      <Image
        source={{ uri: imageUrl! }}
        style={{ width: w, height: w * 0.75 }}
        resizeMode="contain"
        accessibilityLabel="Imagem do flashcard"
      />
    );
  return (
    <View onLayout={(e) => setWidth(Math.max(1, e.nativeEvent.layout.width))}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Ampliar imagem ou desenho"
        onPress={() => setExpanded(true)}
      >
        {content(width)}
      </Pressable>
      <Modal
        visible={expanded}
        transparent
        animationType="fade"
        onRequestClose={() => setExpanded(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,.9)",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <Pressable
            accessibilityRole="button"
            onPress={() => setExpanded(false)}
            style={{ minHeight: 48 }}
          >
            <Text style={{ color: "#fff", fontSize: 18 }}>Fechar imagem</Text>
          </Pressable>
          {content(Math.max(1, width))}
        </View>
      </Modal>
    </View>
  );
}

export function DrawingEditor({
  initial,
  onSave,
  onCancel,
  palette,
}: {
  initial?: FlashcardDrawing | null;
  onSave: (drawing: FlashcardDrawing) => void;
  onCancel: () => void;
  palette: AppThemePalette;
}) {
  const [drawing, setDrawing] = useState<FlashcardDrawing>(
    initial ?? { width: 320, height: 240, strokes: [] },
  );
  const [width, setWidth] = useState(320),
    [erase, setErase] = useState(false);
  const state = useRef({ drawing, width, erase });
  state.current = { drawing, width, erase };
  const update = (x: number, y: number, first: boolean) => {
    const { drawing: d, width: w, erase: erasing } = state.current;
    const p = {
      x: Math.max(0, Math.min(d.width, (x * d.width) / w)),
      y: Math.max(0, Math.min(d.height, (y * d.width) / w)),
    };
    let strokes = d.strokes;
    if (erasing)
      strokes = strokes.filter(
        (s) => !s.some((q) => Math.hypot(q.x - p.x, q.y - p.y) < 14),
      );
    else if (strokes.reduce((sum, s) => sum + s.length, 0) < 2500)
      strokes =
        first || !strokes.length
          ? [...strokes, [p]]
          : [...strokes.slice(0, -1), [...strokes[strokes.length - 1], p]];
    const next = { ...d, strokes };
    state.current.drawing = next;
    setDrawing(next);
  };
  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (e) =>
          update(e.nativeEvent.locationX, e.nativeEvent.locationY, true),
        onPanResponderMove: (e) =>
          update(e.nativeEvent.locationX, e.nativeEvent.locationY, false),
      }),
    [],
  );
  const button = (label: string, action: () => void) => (
    <Pressable
      accessibilityRole="button"
      onPress={action}
      style={{
        padding: 12,
        minHeight: 48,
        borderRadius: 10,
        backgroundColor: palette.surfaceSecondary,
      }}
    >
      <Text style={{ color: palette.text }}>{label}</Text>
    </Pressable>
  );
  return (
    <View style={{ gap: 12 }}>
      <Text style={{ color: palette.text }}>
        Desenhe com o dedo. Apagar remove os traços tocados.
      </Text>
      <View
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        {...responder.panHandlers}
        style={[{
          width: "100%",
          height: (drawing.height * width) / drawing.width,
        }, drawingTouchStyle]}
      >
        <DrawingView drawing={drawing} width={width} />
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {button(erase ? "Usar lápis" : "Apagar", () => setErase(!erase))}
        {button("Desfazer", () =>
          setDrawing((d) => ({ ...d, strokes: d.strokes.slice(0, -1) })),
        )}
        {button("Limpar", () => setDrawing((d) => ({ ...d, strokes: [] })))}
        {button("Cancelar desenho", onCancel)}
        {button("Salvar desenho", () => onSave(drawing))}
      </View>
    </View>
  );
}
