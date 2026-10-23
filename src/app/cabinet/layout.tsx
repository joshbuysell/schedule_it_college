import Image from "next/image";
import Link from "next/link";
import { getSession } from "@/lib/admin";

export default async function CabinetLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  return (
    <div className="flex min-h-dvh flex-col bg-surface-2">
      <header className="sticky top-0 z-40 bg-brand text-white">
        <div className="mx-auto flex h-14 max-w-3xl items-center gap-3 px-4">
          <Link href="/cabinet" className="flex items-center gap-2.5">
            <Image src="/logo-lit.jpg" alt="" width={32} height={32} className="rounded-full ring-2 ring-white/30" />
            <span className="text-sm font-semibold">Кабінет викладача</span>
          </Link>
          <div className="ml-auto flex items-center gap-3 text-sm">
            <span className="hidden text-white/70 sm:block">{session?.name}</span>
            <form action="/api/admin/logout" method="post">
              <button className="rounded-md bg-white/10 px-3 py-1.5 font-medium hover:bg-white/20">Вийти</button>
            </form>
          </div>
        </div>
      </header>
      <div className="flex-1">{children}</div>
    </div>
  );
}
