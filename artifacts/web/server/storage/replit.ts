import path from "path";
import crypto from "crypto";
import type { StorageBackend } from "./index";

const EXT_FROM_MIME: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "image/heic": ".heic",
  "image/heif": ".heif",
};

const CONTENT_TYPE_FROM_EXT: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".heic": "image/heic",
  ".heif": "image/heif",
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
      // The SDK returns a tuple [Buffer]; unwrap defensively in case it ever
      // returns the Buffer directly.
      const raw = result.value as unknown;
      const buffer: Buffer = Buffer.isBuffer(raw)
        ? raw
        : Array.isArray(raw)
          ? (raw[0] as Buffer)
          : Buffer.from(raw as ArrayBuffer);
      const ext = path.extname(fullKey).toLowerCase();
      const contentType = CONTENT_TYPE_FROM_EXT[ext] || "image/jpeg";
      res.setHeader("Content-Type", contentType);
      res.setHeader("Content-Length", buffer.length.toString());
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      // Use res.send so Express manages framing/etag; it preserves our headers.
      res.send(buffer);
    },
  };
}
