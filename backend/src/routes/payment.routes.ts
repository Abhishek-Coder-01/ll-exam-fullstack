import { Router } from "express";
import { authenticate, authorize } from "../middlewares/auth.middleware";
import { asyncHandler } from "../utils/asyncHandler";
import { validate } from "../middlewares/validate.middleware";
import {
  createPaymentSchema,
  verifyPaymentSchema,
  updatePaymentStatusSchema,
} from "../validators";
import * as ctrl from "../controllers/payment.controller";

const router = Router();
router.use(authenticate);

router.post(
  "/create-order",
  authorize("client"),
  validate({ body: createPaymentSchema }),
  asyncHandler(ctrl.createOrder),
);

router.post(
  "/verify",
  authorize("client"),
  validate({ body: verifyPaymentSchema }),
  asyncHandler(ctrl.verifyPayment),
);

router.get("/", asyncHandler(ctrl.listPayments));

router.patch(
  "/:businessId/status",
  authorize("admin"),
  validate({ body: updatePaymentStatusSchema }),
  asyncHandler(ctrl.updatePaymentStatus),
);

export default router;
