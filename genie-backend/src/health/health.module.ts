import { Module } from "@nestjs/common";
import { HealthController } from "./health.controller";
import { TokenUsageService } from "../agent/services/token-usage.service";

@Module({
  controllers: [HealthController],
  providers: [TokenUsageService],
})
export class HealthModule {}
