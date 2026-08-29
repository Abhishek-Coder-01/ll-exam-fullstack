import { PageHeader } from "@/components/shared/page-header";
import { LiveNotifications } from "@/components/shared/live-notifications";

export default function AdminNotificationsPage() {
  return (
    <div>
      <PageHeader title="Notifications" description="Stay up to date with portal-wide activity." />
      <LiveNotifications />
    </div>
  );
}
