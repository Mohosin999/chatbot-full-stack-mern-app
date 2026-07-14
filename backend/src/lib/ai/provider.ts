export interface GenerationConfig {
  temperature?: number;
  topP?: number;
  topK?: number;
  maxOutputTokens?: number;
  // JSON mode: tell AI to return response in a specific format
  responseMimeType?: string; // "application/json" for JSON mode
  responseSchema?: Record<string, unknown>; // JSON Schema for structured output
}

export interface FunctionDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>; // JSON Schema for the function's arguments
}

export interface ToolDefinition {
  function: FunctionDefinition;
}

export interface ToolCall {
  name: string;
  args: string; // JSON string of arguments
  id: string;
}

export interface ToolResult {
  name: string;
  result: string; // JSON string of the result
  id: string;
}

// Callback that the message pipeline provides to execute a function call
export type FunctionCallHandler = (call: ToolCall) => Promise<ToolResult>;

export interface AIProvider {
  readonly name: string;

  // Stream a response — handles function calling loop internally
  generateContentStream(
    contents: { role: string; parts: { text: string }[] }[],
    signal?: AbortSignal,
    options?: {
      config?: GenerationConfig;
      tools?: ToolDefinition[];
      onFunctionCall?: FunctionCallHandler;
    }
  ): AsyncGenerator<string>;

  // Non-streaming generation — also handles function calling loop internally
  generateContent(
    contents: { role: string; parts: { text: string }[] }[],
    options?: {
      config?: GenerationConfig;
      tools?: ToolDefinition[];
      onFunctionCall?: FunctionCallHandler;
    }
  ): Promise<string>;

  // Simple text prompt — no tools/config (used for title generation, summarization)
  generateContentText(prompt: string): Promise<string>;
}

export function isQuotaError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    msg.includes("429") ||
    msg.includes("quota") ||
    msg.includes("Quota") ||
    msg.includes("insufficient_quota") ||
    msg.includes("quota_exceeded") ||
    msg.includes("rate_limit")
  );
}
