import Link from "next/link";

export default function SiteFooter({ source }: { source?: string }) {
  return (
    <footer className="no-print border-t border-line">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-8 text-sm text-ink-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>
          Фаховий коледж інформаційних технологій НУ «Львівська політехніка» ·{" "}
          <a href="https://itcollege.lviv.ua" className="hover:text-ink">itcollege.lviv.ua</a>
        </p>
        <div className="flex gap-4">
          {source && (
            <a href={source} className="hover:text-ink" target="_blank" rel="noreferrer">
              Офіційний PDF
            </a>
          )}
          <Link href="/api/v1" className="hover:text-ink">API</Link>
          <Link href="/admin" className="hover:text-ink">Для навчальної частини</Link>
        </div>
      </div>
    </footer>
  );
}
