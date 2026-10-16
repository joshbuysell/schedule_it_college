import Image from "next/image";
import Link from "next/link";

export default function SiteFooter({ source }: { source?: string }) {
  const link = "text-white/75 transition hover:text-white";
  return (
    <footer className="no-print mt-8 bg-brand-deep text-white">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
        <div className="flex gap-4">
          <Image src="/logo-lit.jpg" alt="" width={56} height={56} className="size-14 shrink-0 rounded-full ring-2 ring-white/20" />
          <div className="text-sm leading-relaxed text-white/75">
            <p className="font-semibold text-white">Фаховий коледж інформаційних технологій НУ «Львівська політехніка»</p>
            <p className="mt-1">79053, м. Львів, вул. Володимира Великого, 12</p>
            <p>(032) 263-15-66 · info@itcollege.lviv.ua</p>
          </div>
        </div>
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-white/50">Розклад</p>
          <ul className="space-y-1.5 text-sm">
            <li><Link href="/groups" className={link}>Групи</Link></li>
            <li><Link href="/teachers" className={link}>Викладачі</Link></li>
            <li><Link href="/#bells" className={link}>Розклад дзвінків</Link></li>
            {source && (
              <li><a href={source} target="_blank" rel="noreferrer" className={link}>Офіційний PDF</a></li>
            )}
          </ul>
        </div>
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-white/50">Для коледжу</p>
          <ul className="space-y-1.5 text-sm">
            <li><a href="https://itcollege.lviv.ua" className={link}>Сайт коледжу</a></li>
            <li><Link href="/integration" className={link}>Вбудувати на сайт</Link></li>
            <li><Link href="/api/v1" className={link}>API</Link></li>
            <li><Link href="/admin" className={link}>Вхід для навчальної частини</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10 bg-black/20">
        <p className="mx-auto max-w-7xl px-4 py-4 text-center text-xs text-white/55 sm:px-6">
          © {new Date().getFullYear()} ІТ коледж Львівської політехніки · Розклад занять
        </p>
      </div>
    </footer>
  );
}
