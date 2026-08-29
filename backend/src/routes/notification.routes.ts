import { Router } from "express";
import { authenticate } from "../middlewares/auth.middleware";
import { asyncHandler } from "../utils/asyncHandler";
import * as ctrl from "../controllers/notification.controller";

const router = Router();
router.use(authenticate);

router.get("/", asyncHandler(ctrl.listNotifications));

// IMPORTANT: /read-all must be declared BEFORE /:businessId/read
// otherwise Express matches "read-all" as :businessId.
router.patch("/read-all", asyncHandler(ctrl.markAllRead));
router.patch("/:businessId/read", asyncHandler(ctrl.markAsRead));

// DELETE: /clear-all must be BEFORE /:businessId for the same reason.
router.delete("/clear-all", asyncHandler(ctrl.deleteManyNotifications));
router.delete("/:businessId", asyncHandler(ctrl.deleteNotification));

export default router;