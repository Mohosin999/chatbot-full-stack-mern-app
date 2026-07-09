import { Request, Response, NextFunction } from "express";

const getUser = (req: Request, res: Response, next: NextFunction): void => {
  try {
    res.status(200).json({ data: req.user });
  } catch (error) {
    next(error);
  }
};

export default getUser;
