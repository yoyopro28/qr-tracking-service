import { afterEach, describe, expect, it, vi } from "vitest";
import { generateFlyerPdf } from "./generate-pdf";

describe("generateFlyerPdf", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("restarts a worker that never responds", async () => {
    vi.useFakeTimers();
    let instanceCount = 0;

    class FakeWorker {
      onmessage: ((event: MessageEvent) => void) | null = null;
      onerror: ((event: ErrorEvent) => void) | null = null;

      constructor() {
        instanceCount += 1;
      }

      postMessage() {
        if (instanceCount !== 2) return;
        queueMicrotask(() => this.onmessage?.({ data: { type: "complete", bytes: new Uint8Array([1, 2, 3]).buffer } } as MessageEvent));
      }

      terminate() {}
    }

    vi.stubGlobal("Worker", FakeWorker);
    const result = generateFlyerPdf({ templateUrl: "https://example.test/template.pdf", sheetCount: 1, placements: [], flyers: [] });

    await vi.advanceTimersByTimeAsync(30_250);

    await expect(result).resolves.toEqual(new Uint8Array([1, 2, 3]));
    expect(instanceCount).toBe(2);
  });
});
