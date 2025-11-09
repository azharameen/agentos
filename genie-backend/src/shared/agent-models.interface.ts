import { ModelType } from './agent-models.enum';

export interface ModelConfig {
  name: string;
  deployment: string;
  apiVersion: string;
  type: ModelType;
}
