import { z } from "zod";

export interface IUser {
  _id: string;
  id: string;
  name: string;
  email: string;
  password: string;
  refreshToken?: string | null;
  refreshTokenExpiresAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IUserDoc {
  _doc: IUser;
  id: string;
  name: string;
  email: string;
  password: string;
  refreshToken?: string | null;
  refreshTokenExpiresAt?: Date | null;
}

export interface IUserWithoutPassword {
  id: string;
  name: string;
  email: string;
}

export const registerSchema = z.object({
  name: z.string().min(5).max(50),
  email: z.string().email(),
  password: z.string().min(6),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
