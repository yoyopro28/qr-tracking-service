import path from "node:path";

const LEGACY_UPLOADS_PREFIX = /^uploads[\\/]+/;

export function getUploadsRoot() {
  return path.resolve(process.env.UPLOADS_DIR ?? path.join(process.cwd(), "uploads"));
}

function isInsideDirectory(parentDirectory: string, childPath: string) {
  const relativePath = path.relative(parentDirectory, childPath);

  return (
    relativePath === "" ||
    (!!relativePath &&
      !relativePath.startsWith("..") &&
      !path.isAbsolute(relativePath))
  );
}

function normalizeStorageKey(storageKey: string) {
  const trimmedStorageKey = storageKey.trim();

  if (!trimmedStorageKey || path.isAbsolute(trimmedStorageKey)) {
    throw new Error("Invalid upload storage key.");
  }

  return trimmedStorageKey
    .replace(LEGACY_UPLOADS_PREFIX, "")
    .split(/[\\/]+/)
    .filter(Boolean)
    .join(path.sep);
}

export function buildUploadPath(...segments: string[]) {
  const uploadsRoot = getUploadsRoot();
  const absolutePath = path.join(uploadsRoot, ...segments);

  if (!isInsideDirectory(uploadsRoot, absolutePath)) {
    throw new Error("Invalid upload path.");
  }

  return absolutePath;
}

export function buildStorageKey(absolutePath: string) {
  const uploadsRoot = getUploadsRoot();
  const resolvedPath = path.resolve(absolutePath);

  if (!isInsideDirectory(uploadsRoot, resolvedPath)) {
    throw new Error("Invalid upload path.");
  }

  return path.relative(uploadsRoot, resolvedPath).split(path.sep).join("/");
}

export function resolveUploadStoragePath(storageKey: string) {
  const uploadsRoot = getUploadsRoot();
  const normalizedStorageKey = normalizeStorageKey(storageKey);
  const absolutePath = path.resolve(uploadsRoot, normalizedStorageKey);

  if (!isInsideDirectory(uploadsRoot, absolutePath)) {
    throw new Error("Invalid upload storage key.");
  }

  return absolutePath;
}
