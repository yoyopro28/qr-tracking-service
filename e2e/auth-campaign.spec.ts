import { expect, test } from "@playwright/test";
import { PDFDocument } from "pdf-lib";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;

test.skip(!supabaseUrl || !secretKey, "VITE_SUPABASE_URL and SUPABASE_SECRET_KEY are required");

test("OTP login, campaign, browser PDF batch and location work end to end", async ({ page, context }) => {
  test.setTimeout(150_000);
  const admin = createClient(supabaseUrl!, secretKey!, { auth: { persistSession: false, autoRefreshToken: false } });
  const email = `e2e-${crypto.randomUUID()}@example.test`;
  let userId: string | undefined;
  let workspaceId: string | undefined;
  let campaignId: string | undefined;
  const uploadedTemplatePaths: string[] = [];
  const generatedBatchPaths: string[] = [];

  try {
    const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email, options: { redirectTo: "http://127.0.0.1:5173" } });
    if (error) throw error;
    userId = data.user.id;
    await page.goto(data.properties.action_link);
    await expect(page.getByRole("heading", { name: "Kampagnen", level: 1 })).toBeVisible();

    const { data: membership, error: membershipError } = await admin.from("workspace_members").select("workspace_id").eq("user_id", userId).single();
    if (membershipError) throw membershipError;
    workspaceId = membership.workspace_id;

    await page.getByLabel("Name").first().fill("E2E Launch Campaign");
    await page.getByLabel("Beschreibung").fill("Browserbasierter Produktionspfad");
    await page.getByLabel("Ziel-URL").fill("https://example.com/e2e");
    await page.getByRole("button", { name: "Kampagne anlegen" }).click();
    await expect(page.getByRole("heading", { name: "E2E Launch Campaign" })).toBeVisible();
    await expect(page.getByText("Kampagne wurde angelegt.")).toBeVisible();

    const { data: campaign, error: campaignError } = await admin.from("campaigns").select("id").eq("workspace_id", workspaceId).eq("name", "E2E Launch Campaign").single();
    if (campaignError) throw campaignError;
    campaignId = campaign.id;

    await page.getByRole("link", { name: "Details öffnen" }).click();
    await page.getByRole("button", { name: "Kampagne bearbeiten" }).click();
    await page.getByLabel("Status").selectOption("ACTIVE");
    await page.getByRole("button", { name: "Speichern" }).click();
    await expect(page.getByText("ACTIVE", { exact: true })).toBeVisible();

    const pdf = await PDFDocument.create();
    pdf.addPage([595, 842]);
    const pdfBytes = await pdf.save();
    await page.getByRole("link", { name: "Vorlagen" }).click();
    await page.getByLabel("PDF-Datei").setInputFiles({ name: "e2e-template.pdf", mimeType: "application/pdf", buffer: Buffer.from(pdfBytes) });
    await expect(page.getByText("1 Seiten · 595.0 × 842.0 Punkte")).toBeVisible();
    await page.getByRole("button", { name: "Vorlage hochladen" }).click();
    await expect(page.getByText("Vorlage wurde privat gespeichert und ist bereit.")).toBeVisible();
    await expect(page.getByRole("heading", { name: "e2e-template.pdf" })).toBeVisible();

    const { data: storedTemplates, error: storedTemplateError } = await admin.from("templates").select("storage_path").eq("workspace_id", workspaceId);
    if (storedTemplateError) throw storedTemplateError;
    uploadedTemplatePaths.push(...storedTemplates.map((item) => item.storage_path));

    await page.getByRole("link", { name: "Flyer erzeugen" }).click();
    const generateButton = page.getByRole("button", { name: "Batch reservieren und PDF erzeugen" });
    await generateButton.click();
    await expect(page.getByRole("button", { name: "Verarbeitung läuft…" })).toBeDisabled();
    let batchId = "";
    await expect.poll(async () => {
      const { data: generatedBatch, error: batchError } = await admin.from("flyer_batches").select("id,status,storage_path").eq("workspace_id", workspaceId).eq("campaign_id", campaignId).maybeSingle();
      if (batchError) throw batchError;
      if (generatedBatch) {
        batchId = generatedBatch.id;
        if (!generatedBatchPaths.includes(generatedBatch.storage_path)) generatedBatchPaths.push(generatedBatch.storage_path);
      }
      return generatedBatch?.status ?? "MISSING";
    }, { timeout: 90_000, intervals: [500, 1_000, 2_000] }).toBe("FINALIZED");

    const { data: routes, error: routeError } = await admin.from("qr_routes").select("slug,version").eq("workspace_id", workspaceId).eq("campaign_id", campaignId);
    if (routeError) throw routeError;
    for (const route of routes) {
      const { data: event, error: eventError } = await admin.from("redirect_cache_outbox").select("id").eq("slug", route.slug).eq("route_version", route.version).single();
      if (eventError) throw eventError;
      const { error: completeError } = await admin.rpc("complete_redirect_cache_event", { p_event_id: event.id, p_slug: route.slug, p_version: route.version });
      if (completeError) throw completeError;
    }

    await expect(page.getByText("Alle Redirect-Schreibvorgänge wurden akzeptiert. Der Batch ist druckbereit.")).toBeVisible({ timeout: 10_000 });
    const download = page.getByRole("link", { name: "Druckfertiges PDF herunterladen" });
    const response = await page.request.get((await download.getAttribute("href"))!);
    expect(response.ok()).toBe(true);
    expect((await response.body()).subarray(0, 4).toString()).toBe("%PDF");
    const { data: flyers, error: flyerError } = await admin.from("flyers").select("status,shortcode").eq("batch_id", batchId);
    if (flyerError) throw flyerError;
    expect(flyers).toHaveLength(1);
    expect(flyers[0].status).toBe("GENERATED");

    await context.grantPermissions(["geolocation"], { origin: "http://127.0.0.1:5173" });
    await context.setGeolocation({ latitude: 52.520008, longitude: 13.404954 });
    await page.getByRole("link", { name: "Aktivierung" }).click();
    await page.getByLabel("Shortcode").fill(flyers[0].shortcode);
    await page.getByRole("button", { name: "Flyer suchen" }).click();
    await page.getByLabel("Name des neuen Standorts").fill("E2E GPS Point");
    await page.getByRole("button", { name: "Aktuellen GPS-Standort übernehmen" }).click();
    await expect(page.getByLabel("Breitengrad")).toHaveValue("52.520008");
    await expect(page.getByLabel("Längengrad")).toHaveValue("13.404954");
    await expect(page.getByText(/Genauigkeit ca\. \d+ m/)).toBeVisible();
    await page.getByRole("button", { name: "Flyer aktivieren" }).click();
    await expect(page.getByText(`Flyer ${flyers[0].shortcode} wurde aktiviert.`)).toBeVisible();
    await expect(page.getByText("Aktiver Standort:")).toContainText("E2E GPS Point");

    const { data: gpsLocation, error: gpsLocationError } = await admin.from("locations").select("latitude,longitude").eq("workspace_id", workspaceId).eq("name", "E2E GPS Point").single();
    if (gpsLocationError) throw gpsLocationError;
    expect(gpsLocation.latitude).toBe(52.520008);
    expect(gpsLocation.longitude).toBe(13.404954);

    await page.getByRole("link", { name: "Standorte" }).click();
    await page.getByLabel("Name").fill("E2E Distribution Point");
    await page.getByLabel("Adresse").fill("Teststraße 1");
    await page.getByLabel("PLZ").fill("10115");
    await page.getByLabel("Ort").fill("Berlin");
    await page.getByLabel("Land").fill("Deutschland");
    await page.getByRole("button", { name: "Standort anlegen" }).click();
    await expect(page.getByText("Standort wurde angelegt.")).toBeVisible();
    await expect(page.getByRole("heading", { name: "E2E Distribution Point" })).toBeVisible();
  } finally {
    if (generatedBatchPaths.length) await admin.storage.from("generated-flyers").remove(generatedBatchPaths);
    if (uploadedTemplatePaths.length) await admin.storage.from("templates").remove(uploadedTemplatePaths);
    if (workspaceId) await admin.from("workspaces").delete().eq("id", workspaceId);
    if (userId) await admin.auth.admin.deleteUser(userId);
  }
});
