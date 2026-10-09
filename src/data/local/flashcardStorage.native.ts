import AsyncStorage from "@react-native-async-storage/async-storage";
import { SQLiteStorage } from "expo-sqlite/kv-store";

const database = new SQLiteStorage("kindle-flashcards.db");
export const flashcardStorage = {
  async getItem(key: string): Promise<string | null> {
    const current = await database.getItem(key);
    if (current !== null) return current;
    const legacy = await AsyncStorage.getItem(key);
    if (legacy !== null)
      await database.setItem(key, (previous) => previous ?? legacy);
    // Copy-only migration: the old per-account key is never deleted or assigned to another account.
    return legacy === null ? null : database.getItem(key);
  },
  setItem(key: string, value: string): Promise<void> {
    return database.setItem(key, value);
  },
};
