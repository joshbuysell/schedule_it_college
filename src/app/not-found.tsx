import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

export default function NotFound() {
  return (
    <>
      <SiteHeader search={false} />
      <main className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <p className="text-sm text-ink-3">Помилка 404</p>
        <h1 className="mt-1 text-3xl font-semibold">Сторінку не знайдено</h1>
        <p className="mt-3 max-w-xl text-ink-2">
          Можливо, групу перейменували або посилання застаріло. Знайдіть потрібний розклад на головній сторінці.
        </p>
        <Link href="/" className="mt-6 inline-block rounded-md bg-brand px-4 py-2 font-medium text-white hover:bg-brand-deep">
          На головну
        </Link>
      </main>
      <SiteFooter />
    </>
  );
}
