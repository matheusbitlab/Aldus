import { useState } from "react";
import { router, type Href } from "expo-router";
import { useCommunity, useCommunityFocus } from "./CommunityProvider";
import { Action, Card, CommunityGate, CommunityPage, Copy, Meter, ProfileIdentity, Stats, Timeline } from "./components";
import { communityDestinations, type CommunityDestination } from "./content";
import { goalProgress } from "../domain/profile";
import { achievements } from "../domain/progression";

export function CommunityHomeScreen() {
  useCommunityFocus();
  const { view, refresh, service } = useCommunity();
  const [busy, setBusy] = useState(false), [failure, setFailure] = useState<string | null>(null);
  const toggle = async () => {
    if (!view || !service || busy) return;
    setBusy(true); setFailure(null);
    try { await service.setIncludeDeviceLibrary(!view.state.includeDeviceLibrary); await refresh(); }
    catch (e) { setFailure(e instanceof Error ? e.message : "Não foi possível salvar."); }
    finally { setBusy(false); }
  };
  const goal = view ? goalProgress(view.state.profile?.readingGoal ?? null, view.stats.booksByYear) : null;
  return <CommunityPage title="Comunidade"><CommunityGate>{view?.state.profile && <>
    <Copy secondary>Uma jornada construída entre livros.</Copy>
    <Card><ProfileIdentity profile={view.state.profile} /><Action label="Meu perfil literário" onPress={() => router.push("/community/profile" as Href)} /></Card>
    <Card title="Sua jornada literária"><Meter fraction={view.progression.fraction} label={view.progression.level.name} />
      <Copy secondary>{view.progression.points} pontos de leitura{view.progression.level.nextThreshold !== null ? ` · próximo nível em ${view.progression.level.nextThreshold}` : ""}</Copy>
      <Copy secondary>10 pontos por início e 100 por conclusão, uma vez por livro. O hábito só conta quando há dias de leitura medidos.</Copy>
      {achievements(view.state).filter(a => a.unlockedAt !== null).map(a => <Copy key={a.id}>{a.name} · {a.description}</Copy>)}
    </Card>
    <Card title="Meta anual">{view.state.profile.readingGoal ? <>
      <Copy>{view.state.profile.readingGoal.books} livros em {view.state.profile.readingGoal.year}</Copy>
      {goal ? <Meter fraction={goal.fraction} label={`${goal.completed} de ${goal.target} livros`} /> : <Copy secondary>Progresso anual não disponível: esta biblioteca não registra datas de conclusão.</Copy>}
    </> : <Copy secondary>Escolha uma meta que faça sentido para sua leitura.</Copy>}
      <Action label="Editar perfil e meta" onPress={() => router.push("/community/edit-profile" as Href)} />
    </Card>
    <Card title={view.snapshot.scope === "device" ? "Biblioteca deste dispositivo" : "Suas leituras"}>
      {view.snapshot.scope === "device" && <Copy secondary>Esta biblioteca ainda é compartilhada no dispositivo. As contagens abaixo não identificam quem leu cada obra.</Copy>}
      {view.stats.total ? <Stats stats={view.stats} /> : <Copy secondary>Sua biblioteca está vazia. Adicione um livro para começar.</Copy>}
      {view.snapshot.scope === "device" && <>
        <Copy secondary>Inclua apenas se estas leituras forem suas. A inclusão registra estados atuais na sua jornada local, sem inventar datas. Nenhum dado será publicado.</Copy>
        <Action label={view.state.includeDeviceLibrary ? "Pausar inclusão na jornada local" : "Incluir estas leituras na minha jornada local"} disabled={busy} onPress={() => void toggle()} />
        {failure && <Copy>{failure}</Copy>}
      </>}
      <Action label="Atualizar leituras" disabled={busy} onPress={() => void refresh()} />
    </Card>
    <Timeline activities={view.state.activities} />
    {(Object.keys(communityDestinations) as CommunityDestination[]).map(key => <Card key={key} title={communityDestinations[key].title}>
      <Copy secondary>{communityDestinations[key].description} Em construção.</Copy>
      <Action label={`Conhecer ${communityDestinations[key].title.toLowerCase()}`} onPress={() => router.push(`/community/${key}` as Href)} />
    </Card>)}
  </>}</CommunityGate></CommunityPage>;
}
