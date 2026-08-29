import { Router } from "express";
import { authenticate, authorize } from "../middlewares/auth.middleware";
import { asyncHandler } from "../utils/asyncHandler";
import { validate } from "../middlewares/validate.middleware";
import { updateStaffStatusSchema, updateProfileSchema } from "../validators";
import * as ctrl from "../controllers/user.controller";

const router = Router();

router.use(authenticate);

// Self
router.patch("/me", validate({ body: updateProfileSchema }), asyncHandler(ctrl.updateProfile));

// Admin — staff management
router.get("/staff", authorize("admin"), asyncHandler(ctrl.listStaff));
router.patch(
  "/staff/:businessId/status",
  authorize("admin"),
  validate({ body: updateStaffStatusSchema }),
  asyncHandler(ctrl.updateStaffStatus),
);

// Admin — client management
router.get("/clients", authorize("admin"), asyncHandler(ctrl.listClients));
router.patch(
  "/clients/:businessId/assign",
  authorize("admin"),
  asyncHandler(ctrl.assignStaffToClient),
);

// Staff — assigned clients
router.get("/staff/assigned-clients", authorize("staff"), asyncHandler(ctrl.listAssignedClients));

// Admin — dashboard stats
router.get("/admin/stats", authorize("admin"), asyncHandler(ctrl.adminStats));

export default router;
