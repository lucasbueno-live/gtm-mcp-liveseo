import { promises as fs } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const CONFIG_DIR = join(homedir(), ".gtm-mcp");
const PROFILES_DIR = join(CONFIG_DIR, "profiles");
const ACTIVE_FILE = join(CONFIG_DIR, "active-profile");
const LEGACY_FILE = join(CONFIG_DIR, "credentials.json");

export const DEFAULT_PROFILE = "default";

export interface StoredCredentials {
  access_token?: string | null;
  refresh_token?: string | null;
  scope?: string;
  token_type?: string;
  id_token?: string;
  expiry_date?: number;
}

export interface ProfileData {
  email?: string;
  name?: string;
  tokens: StoredCredentials;
}

export function sanitizeProfileName(raw: string): string {
  const cleaned = raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return cleaned || DEFAULT_PROFILE;
}

function profilePath(name: string): string {
  return join(PROFILES_DIR, `${sanitizeProfileName(name)}.json`);
}

export async function loadProfile(
  name: string,
): Promise<ProfileData | null> {
  try {
    const raw = await fs.readFile(profilePath(name), "utf-8");
    return JSON.parse(raw) as ProfileData;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      // Migra o arquivo legado de conta única para o perfil default.
      if (sanitizeProfileName(name) === DEFAULT_PROFILE) {
        try {
          const legacy = await fs.readFile(LEGACY_FILE, "utf-8");
          const tokens = JSON.parse(legacy) as StoredCredentials;
          const data: ProfileData = { tokens };
          await saveProfile(name, data);
          await fs.unlink(LEGACY_FILE).catch(() => undefined);
          return data;
        } catch {
          return null;
        }
      }
      return null;
    }
    throw err;
  }
}

export async function saveProfile(
  name: string,
  data: ProfileData,
): Promise<void> {
  await fs.mkdir(PROFILES_DIR, { recursive: true });
  await fs.writeFile(profilePath(name), JSON.stringify(data, null, 2), {
    encoding: "utf-8",
    mode: 0o600,
  });
}

export async function deleteProfile(name: string): Promise<void> {
  try {
    await fs.unlink(profilePath(name));
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
  }
}

export interface ProfileSummary {
  name: string;
  email?: string;
  active: boolean;
}

export async function listProfiles(): Promise<ProfileSummary[]> {
  let files: string[] = [];
  try {
    files = await fs.readdir(PROFILES_DIR);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }
  const active = await getActiveProfileName();
  const summaries: ProfileSummary[] = [];
  for (const file of files) {
    if (!file.endsWith(".json")) continue;
    const name = file.replace(/\.json$/, "");
    let email: string | undefined;
    try {
      const data = JSON.parse(
        await fs.readFile(join(PROFILES_DIR, file), "utf-8"),
      ) as ProfileData;
      email = data.email;
    } catch {
      // ignora perfil corrompido na listagem
    }
    summaries.push({ name, email, active: name === active });
  }
  return summaries;
}

export async function getActiveProfileName(): Promise<string> {
  try {
    const raw = (await fs.readFile(ACTIVE_FILE, "utf-8")).trim();
    return raw ? sanitizeProfileName(raw) : DEFAULT_PROFILE;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return DEFAULT_PROFILE;
    }
    throw err;
  }
}

export async function setActiveProfileName(name: string): Promise<void> {
  await fs.mkdir(CONFIG_DIR, { recursive: true });
  await fs.writeFile(ACTIVE_FILE, sanitizeProfileName(name), {
    encoding: "utf-8",
    mode: 0o600,
  });
}

export function getProfilesDir(): string {
  return PROFILES_DIR;
}
