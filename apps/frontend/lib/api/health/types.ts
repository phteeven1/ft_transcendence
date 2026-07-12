export type HealthCheckStatus = 'up' | 'down';

export type HealthCheckResult = {
  status: HealthCheckStatus;
  latencyMs?: number;
  error?: string;
};

export type HealthResponse = {
  status: 'ok' | 'error';
  timestamp: string;
  uptime: number;
  version: string;
  checks: {
    database: HealthCheckResult;
  };
};
