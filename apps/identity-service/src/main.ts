import { ConsoleLogger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { ConfigService } from '@nestjs/config';
import { DEFAULT_API_PREFIX } from '@packages/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });
  app.useLogger(new ConsoleLogger({ colors: true }));
  const config = app.get(ConfigService);

  app.setGlobalPrefix(DEFAULT_API_PREFIX);

  app.enableShutdownHooks();

  app.enableCors({
    origin: config.getOrThrow<string>('WEB_ORIGIN'),
  });

  const port = Number(config.get<string>('PORT') ?? '3001');

  await app.listen(port, '127.0.0.1');
}
await bootstrap();
