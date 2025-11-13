import { SetMetadata } from "@nestjs/common";

/**
 * Public decorator
 * Use this to mark routes that should bypass API key authentication
 * Example: @Public() on a health check endpoint
 */
export const Public = () => SetMetadata("isPublic", true);
