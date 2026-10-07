import JSZip from "jszip";
import { EpubValidator } from "@/src/data/epub/EpubTypes";
import { InvalidEpubError } from "@/src/data/epub/EpubErrors";

export class EpubValidatorService implements EpubValidator {
  async validate(bytes: Uint8Array): Promise<void> {
    await this.openAndValidate(bytes);
  }
  async openAndValidate(bytes: Uint8Array): Promise<JSZip> {
    if (bytes.byteLength === 0) throw new InvalidEpubError("O arquivo EPUB está vazio.");
    let zip: JSZip;
    try { zip = await JSZip.loadAsync(bytes); } catch (error) { throw new InvalidEpubError("O arquivo não é um ZIP EPUB válido.", error); }
    const mimetype = zip.file("mimetype");
    if (!mimetype || (await mimetype.async("string")).trim() !== "application/epub+zip") throw new InvalidEpubError("O EPUB não possui um mimetype válido.");
    const container = zip.file("META-INF/container.xml");
    if (!container) throw new InvalidEpubError("O EPUB não possui META-INF/container.xml.");
    const containerXml = await container.async("string");
    if (!/rootfile[^>]+full-path=/i.test(containerXml)) throw new InvalidEpubError("O container EPUB não aponta para um OPF.");
    const opfPath = containerXml.match(/full-path=["']([^"']+)["']/i)?.[1];
    if (!opfPath || !zip.file(opfPath)) throw new InvalidEpubError("O arquivo OPF do EPUB não foi encontrado.");
    return zip;
  }
}
