import { Platform } from "react-native";

export interface IPdfThumbnailGenerator {
  generate(uri: string, bookId: string, pickedFile?: Blob): Promise<string | null>;
  saveBase64Cover?(bookId: string, base64Image: string): Promise<string | null>;
}

// In React Native/Expo, platform extension files (.web.ts / .native.ts) are picked by bundler.
// This fallback ensures typescript types and standard imports resolve correctly.
export { pdfThumbnailGenerator } from "@/src/presentation/services/PdfThumbnailGenerator.native";
