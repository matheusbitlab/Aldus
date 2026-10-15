import { dataDocument } from "@/src/legal/legalContent";
import { LegalDocumentScreen } from "@/src/presentation/components/legal/LegalDocumentScreen";
import { useEffect, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useAuth } from "@/src/presentation/contexts/AuthContext";
import { useAppTheme } from "@/src/presentation/contexts/AppThemeContext";
import { appDependencies, libraryOrganization } from "@/src/presentation/services/dependencies";
import { useLibraryStore } from "@/src/presentation/stores/libraryStore";
import { OrganizationBackupModal } from "@/src/presentation/components/OrganizationBackupModal";
import { OrganizationRecords } from "@/src/domain/types/libraryOrganization";

export default function DataScreen() {
  const { user, profile } = useAuth();
  const { palette } = useAppTheme();
  const [data, setData] = useState<{ userId: string; records: OrganizationRecords; bookIds: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const generation = useRef(0);
  const owner = useRef(user?.id); owner.current = user?.id;
  useEffect(() => {
    ++generation.current; setData(null); setError(null); setBusy(false);
    return () => { ++generation.current; };
  }, [user?.id]);
  const ready = !!user && profile?.id === user.id && profile.account_status === "active" && !!profile.username;
  const openExport = async () => {
    if (!ready || busy) return;
    const run = ++generation.current, userId = user.id;
    setBusy(true); setError(null);
    try {
      const [records, books] = await Promise.all([libraryOrganization.list(), appDependencies.bookRepository.listActive()]);
      if (run === generation.current && owner.current === userId) setData({ userId, records, bookIds: books.map(book => book.id) });
    } catch {
      if (run === generation.current && owner.current === userId) setError("Não foi possível carregar seus dados. Tente novamente.");
    } finally { if (run === generation.current) setBusy(false); }
  };
  return <>
    <LegalDocumentScreen document={dataDocument} footer={ready ? <View style={{ marginTop:24, gap:12 }}>
      <Pressable accessibilityRole="button" accessibilityLabel="Exportar meus dados" disabled={busy} onPress={() => void openExport()} style={{ minHeight:48, padding:12, borderWidth:1, borderColor:palette.border, borderRadius:6 }}>
        <Text style={{ color:palette.accent }}>{busy ? "Carregando…" : "Exportar meus dados"}</Text>
      </Pressable>
      <Text style={{ color:palette.secondaryText }}>Portabilidade opcional da organização. Os livros e a leitura entre aparelhos usam a sincronização privada da conta.</Text>
      {error ? <Text accessibilityRole="alert" style={{ color:palette.accent }}>{error}</Text> : null}
    </View> : undefined} />
    {ready && data && data.userId === user?.id ? <OrganizationBackupModal records={data.records} bookIds={data.bookIds} onClose={() => setData(null)} onSaved={async () => { await useLibraryStore.getState().refresh(); }} /> : null}
  </>;
}
