import packageJson from "../../package.json";

export const APP_NAME = "KeepSupabaseAlive";
export const APP_VERSION = packageJson.version;
export const APP_REPOSITORY =
  packageJson.repository?.url?.replace(/^git\+/, "").replace(/\.git$/, "") ??
  "https://github.com/keepsupabasealive/keepsupabasealive";
