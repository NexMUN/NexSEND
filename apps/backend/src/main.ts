import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { apiReference } from '@scalar/nestjs-api-reference';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const parseOrigins = (raw: string | undefined): string[] =>
    (raw || '')
      .split(',')
      .map((value) => value.trim())
      .filter((value, index, arr) => value.length > 0 && arr.indexOf(value) === index);

  const isProd = (process.env.NODE_ENV || 'development') === 'production';
  const allowedOrigins = parseOrigins(
    [process.env.ADMIN_ALLOWED_ORIGINS, process.env.FRONTEND_URL].filter(Boolean).join(','),
  );

  if (isProd && allowedOrigins.length === 0) {
    throw new Error('Production startup requires ADMIN_ALLOWED_ORIGINS or FRONTEND_URL for admin cookie auth');
  }

  const corsOrigin = allowedOrigins.length > 0 ? allowedOrigins : true;

  // Enable CORS for API consumers; admin cookie auth uses explicit allowlist in production.
  app.enableCors({
    origin: corsOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Service-Key', 'X-Base-URL'],
  });

  app.setGlobalPrefix('api');

  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle('Email Notification Service')
    .setDescription('Microservice for handling email notifications with custom domains')
    .setVersion('1.0')
    .addTag('health', 'Health check endpoints')
    .addApiKey({
      type: 'apiKey',
      name: 'X-Service-Key',
      in: 'header',
      description: 'Service API key for authentication'
    }, 'X-Service-Key')
    .build();
  
  const document = SwaggerModule.createDocument(app, config);
  
  // Swagger UI
  SwaggerModule.setup('api/docs', app, document);
  
  // Scalar API Reference
  app.use(
    '/api/reference',
    apiReference({
      spec: {
        content: document,
      },
      theme: 'purple',
    }),
  );
  
  const port = process.env.PORT || 8001;
  await app.listen(port);
  
  console.log(`Application is running on: http://localhost:${port}/api`);
  console.log(`Swagger documentation available at: http://localhost:${port}/api/docs`);
  console.log(`Scalar documentation available at: http://localhost:${port}/api/reference`);
}

bootstrap();
