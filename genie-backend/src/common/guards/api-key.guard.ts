import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Reflector } from "@nestjs/core";
import { Request } from "express";

/**
 * API Key Guard
 * Validates API key from X-API-Key header
 * Can be applied globally or per-route
 * Use @Public() decorator to skip authentication on specific routes
 */
@Injectable()
export class ApiKeyGuard implements CanActivate {
  private readonly logger = new Logger(ApiKeyGuard.name);
  private readonly apiKeys: string[];

  constructor(
    private readonly configService: ConfigService,
    private readonly reflector: Reflector,
  ) {
    this.apiKeys = this.configService.get<string[]>("app.auth.apiKeys", []);
  }

  canActivate(context: ExecutionContext): boolean {
    // Check if route is marked as public
    const isPublic = this.reflector.getAllAndOverride<boolean>("isPublic", [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    // If no API keys configured, allow all requests (dev mode)
    if (!this.apiKeys || this.apiKeys.length === 0) {
      this.logger.warn(
        "No API keys configured - authentication disabled (dev mode)",
      );
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const apiKey = this.extractApiKey(request);

    if (!apiKey) {
      throw new UnauthorizedException("API key is required");
    }

    if (!this.apiKeys.includes(apiKey)) {
      this.logger.warn(`Invalid API key attempt: ${apiKey.substring(0, 8)}***`);
      throw new UnauthorizedException("Invalid API key");
    }

    return true;
  }

  private extractApiKey(request: Request): string | undefined {
    // Support multiple header formats
    const apiKey =
      request.headers["x-api-key"] ||
      request.headers["api-key"] ||
      request.headers.authorization?.replace("Bearer ", "");

    return Array.isArray(apiKey) ? apiKey[0] : apiKey;
  }
}
