import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { appDependencies, libraryOrganization } from "@/src/presentation/services/dependencies";
import { CommunityService } from "../application/CommunityService";
import { LocalCommunityRepository, type CommunityLock } from "../data/LocalCommunityRepository";
import type { CommunityIdentityProvider } from "../domain/ports";
import { LegacyReadingDataSource } from "./LegacyReadingDataSource";

const webLock: CommunityLock = (key, operation) => {
  if (Platform.OS !== "web") return operation();
  if (!globalThis.navigator?.locks) throw Error("Este navegador não oferece armazenamento seguro entre abas para a comunidade.");
  return globalThis.navigator.locks.request(key, operation);
};
/** Composition boundary: replace only this file and identity mapping after merge. */
export function createCommunityService(userId: string, identity: CommunityIdentityProvider) {
  return new CommunityService(identity, new LocalCommunityRepository(AsyncStorage, userId, webLock),
    new LegacyReadingDataSource(appDependencies.bookRepository, appDependencies.readingProgressRepository, libraryOrganization));
}
