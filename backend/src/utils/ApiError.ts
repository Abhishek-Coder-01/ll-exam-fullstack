export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly details?: unknown;
  public readonly isOperational: boolean;

  constructor(statusCode: number, message: string, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;
    Object.setPrototypeOf(this, ApiError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message = "Bad Request", details?: unknown): ApiError {
    return new ApiError(400, message, details);
  }
  static unauthorized(message = "Unauthorized"): ApiError {
    return new ApiError(401, message);
  }
  static forbidden(message = "Forbidden"): ApiError {
    return new ApiError(403, message);
  }
  static notFound(message = "Not Found"): ApiError {
    return new ApiError(404, message);
  }
  static conflict(message = "Conflict"): ApiError {
    return new ApiError(409, message);
  }
  static unprocessable(message = "Unprocessable Entity", details?: unknown): ApiError {
    return new ApiError(422, message, details);
  }
  static tooMany(message = "Too Many Requests"): ApiError {
    return new ApiError(429, message);
  }
  static internal(message = "Internal Server Error"): ApiError {
    return new ApiError(500, message);
  }
}
