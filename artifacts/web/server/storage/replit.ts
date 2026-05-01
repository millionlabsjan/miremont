import path from "path";
import crypto from "crypto";
import type { StorageBackend } from "./index";

const EXT_FROM_MIME: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

const CONTENT_TYPE_FROM_EXT: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

/**
 * Replit Object Storage backend. Activated when REPLIT_OBJSTORE_BUCKET_ID is set
 * (Replit auto-injects this when Object Storage is enabled in the workspace).
 */
export async function createReplitStorage(): Promise<StorageBackend> {
  const { Client } = await import("@replit/object-storage");
  const client = new Client();

  return {
    name: "replit-object-storage",

    async uploadImage(buffer, filename, mimeType) {
      const ext = EXT_FROM_MIME[mimeType] || path.extname(filename) || ".bin";
      const key = `chat/${crypto.randomUUID()}${ext}`;
      const result = await client.uploadFromBytes(key, buffer);
      if (!result.ok) {
        throw new Error(`Object Storage upload failed: ${result.error.message}`);
      }
      // Public URL is served via our /uploads/chat/:key proxy route.
      return { url: `/uploads/chat/${path.basename(key)}`, key };
    },

    async streamFile(key, res) {
      // Inbound key is just the filename (uuid.ext); prefix with chat/.
      const fullKey = key.startsWith("chat/") ? key : `chat/${key}`;
      const result = await client.downloadAsBytes(fullKey);
      if (!result.ok) {
        res.status(404).end();
        return;
      }
      const ext = path.extname(fullKey).toLowerCase();
      res.setHeader("Content-Type", CONTENT_TYPE_FROM_EXT[ext] || "application/octet-stream");
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      res.end(result.value[0]);
    },
  };
}
