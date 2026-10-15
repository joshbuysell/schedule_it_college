import Image from "next/image";
import Link from "next/link";
import { getSearchIndex } from "@/lib/queries";
import Search from "./Search";

export default async function SiteHeader({ search = true }: { search?: boolean }) {
  const index = search ? await getSearchIndex() : null;
  return (
    <header className="no-print sticky top-0 z-40 border-b border-line/70 bg-bg/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2.5">
          <Image src="/logo-lit.jpg" alt="" width={36} height={36} className="rounded-full" />
          <span className="hidden leading-tight sm:block">
            <span className="block font-display text-[13px] font-bold tracking-tight">Розклад</span>
            <span className="block text-[11px] font-medium text-ink-3">ІТ коледж Львівської політехніки</span>
          </span>
        </Link>
        {index && (
          <div className="ml-auto w-full max-w-md">
            <Search index={index} size="compact" />
          </div>
        )}
        <nav className="hidden shrink-0 items-center gap-1 text-sm font-semibold text-ink-2 md:flex">
          <Link href="/groups" className="rounded-lg px-3 py-2 hover:bg-surface hover:text-ink">Групи</Link>
          <Link href="/teachers" className="rounded-lg px-3 py-2 hover:bg-surface hover:text-ink">Викладачі</Link>
        </nav>
      </div>
    </header>
  );
}
