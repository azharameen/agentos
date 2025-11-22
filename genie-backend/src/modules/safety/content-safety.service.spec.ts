import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { ContentSafetyService } from "./content-safety.service";

describe("ContentSafetyService", () => {
  let service: ContentSafetyService;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContentSafetyService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => {
              const config: Record<string, any> = {
                "app.contentSafety.enabled": false, // Disabled by default for tests
                "app.contentSafety.endpoint": undefined,
                "app.contentSafety.apiKey": undefined,
                "app.contentSafety.thresholds.hate": 4,
                "app.contentSafety.thresholds.violence": 4,
                "app.contentSafety.thresholds.sexual": 4,
                "app.contentSafety.thresholds.selfHarm": 4,
              };
              return config[key] ?? defaultValue;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<ContentSafetyService>(ContentSafetyService);
    configService = module.get<ConfigService>(ConfigService);
  });

  describe("Service Initialization", () => {
    it("should be defined", () => {
      expect(service).toBeDefined();
    });

    it("should be disabled by default in tests", () => {
      expect(service.isEnabled()).toBe(false);
    });

    it("should return config", () => {
      const config = service.getConfig();

      expect(config.enabled).toBe(false);
      expect(config.thresholds).toEqual({
        hate: 4,
        violence: 4,
        sexual: 4,
        selfHarm: 4,
      });
    });
  });

  describe("Content Analysis (Disabled Mode)", () => {
    it("should pass through all content when disabled", async () => {
      const result = await service.analyzeText("Test content");

      expect(result.safe).toBe(true);
      expect(result.violations).toEqual([]);
      expect(result.analysisTime).toBeDefined();
    });

    it("should pass unsafe content when disabled", async () => {
      const result = await service.analyzeText("Potentially harmful content");

      expect(result.safe).toBe(true);
      expect(result.violations).toEqual([]);
    });
  });

  describe("Convenience Methods", () => {
    it("should validate prompt (disabled)", async () => {
      const result = await service.validatePrompt("Test prompt");

      expect(result.safe).toBe(true);
      expect(result.violations).toEqual([]);
    });

    it("should validate response (disabled)", async () => {
      const result = await service.validateResponse("Test response");

      expect(result.safe).toBe(true);
      expect(result.violations).toEqual([]);
    });
  });

  describe("Configuration", () => {
    it("should expose thresholds configuration", () => {
      const config = service.getConfig();

      expect(config.thresholds.hate).toBe(4);
      expect(config.thresholds.violence).toBe(4);
      expect(config.thresholds.sexual).toBe(4);
      expect(config.thresholds.selfHarm).toBe(4);
    });
  });

  describe("Integration Behavior", () => {
    it("should handle empty text", async () => {
      const result = await service.analyzeText("");

      expect(result.safe).toBe(true);
    });

    it("should handle very long text", async () => {
      const longText = "a".repeat(10000);
      const result = await service.analyzeText(longText);

      expect(result.safe).toBe(true);
      expect(result.analysisTime).toBeGreaterThanOrEqual(0);
    });

    it("should handle special characters", async () => {
      const result = await service.analyzeText(
        "Test with 特殊字符 and émojis 🎉",
      );

      expect(result.safe).toBe(true);
    });
  });

  describe("Performance", () => {
    it("should analyze text quickly when disabled", async () => {
      const start = Date.now();
      await service.analyzeText("Performance test");
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(100); // Should be instant when disabled
    });
  });
});

/**
 * NOTE: Integration tests with actual Azure Content Safety API
 * would require real credentials and should be in a separate test suite
 * marked with @integration decorator or separate test file.
 *
 * Example integration test structure:
 *
 * describe('ContentSafetyService Integration', () => {
 *   beforeEach(() => {
 *     // Mock ConfigService to return enabled=true + real endpoint/key
 *   });
 *
 *   it('should detect hate speech', async () => {
 *     const result = await service.analyzeText('hateful content here');
 *     expect(result.safe).toBe(false);
 *     expect(result.violations).toContainEqual(
 *       expect.objectContaining({ category: ContentSafetyCategory.HATE })
 *     );
 *   });
 * });
 */
