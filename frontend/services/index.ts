/**
 * Barrel for all backend-integrated services.
 * Frontend pages should import ONLY from these modules — never hardcode data.
 */

export * from "./api";
export * as authService from "./auth.service";
export * as userService from "./user.service";
export * as applicationService from "./application.service";
export * as documentService from "./document.service";
export * as paymentService from "./payment.service";
export * as notificationService from "./notification.service";
export * as chatService from "./chat.service";
export * as reportService from "./report.service";
