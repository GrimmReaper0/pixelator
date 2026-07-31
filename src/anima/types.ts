export interface WorkflowBinding { node: string; field: string }
export interface AnimaBindings {
  positivePrompt: WorkflowBinding;
  negativePrompt?: WorkflowBinding;
  seed: WorkflowBinding;
  width?: WorkflowBinding;
  height?: WorkflowBinding;
  steps?: WorkflowBinding;
  referenceImage?: WorkflowBinding;
  ipAdapterStrength?: WorkflowBinding;
  outputPrefix?: WorkflowBinding;
}
export interface AnimaGenerationRequest {
  prompt: string;
  negativePrompt?: string;
  seed?: number;
  width?: number;
  height?: number;
  steps?: number;
  referenceImage?: string;
  ipAdapterStrength?: number;
  outputPrefix?: string;
}
export interface ComfyQueueResponse { prompt_id: string; number: number; node_errors?: Record<string, unknown> }
