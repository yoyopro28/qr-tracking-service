import { AppShell } from "@/components/layout/app-shell";

export default function AnalyticsLoading() {
  return (
    <AppShell>
      <section className="hero">
        <p className="eyebrow">Analytics</p>
        <h1>Scan dashboard</h1>
        <p className="lede">Loading dashboard metrics and recent scan activity...</p>
      </section>

      <div className="splitLayout">
        <section className="panel skeletonBlock" aria-hidden="true" />
        <section className="panel skeletonBlock" aria-hidden="true" />
      </div>
    </AppShell>
  );
}
