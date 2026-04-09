"use client";

import { AppShell } from "@/components/layout/app-shell";

export default function AdminActivationError({
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
          <p className="eyebrow">Admin Activation</p>
          <h1>Activation page unavailable</h1>
          <p className="sectionCopy">
            The admin activation flow could not be loaded right now.
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
