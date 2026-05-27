"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Building2, Briefcase, Bell, Settings, LogOut, Layers } from "lucide-react";
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
import { cn } from "@/lib/utils";

type UserProps = {
  email: string;
  name: string | null;
  avatarUrl: string | null;
};

const navLinks = [
  { href: "/dashboard",    label: "Dashboard",    icon: Briefcase,    badge: false },
  { href: "/companies",    label: "Companies",    icon: Building2,    badge: false },
  { href: "/collections",  label: "Collections",  icon: Layers,       badge: false },
  { href: "/matches",      label: "Matches",      icon: Bell,         badge: true  },
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
    <header className="border-b bg-background/95 backdrop-blur sticky top-0 z-10">
      <div className="mx-auto max-w-5xl flex items-center justify-between px-4 h-14">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="font-heading font-bold text-lg tracking-tight">
            Crush
          </Link>
          <nav className="flex items-center gap-1">
            {navLinks.map(({ href, label, icon: Icon, badge }) => (
              <Link key={href} href={href}>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(pathname === href && "bg-muted text-foreground")}
                >
                  <Icon className="size-3.5" />
                  {label}
                  {badge && unreadMatches > 0 && (
                    <span className="ml-1 h-4 min-w-4 rounded-full bg-red-500 text-white text-[10px] font-bold leading-none flex items-center justify-center px-1">
                      {unreadMatches > 99 ? "99+" : unreadMatches}
                    </span>
                  )}
                </Button>
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-1">
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
    </header>
  );
}
