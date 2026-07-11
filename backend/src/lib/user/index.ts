import User from "../../model/User";
import { badRequest } from "../../utils/error";

const findUserByRefreshToken = async (refreshToken: string) => {
  const user = await User.findOne({ refreshToken });
  return user ? user : false;
};

const findUserByEmail = async (email: string) => {
  const user = await User.findOne({ email });
  return user ? user : false;
};

const userExist = async (email: string): Promise<boolean> => {
  const user = await findUserByEmail(email);
  return user ? true : false;
};

const createUser = async ({
  name,
  email,
  password,
}: {
  name: string;
  email: string;
  password?: string | null;
}) => {
  if (!name || !email) throw badRequest("Invalid Parameters");

  const user = new User({ name, email, password });
  await user.save();
  return { ...user.toObject(), id: user.id };
};

export { findUserByRefreshToken, findUserByEmail, userExist, createUser };
