import { AppShell } from "@/components/layout/app-shell";
import Link from "next/link";

const modules = [
  "Authentication",
  "Workspaces",
  "Campaigns",
  "Templates",
  "Flyers",
  "Activations",
  "Tracking",
  "Analytics",
];

export default function HomePage() {
  return (
    <AppShell>
      <section className="hero">
        <p className="eyebrow">Foundation Ready</p>
        <h1>QR Tracking Service</h1>
        <p className="lede">
          This repository now contains the Next.js, TypeScript, Prisma, and
          PostgreSQL foundation for the product. Campaign management is the first
          end-to-end MVP feature available locally.
        </p>
        <Link className="button" href="/campaigns">
          Open campaigns
        </Link>
      </section>

      <section className="panel">
        <h2>What is included</h2>
        <ul className="list">
          <li>App Router-based Next.js structure with strict TypeScript.</li>
          <li>Prisma schema and initial migration for the documented MVP entities.</li>
          <li>Database-backed campaign list, create, detail, and edit flows.</li>
          <li>Environment, database, and local-run documentation.</li>
          <li>Reserved module boundaries for future feature tickets.</li>
        </ul>
      </section>

      <section className="panel">
        <h2>Planned Modules</h2>
        <div className="grid">
          {modules.map((moduleName) => (
            <article key={moduleName} className="moduleCard">
              <h3>{moduleName}</h3>
              <p>Placeholder module boundary prepared for future implementation.</p>
            </article>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
