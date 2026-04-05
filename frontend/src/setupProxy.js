/**
 * Proxy /api (including VM terminal iframe) to the backend.
 * Ensures GET /api/vm/terminal is served by the backend so the VM panel works.
 * Set REACT_APP_PROXY_TARGET if the backend runs on a different port (e.g. when frontend uses PORT=5000, use http://localhost:5001).
 *
 * Also proxy WebSocket /ws so the VM terminal (ttyd) in the iframe can connect.
 * The iframe loads /api/vm/terminal-frame/... which serves ttyd's UI; ttyd's JS connects to ws://same-origin/ws.
 * Without this, /ws would hit the dev server and fail; proxying to backend lets the backend's vm-terminal upgrade handler forward to the VM container.
 */
const { createProxyMiddleware } = require("http-proxy-middleware");

const backendTarget = process.env.REACT_APP_PROXY_TARGET || "http://localhost:5000";

module.exports = function (app) {
  app.use(
    "/lab",
    createProxyMiddleware({
      target: backendTarget,
      changeOrigin: true,
      ws: false,
      logLevel: process.env.NODE_ENV === "development" ? "warn" : "silent",
    })
  );
  app.use(
    "/api",
    createProxyMiddleware({
      target: backendTarget,
      changeOrigin: true,
      ws: true,
      logLevel: process.env.NODE_ENV === "development" ? "warn" : "silent",
    })
  );
  app.use(
    "/ws",
    createProxyMiddleware({
      target: backendTarget,
      changeOrigin: true,
      ws: true,
      logLevel: process.env.NODE_ENV === "development" ? "warn" : "silent",
    })
  );
};
