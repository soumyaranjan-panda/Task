import { createFileRoute } from "@tanstack/react-router";
import { GuideReader } from "@/components/guide-reader";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <GuideReader />;
}
