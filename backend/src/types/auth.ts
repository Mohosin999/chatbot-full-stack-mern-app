import { z } from "zod";

export interface ITokenPayload {
  id: string;
  name: string;
  email: string;
  role?: string;
}

export interface IRefreshTokenResult {
  refreshToken: string;
  expiresAt: Date;
}

export interface IAuthResponse {
  accessToken: string;
  refreshToken: string;
}

export const refreshTokenSchema = z.object({
  refresh_token: z.string().min(1),
});

export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
