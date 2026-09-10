import type { Request, Response, NextFunction } from "express";
import fs from "fs";
import path from "path";
import { ZodError } from "zod";
import mongoose from "mongoose";
import { ApiError } from "../utils/ApiError";
import { fail } from "../utils/ApiResponse";
import { logger } from "../utils/logger";
import { env } from "../config/env";
import multer from "multer";
import { UPLOAD_ROOT } from "./upload.middleware";

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
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // Multer writes to disk before body validation runs. Remove files when the
  // request failed before the document was successfully persisted.
  if (req.file && !res.locals.uploadPersisted) {
    const uploadedPath = path.resolve(UPLOAD_ROOT, req.file.filename);
    if (uploadedPath.startsWith(`${UPLOAD_ROOT}${path.sep}`) && fs.existsSync(uploadedPath)) {
      try {
        fs.unlinkSync(uploadedPath);
      } catch {
        // Do not replace the original API error with a cleanup error.
      }
    }
  }
  if (err instanceof ApiError) {
    fail(res, err.statusCode, err.message, err.details);
    return;
  }

  if (err instanceof ZodError) {
    fail(res, 422, "Validation failed", err.flatten());
    return;
  }

  if (err instanceof mongoose.Error.ValidationError) {
    const fields = Object.fromEntries(
      Object.entries(err.errors).map(([field, issue]) => [field, issue.message]),
    );
    fail(res, 422, "Mongoose validation failed", fields);
    return;
  }

  if (err instanceof mongoose.Error.CastError) {
    fail(res, 400, `Invalid value for ${err.path}: ${String(err.value)}`);
    return;
  }

  if (err instanceof multer.MulterError) {
    const status = err.code === "LIMIT_FILE_SIZE" ? 413 : 400;
    fail(res, status, err.code === "LIMIT_FILE_SIZE" ? "Uploaded file is too large" : err.message);
    return;
  }

  if (isMongoDuplicate(err)) {
    fail(res, 409, "Duplicate value", env.NODE_ENV === "production" ? undefined : err.keyValue);
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
