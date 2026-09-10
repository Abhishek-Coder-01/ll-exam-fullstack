import { Router } from "express";
import authRoutes from "./auth.routes";
import userRoutes from "./user.routes";
import applicationRoutes from "./application.routes";
import documentRoutes from "./document.routes";
import paymentRoutes from "./payment.routes";
import notificationRoutes from "./notification.routes";
import reportRoutes from "./report.routes";
import mongoose from "mongoose";

const router = Router();

router.get("/health", (_req, res) => {
  const databaseReady = mongoose.connection.readyState === 1;
  if (!databaseReady) {
    res.status(503).json({
      success: false,
      message: "Dependency unavailable",
      data: { uptime: process.uptime(), timestamp: new Date().toISOString(), database: "disconnected" },
    });
    return;
  }
  res.json({
    success: true,
    message: "LL Exam Portal API is healthy",
    data: { uptime: process.uptime(), timestamp: new Date().toISOString(), database: "connected" },
  });
});

router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/applications", applicationRoutes);
router.use("/documents", documentRoutes);
router.use("/payments", paymentRoutes);
router.use("/notifications", notificationRoutes);
router.use("/reports", reportRoutes);

export default router;
