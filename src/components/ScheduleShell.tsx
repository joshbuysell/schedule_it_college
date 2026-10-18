import Link from "next/link";
import SiteHeader from "./SiteHeader";
import SiteFooter from "./SiteFooter";
import PrintButton from "./PrintButton";

export default function ScheduleShell({
  crumbs,
  title,
  subtitle,
  actions,
  children,
}: {
  crumbs: { href: string; label: string }[];
  title: string;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-4 pb-16 pt-5 sm:px-6">
        <nav className="no-print mb-4 text-sm text-ink-3" aria-label="Навігація">
          {crumbs.map((c) => (
            <span key={c.href}>
              <Link href={c.href} className="hover:text-brand hover:underline">
                {c.label}
              </Link>
              <span className="mx-1.5">/</span>
            </span>
          ))}
          <span className="text-ink-2">{title}</span>
        </nav>
        <div className="mb-6 flex flex-col gap-4 border-b border-line pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
            {subtitle && <div className="mt-1.5 text-ink-2">{subtitle}</div>}
          </div>
          <div className="no-print flex flex-wrap gap-2">
            {actions}
            <PrintButton />
          </div>
        </div>
        {children}
      </main>
      <SiteFooter />
    </>
  );
}

