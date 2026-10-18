import { Link, createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-header";
import { TopicReader } from "@/components/topic-reader";
import { findTopic, useManifest } from "@/lib/content/manifest";

type TopicSearch = { p?: string; q?: string };

export const Route = createFileRoute("/topic/$topicSlug")({
  validateSearch: (search: Record<string, unknown>): TopicSearch => ({
    p: typeof search.p === "string" && search.p ? search.p : undefined,
    q: typeof search.q === "string" && search.q ? search.q : undefined,
  }),
  component: TopicPage,
});

function TopicPage() {
  const { topicSlug } = Route.useParams();
  const search = Route.useSearch();
  const { manifest, error } = useManifest();
  const topic = findTopic(manifest, topicSlug);

  if (error) {
    return (
      <AppShell>
        <MissingState title="Content unavailable" detail={error} topics={manifest?.topics ?? []} />
      </AppShell>
    );
  }

  if (!topic) {
    return (
      <AppShell>
        <MissingState
          title="No such topic"
          detail={`Nothing is registered under “${topicSlug}”.`}
          topics={manifest?.topics ?? []}
        />
      </AppShell>
    );
  }

  return (
    <AppShell topic={topic}>
      <TopicReader topic={topic} search={search} />
    </AppShell>
  );
}

function MissingState({
  title,
  detail,
  topics,
}: {
  title: string;
  detail: string;
  topics: { slug: string; title: string }[];
}) {
  return (
    <main className="flex-1 min-h-0 overflow-y-auto">
      <div className="mx-auto w-full max-w-2xl px-5 py-16 text-center">
        <h1 className="text-xl font-semibold">{title}</h1>
        <p className="mt-2 text-sm text-muted">{detail}</p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          <Link
            to="/"
            className="h-11 px-4 rounded-md border border-border bg-surface text-sm inline-flex items-center hover:bg-surface-2"
          >
            All topics
          </Link>
          {topics.map((topic) => (
            <Link
              key={topic.slug}
              to="/topic/$topicSlug"
              params={{ topicSlug: topic.slug }}
              className="h-11 px-4 rounded-md border border-border bg-surface text-sm inline-flex items-center hover:bg-surface-2"
            >
              {topic.title}
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
