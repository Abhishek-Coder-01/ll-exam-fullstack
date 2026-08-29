import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import mongoose from "mongoose";
import { ApiError } from "../utils/ApiError";
import { fail } from "../utils/ApiResponse";
import { logger } from "../utils/logger";
import { env } from "../config/env";

interface MongoDuplicateError extends Error {
  code: number;
  keyValue?: Record<string, unknown>;
}

function isMongoDuplicate(err: unknown): err is MongoDuplicateError {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code: unknown }).code === 11000
  );
}

export function notFoundHandler(req: Request, res: Response): void {
  fail(res, 404, `Route not found: ${req.method} ${req.originalUrl}`);
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof ApiError) {
    fail(res, err.statusCode, err.message, err.details);
    return;
  }

  if (err instanceof ZodError) {
    fail(res, 422, "Validation failed", err.flatten());
    return;
  }

  if (err instanceof mongoose.Error.ValidationError) {
    fail(res, 422, "Mongoose validation failed", err.errors);
    return;
  }

  if (err instanceof mongoose.Error.CastError) {
    fail(res, 400, `Invalid value for ${err.path}: ${String(err.value)}`);
    return;
  }

  if (isMongoDuplicate(err)) {
    fail(res, 409, "Duplicate value", err.keyValue);
    return;
  }

  const message = err instanceof Error ? err.message : "Unknown error";
  logger.error(`Unhandled error: ${message}`, err instanceof Error ? err.stack : err);
  fail(
    res,
    500,
    env.NODE_ENV === "production" ? "Internal Server Error" : message,
    env.NODE_ENV === "production" ? undefined : err,
  );
}
