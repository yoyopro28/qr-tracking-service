import { spawnSync } from "node:child_process";

const required = (name) => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
};

const environment = required("DEPLOY_ENV");
if (!new Set(["preview", "production"]).has(environment)) throw new Error("DEPLOY_ENV must be preview or production");

function put(config, secrets) {
  const command = process.platform === "win32" ? "npx.cmd" : "npx";
  const result = spawnSync(command, ["wrangler", "secret", "bulk", "--config", config, "--env", environment], {
    input: JSON.stringify(secrets),
    encoding: "utf8",
    stdio: ["pipe", "inherit", "inherit"],
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`Failed to configure Worker secrets for ${config}`);
}

put("workers/redirect/wrangler.jsonc", { HMAC_SECRET: required("HMAC_SECRET") });
put("workers/cache-sync/wrangler.jsonc", {
  SUPABASE_SECRET_KEY: required("SUPABASE_SECRET_KEY"),
  SYNC_WEBHOOK_SECRET: required("SYNC_WEBHOOK_SECRET"),
});

console.log(JSON.stringify({ configured: true, environment, workers: ["redirect", "cache-sync"] }));
