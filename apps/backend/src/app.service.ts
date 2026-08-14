import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import type { HealthResponse } from './health.types';

@Injectable()
export class AppService {
  private readonly startedAt = Date.now();

  constructor(private readonly prisma: PrismaService) {}

  async getHealth(): Promise<HealthResponse> {
    const database = await this.checkDatabase();
    const status = database.status === 'up' ? 'ok' : 'error';

    return {
      status,
      timestamp: new Date().toISOString(),
      uptime: Math.round((Date.now() - this.startedAt) / 1000),
      version: process.env.npm_package_version ?? '0.0.1',
      checks: { database },
    };
  }

  private async checkDatabase(): Promise<HealthResponse['checks']['database']> {
    const start = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'up', latencyMs: Date.now() - start };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown database error';
      return { status: 'down', error: message };
    }
  }
}
