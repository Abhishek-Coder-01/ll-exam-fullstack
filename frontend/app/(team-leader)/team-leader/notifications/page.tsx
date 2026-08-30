import { PageHeader } from "@/components/shared/page-header";
import { LiveNotifications } from "@/components/shared/live-notifications";

export default function TeamLeaderNotificationsPage() {
  return (
    <div>
      <PageHeader
        title="Notifications"
        description="Updates on team activities, staff status changes, and applications."
      />
      <LiveNotifications />
    </div>
  );
}
