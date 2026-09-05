import { defineConfig, devices } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { loadEnv } from "vite";

const localEnvironment = loadEnv("development", process.cwd(), "");
for (const [name, value] of Object.entries(localEnvironment)) process.env[name] ??= value;
if ((!process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SECRET_KEY.includes("replace")) && !process.env.CI) {
  const functionEnvironment = loadEnv("development", `${process.cwd()}/supabase/functions`, "");
  if (functionEnvironment.SUPABASE_SECRET_KEY) process.env.SUPABASE_SECRET_KEY = functionEnvironment.SUPABASE_SECRET_KEY;
}
if (!process.env.CI && !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  try {
    const executable = process.platform === "win32" ? "npx.cmd" : "npx";
    const output = execFileSync(executable, ["supabase", "status", "-o", "env"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
    const local = Object.fromEntries(output.split("\n").flatMap((line) => {
      const match = line.match(/^([A-Z_]+)="?(.*?)"?$/);
      return match ? [[match[1], match[2]]] : [];
    }));
    process.env.VITE_SUPABASE_URL ??= local.API_URL;
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ??= local.PUBLISHABLE_KEY;
    process.env.SUPABASE_SERVICE_ROLE_KEY = local.SERVICE_ROLE_KEY;
  } catch {
    // The test below reports a normal skip when the local stack is unavailable.
  }
}

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: "http://127.0.0.1:5173",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run build && npm run preview -- --host 127.0.0.1 --port 5173",
    url: "http://127.0.0.1:5173",
    reuseExistingServer: false,
    timeout: 180_000,
  },
});
