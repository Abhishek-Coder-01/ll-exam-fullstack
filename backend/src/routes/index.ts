import { Router } from "express";
import authRoutes from "./auth.routes";
import userRoutes from "./user.routes";
import applicationRoutes from "./application.routes";
import documentRoutes from "./document.routes";
import paymentRoutes from "./payment.routes";
import chatRoutes from "./chat.routes";
import notificationRoutes from "./notification.routes";
import reportRoutes from "./report.routes";

const router = Router();

router.get("/health", (_req, res) => {
  res.json({
    success: true,
    message: "LL Exam Portal API is healthy",
    data: { uptime: process.uptime(), timestamp: new Date().toISOString() },
  });
});

router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/applications", applicationRoutes);
router.use("/documents", documentRoutes);
router.use("/payments", paymentRoutes);
router.use("/chat", chatRoutes);
router.use("/notifications", notificationRoutes);
router.use("/reports", reportRoutes);

export default router;
