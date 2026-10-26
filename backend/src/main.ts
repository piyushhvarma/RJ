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
  const port = process.env.PORT ?? 5000;
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
}
await bootstrap();
