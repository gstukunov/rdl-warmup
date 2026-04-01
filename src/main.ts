import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { setupSwagger } from './config/swagger.config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get(ConfigService);

  // Serve static files for webapp
  app.useStaticAssets(join(__dirname, '..', 'public', 'webapp'), {
    prefix: '/webapp/',
  });
  
  // Serve index.html for all non-API routes (SPA fallback)
  // This should be added after routes are registered, so we use a wildcard handler

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Enable CORS for webapp
  const webAppUrl = configService.get('telegram.webAppUrl');
  app.enableCors({
    origin: webAppUrl,
    credentials: true,
  });

  // Setup Swagger (only in dev)
  setupSwagger(app, configService);

  const port = configService.get('port');
  await app.listen(port);

  Logger.log(
    `🚀 Application is running on: http://localhost:${port}`,
    'Bootstrap',
  );
  Logger.log(
    `📚 Swagger documentation: http://localhost:${port}/api/docs`,
    'Bootstrap',
  );
  Logger.log(`🌍 Environment: ${configService.get('nodeEnv')}`, 'Bootstrap');
  Logger.log(`🤖 Telegram bot will start separately...`, 'Bootstrap');
  Logger.log(`📱 WebApp available at: ${webAppUrl}`, 'Bootstrap');
}
bootstrap();
