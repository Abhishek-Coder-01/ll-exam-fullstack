import type { Request, Response } from "express";
import { ApplicationModel } from "../models/Application.model";
import { PaymentModel } from "../models/Payment.model";
import { ok } from "../utils/ApiResponse";
import { ActivityModel } from "../models/Activity.model";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export async function applicationsOverTime(_req: Request, res: Response): Promise<void> {
  const rows = await ApplicationModel.aggregate([
    {
      $group: {
        _id: { $month: "$submittedOn" },
        value: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);
  const data = rows.map((r: { _id: number; value: number }) => ({
    name: MONTHS[r._id - 1] ?? String(r._id),
    value: r.value,
  }));
  ok(res, data);
}

export async function paymentsOverTime(_req: Request, res: Response): Promise<void> {
  const rows = await PaymentModel.aggregate([
    { $match: { status: { $in: ["Completed", "Verified"] } } },
    {
      $group: {
        _id: { $month: "$date" },
        value: { $sum: "$amount" },
      },
    },
    { $sort: { _id: 1 } },
  ]);
  const data = rows.map((r: { _id: number; value: number }) => ({
    name: MONTHS[r._id - 1] ?? String(r._id),
    value: r.value,
  }));
  ok(res, data);
}

export async function applicationStatusBreakdown(_req: Request, res: Response): Promise<void> {
  const rows = await ApplicationModel.aggregate([
    { $group: { _id: "$status", value: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);
  ok(
    res,
    rows.map((r: { _id: string; value: number }) => ({ name: r._id, value: r.value })),
  );
}

export async function recentActivity(_req: Request, res: Response): Promise<void> {
  const items = await ActivityModel.find({}).sort({ createdAt: -1 }).limit(20);
  ok(res, items);
}
