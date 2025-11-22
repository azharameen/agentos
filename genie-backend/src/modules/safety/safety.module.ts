import { Module } from "@nestjs/common";
import { ContentSafetyController } from "./content-safety.controller";
import { ContentSafetyService } from "./content-safety.service";
import { SharedModule } from "../shared/shared.module";

@Module({
    imports: [SharedModule],
    controllers: [ContentSafetyController],
    providers: [
        ContentSafetyService,
    ],
    exports: [
        ContentSafetyService,
    ],
})
export class SafetyModule { }
