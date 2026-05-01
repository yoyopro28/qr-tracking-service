"use client";

import { useEffect, useRef, useState } from "react";

type PdfPageMetrics = {
  width: number;
  height: number;
};

type PdfRenderTask = {
  cancel(): void;
  promise: Promise<void>;
};

async function loadPdfJs() {
  return ((0, eval)('import("/vendor/pdfjs/pdf.mjs")') as Promise<{
    GlobalWorkerOptions: { workerSrc: string };
    getDocument(src: string): {
      promise: Promise<{
        numPages: number;
        getPage(pageNumber: number): Promise<{
          getViewport(params: { scale: number }): {
            width: number;
            height: number;
          };
          render(params: unknown): PdfRenderTask;
        }>;
      }>;
    };
  }>);
}

export function PdfPlacementCanvas({
  documentSrc,
  pageNumber,
  onPageMetrics,
}: {
  documentSrc: string;
  pageNumber: number;
  onPageMetrics: (metrics: PdfPageMetrics) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isCancelled = false;
    let renderTask: PdfRenderTask | null = null;

    async function renderPdfPage() {
      try {
        setIsLoading(true);
        setError(null);

        const canvas = canvasRef.current;

        if (!canvas) {
          return;
        }

        const pdfjs = await loadPdfJs();
        pdfjs.GlobalWorkerOptions.workerSrc = "/vendor/pdfjs/pdf.worker.min.mjs";

        const loadingTask = pdfjs.getDocument(documentSrc);
        const pdf = await loadingTask.promise;
        const safePageNumber = Math.min(Math.max(pageNumber, 1), pdf.numPages);
        const page = await pdf.getPage(safePageNumber);
        const viewport = page.getViewport({ scale: 1 });
        const displayWidth = Math.min(Math.max(window.innerWidth - 420, 720), 1200);
        const scale = displayWidth / viewport.width;
        const scaledViewport = page.getViewport({ scale });
        const outputScale = window.devicePixelRatio || 1;
        const context = canvas.getContext("2d");

        if (!context || isCancelled) {
          return;
        }

        canvas.width = Math.floor(scaledViewport.width * outputScale);
        canvas.height = Math.floor(scaledViewport.height * outputScale);
        canvas.style.width = "100%";
        canvas.style.height = "auto";
        context.setTransform(outputScale, 0, 0, outputScale, 0, 0);

        onPageMetrics({
          width: viewport.width,
          height: viewport.height,
        });

        renderTask = page.render({
          canvasContext: context,
          viewport: scaledViewport,
        } as never);

        await renderTask.promise;

        if (!isCancelled) {
          setIsLoading(false);
        }
      } catch (renderError) {
        if (!isCancelled) {
          setError(renderError instanceof Error ? renderError.message : "Failed to render PDF page");
          setIsLoading(false);
        }
      }
    }

    void renderPdfPage();

    return () => {
      isCancelled = true;
      renderTask?.cancel?.();
    };
  }, [documentSrc, onPageMetrics, pageNumber]);

  return (
    <div className="placementPdfSurface">
      <canvas ref={canvasRef} className="placementPdfCanvas" />
      {isLoading ? <div className="placementPdfStatus">Rendering PDF page...</div> : null}
      {error ? <div className="placementPdfStatus placementPdfStatus--error">{error}</div> : null}
    </div>
  );
}
