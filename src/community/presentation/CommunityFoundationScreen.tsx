import { router, useLocalSearchParams, type Href } from "expo-router";
import { Action, Card, CommunityPage, Copy } from "./components";
import { destination } from "./content";

export function CommunityFoundationScreen() {
  const { section } = useLocalSearchParams<{ section: string }>();
  const content = destination(section);
  return <CommunityPage title={content?.title ?? "Comunidade"}><Card title={content ? "Em construção" : "Página não encontrada"}>
    <Copy secondary>{content?.empty ?? "Este espaço não está disponível."}</Copy>
    <Action label="Voltar à comunidade" onPress={() => router.replace("/community" as Href)} />
  </Card></CommunityPage>;
}
