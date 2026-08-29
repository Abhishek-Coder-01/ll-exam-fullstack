import { Router } from "express";
import { authenticate, authorize } from "../middlewares/auth.middleware";
import { asyncHandler } from "../utils/asyncHandler";
import { validate } from "../middlewares/validate.middleware";
import {
  createApplicationSchema,
  updateApplicationSchema,
} from "../validators";
import * as ctrl from "../controllers/application.controller";

const router = Router();
router.use(authenticate);

router.post(
  "/",
  authorize("client"),
  validate({ body: createApplicationSchema }),
  asyncHandler(ctrl.createApplication),
);

router.get("/", asyncHandler(ctrl.listApplications));
router.get("/:businessId", asyncHandler(ctrl.getApplication));
router.patch(
  "/:businessId",
  validate({ body: updateApplicationSchema }),
  asyncHandler(ctrl.updateApplication),
);

export default router;
