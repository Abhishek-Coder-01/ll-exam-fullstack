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

// Team Leader — staff management
router.get("/team-leaders", authorize("admin"), asyncHandler(ctrl.listTeamLeaders));
router.post("/team-leaders", authorize("admin"), asyncHandler(ctrl.createTeamLeader));
router.patch("/team-leaders/:businessId", authorize("admin"), asyncHandler(ctrl.updateTeamLeader));
router.patch("/team-leaders/:businessId/active", authorize("admin"), asyncHandler(ctrl.toggleTeamLeaderActive));
router.patch("/team-leaders/:businessId/assign-staff", authorize("admin"), asyncHandler(ctrl.assignStaffToTeamLeader));
router.patch("/team-leaders/:businessId/remove-staff", authorize("admin"), asyncHandler(ctrl.removeStaffFromTeamLeader));
router.delete("/team-leaders/:businessId", authorize("admin"), asyncHandler(ctrl.deleteTeamLeader));

// Admin — client management
router.get("/clients", authorize("admin"), asyncHandler(ctrl.listClients));
router.patch(
  "/clients/:businessId/assign",
  authorize("admin"),
  asyncHandler(ctrl.assignStaffToClient),
);

// Staff / Team Leader — assigned clients
router.get("/staff/assigned-clients", authorize("staff", "team_leader"), asyncHandler(ctrl.listAssignedClients));

// Admin — dashboard stats
router.get("/admin/stats", authorize("admin"), asyncHandler(ctrl.adminStats));

export default router;
