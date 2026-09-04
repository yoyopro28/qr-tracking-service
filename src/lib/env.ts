function requiredBrowserEnv(name: "VITE_SUPABASE_URL" | "VITE_SUPABASE_PUBLISHABLE_KEY" | "VITE_TRACKING_ORIGIN") {
  const value = import.meta.env[name]?.trim();
  if (!value) throw new Error(`Missing required browser environment variable: ${name}`);
  return value;
}

function origin(name: "VITE_SUPABASE_URL" | "VITE_TRACKING_ORIGIN") {
  const value = new URL(requiredBrowserEnv(name));
  if (value.protocol !== "http:" && value.protocol !== "https:") {
    throw new Error(`${name} must be an HTTP(S) URL`);
  }
  return value.origin;
}

export const browserConfig = {
  supabaseUrl: origin("VITE_SUPABASE_URL"),
  supabasePublishableKey: requiredBrowserEnv("VITE_SUPABASE_PUBLISHABLE_KEY"),
  trackingOrigin: origin("VITE_TRACKING_ORIGIN"),
  mapStyleUrl: import.meta.env.VITE_MAP_STYLE_URL?.trim() || null,
  storage: {
    templatesBucket: "templates",
    generatedFlyersBucket: "generated-flyers",
    assetsBucket: "assets",
  },
} as const;
