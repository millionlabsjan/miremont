const path = require("path");
const http = require("http");
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Ensure Metro resolves packages installed in this workspace package
config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, "node_modules"),
  path.resolve(__dirname, "../../node_modules"),
];

const API_TARGET_HOST = process.env.WEB_API_HOST || "localhost";
const API_TARGET_PORT = parseInt(process.env.WEB_API_PORT || "5000", 10);

const proxyApiToWeb = (req, res, next) => {
  if (!req.url || (!req.url.startsWith("/api/") && req.url !== "/api")) {
    return next();
  }
  const proxyReq = http.request(
    {
      host: API_TARGET_HOST,
      port: API_TARGET_PORT,
      method: req.method,
      path: req.url,
      headers: { ...req.headers, host: `${API_TARGET_HOST}:${API_TARGET_PORT}` },
    },
    (proxyRes) => {
      res.writeHead(proxyRes.statusCode || 502, proxyRes.headers);
      proxyRes.pipe(res);
    }
  );
  proxyReq.on("error", (err) => {
    res.statusCode = 502;
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ message: `API proxy error: ${err.message}` }));
  });
  req.pipe(proxyReq);
};

const reactNativeMapsWebStub = path.resolve(
  __dirname,
  "stubs/react-native-maps.web.js"
);

const upstreamResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === "web" && moduleName === "react-native-maps") {
    return { type: "sourceFile", filePath: reactNativeMapsWebStub };
  }
  if (typeof upstreamResolveRequest === "function") {
    return upstreamResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

const allowReplitHost = (req, res, next) => {
  const origin = req.headers && req.headers.origin;
  if (origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader(
      "Access-Control-Allow-Headers",
      req.headers["access-control-request-headers"] ||
        "Origin, Content-Type, Accept, Authorization, X-Requested-With"
    );
    res.setHeader(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, PATCH, DELETE, OPTIONS"
    );
  }
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }
  next();
};

const upstreamEnhanceMiddleware = config.server && config.server.enhanceMiddleware;
config.server = config.server || {};
config.server.enhanceMiddleware = (metroMiddleware, server) => {
  const base = upstreamEnhanceMiddleware
    ? upstreamEnhanceMiddleware(metroMiddleware, server)
    : metroMiddleware;
  return (req, res, next) =>
    allowReplitHost(req, res, () =>
      proxyApiToWeb(req, res, () => base(req, res, next))
    );
};

module.exports = config;
