import { DashboardClientPage } from "./dashboard-client-page";

export default function Page() {
  // Onboarding is now handled client-side via dialog
  // The client page checks /api/onboarding/status and shows dialog if needed
  return <DashboardClientPage />;
}