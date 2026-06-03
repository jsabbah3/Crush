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
import { cn } from "@/lib/utils";

type User = { email: string; name: string | null; avatarUrl: string | null } | null;

const NAV_LINKS = [
  { href: "/companies", label: "Companies" },
  { href: "/blog", label: "Blog" },
  { href: "/dashboard", label: "Dashboard", authOnly: true },
];

export function SiteNav({ user }: { user: User }) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <header className="border-b bg-background/95 backdrop-blur sticky top-0 z-10">
      <div className="mx-auto max-w-6xl flex items-center justify-between px-6 h-14">
        <div className="flex items-center gap-6">
          <Link href={user ? "/dashboard" : "/"} className="font-heading font-bold text-lg tracking-tight">
            Crush
          </Link>
          <nav className="flex items-center gap-1">
            {NAV_LINKS.filter((l) => !l.authOnly || user).map(({ href, label }) => (
              <Link key={href} href={href}>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "text-muted-foreground hover:text-foreground",
                    pathname.startsWith(href) && "bg-muted text-foreground"
                  )}
                >
                  {label}
                </Button>
              </Link>
            ))}
          </nav>
        </div>

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
              <div className="px-2 py-1.5 text-xs text-muted-foreground truncate">
                {user.email}
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push("/settings")}>
                <Settings className="size-3.5 mr-2" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={() => signOut()}>
                <LogOut className="size-3.5 mr-2" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <form action={signInWithGoogle}>
            <Button size="sm" type="submit" variant="outline">
              Sign in
            </Button>
          </form>
        )}
      </div>
    </header>
  );
}
