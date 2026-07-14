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
