import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";

export default function CampaignNotFound() {
  return (
    <AppShell>
      <section className="panel">
        <div className="emptyState">
          <p className="eyebrow">Campaign Detail</p>
          <h1>Campaign not found</h1>
          <p>
            The requested campaign does not exist in the demo workspace, or it was
            removed.
          </p>
          <Link className="textLink" href="/campaigns">
            Return to campaign list
          </Link>
        </div>
      </section>
    </AppShell>
  );
}
