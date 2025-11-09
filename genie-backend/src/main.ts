import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConsoleLogger } from '@nestjs/common';
import compression from 'compression';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: new ConsoleLogger({
      prefix: 'Genie',
      logLevels: ['error', 'warn', 'log'],
    }),
  });

  app.enableCors();
  app.use(compression());
  app.use(helmet());

  const config = new DocumentBuilder()
    .setTitle('Genie')
    .setDescription('An Agentic AI')
    .setVersion('1.0')
    .addTag('agent')
    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, documentFactory);

  await app.listen(process.env.PORT ?? 3000);
}

bootstrap();
