import { config as loadEnv } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
loadEnv({
  path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../.env"),
});
import express from "express";
import session from "express-session";
import cookieParser from "cookie-parser";
import cors from "cors";
import { createServer } from "http";
import { WebSocketServer } from "ws";
import { authRouter } from "./routes/auth";
import { usersRouter } from "./routes/users";
import { propertiesRouter } from "./routes/properties";
import { inquiriesRouter } from "./routes/inquiries";
import { articlesRouter } from "./routes/articles";
import { categoriesRouter } from "./routes/categories";
import { searchesRouter } from "./routes/searches";
import { notificationsRouter } from "./routes/notifications";
import { setupWebSocket } from "./ws/chat";
import { initRates } from "./services/exchangeRates";
import cron from "node-cron";
import { runSavedSearchDigest } from "./cron/savedSearchDigest";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const server = createServer(app);

// Session store (memory for dev, replace with pg store for prod)
const MemoryStore = (await import("memorystore")).default(session);

// CORS: allow the mobile (expo) bundle and other dev origins to call the API.
// Reflects request origin so credentials work; safe in dev. In production,
// the web client and API are served from the same origin so this is a no-op
// for normal traffic, but still permits authenticated cross-origin calls
// from the deployed mobile bundle.
app.use(
  cors({
    origin: true,
    credentials: true,
    allowedHeaders: ["Content-Type", "x-session-cookie"],
  })
);

app.use(express.json());

// Serve uploaded files (avatars, etc.)
const uploadsPath = path.resolve(__dirname, "../uploads");
app.use("/uploads", express.static(uploadsPath));

// Chat attachments: when running on Replit Object Storage, express.static can't
// reach the bucket — fall through to a streaming proxy here. On local disk,
// express.static handles the file first and this route never fires.
app.get("/uploads/chat/:key", async (req, res) => {
  try {
    const { getStorage } = await import("./storage");
    const storage = await getStorage();
    if (storage.name === "disk") {
      return res.status(404).end(); // disk is served by express.static above
    }
    await storage.streamFile(req.params.key, res);
  } catch (err) {
    console.warn("Chat attachment stream failed:", err);
    res.status(404).end();
  }
});

// Mobile auth: copy x-session-cookie header into Cookie header
// React Native's fetch strips Cookie headers, so mobile sends via x-session-cookie instead
app.use((req, _res, next) => {
  const mobileSession = req.headers["x-session-cookie"] as string;
  if (mobileSession && !req.headers.cookie?.includes("connect.sid")) {
    req.headers.cookie = `connect.sid=${encodeURIComponent(mobileSession)}${req.headers.cookie ? "; " + req.headers.cookie : ""}`;
  }
  next();
});

app.use(cookieParser());
app.use(
  session({
    store: new MemoryStore({ checkPeriod: 86400000 }),
    secret: process.env.SESSION_SECRET || "miremont-dev-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      sameSite: "lax",
    },
  })
);

// API routes
app.use("/api/auth", authRouter);
app.use("/api/users", usersRouter);
app.use("/api/properties", propertiesRouter);
app.use("/api/inquiries", inquiriesRouter);
app.use("/api/articles", articlesRouter);
app.use("/api/categories", categoriesRouter);
app.use("/api/searches", searchesRouter);
app.use("/api/notifications", notificationsRouter);

// WebSocket
const wss = new WebSocketServer({ server, path: "/ws" });
setupWebSocket(wss);

// Global API error handler — keeps the dev server alive on unexpected
// route errors (e.g. invalid input that escapes route-level validation)
// instead of crashing the whole process.
app.use(
  "/api",
  (
    err: unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error("[api error]", err);
    if (res.headersSent) return;
    res.status(500).json({ message: "Internal server error" });
  }
);

process.on("unhandledRejection", (reason) => {
  console.error("[unhandledRejection]", reason);
});
process.on("uncaughtException", (err) => {
  console.error("[uncaughtException]", err);
});

const PORT = parseInt(process.env.PORT || "3000");

// Serve frontend
if (process.env.NODE_ENV === "production") {
  const publicDir = path.resolve(__dirname, "../dist/public");
  app.use(express.static(publicDir));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(publicDir, "index.html"));
  });
} else {
  // In dev, Vite serves the frontend via proxy
  const { createServer: createViteServer } = await import("vite");
  const vite = await createViteServer({
    server: {
      middlewareMode: true,
      allowedHosts: true,
      hmr: { port: PORT + 1 },
    },
    root: path.resolve(__dirname, "../client"),
    appType: "spa",
  });
  app.use(vite.middlewares);
}

// Daily saved-search digest at 09:00 server time.
cron.schedule("0 9 * * *", () => {
  runSavedSearchDigest()
    .then((r) =>
      console.log(
        `Saved-search digest: checked ${r.usersChecked} users, sent ${r.emailsSent} emails`
      )
    )
    .catch((err) => console.warn("Saved-search digest failed:", err));
});

// Load exchange rates, then start server
initRates().finally(() => {
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
});
