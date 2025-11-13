import { NestFactory } from "@nestjs/core";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { ConsoleLogger, ValidationPipe } from "@nestjs/common";
import compression from "compression";
import helmet from "helmet";
import { Request, Response } from "express";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: new ConsoleLogger({
      prefix: "Genie",
      logLevels: ["error", "warn", "log"],
    }),
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

  await app.listen(process.env.PORT ?? 3001);
  console.log(
    `🚀 Genie Backend is running on http://localhost:${process.env.PORT ?? 3001}`,
  );
  console.log(
    `📚 API Documentation available at http://localhost:${process.env.PORT ?? 3001}/api`,
  );
}

void bootstrap().catch((error) => {
  console.error("❌ Failed to start Genie Backend:", error);
  process.exit(1);
});
