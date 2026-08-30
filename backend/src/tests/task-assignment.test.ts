import test from "node:test";
import assert from "node:assert/strict";
import { pickLeastActiveStaff } from "../services/taskAssignment.service";

test("picks the staff member with the fewest active tasks when multiple are eligible", () => {
  const staff = [
    { businessId: "STF-001", role: "staff", staffStatus: "Active", availabilityStatus: "Available", teamLeaderId: undefined },
    { businessId: "STF-002", role: "staff", staffStatus: "Active", availabilityStatus: "Available", teamLeaderId: undefined },
    { businessId: "STF-003", role: "staff", staffStatus: "Active", availabilityStatus: "Available", teamLeaderId: undefined },
    { businessId: "STF-004", role: "staff", staffStatus: "Active", availabilityStatus: "Available", teamLeaderId: undefined },
  ];

  const counts = {
    "STF-001": 5,
    "STF-002": 2,
    "STF-003": 8,
    "STF-004": 3,
  };

  const selected = pickLeastActiveStaff(staff as any[], counts as any);
  assert.equal(selected?.businessId, "STF-002");
});

test("ignores ineligible staff status values", () => {
  const staff = [
    { businessId: "STF-001", role: "staff", staffStatus: "Active", availabilityStatus: "Available", teamLeaderId: undefined },
    { businessId: "STF-002", role: "staff", staffStatus: "Active", availabilityStatus: "Break", teamLeaderId: undefined },
    { businessId: "STF-003", role: "staff", staffStatus: "Active", availabilityStatus: "Offline", teamLeaderId: undefined },
    { businessId: "STF-004", role: "staff", staffStatus: "Inactive", availabilityStatus: "Inactive", teamLeaderId: undefined },
  ];

  const selected = pickLeastActiveStaff(staff as any[], {} as any);
  assert.equal(selected?.businessId, "STF-001");
});
