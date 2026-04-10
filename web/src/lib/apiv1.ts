import { logout, useStore } from '@/lib/store';
import { decryptData, sign, unwrapPrivateKey } from './crypto';
import {
  BaseApiService,
  HTTP,
  JSON_HEADER,
  Location,
  ONE_WEEK_SECONDS,
  requestObject,
} from './api';

interface DataPackage {
  IDT: string;
  Data: string;
}

interface TileServerUrlResponse {
  TileServerUrl: string;
}

const API_BASE = 'api/v1';

export const ENDPOINTS = {
  SALT: `${API_BASE}/salt`,
  REQUEST_ACCESS: `${API_BASE}/requestAccess`,
  PRIVATE_KEY: `${API_BASE}/key`,
  PUBLIC_KEY: `${API_BASE}/pubKey`,
  LOCATIONS: `${API_BASE}/locations`,
  LOCATIONS_DELETE: `${API_BASE}/locations/delete`,
  COMMAND: `${API_BASE}/command`,
  DEVICE: `${API_BASE}/device`,
  PICTURES: `${API_BASE}/pictures`,
  PICTURES_DELETE: `${API_BASE}/pictures/delete`,
  PUSH: `${API_BASE}/push`,
  TILE_SERVER: `${API_BASE}/tileServerUrl`,
  VERSION: `${API_BASE}/version`,
} as const;

export class ApiV1Service extends BaseApiService {
  async getSalt(userName: string): Promise<string> {
    const response = await requestObject<DataPackage>(
      ENDPOINTS.SALT,
      HTTP.PUT,
      {
        IDT: userName,
        Data: 'unused',
      }
    );
    return response.Data;
  }

  async login(
    userName: string,
    password: string,
    passwordAuthHash: string,
    rememberMe: boolean
  ): Promise<void> {
    const sessionDurationSeconds = rememberMe ? ONE_WEEK_SECONDS : 0;

    const response = await requestObject<DataPackage>(
      ENDPOINTS.REQUEST_ACCESS,
      HTTP.PUT,
      {
        IDT: userName,
        Data: passwordAuthHash,
        SessionDurationSeconds: sessionDurationSeconds,
      }
    );
    const sessionToken = response.Data;

    const wrappedPrivateKey = await this.getWrappedPrivateKey(sessionToken);

    const { rsaEncKey, rsaSigKey } = await unwrapPrivateKey(
      password,
      wrappedPrivateKey
    );

    const { setUserData } = useStore.getState();
    await setUserData(
      {
        fmdId: userName,
        rsaEncKey,
        rsaSigKey,
        sessionToken,
      },
      rememberMe
    );
  }

  async getWrappedPrivateKey(sessionToken: string) {
    const response = await requestObject<DataPackage>(
      ENDPOINTS.PRIVATE_KEY,
      HTTP.PUT,
      {
        IDT: sessionToken,
        Data: 'unused',
      }
    );
    return response.Data;
  }

  async logout(): Promise<void> {
    // not implemented in API v1
  }

  async getPushUrl(): Promise<string> {
    const { userData } = useStore.getState();

    const response = await fetch(ENDPOINTS.PUSH, {
      method: HTTP.POST,
      headers: JSON_HEADER,
      body: JSON.stringify({ IDT: userData!.sessionToken, Data: '' }),
    });

    if (!response.ok) {
      const text = await response.text();
      if (response.status === 401) {
        void logout();
        throw new Error('Session expired');
      }
      throw new Error(text || 'Request failed');
    }

    return response.text();
  }

  async deleteAccount(): Promise<void> {
    const { userData } = useStore.getState();
    await requestObject(ENDPOINTS.DEVICE, HTTP.POST, {
      IDT: userData!.sessionToken,
      Data: '',
    });
  }

  async deleteAllLocations(): Promise<void> {
    const { userData } = useStore.getState();
    await requestObject(ENDPOINTS.LOCATIONS_DELETE, HTTP.POST, {
      IDT: userData!.sessionToken,
      Data: '',
    });
  }

  async deleteAllPictures(): Promise<void> {
    const { userData } = useStore.getState();
    await requestObject(ENDPOINTS.PICTURES_DELETE, HTTP.POST, {
      IDT: userData!.sessionToken,
      Data: '',
    });
  }

  async sendCommand(command: string): Promise<void> {
    const { userData } = useStore.getState();

    const timestamp = Date.now();
    const signature = await sign(
      userData!.rsaSigKey,
      `${timestamp}:${command}`
    );

    return requestObject(ENDPOINTS.COMMAND, HTTP.POST, {
      IDT: userData!.sessionToken,
      Data: command,
      UnixTime: timestamp,
      CmdSig: signature,
    });
  }

  async getLocations(): Promise<Location[]> {
    const { userData } = useStore.getState();

    const response = await requestObject<string[]>(
      ENDPOINTS.LOCATIONS,
      HTTP.POST,
      {
        IDT: userData!.sessionToken,
        Data: '',
      }
    );

    const encryptedLocations = response.map((jsonStr) => {
      const parsed = JSON.parse(jsonStr) as DataPackage;
      return parsed.Data;
    });

    const decryptedLocations = await Promise.all(
      encryptedLocations.map(async (encryptedLoc) => {
        const decrypted = await decryptData(userData!.rsaEncKey, encryptedLoc);
        return JSON.parse(decrypted) as Location;
      })
    );

    return decryptedLocations;
  }

  async getPictures(): Promise<string[]> {
    const { userData } = useStore.getState();

    const encryptedPictures = await requestObject<string[]>(
      ENDPOINTS.PICTURES,
      HTTP.POST,
      { IDT: userData!.sessionToken }
    );

    const decryptedPictures = await Promise.all(
      encryptedPictures.map((encryptedPic) =>
        decryptData(userData!.rsaEncKey, encryptedPic)
      )
    );

    return decryptedPictures;
  }

  async getTileServerUrl(): Promise<string> {
    const response = await fetch(ENDPOINTS.TILE_SERVER);

    const text = await response.text();
    if (!response.ok) {
      throw new Error(text || 'Request failed');
    }

    const json = JSON.parse(text) as TileServerUrlResponse;
    return json.TileServerUrl;
  }
}
