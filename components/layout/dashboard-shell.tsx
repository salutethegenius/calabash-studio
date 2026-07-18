import { Sidebar } from "./sidebar";

export function DashboardShell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-[var(--calabash-beige)]">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="border-b border-[var(--calabash-light-green)]/40 bg-white/80 px-8 py-4 backdrop-blur-sm">
          <h1 className="font-heading text-2xl font-semibold tracking-wide text-[var(--calabash-dark-green)]">
            {title}
          </h1>
        </header>
        <main className="flex-1 overflow-y-auto px-8 py-6 font-body">
          {children}
        </main>
      </div>
    </div>
  );
}
