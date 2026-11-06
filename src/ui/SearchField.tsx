import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { useAppTheme } from "@/src/presentation/contexts/AppThemeContext";
import { radius, space, touchTarget, typography } from "./tokens";

export interface SearchFieldProps {
  value: string;
  onChangeText(value: string): void;
  placeholder: string;
  /** Nome acessível; por padrão o próprio placeholder. */
  label?: string;
  onSubmit?(): void;
  autoFocus?: boolean;
}

/** Campo de busca com ícone e botão de limpar. */
export function SearchField({ value, onChangeText, placeholder, label, onSubmit, autoFocus }: SearchFieldProps) {
  const { palette } = useAppTheme();
  return (
    <View style={[styles.field, { backgroundColor: palette.input, borderColor: palette.border }]}>
      <Ionicons name="search" size={18} color={palette.secondaryText} />
      <TextInput
        accessibilityLabel={label ?? placeholder}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={palette.secondaryText}
        returnKeyType="search"
        onSubmitEditing={onSubmit}
        autoFocus={autoFocus}
        autoCorrect={false}
        style={[styles.input, typography.body, { color: palette.text }]}
      />
      {value ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Limpar busca" hitSlop={8} onPress={() => onChangeText("")} style={styles.clear}>
          <Ionicons name="close-circle" size={18} color={palette.secondaryText} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    minHeight: touchTarget + 4,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: space.md + 2,
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
  },
  input: { flex: 1, minWidth: 0, paddingVertical: space.sm },
  clear: { minWidth: 32, minHeight: 32, alignItems: "center", justifyContent: "center" },
});
