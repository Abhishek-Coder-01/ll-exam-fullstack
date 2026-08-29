import { PageHeader } from "@/components/shared/page-header";
import { LiveNotifications } from "@/components/shared/live-notifications";

export default function ClientNotificationsPage() {
  return (
    <div>
      <PageHeader
        title="Notifications"
        description="Updates on your applications, documents, and payments."
      />
      <LiveNotifications />
    </div>
  );
}
