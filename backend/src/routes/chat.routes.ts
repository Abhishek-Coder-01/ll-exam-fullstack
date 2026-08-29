import { Router } from "express";
import { authenticate } from "../middlewares/auth.middleware";
import { asyncHandler } from "../utils/asyncHandler";
import { validate } from "../middlewares/validate.middleware";
import { sendMessageSchema, createThreadSchema } from "../validators";
import * as ctrl from "../controllers/chat.controller";

const router = Router();
router.use(authenticate);

router.get("/threads", asyncHandler(ctrl.listThreads));
router.post(
  "/threads",
  validate({ body: createThreadSchema }),
  asyncHandler(ctrl.createOrGetThread),
);
router.get("/threads/:businessId/messages", asyncHandler(ctrl.listMessages));
router.post(
  "/messages",
  validate({ body: sendMessageSchema }),
  asyncHandler(ctrl.sendMessage),
);

export default router;
