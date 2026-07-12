import { apiRequest } from '../http';
import type { HealthResponse } from './types';

export const healthApi = {
  get(): Promise<HealthResponse> {
    return apiRequest<HealthResponse>('/health');
  },
};
