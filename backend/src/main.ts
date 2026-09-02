import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,        // strip unknown fields — DTOs are the contract, not free-form JSON
      forbidNonWhitelisted: true,
      transform: true,        // e.g. turn route/body strings into numbers where a DTO says @IsNumber
    }),
  );
  app.enableCors();
  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
