import { BaseApiService } from './api';
import { ApiV1Service } from './apiv1';
import { ApiV2Service } from './apiv2';
import { CRYPTO_PROTO_V1, CRYPTO_PROTO_V2 } from './crypto';
import { useStore } from './store';

// This is a separate file to avoid circular imports.

function createApiServiceForVersion(protoVersion: number): BaseApiService {
  switch (protoVersion) {
    case CRYPTO_PROTO_V1:
      return new ApiV1Service();
    case CRYPTO_PROTO_V2:
      return new ApiV2Service();
    default:
      throw new Error(`unknown protoVersion: ${protoVersion}`);
  }
}

let _apiService: BaseApiService = createApiServiceForVersion(useStore.getState().protoVersion);

useStore.subscribe((state, prevState) => {
  if (state.protoVersion != prevState.protoVersion) {
    _apiService = createApiServiceForVersion(state.protoVersion);
  }
});

/**
 * Gets the current global BaseApiService singleton.
 */
export const apiService = (): BaseApiService => _apiService;
