import { ApiV1Service } from './apiv1';

// This is a separate file to avoid circular imports.

// TODO: Multiplex between v1 and v2 service
export const apiService = new ApiV1Service();
