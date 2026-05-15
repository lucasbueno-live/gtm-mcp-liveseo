import { tagmanager, tagmanager_v2 } from "@googleapis/tagmanager";
import { OAuth2Client } from "google-auth-library";

export function getTagManagerClient(
  auth: OAuth2Client,
): tagmanager_v2.Tagmanager {
  return tagmanager({ version: "v2", auth });
}

export type TagManagerClient = tagmanager_v2.Tagmanager;
