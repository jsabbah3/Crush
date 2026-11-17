"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Building2, Inbox, ListOrdered, Settings, LogOut, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOut } from "@/app/actions/auth";
import { ThemeToggleButton } from "@/components/theme-toggle";
import { Rule, Wordmark } from "@/components/brand";
import { cn } from "@/lib/utils";

type UserProps = {
  email: string;
  name: string | null;
  avatarUrl: string | null;
};

const navLinks = [
  { href: "/dashboard",    label: "Today",        icon: Inbox,         badge: true  },
  { href: "/list",         label: "Your list",    icon: ListOrdered,   badge: false },
  { href: "/companies",    label: "Companies",    icon: Building2,     badge: false },
];

// Mobile bottom nav adds Settings, which sits in the top bar on desktop.
const bottomNavLinks = [
  ...navLinks,
  { href: "/settings", label: "Settings", icon: Settings, badge: false },
];

export function DashboardNav({
  user,
  unreadMatches,
}: {
  user: UserProps;
  unreadMatches: number;
}) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <>
      {/* ── Top nav (desktop) ── */}
      <header className="sticky top-0 z-20 bg-background/92 backdrop-blur">
        <div className="mx-auto max-w-6xl flex items-center justify-between px-4 sm:px-6 h-14">
          <div className="flex items-center gap-4 sm:gap-6">
            <Link
              href="/dashboard"
              aria-label="Crush — dashboard"
              className="rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
            >
              <Wordmark />
            </Link>
            {/* Desktop nav — hidden on mobile */}
            <nav className="hidden sm:flex items-center gap-1">
              {navLinks.map(({ href, label, badge }) => {
                const active = pathname === href || pathname.startsWith(href + "/");
                return (
                  <Link
                    key={href}
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "relative flex items-center gap-1.5 px-2.5 h-14 text-sm font-medium transition-colors rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-inset",
                      active
                        ? "text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {label}
                    {badge && unreadMatches > 0 && (
                      <span className="h-4 min-w-4 rounded-full bg-primary text-primary-foreground font-mono text-[10px] font-semibold leading-none flex items-center justify-center px-1 tabular-nums">
                        {unreadMatches > 99 ? "99+" : unreadMatches}
                      </span>
                    )}
                    {active && (
                      <span className="absolute bottom-0 left-2.5 right-2.5 h-[3px] bg-primary" />
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-1">
            <ThemeToggleButton />
            <Link href="/settings">
              <Button
                variant="ghost"
                size="icon"
                className={cn("size-8 text-muted-foreground hover:text-foreground", pathname === "/settings" && "bg-muted text-foreground")}
                aria-label="Settings"
              >
                <Settings className="size-4" />
              </Button>
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger
                className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Account menu"
              >
                <Avatar className="size-7">
                  <AvatarImage src={user.avatarUrl ?? undefined} />
                  <AvatarFallback>
                    {(user.name ?? user.email).charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <div className="px-2 py-1.5 text-xs text-muted-foreground truncate">
                  {user.email}
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push("/settings")}>
                  <Settings className="size-3.5 mr-2" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push("/blog")}>
                  <BookOpen className="size-3.5 mr-2" />
                  Blog
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => signOut()}
                >
                  <LogOut className="size-3.5 mr-2" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <Rule />
      </header>

      {/* ── Bottom nav (mobile only) ── */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-20 border-t border-foreground/15 bg-paper/95 backdrop-blur">
        <div className="flex items-center justify-around h-16 px-2">
          {bottomNavLinks.map(({ href, label, icon: Icon, badge }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors flex-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
                  active ? "text-foreground" : "text-muted-foreground"
                )}
              >
                <div className="relative">
                  <Icon className={cn("size-5", active && "stroke-[2.5]")} />
                  {badge && unreadMatches > 0 && (
                    <span className="absolute -top-1 -right-1 h-3.5 min-w-3.5 rounded-full bg-primary text-primary-foreground font-mono text-[9px] font-semibold leading-none flex items-center justify-center px-0.5 tabular-nums">
                      {unreadMatches > 99 ? "99+" : unreadMatches}
                    </span>
                  )}
                </div>
                <span className={cn("text-[10px] font-medium", active && "font-semibold")}>{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Bottom nav spacer so content isn't hidden behind it on mobile */}
      <div className="sm:hidden h-16" aria-hidden="true" />
    </>
  );
}
