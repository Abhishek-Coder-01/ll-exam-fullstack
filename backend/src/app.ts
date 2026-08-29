import express, { type Application } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import path from "path";
import swaggerUi from "swagger-ui-express";

import { env } from "./config/env";
import { swaggerSpec } from "./config/swagger";
import { globalLimiter } from "./middlewares/rateLimit.middleware";
import { errorHandler, notFoundHandler } from "./middlewares/error.middleware";
import apiRoutes from "./routes";

export function createApp(): Application {
  const app = express();

  // Trust the first proxy when running behind Nginx / Railway / Render / Vercel etc.
  // Without this, express-rate-limit sees all requests from the same proxy IP
  // and everyone shares one rate-limit bucket — causing false "Too Many Requests".
  if (env.NODE_ENV === "production") {
    app.set("trust proxy", 1);
  }

  // Security & parsing
  app.use(helmet({ crossOriginResourcePolicy: false }));
  app.use(
    cors({
      origin: (origin, cb) => {
        // Allow no-origin requests (curl, mobile), plus configured CLIENT_URL.
        if (!origin) return cb(null, true);
        const whitelist = env.CLIENT_URL.split(",").map((s) => s.trim());
        if (whitelist.includes("*") || whitelist.includes(origin)) return cb(null, true);
        // In dev, be permissive
        if (env.NODE_ENV !== "production") return cb(null, true);
        return cb(new Error(`CORS blocked: ${origin}`));
      },
      credentials: true,
    }),
  );
  app.use(cookieParser());
  app.use(express.json({ limit: "2mb" }));
  app.use(express.urlencoded({ extended: true }));
  if (env.NODE_ENV !== "test") app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));
  app.use(globalLimiter);

  // Static uploads (protected downloads still go through the /documents/:id/download route)
  app.use(
    "/static/uploads",
    express.static(path.resolve(process.cwd(), env.UPLOAD_DIR), { fallthrough: true }),
  );

  // Root
  app.get("/", (_req, res) => {
    res.json({
      success: true,
      message: "LL Exam Portal API",
      data: {
        docs: `${env.API_PREFIX}/docs`,
        health: `${env.API_PREFIX}/health`,
        version: "1.0.0",
      },
    });
  });

  // OpenAPI docs
  app.use(`${env.API_PREFIX}/docs`, swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customSiteTitle: "LL Exam Portal API Docs",
  }));
  app.get(`${env.API_PREFIX}/docs.json`, (_req, res) => {
    res.json(swaggerSpec);
  });

  // API
  app.use(env.API_PREFIX, apiRoutes);

  // 404 + errors
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
