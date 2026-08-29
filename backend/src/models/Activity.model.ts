import { Schema, model, type Document, type Model } from "mongoose";

export interface IActivity extends Document {
  actorId: string;
  actorName: string;
  action: string;
  target: string;
  meta?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const activitySchema = new Schema<IActivity>(
  {
    actorId: { type: String, required: true, index: true },
    actorName: { type: String, required: true },
    action: { type: String, required: true },
    target: { type: String, required: true },
    meta: { type: Schema.Types.Mixed },
  },
  { timestamps: true },
);

export const ActivityModel: Model<IActivity> = model<IActivity>("Activity", activitySchema);
