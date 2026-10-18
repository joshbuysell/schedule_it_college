"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { ArrowUpRight } from "lucide-react";

const ITEMS = [
  { href: "/", label: "Головна" },
  { href: "/groups", label: "Групи" },
  { href: "/teachers", label: "Викладачі" },
  { href: "/#bells", label: "Дзвінки" },
  { href: "/integration", label: "Для сайту коледжу" },
];

export default function NavStrip() {
  const path = usePathname();
  const active = (href: string) =>
    href === "/" ? path === "/" : !href.includes("#") && path.startsWith(href) || (href === "/groups" && path.startsWith("/group/")) || (href === "/teachers" && path.startsWith("/teacher/"));

  return (
    <nav className="no-print sticky top-0 z-40 bg-brand text-brand-ink shadow-[0_6px_20px_-12px_rgba(37,43,107,0.6)]">
      <div className="mx-auto flex max-w-7xl items-center px-2 sm:px-4">
        <ul className="flex flex-1 items-center overflow-x-auto [scrollbar-width:none]">
          {ITEMS.map((i) => (
            <li key={i.href} className="shrink-0">
              <Link
                href={i.href}
                className={clsx(
                  "relative block px-3 py-3.5 text-[13px] font-medium uppercase tracking-[0.06em] transition hover:text-white sm:px-4",
                  active(i.href) ? "text-white" : "text-white/80",
                  "after:absolute after:inset-x-3 after:bottom-2 after:h-px after:origin-left after:bg-white after:transition-transform sm:after:inset-x-4",
                  active(i.href) ? "after:scale-x-100" : "after:scale-x-0 hover:after:scale-x-100",
                )}
              >
                {i.label}
              </Link>
            </li>
          ))}
        </ul>
        <a
          href="https://itcollege.lviv.ua"
          className="hidden shrink-0 items-center gap-1 px-4 py-3.5 text-[13px] font-medium uppercase tracking-[0.06em] text-white/80 hover:text-white lg:flex"
        >
          itcollege.lviv.ua <ArrowUpRight className="size-3.5" />
        </a>
      </div>
    </nav>
  );
}
