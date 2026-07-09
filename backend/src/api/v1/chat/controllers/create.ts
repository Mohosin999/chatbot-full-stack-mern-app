import { Request, Response, NextFunction } from "express";
import { createChat } from "../../../../lib/chat";
import { transformedChatObj } from "../../../../utils/query";

const create = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const user = req.user!;

  try {
    const data = await createChat(user);
    const formatedData = transformedChatObj(data as any);

    const response = {
      code: 201,
      message: "Successfully Created a New Chat",
      data: { ...formatedData, link: `/chats/${data.id}` },
    };

    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};

export default create;
