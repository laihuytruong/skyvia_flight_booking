import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  app.setGlobalPrefix('api/v1');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      validationError: {
        target: false,
        value: false,
      },
    }),
  );

  app.enableShutdownHooks();

  app.enableCors({
    origin: config.getOrThrow<string>('WEB_ORIGIN'),
  });

  const port = Number(config.get<string>('PORT') ?? '3001');

  await app.listen(port, '127.0.0.1');
}
await bootstrap();
