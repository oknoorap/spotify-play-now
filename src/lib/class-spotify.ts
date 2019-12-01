import SpotifyWebApi from "spotify-web-api-node";
import fetch from "node-fetch";
import open from "open";
import { info, error } from "../utils/logger";

const EP_TOKEN_URL = "https://accounts.spotify.com/api/token";
const EP_CURRENTLY_URL =
  "https://api.spotify.com/v1/me/player/currently-playing";

enum ESpotifyScopes {
  ReadCurrentlyPlaying = "user-read-currently-playing",
  ReadPlaybackState = "user-read-playback-state"
}

interface ISpotifyCredentials {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

interface ISpotifyAPIWrapper {
  instance: SpotifyWebApi;
  credentials: ISpotifyCredentials;
}

interface IPlayback {
  time?: number;
  at?: number;
  duration?: number;
  song?: string;
  album?: string;
  singer?: string;
}

class Spotify implements ISpotifyAPIWrapper {
  /**
   * API Instance.
   */
  instance: SpotifyWebApi;

  /**
   * API Credentials;
   */
  credentials: ISpotifyCredentials;

  /**
   * Authorize's code comes by clicking on browser.
   */
  authorizeCode: string;

  constructor(credentials: ISpotifyCredentials) {
    this.credentials = credentials;
    this.instance = new SpotifyWebApi(credentials);
  }

  /**
   * Open Authorization URL for the first time.
   */
  open() {
    const scopes = [ESpotifyScopes.ReadCurrentlyPlaying];
    const authorizationURL = this.instance.createAuthorizeURL(scopes);
    info(`opening ${authorizationURL}`);
    open(authorizationURL);
  }

  /**
   * Set authorizatio code.
   * @param authorizeCode
   */
  setCode(authorizeCode: string) {
    this.authorizeCode = authorizeCode;
  }

  /**
   * Get Authorization Token
   * We're ended up with classic request, since the SpotifyWebApi error;
   * @param code Authorization Code
   */
  async requestToken() {
    try {
      const { clientId, clientSecret, redirectUri } = this.credentials;

      const basicToken = Buffer.from(`${clientId}:${clientSecret}`).toString(
        "base64"
      );

      const headers = {
        Authorization: `Basic ${basicToken}`
      };

      const refreshToken = this.instance.getRefreshToken();
      const params = [];

      if (refreshToken) {
        params.push({ key: "grant_type", value: "refresh_token" });
        params.push({ key: "refresh_token", value: refreshToken });
      } else {
        params.push({ key: "grant_type", value: "authorization_code" });
        params.push({ key: "code", value: this.authorizeCode });
        params.push({ key: "redirect_uri", value: redirectUri });
      }

      const body = new URLSearchParams();
      for (const param of params) {
        body.append(param.key, param.value);
      }

      const res = await fetch(EP_TOKEN_URL, {
        method: "POST",
        headers,
        body
      });

      const json = await res.json();

      const { access_token: token, refresh_token } = json;

      this.instance.setAccessToken(token);

      if (refresh_token) {
        this.instance.setRefreshToken(refresh_token);
      }
    } catch (err) {
      error(err.message, true);
    }
  }

  /**
   * Fetch Playback from API.
   * We're ended up with classic request, since the SpotifyWebApi error;
   * @param token Authorization Token.
   */
  async fetchPlayback() {
    try {
      const token = this.instance.getAccessToken();

      const headers = {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        "Content-Type": "application/json"
      };

      const res = await fetch(EP_CURRENTLY_URL, {
        headers
      });

      const json = await res.json();
      return json;
    } catch (err) {
      error(err.message, true);
    }
  }

  /**
   * Get playback info.
   */
  async getPlaybackInfo() {
    let json;

    try {
      await this.requestToken();
      json = await this.fetchPlayback();

      const {
        timestamp: time,
        progress_ms: at,
        item: {
          duration_ms: duration,
          name: song,
          album: { name: album },
          artists
        }
      } = json;

      const singer = artists.map(item => item.name).join(", ");

      info(`${song} - ${album} by ${singer}`);

      return {
        time,
        at,
        duration,
        song,
        album,
        singer
      };
    } catch (err) {
      error(`Error or not playing. Response: ${JSON.stringify(json)}`);
      throw err;
    }
  }
}

export default Spotify;
