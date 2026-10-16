import type { Metadata } from "next";
import Image from "next/image";
import LoginForm from "./LoginForm";

export const metadata: Metadata = { title: "Вхід для навчальної частини" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <main className="grid min-h-dvh place-items-center bg-gradient-to-br from-brand to-brand-deep px-4">
      <div className="w-full max-w-sm rounded-3xl border border-line bg-surface p-8 shadow-card">
        <Image src="/logo-lit.jpg" alt="" width={56} height={56} className="mb-5 rounded-full" />
        <h1 className="font-display text-2xl font-bold">Редактор розкладу</h1>
        <p className="mt-1 text-sm text-ink-3">Вхід для навчальної частини та диспетчерів</p>
        <LoginForm next={next?.startsWith("/admin") ? next : "/admin"} />
      </div>
    </main>
  );
}
