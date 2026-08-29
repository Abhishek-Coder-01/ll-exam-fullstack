import { ActivityModel } from "../models/Activity.model";
import { logger } from "../utils/logger";

export async function recordActivity(params: {
  actorId: string;
  actorName: string;
  action: string;
  target: string;
  meta?: Record<string, unknown>;
}): Promise<void> {
  try {
    await ActivityModel.create(params);
  } catch (err) {
    logger.warn(
      `Failed to record activity: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}
