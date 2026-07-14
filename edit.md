# Edit Message Feature — Full Flow

## Overview

Users can edit any previously sent message. After editing and clicking **Send**, the edited message replaces the original, all subsequent messages are removed, and the AI generates a fresh response — exactly like ChatGPT.

---

## Flow Diagram

```
User clicks "Edit" on a message
        │
        ▼
Message enters edit mode (textarea)
        │
        ▼
User edits text → clicks "Send"
        │
        ├──────────────────────────────────────────────────────┐
        ▼                                                      ▼
  Frontend (optimistic)                                  Backend API
  ──────────────────────                                 ────────────
  1. updateMessageContent()     ────── PATCH ─────►     streamEditMessage()
  2. removeMessagesAfter()                                ├─ Find chat + message
  3. addTempMessage(streaming)                            ├─ Update content
  4. editMessageStream()                                  ├─ Remove subsequent msgs
                                                          ├─ Build context
        ◄─────── SSE stream ──────────                   ├─ Stream AI response
        │  chunk, chunk, ...                             └─ Save + return reply
        │
        ▼
  5. appendStreamChunk() (per chunk)
  6. finalizeAssistantMessage() (on done)
     ├─ Mark streaming done
     └─ Sync userMessageId
```

---

## Backend

### 1. Route — `backend/src/routes/index.ts`

```typescript
router.post(
  "/api/v1/messages/stream/edit",
  authenticate,
  messageController.streamEdit,
);
```

New `POST` endpoint protected by JWT authentication.

### 2. Controller — `backend/src/api/v1/message/controllers/streamEdit.ts`

```typescript
import { Request, Response, NextFunction } from "express";
import { streamEditMessage } from "../../../../lib/message";

const streamEdit = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const userId = req.user!.id;

  const { chatId, messageId, prompt } = req.body as {
    chatId: string;
    messageId: string;
    prompt: string;
  };

  if (!chatId || !messageId || !prompt?.trim()) {
    res.status(400).json({ message: "chatId, messageId, and prompt are required" });
    return;
  }

  const abortController = new AbortController();
  const signal = abortController.signal;

  req.on("close", () => {
    abortController.abort();
  });

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");

  try {
    const { stream, complete } = await streamEditMessage({
      userId,
      chatId,
      messageId,
      prompt: prompt.trim(),
      signal,
    });

    for await (const chunk of stream) {
      if (signal.aborted) break;
      res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
    }

    const reply = await complete();

    if (!signal.aborted) {
      res.write(`data: ${JSON.stringify({ done: true, message: reply })}\n\n`);
      res.end();
    }
  } catch (error) {
    if ((error as Error).name === "AbortError") return;
    const errorMessage = error instanceof Error ? error.message : "Stream failed";
    const isQuota = errorMessage.includes("429") || errorMessage.includes("quota") || errorMessage.includes("Quota");
    const friendlyMessage = isQuota
      ? "AI service quota exceeded. Please wait a moment and try again."
      : errorMessage.length > 200
        ? errorMessage.slice(0, 200) + "..."
        : errorMessage;
    console.error("[StreamEdit] Error:", friendlyMessage);
    res.write(`data: ${JSON.stringify({ error: friendlyMessage })}\n\n`);
    res.end();
  }
};

export default streamEdit;
```

### 3. Core Logic — `backend/src/lib/message/index.ts` — `streamEditMessage()`

This is the heart of the feature. It:

1. Finds the chat and the specific message by MongoDB `_id`
2. Updates the message content with the new prompt
3. Removes all messages after the edited one (`slice(0, msgIndex + 1)`)
4. Marks the messages array as modified for Mongoose
5. Builds the AI context from the updated (shorter) history
6. Streams a fresh AI response
7. On completion, pushes the assistant reply, saves to DB, and returns the reply with `userMessageId`

```typescript
const streamEditMessage = async ({
  userId,
  chatId,
  messageId,
  prompt,
  signal,
}: {
  userId: string;
  chatId: string;
  messageId: string;
  prompt: string;
  signal?: AbortSignal;
}) => {
  const chat = await Chat.findOne({ userId, _id: chatId });
  if (!chat) throw notFound();

  const msgIndex = chat.messages.findIndex(
    (msg) => msg._id?.toString() === messageId,
  );
  if (msgIndex === -1) throw notFound();

  // ── Update message + remove everything after it ──
  chat.messages[msgIndex].content = prompt;
  chat.messages = chat.messages.slice(0, msgIndex + 1);
  chat.markModified("messages");

  // ── Title generation (same as normal stream) ──
  const needsTitle =
    !chat.name || /^(new chat|untitled)/i.test(chat.name.trim());
  const titlePromise = needsTitle
    ? generateChatTitle(prompt)
    : Promise.resolve(null);

  // ── Context budget & compression ──
  const budget = contextBudget.allocate();
  const { compressed: prunedMessages, dropped: droppedMessages } =
    contextCompressor.compressConversation(chat.messages as any, budget.history);

  let droppedSummary = "";
  if (droppedMessages.length > 0) {
    droppedSummary = await summarizeConversation(
      droppedMessages.map((m) => ({ role: m.role, content: m.content })) as any,
    );
  }

  // ── Build contents array for AI ──
  const systemPrompt = `You are an AI assistant helping ${chat.userName}. Be helpful, accurate, and concise.`;
  const contents: { role: string; parts: { text: string }[] }[] = [
    { role: "user", parts: [{ text: `[System Context]\n${systemPrompt}` }] },
  ];

  if (droppedSummary) {
    contents.push({
      role: "user",
      parts: [{ text: `[Earlier context]: ${droppedSummary}` }],
    });
  }

  const historyMessages = prunedMessages.slice(0, -1);
  for (const msg of historyMessages) {
    contents.push({ role: msg.role, parts: [{ text: msg.content }] });
  }

  contents.push({ role: "user", parts: [{ text: prompt }] });

  // ── Token budget logging ──
  let tokenBudget = budget.total;
  const systemTokens = tokenCounter.count(systemPrompt);
  const historyTokens = tokenCounter.count(
    historyMessages.map((m) => m.content).join(" "),
  );
  const promptTokens = tokenCounter.count(prompt);
  tokenBudget -= systemTokens + historyTokens + promptTokens;

  if (tokenBudget < 100) {
    console.log(
      `[ContextBudget] Warning: only ${tokenBudget} tokens remaining for response`,
    );
  }

  contextBudget.logBudgetAllocation(budget, {
    system: systemTokens,
    history: historyTokens,
    prompt: promptTokens,
    total: systemTokens + historyTokens + promptTokens,
  });

  // ── AI stream ──
  const genStream = provider.generateContentStream(contents, signal, {
    onFunctionCall: async (call) => executeTool(call),
  });

  let fullText = "";
  const stream = (async function* () {
    for await (const chunk of genStream) {
      if (signal?.aborted) break;
      fullText += chunk;
      yield chunk;
    }
  })();

  // ── Complete handler (called after streaming ends) ──
  const complete = async () => {
    const reply: Record<string, unknown> = {
      role: "assistant",
      content: fullText,
      timestamp: Date.now(),
    };

    chat.messages.push(reply as any);

    const generatedTitle = await titlePromise;
    if (generatedTitle) {
      chat.name = generatedTitle;
      reply.chatName = generatedTitle;
    }

    await chat.save();

    // Return userMessageId so frontend can sync MongoDB _id
    const userMessage = chat.messages[chat.messages.length - 2];
    if (userMessage && userMessage._id) {
      reply.userMessageId = userMessage._id.toString();
    }

    return reply;
  };

  return { stream, complete };
};

export { streamMessage, streamEditMessage };
```

### 4. `userMessageId` — `backend/src/lib/message/index.ts` (inside `streamMessage.complete()` too)

Both `streamMessage` and `streamEditMessage` return `userMessageId` in the completion payload so the frontend can sync its temporary `Date.now()` ID with the real MongoDB `_id`:

```typescript
const userMessage = chat.messages[chat.messages.length - 2];
if (userMessage && userMessage._id) {
  reply.userMessageId = userMessage._id.toString();
}
```

---

## Frontend

### 1. Redux Thunk — `frontend/src/features/chat/chatSlice.ts` — `editMessageStream`

```typescript
export const editMessageStream = createAsyncThunk(
  "chat/editMessageStream",
  async (
    { chatId, messageId, prompt }: { chatId: string; messageId: string | number; prompt: string },
    { dispatch, rejectWithValue },
  ) => {
    const controller = new AbortController();
    _abortController = controller;

    try {
      const accessToken = localStorage.getItem("accessToken");
      if (!accessToken) {
        _abortController = null;
        return rejectWithValue("No authentication accessToken found");
      }

      const response = await fetch(
        `${import.meta.env.VITE_BASE_URL}/messages/stream/edit`,
        {
          method: "POST",
          signal: controller.signal,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ chatId, messageId, prompt }),
        },
      );

      if (!response.ok) {
        _abortController = null;
        const err = await response.json().catch(() => null);
        return rejectWithValue(
          err?.message || `Stream request failed (${response.status})`,
        );
      }

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = JSON.parse(line.slice(6));

          if (data.error) {
            _abortController = null;
            return rejectWithValue(data.error);
          }

          if (data.done) {
            _abortController = null;
            dispatch(finalizeAssistantMessage(data.message));
            if (data.message?.chatName) {
              dispatch(updateChatName({ chatId, chatName: data.message.chatName }));
            }
            return data.message;
          }

          if (data.chunk) {
            dispatch(appendStreamChunk(data.chunk));
          }
        }
      }

      _abortController = null;
      return rejectWithValue("Stream ended without completion event");
    } catch (error: any) {
      _abortController = null;
      if (error.name === "AbortError") {
        dispatch(finalizeAssistantMessage({}));
        return "aborted";
      }
      return rejectWithValue(error.message || "Stream request failed");
    }
  },
);
```

### 2. Reducers — `frontend/src/features/chat/chatSlice.ts`

#### `updateMessageContent`

Updates the content of a specific message by ID (optimistic UI update).

```typescript
updateMessageContent: (state, action) => {
  const { messageId, content } = action.payload as { messageId: string | number; content: string };
  if (!state.currentChat?.data?.messages) return;
  const msg = state.currentChat.data.messages.find((m) => m.id === messageId);
  if (msg) {
    msg.content = content;
  }
},
```

#### `removeMessagesAfter`

Finds a message by ID and removes all messages that come after it. The edited message itself is kept.

```typescript
removeMessagesAfter: (state, action) => {
  const { messageId } = action.payload as { messageId: string | number };
  if (!state.currentChat?.data?.messages) return;
  const index = state.currentChat.data.messages.findIndex((m) => m.id === messageId);
  if (index !== -1) {
    state.currentChat.data.messages = state.currentChat.data.messages.slice(0, index + 1);
  }
},
```

#### `finalizeAssistantMessage` (modified)

Now also syncs the user message's `id` from `Date.now()` (number) to the real MongoDB `_id` (string) returned by the backend as `userMessageId`. This ensures subsequent edits send a valid `messageId`.

```typescript
finalizeAssistantMessage: (state, action) => {
  if (!state.currentChat?.data?.messages) return;

  const payload = action.payload as Partial<Message> & { userMessageId?: string };

  const index = state.currentChat.data.messages.findIndex(
    (msg) => (msg as Message).isStreaming === true && msg.role === "assistant",
  );

  if (index !== -1) {
    const existing = state.currentChat.data.messages[index] as Message;
    state.currentChat.data.messages[index] = {
      ...existing,
      ...payload,
      isStreaming: false,
      isTemp: false,
    };
  }

  // Sync user message ID from backend response
  if (payload?.userMessageId && index > 0) {
    const userMsg = state.currentChat.data.messages[index - 1];
    if (userMsg && userMsg.role === "user") {
      userMsg.id = payload.userMessageId;
    }
  }
},
```

### 3. Extra Reducers — `frontend/src/features/chat/chatSlice.ts`

Without these lifecycle handlers, `isGenerating` stays `true` forever and the streaming placeholder (`"streaming-msg"`) is never cleaned up.

```typescript
.addCase(editMessageStream.pending, (state) => {
  state.isGenerating = true;
  state.error = null;
})
.addCase(editMessageStream.fulfilled, (state) => {
  state.isGenerating = false;
  state.error = null;
})
.addCase(editMessageStream.rejected, (state, action) => {
  state.isGenerating = false;
  state.error = action.payload as string;
  if (state.currentChat?.data?.messages) {
    state.currentChat.data.messages = state.currentChat.data.messages.filter(
      (msg) => !((msg as Message).isStreaming && msg.role === "assistant"),
    );
  }
})
```

### 4. UI Component — `frontend/src/components/Message.tsx`

Key parts of the edit UI:

- **Edit button**: Appears on hover at the bottom of user messages (pencil icon + "Edit" text)
- **Edit mode**: Message bubble expands with a styled textarea matching ChatInput's look
- **Send / Cancel**: "Cancel" discards changes; "Send" triggers the edit flow
- **Shortcuts**: `Enter` to send, `Shift+Enter` for newline, `Escape` to cancel

```typescript
const showEditButton = msg.role === "user" && onEdit && !isEditing && !msg.isStreaming;

return (
  <div className={`flex ${msg.role === "user" ? "justify-end group" : "justify-start"}`}>
    <div className={...}>
      {/* ... */}
      {showEditButton && (
        <button
          onClick={() => { setEditText(msg.content); setIsEditing(true); }}
          className="mt-1.5 flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:text-blue-500 dark:hover:text-blue-400"
        >
          <Pencil size={12} />
          Edit
        </button>
      )}
    </div>
  </div>
);
```

### 5. Orchestrator — `frontend/src/components/ContentArea.tsx` — `handleEdit`

Called when the user clicks "Send" in edit mode. It:

1. Optimistically updates the message content in Redux
2. Removes all messages after the edited one
3. Adds a streaming placeholder
4. Starts the edit stream

```typescript
const handleEdit = async (messageId: string | number, newContent: string) => {
  const chatId = currentChat?.data?.id;
  if (!chatId) return;

  dispatch(updateMessageContent({ messageId, content: newContent }));
  dispatch(removeMessagesAfter({ messageId }));

  dispatch(
    addTempMessage({
      id: "streaming-msg",
      role: "assistant",
      content: "",
      isStreaming: true,
      isTemp: true,
    }),
  );

  dispatch(editMessageStream({ chatId, messageId, prompt: newContent }) as any);
};
```

The `onEdit` prop is passed to `Message` only when `isGenerating` is `false`, preventing edits during active streaming:

```typescript
<Message key={msg.id} msg={msg} onEdit={isGenerating ? undefined : handleEdit} />
```

---

## Key Design Decisions

| Decision | Rationale |
|---|---|
| **Single streaming endpoint** (`POST /messages/stream/edit`) | Combines the DB update + AI streaming in one request; avoids two separate API calls |
| **Optimistic UI updates** | Message content and subsequent messages are updated immediately in Redux before the API responds, giving instant feedback |
| **`userMessageId` sync** | The frontend initially uses `Date.now()` as message ID. After the backend saves, it returns the real MongoDB `_id` and the frontend syncs it, so subsequent edits use the correct ID |
| **`markModified("messages")`** | Mongoose doesn't track `slice()` on mixed arrays; `markModified` ensures the change is persisted |
| **Edit disabled during generation** | `onEdit={isGenerating ? undefined : handleEdit}` prevents race conditions |
| **Reuses context pipeline** | `streamEditMessage` uses the same `ContextBudget`, `ContextCompressor`, and AI provider as the normal message stream, keeping behavior consistent |
