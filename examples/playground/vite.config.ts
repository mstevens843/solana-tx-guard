import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { type ProxyOptions, defineConfig, loadEnv } from "vite";

const here = dirname(fileURLToPath(import.meta.url));

// Dev-server proxy so the "Try a real swap" tab can call Jupiter / Helius / Birdeye WITHOUT shipping
// API keys to the browser. Keys are read from the repo-root .env and injected server-side; the
// browser only ever talks to same-origin /api/*. The static `vite build` ignores server.proxy, so
// the deployed paste-tab stays pure client-side.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, resolve(here, "../../"), "");
  const JUP_ULTRA = env.JUP_ULTRA_BASE || "https://api.jup.ag/ultra/v1";
  const JUP_KEY = env.JUP_API_KEY || "";
  const BIRDEYE_KEY = env.BIRDEYE_API_KEY || "";
  // Jupiter/Birdeye sit behind Cloudflare, which 403s ("error code: 1010") non-browser User-Agents.
  // Override the forwarded UA so the proxy works regardless of what the caller (browser or tool) sent.
  const BROWSER_UA =
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

  const proxy: Record<string, ProxyOptions> = {
    "/api/jup": {
      target: JUP_ULTRA,
      changeOrigin: true,
      rewrite: (p) => p.replace(/^\/api\/jup/, ""),
      configure: (proxyServer) => {
        proxyServer.on("proxyReq", (proxyReq) => {
          if (JUP_KEY) proxyReq.setHeader("x-api-key", JUP_KEY);
          proxyReq.setHeader("user-agent", BROWSER_UA);
        });
      },
    },
    "/api/birdeye": {
      target: "https://public-api.birdeye.so",
      changeOrigin: true,
      rewrite: (p) => p.replace(/^\/api\/birdeye/, ""),
      configure: (proxyServer) => {
        proxyServer.on("proxyReq", (proxyReq) => {
          if (BIRDEYE_KEY) proxyReq.setHeader("X-API-KEY", BIRDEYE_KEY);
          proxyReq.setHeader("x-chain", "solana");
          proxyReq.setHeader("user-agent", BROWSER_UA);
        });
      },
    },
  };

  // Helius URL carries its api-key in the query string — split into origin + path so the key never
  // leaves the dev server.
  if (env.HELIUS_RPC_URL) {
    try {
      const u = new URL(env.HELIUS_RPC_URL);
      proxy["/api/helius"] = {
        target: u.origin,
        changeOrigin: true,
        rewrite: () => `${u.pathname}${u.search}` || "/",
      };
    } catch {
      // invalid URL — skip; the swap tab will surface a clear error.
    }
  }

  return {
    plugins: [react()],
    base: "./",
    server: { proxy },
  };
});
