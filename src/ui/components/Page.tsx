export function PageHeader({ eyebrow, title, description, actions }: { eyebrow: string; title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <header className="page-header">
      <div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1>{description && <p className="lede">{description}</p>}</div>
      {actions && <div className="page-actions">{actions}</div>}
    </header>
  );
}

export function LoadingState({ label = "Daten werden geladen…" }: { label?: string }) {
  return <section className="panel state-card" aria-live="polite"><span className="spinner" aria-hidden="true" /><p>{label}</p></section>;
}

export function EmptyState({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="empty-state"><h2>{title}</h2><p>{children}</p></section>;
}

export function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return <div className="alert error" role="alert"><span>{message}</span>{onRetry && <button type="button" className="text-button" onClick={onRetry}>Erneut versuchen</button>}</div>;
}

export function Notice({ children }: { children: React.ReactNode }) {
  return <div className="alert success" role="status">{children}</div>;
}

export function ConfirmButton({ label, confirmText, onConfirm, disabled }: { label: string; confirmText: string; onConfirm: () => Promise<void> | void; disabled?: boolean }) {
  return <button type="button" className="text-button danger" disabled={disabled} onClick={() => { if (window.confirm(confirmText)) void onConfirm(); }}>{label}</button>;
}
