import { ImageSourcePropType } from "react-native";
import { Book, DEFAULT_COVER_PLACEHOLDER } from "@/src/constants/mockBooks";

type CoverAssetContext = {
  keys(): string[];
  (key: string): ImageSourcePropType;
};

declare const require: {
  context(directory: string, recursive?: boolean, filter?: RegExp): CoverAssetContext;
};

const coverAssets = require.context("../../assets/covers", false, /\.(?:jpg|jpeg|png|webp)$/i);
const defaultCover = resolveCoverAsset(DEFAULT_COVER_PLACEHOLDER);

export const getDefaultBookCover = (): ImageSourcePropType => defaultCover;

export const getBookCover = (book: Book): ImageSourcePropType => {
  const coverUri = book.coverUri?.trim();
  if (!coverUri) return defaultCover;
  if (/^(?:data:|https?:|file:)/i.test(coverUri)) return { uri: coverUri };
  return resolveCoverAsset(coverUri);
};

/**
 * Normaliza o caminho do ficheiro do livro para a Web e Mobile.
 */
export const getBookFileUri = (fileUri: string): string => {
  if (!fileUri) return '';
  if (fileUri.startsWith('http') || fileUri.startsWith('file://') || fileUri.startsWith('data:')) {
    return fileUri;
  }
  // Garante que o caminho relativo para a pasta dist/assets comece com barra na Web
  return fileUri.startsWith('/') ? fileUri : `/${fileUri}`;
};

function resolveCoverAsset(coverUri: string): ImageSourcePropType {
  const fileName = coverUri.split(/[\\/]/).pop()?.toLowerCase();
  const key = coverAssets.keys().find((assetKey) => assetKey.slice(2).toLowerCase() === fileName);
  return key ? coverAssets(key) : coverAssets("./default.jpg");
}