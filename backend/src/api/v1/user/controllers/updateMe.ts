import { Request, Response, NextFunction } from "express";
import User from "../../../../model/User";

const updateMe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { customInstructions } = req.body;

    const user = await User.findByIdAndUpdate(
      userId,
      { customInstructions },
      { new: true },
    );

    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    res.status(200).json({
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        customInstructions: user.customInstructions,
      },
    });
  } catch (error) {
    next(error);
  }
};

export default updateMe;
