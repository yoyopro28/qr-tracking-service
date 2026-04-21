"use client";

import type { ChangeEvent, PointerEvent as ReactPointerEvent } from "react";
import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { createPortal } from "react-dom";
import type { TemplateActionState } from "@/app/campaigns/[campaignId]/template-actions";

type TemplateUploadFormProps = {
  action: (state: TemplateActionState, formData: FormData) => Promise<TemplateActionState>;
  initialState: TemplateActionState;
};

type PlacementValues = TemplateActionState["values"];
type PreviewMetadata = {
  pageCount: number;
  width: number | null;
  height: number | null;
};

const DEFAULT_PAGE_WIDTH = 595;
const DEFAULT_PAGE_HEIGHT = 842;

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button className="button" type="submit" disabled={pending}>
      {pending ? "Uploading..." : "Upload template"}
    </button>
  );
}

function FieldError({ id, errors }: { id: string; errors?: string[] }) {
  if (!errors?.length) {
    return null;
  }

  return (
    <p id={id} className="fieldError">
      {errors[0]}
    </p>
  );
}

function parsePdfMetadata(buffer: ArrayBuffer): PreviewMetadata {
  const pdfText = new TextDecoder("latin1").decode(buffer);
  const pageMatches = pdfText.match(/\/Type\s*\/Page\b/g);
  const mediaBoxMatch = pdfText.match(
    /\/MediaBox\s*\[\s*(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s*\]/,
  );

  if (!mediaBoxMatch) {
    return {
      pageCount: Math.max(pageMatches?.length ?? 0, 1),
      width: null,
      height: null,
    };
  }

  const [, x1, y1, x2, y2] = mediaBoxMatch;
  const width = Number(x2) - Number(x1);
  const height = Number(y2) - Number(y1);

  return {
    pageCount: Math.max(pageMatches?.length ?? 0, 1),
    width: Number.isFinite(width) && width > 0 ? width : null,
    height: Number.isFinite(height) && height > 0 ? height : null,
  };
}

function formatPlacementValue(value: number) {
  return value.toFixed(2).replace(/\.00$/, "");
}

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
          render(params: unknown): {
            cancel(): void;
            promise: Promise<void>;
          };
        }>;
      }>;
    };
  }>);
}

function PdfPlacementCanvas({
  documentSrc,
  pageNumber,
  onPageMetrics,
}: {
  documentSrc: string;
  pageNumber: number;
  onPageMetrics: (metrics: { width: number; height: number }) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isCancelled = false;
    let renderTask: { cancel: () => void; promise: Promise<void> } | null = null;

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
        canvas.style.width = `${scaledViewport.width}px`;
        canvas.style.height = `${scaledViewport.height}px`;
        context.setTransform(outputScale, 0, 0, outputScale, 0, 0);

        onPageMetrics({
          width: viewport.width,
          height: viewport.height,
        });

        renderTask = page.render({
          canvasContext: context,
          viewport: scaledViewport,
        } as never) as { cancel: () => void; promise: Promise<void> };

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

function PlacementPanel({
  documentSrc,
  pageNumber,
  pageCount,
  pageWidth,
  pageHeight,
  values,
  onPlacementChange,
}: {
  documentSrc: string | null;
  pageNumber: number;
  pageCount: number | null;
  pageWidth: number;
  pageHeight: number;
  values: PlacementValues;
  onPlacementChange: (nextValues: Partial<PlacementValues>) => void;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [renderedPageMetrics, setRenderedPageMetrics] = useState<{
    width: number;
    height: number;
  } | null>(null);

  const effectivePageWidth = renderedPageMetrics?.width ?? pageWidth;
  const effectivePageHeight = renderedPageMetrics?.height ?? pageHeight;
  const qrX = Number(values.qrX || 0);
  const qrY = Number(values.qrY || 0);
  const qrWidth = Number(values.qrWidth || 0);
  const qrHeight = Number(values.qrHeight || 0);

  const selectionStyle = {
    left: `${(qrX / effectivePageWidth) * 100}%`,
    top: `${(qrY / effectivePageHeight) * 100}%`,
    width: `${(qrWidth / effectivePageWidth) * 100}%`,
    height: `${(qrHeight / effectivePageHeight) * 100}%`,
  };

  useEffect(() => {
    function handlePointerMove(event: PointerEvent) {
      if (!dragStartRef.current || !stageRef.current) {
        return;
      }

      const rect = stageRef.current.getBoundingClientRect();
      const currentX = Math.min(Math.max(event.clientX - rect.left, 0), rect.width);
      const currentY = Math.min(Math.max(event.clientY - rect.top, 0), rect.height);
      const start = dragStartRef.current;
      const deltaX = currentX - start.x;
      const deltaY = currentY - start.y;
      const squareSize = Math.min(Math.abs(deltaX), Math.abs(deltaY));
      const endX = start.x + Math.sign(deltaX || 1) * squareSize;
      const endY = start.y + Math.sign(deltaY || 1) * squareSize;
      const boundedEndX = Math.min(Math.max(endX, 0), rect.width);
      const boundedEndY = Math.min(Math.max(endY, 0), rect.height);
      const nextX = Math.min(start.x, boundedEndX);
      const nextY = Math.min(start.y, boundedEndY);
      const nextWidth = Math.abs(boundedEndX - start.x);
      const nextHeight = Math.abs(boundedEndY - start.y);

      onPlacementChange({
        qrX: formatPlacementValue((nextX / rect.width) * effectivePageWidth),
        qrY: formatPlacementValue((nextY / rect.height) * effectivePageHeight),
        qrWidth: formatPlacementValue((nextWidth / rect.width) * effectivePageWidth),
        qrHeight: formatPlacementValue((nextHeight / rect.height) * effectivePageHeight),
      });
    }

    function handlePointerUp() {
      dragStartRef.current = null;
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [effectivePageHeight, effectivePageWidth, onPlacementChange]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (!stageRef.current) {
      return;
    }

    const rect = stageRef.current.getBoundingClientRect();
    const startX = Math.min(Math.max(event.clientX - rect.left, 0), rect.width);
    const startY = Math.min(Math.max(event.clientY - rect.top, 0), rect.height);

    dragStartRef.current = {
      x: startX,
      y: startY,
    };

    onPlacementChange({
      qrX: formatPlacementValue((startX / rect.width) * effectivePageWidth),
      qrY: formatPlacementValue((startY / rect.height) * effectivePageHeight),
      qrWidth: "0",
      qrHeight: "0",
    });
  }

  return (
    <div className="placementPanel">
      <div className="placementPanelHeader">
        <div>
          <h3>QR placement panel</h3>
          <p className="sectionCopy">
            Open the large preview and draw one square QR area directly on the page.
          </p>
        </div>
        <span className="metricPill">
          Page {pageNumber}
          {pageCount ? ` of ${pageCount}` : ""}
        </span>
      </div>

      <div className="placementPanelSummary">
        <div className="placementSummaryValues">
          <span>
            Position: x {values.qrX || "-"}, y {values.qrY || "-"}
          </span>
          <span>
            Square size: {values.qrWidth || values.qrHeight || "-"}
          </span>
        </div>
        <button
          type="button"
          className="button"
          disabled={!documentSrc}
          onClick={() => setIsOpen(true)}
        >
          Open large placement view
        </button>
      </div>

      {!documentSrc ? (
        <div className="emptyState">
          <h3>No PDF selected yet</h3>
          <p>Choose a template PDF above to unlock the large placement window.</p>
        </div>
      ) : null}

      {isOpen && isMounted ? createPortal(
        <div className="placementModal" role="dialog" aria-modal="true" aria-labelledby="placement-title">
          <div className="placementModalBackdrop" onClick={() => setIsOpen(false)} />
          <div className="placementModalContent">
            <div className="placementModalBody">
              <section className="placementWorkspace">
                <header className="placementWorkspaceHeader">
                  <div>
                    <p className="eyebrow placementEyebrow">QR Placement Workspace</p>
                    <h3 id="placement-title">Draw the QR square on the PDF</h3>
                    <p className="sectionCopy">
                      Scroll inside the document area, then drag to set a fixed square QR zone.
                    </p>
                  </div>
                </header>

                <div className="placementWorkspaceCanvas">
                  <div className="placementViewer">
                    <PdfPlacementCanvas
                      documentSrc={documentSrc!}
                      pageNumber={pageNumber}
                      onPageMetrics={setRenderedPageMetrics}
                    />
                    <div
                      ref={stageRef}
                      className="placementOverlay"
                      style={{ aspectRatio: `${effectivePageWidth} / ${effectivePageHeight}` }}
                      onPointerDown={handlePointerDown}
                    >
                      {qrWidth > 0 && qrHeight > 0 ? (
                        <div className="placementSelection placementSelection--square" style={selectionStyle}>
                          <span className="placementSelectionLabel">QR</span>
                        </div>
                      ) : (
                        <div className="placementOverlayHint">Drag to place a square QR area</div>
                      )}
                    </div>
                  </div>
                </div>
              </section>

              <aside className="placementSidebar">
                <div className="placementSidebarSection">
                  <p className="eyebrow placementEyebrow">Controls</p>
                  <div className="placementModalActions placementModalActions--stack">
                    <button
                      type="button"
                      className="button"
                      onClick={() => setIsOpen(false)}
                    >
                      Done
                    </button>
                    <button
                      type="button"
                      className="button button--secondary"
                      onClick={() =>
                        onPlacementChange({
                          qrX: "",
                          qrY: "",
                          qrWidth: "",
                          qrHeight: "",
                        })
                      }
                    >
                      Clear selection
                    </button>
                  </div>
                </div>

                <div className="placementSidebarSection">
                  <p className="eyebrow placementEyebrow">Document</p>
                  <div className="placementSidebarCard">
                    <strong>Page</strong>
                    <span>
                      {pageNumber}
                      {pageCount ? ` / ${pageCount}` : ""}
                    </span>
                  </div>
                  <div className="placementSidebarCard">
                    <strong>Page size</strong>
                    <span>
                      {formatPlacementValue(effectivePageWidth)} x {formatPlacementValue(effectivePageHeight)}
                    </span>
                  </div>
                </div>

                <div className="placementSidebarSection">
                  <p className="eyebrow placementEyebrow">Placement</p>
                  <div className="placementSidebarCard">
                    <strong>X / Y</strong>
                    <span>
                      {values.qrX || "-"} / {values.qrY || "-"}
                    </span>
                  </div>
                  <div className="placementSidebarCard">
                    <strong>Square</strong>
                    <span>{values.qrWidth || values.qrHeight || "-"}</span>
                  </div>
                  <div className="placementSidebarCard">
                    <strong>Mode</strong>
                    <span>Square only</span>
                  </div>
                </div>

                <div className="placementSidebarSection">
                  <p className="eyebrow placementEyebrow">Hints</p>
                  <p className="sectionCopy placementSidebarCopy">
                    Use scrolling in the left canvas to inspect the document closely. The right rail stays available for dimensions and actions while you work.
                  </p>
                </div>

                <div className="placementSidebarSection">
                  <div className="placementSidebarCard">
                    <strong>Quick summary</strong>
                    <span>
                      x {values.qrX || "-"}, y {values.qrY || "-"}, size{" "}
                      {values.qrWidth || values.qrHeight || "-"}
                    </span>
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </div>
      , document.body) : null}
    </div>
  );
}

export function TemplateUploadForm({
  action,
  initialState,
}: TemplateUploadFormProps) {
  const [state, formAction] = useActionState(action, initialState);
  const [values, setValues] = useState<PlacementValues>(initialState.values);
  const [documentSrc, setDocumentSrc] = useState<string | null>(null);
  const [previewMetadata, setPreviewMetadata] = useState<PreviewMetadata>({
    pageCount: 1,
    width: null,
    height: null,
  });

  const previousDocumentSrcRef = useRef<string | null>(null);

  useEffect(() => {
    setValues(state.values);
  }, [state.values]);

  useEffect(() => {
    return () => {
      if (previousDocumentSrcRef.current) {
        URL.revokeObjectURL(previousDocumentSrcRef.current);
      }
    };
  }, []);

  const pageWidth = previewMetadata.width ?? DEFAULT_PAGE_WIDTH;
  const pageHeight = previewMetadata.height ?? DEFAULT_PAGE_HEIGHT;
  const pageCount = previewMetadata.pageCount;

  const previewPageNumber = useMemo(() => {
    const parsed = Number.parseInt(values.qrPageNumber, 10);

    if (!Number.isInteger(parsed) || parsed <= 0) {
      return 1;
    }

    return pageCount ? Math.min(parsed, pageCount) : parsed;
  }, [pageCount, values.qrPageNumber]);

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      if (previousDocumentSrcRef.current) {
        URL.revokeObjectURL(previousDocumentSrcRef.current);
        previousDocumentSrcRef.current = null;
      }

      setDocumentSrc(null);
      setPreviewMetadata({
        pageCount: 1,
        width: null,
        height: null,
      });
      return;
    }

    const nextDocumentSrc = URL.createObjectURL(file);

    if (previousDocumentSrcRef.current) {
      URL.revokeObjectURL(previousDocumentSrcRef.current);
    }

    previousDocumentSrcRef.current = nextDocumentSrc;
    setDocumentSrc(nextDocumentSrc);
    setPreviewMetadata(parsePdfMetadata(await file.arrayBuffer()));
  }

  function handleValueChange(
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) {
    const { name } = event.target;
    const nextValue =
      event.target instanceof HTMLInputElement && event.target.type === "checkbox"
        ? event.target.checked
        : event.target.value;

    setValues((currentValues) => ({
      ...currentValues,
      [name]: nextValue,
    }));
  }

  function handlePlacementChange(nextValues: Partial<PlacementValues>) {
    setValues((currentValues) => ({
      ...currentValues,
      ...nextValues,
    }));
  }

  return (
    <section className="panel">
      <div className="sectionHeader">
        <div>
          <h2>Upload template</h2>
          <p className="sectionCopy">
            Upload one PDF, preview it, and mark the QR placement area before saving.
          </p>
        </div>
      </div>

      <form action={formAction} className="stackForm">
        <label className="field">
          <span className="fieldLabel">Template PDF</span>
          <input
            className="input fileInput"
            type="file"
            name="templateFile"
            accept="application/pdf,.pdf"
            required
            onChange={handleFileChange}
            aria-invalid={Boolean(state.fieldErrors?.templateFile)}
            aria-describedby={state.fieldErrors?.templateFile ? "template-file-error" : undefined}
          />
          <FieldError id="template-file-error" errors={state.fieldErrors?.templateFile} />
        </label>

        <PlacementPanel
          documentSrc={documentSrc}
          pageNumber={previewPageNumber}
          pageCount={pageCount}
          pageWidth={pageWidth}
          pageHeight={pageHeight}
          values={values}
          onPlacementChange={handlePlacementChange}
        />

        <div className="fieldGrid">
          <label className="field">
            <span className="fieldLabel">QR page number</span>
            <input
              className="input"
              type="number"
              name="qrPageNumber"
              min="1"
              max={pageCount}
              step="1"
              required
              value={values.qrPageNumber}
              onChange={handleValueChange}
              aria-invalid={Boolean(state.fieldErrors?.qrPageNumber)}
              aria-describedby={
                state.fieldErrors?.qrPageNumber ? "template-qr-page-error" : undefined
              }
            />
            <FieldError id="template-qr-page-error" errors={state.fieldErrors?.qrPageNumber} />
          </label>

          <div className="placementHintCard">
            <strong>Placement workflow</strong>
            <p>
              Drag on the page map to fill the QR coordinates automatically, then fine-tune
              the values below if needed.
            </p>
          </div>
        </div>

        <div className="fieldGrid">
          <label className="field">
            <span className="fieldLabel">QR X</span>
            <input
              className="input"
              type="number"
              name="qrX"
              min="0"
              step="0.01"
              required
              value={values.qrX}
              onChange={handleValueChange}
              placeholder="32"
              aria-invalid={Boolean(state.fieldErrors?.qrX)}
              aria-describedby={state.fieldErrors?.qrX ? "template-qr-x-error" : undefined}
            />
            <FieldError id="template-qr-x-error" errors={state.fieldErrors?.qrX} />
          </label>

          <label className="field">
            <span className="fieldLabel">QR Y</span>
            <input
              className="input"
              type="number"
              name="qrY"
              min="0"
              step="0.01"
              required
              value={values.qrY}
              onChange={handleValueChange}
              placeholder="48"
              aria-invalid={Boolean(state.fieldErrors?.qrY)}
              aria-describedby={state.fieldErrors?.qrY ? "template-qr-y-error" : undefined}
            />
            <FieldError id="template-qr-y-error" errors={state.fieldErrors?.qrY} />
          </label>

          <label className="field">
            <span className="fieldLabel">QR width</span>
            <input
              className="input"
              type="number"
              name="qrWidth"
              min="0"
              step="0.01"
              required
              value={values.qrWidth}
              onChange={handleValueChange}
              placeholder="120"
              aria-invalid={Boolean(state.fieldErrors?.qrWidth)}
              aria-describedby={
                state.fieldErrors?.qrWidth ? "template-qr-width-error" : undefined
              }
            />
            <FieldError id="template-qr-width-error" errors={state.fieldErrors?.qrWidth} />
          </label>

          <label className="field">
            <span className="fieldLabel">QR height</span>
            <input
              className="input"
              type="number"
              name="qrHeight"
              min="0"
              step="0.01"
              required
              value={values.qrHeight}
              onChange={handleValueChange}
              placeholder="120"
              aria-invalid={Boolean(state.fieldErrors?.qrHeight)}
              aria-describedby={
                state.fieldErrors?.qrHeight ? "template-qr-height-error" : undefined
              }
            />
            <FieldError id="template-qr-height-error" errors={state.fieldErrors?.qrHeight} />
          </label>
        </div>

        <label className="checkboxField">
          <input
            type="checkbox"
            name="shortTextEnabled"
            checked={values.shortTextEnabled}
            onChange={handleValueChange}
          />
          <span>Enable short text label under the QR code</span>
        </label>

        <div className="fieldGrid">
          <label className="field">
            <span className="fieldLabel">Short text X offset</span>
            <input
              className="input"
              type="number"
              name="shortTextOffsetX"
              min="0"
              step="0.01"
              value={values.shortTextOffsetX}
              onChange={handleValueChange}
              placeholder="0"
              aria-invalid={Boolean(state.fieldErrors?.shortTextOffsetX)}
              aria-describedby={
                state.fieldErrors?.shortTextOffsetX ? "template-text-x-error" : undefined
              }
            />
            <FieldError
              id="template-text-x-error"
              errors={state.fieldErrors?.shortTextOffsetX}
            />
          </label>

          <label className="field">
            <span className="fieldLabel">Short text Y offset</span>
            <input
              className="input"
              type="number"
              name="shortTextOffsetY"
              min="0"
              step="0.01"
              value={values.shortTextOffsetY}
              onChange={handleValueChange}
              placeholder="16"
              aria-invalid={Boolean(state.fieldErrors?.shortTextOffsetY)}
              aria-describedby={
                state.fieldErrors?.shortTextOffsetY ? "template-text-y-error" : undefined
              }
            />
            <FieldError
              id="template-text-y-error"
              errors={state.fieldErrors?.shortTextOffsetY}
            />
          </label>
        </div>

        {state.formError ? <p className="formError">{state.formError}</p> : null}

        <div className="formActions">
          <SubmitButton />
        </div>
      </form>
    </section>
  );
}
