import { AppShell } from "@/components/layout/app-shell";

export default function AdminActivationLoading() {
  return (
    <AppShell>
      <section className="hero">
        <p className="eyebrow">Admin Activation</p>
        <h1>Activate flyers</h1>
        <p className="lede">Loading the scanner-ready activation workflow...</p>
      </section>

      <div className="splitLayout">
        <section className="panel skeletonBlock" aria-hidden="true" />
        <section className="panel skeletonBlock" aria-hidden="true" />
      </div>
    </AppShell>
  );
}
