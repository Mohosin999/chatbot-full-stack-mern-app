import { Request, Response, NextFunction } from "express";
import { findAll } from "../../../../lib/chat";
import * as query from "../../../../utils/query";

const findAllItems = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const userId = req.user!.id;

  try {
    const chats = await findAll(userId);

    const transformedChats = query.getTransformedItems({
      items: chats as unknown as Record<string, unknown>[],
      selection: ["id", "userId", "name", "userName", "createdAt", "updatedAt"],
      path: "/chats",
    });

    res.status(200).json({ data: transformedChats });
  } catch (error) {
    next(error);
  }
};

export default findAllItems;
