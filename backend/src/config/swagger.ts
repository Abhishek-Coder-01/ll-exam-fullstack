import swaggerJsdoc from "swagger-jsdoc";
import type { OAS3Definition } from "swagger-jsdoc";
import { env } from "./env";

const definition: OAS3Definition = {
  openapi: "3.0.3",
  info: {
    title: "LL Exam Portal API",
    version: "1.0.0",
    description:
      "REST API for the LL Exam Portal — License & Learner Exam Management Dashboard. " +
      "Auth (email/password + phone OTP), Applications, Documents, Payments, Chat, Notifications, Reports.",
  },
  servers: [{ url: env.API_PREFIX, description: "Current environment" }],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
    },
    schemas: {
      Error: {
        type: "object",
        properties: {
          success: { type: "boolean", example: false },
          message: { type: "string" },
          details: { type: "object" },
        },
      },
      Success: {
        type: "object",
        properties: {
          success: { type: "boolean", example: true },
          message: { type: "string" },
          data: {},
        },
      },
    },
  },
  security: [{ bearerAuth: [] }],
  tags: [
    { name: "Auth", description: "Registration, login, OTP verification" },
    { name: "Users", description: "Profile, staff/client management" },
    { name: "Applications", description: "License applications workflow" },
    { name: "Documents", description: "Upload and verify documents" },
    { name: "Payments", description: "Fees and gateway integration (stub)" },
    { name: "Chat", description: "Staff ↔ Client messaging" },
    { name: "Notifications", description: "In-app notifications" },
    { name: "Reports", description: "Admin dashboard analytics" },
  ],
};

export const swaggerSpec = swaggerJsdoc({
  definition,
  apis: ["./src/routes/*.ts", "./src/controllers/*.ts"],
});
