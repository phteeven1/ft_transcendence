import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
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
});
