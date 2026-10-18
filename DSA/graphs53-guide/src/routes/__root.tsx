import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import appCss from "../styles.css?url";

const APP_NAME = "Graphs 53";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: APP_NAME },
      {
        name: "description",
        content:
          "53-problem Java study guide for Striver’s A2Z Graphs sheet — observations, patterns, dry runs, and code.",
      },
      { name: "theme-color", content: "#10110f" },
      { property: "og:type", content: "website" },
      { property: "og:title", content: APP_NAME },
      {
        property: "og:description",
        content:
          "53-problem Java study guide for Striver’s A2Z Graphs sheet — observations, patterns, dry runs, and code.",
      },
      { property: "og:image", content: "/og.jpg" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/icon-180.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:ital,wght@0,400;0,500;0,600;1,400&display=swap",
      },
    ],
  }),
  component: () => (
    <html lang="en" className="antialiased" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body className="bg-bg text-fg font-sans min-h-dvh">
        <Outlet />
        <Scripts />
      </body>
    </html>
  ),
});
