import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";
import type { StorageBackend } from "./index";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.resolve(__dirname, "../../uploads/chat");

const EXT_FROM_MIME: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "image/heic": ".heic",
  "image/heif": ".heif",
};

export async function createDiskStorage(): Promise<StorageBackend> {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });

  return {
    name: "disk",

    async uploadImage(buffer, filename, mimeType) {
      const ext = EXT_FROM_MIME[mimeType] || path.extname(filename) || ".bin";
      const key = `${crypto.randomUUID()}${ext}`;
      const fullPath = path.join(UPLOADS_DIR, key);
      await fs.promises.writeFile(fullPath, buffer);
      // /api/ prefix is required for iOS Expo clients; see replit.md.
      // Disk-backed dev still works because Express also has /api/uploads/chat/:key
      // routed; for disk we serve via that handler too (it falls through to the
      // file). Web browsers don't trigger the issue.
      return { url: `/api/uploads/chat/${key}`, key };
    },

    async streamFile(key, res) {
      // express.static handles the disk path directly; this is only used when an
      // upstream router needs to stream regardless of backend.
      const fullPath = path.join(UPLOADS_DIR, key);
      await fs.promises.access(fullPath);
      res.sendFile(fullPath);
    },
  };
}
