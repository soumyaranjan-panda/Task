import {
  Binary,
  BookOpen,
  Braces,
  Cpu,
  Database,
  FileCode2,
  GitBranch,
  Languages,
  LayoutGrid,
  MoveHorizontal,
  Network,
  Server,
  Sigma,
  type LucideIcon,
} from "lucide-react";

/**
 * Icon names come from `content.config.json`, so an unknown or missing name must
 * degrade to a sensible default rather than crash.
 */
const ICONS: Record<string, LucideIcon> = {
  binary: Binary,
  book: BookOpen,
  braces: Braces,
  cpu: Cpu,
  database: Database,
  file: FileCode2,
  "git-branch": GitBranch,
  languages: Languages,
  grid: LayoutGrid,
  "move-horizontal": MoveHorizontal,
  network: Network,
  server: Server,
  sigma: Sigma,
  "book-open": BookOpen,
};

export function topicIcon(name: string | null | undefined): LucideIcon {
  return (name && ICONS[name]) || BookOpen;
}

export function subjectIcon(name: string | null | undefined): LucideIcon {
  return (name && ICONS[name]) || BookOpen;
}
