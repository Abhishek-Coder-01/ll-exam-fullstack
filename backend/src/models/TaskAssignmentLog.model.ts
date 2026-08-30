import { Schema, model, type Document, type Model } from "mongoose";

export interface ITaskAssignmentLog extends Document {
  taskId: string;
  previousStaffId?: string;
  newStaffId: string;
  assignedBy: string;
  assignmentType: "AUTO" | "MANUAL";
  createdAt: Date;
  updatedAt: Date;
}

const taskAssignmentLogSchema = new Schema<ITaskAssignmentLog>(
  {
    taskId: { type: String, required: true, index: true },
    previousStaffId: { type: String, index: true },
    newStaffId: { type: String, required: true, index: true },
    assignedBy: { type: String, required: true, index: true },
    assignmentType: { type: String, required: true, enum: ["AUTO", "MANUAL"], index: true },
  },
  { timestamps: true },
);

export const TaskAssignmentLogModel: Model<ITaskAssignmentLog> = model<ITaskAssignmentLog>(
  "TaskAssignmentLog",
  taskAssignmentLogSchema,
);
