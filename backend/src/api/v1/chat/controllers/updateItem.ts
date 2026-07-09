import { Request, Response, NextFunction } from "express";
import { updateChat } from "../../../../lib/chat";

const updateItem = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const id = req.params.id as string;

  try {
    await updateChat(id, req.body);
    res.status(204).end();
  } catch (error) {
    next(error);
  }
};

export default updateItem;
