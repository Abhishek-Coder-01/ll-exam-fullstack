import type { Response } from "express";

export interface ApiSuccess<T> {
  success: true;
  message: string;
  data: T;
  meta?: Record<string, unknown>;
}

export interface ApiFailure {
  success: false;
  message: string;
  details?: unknown;
}

export function ok<T>(
  res: Response,
  data: T,
  message = "OK",
  status = 200,
  meta?: Record<string, unknown>,
): Response {
  const body: ApiSuccess<T> = { success: true, message, data };
  if (meta) body.meta = meta;
  return res.status(status).json(body);
}

export function created<T>(res: Response, data: T, message = "Created"): Response {
  return ok(res, data, message, 201);
}

export function fail(res: Response, status: number, message: string, details?: unknown): Response {
  const body: ApiFailure = { success: false, message };
  if (details !== undefined) body.details = details;
  return res.status(status).json(body);
}
