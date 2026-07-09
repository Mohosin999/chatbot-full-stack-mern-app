import { ITransformedItem } from "../types";

interface IGetTransformedItemsParams {
  items: Record<string, unknown>[];
  selection: string[];
  path: string;
}

const getTransformedItems = ({
  items = [],
  selection = [],
  path = "/",
}: IGetTransformedItemsParams): ITransformedItem[] => {
  if (!Array.isArray(items) || !Array.isArray(selection)) {
    throw new Error("Invalid section");
  }

  if (selection.length === 0) {
    return items.map((item) => ({
      ...item,
      link: `${path}/${item.id}`,
    })) as unknown as ITransformedItem[];
  }

  return items.map((item) => {
    const result: Record<string, unknown> = {};
    selection.forEach((key) => {
      result[key] = item[key];
    });
    result.link = `${path}/${item.id}`;
    return result as ITransformedItem;
  });
};

interface IChatObj {
  id: string;
  userId: string;
  name: string;
  userName: string;
  link?: string;
  createdAt: Date;
  updatedAt: Date;
}

const transformedChatObj = (chat: IChatObj) => ({
  id: chat.id,
  userId: chat.userId,
  name: chat.name,
  userName: chat.userName,
  link: chat.link,
  createdAt: chat.createdAt,
  updatedAt: chat.updatedAt,
});

export { getTransformedItems, transformedChatObj };
