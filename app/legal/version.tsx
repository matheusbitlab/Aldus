import { LegalDocumentScreen } from "@/src/presentation/components/legal/LegalDocumentScreen";
import { getAppMetadata } from "@/src/legal/appMetadata";
import { LEGAL_DOCUMENT_VERSION } from "@/src/legal/legalConfig";

export default function VersionScreen() {
  const { version, build } = getAppMetadata();
  return <LegalDocumentScreen showReviewStatus={false} document={{
    title: "Versão do aplicativo",
    subtitle: "Identificação obtida da configuração em execução.",
    sections: [
      { heading: "Aldus Reader", bullets: [`Versão: ${version}`, `Build: ${build}`, `Documentos legais: versão ${LEGAL_DOCUMENT_VERSION}`] },
      { heading: "Por que estes números importam?", paragraphs: ["Ao relatar um problema, informe a versão e o build. Eles ajudam a identificar exatamente o código instalado sem duplicar números fixos nas telas."] },
    ],
  }} />;
}
