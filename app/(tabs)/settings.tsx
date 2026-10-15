import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MotionCuesControl } from "@/src/presentation/components/MotionCuesControl";
import { ReaderSettingsPanel } from "@/src/presentation/components/ReaderSettingsPanel";
import { useAppTheme } from "@/src/presentation/contexts/AppThemeContext";
import { AppThemeMode } from "@/src/theme/tokens";
import { useAuth } from "@/src/presentation/contexts/AuthContext";
import { getAppMetadata } from "@/src/legal/appMetadata";
import { LibrarySyncControls } from '@/src/presentation/components/LibrarySyncControls';
import { AdminEntry } from '@/src/admin/presentation/AdminEntry';

const themeOptions: Array<{ value: AppThemeMode; label: string }> = [
  { value: "system", label: "Sistema" },
  { value: "light", label: "Claro" },
  { value: "dark", label: "Escuro" },
];

export default function Settings() {
  const insets = useSafeAreaInsets();
  const { palette, mode, setMode } = useAppTheme();
  const { profile, user } = useAuth();
  const [readerSettingsVisible, setReaderSettingsVisible] = useState(false);
  const appMetadata = getAppMetadata();

  return (
    <View style={[styles.screen, { backgroundColor: palette.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: Math.max(insets.top, 20), paddingBottom: Math.max(insets.bottom, 24) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.pageTitle, { color: palette.text }]}>Ajustes</Text>
        <AdminEntry />
        <Section title="BIBLIOTECA DA CONTA" color={palette.secondaryText}><View style={[styles.group,{backgroundColor:palette.surface,borderColor:palette.border}]}><LibrarySyncControls/></View></Section>

        <Section title="APARÊNCIA" color={palette.secondaryText}>
          <View style={[styles.group, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <Text style={[styles.rowTitle, { color: palette.text }]}>Tema do aplicativo</Text>
            <Text style={[styles.rowDescription, { color: palette.secondaryText }]}>A aparência do livro é independente.</Text>
            <View style={[styles.segmented, { backgroundColor: palette.surfaceSecondary }]}>
              {themeOptions.map((option) => {
                const selected = mode === option.value;
                return (
                  <Pressable
                    key={option.value}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => void setMode(option.value)}
                    style={[styles.segment, selected ? { backgroundColor: palette.accent } : null]}
                  >
                    <Text style={[styles.segmentText, { color: selected ? "#FFFFFF" : palette.text }]}>{option.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </Section>

        <Section title="LEITURA" color={palette.secondaryText}>
          <View style={[styles.group, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <SettingsRow
              icon="book-outline"
              title="Preferências do leitor"
              description="Tela e-reader, temas, brilho e tipografia"
              color={palette.text}
              secondaryColor={palette.secondaryText}
              onPress={() => setReaderSettingsVisible(true)}
            />
          </View>
        </Section>

        <Section title="CONFORTO" color={palette.secondaryText}>
          <View style={[styles.group, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <MotionCuesControl color={palette.text} />
          </View>
        </Section>

        <Section title="FONTES E CATÁLOGOS" color={palette.secondaryText}>
          <View style={[styles.group, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <SettingsRow
              icon="albums-outline"
              title="Minhas fontes"
              description="Abrir bibliotecas, adicionar e gerenciar fontes"
              color={palette.text}
              secondaryColor={palette.secondaryText}
              onPress={() => router.push("/sources" as never)}
            />
          </View>
        </Section>

        <Section title="COMUNIDADE" color={palette.secondaryText}>
          <View style={[styles.group, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <SettingsRow
              icon="people-outline"
              title="Comunidade literária"
              description="Perfil, jornada de leitura e atividade"
              color={palette.text}
              secondaryColor={palette.secondaryText}
              onPress={() => router.push("/community" as never)}
            />
          </View>
        </Section>

        <Section title="CONTAS" color={palette.secondaryText}>
          <View style={[styles.group, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <SettingsRow
              icon="person-circle-outline"
              title="Minha conta"
              description={profile?.username ? `${profile.display_name || user?.email || "Leitor"} · @${profile.username}` : "Perfil e segurança"}
              color={palette.text}
              secondaryColor={palette.secondaryText}
              onPress={() => router.push("/account" as never)}
            />
            <View style={[styles.divider, { backgroundColor: palette.separator }]} />
            <SettingsRow
              icon="library-outline"
              title="BibliON"
              description="Acessar a biblioteca digital"
              color={palette.text}
              secondaryColor={palette.secondaryText}
              onPress={() => router.push("/services/biblion" as never)}
              last
            />
            <View style={[styles.divider, { backgroundColor: palette.separator }]} />
            <SettingsRow
              icon="school-outline"
              title="MEC Livros"
              description="Acessar a plataforma de leitura"
              color={palette.text}
              secondaryColor={palette.secondaryText}
              onPress={() => router.push("/services/mec" as never)}
              last
            />
          </View>
        </Section>

        <Section title="LEGAL E INFORMAÇÕES" color={palette.secondaryText}>
          <View style={[styles.group, { backgroundColor: palette.surface, borderColor: palette.border }]}>
            <SettingsRow icon="information-circle-outline" title="Sobre o Aldus Reader" description="Proposta, história do nome e princípios" color={palette.text} secondaryColor={palette.secondaryText} onPress={() => router.push("/legal/about" as never)} />
            <View style={[styles.divider, { backgroundColor: palette.separator }]} />
            <SettingsRow icon="shield-checkmark-outline" title="Política de Privacidade" description="Dados locais, conta, terceiros e direitos" color={palette.text} secondaryColor={palette.secondaryText} onPress={() => router.push("/legal/privacy" as never)} />
            <View style={[styles.divider, { backgroundColor: palette.separator }]} />
            <SettingsRow icon="document-text-outline" title="Termos de Uso" description="Condições e responsabilidades de uso" color={palette.text} secondaryColor={palette.secondaryText} onPress={() => router.push("/legal/terms" as never)} />
            <View style={[styles.divider, { backgroundColor: palette.separator }]} />
            <SettingsRow icon="book-outline" title="Direitos Autorais e Conteúdo" description="Livros, fontes, notas e comunicação" color={palette.text} secondaryColor={palette.secondaryText} onPress={() => router.push("/legal/copyright" as never)} />
            <View style={[styles.divider, { backgroundColor: palette.separator }]} />
            <SettingsRow icon="code-slash-outline" title="Licenças de terceiros" description="Pacotes, versões e textos de licença" color={palette.text} secondaryColor={palette.secondaryText} onPress={() => router.push("/legal/licenses" as never)} />
            <View style={[styles.divider, { backgroundColor: palette.separator }]} />
            <SettingsRow icon="server-outline" title="Privacidade e Dados" description="Resumo prático de onde os dados ficam" color={palette.text} secondaryColor={palette.secondaryText} onPress={() => router.push("/legal/data" as never)} />
            <View style={[styles.divider, { backgroundColor: palette.separator }]} />
            <SettingsRow icon="pricetag-outline" title="Versão do aplicativo" description={`${appMetadata.version} · build ${appMetadata.build}`} color={palette.text} secondaryColor={palette.secondaryText} onPress={() => router.push("/legal/version" as never)} last />
          </View>
        </Section>
      </ScrollView>

      <ReaderSettingsPanel
        visible={readerSettingsVisible}
        panelMode="appearance"
        onClose={() => setReaderSettingsVisible(false)}
      />
    </View>
  );
}

function Section({ title, color, children }: { title: string; color: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color }]}>{title}</Text>
      {children}
    </View>
  );
}

function SettingsRow({
  icon,
  title,
  description,
  color,
  secondaryColor,
  onPress,
  last = false,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  title: string;
  description: string;
  color: string;
  secondaryColor: string;
  onPress: () => void;
  last?: boolean;
}) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.actionRow}>
      <Ionicons name={icon} size={21} color={color} />
      <View style={styles.actionCopy}>
        <Text style={[styles.rowTitle, { color }]}>{title}</Text>
        <Text style={[styles.rowDescription, { color: secondaryColor }]}>{description}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={secondaryColor} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { width: "100%", maxWidth: 680, alignSelf: "center", paddingHorizontal: 18 },
  pageTitle: { fontSize: 27, fontWeight: "700", marginBottom: 10 },
  section: { marginTop: 20, gap: 8 },
  sectionTitle: { fontSize: 11, fontWeight: "700" },
  group: { borderWidth: 1, borderRadius: 8, padding: 14 },
  rowTitle: { fontSize: 15, fontWeight: "600" },
  rowDescription: { fontSize: 12, lineHeight: 17, marginTop: 3 },
  segmented: { flexDirection: "row", gap: 4, padding: 4, borderRadius: 7, marginTop: 12 },
  segment: { flex: 1, minHeight: 38, alignItems: "center", justifyContent: "center", borderRadius: 5, paddingHorizontal: 6 },
  segmentText: { fontSize: 13, fontWeight: "600" },
  actionRow: { minHeight: 58, flexDirection: "row", alignItems: "center", gap: 12 },
  actionCopy: { flex: 1 },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 33 },
});
