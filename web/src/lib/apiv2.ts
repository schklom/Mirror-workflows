import { BaseApiService, HTTP, Location, ONE_WEEK_SECONDS, Picture, requestV2 } from './api';
import { base64Encode } from './crypto';
import {
  decryptDataV2,
  decryptMasterKey,
  deriveAuthKeyAndPreMasterKey,
  deriveKeks,
  encryptDataV2,
} from './cryptov2';
import { CryptoKeysV2 } from './keystore';
import { UserData, useStore } from './store';

const API_BASE = 'api/v2';

interface SaltResponse {
  salt64: string;
  protoVersion: number;
}

interface LoginRequest {
  username: string;
  passwordHash64: string;
  sessionDurationSeconds: number;
}

interface LoginResponse {
  accessToken: string;
  encMasterKey64: string;
}

interface PushUrlRequestResponse {
  url: string;
}

interface DataRequestResponse {
  items: EncryptedItem[];
}

interface EncryptedItem {
  clientItemIdHex: string;
  unixMillis: number;
  ciphertext64: string;
}

export class ApiV2Service extends BaseApiService {
  async getSalt(userName: string): Promise<[string, number]> {
    const response = await requestV2<SaltResponse>(
      HTTP.GET,
      `${API_BASE}/account/${userName}/salt`
    );
    return [response.salt64, response.protoVersion];
  }

  async login(
    username: string,
    _password: string,
    // This is K_pwk, not K_auth!
    passwordHash: Uint8Array<ArrayBuffer>,
    rememberMe: boolean
  ): Promise<void> {
    const sessionDurationSeconds = rememberMe ? ONE_WEEK_SECONDS : 0;

    const [authKey, preMasterKey] = await deriveAuthKeyAndPreMasterKey(
      username,
      passwordHash.buffer
    );

    // Get access token and encrypted master key
    const requestBody: LoginRequest = {
      username: username,
      passwordHash64: base64Encode(authKey),
      sessionDurationSeconds: sessionDurationSeconds,
    };
    const response = await requestV2<LoginResponse>(
      HTTP.POST,
      `${API_BASE}/account/login`,
      requestBody
    );
    const sessionToken = response.accessToken;

    // Decrypt the master key and derive the KEKs from it
    const [masterKey, fingerprint] = await decryptMasterKey(
      username,
      preMasterKey,
      response.encMasterKey64
    );
    const [cmdKek, locationKek, pictureKek] = await deriveKeks(username, masterKey);

    // Store everything
    const { setUserData } = useStore.getState();
    const keysV2: CryptoKeysV2 = {
      // masterKey,
      cmdKek,
      locationKek,
      pictureKek,
    };

    const data: UserData = {
      fmdId: username,
      sessionToken,
      fingerprint,
      keysV2,
      keysV1: null,
    };
    await setUserData(data, rememberMe);
  }

  async logout(): Promise<void> {
    await requestV2(HTTP.POST, `${API_BASE}/account/logout`);
  }

  async getPushUrl(): Promise<string> {
    const response = await requestV2<PushUrlRequestResponse>(
      HTTP.GET,
      `${API_BASE}/account/push_url`
    );
    return response.url;
  }

  async deleteAccount(): Promise<void> {
    await requestV2(HTTP.DELETE, `${API_BASE}/account`);
  }

  async sendCommand(command: string): Promise<void> {
    const { userData } = useStore.getState();

    // Encrypt command
    const [clientItemIdHex, unixMillis, ciphertext64] = await encryptDataV2(
      userData!.fmdId,
      userData!.keysV2!.cmdKek,
      'command',
      new TextEncoder().encode(command)
    );

    // Send to the server
    const bodyObj: DataRequestResponse = {
      items: [{ clientItemIdHex, unixMillis, ciphertext64 }],
    };

    await requestV2(HTTP.POST, `${API_BASE}/data/command`, bodyObj);
  }

  async getLocations(): Promise<Location[]> {
    const { userData } = useStore.getState();

    // Get the locations
    const encryptedLocations = await requestV2<DataRequestResponse>(
      HTTP.GET,
      `${API_BASE}/data/location`
    );

    // Decrypt them
    const decryptedLocations = await Promise.all(
      encryptedLocations.items.map(async (it) => {
        const decrypted = await decryptDataV2(
          userData!.fmdId,
          userData!.keysV2!.locationKek,
          'location',
          it.clientItemIdHex,
          it.unixMillis,
          it.ciphertext64
        );
        return JSON.parse(new TextDecoder().decode(decrypted)) as Location;
      })
    );

    return decryptedLocations;
  }

  async getPictures(): Promise<string[]> {
    const { userData } = useStore.getState();

    // Get the pictures
    const encryptedPictures = await requestV2<DataRequestResponse>(
      HTTP.GET,
      `${API_BASE}/data/picture`
    );

    // Decrypt them
    const decryptedPictures = await Promise.all(
      encryptedPictures.items.map(async (it) => {
        const decrypted = await decryptDataV2(
          userData!.fmdId,
          userData!.keysV2!.pictureKek,
          'picture',
          it.clientItemIdHex,
          it.unixMillis,
          it.ciphertext64
        );
        const obj = JSON.parse(new TextDecoder().decode(decrypted)) as Picture;
        return obj.raw64;
      })
    );

    return decryptedPictures;
  }

  async deleteAllCommands(): Promise<void> {
    await requestV2(HTTP.DELETE, `${API_BASE}/data/command/all`);
  }

  async deleteAllLocations(): Promise<void> {
    await requestV2(HTTP.DELETE, `${API_BASE}/data/location/all`);
  }

  async deleteAllPictures(): Promise<void> {
    await requestV2(HTTP.DELETE, `${API_BASE}/data/picture/all`);
  }

  async deleteSingleLocation(clientItemIdHex: string): Promise<void> {
    await requestV2(HTTP.DELETE, `${API_BASE}/data/location/${clientItemIdHex}`);
  }

  async deleteSinglePicture(clientItemIdHex: string): Promise<void> {
    await requestV2(HTTP.DELETE, `${API_BASE}/data/picture/${clientItemIdHex}`);
  }

  async getTileServerUrl(): Promise<string> {
    const response = await fetch(`${API_BASE}/tileServerUrl`);

    const text = await response.text();
    if (!response.ok) {
      throw new Error(text || 'Request failed');
    }

    return text;
  }
}
