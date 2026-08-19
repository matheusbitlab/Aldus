import Slider from "@react-native-community/slider";
import { StyleSheet, Text, View } from "react-native";

interface Props { progress: number; pageNumber: number; totalPages: number; accent: string; secondaryText: string; onChange: (progress: number) => void; }
export function BottomFooter({ progress, pageNumber, totalPages, accent, secondaryText, onChange }: Props) {
  return <View style={styles.footer}><Slider accessibilityLabel="Reading progress" value={progress} minimumValue={0} maximumValue={1} onValueChange={onChange} minimumTrackTintColor={accent} maximumTrackTintColor={`${secondaryText}55`} thumbTintColor={accent} /><View style={styles.meta}><Text style={[styles.label, { color: secondaryText }]}>{Math.round(progress * 100)}% read</Text><Text style={[styles.label, { color: secondaryText }]}>Page {pageNumber} of {totalPages} est.</Text></View></View>;
}
const styles = StyleSheet.create({ footer: { position: "absolute", zIndex: 2, bottom: 0, left: 0, right: 0, paddingHorizontal: 18, paddingTop: 10, paddingBottom: 24 }, meta: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 5 }, label: { fontSize: 11, letterSpacing: 0.2 } });
