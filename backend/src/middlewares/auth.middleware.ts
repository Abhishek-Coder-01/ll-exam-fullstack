import type { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../utils/jwt";
import { ApiError } from "../utils/ApiError";
import type { Role } from "../types/domain";

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  try {
    const header = req.headers.authorization;
    let token: string | undefined;

    if (header && header.startsWith("Bearer ")) {
      token = header.slice("Bearer ".length).trim();
    } else if (typeof req.cookies?.accessToken === "string") {
      token = req.cookies.accessToken;
    }

    if (!token) {
      throw ApiError.unauthorized("Missing access token");
    }

    const decoded = verifyAccessToken(token);
    req.user = {
      userId: decoded.userId,
      role: decoded.role,
      email: decoded.email,
    };
    next();
  } catch (err) {
    if (err instanceof ApiError) return next(err);
    return next(ApiError.unauthorized("Invalid or expired access token"));
  }
}

export function authorize(...allowed: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) return next(ApiError.unauthorized());
    if (!allowed.includes(req.user.role)) {
      return next(ApiError.forbidden("You do not have permission to perform this action"));
    }
    next();
  };
}
