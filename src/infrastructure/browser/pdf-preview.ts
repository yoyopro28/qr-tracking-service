import { GlobalWorkerOptions, getDocument } from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

GlobalWorkerOptions.workerSrc = workerUrl;

export { getDocument };
export type { PDFDocumentProxy, RenderTask } from "pdfjs-dist";

export async function readPdfMetadata(file: File) {
  const pdf = await getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  const first = await pdf.getPage(1);
  const viewport = first.getViewport({ scale: 1 });
  const result = { pageCount: pdf.numPages, width: viewport.width, height: viewport.height };
  await pdf.cleanup();
  return result;
}
