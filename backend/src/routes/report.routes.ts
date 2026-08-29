import { Router } from "express";
import { authenticate, authorize } from "../middlewares/auth.middleware";
import { asyncHandler } from "../utils/asyncHandler";
import * as ctrl from "../controllers/report.controller";

const router = Router();
router.use(authenticate, authorize("admin"));

router.get("/applications-over-time", asyncHandler(ctrl.applicationsOverTime));
router.get("/payments-over-time", asyncHandler(ctrl.paymentsOverTime));
router.get("/application-status-breakdown", asyncHandler(ctrl.applicationStatusBreakdown));
router.get("/recent-activity", asyncHandler(ctrl.recentActivity));

export default router;
