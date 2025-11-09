import {
  Injectable,
  Logger,
  InternalServerErrorException,
  BadRequestException
} from '@nestjs/common';
import { AgentQueryDto } from './agent-query.dto';
import { config } from 'dotenv';
import { AzureOpenAI } from 'openai';
import axios from 'axios';
import { AGENT_MODELS } from '../shared/agent-models.constants';
import { ModelConfig } from '../shared/agent-models.interface';
import { ModelType } from '../shared/agent-models.enum';

config();

@Injectable()
export class AgentService {
  private readonly logger = new Logger(AgentService.name);
  private readonly models: ModelConfig[] = AGENT_MODELS;
  private readonly endpoint = process.env.AZURE_OPENAI_ENDPOINT;
  private readonly apiKey = process.env.AZURE_OPENAI_API_KEY;
  // No longer need a global apiVersion or getDeployment; use model object directly

  async queryAgent(dto: AgentQueryDto): Promise<{ answer: string; model: string; raw: any }> {
    this.logger.log(`Received prompt for model ${dto.model}: ${dto.prompt}`);
    const model = this.models.find((m) => m.name === dto.model);
    if (!model) {
      this.logger.error(`Unsupported model: ${dto.model}`);
      throw new BadRequestException(`Unsupported model: ${dto.model}`);
    }
    if (!this.endpoint || !this.apiKey) {
      this.logger.error('Azure OpenAI endpoint or API key not configured');
      throw new InternalServerErrorException('Azure OpenAI endpoint or API key not configured');
    }
    try {
      if (model.type === ModelType.CHAT) {
        return await this.handleChatCompletion(dto, model);
      } else if (model.type === ModelType.RESPONSE) {
        return await this.handleResponseCompletion(dto, model);
      } else {
        throw new InternalServerErrorException('Unknown model type');
      }
    } catch (err) {
      console.log(err);
      this.logger.error(`Azure OpenAI call failed: ${err}`);
      throw new InternalServerErrorException('Failed to get response from Azure OpenAI');
    }
  }

  private async handleChatCompletion(dto: AgentQueryDto, modelObj: any): Promise<{ answer: string; model: string; raw: any }> {
    const client = new AzureOpenAI({
      endpoint: this.endpoint,
      apiKey: this.apiKey,
      deployment: modelObj.deployment,
      apiVersion: modelObj.apiVersion
    });
    const response = await client.chat.completions.create({
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: dto.prompt }
      ],
      max_tokens: 2048,
      model: modelObj.name
    });
    const answer = response.choices?.[0]?.message?.content ?? '';
    this.logger.log(`Responding with: ${answer}`);
    return { answer, model: modelObj.name, raw: response };
  }

  private async handleResponseCompletion(dto: AgentQueryDto, modelObj: any): Promise<{ answer: string; model: string; raw: any }> {
    let baseEndpoint = this.endpoint;
    if (baseEndpoint && baseEndpoint.endsWith('/')) {
      baseEndpoint = baseEndpoint.slice(0, -1);
    }
    const url = `${baseEndpoint}/openai/responses?api-version=${modelObj.apiVersion}`;
    const payload = {
      input: dto.prompt,
      model: modelObj.deployment
    };
    try {
      const res = await axios.post(url, payload, {
        headers: {
          'Content-Type': 'application/json',
          'api-key': this.apiKey
        },
      });
      this.logger.debug(`Full Azure Codex response: ${JSON.stringify(res.data)}`);
      const data = res.data;
      let answer = '';
      // Try to extract Codex answer from output[1].content[0].text
      if (
        data &&
        typeof data === 'object' &&
        'output' in data &&
        Array.isArray((data as { output: unknown[] }).output)
      ) {
        const outputArr = (data as { output: any[] }).output;
        if (
          outputArr.length > 1 &&
          outputArr[1] &&
          typeof outputArr[1] === 'object' &&
          'content' in outputArr[1] &&
          Array.isArray(outputArr[1].content) &&
          outputArr[1].content.length > 0 &&
          outputArr[1].content[0] &&
          typeof outputArr[1].content[0] === 'object' &&
          'text' in outputArr[1].content[0] &&
          typeof outputArr[1].content[0].text === 'string'
        ) {
          answer = outputArr[1].content[0].text;
        }
      }
      // Fallbacks: try 'text', 'output[0].text', 'output', 'choices[0].text'
      if (!answer && data && typeof data === 'object' && 'text' in data && typeof (data as { text: unknown }).text === 'string') {
        const textVal = (data as { text: unknown }).text;
        if (typeof textVal === 'string' && textVal.trim()) {
          answer = textVal;
        }
      }
      if (!answer && data && typeof data === 'object' && 'output' in data && Array.isArray((data as { output: unknown }).output)) {
        const outputArr = (data as { output: unknown[] }).output;
        if (outputArr.length > 0 && outputArr[0] && typeof outputArr[0] === 'object' && 'text' in outputArr[0] && typeof (outputArr[0] as { text: unknown }).text === 'string') {
          const textVal = (outputArr[0] as { text: unknown }).text;
          if (typeof textVal === 'string' && textVal.trim()) {
            answer = textVal;
          }
        }
      }
      if (!answer && data && typeof data === 'object' && 'output' in data && typeof (data as { output: unknown }).output === 'string') {
        const outputVal = (data as { output: unknown }).output;
        if (typeof outputVal === 'string' && outputVal.trim()) {
          answer = outputVal;
        }
      }
      if (!answer && data && typeof data === 'object' && 'choices' in data && Array.isArray((data as { choices: unknown[] }).choices)) {
        const choicesArr = (data as { choices: unknown[] }).choices;
        if (choicesArr.length > 0 && choicesArr[0] && typeof choicesArr[0] === 'object' && 'text' in choicesArr[0] && typeof (choicesArr[0] as { text: unknown }).text === 'string') {
          const textVal = (choicesArr[0] as { text: unknown }).text;
          if (typeof textVal === 'string' && textVal.trim()) {
            answer = textVal;
          }
        }
      }
      // Fallback to stringified data (should not happen in normal use)
      if (!answer) {
        answer = JSON.stringify(data);
      }
      this.logger.log(`Responding with: ${answer}`);
      return { answer, model: modelObj.name, raw: data };
    } catch (err) {
      if (
        err &&
        typeof err === 'object' &&
        'response' in err &&
        err.response &&
        typeof err.response === 'object' &&
        'data' in err.response
      ) {
        this.logger.error(`Azure OpenAI Codex error response: ${JSON.stringify((err.response as { data: unknown }).data)}`);
      }
      throw err;
    }
  }

}
