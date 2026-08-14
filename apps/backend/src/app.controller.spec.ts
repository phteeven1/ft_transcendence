import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';

describe('AppController', () => {
  let appController: AppController;
  let prisma: { $queryRaw: jest.Mock };

  beforeEach(async () => {
    prisma = { $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]) };

    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('health', () => {
    it('returns ok when database is reachable', async () => {
      const status = jest.fn();
      const res = { status } as unknown as import('express').Response;
      const health = await appController.getHealth(res);

      expect(health.status).toBe('ok');
      expect(health.checks.database.status).toBe('up');
      expect(status).not.toHaveBeenCalled();
    });

    it('returns error when database is down', async () => {
      prisma.$queryRaw.mockRejectedValueOnce(new Error('Connection refused'));
      const status = jest.fn();
      const res = { status } as unknown as import('express').Response;
      const health = await appController.getHealth(res);

      expect(health.status).toBe('error');
      expect(health.checks.database.status).toBe('down');
      expect(status).toHaveBeenCalledWith(503);
    });
  });
});
