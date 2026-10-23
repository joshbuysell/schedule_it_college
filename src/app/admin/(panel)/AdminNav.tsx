"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { BarChart3, BookMarked, CalendarClock, History, LayoutDashboard, PencilRuler, Settings, Users } from "lucide-react";

const ITEMS = [
  { href: "/admin", label: "Огляд", icon: LayoutDashboard },
  { href: "/admin/editor", label: "Редактор", icon: PencilRuler },
  { href: "/admin/changes", label: "Заміни", icon: CalendarClock },
  { href: "/admin/dictionaries", label: "Довідники", icon: BookMarked },
  { href: "/admin/reports", label: "Звіти", icon: BarChart3 },
  { href: "/admin/users", label: "Користувачі", icon: Users },
  { href: "/admin/history", label: "Історія", icon: History },
  { href: "/admin/settings", label: "Налаштування", icon: Settings },
];

export default function AdminNav({ pending = 0 }: { pending?: number }) {
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
              "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-semibold whitespace-nowrap",
              active ? "bg-white text-brand" : "text-white/80 hover:bg-white/10 hover:text-white",
            )}
          >
            <Icon className="size-4" /> <span className="hidden lg:inline">{label}</span>
            {href === "/admin/changes" && pending > 0 && (
              <span className="rounded-full bg-accent px-1.5 text-xs font-semibold text-white">{pending}</span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
