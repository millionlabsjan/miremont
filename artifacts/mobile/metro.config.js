const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

/**
 * Metro config for the mobile artifact.
 *
 * Two reasons this file exists:
 *
 * 1. Web bundle compatibility for `react-native-maps`.
 *    The library imports `react-native/Libraries/Utilities/codegenNativeCommands`,
 *    which is native-only and breaks the web bundle. We redirect imports of
 *    `react-native-maps` to a small web stub WHEN AND ONLY WHEN
 *    `platform === "web"`. iOS/Android resolution is left untouched so Expo Go
 *    and native builds still get the real package.
 *
 * 2. Hosting under the Replit workspace iframe (`*.picard.replit.dev`).
 *    Unlike Vite (which has `server.allowedHosts` and rejects unknown hosts
 *    by default), Expo's dev server does NOT host-validate incoming requests:
 *    arbitrary `Host` headers return 200 with the full HTML/JS bundle. So
 *    no host-allow middleware is required here. Verified empirically against
 *    `*.picard.replit.dev`. The `EXPO_PACKAGER_PROXY_URL` env var (set in
 *    package.json's `dev` script) is what tells the manifest/QR flow to
 *    advertise the public Replit URL instead of `localhost`.
 */

const config = getDefaultConfig(__dirname);

const reactNativeMapsWebStub = path.resolve(
  __dirname,
  "stubs/react-native-maps.web.js"
);

const upstreamResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === "web" && moduleName === "react-native-maps") {
    return {
      type: "sourceFile",
      filePath: reactNativeMapsWebStub,
    };
  }

  if (typeof upstreamResolveRequest === "function") {
    return upstreamResolveRequest(context, moduleName, platform);
  }

  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
