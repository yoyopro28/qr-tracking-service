import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import type { Campaign, Template } from "../../domain/models";
import { IndexedDbFileCache } from "../../infrastructure/browser/indexed-db-file-cache";
import { readPdfMetadata } from "../../infrastructure/browser/pdf-preview";
import { sha256Hex } from "../../infrastructure/supabase/storage-provider";
import { ConfirmButton, EmptyState, ErrorBanner, LoadingState, Notice, PageHeader } from "../components/Page";
import { PdfPlacementEditor, type PlacementDraft } from "../components/PdfPlacementEditor";
import { errorMessage, qrRepository, storageProvider } from "../services";

const fileCache = new IndexedDbFileCache();

export function TemplatesPage({ workspaceId }: { workspaceId: string }) {
  const [searchParams] = useSearchParams(); const [campaigns, setCampaigns] = useState<Campaign[]>([]); const [templates, setTemplates] = useState<Template[]>([]); const [campaignId, setCampaignId] = useState(searchParams.get("campaign") ?? ""); const [file, setFile] = useState<File>(); const [metadata, setMetadata] = useState<{ pageCount: number; width: number; height: number }>(); const [placements, setPlacements] = useState<PlacementDraft[]>([]); const [busy, setBusy] = useState(false); const [loading, setLoading] = useState(true); const [error, setError] = useState(""); const [notice, setNotice] = useState(""); const [preview, setPreview] = useState<{ id: string; url: string }>();
  const load = useCallback(async () => { setLoading(true); try { const [campaignValues, templateValues] = await Promise.all([qrRepository.listCampaigns(workspaceId), qrRepository.listTemplates(workspaceId)]); setCampaigns(campaignValues); setTemplates(templateValues); setCampaignId((current) => current || campaignValues.find((campaign) => campaign.status !== "ARCHIVED")?.id || ""); } catch (cause) { setError(errorMessage(cause)); } finally { setLoading(false); } }, [workspaceId]);
  useEffect(() => { void load(); }, [load]);
  const activeCampaigns = useMemo(() => campaigns.filter((campaign) => campaign.status !== "ARCHIVED"), [campaigns]);

  async function choose(selected?: File) {
    setError(""); setNotice(""); setFile(undefined); setMetadata(undefined); setPlacements([]);
    if (!selected) return;
    try {
      if (selected.size > 15 * 1024 * 1024 || !(selected.type === "application/pdf" || selected.name.toLowerCase().endsWith(".pdf"))) throw new Error("Bitte eine PDF-Datei bis 15 MB wählen.");
      const value = await readPdfMetadata(selected); const size = Math.min(100, value.width / 4);
      setFile(selected); setMetadata(value); setPlacements([{ pageNumber: 1, x: value.width - size - 24, y: value.height - size - 24, width: size, height: size, shortTextEnabled: true, shortTextOffsetX: 0, shortTextOffsetY: 0 }]);
    } catch (cause) { setError(errorMessage(cause)); }
  }

  async function upload(event: FormEvent) {
    event.preventDefault(); if (!file || !metadata || !campaignId) return; setBusy(true); setError(""); setNotice("");
    try {
      if (placements.some((placement) => placement.pageNumber < 1 || placement.pageNumber > metadata.pageCount || placement.x < 0 || placement.y < 0 || placement.width < 24 || placement.height < 24 || placement.x + placement.width > metadata.width || placement.y + placement.height > metadata.height)) throw new Error("Alle QR-Flächen müssen mindestens 24 PDF-Punkte groß sein und vollständig innerhalb der Seite liegen.");
      const hash = await sha256Hex(file);
      const reserved = await qrRepository.reserveTemplate({ workspaceId, campaignId, filename: file.name, mimeType: "application/pdf", fileSizeBytes: file.size, sha256: hash, pageCount: metadata.pageCount, width: metadata.width, height: metadata.height, placements: placements.map((placement, order) => ({ ...placement, order })) });
      await storageProvider.uploadTemplate({ path: reserved.storagePath, file });
      await qrRepository.finalizeTemplate(reserved.id);
      try { await fileCache.put(hash, file); } catch { /* IndexedDB is an optional cache. */ }
      setFile(undefined); setMetadata(undefined); setPlacements([]); setNotice("Vorlage wurde privat gespeichert und ist bereit."); await load();
    } catch (cause) { setError(errorMessage(cause)); } finally { setBusy(false); }
  }

  return <><PageHeader eyebrow="Template Library" title="PDF-Vorlagen" description="Private Vorlagen hochladen und QR-Flächen visuell auf den PDF-Seiten platzieren." />{error && <ErrorBanner message={error} />}{notice && <Notice>{notice}</Notice>}<section className="panel"><h2>Neue Vorlage</h2>{activeCampaigns.length === 0 ? <EmptyState title="Aktive Kampagne erforderlich">Lege zuerst eine Kampagne an oder aktiviere einen Entwurf.</EmptyState> : <form onSubmit={upload}><div className="form-grid"><label>Kampagne<select value={campaignId} onChange={(event) => setCampaignId(event.target.value)}>{activeCampaigns.map((campaign) => <option key={campaign.id} value={campaign.id}>{campaign.name}</option>)}</select></label><label>PDF-Datei<input type="file" accept="application/pdf,.pdf" required={!file} onChange={(event) => void choose(event.target.files?.[0])} /></label></div>{file && metadata && <><div className="file-summary"><strong>{file.name}</strong><span>{metadata.pageCount} Seiten · {metadata.width.toFixed(1)} × {metadata.height.toFixed(1)} Punkte</span></div><PdfPlacementEditor file={file} metadata={metadata} placements={placements} onChange={setPlacements} /></>}<button className="button" disabled={busy || !file || placements.length === 0}>{busy ? "Upload läuft…" : "Vorlage hochladen"}</button></form>}</section><section className="panel section-block"><div className="section-header"><div><h2>Gespeicherte Vorlagen</h2><p>{templates.length} bereit</p></div></div>{loading ? <LoadingState /> : templates.length === 0 ? <EmptyState title="Noch keine Vorlagen">Die erste hochgeladene PDF erscheint hier.</EmptyState> : <div className="card-grid">{templates.map((template) => <article className="item-card" key={template.id}><div className="card-topline"><span className="status ready">{template.status}</span><time>{new Date(template.createdAt).toLocaleDateString("de-DE")}</time></div><h3>{template.originalFilename}</h3><p>{campaigns.find((campaign) => campaign.id === template.campaignId)?.name ?? "Unbekannte Kampagne"}</p><p>{template.pageCount} Seiten · {template.placements.length} QR-Flächen</p><div className="card-actions"><button type="button" className="text-button" onClick={async () => setPreview({ id: template.id, url: await storageProvider.createDownloadUrl("templates", template.storagePath) })}>PDF öffnen</button><ConfirmButton label="Archivieren" confirmText={`Vorlage „${template.originalFilename}“ archivieren?`} onConfirm={async () => { await qrRepository.archiveTemplate(workspaceId, template.id); setNotice("Vorlage wurde archiviert."); await load(); }} /></div>{preview?.id === template.id && <a href={preview.url} className="button-link" target="_blank" rel="noreferrer">Signierte Vorschau öffnen</a>}</article>)}</div>}</section></>;
}
