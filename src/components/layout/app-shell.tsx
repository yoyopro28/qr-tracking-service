type AppShellProps = {
  children: React.ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  return (
    <main className="shell">
      <header className="shellHeader">
        <div className="brand">
          <span className="brandMark">QR Tracking</span>
          <span className="brandName">Service Foundation</span>
        </div>
        <div className="shellMeta">Next.js + TypeScript + Prisma + PostgreSQL</div>
      </header>
      <div className="content">{children}</div>
    </main>
  );
}
