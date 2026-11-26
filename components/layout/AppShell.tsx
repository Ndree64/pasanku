"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Award,
  BookOpen,
  ClipboardCheck,
  Compass,
  Eye,
  FileCheck,
  History,
  LayoutDashboard,
  Layers,
  LogOut,
  Trophy,
  User,
  Users,
} from "lucide-react";
import type { Profile } from "@/types/pasanku";
import { logoutAction } from "@/actions/auth";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  section: string;
  matchExact?: boolean;
}

function getNavItems(role: Profile["role"]): NavItem[] {
  if (role === "validator") {
    return [
      {
        label: "Antrean",
        href: "/validator",
        icon: <FileCheck className="w-5 h-5" aria-hidden="true" />,
        section: "MENU UTAMA",
        matchExact: true,
      },
      {
        label: "Riwayat",
        href: "/validator/riwayat",
        icon: <History className="w-5 h-5" aria-hidden="true" />,
        section: "MENU UTAMA",
      },
      {
        label: "Kamus",
        href: "/validator/kamus",
        icon: <BookOpen className="w-5 h-5" aria-hidden="true" />,
        section: "REFERENSI BAHASA",
      },
      {
        label: "Pratinjau",
        href: "/preview",
        icon: <Eye className="w-5 h-5" aria-hidden="true" />,
        section: "PRATINJAU LEARNER",
      },
    ];
  }

  if (role === "admin") {
    return [
      {
        label: "Ringkasan",
        href: "/admin",
        icon: <LayoutDashboard className="w-5 h-5" aria-hidden="true" />,
        section: "MENU UTAMA",
        matchExact: true,
      },
      {
        label: "Kurikulum",
        href: "/admin/units",
        icon: <Layers className="w-5 h-5" aria-hidden="true" />,
        section: "PENGELOLAAN KONTEN",
      },
      {
        label: "Quiz Unit",
        href: "/admin/quizzes",
        icon: <ClipboardCheck className="w-5 h-5" aria-hidden="true" />,
        section: "PENGELOLAAN KONTEN",
      },
      {
        label: "Validator",
        href: "/admin/validators",
        icon: <Users className="w-5 h-5" aria-hidden="true" />,
        section: "PENGELOLAAN KONTEN",
      },
    ];
  }

  return [
    {
      label: "Belajar",
      href: "/learner",
      icon: <Compass className="w-5 h-5" aria-hidden="true" />,
      section: "MENU UTAMA",
      matchExact: true,
    },
    {
      label: "Kamus",
      href: "/learner/kamus",
      icon: <BookOpen className="w-5 h-5" aria-hidden="true" />,
      section: "MENU UTAMA",
    },
    {
      label: "Papan Skor",
      href: "/learner/papan-skor",
      icon: <Trophy className="w-5 h-5" aria-hidden="true" />,
      section: "MENU UTAMA",
    },
    {
      label: "Profil",
      href: "/learner/profil",
      icon: <User className="w-5 h-5" aria-hidden="true" />,
      section: "MENU UTAMA",
    },
  ];
}

function isRouteActive(pathname: string, item: NavItem): boolean {
  if (item.matchExact) {
    return pathname === item.href;
  }
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function AppShell({
  user,
  totalXp,
  rightRail,
  children,
}: {
  user: Profile;
  totalXp?: number;
  rightRail?: React.ReactNode;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const navItems = getNavItems(user.role);

  const groupedSections = navItems.reduce<Record<string, NavItem[]>>(
    (acc, item) => {
      if (!acc[item.section]) acc[item.section] = [];
      acc[item.section].push(item);
      return acc;
    },
    {}
  );

  const roleBadgeLabel =
    user.role === "admin"
      ? "Panel Admin"
      : user.role === "validator"
        ? "Panel Validator"
        : "Learner";

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-canvas text-ink">
      {/* Mobile Top Header */}
      <header className="md:hidden sticky top-0 z-30 bg-surface border-b border-border-subtle px-4 h-14 flex items-center justify-between shadow-(--shadow-focal)">
        <Link href={navItems[0].href} className="flex items-center gap-2.5">
          <Image
            src="/images/pasanku_app_icon.png"
            alt="Pasanku"
            width={34}
            height={34}
            className="rounded-chip"
          />
          <div>
            <span className="font-display font-extrabold text-base tracking-tight text-ink block leading-none">
              PASANKU
            </span>
            <span className="text-[11px] font-semibold text-ink-soft">
              {roleBadgeLabel}
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          {user.role === "learner" && typeof totalXp === "number" ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-chip bg-accent text-ink border border-accent-border text-xs font-extrabold">
              <Award className="w-3.5 h-3.5" aria-hidden="true" />
              {totalXp} XP
            </span>
          ) : null}

          {user.role === "admin" ? (
            <Link
              href="/preview"
              className="inline-flex items-center gap-1.5 min-h-[38px] px-3 rounded-chip bg-accent-tint text-ink border border-accent-border text-xs font-bold"
            >
              <Eye className="w-3.5 h-3.5" aria-hidden="true" />
              Pratinjau
            </Link>
          ) : null}

          {user.role !== "learner" ? (
            <form action={logoutAction}>
              <button
                type="submit"
                aria-label="Keluar dari akun"
                className="inline-flex items-center justify-center min-h-[38px] min-w-[38px] px-2.5 rounded-chip border border-border-control bg-surface-soft text-ink text-xs font-semibold hover:bg-brand-tint hover:text-brand cursor-pointer"
              >
                <LogOut className="w-4 h-4" aria-hidden="true" />
              </button>
            </form>
          ) : null}
        </div>
      </header>

      {/* Tablet & Desktop Left Sidebar (248px di desktop) */}
      <aside className="hidden md:flex md:w-56 lg:w-[248px] shrink-0 flex-col bg-surface border-r border-border-subtle sticky top-0 h-screen justify-between">
        <div className="p-4 space-y-6 overflow-y-auto">
          <Link href={navItems[0].href} className="flex items-center gap-3 px-2 py-1">
            <Image
              src="/images/pasanku_app_icon.png"
              alt="Pasanku"
              width={40}
              height={40}
              className="rounded-control"
            />
            <div>
              <p className="font-display font-extrabold text-lg text-ink leading-none">
                PASANKU
              </p>
              <p className="text-xs text-ink-soft mt-1">{roleBadgeLabel}</p>
            </div>
          </Link>

          <nav aria-label="Navigasi utama" className="space-y-5">
            {Object.entries(groupedSections).map(([section, items]) => (
              <div key={section} className="space-y-1.5">
                <p className="px-3 text-[11px] font-bold uppercase tracking-[0.08em] text-ink-soft">
                  {section}
                </p>
                {items.map((item) => {
                  const active = isRouteActive(pathname, item);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`relative flex items-center gap-3 min-h-[48px] px-3.5 rounded-control text-sm font-bold transition-colors ${
                        active
                          ? "bg-surface-highlight text-brand"
                          : "text-ink-soft hover:bg-surface-soft hover:text-ink"
                      }`}
                    >
                      {active ? (
                        <span
                          className="absolute left-0 top-2 bottom-2 w-1 rounded-r bg-brand"
                          aria-hidden="true"
                        />
                      ) : null}
                      {item.icon}
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            ))}

            {user.role === "admin" ? (
              <div className="space-y-1.5">
                <p className="px-3 text-[11px] font-bold uppercase tracking-[0.08em] text-ink-soft">
                  PRATINJAU LEARNER
                </p>
                <Link
                  href="/preview"
                  className={`relative flex items-center gap-3 min-h-[48px] px-3.5 rounded-control text-sm font-bold transition-colors ${
                    pathname.startsWith("/preview")
                      ? "bg-surface-highlight text-brand"
                      : "text-ink-soft hover:bg-surface-soft hover:text-ink"
                  }`}
                >
                  <Eye className="w-5 h-5" aria-hidden="true" />
                  <span>Pratinjau Path</span>
                </Link>
              </div>
            ) : null}
          </nav>
        </div>

        <div className="p-4 border-t border-border-subtle space-y-3">
          <div className="px-2">
            <p className="text-sm font-bold text-ink truncate">{user.fullName}</p>
            <p className="text-xs text-ink-soft truncate">{user.email}</p>
          </div>
          <form action={logoutAction}>
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 min-h-[44px] px-3 rounded-control border border-border-control text-sm font-bold text-ink-soft hover:bg-brand-tint hover:text-brand hover:border-brand/40 cursor-pointer"
            >
              <LogOut className="w-4 h-4" aria-hidden="true" />
              Keluar
            </button>
          </form>
        </div>
      </aside>

      {/* Main Content Area + Optional Desktop Right Rail */}
      <div className="flex-1 flex flex-col lg:flex-row min-w-0">
        <main className="flex-1 min-w-0 px-4 py-5 md:px-7 md:py-7 pb-24 md:pb-10">
          <div className="max-w-4xl mx-auto">{children}</div>
        </main>

        {rightRail ? (
          <aside className="hidden xl:block w-[360px] shrink-0 border-l border-border-subtle bg-surface/60 p-6">
            <div className="sticky top-6 space-y-5">{rightRail}</div>
          </aside>
        ) : null}
      </div>

      {/* Mobile Bottom Navigation (4 Tabs, >= 44px touch target, 68px tinggi) */}
      <nav
        aria-label="Navigasi bawah mobile"
        className="md:hidden fixed bottom-0 inset-x-0 z-40 h-[68px] bg-surface border-t border-border-subtle shadow-(--shadow-focal) grid grid-cols-4"
      >
        {navItems.map((item) => {
          const active = isRouteActive(pathname, item);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex flex-col items-center justify-center gap-1 min-h-[44px] text-[11px] font-bold transition-colors ${
                active ? "text-brand" : "text-ink-soft hover:text-ink"
              }`}
            >
              {active ? (
                <span
                  className="absolute top-0 inset-x-3 h-[3px] rounded-b bg-brand"
                  aria-hidden="true"
                />
              ) : null}
              {item.icon}
              <span className="truncate max-w-full px-1">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
