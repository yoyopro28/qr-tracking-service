import { lazy, Suspense, useEffect, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import type { AuthSession } from "../application/ports/auth-provider";
import type { Workspace } from "../domain/models";
import { AppShell } from "./components/AppShell";
import { ErrorBanner, LoadingState } from "./components/Page";
import { LoginPage } from "./pages/LoginPage";
import { authProvider, errorMessage, qrRepository } from "./services";

const ActivationPage = lazy(() => import("./pages/ActivationPage").then((module) => ({ default: module.ActivationPage })));
const AnalyticsPage = lazy(() => import("./pages/AnalyticsPage").then((module) => ({ default: module.AnalyticsPage })));
const CampaignDetailPage = lazy(() => import("./pages/CampaignDetailPage").then((module) => ({ default: module.CampaignDetailPage })));
const CampaignAnalyticsPage = lazy(() => import("./pages/CampaignAnalyticsPage").then((module) => ({ default: module.CampaignAnalyticsPage })));
const CampaignsPage = lazy(() => import("./pages/CampaignsPage").then((module) => ({ default: module.CampaignsPage })));
const GeneratePage = lazy(() => import("./pages/GeneratePage").then((module) => ({ default: module.GeneratePage })));
const LocationsPage = lazy(() => import("./pages/LocationsPage").then((module) => ({ default: module.LocationsPage })));
const TemplatesPage = lazy(() => import("./pages/TemplatesPage").then((module) => ({ default: module.TemplatesPage })));

export function App() {
  const [session, setSession] = useState<AuthSession | null>();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [workspaceId, setWorkspaceId] = useState(() => localStorage.getItem("qr-workspace") ?? "");
  const [error, setError] = useState("");

  useEffect(() => {
    void authProvider.getSession().then(setSession).catch((cause) => setError(errorMessage(cause)));
    return authProvider.onSessionChanged(setSession);
  }, []);

  useEffect(() => {
    if (!session) { setWorkspaces([]); return; }
    void qrRepository.listWorkspaces().then((items) => {
      setWorkspaces(items);
      setWorkspaceId((current) => items.some((item) => item.id === current) ? current : items[0]?.id ?? "");
    }).catch((cause) => setError(errorMessage(cause)));
  }, [session]);

  function chooseWorkspace(value: string) {
    localStorage.setItem("qr-workspace", value);
    setWorkspaceId(value);
  }

  if (session === undefined && !error) return <main className="boot"><LoadingState label="Sitzung wird geladen…" /></main>;
  if (!session) return <><LoginPage />{error && <div className="global-error"><ErrorBanner message={error} /></div>}</>;

  return (
    <BrowserRouter>
      <AppShell workspaces={workspaces} workspaceId={workspaceId} email={session.email} onWorkspaceChange={chooseWorkspace} onSignOut={() => void authProvider.signOut()}>
        {error && <ErrorBanner message={error} />}
        {workspaceId ? <Suspense fallback={<LoadingState label="Modul wird geladen…" />}><Routes>
          <Route path="/campaigns" element={<CampaignsPage workspaceId={workspaceId} />} />
          <Route path="/campaigns/:campaignId" element={<CampaignDetailPage workspaceId={workspaceId} />} />
          <Route path="/campaigns/:campaignId/analytics" element={<CampaignAnalyticsPage workspaceId={workspaceId} />} />
          <Route path="/templates" element={<TemplatesPage workspaceId={workspaceId} />} />
          <Route path="/generate" element={<GeneratePage workspaceId={workspaceId} />} />
          <Route path="/locations" element={<LocationsPage workspaceId={workspaceId} />} />
          <Route path="/activation" element={<ActivationPage workspaceId={workspaceId} />} />
          <Route path="/analytics" element={<AnalyticsPage workspaceId={workspaceId} />} />
          <Route path="*" element={<Navigate to="/campaigns" replace />} />
        </Routes></Suspense> : <LoadingState label="Workspace wird vorbereitet…" />}
      </AppShell>
    </BrowserRouter>
  );
}
