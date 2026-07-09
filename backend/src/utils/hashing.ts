import bcrypt from "bcryptjs";

const generateHash = async (
  payload: string,
  saltRound = 10
): Promise<string> => {
  const salt = await bcrypt.genSalt(saltRound);
  return bcrypt.hash(payload, salt);
};

const hashMatched = async (
  raw: string,
  hash: string
): Promise<boolean> => {
  return bcrypt.compare(raw, hash);
};

export { generateHash, hashMatched };
