import type { Response } from "express";

export interface StorageBackend {
  name: string;
  uploadImage(
    buffer: Buffer,
    filename: string,
    mimeType: string
  ): Promise<{ url: string; key: string }>;
  /** Stream a previously-stored file to an HTTP response. Throws if the key isn't found. */
  streamFile(key: string, res: Response): Promise<void>;
}

let backendPromise: Promise<StorageBackend> | null = null;

/**
 * Returns the active storage backend, picking based on env at first call:
 * - If REPLIT_OBJSTORE_BUCKET_ID is set (Replit Object Storage auto-injects this when
 *   you enable Object Storage in the workspace), use Replit Object Storage.
 * - Otherwise use local disk under artifacts/web/uploads/chat/.
 */
export function getStorage(): Promise<StorageBackend> {
  if (!backendPromise) {
    backendPromise = (async () => {
      if (process.env.REPLIT_OBJSTORE_BUCKET_ID) {
        const { createReplitStorage } = await import("./replit");
        const backend = await createReplitStorage();
        console.log(`Storage: ${backend.name} (bucket ${process.env.REPLIT_OBJSTORE_BUCKET_ID})`);
        return backend;
      }
      const { createDiskStorage } = await import("./disk");
      const backend = await createDiskStorage();
      console.log(`Storage: ${backend.name}`);
      return backend;
    })();
  }
  return backendPromise;
}
