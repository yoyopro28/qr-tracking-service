const DB_NAME = "qr-tracking-file-cache";
const STORE_NAME = "files-by-sha256";

export class IndexedDbFileCache {
  private open(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async get(sha256: string): Promise<Blob | null> {
    const database = await this.open();
    return new Promise((resolve, reject) => {
      const request = database.transaction(STORE_NAME).objectStore(STORE_NAME).get(sha256);
      request.onsuccess = () => resolve(request.result instanceof Blob ? request.result : null);
      request.onerror = () => reject(request.error);
    });
  }

  async put(sha256: string, value: Blob): Promise<void> {
    const database = await this.open();
    await new Promise<void>((resolve, reject) => {
      const request = database.transaction(STORE_NAME, "readwrite").objectStore(STORE_NAME).put(value, sha256);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}
