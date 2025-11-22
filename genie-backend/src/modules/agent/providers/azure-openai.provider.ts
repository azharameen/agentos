import { Provider } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AzureOpenAI } from "openai";

/**
 * Azure OpenAI Provider Token
 * Use this token to inject the AzureOpenAI client
 */
export const AZURE_OPENAI_CLIENT = "AZURE_OPENAI_CLIENT";

/**
 * Azure OpenAI Provider Factory
 * Creates a singleton AzureOpenAI client instance using ConfigService
 * This ensures we don't create a new client on every request
 */
export const AzureOpenAIProvider: Provider = {
  provide: AZURE_OPENAI_CLIENT,
  inject: [ConfigService],
  useFactory: (configService: ConfigService): AzureOpenAI => {
    const endpoint = configService.get<string>("app.azure.endpoint");
    const apiKey = configService.get<string>("app.azure.apiKey");
    const apiVersion = configService.get<string>("app.azure.apiVersion");

    if (!endpoint || !apiKey) {
      throw new Error(
        "Azure OpenAI endpoint and API key must be configured in environment",
      );
    }

    return new AzureOpenAI({
      endpoint,
      apiKey,
      apiVersion,
    });
  },
};
