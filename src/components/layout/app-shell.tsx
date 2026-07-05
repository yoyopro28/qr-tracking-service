import Link from "next/link";

type AppShellProps = {
  children: React.ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  return (
    <main className="shell">
      <header className="shellHeader">
        <div className="brand">
          <Link href="/" className="brandMark">
            QR Tracking
          </Link>
          <span className="brandName">Service MVP</span>
        </div>
        <nav className="shellNav" aria-label="Primary">
          <Link href="/" className="shellNavLink">
            Home
          </Link>
          <Link href="/campaigns" className="shellNavLink">
            Campaigns
          </Link>
          <Link href="/admin/activation" className="shellNavLink">
            Activation
          </Link>
          <Link href="/admin/locations" className="shellNavLink">
            Locations
          </Link>
          <Link href="/analytics" className="shellNavLink">
            Analytics
          </Link>
        </nav>
      </header>
      <div className="content">{children}</div>
    </main>
  );
}
