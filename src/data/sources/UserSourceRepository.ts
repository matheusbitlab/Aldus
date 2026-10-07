import AsyncStorage from "@react-native-async-storage/async-storage";
import { UserSource } from "@/src/domain/types/sources";
const KEY = "kindle-reader.user-sources.v1";
export class UserSourceRepository {
  async list(): Promise<UserSource[]> {
    try {
      const raw = await AsyncStorage.getItem(KEY);
      if (!raw) return [];
      const sources = JSON.parse(raw) as UserSource[];
      return sources.map((source) => source.status
        ? source
        : { ...source, enabled: false, status: "error", lastError: "Fonte não verificada. Atualize para testar a conexão." });
    } catch {
      return [];
    }
  }
  async save(source: UserSource): Promise<void> { const sources = await this.list(); await AsyncStorage.setItem(KEY, JSON.stringify([...sources.filter((item) => item.id !== source.id), source])); }
  async remove(id: string): Promise<void> { await AsyncStorage.setItem(KEY, JSON.stringify((await this.list()).filter((source) => source.id !== id))); }
}
