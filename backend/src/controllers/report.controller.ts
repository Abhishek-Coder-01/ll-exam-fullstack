import type { Request, Response } from "express";
import { ApplicationModel } from "../models/Application.model";
import { PaymentModel } from "../models/Payment.model";
import { UserModel } from "../models/User.model";
import { ok } from "../utils/ApiResponse";
import { ActivityModel } from "../models/Activity.model";
import * as XLSX from "xlsx";

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

export async function exportExcel(req: Request, res: Response): Promise<void> {
  const requestedType = String(req.query.type ?? "all");
  const exportTypes = ["all", "team-leaders", "staff", "clients", "applications", "payments"] as const;
  if (!exportTypes.includes(requestedType as (typeof exportTypes)[number])) {
    res.status(400).json({ success: false, message: "Invalid export type" });
    return;
  }
  const exportType = requestedType as (typeof exportTypes)[number];
  const [users, applications, payments] = await Promise.all([
    UserModel.find({ role: { $in: ["staff", "team_leader", "client"] } }).sort({ createdAt: -1 }).lean(),
    ApplicationModel.find({}).sort({ submittedOn: -1 }).lean(),
    PaymentModel.find({}).sort({ date: -1 }).lean(),
  ]);

  const teamLeaders = users.filter((user) => user.role === "team_leader");
  const staff = users.filter((user) => user.role === "staff");
  const clients = users.filter((user) => user.role === "client");

  const workbook = XLSX.utils.book_new();
  const appendSheet = (name: string, rows: Record<string, unknown>[]) => {
    const sheet = XLSX.utils.json_to_sheet(rows.length ? rows : [{ Message: "No records found" }]);
    const columns = rows.length ? Object.keys(rows[0]) : ["Message"];
    sheet["!cols"] = columns.map((column) => ({
      wch: Math.min(32, Math.max(14, column.length + 2)),
    }));
    XLSX.utils.book_append_sheet(workbook, sheet, name);
  };

  if (exportType === "all") {
    const allRows: unknown[][] = [];
    const addSection = (title: string, headers: string[], rows: unknown[][]) => {
      if (allRows.length) allRows.push([]);
      allRows.push([title]);
      allRows.push(headers);
      allRows.push(...rows);
    };

    addSection(
      "Team Leaders",
      ["ID", "Name", "Department", "Email", "Phone No.", "Status"],
      teamLeaders.map((user) => [
        user.businessId,
        user.name,
        user.department ?? "",
        user.email,
        user.phone,
        user.staffStatus ?? "",
      ]),
    );
    addSection(
      "Staff",
      ["ID", "Name", "Department", "Email", "Phone No.", "Status"],
      staff.map((user) => [
        user.businessId,
        user.name,
        user.department ?? "",
        user.email,
        user.phone,
        user.staffStatus ?? "",
      ]),
    );
    addSection(
      "Clients",
      ["ID", "Name", "License Type", "Email", "Phone No.", "Status", "Joined Date"],
      clients.map((user) => [
        user.businessId,
        user.name,
        user.licenseType ?? "",
        user.email,
        user.phone,
        user.clientStatus ?? "",
        user.createdAt,
      ]),
    );
    addSection(
      "Applications",
      ["Application No.", "Type", "Assigned Staff", "Fee", "Submitted", "Status", "Rejection Reason"],
      applications.map((application) => [
        application.businessId,
        application.type,
        application.assignedStaffName ?? "",
        application.fee,
        application.submittedOn,
        application.status,
        application.status === "Rejected" && application.remarks
          ? application.remarks
          : String.fromCharCode(0x2014),
      ]),
    );
    addSection(
      "Payments",
      ["Invoice", "Client", "Application", "Method", "Amount", "Date", "Status"],
      payments.map((payment) => [
        payment.invoiceNo,
        payment.clientName,
        payment.applicationId,
        payment.method,
        payment.amount,
        payment.date,
        payment.status,
      ]),
    );

    const allSheet = XLSX.utils.aoa_to_sheet(allRows);
    allSheet["!cols"] = Array.from({ length: 7 }, (_, index) => ({ wch: index === 6 ? 24 : 18 }));
    XLSX.utils.book_append_sheet(workbook, allSheet, "All Data");
  }

  if (exportType === "all" || exportType === "team-leaders") appendSheet(
    "Team Leaders",
    teamLeaders.map((user) => ({
      ID: user.businessId,
      Name: user.name,
      Department: user.department ?? "",
      Email: user.email,
      "Phone No.": user.phone,
      Status: user.staffStatus ?? "",
    })),
  );
  if (exportType === "all" || exportType === "staff") appendSheet(
    "Staff",
    staff.map((user) => ({
      ID: user.businessId,
      Name: user.name,
      Department: user.department ?? "",
      Email: user.email,
      "Phone No.": user.phone,
      Status: user.staffStatus ?? "",
    })),
  );
  if (exportType === "all" || exportType === "clients") appendSheet(
    "Clients",
    clients.map((user) => ({
      ID: user.businessId,
      Name: user.name,
      "License Type": user.licenseType ?? "",
      Email: user.email,
      "Phone No.": user.phone,
      Status: user.clientStatus ?? "",
      "Joined Date": user.createdAt,
    })),
  );
  if (exportType === "all" || exportType === "applications") appendSheet(
    "Applications",
    applications.map((application) => ({
      "Application No.": application.businessId,
      Type: application.type,
      "Assigned Staff": application.assignedStaffName ?? "",
      Fee: application.fee,
      Submitted: application.submittedOn,
      Status: application.status,
      "Rejection Reason": application.status === "Rejected" && application.remarks
        ? application.remarks
        : String.fromCharCode(0x2014),
    })),
  );
  if (exportType === "all" || exportType === "payments") appendSheet(
    "Payments",
    payments.map((payment) => ({
      Invoice: payment.invoiceNo,
      Client: payment.clientName,
      Application: payment.applicationId,
      Method: payment.method,
      Amount: payment.amount,
      Date: payment.date,
      Status: payment.status,
    })),
  );

  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  const filename = `ll-portal-${exportType}-${new Date().toISOString().slice(0, 10)}.xlsx`;
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send(buffer);
}
