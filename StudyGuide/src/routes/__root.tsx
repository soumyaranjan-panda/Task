import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { APP } from "@/lib/app-config";
import appCss from "../styles.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: APP.name },
      { name: "description", content: APP.description },
      { name: "theme-color", content: "#10110f" },
      { property: "og:type", content: "website" },
      { property: "og:title", content: APP.name },
      { property: "og:description", content: APP.description },
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
    // Apply the stored theme before first paint to avoid a flash.
    scripts: [
      {
        children: `try{var t=localStorage.getItem("study-hub:theme")||localStorage.getItem("graphs53-theme");if(t==="dark"||(!t&&matchMedia("(prefers-color-scheme: dark)").matches))document.documentElement.classList.add("dark")}catch(e){}`,
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
