import { SupabaseAuthProvider } from "../infrastructure/supabase/auth-provider";
import { SupabaseQrRepository } from "../infrastructure/supabase/qr-repository";
import { SupabaseStorageProvider } from "../infrastructure/supabase/storage-provider";

export const authProvider = new SupabaseAuthProvider();
export const qrRepository = new SupabaseQrRepository();
export const storageProvider = new SupabaseStorageProvider();

export function errorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message;
  return "Die Aktion ist fehlgeschlagen.";
}
