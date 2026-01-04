import { logout } from '@/lib/store';
import { decryptData } from './crypto';

interface DataPackage {
  IDT: string;
  Data: string;
}

const API_BASE = '/api/v1';

const ENDPOINTS = {
  SALT: `${API_BASE}/salt`,
  REQUEST_ACCESS: `${API_BASE}/requestAccess`,
  PRIVATE_KEY: `${API_BASE}/key`,
  PUBLIC_KEY: `${API_BASE}/pubKey`,
  LOCATIONS: `${API_BASE}/locations`,
  COMMAND: `${API_BASE}/command`,
  DEVICE: `${API_BASE}/device`,
  PICTURE: `${API_BASE}/picture`,
  PICTURES: `${API_BASE}/pictures`,
  VERSION: `${API_BASE}/version`,
  PUSH: `${API_BASE}/push`,
} as const;

const HTTP = {
  POST: 'POST',
  PUT: 'PUT',
} as const;

export interface Location {
  lat: number;
  lon: number;
  bat: number;
  date: number;
  time: string;
  provider?: string;
  accuracy?: number;
  altitude?: number;
  speed?: number;
  bearing?: number;
}

const request = async <T>(endpoint: string, method: string, body: object) => {
  const response = await fetch(endpoint, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();

    if (response.status === 401) {
      void logout();
    }

    throw new Error(text || 'Request failed');
  }

  const text = await response.text();
  if (!text) {
    return {} as T;
  }

  return JSON.parse(text) as T;
};

export const getSalt = async (fmdId: string) => {
  const response = await request<DataPackage>(ENDPOINTS.SALT, HTTP.PUT, {
    IDT: fmdId,
    Data: 'unused',
  });
  return response.Data;
};

export const login = async (
  fmdId: string,
  passwordHash: string,
  sessionDurationSeconds = 0
) => {
  const response = await request<DataPackage>(
    ENDPOINTS.REQUEST_ACCESS,
    HTTP.PUT,
    {
      IDT: fmdId,
      Data: passwordHash,
      SessionDurationSeconds: sessionDurationSeconds,
    }
  );
  return response.Data;
};

export const getWrappedPrivateKey = async (sessionToken: string) => {
  const response = await request<DataPackage>(ENDPOINTS.PRIVATE_KEY, HTTP.PUT, {
    IDT: sessionToken,
    Data: 'unused',
  });
  return response.Data;
};

export const getLocations = async (sessionToken: string) => {
  const response = await request<string[]>(ENDPOINTS.LOCATIONS, HTTP.POST, {
    IDT: sessionToken,
    Data: '',
  });
  return response.map((jsonStr) => {
    const parsed = JSON.parse(jsonStr) as DataPackage;
    return { Position: parsed.Data };
  });
};

export const sendCommand = (
  sessionToken: string,
  command: string,
  signature: string,
  timestamp: number
) =>
  request(ENDPOINTS.COMMAND, HTTP.POST, {
    IDT: sessionToken,
    Data: command,
    UnixTime: timestamp,
    CmdSig: signature,
  });

export const getPictures = async (
  sessionToken: string,
  rsaEncKey: CryptoKey
) => {
  const encryptedPictures = await request<string[]>(
    ENDPOINTS.PICTURES,
    HTTP.POST,
    {
      IDT: sessionToken,
    }
  );

  const decryptedPictures = await Promise.all(
    encryptedPictures.map((encryptedPic) =>
      decryptData(rsaEncKey, encryptedPic)
    )
  );

  return decryptedPictures;
};

export const deleteAccount = (sessionToken: string) =>
  request(ENDPOINTS.DEVICE, HTTP.POST, { IDT: sessionToken, Data: '' });

export const getPushUrl = async (sessionToken: string) => {
  const response = await fetch(`${API_BASE}/push`, {
    method: HTTP.POST,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ IDT: sessionToken, Data: '' }),
  });

  if (!response.ok) {
    const text = await response.text();
    if (response.status === 401) {
      void logout();
    }
    throw new Error(text || 'Request failed');
  }

  return response.text();
};

export const getVersion = async () => {
  const response = await fetch(ENDPOINTS.VERSION);

  if (!response.ok) {
    throw new Error('Failed to fetch version');
  }

  return response.text();
};
