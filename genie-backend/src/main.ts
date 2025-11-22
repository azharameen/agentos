import { NestFactory } from "@nestjs/core";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { ValidationPipe } from "@nestjs/common";
import compression from "compression";
import helmet from "helmet";
import { Request, Response } from "express";
import { AppModule } from "./app.module";
import { StructuredLogger } from "./common/structured-logger.service";

async function bootstrap() {
  // STRUCTURED LOGGING: Use JSON-formatted logger with correlation IDs
  const app = await NestFactory.create(AppModule, {
    logger: new StructuredLogger("Bootstrap"),
    bufferLogs: true, // Buffer logs until logger is ready
  });

  // Enable CORS (environment-based configuration)
  let corsOrigins: string | string[] = "*";
  if (
    typeof process.env.CORS_ORIGINS === "string" &&
    process.env.CORS_ORIGINS !== "*"
  ) {
    const splitOrigins = process.env.CORS_ORIGINS.split(",")
      .map((o) => o.trim())
      .filter(Boolean);
    corsOrigins = splitOrigins.length === 1 ? splitOrigins[0] : splitOrigins;
  }
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
    methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  });

  // Enable global validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  app.use(compression());
  app.use(helmet());

  const config = new DocumentBuilder()
    .setTitle("Genie")
    .setDescription("An Agentic AI")
    .setVersion("1.0")
    .addTag("agent")
    .build();
  const documentFactory = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api", app, documentFactory);
  app.use("/api/swagger.json", (req: Request, res: Response) =>
    res.json(documentFactory),
  );

  const port = process.env.PORT ?? 3001;
  await app.listen(port);

  const logger = new StructuredLogger("Bootstrap");
  logger.log(`Genie Backend is running on http://localhost:${port}`);
  logger.log(`API Documentation available at http://localhost:${port}/api`);
}

void bootstrap().catch((error) => {
  const logger = new StructuredLogger("Bootstrap");
  logger.fatal("Failed to start Genie Backend", error);
  process.exit(1);
});
