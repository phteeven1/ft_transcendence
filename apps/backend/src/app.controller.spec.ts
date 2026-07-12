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
      providers: [
        AppService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('counter', () => {
    it('starts at zero', () => {
      expect(appController.getCounter()).toBe(0);
    });

    it('increments on each post', () => {
      expect(appController.incrementCounter()).toBe(1);
      expect(appController.getCounter()).toBe(1);
    });
  });

  describe('health', () => {
    it('returns ok when database is reachable', async () => {
      const res = { status: jest.fn() } as unknown as import('express').Response;
      const health = await appController.getHealth(res);

      expect(health.status).toBe('ok');
      expect(health.checks.database.status).toBe('up');
      expect(res.status).not.toHaveBeenCalled();
    });

    it('returns error when database is down', async () => {
      prisma.$queryRaw.mockRejectedValueOnce(new Error('Connection refused'));
      const res = { status: jest.fn() } as unknown as import('express').Response;
      const health = await appController.getHealth(res);

      expect(health.status).toBe('error');
      expect(health.checks.database.status).toBe('down');
      expect(res.status).toHaveBeenCalledWith(503);
    });
  });
});
