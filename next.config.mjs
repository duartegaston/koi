import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

/** @type {import("next").NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // El entry `workerd` de `postgres` lo resuelve el runtime de Workers.
  // No lo empaquetes con Webpack: el runtime Edge no tiene `net`.
  serverExternalPackages: ["postgres"],
};

export default nextConfig;

initOpenNextCloudflareForDev();
