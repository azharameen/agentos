import { Module } from "@nestjs/common";
import { CodeOpsService } from "./code-ops.service";
import { SharedModule } from "../shared/shared.module";
import { RagModule } from "../rag/rag.module";

@Module({
    imports: [SharedModule, RagModule],
    providers: [
        CodeOpsService,
    ],
    exports: [
        CodeOpsService,
    ],
})
export class CodeOpsModule { }
