"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { BookMarked, LayoutDashboard, PencilRuler, Settings } from "lucide-react";

const ITEMS = [
  { href: "/admin", label: "Огляд", icon: LayoutDashboard },
  { href: "/admin/editor", label: "Редактор", icon: PencilRuler },
  { href: "/admin/dictionaries", label: "Довідники", icon: BookMarked },
  { href: "/admin/settings", label: "Налаштування", icon: Settings },
];

export default function AdminNav() {
  const path = usePathname();
  return (
    <nav className="flex items-center gap-1 overflow-x-auto">
      {ITEMS.map(({ href, label, icon: Icon }) => {
        const active = href === "/admin" ? path === href : path.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={clsx(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold whitespace-nowrap",
              active ? "bg-white text-brand" : "text-white/80 hover:bg-white/10 hover:text-white",
            )}
          >
            <Icon className="size-4" /> <span className="hidden sm:inline">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
