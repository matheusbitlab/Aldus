import { useState } from "react";
import { router, type Href } from "expo-router";
import { useCommunity, useCommunityFocus } from "./CommunityProvider";
import { Action, Card, CommunityGate, CommunityPage, Copy, Meter, ProfileIdentity, Stats, Timeline } from "./components";
import { canView, goalProgress } from "../domain/profile";

export function CommunityProfileScreen() {
  useCommunityFocus();
  const { view } = useCommunity(), [preview, setPreview] = useState(false);
  const profile = view?.state.profile;
  const visible = profile && (!preview || canView(profile.privacy, profile.userId, null));
  const goal = profile && view ? goalProgress(profile.readingGoal, view.stats.booksByYear) : null;
  return <CommunityPage title="Perfil literário"><CommunityGate>{profile && view && <>
    <Copy secondary>Perfil salvo neste dispositivo. A publicação para outros leitores chegará em uma próxima etapa.</Copy>
    <Action label={preview ? "Voltar ao meu perfil" : "Prévia para outros leitores"} onPress={() => setPreview(!preview)} />
    {visible ? <>
      <Card><ProfileIdentity profile={profile} /><Copy>{profile.bio || "Uma nova jornada literária."}</Copy></Card>
      <Card title="Entre suas leituras"><Copy>Gêneros favoritos: {profile.favoriteGenres.join(", ") || "Ainda não informados"}</Copy>
        <Copy>Autores favoritos: {profile.favoriteAuthors.join(", ") || "Ainda não informados"}</Copy>
        <Copy>Livros favoritos: {profile.favoriteBooks.join(", ") || "Ainda não informados"}</Copy>
      </Card>
      <Card title="Jornada"><Meter fraction={view.progression.fraction} label={view.progression.level.name} /><Copy secondary>{view.progression.points} pontos de leitura</Copy></Card>
      <Card title="Meta anual">{profile.readingGoal ? <><Copy>{profile.readingGoal.books} livros em {profile.readingGoal.year}</Copy>
        {goal ? <Meter fraction={goal.fraction} label={`${goal.completed} de ${goal.target} livros`} /> : <Copy secondary>Progresso anual não disponível sem datas de conclusão.</Copy>}</> : <Copy secondary>Meta ainda não definida.</Copy>}</Card>
      {(!preview || view.snapshot.scope === "account" || view.state.includeDeviceLibrary) && <Card title={view.snapshot.scope === "device" ? "Leituras do dispositivo" : "Estatísticas"}><Stats stats={view.stats} /></Card>}
      <Timeline activities={view.state.activities.filter(a => !preview || canView(a.privacy, a.userId, null))} />
    </> : <Card title={profile.privacy === "FOLLOWERS" ? "Perfil para seguidores" : "Perfil privado"}><Copy secondary>Este perfil não está disponível para outros leitores.</Copy></Card>}
    {!preview && <Action label="Editar perfil literário" onPress={() => router.push("/community/edit-profile" as Href)} />}
  </>}</CommunityGate></CommunityPage>;
}
