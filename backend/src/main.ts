import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import * as compression from 'compression';
import { Logger } from '@nestjs/common';
import { json, urlencoded } from 'express';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  // Serve static files from uploads directory
  const uploadsRoot = join(process.cwd(), 'uploads');
  const uploadsPath = join(uploadsRoot, 'photos');
  // Create directory if it doesn't exist
  if (!existsSync(uploadsPath)) {
    mkdirSync(uploadsPath, { recursive: true });
  }
  
  app.useStaticAssets(uploadsRoot, {
    prefix: '/uploads/',
  });

  app.useStaticAssets(uploadsPath, {
    prefix: '/uploads/photos/',
  });
  
  logger.log(`📁 Serving static files from: ${uploadsPath}`);

  // Increase body size limit for base64 photos (50MB)
  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ limit: '50mb', extended: true }));

  // Security headers
  app.use(helmet());

  // Compression
  app.use(compression());

  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false, // Изменено на false, чтобы не блокировать дополнительные поля
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      disableErrorMessages: false,
      exceptionFactory: (errors) => {
        console.error('Validation errors:', JSON.stringify(errors, null, 2));
        return errors;
      },
    }),
  );

  // CORS configuration
  const frontendUrl = configService.get('FRONTEND_URL', 'http://localhost:8080');
  const isDevelopment = configService.get('NODE_ENV', 'development') === 'development';
  const allowedOrigins = frontendUrl
    .split(',')
    .map((origin: string) => origin.trim())
    .filter(Boolean);

  app.enableCors({
    origin: (origin, callback) => {
      // allow server-to-server, curl, postman
      if (!origin) return callback(null, true);

      if (isDevelopment || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`CORS blocked for origin: ${origin}`), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['X-Total-Count'],
  });

  const port = configService.get('PORT', 3000);
  const host = configService.get('HOST', '0.0.0.0');
  
  await app.listen(port, host);
  
  logger.log(`🚀 Backend running on http://${host}:${port}/api`);
  logger.log(`📊 Health check available at http://${host}:${port}/api/health`);
  logger.log(`🌍 Environment: ${isDevelopment ? 'Development' : 'Production'}`);
  logger.log(`🌐 Accessible from network on all interfaces (0.0.0.0)`);
  logger.log(`🔗 Frontend URL for email links: ${frontendUrl}`);
}

bootstrap().catch((error) => {
  console.error('Error starting server:', error);
  process.exit(1);
});

