// @lovable.dev/vite-tanstack-config already registers TanStack Start,
// React, Tailwind, aliases, Nitro and SSR. Do not register duplicate plugins.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// Vercel must receive a Nitro Vercel Functions bundle, NOT the wrapper's
// default Cloudflare-targeted output. Production Git builds set VERCEL=1;
// npm run build:vercel sets NITRO_PRESET=vercel for local verification.
const vercelBuild=Boolean(process.env['VERCEL'] && process.env['VERCEL']!=="0") ||
 process.env['NITRO_PRESET']==="vercel";

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  nitro: vercelBuild ? {
    preset: "vercel",
    output: {
      dir: ".vercel/output",
      serverDir: ".vercel/output/functions/__server.func",
      publicDir: ".vercel/output/static",
    },
  } : true,
});
