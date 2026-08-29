import { NotificationModel } from "../models/Notification.model";
import { generateNotificationId } from "../utils/idGenerator";
import type { NotificationType } from "../types/domain";
import { logger } from "../utils/logger";

export async function pushNotification(params: {
  recipientId: string;
  title: string;
  description: string;
  type?: NotificationType;
  link?: string;
}): Promise<void> {
  try {
    await NotificationModel.create({
      businessId: generateNotificationId(),
      recipientId: params.recipientId,
      title: params.title,
      description: params.description,
      type: params.type ?? "info",
      link: params.link,
    });
  } catch (err) {
    logger.warn(
      `Failed to push notification: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}
