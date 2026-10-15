import JSZip from "jszip";
import { EpubValidator } from "@/src/data/epub/EpubTypes";
import { InvalidEpubError } from "@/src/data/epub/EpubErrors";
import { throwIfAborted, withAbort } from "@/src/core/utils/cancellation";

export class EpubValidatorService implements EpubValidator {
  async validate(bytes: Uint8Array): Promise<void> {
    await this.openAndValidate(bytes);
  }
  async openAndValidate(bytes: Uint8Array, signal?: AbortSignal): Promise<JSZip> {
    throwIfAborted(signal);
    if (bytes.byteLength === 0) throw new InvalidEpubError("O arquivo EPUB está vazio.");
    let zip: JSZip;
    try { zip = await withAbort(JSZip.loadAsync(bytes), signal); } catch (error) { throwIfAborted(signal); throw new InvalidEpubError("O arquivo não é um ZIP EPUB válido.", error); }
    throwIfAborted(signal);
    const mimetype = zip.file("mimetype");
    if (!mimetype || (await withAbort(mimetype.async("string"), signal)).trim() !== "application/epub+zip") throw new InvalidEpubError("O EPUB não possui um mimetype válido.");
    throwIfAborted(signal);
    const container = zip.file("META-INF/container.xml");
    if (!container) throw new InvalidEpubError("O EPUB não possui META-INF/container.xml.");
    const containerXml = await withAbort(container.async("string"), signal);
    throwIfAborted(signal);
    if (!/rootfile[^>]+full-path=/i.test(containerXml)) throw new InvalidEpubError("O container EPUB não aponta para um OPF.");
    const opfPath = containerXml.match(/full-path=["']([^"']+)["']/i)?.[1];
    if (!opfPath || !zip.file(opfPath)) throw new InvalidEpubError("O arquivo OPF do EPUB não foi encontrado.");
    return zip;
  }
}
