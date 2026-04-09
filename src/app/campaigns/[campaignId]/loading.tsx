import { AppShell } from "@/components/layout/app-shell";

export default function CampaignDetailLoading() {
  return (
    <AppShell>
      <section className="hero">
        <p className="eyebrow">Campaign Detail</p>
        <h1>Loading campaign</h1>
        <p className="lede">Fetching the campaign record and edit form...</p>
      </section>

      <div className="splitLayout">
        <section className="panel skeletonBlock" aria-hidden="true" />
        <section className="panel skeletonBlock" aria-hidden="true" />
      </div>
    </AppShell>
  );
}
