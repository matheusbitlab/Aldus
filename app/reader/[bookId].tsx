import { useLocalSearchParams } from "expo-router";
import { ReaderScreen } from "@/src/presentation/screens/ReaderScreen";

export default function ReaderRoute() {
  const { bookId } = useLocalSearchParams<{ bookId: string }>();
  return <ReaderScreen bookId={bookId ?? ""} />;
}
