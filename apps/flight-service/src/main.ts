import { ConsoleLogger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { DEFAULT_API_PREFIX } from '@packages/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });
  app.useLogger(new ConsoleLogger({ colors: true }));

  app.setGlobalPrefix(DEFAULT_API_PREFIX);

  app.enableCors({
    origin: 'http://localhost:5173',
  });

  await app.listen(3002, '127.0.0.1');
}
await bootstrap();
