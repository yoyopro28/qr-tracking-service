"use client";

import Link from "next/link";
import { useState } from "react";
import { ConfirmDeleteForm } from "@/components/common/confirm-delete-form";
import { QRCodeViewer } from "./qr-code-viewer";

type FlyerCardProps = {
  deleteAction: (formData: FormData) => Promise<void> | void;
  sheetShortcodes?: string[];
  flyer: {
    id: string;
    shortcode: string;
    trackingUrl: string;
    generatedPdfStorageKey: string | null;
    status: string;
    generatedAt: Date | null;
    createdAt: Date;
    template: {
      originalFilename: string;
    };
  };
};

const flyerDateFormatter = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "UTC",
});

export function FlyerCard({ deleteAction, flyer, sheetShortcodes }: FlyerCardProps) {
  const [showQRCode, setShowQRCode] = useState(false);
  const visibleSheetShortcodes =
    sheetShortcodes && sheetShortcodes.length > 0 ? sheetShortcodes : [flyer.shortcode];
  const hasMultipleQrsOnPdf = visibleSheetShortcodes.length > 1;

  return (
    <article className="campaignCard">
      <div className="cardTopline">
        <span className="statusBadge">{flyer.status.toLowerCase()}</span>
        <span className="metaText">{flyer.template.originalFilename}</span>
      </div>
      <h3>{hasMultipleQrsOnPdf ? visibleSheetShortcodes.join(" · ") : flyer.shortcode}</h3>

      <dl className="miniDetailList">
        <div>
          <dt>{hasMultipleQrsOnPdf ? "QR IDs on PDF" : "QR ID"}</dt>
          <dd className="breakValue">{visibleSheetShortcodes.join(", ")}</dd>
        </div>
        <div>
          <dt>{hasMultipleQrsOnPdf ? "This card tracking URL" : "Tracking URL"}</dt>
          <dd className="breakValue">{flyer.trackingUrl}</dd>
        </div>
        <div>
          <dt>Generated</dt>
          <dd>{flyerDateFormatter.format(flyer.generatedAt ?? flyer.createdAt)}</dd>
        </div>
        <div>
          <dt>Flyer ID</dt>
          <dd className="breakValue">{flyer.id}</dd>
        </div>
        <div>
          <dt>Activation</dt>
          <dd>
            <Link
              className="textLink"
              href={`/admin/activation?shortcode=${encodeURIComponent(flyer.shortcode)}`}
            >
              Open admin activation
            </Link>
          </dd>
        </div>
      </dl>

      <div className="cardActions">
        {flyer.generatedPdfStorageKey ? (
          <a
            className="textLink"
            href={`/api/flyers/${flyer.id}/document`}
            target="_blank"
            rel="noreferrer"
          >
            Open generated PDF
          </a>
        ) : null}
        <Link className="textLink" href="/admin/activation/scan">
          Scan printed QR to activate
        </Link>
        <ConfirmDeleteForm
          action={deleteAction}
          confirmMessage={`Delete flyer ${flyer.shortcode} and its activation/scan history?`}
          label="Delete flyer"
        />
      </div>

      <div style={{ marginTop: "16px", paddingTop: "16px", borderTop: "1px solid #e5e5e5" }}>
        <button
          className="textLink"
          type="button"
          onClick={() => setShowQRCode(!showQRCode)}
          style={{ cursor: "pointer", background: "none", border: "none", padding: 0 }}
        >
          {showQRCode ? "Hide" : "Show"} printed QR
        </button>

        {showQRCode && (
          <div style={{ marginTop: "16px", padding: "16px", backgroundColor: "#f9f9f9", borderRadius: "8px" }}>
            <QRCodeViewer
              shortcode={flyer.shortcode}
              trackingUrl={flyer.trackingUrl}
              size="medium"
              enableDownload={true}
            />
          </div>
        )}
      </div>
    </article>
  );
}
