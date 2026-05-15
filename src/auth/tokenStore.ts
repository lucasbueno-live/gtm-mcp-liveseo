import { promises as fs } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

const CONFIG_DIR = join(homedir(), ".gtm-mcp");
const TOKEN_FILE = join(CONFIG_DIR, "credentials.json");

export interface StoredCredentials {
  access_token?: string | null;
  refresh_token?: string | null;
  scope?: string;
  token_type?: string;
  id_token?: string;
  expiry_date?: number;
}

export async function loadCredentials(): Promise<StoredCredentials | null> {
  try {
    const raw = await fs.readFile(TOKEN_FILE, "utf-8");
    return JSON.parse(raw) as StoredCredentials;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }
    throw err;
  }
}

export async function saveCredentials(creds: StoredCredentials): Promise<void> {
  await fs.mkdir(dirname(TOKEN_FILE), { recursive: true });
  await fs.writeFile(TOKEN_FILE, JSON.stringify(creds, null, 2), {
    encoding: "utf-8",
    mode: 0o600,
  });
}

export async function clearCredentials(): Promise<void> {
  try {
    await fs.unlink(TOKEN_FILE);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
      throw err;
    }
  }
}

export function getTokenFilePath(): string {
  return TOKEN_FILE;
}
