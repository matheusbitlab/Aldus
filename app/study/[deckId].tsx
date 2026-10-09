import { AuthGuard } from "@/src/presentation/components/AuthGuard";
import { FeatureDenied } from "@/src/presentation/components/FeatureDenied";
import { useFeatureAccess } from "@/src/presentation/contexts/AuthContext";
import { FlashcardStudyScreen } from "@/src/presentation/screens/FlashcardStudyScreen";
export default function FlashcardStudy() {
  const { allowed } = useFeatureAccess("flashcards");
  return (
    <AuthGuard>
      {allowed ? <FlashcardStudyScreen /> : <FeatureDenied />}
    </AuthGuard>
  );
}
