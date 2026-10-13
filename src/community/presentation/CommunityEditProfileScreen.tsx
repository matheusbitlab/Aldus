import { useState } from "react";
import { router } from "expo-router";
import { Text, TextInput, View } from "react-native";
import { useAppTheme } from "@/src/presentation/contexts/AppThemeContext";
import { privacyOptions, validateProfile } from "../domain/profile";
import type { LiteraryProfile, Privacy } from "../domain/models";
import { useCommunity, useCommunityFocus } from "./CommunityProvider";
import { Action, Card, CommunityGate, CommunityPage, Copy } from "./components";

const privacyLabels: Record<Privacy, string> = { PUBLIC: "Público", FOLLOWERS: "Seguidores", PRIVATE: "Privado" };
export function CommunityEditProfileScreen() {
  useCommunityFocus(); const { view } = useCommunity();
  return <CommunityPage title="Editar perfil"><CommunityGate>{view?.state.profile && <ProfileForm initial={view.state.profile} revision={view.state.revision} />}</CommunityGate></CommunityPage>;
}
function ProfileForm({ initial, revision }: { initial: LiteraryProfile; revision: number }) {
  const { service, refresh } = useCommunity(), { palette } = useAppTheme();
  // A later refresh must not replace unsaved edits or their original revision.
  const [draft, setDraft] = useState(initial), [expectedRevision] = useState(revision);
  const [genres, setGenres] = useState(initial.favoriteGenres.join(", ")), [authors, setAuthors] = useState(initial.favoriteAuthors.join(", ")), [books, setBooks] = useState(initial.favoriteBooks.join(", "));
  const [target, setTarget] = useState(initial.readingGoal ? String(initial.readingGoal.books) : ""), [year, setYear] = useState(String(initial.readingGoal?.year ?? new Date().getFullYear()));
  const [busy, setBusy] = useState(false), [error, setError] = useState<string | null>(null);
  const split = (value: string) => value.split(",").map(v => v.trim()).filter(Boolean);
  const save = async () => {
    if (!service || busy) return;
    setBusy(true); setError(null);
    try {
      const profile = validateProfile({ ...draft, favoriteGenres: split(genres), favoriteAuthors: split(authors), favoriteBooks: split(books),
        readingGoal: target.trim() ? { year: Number(year), books: Number(target) } : null });
      await service.saveProfile(profile, expectedRevision); await refresh(); router.back();
    } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível salvar o perfil."); }
    finally { setBusy(false); }
  };
  const field = (label: string, value: string, change: (text: string) => void, multiline = false, maxLength = 600, numeric = false) => <View key={label} style={{ gap: 6 }}>
    <Text style={{ color: palette.text, fontSize: 14 }}>{label}</Text>
    <TextInput accessibilityLabel={label} value={value} onChangeText={change} editable={!busy} multiline={multiline} maxLength={maxLength}
      keyboardType={numeric ? "number-pad" : "default"} style={{ color: palette.text, backgroundColor: palette.input, borderColor: palette.border, borderWidth: 1, borderRadius: 6, padding: 12, minHeight: multiline ? 100 : 48, textAlignVertical: "top" }} />
  </View>;
  return <>
    <Card title="Seu perfil"><Copy secondary>@{initial.username} · avatar e nome de usuário vêm da sua conta.</Copy>
      {field("Nome de exibição", draft.displayName, displayName => setDraft({ ...draft, displayName }), false, 80)}
      {field("Bio", draft.bio, bio => setDraft({ ...draft, bio }), true)}
      {field("Gêneros favoritos (separados por vírgula)", genres, setGenres, false, 3200)}
      {field("Autores favoritos (separados por vírgula)", authors, setAuthors, false, 3200)}
      {field("Livros favoritos (separados por vírgula)", books, setBooks, false, 3200)}
    </Card>
    <Card title="Meta anual">{field("Livros na meta (vazio para remover)", target, setTarget, false, 5, true)}{field("Ano da meta", year, setYear, false, 4, true)}</Card>
    {(["privacy", "activityPrivacy"] as const).map(key => <Card key={key} title={key === "privacy" ? "Privacidade do perfil" : "Privacidade de novas atividades"}>
      <Copy secondary>Esta escolha será usada quando a publicação estiver disponível. Atividades anteriores mantêm sua própria privacidade.</Copy>
      {privacyOptions.map(value => <Action key={value} label={`${draft[key] === value ? "Selecionado: " : ""}${privacyLabels[value]}`} disabled={busy} onPress={() => setDraft({ ...draft, [key]: value })} />)}
    </Card>)}
    {error && <Text accessibilityRole="alert" style={{ color: palette.text }}>{error}</Text>}
    <Action label={busy ? "Salvando…" : "Salvar perfil"} disabled={busy} onPress={() => void save()} />
    <Action label="Cancelar" disabled={busy} onPress={() => router.back()} />
  </>;
}
