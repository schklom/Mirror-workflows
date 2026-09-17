import { PasswordHashResult } from './crypto';
import { useStore } from './store';

export const HTTP = {
  POST: 'POST',
  PUT: 'PUT',
  GET: 'GET',
  DELETE: 'DELETE',
} as const;

export interface Location {
  lat: number;
  lon: number;
  bat: number;
  date: number;
  time: string;
  provider: string;
  accuracy?: number;
  altitude?: number;
  speed?: number;
  bearing?: number;
}

export interface Picture {
  raw64: string;
  mimeType: string;
}

export const JSON_HEADER = { 'Content-Type': 'application/json' } as const;

export const ONE_WEEK_SECONDS = 7 * 24 * 60 * 60;

export abstract class BaseApiService {
  abstract getSalt(userName: string): Promise<[string, number]>;
  abstract login(
    userName: string,
    password: string,
    passwordHash: PasswordHashResult,
    rememberMe: boolean
  ): Promise<void>;
  abstract logout(): Promise<void>;
  abstract getPushUrl(): Promise<string>;

  abstract deleteAccount(): Promise<void>;
  abstract deleteAllLocations(): Promise<void>;
  abstract deleteAllPictures(): Promise<void>;

  abstract sendCommand(command: string): Promise<void>;

  abstract getLocations(): Promise<Location[]>;
  abstract getPictures(): Promise<string[]>;

  abstract getTileServerUrl(): Promise<string>;
}

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

export const requestV2 = async <T>(
  method: string,
  endpoint: string,
  body: object | null = null
) => {
  let headers: HeadersInit = { ...JSON_HEADER }; // create a fresh object

  const { userData } = useStore.getState();
  const token = userData?.sessionToken;

  // Token can sometimes be null, e.g., during getSalt() and login()
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(endpoint, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null,
  });

  if (!response.ok) {
    const text = await response.text();

    if (response.status === 401) {
      void useStore.getState().logout();
      throw new ApiError('Session expired', response.status);
    }

    throw new ApiError(text || 'Request failed', response.status);
  }

  const text = await response.text();
  if (!text) {
    return {} as T;
  }

  return JSON.parse(text) as T;
};

export const requestObject = async <T>(endpoint: string, method: string, body: object) => {
  const response = await fetch(endpoint, {
    method,
    headers: JSON_HEADER,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();

    if (response.status === 401) {
      void useStore.getState().logout();
      throw new Error('Session expired');
    }

    throw new Error(text || 'Request failed');
  }

  const text = await response.text();
  if (!text) {
    return {} as T;
  }

  return JSON.parse(text) as T;
};

export const getVersion = async () => {
  const response = await fetch('version');

  if (!response.ok) {
    throw new Error('Failed to fetch version');
  }

  return response.text();
};
