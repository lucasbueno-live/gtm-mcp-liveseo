import { OAuth2Client } from "google-auth-library";
import { OAuthConfig, getAuthorizedClient } from "./oauth.js";
import { getActiveProfileName, setActiveProfileName } from "./tokenStore.js";

/**
 * Estado mutável da sessão. O perfil ativo pode mudar em runtime
 * via a tool gtm_auth (switch/login), por isso não é constante.
 */
export class Session {
  private activeProfile: string;

  private constructor(
    private readonly config: OAuthConfig,
    initialProfile: string,
  ) {
    this.activeProfile = initialProfile;
  }

  static async create(
    config: OAuthConfig,
    envProfile?: string,
  ): Promise<Session> {
    const initial = envProfile?.trim()
      ? envProfile.trim()
      : await getActiveProfileName();
    return new Session(config, initial);
  }

  getActiveProfile(): string {
    return this.activeProfile;
  }

  async setActiveProfile(profile: string): Promise<void> {
    this.activeProfile = profile;
    await setActiveProfileName(profile);
  }

  getConfig(): OAuthConfig {
    return this.config;
  }

  /** Resolve o client autenticado do perfil ativo (lazy). */
  getAuth(): Promise<OAuth2Client> {
    return getAuthorizedClient(this.config, this.activeProfile);
  }
}
