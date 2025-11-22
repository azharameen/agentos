import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import ContentSafetyClient from "@azure-rest/ai-content-safety";
import { AzureKeyCredential } from "@azure/core-auth";

/**
 * Content Safety Categories (Azure AI Content Safety)
 * Severity levels: 0 (safe) to 6 (very unsafe)
 */
export enum ContentSafetyCategory {
  HATE = "Hate",
  VIOLENCE = "Violence",
  SEXUAL = "Sexual",
  SELF_HARM = "SelfHarm",
}

export interface ContentSafetyResult {
  safe: boolean;
  violations: Array<{
    category: ContentSafetyCategory;
    severity: number;
    threshold: number;
  }>;
  analysisTime: number;
}

/**
 * ContentSafetyService
 * Integrates Azure AI Content Safety API for input/output moderation
 * Privacy: Only sends data to user's own Azure tenant (if enabled)
 */
@Injectable()
export class ContentSafetyService {
  private readonly logger = new Logger(ContentSafetyService.name);
  private readonly enabled: boolean;
  private readonly client: ReturnType<typeof ContentSafetyClient> | null;
  private readonly thresholds: {
    hate: number;
    violence: number;
    sexual: number;
    selfHarm: number;
  };

  constructor(private readonly configService: ConfigService) {
    this.enabled = this.configService.get<boolean>(
      "app.contentSafety.enabled",
      false,
    );

    // Load thresholds (0-6, where higher = stricter)
    this.thresholds = {
      hate: this.configService.get<number>(
        "app.contentSafety.thresholds.hate",
        4,
      ),
      violence: this.configService.get<number>(
        "app.contentSafety.thresholds.violence",
        4,
      ),
      sexual: this.configService.get<number>(
        "app.contentSafety.thresholds.sexual",
        4,
      ),
      selfHarm: this.configService.get<number>(
        "app.contentSafety.thresholds.selfHarm",
        4,
      ),
    };

    if (this.enabled) {
      const endpoint = this.configService.get<string>(
        "app.contentSafety.endpoint",
      );
      const apiKey = this.configService.get<string>("app.contentSafety.apiKey");

      if (!endpoint || !apiKey) {
        this.logger.warn(
          "Content Safety is enabled but AZURE_CONTENT_SAFETY_ENDPOINT or AZURE_CONTENT_SAFETY_API_KEY is not set. Disabling content safety.",
        );
        this.enabled = false;
        this.client = null;
      } else {
        this.client = ContentSafetyClient(
          endpoint,
          new AzureKeyCredential(apiKey),
        );
        this.logger.log(
          `Content Safety ENABLED (endpoint: ${endpoint}, thresholds: Hate=${this.thresholds.hate}, Violence=${this.thresholds.violence}, Sexual=${this.thresholds.sexual}, SelfHarm=${this.thresholds.selfHarm})`,
        );
        this.logger.log(
          "Privacy: Content safety sends text to YOUR Azure tenant only (user-controlled)",
        );
      }
    } else {
      this.client = null;
      this.logger.log("Content Safety DISABLED (CONTENT_SAFETY_ENABLED=false)");
    }
  }

  /**
   * Check if content safety is enabled
   */
  isEnabled(): boolean {
    return this.enabled && this.client !== null;
  }

  /**
   * Analyze text for safety violations
   * Returns safe=true if no violations, safe=false with details otherwise
   */
  async analyzeText(text: string): Promise<ContentSafetyResult> {
    const startTime = Date.now();

    // If not enabled, pass through
    if (!this.isEnabled()) {
      return {
        safe: true,
        violations: [],
        analysisTime: Date.now() - startTime,
      };
    }

    try {
      const options = {
        text,
        categories: [
          ContentSafetyCategory.HATE,
          ContentSafetyCategory.VIOLENCE,
          ContentSafetyCategory.SEXUAL,
          ContentSafetyCategory.SELF_HARM,
        ],
      };

      const response = await this.client!.path("/text:analyze").post({
        body: options,
      });

      if (response.status !== "200") {
        this.logger.error(
          `Content Safety API error: ${response.status} - ${JSON.stringify(response.body)}`,
        );
        // Fail open: allow content if API fails
        return {
          safe: true,
          violations: [],
          analysisTime: Date.now() - startTime,
        };
      }

      const result = response.body as any;
      const violations: ContentSafetyResult["violations"] = [];

      // Check each category against thresholds
      const categoryResults = result.categoriesAnalysis || [];

      for (const categoryResult of categoryResults) {
        const category = categoryResult.category as ContentSafetyCategory;
        const severity = categoryResult.severity || 0;
        let threshold = 4; // Default

        switch (category) {
          case ContentSafetyCategory.HATE:
            threshold = this.thresholds.hate;
            break;
          case ContentSafetyCategory.VIOLENCE:
            threshold = this.thresholds.violence;
            break;
          case ContentSafetyCategory.SEXUAL:
            threshold = this.thresholds.sexual;
            break;
          case ContentSafetyCategory.SELF_HARM:
            threshold = this.thresholds.selfHarm;
            break;
        }

        if (severity >= threshold) {
          violations.push({
            category,
            severity,
            threshold,
          });
        }
      }

      const safe = violations.length === 0;
      const analysisTime = Date.now() - startTime;

      if (!safe) {
        this.logger.warn(
          `Content safety violations detected: ${violations.map((v) => `${v.category}(${v.severity}/${v.threshold})`).join(", ")}`,
        );
      }

      return {
        safe,
        violations,
        analysisTime,
      };
    } catch (error) {
      this.logger.error(`Content safety analysis failed: ${error.message}`);
      // Fail open: allow content if analysis fails
      return {
        safe: true,
        violations: [],
        analysisTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Validate prompt input (convenience method)
   */
  async validatePrompt(prompt: string): Promise<ContentSafetyResult> {
    return this.analyzeText(prompt);
  }

  /**
   * Validate LLM response (convenience method)
   */
  async validateResponse(response: string): Promise<ContentSafetyResult> {
    return this.analyzeText(response);
  }

  /**
   * Get current configuration
   */
  getConfig(): {
    enabled: boolean;
    thresholds: typeof this.thresholds;
  } {
    return {
      enabled: this.enabled,
      thresholds: { ...this.thresholds },
    };
  }
}
