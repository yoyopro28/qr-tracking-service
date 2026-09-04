import { createClient } from "@supabase/supabase-js";
import { browserConfig } from "../../lib/env";
import type { Database } from "./database.types";

export const supabase = createClient<Database>(browserConfig.supabaseUrl, browserConfig.supabasePublishableKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
