import { Module, NestModule, MiddlewareConsumer } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { HttpModule } from "@nestjs/axios";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { AgentModule } from "./modules/agent/agent.module";
import { HealthModule } from "./health/health.module";
import { APP_GUARD, APP_FILTER } from "@nestjs/core";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter";
import { CorrelationIdMiddleware, RequestLoggerMiddleware } from "./common/correlation.middleware";
import configuration from "./config/configuration";
import { validationSchema } from "./config/validation.schema";
import { LoggerModule } from "nestjs-pino";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema,
      validationOptions: {
        abortEarly: false,
        allowUnknown: true,
      },
    }),
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        pinoHttp: {
          level: configService.get<string>("app.logging.level", "info"),
          // STRUCTURED LOGGING: JSON output in production, pretty-print in dev
          transport:
            configService.get<string>("app.nodeEnv") !== "production"
              ? {
                target: "pino-pretty",
                options: {
                  colorize: true,
                  singleLine: true,
                  translateTime: "yyyy-mm-dd HH:MM:ss",
                  ignore: "pid,hostname",
                },
              }
              : undefined,
          // STRUCTURED LOGGING: Enhanced serializers with correlation IDs
          serializers: {
            req: (req) => ({
              id: req.id,
              method: req.method,
              url: req.url,
              correlationId: req.raw?.correlationId || req.correlationId,
              userId: req.headers?.['x-user-id'],
              sessionId: req.headers?.['x-session-id'],
            }),
            res: (res) => ({
              statusCode: res.statusCode,
              correlationId: res.getHeader?.('X-Correlation-ID'),
            }),
          },
          // STRUCTURED LOGGING: Add custom fields to all logs
          customProps: (req) => ({
            correlationId:
              (req as any).raw?.correlationId || (req as any).correlationId,
            userId: req.headers?.['x-user-id'],
            sessionId: req.headers?.['x-session-id'],
          }),
        },
      }),
    }),
    HttpModule,
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        throttlers: [
          {
            ttl: configService.get<number>("app.throttle.ttl", 60000),
            limit: configService.get<number>("app.throttle.limit", 10),
          },
        ],
      }),
    }),
    AgentModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
  ],
})
export class AppModule implements NestModule {
  /**
   * STRUCTURED LOGGING: Configure correlation ID middleware
   * Applies to all routes to inject correlation IDs into async context
   */
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(CorrelationIdMiddleware, RequestLoggerMiddleware)
      .forRoutes('*');
  }
}
