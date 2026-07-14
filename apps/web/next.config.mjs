import { readFileSync } from "node:fs";
import { resolve } from "node:path";

loadRootEnv();

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@suupstars/shared"]
};

export default nextConfig;

function loadRootEnv() {
  const envPath = resolve(process.cwd(), "../../.env");

  try {
    const content = readFileSync(envPath, "utf8");

    for (const line of content.split(/\r?\n/)) {
      const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (!match || process.env[match[1]]) {
        continue;
      }

      process.env[match[1]] = match[2].trim();
    }
  } catch {
    // The web app can still run with environment variables provided by the host.
  }
}
