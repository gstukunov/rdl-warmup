import { INestApplication, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';

export function setupSwagger(
  app: INestApplication,
  configService: ConfigService,
): void {
  const nodeEnv = configService.get('nodeEnv');

  // Only setup Swagger in development environment
  if (nodeEnv !== 'development') {
    Logger.log('Swagger is disabled in non-development environment', 'Swagger');
    return;
  }

  const config = new DocumentBuilder()
    .setTitle('Telegram Bot & WebApp API')
    .setDescription('API documentation for Telegram Bot with WebApp support')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('telegram', 'Telegram bot endpoints')
    .addTag('games', 'Game management endpoints for debates')
    .addTag('allocation', 'Player position allocation and room management')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  Logger.log('Swagger documentation available at /api/docs', 'Swagger');
}
