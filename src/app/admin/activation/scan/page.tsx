import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { ActivationQrScanner } from "@/components/activations/activation-qr-scanner";
import { AppShell } from "@/components/layout/app-shell";

export default function AdminActivationScanPage() {
  noStore();

  return (
    <AppShell>
      <section className="hero">
        <p className="eyebrow">Admin Activation</p>
        <h1>Scan flyer QR</h1>
        <p className="lede">
          Use this mobile scanner when placing a flyer. It decodes the QR code locally,
          then opens the activation form without creating a public scan event.
        </p>
        <div className="heroActions">
          <Link className="button button--secondary" href="/admin/activation">
            Manual entry
          </Link>
        </div>
      </section>

      <ActivationQrScanner />
    </AppShell>
  );
}
