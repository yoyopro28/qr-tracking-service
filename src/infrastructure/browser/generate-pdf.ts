import type { QrPlacement, ReservedFlyer } from "../../domain/models";

export function generateFlyerPdf(
  input: { templateUrl: string; sheetCount: number; placements: QrPlacement[]; flyers: ReservedFlyer[] },
  onProgress?: (completed: number, total: number) => void,
): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("./pdf-generation.worker.ts", import.meta.url), { type: "module" });
    worker.onmessage = (event: MessageEvent<{ type: string; completed?: number; total?: number; bytes?: ArrayBuffer; message?: string }>) => {
      if (event.data.type === "progress") onProgress?.(event.data.completed ?? 0, event.data.total ?? 0);
      if (event.data.type === "complete" && event.data.bytes) {
        worker.terminate();
        resolve(new Uint8Array(event.data.bytes));
      }
      if (event.data.type === "error") {
        worker.terminate();
        reject(new Error(event.data.message));
      }
    };
    worker.onerror = (event) => { worker.terminate(); reject(new Error(event.message)); };
    worker.postMessage(input);
  });
}
