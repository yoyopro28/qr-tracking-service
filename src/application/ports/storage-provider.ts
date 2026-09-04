export interface StoredObject {
  path: string;
  size: number;
  sha256: string;
}

export interface TemplateUpload {
  path: string;
  file: File;
}

export interface GeneratedBatchUpload {
  path: string;
  bytes: Uint8Array;
  sha256: string;
}

export interface StorageProvider {
  uploadTemplate(input: TemplateUpload): Promise<StoredObject>;
  uploadGeneratedBatch(input: GeneratedBatchUpload): Promise<StoredObject>;
  createDownloadUrl(bucket: "templates" | "generated-flyers" | "assets", path: string): Promise<string>;
  deleteObject(bucket: "templates" | "generated-flyers" | "assets", path: string): Promise<void>;
}
