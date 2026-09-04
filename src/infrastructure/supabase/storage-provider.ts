import type { GeneratedBatchUpload, StorageProvider, StoredObject, TemplateUpload } from "../../application/ports/storage-provider";
import { browserConfig } from "../../lib/env";
import { supabase } from "./client";

export async function sha256Hex(value: Blob | Uint8Array): Promise<string> {
  const bytes = value instanceof Blob ? await value.arrayBuffer() : value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength) as ArrayBuffer;
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (item) => item.toString(16).padStart(2, "0")).join("");
}

export class SupabaseStorageProvider implements StorageProvider {
  async uploadTemplate(input: TemplateUpload): Promise<StoredObject> {
    const sha256 = await sha256Hex(input.file);
    const { error } = await supabase.storage.from(browserConfig.storage.templatesBucket).upload(input.path, input.file, {
      contentType: "application/pdf", upsert: false,
    });
    if (error) throw error;
    return { path: input.path, size: input.file.size, sha256 };
  }

  async uploadGeneratedBatch(input: GeneratedBatchUpload): Promise<StoredObject> {
    const { error } = await supabase.storage.from(browserConfig.storage.generatedFlyersBucket).upload(input.path, input.bytes, {
      contentType: "application/pdf", upsert: false,
    });
    if (error) throw error;
    return { path: input.path, size: input.bytes.byteLength, sha256: input.sha256 };
  }

  async createDownloadUrl(bucket: "templates" | "generated-flyers" | "assets", path: string) {
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 60);
    if (error) throw error;
    return data.signedUrl;
  }

  async deleteObject(bucket: "templates" | "generated-flyers" | "assets", path: string) {
    const { error } = await supabase.storage.from(bucket).remove([path]);
    if (error) throw error;
  }
}
