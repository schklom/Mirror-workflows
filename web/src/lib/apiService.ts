import { BaseApiService } from './api';
import { ApiV1Service } from './apiv1';
import { CRYPTO_PROTO_V1 } from './crypto';

// This is a separate file to avoid circular imports.

let _apiService: BaseApiService = new ApiV1Service();

/**
 * Gets the current global BaseApiService singleton.
 */
export const apiService = (): BaseApiService => _apiService;

/**
 * Updates the global BaseApiService singleton based on the protocol version that the current account uses.
 */
export function updateApiService(protoVersion: number) {
  switch (protoVersion) {
    case CRYPTO_PROTO_V1:
      _apiService = new ApiV1Service();
      break;
    default:
      throw new Error(`unknown protoVersion: ${protoVersion}`);
  }
}
