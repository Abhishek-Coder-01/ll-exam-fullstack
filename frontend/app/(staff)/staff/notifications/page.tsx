import { PageHeader } from "@/components/shared/page-header";
import { LiveNotifications } from "@/components/shared/live-notifications";

export default function StaffNotificationsPage() {
  return (
    <div>
      <PageHeader title="Notifications" description="Updates on your assigned clients and applications." />
      <LiveNotifications />
    </div>
  );
}
