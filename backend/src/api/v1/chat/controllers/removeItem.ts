import { Request, Response, NextFunction } from "express";
import { removeChat } from "../../../../lib/chat";

const removeItem = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const id = req.params.id as string;

  try {
    await removeChat(id);
    res.status(204).end();
  } catch (error) {
    next(error);
  }
};

export default removeItem;
