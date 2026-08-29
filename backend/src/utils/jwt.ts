import jwt, { type SignOptions, type Secret } from "jsonwebtoken";
import { env } from "../config/env";
import type { Role } from "../types/domain";

export interface TokenPayload {
  userId: string;
  role: Role;
  email: string;
}

export function signAccessToken(payload: TokenPayload): string {
  const options: SignOptions = { expiresIn: env.JWT_ACCESS_EXPIRES_IN as SignOptions["expiresIn"] };
  return jwt.sign(payload, env.JWT_ACCESS_SECRET as Secret, options);
}

export function signRefreshToken(payload: TokenPayload): string {
  const options: SignOptions = { expiresIn: env.JWT_REFRESH_EXPIRES_IN as SignOptions["expiresIn"] };
  return jwt.sign(payload, env.JWT_REFRESH_SECRET as Secret, options);
}

export function verifyAccessToken(token: string): TokenPayload {
  const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET as Secret);
  if (typeof decoded === "string") throw new Error("Invalid token payload");
  return decoded as TokenPayload;
}

export function verifyRefreshToken(token: string): TokenPayload {
  const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET as Secret);
  if (typeof decoded === "string") throw new Error("Invalid token payload");
  return decoded as TokenPayload;
}
