# Structured Outputs & Function Calling Implementation

## Overview

This document covers two related AI features added to the app:

- **Structured Outputs (JSON Mode)** — Forces the AI to return responses in a strict JSON format matching a user-provided JSON Schema. No more "sometimes JSON, sometimes text" inconsistency.
- **Function Calling / Tool Use** — Lets the AI call backend-registered functions (tools) when it needs to compute something or fetch data. The AI decides when to call a tool, waits for the result, then gives the final answer.

All related code lives in `backend/src/lib/ai/` (4 files) and the message pipeline at `backend/src/lib/message/index.ts`.

---

## Architecture

```
backend/src/lib/ai/
├── provider.ts              ← AIProvider interface + type definitions
├── gemini-provider.ts       ← Gemini implementation with JSON mode & function calling
├── tools/
│   └── index.ts             ← Tool registry + built-in tools (calculator, get_current_time)
└── index.ts                 ← Provider factory (unchanged)

backend/src/lib/message/
└── index.ts                 ← Updated: passes schema/tools from request to provider

backend/src/validator/
└── chat.ts                  ← Updated: validates new schema & tools fields

backend/src/api/v1/message/controllers/
└── streamCreate.ts          ← Updated: passes new request fields to streamMessage
```

---

## 1. Structured Outputs (JSON Mode)

### What it does

Normally the AI returns free-text responses. With JSON mode, you provide a **JSON Schema** and the AI guarantees the response is valid JSON that matches that schema. No prompt engineering required — the model itself enforces the format.

### When to use

- Extracting structured data from user input (forms, parsing)
- Building APIs where the AI output needs to be machine-readable
- Frontend needs predictable JSON to render directly

### Implementation

#### Step 1: Types in `provider.ts`

```typescript
export interface GenerationConfig {
  temperature?: number;
  topP?: number;
  topK?: number;
  maxOutputTokens?: number;
  responseMimeType?: string; // "application/json" for JSON mode
  responseSchema?: Record<string, unknown>; // JSON Schema for structured output
}
```

`responseMimeType: "application/json"` tells Gemini to output JSON. `responseSchema` is the JSON Schema the output must follow.

#### Step 2: Gemini provider passes config to the model

In `gemini-provider.ts`, the `getModel()` method builds `generationConfig`:

```typescript
private getModel(config?: GenerationConfig) {
  const hasConfig = config && Object.keys(config).length > 0;
  return genAI.getGenerativeModel({
    model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
    ...(hasConfig ? { generationConfig: this.mapConfig(config!) } : {}),
  });
}

// Convert our generic config to Gemini's format
private mapConfig(config: GenerationConfig): Record<string, unknown> {
  const gc: Record<string, unknown> = {};
  if (config.temperature !== undefined) gc.temperature = config.temperature;
  if (config.topP !== undefined) gc.topP = config.topP;
  if (config.topK !== undefined) gc.topK = config.topK;
  if (config.maxOutputTokens !== undefined) gc.maxOutputTokens = config.maxOutputTokens;
  if (config.responseMimeType) gc.responseMimeType = config.responseMimeType;
  if (config.responseSchema) gc.responseSchema = config.responseSchema;
  return gc;
}
```

Only non-undefined fields are included. If no config is provided, the model runs with defaults.

#### Step 3: Message pipeline passes schema from request

In `message/index.ts`, the schema from the request is converted to a `GenerationConfig`:

```typescript
const genConfig: GenerationConfig | undefined = schema
  ? {
      responseMimeType: "application/json",
      responseSchema: schema,
    }
  : undefined;

// Later, passed to the provider:
const genStream = provider.generateContentStream(contents, signal, {
  config: genConfig,
  tools,
  onFunctionCall: async (call) => executeTool(call),
});
```

If no schema is provided, `genConfig` is `undefined` and the AI responds in free text as before.

---

### How to use (API request)

```json
// POST /api/v1/messages/stream
{
  "chatId": "abc123",
  "prompt": "Rahim er details dao. Name: Rahim, Age: 20, City: Dhaka",
  "schema": {
    "type": "object",
    "properties": {
      "name": { "type": "string" },
      "age": { "type": "number" },
      "city": { "type": "string" }
    },
    "required": ["name", "age", "city"]
  }
}
```

**Response (SSE stream):**
```
data: {"chunk":"{\"name\":\"Rahim\","}
data: {"chunk":"\"age\":20,"}
data: {"chunk":"\"city\":\"Dhaka\"}"}
data: {"done":true,"message":{"role":"assistant","content":"{\"name\":\"Rahim\",\"age\":20,\"city\":\"Dhaka\"}","timestamp":123456789}}
```

Note: The JSON is streamed character by character (or chunk by chunk). You can `JSON.parse()` the full `content` in the `done` event.

---

## 2. Function Calling / Tool Use

### What it does

Tools are backend-registered functions that the AI can **choose to call** during a conversation. The flow:

1. User asks a question (e.g., "25 * 4 + 10 koto?")
2. AI decides it needs the `calculator` tool
3. Provider pauses text generation, calls the tool with the AI's arguments
4. Tool executes (e.g., `calculator({ expression: "25*4+10" })` → `{ result: 110 }`)
5. Provider sends the result back to the AI
6. AI continues generating: "Answer is 110"

The entire loop happens **inside the provider** — the message pipeline just provides an `onFunctionCall` callback.

### Implementation

#### Step 1: Types in `provider.ts`

```typescript
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

export type FunctionCallHandler = (call: ToolCall) => Promise<ToolResult>;
```

The `AIProvider` interface updated with optional `tools` and `onFunctionCall`:

```typescript
export interface AIProvider {
  generateContentStream(
    contents: { role: string; parts: { text: string }[] }[],
    signal?: AbortSignal,
    options?: {
      config?: GenerationConfig;
      tools?: ToolDefinition[];
      onFunctionCall?: FunctionCallHandler;
    }
  ): AsyncGenerator<string>;
}
```

#### Step 2: Gemini provider — function calling loop

The key method `_streamWithTools` handles the recursive call loop:

```typescript
private async *_streamWithTools(
  contents, signal, tools, onFunctionCall, config,
  depth: number = 0, // ← prevents infinite tool loops (max 5 rounds)
): AsyncGenerator<string> {
  if (depth > 5) {
    yield "Too many tool calls. Try a simpler request.";
    return;
  }

  // Round 1: Call Gemini with tools declared
  const model = this.getModel(config);
  const request: any = { contents: this.mapContents(contents) };
  if (tools?.length) {
    request.tools = this.mapTools(tools);
  }

  const result = await model.generateContentStream(request);

  // Stream all text from this round
  for await (const chunk of result.stream) {
    if (signal?.aborted) break;
    const text = chunk.text();
    if (text) yield text;
  }
  if (signal?.aborted) return;

  // Check the aggregated response for function calls
  const response = await result.response;
  const rawCalls = (response as any).functionCalls?.();
  const functionCalls = rawCalls as
    Array<{ name: string; args: Record<string, unknown>; id?: string }> | undefined;

  if (functionCalls?.length && onFunctionCall) {
    // Execute all tools the AI wants to call
    const toolResults: ToolResult[] = [];
    for (const fc of functionCalls) {
      const toolResult = await onFunctionCall({
        name: fc.name,
        args: JSON.stringify(fc.args ?? {}),
        id: fc.id || fc.name,
      });
      toolResults.push(toolResult);
    }

    // Build Gemini-format parts: first the AI's function call, then our response
    const fcParts = functionCalls.map(fc => ({
      functionCall: { name: fc.name, args: fc.args ?? {} },
    }));
    const frParts = toolResults.map(tr => ({
      functionResponse: { name: tr.name, response: { result: tr.result } },
    }));

    // Append to conversation and recurse
    const updatedContents = [
      ...contents,
      { role: "model", parts: fcParts },   // "Here's what I want to call"
      { role: "user", parts: frParts },     // "Here are the results"
    ];

    yield* this._streamWithTools(
      updatedContents, signal, tools, onFunctionCall, config, depth + 1
    );
    // Round 2: AI sees tool results and gives final text answer
  }
}
```

The same pattern exists in `_contentWithTools` for non-streaming calls.

#### Step 3: Tool Registry in `tools/index.ts`

```typescript
import type { ToolDefinition, ToolCall, ToolResult } from "../provider";

interface RegisteredTool {
  definition: ToolDefinition;
  execute: (args: Record<string, unknown>) => Promise<string>;
}

const registry = new Map<string, RegisteredTool>();

export function registerTool(
  name: string,
  definition: ToolDefinition,
  execute: (args: Record<string, unknown>) => Promise<string>,
): void {
  registry.set(name, { definition, execute });
}

export function getToolDefinitionsByNames(names: string[]): ToolDefinition[] {
  return names
    .map(name => registry.get(name)?.definition)
    .filter((t): t is ToolDefinition => !!t);
}

export async function executeTool(call: ToolCall): Promise<ToolResult> {
  const tool = registry.get(call.name);
  if (!tool) {
    return {
      name: call.name,
      result: JSON.stringify({ error: `Unknown tool: "${call.name}"` }),
      id: call.id,
    };
  }
  try {
    const args = JSON.parse(call.args);
    const result = await tool.execute(args);
    return { name: call.name, result, id: call.id };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { name: call.name, result: JSON.stringify({ error: message }), id: call.id };
  }
}
```

**Safety design:**
- Unknown tool → returns error JSON (AI handles it gracefully)
- Tool throws → catches and returns error JSON
- Registry is a `Map`, names must match exactly

#### Step 4: Message pipeline connects tools

In `message/index.ts`:

```typescript
import { getToolDefinitionsByNames, executeTool } from "../ai/tools";

// Inside streamMessage():
const tools = toolNames && toolNames.length > 0
  ? getToolDefinitionsByNames(toolNames)
  : undefined;

const genStream = provider.generateContentStream(contents, signal, {
  config: genConfig,
  tools,
  onFunctionCall: async (call) => {
    return executeTool(call);
  },
});
```

The message pipeline passes:
- `tools` — the tool definitions (so AI knows what it can call)
- `onFunctionCall` — a callback that goes to the registry's `executeTool`

---

### Built-in Tools

Currently 2 tools registered in `tools/index.ts`:

#### `get_current_time`

```typescript
registerTool(
  "get_current_time",
  {
    function: {
      name: "get_current_time",
      description: "Get the current date and time",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  },
  async () => {
    return JSON.stringify({
      datetime: new Date().toISOString(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });
  }
);
```

- **No arguments needed**
- Returns ISO datetime + timezone string
- AI calls this when user asks "what time is it?", "today's date?", etc.

#### `calculator`

```typescript
registerTool(
  "calculator",
  {
    function: {
      name: "calculator",
      description: "Evaluate a mathematical expression. Supports +, -, *, /, parentheses, and decimal numbers.",
      parameters: {
        type: "object",
        properties: {
          expression: {
            type: "string",
            description: "The math expression to evaluate, e.g. '2 + 2' or '(15 * 3) / 5'",
          },
        },
        required: ["expression"],
      },
    },
  },
  async (args) => {
    const { expression } = args as { expression: string };
    const sanitized = String(expression).replace(/\s/g, "");
    // Only allow digits, math operators, parens, dots, percent
    if (!/^[\d+\-*/().%]+$/.test(sanitized)) {
      return JSON.stringify({ error: "Invalid expression" });
    }
    try {
      const result = Function(`"use strict"; return (${sanitized})`)();
      return JSON.stringify({ expression: sanitized, result });
    } catch (err: unknown) {
      return JSON.stringify({ error: (err as Error).message });
    }
  }
);
```

- **Argument:** `expression` (string) — the math expression
- **Safety:** Regex `^[\d+\-*/().%]+$` blocks all letters/strings, making `Function()` safe
- AI calls this for any math question

---

### How to use (API request)

```json
// POST /api/v1/messages/stream
{
  "chatId": "abc123",
  "prompt": "25 * 4 + 10 koto? ar ekhon ki time?",
  "tools": ["calculator", "get_current_time"]
}
```

**What happens internally (invisible to user):**

```
Round 1:
  User: "25 * 4 + 10 koto? ar ekhon ki time?"
  AI: [streams nothing yet, decides to call tools]
  AI calls: calculator({ expression: "25*4+10" })
  AI calls: get_current_time({})
  
  Tool results:
    calculator → { result: 110 }
    get_current_time → { datetime: "2026-07-13T10:30:00Z", timezone: "Asia/Dhaka" }
  
Round 2 (recursive):
  System: [earlier context + function results]
  AI: "25 * 4 + 10 = 110. Ar ekhon somoy 4:30 PM (Bangladesh time)."
  [streams to user]
```

**Response stream (what user sees):**
```
data: {"chunk":"25 * 4 + 10 = 110."}
data: {"chunk":" Ar ekhon somoy 4:30 PM"}
data: {"chunk":" (Bangladesh time)."}
data: {"done":true,"message":{...}}
```

The tool calls and results are internal — user only sees the final answer.

---

## Adding a New Tool

1. Open `backend/src/lib/ai/tools/index.ts`

2. Call `registerTool()` at the bottom of the file:

```typescript
registerTool(
  "my_custom_tool",
  {
    function: {
      name: "my_custom_tool",
      description: "Explain what this tool does — AI uses this to decide when to call it",
      parameters: {
        type: "object",
        properties: {
          input1: {
            type: "string",
            description: "What this parameter is for",
          },
        },
        required: ["input1"],
      },
    },
  },
  async (args) => {
    // Your tool logic here
    const { input1 } = args as { input1: string };
    const result = await someApi(input1);
    return JSON.stringify({ success: true, data: result });
  }
);
```

3. In the API request, include the tool name:
```json
{ "tools": ["my_custom_tool", "calculator"] }
```

---

## Validator Changes

`backend/src/validator/chat.ts` — two new optional fields:

```typescript
export const createMessageSchema = z.object({
  chatId: z.string(),
  prompt: z.string().default(""),
  files: z.array(fileSchema).max(5).optional(),
  schema: z.record(z.unknown()).optional(),
  tools: z.array(z.string()).optional(),
}).refine((data) => data.prompt || (data.files && data.files.length > 0), {
  message: "Text prompt or at least one file is required",
});
```

- `schema` — any valid JSON Schema object
- `tools` — array of tool name strings (must match registered tool names)

---

## Files Changed Summary

| File | Change |
|------|--------|
| `backend/src/lib/ai/provider.ts` | Added `GenerationConfig`, `FunctionDefinition`, `ToolDefinition`, `ToolCall`, `ToolResult`, `FunctionCallHandler` types. Updated `AIProvider` interface with optional `config`/`tools`/`onFunctionCall` params. |
| `backend/src/lib/ai/gemini-provider.ts` | Added `getModel(config?)` with generation config. Added `_streamWithTools()` and `_contentWithTools()` — recursive async generators that handle the function calling loop with 5-round depth limit. |
| `backend/src/lib/ai/tools/index.ts` | **NEW** — Tool registry (`Map`-based), `registerTool()`, `getToolDefinitionsByNames()`, `executeTool()`. Built-in tools: `calculator`, `get_current_time`. |
| `backend/src/lib/message/index.ts` | Imports tools registry. Builds `GenerationConfig` from schema. Passes `tools` + `onFunctionCall` to provider. |
| `backend/src/validator/chat.ts` | Added `schema: z.record(z.unknown()).optional()` and `tools: z.array(z.string()).optional()` to Zod schema. |
| `backend/src/api/v1/message/controllers/streamCreate.ts` | Destructures `schema` and `tools` from parsed body, passes to `streamMessage()`. |

---

## Design Decisions

| Decision | Why |
|----------|-----|
| **Tool names come from client, not definitions** | Security — client can only enable/disable predefined backend tools, not inject arbitrary code |
| **Function calling loop inside provider** | Keeps message pipeline clean — it just provides a callback. Provider handles all recursion |
| **5-round depth limit** | Prevents infinite loops if AI keeps calling tools |
| **Schema is optional** | Backward compatible — requests without `schema` get free-text as before |
| **`responseMimeType: "application/json"` for JSON mode** | Gemini-native JSON enforcement — no prompt engineering needed |
| **Tools registry uses Map** | O(1) lookup, names must match exactly (no ambiguity) |
| **Tool errors returned as JSON** | AI receives structured error and can explain it to user or retry |

---

## DSA Used

| DSA | Where | Purpose |
|-----|-------|---------|
| **Recursion** | `gemini-provider.ts` | Multi-round function calling loop (depth ≤ 5) |
| **Map (Hash Table)** | `tools/index.ts` | O(1) tool lookup by name |
| **JSON Schema** | `provider.ts`, request validation | Schema-constrained output formatting |
| **Async Generator** | `gemini-provider.ts` | Streaming text + recursive tool loop |

---

## Directory Layout

```
myapp/
├── backend/src/
│   ├── lib/ai/
│   │   ├── provider.ts           ← Types + interface
│   │   ├── gemini-provider.ts    ← Gemini implementation
│   │   ├── tools/
│   │   │   └── index.ts          ← Registry + built-in tools
│   │   └── index.ts              ← Provider factory
│   ├── lib/message/
│   │   └── index.ts              ← Updated pipeline
│   ├── validator/
│   │   └── chat.ts               ← Updated schema
│   └── api/v1/message/controllers/
│       └── streamCreate.ts       ← Updated controller
└── json.md                       ← This file
```
