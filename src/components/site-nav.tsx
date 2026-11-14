"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Settings, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signInWithGoogle, signOut } from "@/app/actions/auth";
import { ThemeToggleButton } from "@/components/theme-toggle";
import { Rule, Wordmark } from "@/components/brand";
import { cn } from "@/lib/utils";

type User = { email: string; name: string | null; avatarUrl: string | null } | null;

const NAV_LINKS = [
  { href: "/companies", label: "Companies" },
  { href: "/collections", label: "Collections" },
  { href: "/blog", label: "Blog" },
  { href: "/dashboard", label: "Dashboard", authOnly: true },
];

/** Public-site header: landing, browse, blog. Signed-in users get DashboardNav. */
export function SiteNav({ user }: { user: User }) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <>
      <header className="sticky top-0 z-20 bg-background/92 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-5 sm:gap-8">
            <Link
              href={user ? "/dashboard" : "/"}
              aria-label="Crush — home"
              className="rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
            >
              <Wordmark />
            </Link>
            <nav className="hidden items-center gap-5 sm:flex">
              {NAV_LINKS.filter((l) => !l.authOnly || user).map(({ href, label }) => {
                const active = pathname.startsWith(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "relative py-1 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 rounded-sm",
                      active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {label}
                    {active && <span className="absolute inset-x-0 -bottom-0.5 h-0.5 bg-primary" />}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <ThemeToggleButton className="hidden sm:inline-flex" />
            {user ? (
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
                  <div className="truncate px-2 py-1.5 text-xs text-muted-foreground">
                    {user.email}
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => router.push("/settings")}>
                    <Settings className="mr-2 size-3.5" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" onClick={() => signOut()}>
                    <LogOut className="mr-2 size-3.5" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <Link
                  href="/companies"
                  className="rounded-sm px-1.5 text-sm font-medium text-muted-foreground hover:text-foreground sm:hidden"
                >
                  Browse
                </Link>
                <form action={signInWithGoogle} className="hidden sm:block">
                  <Button size="sm" type="submit" variant="ghost" className="text-muted-foreground hover:text-foreground">
                    Log in
                  </Button>
                </form>
                <form action={signInWithGoogle}>
                  <Button size="sm" type="submit" variant="ink" className="h-8 px-3">
                    Start your list
                  </Button>
                </form>
              </>
            )}
          </div>
        </div>
        <Rule />
      </header>
    </>
  );
}
