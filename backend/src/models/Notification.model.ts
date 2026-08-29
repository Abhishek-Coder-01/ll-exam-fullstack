import { Schema, model, type Document, type Model } from "mongoose";
import { NOTIFICATION_TYPES, type NotificationType } from "../types/domain";

export interface INotification extends Document {
  businessId: string; // NTF-1
  recipientId: string; // -> User.businessId
  title: string;
  description: string;
  type: NotificationType;
  read: boolean;
  link?: string;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    businessId: { type: String, required: true, unique: true, index: true },
    recipientId: { type: String, required: true, index: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    type: {
      type: String,
      required: true,
      enum: NOTIFICATION_TYPES,
      default: "info",
    },
    read: { type: Boolean, default: false, index: true },
    link: { type: String },
  },
  { timestamps: true },
);

export const NotificationModel: Model<INotification> = model<INotification>(
  "Notification",
  notificationSchema,
);
