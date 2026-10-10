import React from "react";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppTheme } from "@/src/presentation/contexts/AppThemeContext";

export function AuthForm({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  const { palette } = useAppTheme();
  const insets = useSafeAreaInsets();
  return <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, justifyContent: "center", paddingHorizontal: 24, paddingTop: Math.max(insets.top, 28), paddingBottom: Math.max(insets.bottom, 28), backgroundColor: palette.background }}>
    <View style={{ width: "100%", maxWidth: 420, alignSelf: "center", gap: 15 }}>
      <View style={{ width: 52, height: 52, borderRadius: 14, backgroundColor: palette.surfaceSecondary, alignItems: "center", justifyContent: "center" }}><Ionicons name="book-outline" size={27} color={palette.accent} /></View>
      <Text style={{ color: palette.accent, fontWeight: "700", letterSpacing: 1.2, fontSize: 12 }}>ALDUS READER</Text>
      <Text accessibilityRole="header" style={{ color: palette.text, fontSize: 28, fontWeight: "700" }}>{title}</Text>
      {subtitle ? <Text style={{ color: palette.secondaryText, lineHeight: 21 }}>{subtitle}</Text> : null}
      {children}
    </View>
  </ScrollView>;
}

export function AuthInput({ label, value, onChangeText, secureTextEntry, keyboardType, autoCapitalize, autoComplete, icon }: {
  label: string; value: string; onChangeText: (value: string) => void; secureTextEntry?: boolean;
  keyboardType?: React.ComponentProps<typeof TextInput>["keyboardType"];
  autoCapitalize?: React.ComponentProps<typeof TextInput>["autoCapitalize"];
  autoComplete?: React.ComponentProps<typeof TextInput>["autoComplete"];
  icon?: React.ComponentProps<typeof Ionicons>["name"];
}) {
  const { palette } = useAppTheme();
  const [show, setShow] = React.useState(false);
  return <View style={{ gap: 7 }}><Text style={{ color: palette.text, fontWeight: "600" }}>{label}</Text><View style={{ borderWidth: 1, borderColor: palette.border, backgroundColor: palette.input, borderRadius: 10, flexDirection: "row", alignItems: "center", paddingHorizontal: 12 }}>
    {icon ? <Ionicons name={icon} size={19} color={palette.secondaryText} /> : null}
    <TextInput accessibilityLabel={label} value={value} onChangeText={onChangeText} secureTextEntry={secureTextEntry && !show} keyboardType={keyboardType} autoCapitalize={autoCapitalize ?? "none"} autoComplete={autoComplete} placeholder={label} placeholderTextColor={palette.secondaryText} style={{ flex: 1, minHeight: 48, color: palette.text, fontSize: 15, paddingHorizontal: 9 }} />
    {secureTextEntry ? <Pressable accessibilityRole="button" accessibilityLabel={show ? "Ocultar senha" : "Mostrar senha"} onPress={() => setShow(!show)} style={{ width: 44, height: 44, justifyContent: "center", alignItems: "center" }}><Ionicons name={show ? "eye-off-outline" : "eye-outline"} size={21} color={palette.secondaryText} /></Pressable> : null}
  </View></View>;
}

export function AuthButton({ title, onPress, disabled, icon, secondary }: { title: string; onPress: () => void; disabled?: boolean; icon?: React.ComponentProps<typeof Ionicons>["name"]; secondary?: boolean }) {
  const { palette } = useAppTheme();
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={{ minHeight: 50, borderRadius: 10, borderWidth: secondary ? 1 : 0, borderColor: palette.border, backgroundColor: secondary ? palette.surface : palette.accent, opacity: disabled ? .55 : 1, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 9, paddingHorizontal: 14 }}>
    {icon ? <Ionicons name={icon} size={19} color={secondary ? palette.text : "#FFFFFF"} /> : null}
    <Text style={{ color: secondary ? palette.text : "#FFFFFF", fontWeight: "700", fontSize: 15 }}>{title}</Text>
  </Pressable>;
}

export function AuthLink({ title, href }: { title: string; href: string }) {
  const { palette } = useAppTheme();
  return <Pressable accessibilityRole="link" onPress={() => router.push(href as never)} style={{ minHeight: 44, justifyContent: "center" }}><Text style={{ color: palette.accent, fontWeight: "600", textAlign: "center" }}>{title}</Text></Pressable>;
}

export function AuthLegalNotice({ intro }: { intro: string }) {
  const { palette } = useAppTheme();
  return <View style={{ alignItems: "center", gap: 5, paddingHorizontal: 6 }}>
    <Text style={{ color: palette.secondaryText, fontSize: 12, lineHeight: 18, textAlign: "center" }}>{intro}</Text>
    <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", alignItems: "center", columnGap: 5 }}>
      <Pressable accessibilityRole="link" onPress={() => router.push("/legal/terms" as never)} style={{ minHeight: 34, justifyContent: "center" }}><Text style={{ color: palette.accent, fontSize: 12, fontWeight: "700", textDecorationLine: "underline" }}>Termos de Uso</Text></Pressable>
      <Text style={{ color: palette.secondaryText, fontSize: 12 }}>e a</Text>
      <Pressable accessibilityRole="link" onPress={() => router.push("/legal/privacy" as never)} style={{ minHeight: 34, justifyContent: "center" }}><Text style={{ color: palette.accent, fontSize: 12, fontWeight: "700", textDecorationLine: "underline" }}>Política de Privacidade</Text></Pressable>
    </View>
  </View>;
}

export function AuthError({ message }: { message: string | null }) {
  const { palette } = useAppTheme();
  return message ? <Text accessibilityRole="alert" style={{ color: palette.accent, lineHeight: 20 }}>{message}</Text> : null;
}
