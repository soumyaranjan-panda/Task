import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-header";
import { HomeDashboard } from "@/components/home-dashboard";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return (
    <AppShell>
      <HomeDashboard />
    </AppShell>
  );
}
