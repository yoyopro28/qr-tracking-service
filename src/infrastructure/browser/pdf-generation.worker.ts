/// <reference lib="webworker" />
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import QRCode from "qrcode";
import type { QrPlacement, ReservedFlyer } from "../../domain/models";

export interface PdfGenerationRequest {
  templateUrl: string;
  sheetCount: number;
  placements: QrPlacement[];
  flyers: ReservedFlyer[];
}

type WorkerResponse =
  | { type: "progress"; completed: number; total: number }
  | { type: "complete"; bytes: ArrayBuffer }
  | { type: "error"; message: string };

const scope: DedicatedWorkerGlobalScope = self as unknown as DedicatedWorkerGlobalScope;

function drawQr(page: import("pdf-lib").PDFPage, content: string, placement: QrPlacement) {
  const qr = QRCode.create(content, { errorCorrectionLevel: "M" });
  const size = qr.modules.size;
  const quietZone = 2;
  const cells = size + quietZone * 2;
  const moduleSize = Math.min(placement.width, placement.height) / cells;
  const qrSize = moduleSize * cells;
  const left = placement.x + (placement.width - qrSize) / 2;
  const bottom = page.getHeight() - placement.y - placement.height + (placement.height - qrSize) / 2;

  // Keep the QR overlay transparent so the original template remains visible
  // around and between the QR modules. The quiet zone is represented by the
  // module offset below rather than by an opaque white background rectangle.
  for (let row = 0; row < size; row += 1) {
    for (let column = 0; column < size; column += 1) {
      if (qr.modules.get(row, column)) {
        page.drawRectangle({
          x: left + (column + quietZone) * moduleSize,
          y: bottom + (size - row - 1 + quietZone) * moduleSize,
          width: moduleSize + 0.01,
          height: moduleSize + 0.01,
          color: rgb(0, 0, 0),
        });
      }
    }
  }
}

scope.onmessage = async (event: MessageEvent<PdfGenerationRequest>) => {
  try {
    const response = await fetch(event.data.templateUrl);
    if (!response.ok) throw new Error("Die PDF-Vorlage konnte nicht geladen werden.");
    const source = await PDFDocument.load(await response.arrayBuffer());
    const target = await PDFDocument.create();
    const font = await target.embedFont(StandardFonts.Helvetica);

    for (let sheetIndex = 0; sheetIndex < event.data.sheetCount; sheetIndex += 1) {
      const pages = await target.copyPages(source, source.getPageIndices());
      pages.forEach((page) => target.addPage(page));
      const sheetFlyers = event.data.flyers.filter((flyer) => flyer.sheetIndex === sheetIndex);
      for (const flyer of sheetFlyers) {
        const placement = event.data.placements[flyer.placementIndex];
        const page = pages[placement.pageNumber - 1];
        if (!page) throw new Error(`QR-Platzierung verweist auf eine fehlende Seite ${placement.pageNumber}.`);
        drawQr(page, flyer.trackingUrl, placement);
        if (placement.shortTextEnabled) {
          page.drawText(flyer.shortcode, {
            x: placement.x + (placement.shortTextOffsetX ?? 0),
            y: page.getHeight() - placement.y - placement.height - 10 - (placement.shortTextOffsetY ?? 0),
            size: 7,
            font,
            color: rgb(0, 0, 0),
          });
        }
      }
      scope.postMessage({ type: "progress", completed: sheetIndex + 1, total: event.data.sheetCount } satisfies WorkerResponse);
    }

    const bytes = await target.save();
    const transferable = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
    scope.postMessage({ type: "complete", bytes: transferable } satisfies WorkerResponse, [transferable]);
  } catch (error) {
    scope.postMessage({ type: "error", message: error instanceof Error ? error.message : "PDF-Erzeugung fehlgeschlagen." } satisfies WorkerResponse);
  }
};

export {};
