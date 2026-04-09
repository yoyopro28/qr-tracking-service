"use client";

import { AppShell } from "@/components/layout/app-shell";

export default function AnalyticsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <AppShell>
      <section className="panel">
        <div className="errorState">
          <p className="eyebrow">Analytics</p>
          <h1>Analytics unavailable</h1>
          <p className="sectionCopy">
            The scan dashboard could not be loaded right now.
          </p>
          <p className="errorDetail">{error.message}</p>
          <button className="button" type="button" onClick={reset}>
            Try again
          </button>
        </div>
      </section>
    </AppShell>
  );
}
