import { ThemeSwitch } from "@/dev/gallery/theme-switch";

// Development tools: no app shell and no sign-in, so they open on a fresh
// checkout without the identity mock. Each page is a 404 in production.
export default function DevLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-background">
        <div className="mx-auto flex h-topbar max-w-screen-xl items-center justify-between gap-inline-md px-inset-md sm:px-pad">
          <span className="text-body font-semibold">Development</span>
          <ThemeSwitch />
        </div>
      </header>
      <main
        id="main-content"
        className="mx-auto max-w-screen-xl px-inset-md py-stack-lg sm:px-pad"
      >
        {children}
      </main>
    </div>
  );
}
