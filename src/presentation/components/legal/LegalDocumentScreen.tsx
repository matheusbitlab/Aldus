import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LegalDocument } from "@/src/legal/legalContent";
import { LEGAL_REVIEW_STATUS } from "@/src/legal/legalConfig";
import { useAppTheme } from "@/src/presentation/contexts/AppThemeContext";

export function LegalDocumentScreen({ document, showReviewStatus = true, footer }: {
  document: LegalDocument;
  showReviewStatus?: boolean;
  footer?: React.ReactNode;
}) {
  const { palette } = useAppTheme();
  const insets = useSafeAreaInsets();
  const goBack = () => router.canGoBack() ? router.back() : router.replace("/auth/login" as never);

  return (
    <View style={[styles.screen, { backgroundColor: palette.background }]}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 12), borderBottomColor: palette.separator, backgroundColor: palette.surface }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Voltar" onPress={goBack} style={styles.backButton}>
          <Ionicons name="chevron-back" size={25} color={palette.text} />
        </Pressable>
        <Text numberOfLines={1} style={[styles.headerTitle, { color: palette.text }]}>{document.title}</Text>
        <View style={styles.headerSpacer} />
      </View>
      <ScrollView
        testID="legal-document-scroll"
        showsVerticalScrollIndicator
        contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 34) }]}
      >
        <Text accessibilityRole="header" style={[styles.title, { color: palette.text }]}>{document.title}</Text>
        <Text style={[styles.subtitle, { color: palette.secondaryText }]}>{document.subtitle}</Text>
        {showReviewStatus ? (
          <View style={[styles.notice, { backgroundColor: palette.surfaceSecondary, borderColor: palette.border }]}>
            <Ionicons name="information-circle-outline" size={20} color={palette.accent} />
            <Text style={[styles.noticeText, { color: palette.text }]}>{LEGAL_REVIEW_STATUS}</Text>
          </View>
        ) : null}
        {document.sections.map((section, index) => (
          <View key={`${section.heading}-${index}`} style={styles.section}>
            <Text accessibilityRole="header" style={[styles.sectionTitle, { color: palette.text }]}>{section.heading}</Text>
            {section.paragraphs?.map((paragraph, paragraphIndex) => (
              <Text key={paragraphIndex} style={[styles.body, { color: palette.textSecondary }]}>{paragraph}</Text>
            ))}
            {section.bullets?.map((item, itemIndex) => (
              <View key={itemIndex} style={styles.bulletRow}>
                <Text style={[styles.bullet, { color: palette.accent }]}>•</Text>
                <Text style={[styles.body, styles.bulletText, { color: palette.textSecondary }]}>{item}</Text>
              </View>
            ))}
            {section.links?.map((link) => (
              <Pressable key={link.url} accessibilityRole="link" onPress={() => void Linking.openURL(link.url)} style={styles.link}>
                <Text style={[styles.linkText, { color: palette.accent }]}>{link.label}</Text>
                <Ionicons name="open-outline" size={16} color={palette.accent} />
              </Pressable>
            ))}
          </View>
        ))}
        {footer}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { minHeight: 56, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: "row", alignItems: "center", paddingHorizontal: 8, paddingBottom: 8 },
  backButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, textAlign: "center", fontSize: 16, fontWeight: "700" },
  headerSpacer: { width: 44 },
  content: { width: "100%", maxWidth: 720, alignSelf: "center", paddingHorizontal: 22, paddingTop: 28 },
  title: { fontSize: 29, lineHeight: 35, fontWeight: "700" },
  subtitle: { fontSize: 16, lineHeight: 24, marginTop: 8 },
  notice: { marginTop: 20, borderWidth: 1, borderRadius: 10, padding: 14, flexDirection: "row", gap: 10, alignItems: "flex-start" },
  noticeText: { flex: 1, fontSize: 13, lineHeight: 19, fontWeight: "600" },
  section: { marginTop: 28, gap: 11 },
  sectionTitle: { fontSize: 19, lineHeight: 25, fontWeight: "700" },
  body: { fontSize: 15, lineHeight: 23 },
  bulletRow: { flexDirection: "row", alignItems: "flex-start", gap: 9 },
  bullet: { fontSize: 19, lineHeight: 23 },
  bulletText: { flex: 1 },
  link: { minHeight: 44, flexDirection: "row", alignItems: "center", gap: 7 },
  linkText: { flexShrink: 1, fontSize: 14, lineHeight: 20, fontWeight: "700", textDecorationLine: "underline" },
});
