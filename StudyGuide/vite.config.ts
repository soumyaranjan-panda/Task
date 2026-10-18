import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { nitro } from "nitro/vite";

const API_PORT = Number(process.env.API_PORT ?? 8090);

// Vercel is the default target; Docker builds set NITRO_PRESET=node-server so the
// same code runs under `node` in the image.
const NITRO_PRESET = process.env.NITRO_PRESET ?? "vercel";

// `0.0.0.0:8080` is the live-preview contract — don't change host/port.
export default defineConfig(({ command, isPreview }) => ({
  server: {
    host: "0.0.0.0",
    port: 8080,
    strictPort: true,
    // Saved solutions live in a separate Node API (see server/api.mjs), which
    // `npm run dev` starts alongside Vite. Proxying keeps it same-origin, so the
    // browser never deals with CORS.
    proxy: {
      "/api": {
        target: `http://127.0.0.1:${API_PORT}`,
        changeOrigin: true,
      },
    },
  },
  preview: {
    host: "127.0.0.1",
    port: 8081,
    strictPort: true,
  },
  resolve: { tsconfigPaths: true },
  plugins: [
    tailwindcss(),
    tanstackStart(),
    ...(command === "build" || isPreview
      ? [
          nitro({
            preset: NITRO_PRESET,
            // In the container the site and the API are two processes, and only
            // the site is published. Forward /api so the browser still sees a
            // single origin. In dev the Vite proxy above does the same job.
            ...(NITRO_PRESET === "node-server"
              ? {
                  routeRules: {
                    "/api/**": { proxy: `http://127.0.0.1:${API_PORT}/api/**` },
                  },
                }
              : {}),
          }),
        ]
      : []),
    viteReact(),
  ],
}));
