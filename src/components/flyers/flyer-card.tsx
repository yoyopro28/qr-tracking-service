"use client";

import Link from "next/link";
import { useState } from "react";
import { ConfirmDeleteForm } from "@/components/common/confirm-delete-form";
import { QRCodeViewer } from "./qr-code-viewer";

type FlyerCardProps = {
  deleteAction: (formData: FormData) => Promise<void> | void;
  batch: {
    documentFlyerId: string;
    generatedAt: Date;
    physicalFlyerCount: number;
    qrCodesPerPdfPage: number;
    activatedCount: number;
    totalQrCount: number;
    templateFilename: string;
  };
  qrCodes: Array<{
    id: string;
    shortcode: string;
    trackingUrl: string;
    status: string;
  }>;
};

const flyerDateFormatter = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "UTC",
});

export function FlyerCard({ deleteAction, batch, qrCodes }: FlyerCardProps) {
  const [showQRCode, setShowQRCode] = useState(false);
  const visibleShortcodes = qrCodes.map((qrCode) => qrCode.shortcode);
  const hasMultipleQrsOnPdf = qrCodes.length > 1;
  const titleShortcode = qrCodes[0]?.shortcode ?? "Batch";

  return (
    <article className="campaignCard">
      <div className="cardTopline">
        <span className="statusBadge">batch pdf</span>
        <span className="metaText">{batch.templateFilename}</span>
      </div>
      <h3>
        {hasMultipleQrsOnPdf
          ? `${titleShortcode} · ${batch.totalQrCount} unique QRs`
          : titleShortcode}
      </h3>

      <dl className="miniDetailList">
        <div>
          <dt>Batch generated at</dt>
          <dd>{flyerDateFormatter.format(batch.generatedAt)}</dd>
        </div>
        <div>
          <dt>Batch contents</dt>
          <dd>
            {batch.physicalFlyerCount}{" "}
            {batch.physicalFlyerCount === 1 ? "PDF page" : "PDF pages"} ·{" "}
            {batch.qrCodesPerPdfPage} QR
            {batch.qrCodesPerPdfPage === 1 ? "" : "s"} per PDF page ·{" "}
            {batch.totalQrCount} unique QR{batch.totalQrCount === 1 ? "" : "s"}
          </dd>
        </div>
        <div>
          <dt>Activation</dt>
          <dd>
            {batch.activatedCount}/{batch.totalQrCount} activated
          </dd>
        </div>
        <div>
          <dt>QR IDs in this batch</dt>
          <dd className="breakValue">
            {qrCodes.map((qrCode) => (
              <span key={qrCode.id}>
                {qrCode.shortcode} ({qrCode.status.toLowerCase()})
                <br />
              </span>
            ))}
          </dd>
        </div>
        <div>
          <dt>Tracking URLs</dt>
          <dd className="breakValue">
            {qrCodes.map((qrCode) => (
              <span key={qrCode.id}>
                {hasMultipleQrsOnPdf ? `${qrCode.shortcode}: ` : ""}
                {qrCode.trackingUrl}
                <br />
              </span>
            ))}
          </dd>
        </div>
        <div>
          <dt>Activation links</dt>
          <dd>
            {qrCodes.map((qrCode) => (
              <span key={qrCode.id}>
                <Link
                  className="textLink"
                  href={`/admin/activation?shortcode=${encodeURIComponent(qrCode.shortcode)}`}
                >
                  {hasMultipleQrsOnPdf ? qrCode.shortcode : "Open admin activation"}
                </Link>
                <br />
              </span>
            ))}
          </dd>
        </div>
      </dl>

      <div className="cardActions">
        <a
          className="textLink"
          href={`/api/flyers/${batch.documentFlyerId}/document`}
          target="_blank"
          rel="noreferrer"
        >
          Open batch PDF
        </a>
        <Link className="textLink" href="/admin/activation/scan">
          Scan printed QR to activate
        </Link>
        <ConfirmDeleteForm
          action={deleteAction}
          confirmMessage={`Delete batch ${visibleShortcodes.join(", ")} and its activation/scan history?`}
          label="Delete batch"
        />
      </div>

      <div style={{ marginTop: "16px", paddingTop: "16px", borderTop: "1px solid #e5e5e5" }}>
        <button
          className="textLink"
          type="button"
          onClick={() => setShowQRCode(!showQRCode)}
          style={{ cursor: "pointer", background: "none", border: "none", padding: 0 }}
        >
          {showQRCode ? "Hide" : "Show"} printed QR{hasMultipleQrsOnPdf ? "s" : ""}
        </button>

        {showQRCode && (
          <div
            style={{
              display: "grid",
              gap: "16px",
              marginTop: "16px",
              padding: "16px",
              backgroundColor: "#f9f9f9",
              borderRadius: "8px",
            }}
          >
            {qrCodes.map((qrCode) => (
              <QRCodeViewer
                key={qrCode.id}
                shortcode={qrCode.shortcode}
                trackingUrl={qrCode.trackingUrl}
                size="medium"
                enableDownload={true}
              />
            ))}
          </div>
        )}
      </div>
    </article>
  );
}
