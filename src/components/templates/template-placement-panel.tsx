"use client";

import type { PointerEvent as ReactPointerEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { TemplateActionState } from "@/app/campaigns/[campaignId]/template-actions";
import { PdfPlacementCanvas } from "./pdf-placement-canvas";

type PlacementValues = TemplateActionState["values"];
type PlacementDraft = {
  id: string;
  pageNumber: string;
  x: string;
  y: string;
  width: string;
  height: string;
};

function formatPlacementValue(value: number) {
  return value.toFixed(2).replace(/\.00$/, "");
}

function createEmptyPlacement(index: number, pageNumber: number): PlacementDraft {
  return {
    id: `qr-${index + 1}`,
    pageNumber: String(pageNumber),
    x: "",
    y: "",
    width: "",
    height: "",
  };
}

function parsePlacementDrafts(values: PlacementValues, fallbackPageNumber: number) {
  const rawPlacements = values.qrPlacements.trim();

  if (rawPlacements) {
    try {
      const parsed = JSON.parse(rawPlacements) as unknown;

      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((placement, index) => {
          const rawPlacement =
            placement && typeof placement === "object"
              ? (placement as Record<string, unknown>)
              : {};

          return {
            id:
              typeof rawPlacement.id === "string" && rawPlacement.id.trim()
                ? rawPlacement.id.trim()
                : `qr-${index + 1}`,
            pageNumber: String(rawPlacement.pageNumber ?? fallbackPageNumber),
            x: String(rawPlacement.x ?? ""),
            y: String(rawPlacement.y ?? ""),
            width: String(rawPlacement.width ?? ""),
            height: String(rawPlacement.height ?? ""),
          };
        });
      }
    } catch {
      // Fall back to the legacy single-placement fields below.
    }
  }

  if (values.qrX || values.qrY || values.qrWidth || values.qrHeight) {
    return [
      {
        id: "qr-1",
        pageNumber: values.qrPageNumber || String(fallbackPageNumber),
        x: values.qrX,
        y: values.qrY,
        width: values.qrWidth,
        height: values.qrHeight,
      },
    ];
  }

  return [createEmptyPlacement(0, fallbackPageNumber)];
}

function serializePlacementDrafts(placements: PlacementDraft[]) {
  return JSON.stringify(
    placements.map((placement, index) => ({
      id: placement.id,
      order: index,
      pageNumber: placement.pageNumber,
      x: placement.x,
      y: placement.y,
      width: placement.width,
      height: placement.height,
    })),
  );
}

function buildPlacementValueUpdate(placements: PlacementDraft[]): Partial<PlacementValues> {
  const firstPlacement = placements[0] ?? createEmptyPlacement(0, 1);

  return {
    qrPageNumber: firstPlacement.pageNumber,
    qrX: firstPlacement.x,
    qrY: firstPlacement.y,
    qrWidth: firstPlacement.width,
    qrHeight: firstPlacement.height,
    qrPlacements: serializePlacementDrafts(placements),
  };
}

function getPlacementStyle(
  placement: PlacementDraft,
  effectivePageWidth: number,
  effectivePageHeight: number,
) {
  const x = Number(placement.x || 0);
  const y = Number(placement.y || 0);
  const width = Number(placement.width || 0);
  const height = Number(placement.height || 0);

  return {
    left: `${(x / effectivePageWidth) * 100}%`,
    top: `${(y / effectivePageHeight) * 100}%`,
    width: `${(width / effectivePageWidth) * 100}%`,
    height: `${(height / effectivePageHeight) * 100}%`,
  };
}

export function TemplatePlacementPanel({
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
  const [selectedPlacementId, setSelectedPlacementId] = useState("qr-1");
  const [renderedPageMetrics, setRenderedPageMetrics] = useState<{
    width: number;
    height: number;
  } | null>(null);

  const effectivePageWidth = renderedPageMetrics?.width ?? pageWidth;
  const effectivePageHeight = renderedPageMetrics?.height ?? pageHeight;
  const placements = useMemo(
    () => parsePlacementDrafts(values, pageNumber),
    [pageNumber, values],
  );
  const selectedPlacement =
    placements.find((placement) => placement.id === selectedPlacementId) ??
    placements[0] ??
    createEmptyPlacement(0, pageNumber);
  const selectedPlacementNumber = placements.findIndex(
    (placement) => placement.id === selectedPlacement.id,
  ) + 1;

  const commitPlacements = useCallback((nextPlacements: PlacementDraft[]) => {
    onPlacementChange(buildPlacementValueUpdate(nextPlacements));
  }, [onPlacementChange]);

  const updateSelectedPlacement = useCallback((nextValues: Partial<PlacementDraft>) => {
    commitPlacements(
      placements.map((placement) =>
        placement.id === selectedPlacement.id
          ? {
              ...placement,
              ...nextValues,
            }
          : placement,
      ),
    );
  }, [commitPlacements, placements, selectedPlacement.id]);

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

      updateSelectedPlacement({
        pageNumber: String(pageNumber),
        x: formatPlacementValue((nextX / rect.width) * effectivePageWidth),
        y: formatPlacementValue((nextY / rect.height) * effectivePageHeight),
        width: formatPlacementValue((nextWidth / rect.width) * effectivePageWidth),
        height: formatPlacementValue((nextHeight / rect.height) * effectivePageHeight),
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
  }, [effectivePageHeight, effectivePageWidth, pageNumber, updateSelectedPlacement]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!placements.some((placement) => placement.id === selectedPlacementId)) {
      setSelectedPlacementId(placements[0]?.id ?? "qr-1");
    }
  }, [placements, selectedPlacementId]);

  useEffect(() => {
    if (!documentSrc) {
      setIsOpen(false);
    }
  }, [documentSrc]);

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

    updateSelectedPlacement({
      pageNumber: String(pageNumber),
      x: formatPlacementValue((startX / rect.width) * effectivePageWidth),
      y: formatPlacementValue((startY / rect.height) * effectivePageHeight),
      width: "0",
      height: "0",
    });
  }

  function handleAddPlacement() {
    const nextPlacement = createEmptyPlacement(placements.length, pageNumber);

    nextPlacement.id = `qr-${Date.now()}`;
    setSelectedPlacementId(nextPlacement.id);
    commitPlacements([...placements, nextPlacement]);
  }

  function handleClearSelectedPlacement() {
    if (placements.length > 1) {
      const nextPlacements = placements.filter(
        (placement) => placement.id !== selectedPlacement.id,
      );

      setSelectedPlacementId(nextPlacements[0]?.id ?? "qr-1");
      commitPlacements(nextPlacements);
      return;
    }

    updateSelectedPlacement({
      x: "",
      y: "",
      width: "",
      height: "",
    });
  }

  return (
    <div className="placementPanel">
      <div className="placementPanelHeader">
        <div>
          <h3>QR placement panel</h3>
          <p className="sectionCopy">
            Open the large preview and draw one or more square QR areas directly on the page.
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
            {placements.length} {placements.length === 1 ? "placeholder" : "placeholders"}
          </span>
          <span>
            Active: QR {selectedPlacementNumber}, x {selectedPlacement.x || "-"}, y{" "}
            {selectedPlacement.y || "-"}
          </span>
        </div>
        <button type="button" className="button" disabled={!documentSrc} onClick={() => setIsOpen(true)}>
          Open large placement view
        </button>
      </div>

      {!documentSrc ? (
        <div className="emptyState">
          <h3>No PDF selected yet</h3>
          <p>Choose a template PDF above to unlock the large placement window.</p>
        </div>
      ) : null}

      {documentSrc && isOpen && isMounted
        ? createPortal(
            <div className="placementModal" role="dialog" aria-modal="true" aria-labelledby="placement-title">
              <div className="placementModalBackdrop" onClick={() => setIsOpen(false)} />
              <div className="placementModalContent">
                <div className="placementModalBody">
                  <section className="placementWorkspace">
                    <header className="placementWorkspaceHeader">
                      <div>
                        <p className="eyebrow placementEyebrow">QR Placement Workspace</p>
                        <h3 id="placement-title">Draw QR squares on the PDF</h3>
                        <p className="sectionCopy">
                          Add a placeholder for each printed flyer area, then drag to place the
                          active square.
                        </p>
                      </div>
                    </header>

                    <div className="placementWorkspaceCanvas">
                      <div
                        className="placementViewer"
                        style={{ aspectRatio: `${effectivePageWidth} / ${effectivePageHeight}` }}
                      >
                        <PdfPlacementCanvas
                          documentSrc={documentSrc}
                          pageNumber={pageNumber}
                          onPageMetrics={setRenderedPageMetrics}
                        />
                        <div
                          ref={stageRef}
                          className="placementOverlay"
                          onPointerDown={handlePointerDown}
                        >
                          {placements.some(
                            (placement) =>
                              Number(placement.width || 0) > 0 &&
                              Number(placement.height || 0) > 0,
                          ) ? (
                            placements.map((placement, index) => {
                              const width = Number(placement.width || 0);
                              const height = Number(placement.height || 0);

                              if (width <= 0 || height <= 0) {
                                return null;
                              }

                              return (
                                <div
                                  key={placement.id}
                                  className={`placementSelection placementSelection--square${
                                    placement.id === selectedPlacement.id
                                      ? " placementSelection--active"
                                      : ""
                                  }`}
                                  style={getPlacementStyle(
                                    placement,
                                    effectivePageWidth,
                                    effectivePageHeight,
                                  )}
                                  onPointerDown={(event) => {
                                    event.stopPropagation();
                                    setSelectedPlacementId(placement.id);
                                  }}
                                >
                                  <span className="placementSelectionLabel">QR {index + 1}</span>
                                </div>
                              );
                            })
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
                        <button type="button" className="button" onClick={handleAddPlacement}>
                          Add QR area
                        </button>
                        <button type="button" className="button" onClick={() => setIsOpen(false)}>
                          Done
                        </button>
                        <button
                          type="button"
                          className="button button--secondary"
                          onClick={handleClearSelectedPlacement}
                        >
                          {placements.length > 1 ? "Remove active area" : "Clear active area"}
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
                          {formatPlacementValue(effectivePageWidth)} x{" "}
                          {formatPlacementValue(effectivePageHeight)}
                        </span>
                      </div>
                    </div>

                    <div className="placementSidebarSection">
                      <p className="eyebrow placementEyebrow">Placement</p>
                      <div className="placementSidebarCard">
                        <strong>Active QR</strong>
                        <span>
                          {selectedPlacementNumber} / {placements.length}
                        </span>
                      </div>
                      <div className="placementSidebarCard">
                        <strong>X / Y</strong>
                        <span>
                          {selectedPlacement.x || "-"} / {selectedPlacement.y || "-"}
                        </span>
                      </div>
                      <div className="placementSidebarCard">
                        <strong>Square</strong>
                        <span>{selectedPlacement.width || selectedPlacement.height || "-"}</span>
                      </div>
                      <div className="placementSidebarCard">
                        <strong>Mode</strong>
                        <span>Square only</span>
                      </div>
                      <div className="placementList" aria-label="QR placeholders">
                        {placements.map((placement, index) => {
                          const isComplete =
                            Number(placement.width || 0) > 0 && Number(placement.height || 0) > 0;

                          return (
                            <button
                              key={placement.id}
                              type="button"
                              className={`placementListButton${
                                placement.id === selectedPlacement.id
                                  ? " placementListButton--active"
                                  : ""
                              }`}
                              onClick={() => setSelectedPlacementId(placement.id)}
                            >
                              <span>QR {index + 1}</span>
                              <span>{isComplete ? "Placed" : "Empty"}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="placementSidebarSection">
                      <p className="eyebrow placementEyebrow">Hints</p>
                      <p className="sectionCopy placementSidebarCopy">
                        Use scrolling in the left canvas to inspect the document closely. The right rail
                        stays available for dimensions and actions while you work.
                      </p>
                    </div>

                    <div className="placementSidebarSection">
                      <div className="placementSidebarCard">
                        <strong>Quick summary</strong>
                        <span>
                          {placements.length} QR {placements.length === 1 ? "area" : "areas"}
                        </span>
                      </div>
                    </div>
                  </aside>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
