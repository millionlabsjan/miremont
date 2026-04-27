const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

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
  return (req, res, next) => allowReplitHost(req, res, () => base(req, res, next));
};

module.exports = config;
