import type { QrPlacement, ReservedFlyer } from "../../domain/models";

const workerIdleTimeoutMs = 30_000;
const workerRetryDelayMs = 250;

function runPdfWorker(
  input: { templateUrl: string; sheetCount: number; placements: QrPlacement[]; flyers: ReservedFlyer[] },
  onProgress?: (completed: number, total: number) => void,
): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("./pdf-generation.worker.ts", import.meta.url), { type: "module" });
    let settled = false;
    let idleTimer: ReturnType<typeof setTimeout>;

    const finish = (callback: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(idleTimer);
      worker.terminate();
      callback();
    };
    const resetIdleTimer = () => {
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        finish(() => reject(new Error("Der PDF-Worker hat innerhalb des Zeitlimits nicht geantwortet.")));
      }, workerIdleTimeoutMs);
    };

    worker.onmessage = (event: MessageEvent<{ type: string; completed?: number; total?: number; bytes?: ArrayBuffer; message?: string }>) => {
      resetIdleTimer();
      if (event.data.type === "progress") onProgress?.(event.data.completed ?? 0, event.data.total ?? 0);
      if (event.data.type === "complete" && event.data.bytes) {
        const bytes = event.data.bytes;
        finish(() => resolve(new Uint8Array(bytes)));
      }
      if (event.data.type === "error") {
        finish(() => reject(new Error(event.data.message)));
      }
    };
    worker.onerror = (event) => finish(() => reject(new Error(event.message || "Der PDF-Worker konnte nicht geladen werden.")));
    resetIdleTimer();
    worker.postMessage(input);
  });
}

export async function generateFlyerPdf(
  input: { templateUrl: string; sheetCount: number; placements: QrPlacement[]; flyers: ReservedFlyer[] },
  onProgress?: (completed: number, total: number) => void,
): Promise<Uint8Array> {
  try {
    return await runPdfWorker(input, onProgress);
  } catch {
    await new Promise((resolve) => setTimeout(resolve, workerRetryDelayMs));
    return runPdfWorker(input, onProgress);
  }
}
