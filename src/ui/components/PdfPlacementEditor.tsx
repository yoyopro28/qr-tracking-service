import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { getDocument, type PDFDocumentProxy, type RenderTask } from "../../infrastructure/browser/pdf-preview";

export type PlacementDraft = {
  pageNumber: number;
  x: number;
  y: number;
  width: number;
  height: number;
  shortTextEnabled: boolean;
  shortTextOffsetX: number;
  shortTextOffsetY: number;
};

type Metrics = { pageCount: number; width: number; height: number };

function CanvasPage({ pdf, pageNumber, onMetrics }: { pdf: PDFDocumentProxy; pageNumber: number; onMetrics: (width: number, height: number) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let task: RenderTask | undefined;
    let cancelled = false;
    void pdf.getPage(pageNumber).then((page) => {
      if (cancelled || !canvasRef.current) return;
      const base = page.getViewport({ scale: 1 });
      const scale = Math.min(2, Math.max(1, 960 / base.width));
      const viewport = page.getViewport({ scale });
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");
      if (!context) return;
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      onMetrics(base.width, base.height);
      task = page.render({ canvas, canvasContext: context, viewport });
      return task.promise;
    }).catch((error) => { if (!cancelled && error?.name !== "RenderingCancelledException") console.error(error); });
    return () => { cancelled = true; task?.cancel(); };
  }, [onMetrics, pageNumber, pdf]);
  return <canvas ref={canvasRef} className="pdf-canvas" />;
}

export function PdfPlacementEditor({ file, metadata, placements, onChange }: { file: File; metadata: Metrics; placements: PlacementDraft[]; onChange: (placements: PlacementDraft[]) => void }) {
  const [pdf, setPdf] = useState<PDFDocumentProxy>();
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState({ width: metadata.width, height: metadata.height });
  const [selected, setSelected] = useState(0);
  const stageRef = useRef<HTMLDivElement>(null);
  const startRef = useRef<{ x: number; y: number } | undefined>(undefined);

  useEffect(() => {
    let current: PDFDocumentProxy | undefined;
    let cancelled = false;
    void file.arrayBuffer().then((bytes) => getDocument({ data: new Uint8Array(bytes) }).promise).then((document) => {
      current = document;
      if (!cancelled) setPdf(document);
    });
    return () => { cancelled = true; if (current) void current.cleanup(); };
  }, [file]);

  const update = useCallback((index: number, values: Partial<PlacementDraft>) => {
    onChange(placements.map((placement, itemIndex) => itemIndex === index ? { ...placement, ...values } : placement));
  }, [onChange, placements]);
  const updatePageSize = useCallback((width: number, height: number) => setPageSize({ width, height }), []);

  function point(event: ReactPointerEvent) {
    const rect = stageRef.current!.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(pageSize.width, (event.clientX - rect.left) / rect.width * pageSize.width)),
      y: Math.max(0, Math.min(pageSize.height, (event.clientY - rect.top) / rect.height * pageSize.height)),
    };
  }

  function pointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if ((event.target as HTMLElement).closest(".placement-box")) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const start = point(event);
    startRef.current = start;
    update(selected, { pageNumber, x: start.x, y: start.y, width: 1, height: 1 });
  }

  function pointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!startRef.current) return;
    const end = point(event); const start = startRef.current;
    const size = Math.min(Math.abs(end.x - start.x), Math.abs(end.y - start.y));
    update(selected, { pageNumber, x: Math.min(start.x, end.x), y: Math.min(start.y, end.y), width: size, height: size });
  }

  function addPlacement() {
    const size = Math.min(100, pageSize.width / 4);
    onChange([...placements, { pageNumber, x: 24, y: 24, width: size, height: size, shortTextEnabled: true, shortTextOffsetX: 0, shortTextOffsetY: 0 }]);
    setSelected(placements.length);
  }

  const visible = placements.map((placement, index) => ({ placement, index })).filter(({ placement }) => placement.pageNumber === pageNumber);
  return (
    <section className="placement-editor">
      <header className="section-header"><div><h3>QR-Flächen platzieren</h3><p>Wähle eine Fläche und ziehe ein Quadrat direkt auf der PDF-Seite auf.</p></div><div className="actions"><button type="button" className="button secondary" onClick={addPlacement}>QR-Fläche hinzufügen</button></div></header>
      <div className="placement-toolbar">
        <label>Seite<select value={pageNumber} onChange={(event) => setPageNumber(Number(event.target.value))}>{Array.from({ length: metadata.pageCount }, (_, index) => <option key={index + 1} value={index + 1}>{index + 1} / {metadata.pageCount}</option>)}</select></label>
        <div className="placement-tabs">{placements.map((_, index) => <button type="button" key={index} className={selected === index ? "chip active" : "chip"} onClick={() => { setSelected(index); setPageNumber(placements[index].pageNumber); }}>QR {index + 1}</button>)}</div>
      </div>
      <div className="placement-layout">
        <div className="pdf-stage" style={{ aspectRatio: `${pageSize.width}/${pageSize.height}` }}>
          {pdf && <CanvasPage pdf={pdf} pageNumber={pageNumber} onMetrics={updatePageSize} />}
          <div ref={stageRef} className="placement-overlay" onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={() => { startRef.current = undefined; }}>
            {visible.map(({ placement, index }) => <button type="button" key={index} className={selected === index ? "placement-box active" : "placement-box"} style={{ left: `${placement.x / pageSize.width * 100}%`, top: `${placement.y / pageSize.height * 100}%`, width: `${placement.width / pageSize.width * 100}%`, height: `${placement.height / pageSize.height * 100}%` }} onPointerDown={(event) => { event.stopPropagation(); setSelected(index); }}><span>QR {index + 1}</span></button>)}
          </div>
        </div>
        <fieldset className="placement-fields"><legend>QR {selected + 1}</legend>{(["pageNumber", "x", "y", "width", "height"] as const).map((field) => <label key={field}>{({ pageNumber: "Seite", x: "X", y: "Y", width: "Breite", height: "Höhe" })[field]}<input type="number" min={field === "pageNumber" ? 1 : 0} max={field === "pageNumber" ? metadata.pageCount : undefined} step={field === "pageNumber" ? 1 : 0.1} value={Math.round(placements[selected][field] * 100) / 100} onChange={(event) => update(selected, { [field]: Number(event.target.value) })} /></label>)}<label className="check-row"><input type="checkbox" checked={placements[selected].shortTextEnabled} onChange={(event) => update(selected, { shortTextEnabled: event.target.checked })} /> Shortcode unter dem QR-Code drucken</label>{placements.length > 1 && <button type="button" className="text-button danger" onClick={() => { const next = placements.filter((_, index) => index !== selected); onChange(next); setSelected(Math.max(0, selected - 1)); }}>Fläche entfernen</button>}</fieldset>
      </div>
    </section>
  );
}
