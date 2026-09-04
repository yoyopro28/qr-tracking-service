import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import type { Campaign, FlyerBatch, Template } from "../../domain/models";
import { generateFlyerPdf } from "../../infrastructure/browser/generate-pdf";
import { browserConfig } from "../../lib/env";
import { sha256Hex } from "../../infrastructure/supabase/storage-provider";
import { EmptyState, ErrorBanner, Notice, PageHeader } from "../components/Page";
import { errorMessage, qrRepository, storageProvider } from "../services";

export function GeneratePage({ workspaceId }: { workspaceId: string }) {
  const [searchParams] = useSearchParams(); const [campaigns, setCampaigns] = useState<Campaign[]>([]); const [campaignId, setCampaignId] = useState(searchParams.get("campaign") ?? ""); const [templates, setTemplates] = useState<Template[]>([]); const [templateId, setTemplateId] = useState(""); const [sheetCount, setSheetCount] = useState(1); const [busy, setBusy] = useState(false); const [progress, setProgress] = useState(0); const [message, setMessage] = useState(""); const [error, setError] = useState(""); const [batch, setBatch] = useState<FlyerBatch>(); const [download, setDownload] = useState("");
  useEffect(() => { void qrRepository.listCampaigns(workspaceId).then((items) => { const active = items.filter((item) => item.status === "ACTIVE"); setCampaigns(active); setCampaignId((current) => current || active[0]?.id || ""); }).catch((cause) => setError(errorMessage(cause))); }, [workspaceId]);
  useEffect(() => { if (!campaignId) { setTemplates([]); setTemplateId(""); return; } void qrRepository.listTemplates(workspaceId, campaignId).then((items) => { setTemplates(items); setTemplateId(items[0]?.id ?? ""); }).catch((cause) => setError(errorMessage(cause))); }, [campaignId, workspaceId]);
  const template = useMemo(() => templates.find((item) => item.id === templateId), [templateId, templates]);

  async function generate(event: FormEvent) {
    event.preventDefault(); if (!template) return; setBusy(true); setError(""); setMessage("Batch und Shortcodes werden reserviert…"); setDownload(""); setBatch(undefined); setProgress(0);
    try {
      const reserved = await qrRepository.reserveFlyerBatch({ workspaceId, campaignId, templateId, sheetCount, trackingOrigin: browserConfig.trackingOrigin });
      const templateUrl = await storageProvider.createDownloadUrl("templates", template.storagePath);
      const bytes = await generateFlyerPdf({ templateUrl, sheetCount, placements: template.placements, flyers: reserved.flyers }, (done, total) => { setProgress(done / total * 100); setMessage(`PDF wird lokal erzeugt: ${done}/${total} Blätter`); });
      setMessage("PDF wird verschlüsselt zu Supabase Storage übertragen…"); const hash = await sha256Hex(bytes);
      await storageProvider.uploadGeneratedBatch({ path: reserved.storagePath, bytes, sha256: hash });
      let current = await qrRepository.finalizeFlyerBatch({ batchId: reserved.id, storagePath: reserved.storagePath, sha256: hash, fileSizeBytes: bytes.byteLength }); setBatch(current); setMessage("Redirects werden nach Cloudflare KV synchronisiert…");
      for (let attempt = 0; attempt < 30 && current.cacheStatus !== "SYNCED" && current.cacheStatus !== "ERROR"; attempt += 1) { await new Promise((resolve) => window.setTimeout(resolve, 2000)); current = await qrRepository.getFlyerBatch(reserved.id); setBatch(current); }
      if (current.cacheStatus === "SYNCED") { setDownload(await storageProvider.createDownloadUrl("generated-flyers", reserved.storagePath)); setMessage("Alle Redirect-Schreibvorgänge wurden akzeptiert. Der Batch ist druckbereit."); }
      else if (current.cacheStatus === "ERROR") throw new Error("Der KV-Sync ist fehlgeschlagen. Der Batch bleibt gespeichert und kann nach Reconciliation erneut synchronisiert werden.");
      else throw new Error("Der KV-Sync dauert länger als erwartet. Öffne die Kampagnendetails, um den Status später erneut zu prüfen.");
    } catch (cause) { setError(errorMessage(cause)); } finally { setBusy(false); }
  }

  return <><PageHeader eyebrow="Print Pipeline" title="Flyer erzeugen" description="Die PDF-Erzeugung läuft lokal im Browser. Erst ein bestätigter KV-Write gibt den Download frei." />{error && <ErrorBanner message={error} />}{message && <Notice>{message}</Notice>}<section className="panel">{campaigns.length === 0 ? <EmptyState title="Keine aktive Kampagne">Aktiviere zunächst eine Kampagne.</EmptyState> : <form onSubmit={generate}><div className="form-grid three"><label>Kampagne<select value={campaignId} onChange={(event) => setCampaignId(event.target.value)}>{campaigns.map((campaign) => <option value={campaign.id} key={campaign.id}>{campaign.name}</option>)}</select></label><label>Vorlage<select value={templateId} onChange={(event) => setTemplateId(event.target.value)}>{templates.map((item) => <option value={item.id} key={item.id}>{item.originalFilename}</option>)}</select></label><label>Blätter<input type="number" min={1} max={250} value={sheetCount} onChange={(event) => setSheetCount(Number(event.target.value))} /></label></div>{template ? <div className="file-summary"><strong>{template.originalFilename}</strong><span>{template.placements.length} Flyer pro Blatt · insgesamt {template.placements.length * sheetCount} Flyer</span></div> : <EmptyState title="Keine Vorlage">Lade für diese Kampagne zuerst eine PDF-Vorlage hoch.</EmptyState>}{busy && <div className="progress" aria-label={`${Math.round(progress)} Prozent`}><span style={{ width: `${Math.max(4, progress)}%` }} /></div>}<button className="button" disabled={busy || !template}>{busy ? "Verarbeitung läuft…" : "Batch reservieren und PDF erzeugen"}</button></form>}{batch && <dl className="result-grid"><div><dt>Batch</dt><dd><code>{batch.id}</code></dd></div><div><dt>Flyer</dt><dd>{batch.physicalFlyerCount}</dd></div><div><dt>Status</dt><dd><span className={`status ${batch.status.toLowerCase()}`}>{batch.status}</span></dd></div><div><dt>KV</dt><dd><span className={`status ${batch.cacheStatus.toLowerCase()}`}>{batch.cacheStatus}</span></dd></div></dl>}{download && <p><a className="button-link" href={download}>Druckfertiges PDF herunterladen</a></p>}{campaignId && <p><Link className="text-link" to={`/campaigns/${campaignId}`}>Zur Batch- und Flyerhistorie</Link></p>}</section></>;
}
