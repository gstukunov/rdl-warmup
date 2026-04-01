import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { setupSwagger } from './config/swagger.config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import * as fs from 'fs';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get(ConfigService);

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

  // Путь к webapp
  const webappPath = join(process.cwd(), 'public', 'webapp');
  const indexPath = join(webappPath, 'index.html');
  const exists = fs.existsSync(indexPath);
  
  Logger.log(`📁 WebApp path: ${webappPath}`, 'Bootstrap');
  Logger.log(`📁 index.html exists: ${exists}`, 'Bootstrap');

  if (exists) {
    // Раздаем статические файлы
    app.useStaticAssets(webappPath, {
      prefix: '/webapp',
    });
    
    // SPA fallback: отдаем index.html для всех путей /webapp/*
    const httpAdapter = app.getHttpAdapter();
    
    // Важно: регистрируем после инициализации
    httpAdapter.get('/webapp*', (req: any, res: any, next: any) => {
      // Если запрос к API (начинается с /webapp/api) - пропускаем
      if (req.path.startsWith('/webapp/api')) {
        return next();
      }
      
      // Иначе отдаем index.html
      res.sendFile(indexPath);
    });
    
    Logger.log(`✅ WebApp static files configured at /webapp`, 'Bootstrap');
  } else {
    Logger.warn(`⚠️ WebApp files not found at ${webappPath}`, 'Bootstrap');
  }

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
