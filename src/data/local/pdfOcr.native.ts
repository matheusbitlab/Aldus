import AldusPdfOcr, { NativeOcrPage } from "@/modules/aldus-pdf-ocr/index";
import type { PdfReflowPageData, PdfReflowTextItem } from "@/src/domain/types/pdfReader";

export async function beginPdfOcr(operationId: number): Promise<void> {
  await AldusPdfOcr.beginOperation(operationId);
}

export async function cancelPdfOcr(operationId: number): Promise<void> {
  await AldusPdfOcr.cancelOperation(operationId).catch(() => undefined);
}

export async function recognizePdfPage(
  uri: string,
  page: PdfReflowPageData,
  operationId: number
): Promise<PdfReflowTextItem[]> {
  const result = await AldusPdfOcr.recognizePage(uri, page.pageNumber - 1, 1800, operationId);
  return mapOcrLinesToPdf(result, page);
}

export function mapOcrLinesToPdf(result: NativeOcrPage, page: PdfReflowPageData): PdfReflowTextItem[] {
  const scaleX = page.pageWidth / result.bitmapWidth;
  const scaleY = page.pageHeight / result.bitmapHeight;
  return result.lines.map(line => ({
    text: line.text.normalize("NFC"),
    direction: "ltr",
    x: line.left * scaleX,
    y: page.pageHeight - line.bottom * scaleY,
    width: Math.max(0, line.right - line.left) * scaleX,
    height: Math.max(1, line.bottom - line.top) * scaleY,
    fontName: "AldusOCR",
    hasEOL: true,
  }));
}
