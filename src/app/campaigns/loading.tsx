import { AppShell } from "@/components/layout/app-shell";

export default function CampaignListLoading() {
  return (
    <AppShell>
      <section className="hero">
        <p className="eyebrow">Campaign Management</p>
        <h1>Campaigns</h1>
        <p className="lede">Loading the demo workspace and its campaigns...</p>
      </section>

      <div className="splitLayout">
        <section className="panel skeletonBlock" aria-hidden="true" />
        <section className="panel skeletonBlock" aria-hidden="true" />
      </div>
    </AppShell>
  );
}
