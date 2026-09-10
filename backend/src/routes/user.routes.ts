import { Router } from "express";
import { authenticate, authorize } from "../middlewares/auth.middleware";
import { asyncHandler } from "../utils/asyncHandler";
import { validate } from "../middlewares/validate.middleware";
import {
  assignStaffToTeamLeaderSchema,
  updateStaffStatusSchema,
  updateProfileSchema,
  createTeamLeaderSchema,
  updateTeamLeaderSchema,
  toggleTeamLeaderSchema,
  removeStaffSchema,
  assignClientSchema,
} from "../validators";
import * as ctrl from "../controllers/user.controller";

const router = Router();

router.use(authenticate);

// Self
router.patch("/me", validate({ body: updateProfileSchema }), asyncHandler(ctrl.updateProfile));

// Admin / Team Leader — staff visibility is scoped inside the controller.
router.get("/staff", authorize("admin", "team_leader"), asyncHandler(ctrl.listStaff));
router.patch(
  "/staff/:businessId/status",
  authorize("admin"),
  validate({ body: updateStaffStatusSchema }),
  asyncHandler(ctrl.updateStaffStatus),
);
router.delete("/staff/:businessId", authorize("admin"), asyncHandler(ctrl.deleteStaff));

// Team Leader — staff management
router.get("/team-leaders", authorize("admin"), asyncHandler(ctrl.listTeamLeaders));
router.post(
  "/team-leaders",
  authorize("admin"),
  validate({ body: createTeamLeaderSchema }),
  asyncHandler(ctrl.createTeamLeader),
);
router.patch(
  "/team-leaders/:businessId",
  authorize("admin"),
  validate({ body: updateTeamLeaderSchema }),
  asyncHandler(ctrl.updateTeamLeader),
);
router.patch(
  "/team-leaders/:businessId/active",
  authorize("admin"),
  validate({ body: toggleTeamLeaderSchema }),
  asyncHandler(ctrl.toggleTeamLeaderActive),
);
router.patch(
  "/team-leaders/:businessId/assign-staff",
  authorize("admin"),
  validate({ body: assignStaffToTeamLeaderSchema }),
  asyncHandler(ctrl.assignStaffToTeamLeader),
);
router.patch(
  "/team-leaders/:businessId/remove-staff",
  authorize("admin"),
  validate({ body: removeStaffSchema }),
  asyncHandler(ctrl.removeStaffFromTeamLeader),
);
router.delete("/team-leaders/:businessId", authorize("admin"), asyncHandler(ctrl.deleteTeamLeader));

// Team Leader — only the staff assigned to the authenticated leader
router.get("/team-leader/staff", authorize("team_leader"), asyncHandler(ctrl.listTeamLeaderStaff));

// Admin / Team Leader — client visibility is scoped inside the controller.
router.get("/clients", authorize("admin", "team_leader"), asyncHandler(ctrl.listClients));
router.patch(
  "/clients/:businessId/assign",
  authorize("admin", "team_leader"),
  validate({ body: assignClientSchema }),
  asyncHandler(ctrl.assignStaffToClient),
);

// Staff / Team Leader — assigned clients
router.get("/staff/assigned-clients", authorize("staff", "team_leader"), asyncHandler(ctrl.listAssignedClients));

// Admin — dashboard stats
router.get("/admin/stats", authorize("admin"), asyncHandler(ctrl.adminStats));

export default router;
