import { StyleSheet, Text, View } from "react-native";
import { aboutDocument } from "@/src/legal/legalContent";
import { getAppMetadata } from "@/src/legal/appMetadata";
import { LegalDocumentScreen } from "@/src/presentation/components/legal/LegalDocumentScreen";
import { useAppTheme } from "@/src/presentation/contexts/AppThemeContext";

export default function AboutScreen() {
  const { palette } = useAppTheme();
  const { version, build } = getAppMetadata();
  return <LegalDocumentScreen document={aboutDocument} showReviewStatus={false} footer={
    <View style={[styles.versionCard, { backgroundColor: palette.surface, borderColor: palette.border }]}>
      <Text style={[styles.versionTitle, { color: palette.text }]}>Aldus Reader</Text>
      <Text style={[styles.versionText, { color: palette.secondaryText }]}>Versão {version} · build {build}</Text>
    </View>
  } />;
}

const styles = StyleSheet.create({
  versionCard: { marginTop: 30, borderWidth: 1, borderRadius: 10, padding: 16 },
  versionTitle: { fontSize: 16, fontWeight: "700" },
  versionText: { fontSize: 13, marginTop: 5 },
});
