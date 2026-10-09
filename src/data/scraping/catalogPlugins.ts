import { UserSource } from "@/src/domain/types/sources";
import { SearchPlugin } from "@/src/domain/types/search";
import { GutendexSearchPlugin } from "./GutendexSearchPlugin";
import { GutenbergSearchPlugin, gutenbergContact } from "./GutenbergSearchPlugin";
import { BNDigitalSearchPlugin } from "./BNDigitalSearchPlugin";
import { UserSourceSearchPlugin } from "./UserSourceSearchPlugin";
export const BUILTIN_CATALOG_NAMES = ["Gutendex", "Gutenberg"];
export function builtinCatalogs(): SearchPlugin[] { return [new GutendexSearchPlugin(), ...(gutenbergContact ? [new GutenbergSearchPlugin()] : [])]; }
export function configuredCatalog(source: UserSource): SearchPlugin {
  if (source.kind === "gutenberg") return Object.assign(new GutenbergSearchPlugin(), { name: source.name });
  if (source.kind === "bndigital") return Object.assign(new BNDigitalSearchPlugin(), { name: source.name });
  if (source.kind === "webview") return { name: source.name, getSearchEndpoint: () => { throw new Error("Uma página de leitura não é um catálogo com aquisição validada. Cadastre JSON, OPDS ou HTML com links de EPUB."); }, parseResults: () => [] };
  return new UserSourceSearchPlugin(source);
}
