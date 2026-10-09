import AsyncStorage from "@react-native-async-storage/async-storage";
// Fallback for non-platform tooling. Expo selects .native / .web in the application.
export const flashcardStorage = AsyncStorage;
