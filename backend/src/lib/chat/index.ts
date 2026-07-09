import Chat from "../../model/Chat";
import { notFound } from "../../utils/error";

interface IUser {
  id: string;
  name: string;
}

const createChat = async (user: IUser) => {
  const chatData = {
    userId: user.id,
    name: "New Chat",
    userName: user.name,
    messages: [],
  };

  const newChat = new Chat(chatData);
  await newChat.save();

  return {
    id: newChat.id,
    ...newChat.toObject(),
  };
};

const findAll = async (userId: string) => {
  if (!userId) throw new Error("User id is required");

  return Chat.find({ userId }).sort({ updatedAt: -1 });
};

const findChatById = async (id: string) => {
  if (!id) throw new Error("Id is required");

  const chat = await Chat.findById(id);
  if (!chat) {
    throw notFound();
  }

  return chat;
};

const removeChat = async (id: string) => {
  const chat = await Chat.findById(id);
  if (!chat) {
    throw notFound();
  }

  return Chat.findByIdAndDelete(id);
};

const updateChat = async (id: string, data: Record<string, unknown>) => {
  const chat = await Chat.findById(id);
  if (!chat) {
    throw notFound();
  }

  const updatedChat = await Chat.findByIdAndUpdate(
    id,
    { $set: data },
    { new: true, runValidators: true }
  );
  return updatedChat;
};

export { createChat, findAll, findChatById, removeChat, updateChat };
