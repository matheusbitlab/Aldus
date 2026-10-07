import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  defaultPdfReaderSettings,
  PdfReaderSettings,
} from "@/src/domain/types/pdfReader";

export class PdfReaderSettingsStore {
  async get(bookId: string): Promise<PdfReaderSettings | null> {
    try {
      const value = await AsyncStorage.getItem(getKey(bookId));
      return value ? { ...defaultPdfReaderSettings, ...JSON.parse(value) } : null;
    } catch {
      return null;
    }
  }

  async save(bookId: string, settings: PdfReaderSettings): Promise<void> {
    await AsyncStorage.setItem(getKey(bookId), JSON.stringify(settings));
  }
}

function getKey(bookId: string): string {
  return `reader.pdf.settings.${bookId}`;
}