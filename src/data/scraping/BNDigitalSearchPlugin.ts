import { SearchPlugin, ScrapedLink } from "@/src/domain/types/search";
export const BNDIGITAL_BLOCK_REASON = "BNDigital: integração indisponível. O portal bloqueou a consulta automatizada (HTTP 403), e a aquisição de EPUB/PDF pelo acervo ainda não foi validada.";
export class BNDigitalSearchPlugin implements SearchPlugin {
  name = "BNDigital";
  getSearchEndpoint(): string { throw new Error(BNDIGITAL_BLOCK_REASON); }
  parseResults(): ScrapedLink[] { return []; }
}
