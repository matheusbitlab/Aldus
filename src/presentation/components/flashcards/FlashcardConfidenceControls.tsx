import React from "react";
import { StyleSheet, Text, Pressable, View } from "react-native";
import {
  FLASHCARD_CHOICES,
  FlashcardChoice,
} from "@/src/domain/types/flashcards";
import { AppThemePalette } from "@/src/theme/tokens";

interface FlashcardConfidenceControlsProps {
  onSelect: (choice: FlashcardChoice) => void;
  disabled?: boolean;
  selectedChoice?: FlashcardChoice | null;
  palette: AppThemePalette;
}

export function FlashcardConfidenceControls({
  onSelect,
  disabled = false,
  selectedChoice = null,
  palette,
}: FlashcardConfidenceControlsProps) {
  const [pressedChoice, setPressedChoice] = React.useState<FlashcardChoice | null>(
    null,
  );
  return (
    <View style={styles.container}>
      <Text style={[styles.caption, { color: palette.secondaryText }]}>
        Escolha o julgamento e o grau de confiança:
      </Text>
      <View style={styles.grid}>
        {FLASHCARD_CHOICES.map((item) => {
          const isSelected = selectedChoice === item.choice;

          return (
            <Pressable
              key={item.choice}
              accessibilityRole="button"
              accessibilityLabel={`${item.symbol} - ${item.label}`}
              disabled={disabled}
              onPress={() => onSelect(item.choice)}
              onPressIn={() => setPressedChoice(item.choice)}
              onPressOut={() => setPressedChoice(null)}
              // NativeWind's interop consumes style objects; a style callback loses the native layout.
              style={[
                styles.button,
                {
                  backgroundColor: isSelected
                    ? palette.surfaceSecondary
                    : palette.surface,
                  borderColor: isSelected ? palette.accent : palette.separator,
                  opacity:
                    disabled && !isSelected
                      ? 0.5
                      : pressedChoice === item.choice
                        ? 0.85
                        : 1,
                },
              ]}
            >
              <View
                style={[
                  styles.symbolBadge,
                  {
                    backgroundColor: palette.surfaceSecondary,
                  },
                ]}
              >
                <Text style={[styles.symbolText, { color: palette.text }]}>
                  {item.symbol}
                </Text>
              </View>
              <Text
                style={[
                  styles.labelText,
                  {
                    color: isSelected ? palette.text : palette.textSecondary,
                    fontWeight: isSelected ? "700" : "500",
                  },
                ]}
                numberOfLines={2}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    gap: 8,
  },
  caption: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    textAlign: "center",
    marginBottom: 4,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  button: {
    width: "48%",
    minHeight: 74,
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 10,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  symbolBadge: {
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 8,
  },
  symbolText: {
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 1,
  },
  labelText: {
    fontSize: 12,
    textAlign: "center",
    lineHeight: 16,
  },
});
