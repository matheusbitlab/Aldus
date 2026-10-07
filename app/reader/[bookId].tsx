import { useLocalSearchParams } from "expo-router";
import { ReaderScreen } from "@/src/presentation/screens/ReaderScreen";
import { AuthGuard } from "@/src/presentation/components/AuthGuard";

export default function ReaderRoute() {
  const { bookId } = useLocalSearchParams<{ bookId: string }>();
  return <AuthGuard><ReaderScreen bookId={bookId ?? ""} /></AuthGuard>;
}
