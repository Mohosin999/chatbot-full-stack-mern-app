import Chat from "../../model/Chat";
import genAI from "../../config/gemini";
import { notFound } from "../../utils/error";

const generateChatTitle = async (
  userPrompt: string,
  assistantResponse: string
): Promise<string> => {
  const titleModel = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
  });

  const prompt = `Based on this conversation, generate a concise chat title (3 words) that summarizes the main topic. Do not use quotation marks, punctuation, or emojis. Return only the title as plain text.

User: ${userPrompt}
Assistant: ${assistantResponse}`;

  const result = await titleModel.generateContent(prompt);
  return result.response.text().trim();
};

const createMessage = async ({
  userId,
  chatId,
  prompt,
}: {
  userId: string;
  chatId: string;
  prompt: string;
}) => {
  const chat = await Chat.findOne({ userId, _id: chatId });
  if (!chat) {
    throw notFound();
  }

  chat.messages.push({
    role: "user",
    content: prompt,
    timestamp: Date.now(),
  });

  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
  });

  const result = await model.generateContent(prompt);
  const text = result.response.text();

  const reply: Record<string, unknown> = {
    role: "assistant",
    content: text,
    timestamp: Date.now(),
  };

  chat.messages.push(reply as any);

  const needsTitle =
    !chat.name || /^(new chat|untitled)/i.test(chat.name.trim());

  if (needsTitle) {
    try {
      const generatedTitle = await generateChatTitle(prompt, text);
      if (generatedTitle) {
        chat.name = generatedTitle;
        reply.chatName = generatedTitle;
      }
    } catch (err) {
      console.error("Failed to generate chat title:", (err as Error).message);
    }
  }

  await chat.save();

  return reply;
};

export { createMessage };
