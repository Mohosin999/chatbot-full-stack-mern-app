import { IUserWithoutPassword } from "./user";

declare global {
  namespace Express {
    interface Request {
      user?: IUserWithoutPassword & {
        id: string;
        name: string;
        email: string;
        password?: string;
        refreshToken?: string | null;
        refreshTokenExpiresAt?: Date | null;
        customInstructions?: string;
        createdAt?: Date;
        updatedAt?: Date;
      };
    }
  }
}

export {};
