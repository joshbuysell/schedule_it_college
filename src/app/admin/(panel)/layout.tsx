import Image from "next/image";
import Link from "next/link";
import { getSession } from "@/lib/admin";
import AdminNav from "./AdminNav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-40 border-b border-line bg-surface/90 backdrop-blur-xl">
        <div className="flex h-14 items-center gap-4 px-4">
          <Link href="/admin" className="flex items-center gap-2.5">
            <Image src="/logo-lit.jpg" alt="" width={30} height={30} className="rounded-full" />
            <span className="font-display text-sm font-bold">Редактор розкладу</span>
          </Link>
          <AdminNav />
          <div className="ml-auto flex items-center gap-3 text-sm">
            <Link href="/" target="_blank" className="hidden font-semibold text-ink-2 hover:text-ink sm:block">
              Публічний сайт ↗
            </Link>
            <span className="hidden text-ink-3 md:block">{session?.name}</span>
            <form action="/api/admin/logout" method="post">
              <button className="rounded-lg border border-line px-3 py-1.5 font-semibold hover:border-ink-3">Вийти</button>
            </form>
          </div>
        </div>
      </header>
      <div className="flex-1">{children}</div>
    </div>
  );
}
