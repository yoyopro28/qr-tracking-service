"use client";

import { AppShell } from "@/components/layout/app-shell";

export default function CampaignDetailError({
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
          <p className="eyebrow">Campaign Detail</p>
          <h1>Campaign detail is unavailable</h1>
          <p className="sectionCopy">
            The campaign could not be loaded right now.
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
