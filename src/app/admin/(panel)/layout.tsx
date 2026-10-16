import Image from "next/image";
import Link from "next/link";
import { getSession } from "@/lib/admin";
import AdminNav from "./AdminNav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-40 bg-brand text-brand-ink shadow-[0_6px_20px_-12px_rgba(37,43,107,0.6)]">
        <div className="flex h-14 items-center gap-4 px-4">
          <Link href="/admin" className="flex items-center gap-2.5">
            <Image src="/logo-lit.jpg" alt="" width={32} height={32} className="rounded-full ring-2 ring-white/30" />
            <span className="hidden text-sm font-semibold uppercase tracking-[0.08em] md:block">Редактор розкладу</span>
          </Link>
          <AdminNav />
          <div className="ml-auto flex items-center gap-3 text-sm">
            <Link href="/" target="_blank" className="hidden font-medium text-white/80 hover:text-white sm:block">
              Публічний сайт ↗
            </Link>
            <span className="hidden text-white/60 md:block">{session?.name}</span>
            <form action="/api/admin/logout" method="post">
              <button className="rounded-lg bg-white/10 px-3 py-1.5 font-semibold hover:bg-white/20">Вийти</button>
            </form>
          </div>
        </div>
      </header>
      <div className="flex-1 bg-surface-2">{children}</div>
    </div>
  );
}
