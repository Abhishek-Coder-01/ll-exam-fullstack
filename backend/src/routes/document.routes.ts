import { Router } from "express";
import { authenticate, authorize } from "../middlewares/auth.middleware";
import { asyncHandler } from "../utils/asyncHandler";
import { validate } from "../middlewares/validate.middleware";
import { upload } from "../middlewares/upload.middleware";
import { uploadDocumentSchema, updateDocumentStatusSchema } from "../validators";
import * as ctrl from "../controllers/document.controller";

const router = Router();
router.use(authenticate);

router.post(
  "/upload",
  upload.single("file"),
  validate({ body: uploadDocumentSchema }),
  asyncHandler(ctrl.uploadDocument),
);

router.get("/", asyncHandler(ctrl.listDocuments));

router.get("/:businessId/download", asyncHandler(ctrl.downloadDocument));

router.patch(
  "/:businessId/status",
  authorize("admin", "staff"),
  validate({ body: updateDocumentStatusSchema }),
  asyncHandler(ctrl.updateDocumentStatus),
);

router.delete("/:businessId", asyncHandler(ctrl.deleteDocument));

export default router;
