import { NavLink } from "react-router-dom";
import type { Workspace } from "../../domain/models";

const navigation = [
  ["/campaigns", "Kampagnen"],
  ["/templates", "Vorlagen"],
  ["/generate", "Flyer erzeugen"],
  ["/locations", "Standorte"],
  ["/activation", "Aktivierung"],
  ["/analytics", "Analytics"],
] as const;

export function AppShell({
  children,
  workspaces,
  workspaceId,
  email,
  onWorkspaceChange,
  onSignOut,
}: {
  children: React.ReactNode;
  workspaces: Workspace[];
  workspaceId: string;
  email: string | null;
  onWorkspaceChange: (workspaceId: string) => void;
  onSignOut: () => void;
}) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <NavLink className="brand" to="/campaigns" aria-label="QR Tracking Startseite">
          <span className="brand-mark" aria-hidden="true">Q</span>
          <span><strong>QR Tracking</strong><small>Campaign Operations</small></span>
        </NavLink>
        <nav aria-label="Hauptnavigation">
          {navigation.map(([to, label]) => (
            <NavLink key={to} to={to} className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>{label}</NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <label>
            <span>Workspace</span>
            <select value={workspaceId} onChange={(event) => onWorkspaceChange(event.target.value)}>
              {workspaces.map((workspace) => <option key={workspace.id} value={workspace.id}>{workspace.name}</option>)}
            </select>
          </label>
          {email && <small className="signed-in-as">{email}</small>}
          <button type="button" className="button secondary inverse" onClick={onSignOut}>Abmelden</button>
        </div>
      </aside>
      <main className="main-content">{children}</main>
    </div>
  );
}
