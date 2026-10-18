import Image from "next/image";
import Link from "next/link";
import { getSearchIndex } from "@/lib/queries";
import Search from "./Search";
import NavStrip from "./NavStrip";

export default async function SiteHeader({ search = true }: { search?: boolean }) {
  const index = search ? await getSearchIndex() : null;
  return (
    <>
      <header className="no-print border-b border-line bg-surface">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3 sm:px-6 sm:py-4">
          <Link href="/" className="flex min-w-0 items-center gap-3">
            <Image src="/logo-lit.jpg" alt="Логотип ІТ коледжу" width={52} height={52} className="size-11 shrink-0 rounded-full sm:size-13" priority />
            <span className="min-w-0 leading-tight">
              <span className="block text-lg font-bold tracking-tight text-brand sm:text-xl">Розклад занять</span>
              <span className="block truncate text-[11px] font-medium text-ink-3 sm:text-xs">
                Фаховий коледж інформаційних технологій НУ «Львівська політехніка»
              </span>
            </span>
          </Link>
          {index && (
            <div className="w-full md:ml-auto md:w-96">
              <Search index={index} size="compact" />
            </div>
          )}
        </div>
      </header>
      <NavStrip />
    </>
  );
}
